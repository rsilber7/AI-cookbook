import pytest
from app.allergens import find_allergens, find_kosher_problems
from app.models.recipe import Ingredient, KosherCategory


def ingredients(*names: str) -> list[Ingredient]:
    return [Ingredient(name=n) for n in names]


def flagged(names, allergies) -> list[str]:
    return [f.ingredient for f in find_allergens(ingredients(*names), allergies)]


@pytest.mark.parametrize("name, allergy", [
    ("almond flour", "tree nuts"),
    ("basil pesto", "tree nuts"),
    ("toasted pine nuts", "tree nuts"),
    ("creamy peanut butter", "peanuts"),
    ("unsalted butter", "dairy"),
    ("heavy cream", "dairy"),
    ("grated parmesan", "dairy"),
    ("large eggs", "eggs"),
    ("all-purpose flour", "gluten"),
    ("soy sauce", "gluten"),
    ("soy sauce", "soy"),
    ("worcestershire sauce", "fish"),
    ("tahini", "sesame"),
    ("jumbo shrimp", "shellfish"),
])
def test_flags_allergen(name, allergy):
    assert flagged([name], [allergy]) == [name]


@pytest.mark.parametrize("name, allergy", [
    ("ground nutmeg", "tree nuts"),       # "nut" inside another word
    ("butternut squash", "tree nuts"),
    ("coconut milk", "tree nuts"),
    ("oat milk", "dairy"),                # plant milks aren't dairy
    ("peanut butter", "dairy"),
    ("cream of tartar", "dairy"),
    ("eggplant", "eggs"),
    ("buckwheat groats", "gluten"),
    ("rice flour", "gluten"),
    ("gluten-free pasta", "gluten"),      # explicitly labeled free
    ("nut-free pesto", "tree nuts"),
    ("raw pumpkin seeds", "tree nuts"),
])
def test_does_not_flag_safe_ingredient(name, allergy):
    assert flagged([name], [allergy]) == []


def test_nuts_alias_covers_peanuts_and_tree_nuts():
    assert flagged(["peanuts", "cashews", "rice"], ["nuts"]) == ["peanuts", "cashews"]


def test_custom_allergy_matches_its_own_name():
    assert flagged(["fresh cilantro", "lime juice"], ["cilantro"]) == ["fresh cilantro"]


def test_allergy_names_are_case_insensitive():
    assert flagged(["Almonds"], ["Tree Nuts"]) == ["Almonds"]


def test_kosher_meat_recipe_rejects_dairy():
    problems = find_kosher_problems(ingredients("chicken breast", "butter"), KosherCategory.meat)
    assert [p.ingredient for p in problems] == ["butter"]


def test_kosher_dairy_recipe_rejects_meat():
    problems = find_kosher_problems(ingredients("beef broth", "cheddar"), KosherCategory.dairy)
    assert [p.ingredient for p in problems] == ["beef broth"]


def test_kosher_rejects_pork_and_shellfish():
    problems = find_kosher_problems(ingredients("bacon", "shrimp", "onion"), KosherCategory.meat)
    assert [p.ingredient for p in problems] == ["bacon", "shrimp"]


def test_kosher_meat_recipe_allows_plant_milk():
    assert find_kosher_problems(ingredients("chicken", "oat milk", "olive oil"), KosherCategory.meat) == []
