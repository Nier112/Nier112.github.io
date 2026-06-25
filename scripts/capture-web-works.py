import asyncio
import json
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import async_playwright

ROOT = Path.cwd()
OUT_DIR = ROOT / "assets" / "images" / "web-works"
DATA_DIR = ROOT / "src" / "data"

SITES = [
    {
        "id": "greattop",
        "title": "廣拓科技 Greattop",
        "url": "https://greattop-tw.com/zh_tw/",
        "category": "Corporate Website",
        "added": True,
    },
    {
        "id": "matsuo",
        "title": "台灣松尾 Matsuo",
        "url": "https://www.matsuo.com.tw/",
        "category": "Corporate Website",
        "added": True,
    },
    {
        "id": "hikariro",
        "title": "Hikariro",
        "url": "https://hikariro.id/",
        "category": "Brand Website",
        "added": True,
    },
]


def clean_lines(text):
    lines = []
    for raw in text.splitlines():
        line = " ".join(raw.split())
        if len(line) >= 3 and line not in lines:
            lines.append(line)
    return lines


async def capture_site(page, site):
    await page.goto(site["url"], wait_until="domcontentloaded", timeout=60000)
    try:
        await page.wait_for_load_state("networkidle", timeout=12000)
    except Exception:
        pass
    if site["id"] == "greattop":
        try:
            await page.wait_for_selector("text=智慧調光", timeout=15000)
        except Exception:
            pass
    await page.wait_for_timeout(1800)
    await page.evaluate(
        """() => {
            for (const el of document.querySelectorAll('[class*="preload"], [id*="preload"], .loader, #loader')) {
                const style = getComputedStyle(el);
                if (style.position === 'fixed' || style.position === 'absolute') el.remove();
            }
        }"""
    )

    screenshot = OUT_DIR / f"{site['id']}.png"
    await page.screenshot(path=screenshot, full_page=False)

    title = await page.title()
    try:
        description = await page.locator("meta[name='description']").get_attribute("content", timeout=3000)
    except Exception:
        description = None
    body_text = await page.locator("body").inner_text(timeout=10000)
    lines = clean_lines(body_text)
    host = urlparse(site["url"]).netloc

    return {
        **site,
        "host": host,
        "pageTitle": title,
        "description": description,
        "summary": description or next((line for line in lines if len(line) > 12), site["category"]),
        "details": lines[:16],
        "localCover": f"assets/images/web-works/{site['id']}.png",
        "sourceUrl": site["url"],
        "year": 2026,
    }


async def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
        results = []
        for site in SITES:
            try:
                results.append(await capture_site(page, site))
            except Exception as exc:
                results.append({
                    **site,
                    "host": urlparse(site["url"]).netloc,
                    "pageTitle": site["title"],
                    "description": None,
                    "summary": f"來源網站暫時無法截圖：{exc}",
                    "details": [],
                    "localCover": "",
                    "sourceUrl": site["url"],
                    "year": 2026,
                })
        await browser.close()

    (DATA_DIR / "web-works.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf8")
    print(json.dumps([{ "id": item["id"], "cover": item["localCover"], "summary": item["summary"][:80] } for item in results], ensure_ascii=False, indent=2))


asyncio.run(main())
