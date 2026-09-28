from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_current_user
from app.database import supabase
from app.models.recipe import Recipe, RecipeCreate, RecipeUpdate

router = APIRouter(prefix="/recipes", tags=["recipes"])


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
async def get_recipe(recipe_id: str, current_user=Depends(get_current_user)):
    result = (
        supabase.table("recipes")
        .select("*")
        .eq("id", recipe_id)
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
        # Escape ilike wildcards so a name like "50% off" matches literally
        pattern = name.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        existing = (
            supabase.table("collections")
            .select("id")
            .eq("user_id", user_id)
            .ilike("name", pattern)
            .limit(1)
            .execute()
        )
        if existing.data:
            ids.append(existing.data[0]["id"])
        else:
            created = supabase.table("collections").insert({"name": name, "user_id": user_id}).execute()
            ids.append(created.data[0]["id"])
    return ids


@router.post("/", response_model=Recipe, status_code=status.HTTP_201_CREATED)
async def create_recipe(body: RecipeCreate, current_user=Depends(get_current_user)):
    named_ids = _find_or_create_collections(current_user.id, body.collection_names)
    collection_ids = list(dict.fromkeys(body.collection_ids + named_ids))
    recipe_data = body.model_dump(mode="json", exclude={"collection_ids", "collection_names"})
    recipe_data["user_id"] = current_user.id

    result = supabase.table("recipes").insert(recipe_data).execute()
    recipe = result.data[0]

    if collection_ids:
        joins = [{"recipe_id": recipe["id"], "collection_id": cid} for cid in collection_ids]
        supabase.table("recipe_collections").insert(joins).execute()

    return recipe


@router.patch("/{recipe_id}", response_model=Recipe)
async def update_recipe(recipe_id: str, body: RecipeUpdate, current_user=Depends(get_current_user)):
    updates = body.model_dump(mode="json", exclude_none=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    result = (
        supabase.table("recipes")
        .update(updates)
        .eq("id", recipe_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    return result.data[0]


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recipe(recipe_id: str, current_user=Depends(get_current_user)):
    supabase.table("recipes").delete().eq("id", recipe_id).eq("user_id", current_user.id).execute()
