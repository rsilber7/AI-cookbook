import json
from fastapi import APIRouter, Depends, HTTPException, status
from openai import AsyncOpenAI, OpenAIError
from app.allergens import find_allergens, find_kosher_problems
from app.config import settings
from app.database import supabase
from app.dependencies import get_current_user
from app.models.generate import AIRecipe, GenerateRequest, GenerateResponse
from app.models.recipe import DietarySystem, RecipeCreate, RecipeSource

router = APIRouter(prefix="/recipes", tags=["generate"])

client = AsyncOpenAI(api_key=settings.openai_api_key)

DIET_RULES = {
    DietarySystem.kosher: (
        "Kosher: no pork, shellfish, or other non-kosher animals. Never combine meat "
        "(including poultry) with dairy in the same recipe. Fish is parve but must not "
        "be cooked together with meat."
    ),
    DietarySystem.halal: (
        "Halal: no pork or pork products, no alcohol (including wine or beer used in "
        "cooking), and no non-halal gelatin."
    ),
    DietarySystem.vegan: (
        "Vegan: no animal products at all: no meat, poultry, fish, seafood, dairy, "
        "eggs, honey, or gelatin."
    ),
    DietarySystem.vegetarian: (
        "Vegetarian: no meat, poultry, fish, or seafood, and no gelatin or animal rennet."
    ),
    DietarySystem.pescatarian: (
        "Pescatarian: no meat or poultry. Fish, seafood, dairy, and eggs are allowed."
    ),
}

# The parts of a recipe the AI sees when editing one. Record-keeping fields
# (dietary_system, allergies_applied, ...) are ours, not the AI's.
CONTENT_FIELDS = {
    "title", "description", "ingredients", "steps", "yield_servings",
    "prep_time_mins", "cook_time_mins", "tags", "notes",
}


def _normalize_allergies(allergies: list[str]) -> list[str]:
    """Trim, lowercase, and de-duplicate, keeping order."""
    return list(dict.fromkeys(a.strip().lower() for a in allergies if a.strip()))


def build_instructions(dietary_system: DietarySystem, allergies: list[str], title_rule: str) -> str:
    lines = [
        "You are a recipe developer writing clear, home-cook-friendly recipes.",
        "Use US measurements. Number steps starting from 1.",
    ]
    if dietary_system != DietarySystem.none:
        lines.append(f"DIET (mandatory): {DIET_RULES[dietary_system]}")
    if allergies:
        lines.append(
            "ALLERGIES (mandatory, safety-critical): the recipe must contain none of: "
            + ", ".join(allergies)
            + ". This includes hidden sources such as oils, pastes, sauces, stocks, and "
            "pre-made products. If the request asks for a forbidden ingredient, use a safe "
            "substitute instead."
        )
    if dietary_system == DietarySystem.kosher:
        lines.append("Set kosher_category to meat, dairy, or parve.")
    else:
        lines.append("Set kosher_category to null.")
    lines.append(title_rule)
    lines.append(
        "In notes, briefly list any substitutions you made to follow the rules above; "
        "otherwise set notes to null."
    )
    return "\n".join(lines)


async def _ask_ai(instructions: str, user_input: str) -> AIRecipe:
    """One AI call, with the reply forced into the AIRecipe shape."""
    try:
        response = await client.responses.parse(
            model=settings.openai_model,
            instructions=instructions,
            input=user_input,
            text_format=AIRecipe,
        )
    except OpenAIError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"AI request failed: {e}")
    if response.output_parsed is None:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="AI did not return a recipe")
    return response.output_parsed


def _safety_problems(ai_recipe: AIRecipe, dietary_system: DietarySystem, allergies: list[str]) -> list[str]:
    """Our own check of the AI's ingredients against the active rules."""
    findings = find_allergens(ai_recipe.ingredients, allergies)
    if dietary_system == DietarySystem.kosher:
        findings += find_kosher_problems(ai_recipe.ingredients, ai_recipe.kosher_category)
    return [str(f) for f in findings]


def _load_saved_recipe(recipe_id: str, user_id: str) -> tuple[dict, list[str]]:
    """Return a saved recipe and the names of its collections, if the user owns it."""
    result = (
        supabase.table("recipes")
        .select("*")
        .eq("id", recipe_id)
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Base recipe not found")

    links = (
        supabase.table("recipe_collections")
        .select("collections(name)")
        .eq("recipe_id", recipe_id)
        .execute()
    )
    return result.data, [row["collections"]["name"] for row in links.data]


@router.post("/generate", response_model=GenerateResponse)
async def generate_recipe(body: GenerateRequest, current_user=Depends(get_current_user)):
    """Generate a draft recipe (or a new version of an existing one). Nothing is saved."""

    # 1. Load the user's saved diet and allergies
    profile = (
        supabase.table("users")
        .select("dietary_system, allergies")
        .eq("id", current_user.id)
        .maybe_single()
        .execute()
    )
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")

    # 2. Work out which rules are active for this request
    dietary_system = (
        DietarySystem(profile.data["dietary_system"]) if body.apply_dietary else DietarySystem.none
    )
    allergies: list[str] = list(body.extra_allergies)
    if body.apply_allergies:
        allergies += profile.data["allergies"]
    allergies = _normalize_allergies(allergies)

    # 3. Work out the starting point: new recipe, draft being tweaked, or saved recipe being adapted
    base = None
    parent_recipe_id = None
    collection_ids: list[str] = []
    collection_names: list[str] = []

    if body.base_recipe_id:
        # Pre-select the original's collections; the user can change them before saving
        base, collection_names = _load_saved_recipe(str(body.base_recipe_id), current_user.id)
        parent_recipe_id = str(body.base_recipe_id)
        title_rule = (
            "Keep the original title and add a short parenthetical suffix describing "
            'the change, e.g. "Shakshuka (Dairy-Free)".'
        )
    elif body.base_recipe:
        base = body.base_recipe.model_dump(mode="json")
        parent_recipe_id = body.base_recipe.parent_recipe_id
        collection_ids = body.base_recipe.collection_ids
        collection_names = body.base_recipe.collection_names
        title_rule = "Keep the current title unless the change makes it inaccurate."
    else:
        title_rule = "Give the recipe a short, appetizing title."

    if base:
        current = {k: v for k, v in base.items() if k in CONTENT_FIELDS}
        user_input = (
            f"Here is the current recipe:\n{json.dumps(current, indent=2)}\n\n"
            f"Change it as follows: {body.description}\n"
            "Keep everything else the same unless the rules above require a change."
        )
    else:
        user_input = f"Create a recipe for: {body.description}"

    # 4. Ask the AI, then 5. verify its answer with our own safety scan.
    # If the scan finds problems, retry once and tell the AI exactly what was wrong.
    instructions = build_instructions(dietary_system, allergies, title_rule)
    ai_recipe = await _ask_ai(instructions, user_input)
    problems = _safety_problems(ai_recipe, dietary_system, allergies)
    if problems:
        feedback = "\n".join(f"- {p}" for p in problems)
        ai_recipe = await _ask_ai(
            instructions,
            f"{user_input}\n\nA previous attempt broke the rules:\n{feedback}\n"
            "Replace those ingredients with safe alternatives.",
        )
        problems = _safety_problems(ai_recipe, dietary_system, allergies)

    if dietary_system == DietarySystem.kosher and ai_recipe.kosher_category is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="AI did not classify the kosher recipe"
        )
    warnings = [f"Couldn't rule out: {p}" for p in problems]

    # 6. Fill in the record-keeping fields from our own data, not the AI's
    recipe = RecipeCreate(
        **ai_recipe.model_dump(exclude={"title", "kosher_category"}),
        title=body.title or ai_recipe.title,
        kosher_category=ai_recipe.kosher_category if dietary_system == DietarySystem.kosher else None,
        dietary_system=dietary_system,
        allergies_applied=allergies,
        source=RecipeSource.ai_generated,
        parent_recipe_id=parent_recipe_id,
        collection_ids=collection_ids,
        collection_names=collection_names,
    )
    return GenerateResponse(recipe=recipe, warnings=warnings)
