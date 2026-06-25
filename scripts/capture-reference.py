import asyncio
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path.cwd()
URL = "https://www.project-aperture.com/"


async def capture(viewport, output):
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport=viewport, device_scale_factor=1)
        await page.goto(URL, wait_until="domcontentloaded", timeout=60000)
        try:
            await page.wait_for_load_state("networkidle", timeout=12000)
        except Exception:
            pass
        await page.wait_for_timeout(1800)
        await page.screenshot(path=ROOT / output, full_page=False)
        title = await page.title()
        text = await page.locator("body").inner_text(timeout=8000)
        await browser.close()
        return {"title": title, "text": text[:1200], "output": output}


async def main():
    desktop = await capture({"width": 1440, "height": 1000}, "reference-project-aperture.png")
    mobile = await capture({"width": 390, "height": 844}, "reference-project-aperture-mobile.png")
    print(desktop)
    print(mobile)


asyncio.run(main())
