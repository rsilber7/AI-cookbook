from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_current_user
from app.database import supabase
from app.models.collection import Collection, RecipeCollections
from app.allergens import check_recipe
from app.models.recipe import (
    DietarySystem, Ingredient, KosherCategory, Recipe, RecipeCheck, RecipeCheckResult,
    RecipeCreate, RecipeSource, RecipeUpdate,
)
from app.ownership import find_collection_by_name, require_owned

router = APIRouter(prefix="/recipes", tags=["recipes"])

# Fields whose change requires re-checking the recipe's diet/allergy labels
LABEL_FIELDS = {"ingredients", "dietary_system", "kosher_category", "allergies_applied"}


@router.get("/", response_model=list[Recipe])
async def list_recipes(current_user=Depends(get_current_user)):
    result = (
        supabase.table("recipes")
        .select("*")
        .eq("user_id", current_user.id)
        .order("is_pinned", desc=True)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data


@router.get("/{recipe_id}", response_model=Recipe)
async def get_recipe(recipe_id: UUID, current_user=Depends(get_current_user)):
    result = (
        supabase.table("recipes")
        .select("*")
        .eq("id", str(recipe_id))
        .eq("user_id", current_user.id)
        .maybe_single()
        .execute()
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    return result.data


def _find_or_create_collections(user_id: str, names: list[str]) -> list[str]:
    """Return collection IDs for these names, creating any that don't exist yet.

    Matching is case-insensitive, so "dinner" reuses an existing "Dinner".
    """
    ids = []
    for name in names:
        existing = find_collection_by_name(user_id, name)
        if existing:
            ids.append(existing["id"])
        else:
            created = supabase.table("collections").insert({"name": name, "user_id": user_id}).execute()
            ids.append(created.data[0]["id"])
    return ids


def _reject_false_labels(
    ingredients: list[Ingredient],
    dietary_system: DietarySystem,
    kosher_category: KosherCategory | None,
    allergies: list[str],
) -> None:
    """422 if the ingredients contradict the recipe's diet/allergy labels."""
    findings = check_recipe(ingredients, dietary_system, kosher_category, allergies)
    if findings:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=[{"msg": f"{f} (breaks the {f.label} label)", "label": f.label, "ingredient": f.ingredient} for f in findings],
        )


@router.post("/check", response_model=RecipeCheckResult)
async def check_labels(body: RecipeCheck, current_user=Depends(get_current_user)):
    """Free keyword scan (no AI): which labels would these ingredients break?"""
    findings = check_recipe(body.ingredients, body.dietary_system, body.kosher_category, body.allergies)
    return {
        "problems": [
            {"ingredient": f.ingredient, "problem": f.problem, "label": f.label, "message": str(f)}
            for f in findings
        ]
    }


@router.post("/", response_model=Recipe, status_code=status.HTTP_201_CREATED)
async def create_recipe(body: RecipeCreate, current_user=Depends(get_current_user)):
    # Hand-written recipes weren't checked by the AI flow, so verify their labels here
    if body.source == RecipeSource.manual:
        _reject_false_labels(body.ingredients, body.dietary_system, body.kosher_category, body.allergies_applied)

    # Check everything first, so a rejected save leaves nothing half-created
    given_ids = [str(cid) for cid in body.collection_ids]
    require_owned("collections", given_ids, current_user.id, "Collection not found")
    if body.parent_recipe_id:
        require_owned("recipes", [str(body.parent_recipe_id)], current_user.id, "Original recipe not found")

    named_ids = _find_or_create_collections(current_user.id, body.collection_names)
    collection_ids = list(dict.fromkeys(given_ids + named_ids))
    recipe_data = body.model_dump(mode="json", exclude={"collection_ids", "collection_names"})
    recipe_data["user_id"] = current_user.id

    result = supabase.table("recipes").insert(recipe_data).execute()
    recipe = result.data[0]

    if collection_ids:
        links = [{"recipe_id": recipe["id"], "collection_id": cid} for cid in collection_ids]
        supabase.table("recipe_collections").insert(links).execute()

    return recipe


@router.patch("/{recipe_id}", response_model=Recipe)
async def update_recipe(recipe_id: UUID, body: RecipeUpdate, current_user=Depends(get_current_user)):
    # exclude_unset (not exclude_none) so optional fields like cook time can be cleared with null
    updates = body.model_dump(mode="json", exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    # Changing ingredients or labels must keep the labels true (a pin or title edit skips this)
    if LABEL_FIELDS & updates.keys():
        current = (
            supabase.table("recipes")
            .select("*")
            .eq("id", str(recipe_id))
            .eq("user_id", current_user.id)
            .maybe_single()
            .execute()
        )
        if not current:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
        merged = {**current.data, **updates}
        diet = DietarySystem(merged["dietary_system"])
        category = KosherCategory(merged["kosher_category"]) if merged["kosher_category"] else None
        if (diet == DietarySystem.kosher) != (category is not None):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Kosher recipes need a meat, dairy, or parve category (and other recipes can't have one)",
            )
        _reject_false_labels(
            [Ingredient(**i) for i in merged["ingredients"]], diet, category, merged["allergies_applied"]
        )

    result = (
        supabase.table("recipes")
        .update(updates)
        .eq("id", str(recipe_id))
        .eq("user_id", current_user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    return result.data[0]


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recipe(recipe_id: UUID, current_user=Depends(get_current_user)):
    supabase.table("recipes").delete().eq("id", str(recipe_id)).eq("user_id", current_user.id).execute()


def _collections_of(recipe_id: str) -> list[dict]:
    links = supabase.table("recipe_collections").select("collections(*)").eq("recipe_id", recipe_id).execute()
    return sorted((row["collections"] for row in links.data), key=lambda c: c["created_at"])


@router.get("/{recipe_id}/collections", response_model=list[Collection])
async def get_recipe_collections(recipe_id: UUID, current_user=Depends(get_current_user)):
    rid = str(recipe_id)
    require_owned("recipes", [rid], current_user.id, "Recipe not found")
    return _collections_of(rid)


@router.put("/{recipe_id}/collections", response_model=list[Collection])
async def set_recipe_collections(recipe_id: UUID, body: RecipeCollections, current_user=Depends(get_current_user)):
    """Put the recipe in exactly these collections: adds, removes, or moves it.

    Only the differences are written, so existing memberships aren't wiped
    and re-added.
    """
    rid = str(recipe_id)
    given_ids = [str(cid) for cid in body.collection_ids]
    require_owned("recipes", [rid], current_user.id, "Recipe not found")
    require_owned("collections", given_ids, current_user.id, "Collection not found")

    wanted = set(given_ids) | set(_find_or_create_collections(current_user.id, body.collection_names))
    current_links = supabase.table("recipe_collections").select("collection_id").eq("recipe_id", rid).execute()
    current = {row["collection_id"] for row in current_links.data}

    if to_add := wanted - current:
        links = [{"recipe_id": rid, "collection_id": cid} for cid in to_add]
        supabase.table("recipe_collections").insert(links).execute()
    if to_remove := current - wanted:
        (
            supabase.table("recipe_collections")
            .delete()
            .eq("recipe_id", rid)
            .in_("collection_id", list(to_remove))
            .execute()
        )
    return _collections_of(rid)
