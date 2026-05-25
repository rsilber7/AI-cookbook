from pydantic import BaseModel
from datetime import datetime


class CollectionCreate(BaseModel):
    name: str


class Collection(BaseModel):
    id: str
    user_id: str
    name: str
    created_at: datetime
