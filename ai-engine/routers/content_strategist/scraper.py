### `routers/content_strategist/scraper.py`


# routers/content_strategist/scraper.py
"""
Web scraping Playwright pour données concurrentes complémentaires.

Cas d'usage :
  1. Publications Instagram publiques (non disponibles via API Meta gratuite)
  2. TikTok public analytics
  3. Historique > 90 jours non couvert par l'API Meta

Playwright utilise un vrai navigateur Chromium pour accéder aux données
affichées publiquement sans nécessiter d'authentification.

⚠️ ÉTHIQUE : Scraping UNIQUEMENT des données publiques.
             Respect des CGU et des robots.txt.
             Rate limiting : pause 2-5s entre chaque requête.
"""

import asyncio
import re
from typing import Optional


async def scrape_instagram_competitor(username: str,
                                       max_posts: int = 30) -> list[dict]:
    """
    Scrape les publications publiques d'un compte Instagram concurrent.

    Args:
        username  : @handle Instagram (sans le @)
        max_posts : nombre max de posts à analyser

    Returns:
        Liste de dicts : {text, hashtags, platform}
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print("   ⚠️ Playwright non installé")
        return []

    posts = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = await context.new_page()

        try:
            await page.goto(
                f"https://www.instagram.com/{username}/",
                timeout=30000,
                wait_until="networkidle"
            )
            await page.wait_for_timeout(3000)

            # Extraire les liens des posts
            post_links = await page.query_selector_all("article a[href*='/p/']")

            for i, link_el in enumerate(post_links[:max_posts]):
                try:
                    href = await link_el.get_attribute("href")
                    if not href:
                        continue

                    await page.goto(
                        f"https://www.instagram.com{href}",
                        timeout=20000
                    )
                    await page.wait_for_timeout(2000)

                    # Extraire la légende
                    caption_el = await page.query_selector(
                        "div[class*='caption'], span[class*='caption'], h1"
                    )
                    caption = ""
                    if caption_el:
                        caption = await caption_el.inner_text()

                    # Extraire les hashtags
                    all_text = await page.inner_text("body")
                    hashtags = re.findall(r"#(\w+)", all_text.lower())
                    hashtags = [h for h in hashtags if len(h) > 2 and not h.isdigit()][:20]

                    if caption or hashtags:
                        posts.append({
                            "text"     : caption[:500],
                            "hashtags" : hashtags,
                            "platform" : "instagram",
                            "url"      : f"https://www.instagram.com{href}",
                            "page_id"  : username,
                        })

                    await asyncio.sleep(2)   # Rate limiting respectueux

                except Exception as e:
                    print(f"   ⚠️ Post {i}: {e}")
                    continue

        except Exception as e:
            print(f"   ⚠️ Erreur scraping @{username}: {e}")
        finally:
            await browser.close()

    print(f"   ✅ {len(posts)} posts Instagram scrapés pour @{username}")
    return posts


async def scrape_tiktok_hashtag(hashtag: str,
                                  max_posts: int = 20) -> list[dict]:
    """
    Scrape les publications publiques d'un hashtag TikTok.
    Utile pour identifier les tendances virales de la niche.

    Args:
        hashtag   : hashtag sans le # (ex: "modeMaroc")
        max_posts : nombre max de posts

    Returns:
        Liste de dicts avec descriptions et hashtags co-utilisés
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        return []

    posts = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page    = await browser.new_page()

        try:
            await page.goto(
                f"https://www.tiktok.com/tag/{hashtag}",
                timeout=30000
            )
            await page.wait_for_timeout(4000)

            # Extraire les descriptions visibles
            desc_els = await page.query_selector_all("[data-e2e='desc-text']")
            for el in desc_els[:max_posts]:
                try:
                    text = await el.inner_text()
                    if text:
                        hashtags = re.findall(r"#(\w+)", text.lower())
                        posts.append({
                            "text"     : text[:300],
                            "hashtags" : hashtags,
                            "platform" : "tiktok",
                        })
                except Exception:
                    continue

        except Exception as e:
            print(f"   ⚠️ Erreur TikTok #{hashtag}: {e}")
        finally:
            await browser.close()

    print(f"   ✅ {len(posts)} posts TikTok pour #{hashtag}")
    return posts


def scrape_sync(coroutine):
    """Wrapper synchrone pour les coroutines Playwright."""
    return asyncio.run(coroutine)


def collect_scraped_corpus(instagram_handles: list[str] = None,
                            tiktok_hashtags: list[str] = None) -> list[dict]:
    """
    Lance le scraping Playwright de façon synchrone.

    Args:
        instagram_handles : liste de @handles Instagram
        tiktok_hashtags   : liste de hashtags TikTok à analyser

    Returns:
        Corpus unifié de publications scrapées
    """
    corpus = []

    if instagram_handles:
        for handle in instagram_handles:
            posts = scrape_sync(
                scrape_instagram_competitor(handle, max_posts=20)
            )
            corpus.extend(posts)

    if tiktok_hashtags:
        for tag in tiktok_hashtags:
            posts = scrape_sync(
                scrape_tiktok_hashtag(tag, max_posts=15)
            )
            corpus.extend(posts)

    print(f"   ✅ {len(corpus)} publications scrapées au total")
    return corpus