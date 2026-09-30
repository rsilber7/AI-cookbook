// Shrinks a photo in the browser before upload: faster, cheaper for the AI, and
// converts formats the API can't take (e.g. iPhone HEIC, where the browser can open it) to JPEG.

// ~3 megapixels keeps recipe text readable, even on tall screenshots
const MAX_PIXELS = 3_000_000

export async function imageFileToDataUrl(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error("Couldn't open that image. Try a JPG, PNG, or a screenshot."))
      image.src = url
    })
    const scale = Math.min(1, Math.sqrt(MAX_PIXELS / (img.naturalWidth * img.naturalHeight)))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff' // transparent PNGs would otherwise turn black as JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}
