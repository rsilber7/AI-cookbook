from pydantic import BaseModel
from typing import Optional
from enum import Enum
from datetime import datetime


class RecipeSource(str, Enum):
    ai_generated = "ai_generated"
    pasted = "pasted"
    manual = "manual"


class DietarySystem(str, Enum):
    none = "none"
    kosher = "kosher"
    halal = "halal"
    vegan = "vegan"
    vegetarian = "vegetarian"
    pescatarian = "pescatarian"


class Ingredient(BaseModel):
    name: str
    amount: float | int | None = None
    unit: Optional[str] = None
    notes: Optional[str] = None


class Step(BaseModel):
    order: int
    instruction: str
    duration_mins: Optional[int] = None
    temp_f: Optional[int] = None


class RecipeCreate(BaseModel):
    title: str
    description: Optional[str] = None
    ingredients: list[Ingredient]
    steps: list[Step]
    yield_servings: Optional[int] = None
    prep_time_mins: Optional[int] = None
    cook_time_mins: Optional[int] = None
    tags: list[str] = []
    dietary_system: DietarySystem = DietarySystem.none
    allergies_applied: list[str] = []
    source: RecipeSource = RecipeSource.ai_generated
    original_text: Optional[str] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None
    parent_recipe_id: Optional[str] = None
    collection_ids: list[str] = []


class RecipeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    ingredients: Optional[list[Ingredient]] = None
    steps: Optional[list[Step]] = None
    yield_servings: Optional[int] = None
    prep_time_mins: Optional[int] = None
    cook_time_mins: Optional[int] = None
    tags: Optional[list[str]] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None
    is_pinned: Optional[bool] = None


class Recipe(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str]
    ingredients: list[Ingredient]
    steps: list[Step]
    yield_servings: Optional[int]
    prep_time_mins: Optional[int]
    cook_time_mins: Optional[int]
    tags: list[str]
    dietary_system: DietarySystem
    allergies_applied: list[str]
    is_pinned: bool
    source: RecipeSource
    original_text: Optional[str]
    notes: Optional[str]
    image_url: Optional[str]
    parent_recipe_id: Optional[str]
    created_at: datetime
    updated_at: datetime
