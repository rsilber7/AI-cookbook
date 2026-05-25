from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies import get_current_user
from app.database import supabase
from app.models.user import UserProfile, UserProfileUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserProfile)
async def get_profile(current_user=Depends(get_current_user)):
    result = supabase.table("users").select("*").eq("id", current_user.id).single().execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    return result.data


@router.patch("/me", response_model=UserProfile)
async def update_profile(body: UserProfileUpdate, current_user=Depends(get_current_user)):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    result = (
        supabase.table("users")
        .update(updates)
        .eq("id", current_user.id)
        .single()
        .execute()
    )
    return result.data
