from pydantic import BaseModel, Field, model_validator
from typing import Optional
from uuid import UUID
from app.models.recipe import Ingredient, Step, KosherCategory, RecipeCreate


class RuleOptions(BaseModel):
    """Which diet/allergy rules apply to an AI request. Shared by generate and import."""
    apply_dietary: bool = True
    apply_allergies: bool = True
    # One-off allergies for this recipe (guests, "make it dairy-free", ...)
    extra_allergies: list[str] = []


class GenerateRequest(RuleOptions):
    # What to make, or (when a base recipe is given) how to change it
    description: str
    # User-chosen title; always wins over the AI's
    title: Optional[str] = None

    # Set at most one: a draft being tweaked, or a saved recipe being adapted
    base_recipe: Optional[RecipeCreate] = None
    base_recipe_id: Optional[UUID] = None

    @model_validator(mode="after")
    def check_single_base(self):
        if self.base_recipe and self.base_recipe_id:
            raise ValueError("Send base_recipe or base_recipe_id, not both")
        return self


class ImportRequest(RuleOptions):
    """Import from pasted text OR a photo (exactly one)."""
    # A recipe pasted from anywhere (a text, the Notes app, a website)
    text: Optional[str] = Field(None, min_length=1, max_length=20_000)
    # A photo/screenshot as a data URL. The browser shrinks it to a small JPEG
    # first, so this cap (~4.5 MB of image) is generous.
    image: Optional[str] = Field(None, pattern=r"^data:image/(jpeg|png|webp);base64,", max_length=6_000_000)
    # User-chosen title; otherwise the recipe's own title is kept
    title: Optional[str] = None

    @model_validator(mode="after")
    def check_one_source(self):
        if (self.text is None) == (self.image is None):
            raise ValueError("Send either text or image, not both")
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


class AIPhotoRecipe(AIRecipe):
    """Reply shape for photo imports: the recipe plus what the photo actually says.

    There's no pasted text to keep, so the transcription becomes the recipe's
    original_text (the photo itself isn't stored).
    """
    source_text: str


class GenerateResponse(BaseModel):
    recipe: RecipeCreate  # a draft, ready to send to POST /recipes/ as-is
    warnings: list[str] = []
