// Display labels for backend enum values

export const DIETS = [
  { value: 'none', label: 'No diet', emoji: '🍽️' },
  { value: 'kosher', label: 'Kosher', emoji: '✡️' },
  { value: 'halal', label: 'Halal', emoji: '☪️' },
  { value: 'vegan', label: 'Vegan', emoji: '🌱' },
  { value: 'vegetarian', label: 'Vegetarian', emoji: '🥕' },
  { value: 'pescatarian', label: 'Pescatarian', emoji: '🐟' },
]

export const KOSHER_CATEGORIES = {
  meat: { label: 'Meat', className: 'bg-red-50 text-red-800 ring-red-200' },
  dairy: { label: 'Dairy', className: 'bg-sky-50 text-sky-800 ring-sky-200' },
  parve: { label: 'Parve', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
}

export const SOURCES = {
  ai_generated: 'Made with AI',
  pasted: 'Imported',
  manual: 'Added by hand',
}

export function dietInfo(value) {
  return DIETS.find((d) => d.value === value) ?? DIETS[0]
}

// 0.5 -> "½", 1.25 -> "1¼"; other decimals are shown as-is
const FRACTIONS = { 0.25: '¼', 0.33: '⅓', 0.5: '½', 0.67: '⅔', 0.75: '¾' }

export function formatAmount(amount) {
  if (amount == null) return ''
  const whole = Math.floor(amount)
  const fraction = FRACTIONS[Math.round((amount - whole) * 100) / 100]
  if (!fraction) return String(amount)
  return whole ? `${whole}${fraction}` : fraction
}

export function totalMinutes(recipe) {
  const total = (recipe.prep_time_mins ?? 0) + (recipe.cook_time_mins ?? 0)
  return total || null
}

// Cookbook-tab colors for collections, cycled by position
const TAB_COLORS = ['border-l-tomato', 'border-l-butter', 'border-l-basil', 'border-l-blueberry', 'border-l-plum']

export function tabColor(index) {
  return TAB_COLORS[index % TAB_COLORS.length]
}
