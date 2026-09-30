"""Ownership checks shared by the routers.

The backend's service key bypasses Supabase row-level security, so any ID the
client sends must be checked here before it's used.
"""
from fastapi import HTTPException, status
from app.database import supabase


def require_owned(table: str, ids: list[str], user_id: str, detail: str) -> None:
    """404 unless every ID exists in `table` and belongs to this user."""
    ids = list(set(ids))
    if not ids:
        return
    result = supabase.table(table).select("id").in_("id", ids).eq("user_id", user_id).execute()
    if len(result.data) != len(ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def find_collection_by_name(user_id: str, name: str) -> dict | None:
    """The user's collection with this name, ignoring case ("dinner" finds "Dinner")."""
    # Escape ilike wildcards so a name like "50% off" matches literally
    pattern = name.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    result = (
        supabase.table("collections")
        .select("id, name")
        .eq("user_id", user_id)
        .ilike("name", pattern)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None
