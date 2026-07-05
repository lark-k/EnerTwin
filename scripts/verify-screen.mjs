import { mkdir, writeFile } from 'node:fs/promises'
import { PNG } from 'pngjs'
import { chromium } from 'playwright'

const url = process.env.ENERTWIN_SCREEN_URL ?? 'http://localhost:5173/'
const outputDir = new URL('../artifacts/', import.meta.url)
const viewports = [
  { width: 1920, height: 1080, name: '1920x1080' },
  { width: 2560, height: 1440, name: '2560x1440' },
  { width: 3840, height: 2160, name: '3840x2160' },
]

await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch()
const results = []

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForSelector('canvas')
  await page.waitForFunction(() => !document.querySelector('.intro-stage'), undefined, { timeout: 12000 }).catch(() => undefined)
  await page.waitForTimeout(800)

  const diagnostics = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const panels = document.querySelectorAll('.glass-panel').length
    const labels = document.querySelectorAll('.scene-label').length
    const charts = document.querySelectorAll('.trend-chart canvas').length
    const modeButtons = document.querySelectorAll('.mode-switcher button').length
    const introGone = !document.querySelector('.intro-stage')
    return {
      canvasCount: document.querySelectorAll('canvas').length,
      canvasWidth: canvas?.width ?? 0,
      canvasHeight: canvas?.height ?? 0,
      panels,
      labels,
      charts,
      modeButtons,
      introGone,
    }
  })

  const buffer = await page.screenshot({ fullPage: false })
  await writeFile(new URL(`enertwin-screen-${viewport.name}.png`, outputDir), buffer)
  const diversity = measureCenterDiversity(buffer)
  let dragChanged = null
  let alarmClickOpens = null
  if (viewport.name === '1920x1080') {
    const alarmBox = await page.locator('.scene-alarm-label').boundingBox()
    if (alarmBox) {
      await page.mouse.click(alarmBox.x + alarmBox.width / 2, alarmBox.y + alarmBox.height / 2)
      await page.waitForTimeout(250)
      alarmClickOpens = await page.locator('.alarm-detail-card').isVisible()
      if (alarmClickOpens) await page.locator('.alarm-detail-card button').click()
    }
    await page.mouse.move(viewport.width * 0.5, viewport.height * 0.52)
    await page.mouse.down()
    await page.mouse.move(viewport.width * 0.64, viewport.height * 0.42, { steps: 18 })
    await page.mouse.up()
    await page.waitForTimeout(500)
    const draggedBuffer = await page.screenshot({ fullPage: false })
    await writeFile(new URL(`enertwin-screen-${viewport.name}-dragged.png`, outputDir), draggedBuffer)
    dragChanged = measureCenterDifference(buffer, draggedBuffer) > 8
  }
  results.push({ viewport: viewport.name, ...diagnostics, ...diversity, dragChanged, alarmClickOpens })
  await page.close()
}

await browser.close()
console.log(JSON.stringify(results, null, 2))

function measureCenterDiversity(buffer) {
  const png = PNG.sync.read(buffer)
  const colors = new Set()
  let brightPixels = 0
  const xStart = Math.floor(png.width * 0.35)
  const xEnd = Math.floor(png.width * 0.65)
  const yStart = Math.floor(png.height * 0.28)
  const yEnd = Math.floor(png.height * 0.72)
  for (let y = yStart; y < yEnd; y += 8) {
    for (let x = xStart; x < xEnd; x += 8) {
      const idx = (png.width * y + x) << 2
      const r = png.data[idx]
      const g = png.data[idx + 1]
      const b = png.data[idx + 2]
      colors.add(`${r >> 4}-${g >> 4}-${b >> 4}`)
      if (r + g + b > 72) brightPixels += 1
    }
  }
  return {
    centerColorBuckets: colors.size,
    centerBrightSamples: brightPixels,
    canvasNonBlank: colors.size > 16 && brightPixels > 80,
  }
}

function measureCenterDifference(before, after) {
  const a = PNG.sync.read(before)
  const b = PNG.sync.read(after)
  let diff = 0
  let samples = 0
  const xStart = Math.floor(a.width * 0.36)
  const xEnd = Math.floor(a.width * 0.64)
  const yStart = Math.floor(a.height * 0.3)
  const yEnd = Math.floor(a.height * 0.72)
  for (let y = yStart; y < yEnd; y += 12) {
    for (let x = xStart; x < xEnd; x += 12) {
      const idx = (a.width * y + x) << 2
      diff += Math.abs(a.data[idx] - b.data[idx])
      diff += Math.abs(a.data[idx + 1] - b.data[idx + 1])
      diff += Math.abs(a.data[idx + 2] - b.data[idx + 2])
      samples += 1
    }
  }
  return diff / Math.max(1, samples)
}
