from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_current_user
from app.database import supabase
from app.models.collection import Collection, CollectionCreate

router = APIRouter(prefix="/collections", tags=["collections"])


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
    result = (
        supabase.table("collections")
        .insert({"name": body.name, "user_id": current_user.id})
        .execute()
    )
    return result.data[0]


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(collection_id: UUID, current_user=Depends(get_current_user)):
    supabase.table("collections").delete().eq("id", str(collection_id)).eq("user_id", current_user.id).execute()


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
