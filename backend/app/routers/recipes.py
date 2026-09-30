from uuid import UUID
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


def _require_owned(table: str, ids: list[str], user_id: str, detail: str) -> None:
    """404 unless every ID exists in `table` and belongs to this user.

    The backend's service key bypasses Supabase row-level security, so any ID the
    client sends must be checked here before it's used.
    """
    ids = list(set(ids))
    if not ids:
        return
    result = supabase.table(table).select("id").in_("id", ids).eq("user_id", user_id).execute()
    if len(result.data) != len(ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


@router.post("/", response_model=Recipe, status_code=status.HTTP_201_CREATED)
async def create_recipe(body: RecipeCreate, current_user=Depends(get_current_user)):
    # Check everything first, so a rejected save leaves nothing half-created
    given_ids = [str(cid) for cid in body.collection_ids]
    _require_owned("collections", given_ids, current_user.id, "Collection not found")
    if body.parent_recipe_id:
        _require_owned("recipes", [str(body.parent_recipe_id)], current_user.id, "Original recipe not found")

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
    updates = body.model_dump(mode="json", exclude_none=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

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
