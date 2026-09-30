// Pre-written kitchen tips (not AI). Tips with `diets` only show for those diets.
const TIPS = [
  { text: 'Salt your pasta water until it tastes like the sea.', emoji: '🌊' },
  { text: 'Let meat rest for 5–10 minutes before slicing so the juices stay put.', emoji: '🥩' },
  { text: 'Pat meat and fish dry before searing for a golden crust.', emoji: '🍳' },
  { text: "Don't crowd the pan: food steams instead of browning.", emoji: '🥘' },
  { text: 'Save a splash of pasta water. Its starch makes sauces silky.', emoji: '🍝' },
  { text: 'Taste as you go, and adjust salt and acid at the end.', emoji: '👅' },
  { text: 'Zest your lemons before you juice them.', emoji: '🍋' },
  { text: 'A squeeze of lemon or a splash of vinegar wakes up a flat dish.', emoji: '✨' },
  { text: 'Read the whole recipe before you start cooking.', emoji: '📖' },
  { text: 'A sharp knife is safer than a dull one: it slips less.', emoji: '🔪' },
  { text: 'Chill onions before cutting for fewer tears.', emoji: '🧅' },
  { text: 'Store tomatoes on the counter, not in the fridge, for better flavor.', emoji: '🍅' },
  { text: 'Put a banana in a paper bag with an avocado to ripen it faster.', emoji: '🥑' },
  { text: 'Keep soft herbs like parsley in a glass of water, like flowers.', emoji: '🌿' },
  { text: 'Freeze leftover herbs in olive oil in an ice-cube tray.', emoji: '🧊' },
  { text: 'Day-old rice makes the best fried rice.', emoji: '🍚' },
  { text: 'Toast whole spices in a dry pan for a minute to wake up their flavor.', emoji: '🌶️' },
  { text: 'Grate frozen butter into flour for extra-flaky pastry.', emoji: '🥐' },
  { text: 'Room-temperature egg whites whip up to more volume.', emoji: '🥚' },
  { text: 'Add garlic near the end of sautéing so it doesn’t burn.', emoji: '🧄' },
  { text: 'Honey keeps for years. Edible honey has been found in ancient Egyptian tombs.', emoji: '🍯' },
  { text: 'Apples float because about a quarter of their volume is air.', emoji: '🍎' },
  { text: 'Carrots used to be purple, yellow, and white before orange ones became popular.', emoji: '🥕' },
  { text: 'Cook once, eat twice: double a recipe and freeze half.', emoji: '📦' },
  { text: 'A pinch of salt makes desserts taste sweeter.', emoji: '🧂' },
  { text: 'Let cookie dough rest in the fridge overnight for deeper flavor.', emoji: '🍪' },
  { text: 'Rinse quinoa before cooking to remove its bitter coating.', emoji: '🥣' },
  { text: 'Use the leftover rind of hard cheese to flavor soups.', emoji: '🧀' },
  { text: 'Parve dishes (no meat or dairy) can go with any meal.', emoji: '🥗', diets: ['kosher'] },
  { text: 'Look for a hechsher (kosher certification) on wine, cheese, and gelatin.', emoji: '✡️', diets: ['kosher'] },
  { text: 'Keep separate sponges and towels for meat and dairy dishes.', emoji: '🧽', diets: ['kosher'] },
  { text: 'Check marshmallows and gummies for halal gelatin.', emoji: '🍬', diets: ['halal'] },
  { text: 'Most vanilla extract contains alcohol. Alcohol-free vanilla is easy to find.', emoji: '🌼', diets: ['halal'] },
  { text: 'Aquafaba (the liquid in a can of chickpeas) whips like egg whites.', emoji: '🫘', diets: ['vegan'] },
  { text: 'Nutritional yeast adds a cheesy, savory flavor.', emoji: '🧀', diets: ['vegan', 'vegetarian'] },
  { text: 'Worcestershire sauce usually contains anchovies. Look for a vegan version.', emoji: '🐟', diets: ['vegan', 'vegetarian'] },
  { text: 'Fish is done when it flakes easily with a fork.', emoji: '🐠', diets: ['pescatarian'] },
]

// The same tip all day for everyone on the same diet; a new one each day
export function tipOfTheDay(dietarySystem) {
  const tips = TIPS.filter((tip) => !tip.diets || tip.diets.includes(dietarySystem))
  const day = Math.floor(Date.now() / 86_400_000)
  return tips[day % tips.length]
}
