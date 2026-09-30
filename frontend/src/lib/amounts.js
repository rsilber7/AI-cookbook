const UNICODE_FRACTIONS = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 }

// Reads an amount the way people type it (and the way formatAmount shows it):
// "2", "0.5", "1/2", "1 1/2", "½", "1½" -> number; "" -> null; anything else -> NaN
export function parseAmount(text) {
  const trimmed = text.trim()
  if (!trimmed) return null
  let total = 0
  for (const part of trimmed.replace(/(\d)([¼½¾⅓⅔])/g, '$1 $2').split(/\s+/)) {
    if (part in UNICODE_FRACTIONS) total += UNICODE_FRACTIONS[part]
    else if (/^\d+\/\d+$/.test(part)) {
      const [top, bottom] = part.split('/').map(Number)
      if (!bottom) return NaN
      total += top / bottom
    } else if (/^\d*\.?\d+$/.test(part)) total += Number(part)
    else return NaN
  }
  return Math.round(total * 1000) / 1000
}
