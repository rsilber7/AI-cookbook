"""Code-based safety checks on AI-generated ingredients.

The AI is told the rules, but for allergies we verify its work independently.
These checks are deliberately cautious: a false alarm is better than a miss.
"""
import re
from dataclasses import dataclass
from app.models.recipe import Ingredient, KosherCategory

# Words that indicate each major allergen, including common hidden sources
ALLERGEN_KEYWORDS: dict[str, list[str]] = {
    "peanuts": ["peanut", "groundnut", "arachis oil", "satay"],
    "tree nuts": [
        "nut", "almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut", "filbert",
        "macadamia", "pine nut", "pignoli", "brazil nut", "chestnut", "praline", "marzipan",
        "frangipane", "nougat", "gianduja", "nutella", "pesto", "amaretto", "nut butter",
    ],
    "dairy": [
        "milk", "buttermilk", "butter", "cream", "cheese", "yogurt", "yoghurt", "ghee", "whey",
        "casein", "curd", "kefir", "custard", "labneh", "parmesan", "mozzarella", "ricotta",
        "feta", "cheddar", "gruyere", "mascarpone", "brie", "halloumi", "paneer",
    ],
    "eggs": ["egg", "yolk", "mayonnaise", "mayo", "meringue", "aioli", "albumen"],
    "gluten": [
        "wheat", "flour", "bread", "breadcrumb", "panko", "pasta", "noodle", "couscous",
        "barley", "rye", "semolina", "farro", "spelt", "bulgur", "seitan", "soy sauce",
        "beer", "malt", "tortilla", "crouton", "cracker", "orzo", "matzo",
    ],
    "soy": ["soy", "soya", "tofu", "tempeh", "edamame", "miso", "tamari"],
    "fish": [
        "fish", "salmon", "tuna", "cod", "anchovy", "anchovies", "sardine", "tilapia",
        "halibut", "trout", "mackerel", "haddock", "bass", "worcestershire",
    ],
    "shellfish": [
        "shrimp", "prawn", "crab", "lobster", "clam", "mussel", "oyster", "scallop",
        "crawfish", "crayfish", "langoustine", "squid", "calamari", "octopus",
    ],
    "sesame": ["sesame", "tahini", "halva", "halvah", "za'atar", "zaatar", "gomasio"],
}

# Ways users might write an allergy, mapped to the allergens above
ALIASES: dict[str, list[str]] = {
    "nuts": ["peanuts", "tree nuts"],
    "peanut": ["peanuts"],
    "tree nut": ["tree nuts"],
    "milk": ["dairy"],
    "lactose": ["dairy"],
    "egg": ["eggs"],
    "wheat": ["gluten"],
    "soybeans": ["soy"],
    "seafood": ["fish", "shellfish"],
    "sesame seeds": ["sesame"],
}

# Phrases that contain an allergen keyword but are safe for that allergen,
# e.g. "oat milk" contains "milk" but isn't dairy
SAFE_PHRASES: dict[str, list[str]] = {
    "dairy": [
        "oat milk", "almond milk", "soy milk", "coconut milk", "rice milk", "cashew milk",
        "plant milk", "plant-based milk", "peanut butter", "almond butter", "cashew butter",
        "sunflower butter", "sunflower seed butter", "seed butter", "nut butter",
        "apple butter", "cocoa butter", "coconut butter", "vegan butter", "coconut cream",
        "cream of tartar", "vegan cheese", "nutritional yeast",
    ],
    "gluten": [
        "rice flour", "almond flour", "coconut flour", "chickpea flour", "corn flour",
        "cornflour", "tapioca flour", "potato flour", "rice noodle", "corn tortilla",
        "buckwheat",
    ],
    "tree nuts": ["nutmeg", "butternut", "coconut", "water chestnut", "nutritional yeast"],
}

# Labels that mean an ingredient is explicitly free of an allergen
FREE_LABELS: dict[str, list[str]] = {
    "peanuts": ["peanut-free", "nut-free"],
    "tree nuts": ["nut-free", "tree nut-free"],
    "dairy": ["dairy-free", "non-dairy"],
    "eggs": ["egg-free"],
    "gluten": ["gluten-free"],
    "soy": ["soy-free"],
    "sesame": ["sesame-free"],
}

NON_KOSHER = [
    "pork", "bacon", "ham", "prosciutto", "pancetta", "lard", "chorizo", "guanciale",
    *ALLERGEN_KEYWORDS["shellfish"],
]
MEAT = [
    "beef", "chicken", "turkey", "lamb", "veal", "duck", "goose", "brisket", "steak",
    "meat", "meatball", "pastrami", "salami", "bone broth",
]


@dataclass
class Finding:
    ingredient: str
    problem: str

    def __str__(self) -> str:
        return f"'{self.ingredient}' {self.problem}"


def _contains(text: str, keywords: list[str]) -> bool:
    """Whole-word match, allowing simple plurals (egg -> eggs)."""
    return any(re.search(rf"\b{re.escape(k)}(?:s|es)?\b", text) for k in keywords)


def _strip_safe(text: str, allergen: str) -> str:
    for phrase in SAFE_PHRASES.get(allergen, []):
        text = text.replace(phrase, " ")
    return text


def _ingredient_text(ingredient: Ingredient) -> str:
    return ingredient.name.lower()


def _has_allergen(text: str, allergen: str) -> bool:
    if any(label in text for label in FREE_LABELS.get(allergen, [])):
        return False
    return _contains(_strip_safe(text, allergen), ALLERGEN_KEYWORDS[allergen])


def find_allergens(ingredients: list[Ingredient], allergies: list[str]) -> list[Finding]:
    """Flag ingredients that may contain any of the given allergies."""
    findings = []
    for allergy in allergies:
        allergy = allergy.strip().lower()
        known = ALIASES.get(allergy, [allergy] if allergy in ALLERGEN_KEYWORDS else [])
        for ingredient in ingredients:
            text = _ingredient_text(ingredient)
            if known:
                hits = [a for a in known if _has_allergen(text, a)]
            else:
                # Custom allergy (e.g. "cilantro"): match the word itself
                hits = [allergy] if f"{allergy}-free" not in text and _contains(text, [allergy]) else []
            findings += [Finding(ingredient.name, f"may contain {hit}") for hit in hits]
    return findings


def find_kosher_problems(ingredients: list[Ingredient], category: KosherCategory | None) -> list[Finding]:
    """Flag non-kosher ingredients and meat/dairy that conflicts with the category."""
    findings = []
    for ingredient in ingredients:
        text = _ingredient_text(ingredient)
        is_meat = _contains(text, MEAT)
        is_dairy = _has_allergen(text, "dairy")
        if _contains(text, NON_KOSHER):
            findings.append(Finding(ingredient.name, "is not kosher"))
        elif is_dairy and category in (KosherCategory.meat, KosherCategory.parve):
            findings.append(Finding(ingredient.name, f"is dairy, but the recipe is {category.value}"))
        elif is_meat and category in (KosherCategory.dairy, KosherCategory.parve):
            findings.append(Finding(ingredient.name, f"is meat, but the recipe is {category.value}"))
    return findings
