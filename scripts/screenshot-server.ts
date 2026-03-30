import { createServer } from 'http'
import type { IncomingMessage, ServerResponse } from 'http'
import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const PORT = 3333
const SCREENSHOTS_DIR = join(process.cwd(), 'screenshots')

interface ScreenshotRequest {
  url: string
  selector: string
  viewport: { width: number; height: number }
  sceneName: string
}

function timestamp(): string {
  return new Date().toISOString().replace('T', '_').replace(/:/g, '-').slice(0, 19)
}

async function handleScreenshot(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body = ''
  for await (const chunk of req) body += String(chunk)

  const payload = JSON.parse(body) as ScreenshotRequest
  const browser = await chromium.launch()

  try {
    const page = await browser.newPage()
    await page.setViewportSize(payload.viewport)
    await page.goto(payload.url, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)

    const element = page.locator(payload.selector)
    await element.waitFor({ state: 'visible' })

    if (!existsSync(SCREENSHOTS_DIR)) {
      await mkdir(SCREENSHOTS_DIR, { recursive: true })
    }

    const filename = `${timestamp()}_${payload.sceneName}.png`
    const filepath = join(SCREENSHOTS_DIR, filename)
    await element.screenshot({ path: filepath, omitBackground: true })

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true, path: `screenshots/${filename}` }))
  } finally {
    await browser.close()
  }
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method !== 'POST' || req.url !== '/screenshot') {
    res.writeHead(404)
    res.end(JSON.stringify({ success: false, error: 'Not found' }))
    return
  }

  try {
    await handleScreenshot(req, res)
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, error: String(err) }))
    }
  }
})

server.listen(PORT, () => {
  console.log(`Screenshot server listening on http://localhost:${PORT}`)
  console.log(`Screenshots will be saved to: ${SCREENSHOTS_DIR}`)
})
