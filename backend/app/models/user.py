from pydantic import BaseModel
from typing import Optional
from enum import Enum


class DietarySystem(str, Enum):
    none = "none"
    kosher = "kosher"
    halal = "halal"
    vegan = "vegan"
    vegetarian = "vegetarian"
    pescatarian = "pescatarian"


class UserProfile(BaseModel):
    id: str
    email: str
    dietary_system: DietarySystem
    allergies: list[str]


class UserProfileUpdate(BaseModel):
    dietary_system: Optional[DietarySystem] = None
    allergies: Optional[list[str]] = None
