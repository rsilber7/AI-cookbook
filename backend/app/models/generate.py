from pydantic import BaseModel, model_validator
from typing import Optional
from uuid import UUID
from app.models.recipe import Ingredient, Step, KosherCategory, RecipeCreate


class GenerateRequest(BaseModel):
    # What to make, or (when a base recipe is given) how to change it
    description: str
    # User-chosen title; always wins over the AI's
    title: Optional[str] = None

    apply_dietary: bool = True
    apply_allergies: bool = True
    # One-off allergies for this recipe (guests, "make it dairy-free", ...)
    extra_allergies: list[str] = []

    # Set at most one: a draft being tweaked, or a saved recipe being adapted
    base_recipe: Optional[RecipeCreate] = None
    base_recipe_id: Optional[UUID] = None

    @model_validator(mode="after")
    def check_single_base(self):
        if self.base_recipe and self.base_recipe_id:
            raise ValueError("Send base_recipe or base_recipe_id, not both")
        return self


class AIRecipe(BaseModel):
    """The shape the AI must reply in (enforced via Structured Outputs).

    Only content fields: record-keeping fields like dietary_system and
    allergies_applied are filled in by our code, never by the AI.
    """
    title: str
    description: str
    ingredients: list[Ingredient]
    steps: list[Step]
    yield_servings: Optional[int]
    prep_time_mins: Optional[int]
    cook_time_mins: Optional[int]
    tags: list[str]
    kosher_category: Optional[KosherCategory]
    notes: Optional[str]


class GenerateResponse(BaseModel):
    recipe: RecipeCreate  # a draft, ready to send to POST /recipes/ as-is
    warnings: list[str] = []
