from fastapi import Header, HTTPException, status
from app.database import supabase


async def get_current_user(authorization: str | None = Header(None)):
    """Extract and verify the Supabase JWT from the Authorization header."""
    # Optional header so a missing login is a 401 (not FastAPI's generic 422)
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not logged in")

    token = authorization.removeprefix("Bearer ")

    try:
        response = supabase.auth.get_user(token)
        if not response.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
        return response.user
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
