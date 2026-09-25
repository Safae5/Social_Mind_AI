# routers/social_manager/scraper.py
"""
Web scraping Playwright pour données complémentaires.

Playwright est utilisé pour :
  1. Historique d'engagement > 90 jours (non disponible via API gratuite)
  2. Données de plateformes sans API officielle (TikTok analytics public)
  3. Métriques publiques des concurrents (non connectés au compte)

Playwright utilise un vrai navigateur (Chromium) pour contourner
les protections anti-bot et accéder aux données affichées à l'écran.

⚠️ IMPORTANT : Playwright nécessite l'installation des navigateurs :
   playwright install chromium

Limites éthiques :
  - Scraping uniquement des données publiques
  - Respecter les robots.txt et CGU des plateformes
  - Rate limiting : pause de 2-5s entre chaque page
  - Ne pas scraper les données privées ou authentifiées

Cas d'usage principaux Social Mind AI :
  - Récupérer l'historique Instagram (non disponible via API gratuite)
  - Compléter les métriques Facebook > 90 jours
  - Collecter des données TikTok pour analyse
"""

import asyncio
from typing import Optional


async def scrape_instagram_public_profile(username: str, max_posts: int = 30) -> list[dict]:
    """
    Scrape les posts publics d'un compte Instagram.
    Retourne les likes, commentaires et hashtags.

    Args:
        username  : @handle Instagram (sans le @)
        max_posts : nombre max de posts à scraper

    Returns:
        Liste de dicts : {url, likes, comments, hashtags, posted_at}
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print("   ⚠️ Playwright non installé : pip install playwright && playwright install chromium")
        return []

    posts = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = await context.new_page()

        try:
            await page.goto(f"https://www.instagram.com/{username}/", timeout=30000)
            await page.wait_for_timeout(3000)

            # Extraire les posts de la grille
            post_links = await page.query_selector_all("article a[href*='/p/']")

            for i, link_el in enumerate(post_links[:max_posts]):
                try:
                    href = await link_el.get_attribute("href")
                    if not href:
                        continue

                    await page.goto(f"https://www.instagram.com{href}", timeout=20000)
                    await page.wait_for_timeout(2000)

                    # Extraire les données du post
                    likes_el = await page.query_selector("span[class*='likes']")
                    likes    = int((await likes_el.inner_text()).replace(",", "").split()[0]) if likes_el else 0

                    caption_el = await page.query_selector("div[class*='caption']")
                    caption    = await caption_el.inner_text() if caption_el else ""

                    # Extraire les hashtags
                    import re
                    hashtags = re.findall(r"#(\w+)", caption)

                    posts.append({
                        "url"      : f"https://www.instagram.com{href}",
                        "likes"    : likes,
                        "comments" : 0,    # Difficile à scraper sans scroll
                        "caption"  : caption[:300],
                        "hashtags" : hashtags,
                        "platform" : "instagram",
                    })

                    await asyncio.sleep(2)    # Rate limiting respectueux

                except Exception as e:
                    print(f"   ⚠️ Erreur post {i}: {e}")
                    continue

        except Exception as e:
            print(f"   ⚠️ Erreur scraping {username}: {e}")
        finally:
            await browser.close()

    print(f"   ✅ {len(posts)} posts Instagram scrapés pour @{username}")
    return posts


async def scrape_facebook_page_history(page_url: str, max_posts: int = 50) -> list[dict]:
    """
    Scrape les posts publics d'une page Facebook pour l'historique.
    Utilisé pour les données > 90 jours non disponibles via l'API.

    Args:
        page_url  : URL de la page Facebook
        max_posts : nombre max de posts

    Returns:
        Liste de dicts avec les métriques de chaque post
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
            await page.goto(page_url, timeout=30000)
            await page.wait_for_timeout(3000)

            # Scroll pour charger plus de posts
            for _ in range(max_posts // 10):
                await page.evaluate("window.scrollBy(0, window.innerHeight)")
                await page.wait_for_timeout(1500)

            # Extraire les réactions visibles
            reaction_els = await page.query_selector_all("[aria-label*='reaction']")
            for el in reaction_els[:max_posts]:
                try:
                    text = await el.inner_text()
                    posts.append({
                        "reactions_text": text,
                        "platform"      : "facebook",
                    })
                except Exception:
                    continue

        except Exception as e:
            print(f"   ⚠️ Erreur scraping FB: {e}")
        finally:
            await browser.close()

    print(f"   ✅ {len(posts)} posts Facebook scrapés")
    return posts


def scrape_sync(coroutine):
    """Wrapper synchrone pour les coroutines async Playwright."""
    return asyncio.run(coroutine)