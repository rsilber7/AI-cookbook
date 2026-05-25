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
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    return result.data


@router.post("/", response_model=Recipe, status_code=status.HTTP_201_CREATED)
async def create_recipe(body: RecipeCreate, current_user=Depends(get_current_user)):
    collection_ids = body.collection_ids
    recipe_data = body.model_dump(exclude={"collection_ids"})
    recipe_data["user_id"] = current_user.id
    recipe_data["ingredients"] = [i.model_dump() for i in body.ingredients]
    recipe_data["steps"] = [s.model_dump() for s in body.steps]

    result = supabase.table("recipes").insert(recipe_data).single().execute()
    recipe = result.data

    if collection_ids:
        joins = [{"recipe_id": recipe["id"], "collection_id": cid} for cid in collection_ids]
        supabase.table("recipe_collections").insert(joins).execute()

    return recipe


@router.patch("/{recipe_id}", response_model=Recipe)
async def update_recipe(recipe_id: str, body: RecipeUpdate, current_user=Depends(get_current_user)):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    if "ingredients" in updates:
        updates["ingredients"] = [i.model_dump() for i in body.ingredients]
    if "steps" in updates:
        updates["steps"] = [s.model_dump() for s in body.steps]

    result = (
        supabase.table("recipes")
        .update(updates)
        .eq("id", recipe_id)
        .eq("user_id", current_user.id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    return result.data


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recipe(recipe_id: str, current_user=Depends(get_current_user)):
    supabase.table("recipes").delete().eq("id", recipe_id).eq("user_id", current_user.id).execute()
