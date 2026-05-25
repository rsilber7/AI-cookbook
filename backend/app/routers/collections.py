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
        .single()
        .execute()
    )
    return result.data


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(collection_id: str, current_user=Depends(get_current_user)):
    supabase.table("collections").delete().eq("id", collection_id).eq("user_id", current_user.id).execute()


@router.get("/{collection_id}/recipes")
async def list_recipes_in_collection(collection_id: str, current_user=Depends(get_current_user)):
    result = (
        supabase.table("recipe_collections")
        .select("recipes(*)")
        .eq("collection_id", collection_id)
        .execute()
    )
    return [row["recipes"] for row in result.data]
