from typing import Annotated
from uuid import UUID
from pydantic import BaseModel, StringConstraints
from datetime import datetime

CollectionName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class CollectionCreate(BaseModel):
    name: CollectionName


class CollectionUpdate(BaseModel):
    name: CollectionName


class Collection(BaseModel):
    id: str
    user_id: str
    name: str
    created_at: datetime


class RecipeCollections(BaseModel):
    """The exact set of collections a recipe should be in.

    Existing collections by ID; new ones by name (created if they don't exist).
    """
    collection_ids: list[UUID] = []
    collection_names: list[CollectionName] = []
