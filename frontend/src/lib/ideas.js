// Quick-start ideas that pre-fill the Generate form (nothing runs until you press Generate)
export const QUICK_IDEAS = [
  { emoji: '🥘', label: 'Something cozy', prompt: 'something cozy and comforting for a chilly night' },
  { emoji: '⚡', label: '20-minute dinner', prompt: 'a quick weeknight dinner ready in 20 minutes' },
  { emoji: '🥗', label: 'Fresh and light', prompt: 'a fresh, light lunch with lots of vegetables' },
  { emoji: '🍪', label: 'Sweet treat', prompt: 'an easy dessert I can make with pantry staples' },
]

const SURPRISES = [
  'a street-food inspired dinner',
  'a one-pan dinner with crispy potatoes',
  'a colorful grain bowl',
  'a cozy soup with a surprising twist',
  'a brunch dish to impress friends',
  'a dinner inspired by Moroccan flavors',
  'a spicy noodle dish',
  'a sheet-pan dinner with minimal cleanup',
  'a picnic-friendly lunch',
  'a showstopper dessert that looks harder than it is',
  'a dish that uses up leftover vegetables',
  'a homemade version of a takeout favorite',
]

export function surpriseIdea() {
  return SURPRISES[Math.floor(Math.random() * SURPRISES.length)]
}
