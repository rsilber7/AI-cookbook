// A few food emojis drifting slowly down behind the page. Hidden for "reduce motion".
const FOODS = [
  { emoji: '🍋', left: 6, duration: 19, delay: -4, size: 28 },
  { emoji: '🥕', left: 17, duration: 23, delay: -15, size: 24 },
  { emoji: '🍅', left: 29, duration: 21, delay: -9, size: 30 },
  { emoji: '🥐', left: 41, duration: 26, delay: -20, size: 26 },
  { emoji: '🌿', left: 53, duration: 18, delay: -2, size: 24 },
  { emoji: '🧄', left: 64, duration: 24, delay: -12, size: 24 },
  { emoji: '🍓', left: 75, duration: 20, delay: -17, size: 26 },
  { emoji: '🫐', left: 86, duration: 22, delay: -7, size: 24 },
  { emoji: '🍞', left: 95, duration: 27, delay: -22, size: 28 },
]

export default function FallingFood() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {FOODS.map((f) => (
        <span
          key={f.emoji}
          className="falling-food absolute top-0 opacity-40"
          style={{ left: `${f.left}%`, fontSize: f.size, animationDuration: `${f.duration}s`, animationDelay: `${f.delay}s` }}
        >
          {f.emoji}
        </span>
      ))}
    </div>
  )
}
