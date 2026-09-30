from pydantic import BaseModel, model_validator
from typing import Optional
from enum import Enum
from datetime import datetime
from uuid import UUID


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


class KosherCategory(str, Enum):
    parve = "parve"
    dairy = "dairy"
    meat = "meat"


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
    kosher_category: Optional[KosherCategory] = None
    source: RecipeSource = RecipeSource.manual
    original_text: Optional[str] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None
    parent_recipe_id: Optional[UUID] = None
    collection_ids: list[UUID] = []
    collection_names: list[str] = []  # found or created at save time

    @model_validator(mode="after")
    def check_kosher_category(self):
        # Mirrors the has_kosher_category DB constraint so bad input gets a clear 422
        if (self.dietary_system == DietarySystem.kosher) != (self.kosher_category is not None):
            raise ValueError("kosher_category is required for kosher recipes and not allowed otherwise")
        return self


class RecipeUpdate(BaseModel):
    """Only the fields sent are changed. Optional fields (description, times, ...)
    can be cleared by sending null; label changes are re-checked by the router."""
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
    dietary_system: Optional[DietarySystem] = None
    kosher_category: Optional[KosherCategory] = None
    allergies_applied: Optional[list[str]] = None

    @model_validator(mode="after")
    def check_required_not_cleared(self):
        required = {"title", "ingredients", "steps", "tags", "is_pinned", "dietary_system", "allergies_applied"}
        cleared = sorted(f for f in self.model_fields_set & required if getattr(self, f) is None)
        if cleared:
            raise ValueError(f"These can't be empty: {', '.join(cleared)}")
        return self


class RecipeCheck(BaseModel):
    """Labels to verify against a recipe's ingredients (the free keyword scan)."""
    ingredients: list[Ingredient]
    dietary_system: DietarySystem = DietarySystem.none
    kosher_category: Optional[KosherCategory] = None
    allergies: list[str] = []


class CheckProblem(BaseModel):
    ingredient: str
    problem: str
    label: str  # the allergy or "kosher" that this problem breaks
    message: str


class RecipeCheckResult(BaseModel):
    problems: list[CheckProblem]


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
    kosher_category: Optional[KosherCategory]
    is_pinned: bool
    source: RecipeSource
    original_text: Optional[str]
    notes: Optional[str]
    image_url: Optional[str]
    parent_recipe_id: Optional[str]
    created_at: datetime
    updated_at: datetime
