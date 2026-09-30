from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_current_user
from app.database import supabase
from app.models.collection import Collection, CollectionCreate, CollectionUpdate
from app.ownership import find_collection_by_name, require_owned

router = APIRouter(prefix="/collections", tags=["collections"])


def _reject_duplicate_name(user_id: str, name: str, allowed_id: str | None = None) -> None:
    existing = find_collection_by_name(user_id, name)
    if existing and existing["id"] != allowed_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f'You already have a collection named "{existing["name"]}"',
        )


@router.get("/", response_model=list[Collection])
async def list_collections(current_user=Depends(get_current_user)):
    result = (
        supabase.table("collections")
        .select("*")
        .eq("user_id", current_user.id)
        .order("created_at")
        .execute()
    )
    return result.data


@router.post("/", response_model=Collection, status_code=status.HTTP_201_CREATED)
async def create_collection(body: CollectionCreate, current_user=Depends(get_current_user)):
    _reject_duplicate_name(current_user.id, body.name)
    result = (
        supabase.table("collections")
        .insert({"name": body.name, "user_id": current_user.id})
        .execute()
    )
    return result.data[0]


@router.patch("/{collection_id}", response_model=Collection)
async def rename_collection(collection_id: UUID, body: CollectionUpdate, current_user=Depends(get_current_user)):
    cid = str(collection_id)
    require_owned("collections", [cid], current_user.id, "Collection not found")
    _reject_duplicate_name(current_user.id, body.name, allowed_id=cid)
    result = (
        supabase.table("collections")
        .update({"name": body.name})
        .eq("id", cid)
        .eq("user_id", current_user.id)
        .execute()
    )
    return result.data[0]


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(collection_id: UUID, current_user=Depends(get_current_user)):
    """Delete the collection only; its recipes stay (links are removed by cascade)."""
    cid = str(collection_id)
    require_owned("collections", [cid], current_user.id, "Collection not found")
    supabase.table("collections").delete().eq("id", cid).eq("user_id", current_user.id).execute()


@router.get("/{collection_id}/recipes")
async def list_recipes_in_collection(collection_id: UUID, current_user=Depends(get_current_user)):
    # Inner join on collections so only the user's own collection matches
    # (the service key bypasses RLS, so ownership must be checked here)
    result = (
        supabase.table("recipe_collections")
        .select("recipes(*), collections!inner(user_id)")
        .eq("collection_id", str(collection_id))
        .eq("collections.user_id", current_user.id)
        .execute()
    )
    return [row["recipes"] for row in result.data]


@router.delete("/{collection_id}/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_recipe_from_collection(
    collection_id: UUID, recipe_id: UUID, current_user=Depends(get_current_user)
):
    """Take a recipe out of one collection. The recipe itself is not deleted."""
    cid = str(collection_id)
    require_owned("collections", [cid], current_user.id, "Collection not found")
    (
        supabase.table("recipe_collections")
        .delete()
        .eq("collection_id", cid)
        .eq("recipe_id", str(recipe_id))
        .execute()
    )
