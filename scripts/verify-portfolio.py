import asyncio
import json
import sys
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path.cwd()
URL = (ROOT / "index.html").as_uri()
sys.stdout.reconfigure(encoding="utf-8")


async def main():
    errors = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        await page.goto(URL, wait_until="networkidle")
        intro = page.locator(".logo-intro")
        if await intro.count():
            await intro.wait_for(state="detached", timeout=6000)
        await page.wait_for_timeout(2200)
        await page.screenshot(path=ROOT / "portfolio-preview.png", full_page=False)
        await page.locator("#work").scroll_into_view_if_needed()
        await page.wait_for_timeout(900)
        await page.screenshot(path=ROOT / "portfolio-work-preview.png", full_page=False)
        work_count = await page.locator(".work-card").count()
        heading = await page.locator(".aperture-label").inner_text()
        hero_frames = await page.locator(".aperture-frame").count()
        first_card = page.locator(".work-card").first
        await first_card.click()
        dialog_visible = await page.locator("#project-dialog").is_visible()
        dialog_title = await page.locator("#dialog-title").inner_text()
        mobile_page = await browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        mobile_page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        await mobile_page.goto(URL, wait_until="networkidle")
        mobile_intro = mobile_page.locator(".logo-intro")
        if await mobile_intro.count():
            await mobile_intro.wait_for(state="detached", timeout=6000)
        await mobile_page.wait_for_timeout(2200)
        await mobile_page.screenshot(path=ROOT / "portfolio-preview-mobile.png", full_page=False)
        await mobile_page.locator("#work").scroll_into_view_if_needed()
        await mobile_page.wait_for_timeout(900)
        await mobile_page.screenshot(path=ROOT / "portfolio-work-preview-mobile.png", full_page=False)
        mobile_cards = await mobile_page.locator(".work-card").count()
        mobile_heading = await mobile_page.locator(".aperture-label").inner_text()
        mobile_hero_frames = await mobile_page.locator(".aperture-frame").count()
        await browser.close()

    print(json.dumps({
        "heading": heading,
        "heroFrames": hero_frames,
        "workCards": work_count,
        "dialogVisible": dialog_visible,
        "dialogTitle": dialog_title,
        "mobileHeading": mobile_heading,
        "mobileHeroFrames": mobile_hero_frames,
        "mobileCards": mobile_cards,
        "consoleErrors": errors,
        "screenshots": [
            "portfolio-preview.png",
            "portfolio-preview-mobile.png",
            "portfolio-work-preview.png",
            "portfolio-work-preview-mobile.png",
        ],
    }, ensure_ascii=False, indent=2))


asyncio.run(main())
