#!/usr/bin/env python3
"""Render posts/*.md into the static blog, plus rss.xml and sitemap.xml.

Usage:  python3 build_blog.py

Posts are markdown with a YAML-ish frontmatter block:

    ---
    title: Post title
    description: One line for search results and social cards.
    date: 2026-08-22
    author: Roi Cohen
    slug: post-title
    draft: true
    ---

Drafts are rendered to their own page so they can be reviewed, but are kept
out of the blog index, the RSS feed and the sitemap, and carry a noindex tag.

Requires the `markdown` package:  pip install markdown
"""

import html
import os
import re
import shutil
import sys
from datetime import datetime, timezone

try:
    import markdown
except ImportError:
    sys.exit("This script needs the 'markdown' package. Run: pip install markdown")

ROOT = os.path.dirname(os.path.abspath(__file__))
POSTS_DIR = os.path.join(ROOT, "posts")
BLOG_DIR = os.path.join(ROOT, "blog")
SITE = "https://pelora-ai.com"

AUTHORS = {
    "Roi Cohen": {"photo": "/imgs/Roi.png", "role": "Co-Founder and CEO"},
    "Ben Shapira": {"photo": "/imgs/Ben.png", "role": "Co-Founder and CTO"},
}

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
         'family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600'
         '&family=Inter:wght@400;500&display=swap">')

NAV = """<a class="skip-link" href="#main">Skip to content</a>
<nav class="nav" id="nav" aria-label="Primary">
  <div class="wrap nav-inner">
    <a href="/" class="nav-logo" aria-label="Pelora home">
      <img src="/imgs/logo/pelora-logo-white.png" alt="Pelora" width="110" height="26">
    </a>
    <button class="nav-toggle" id="navToggle" aria-label="Menu" aria-expanded="false" aria-controls="navLinks">
      <span></span><span></span><span></span>
    </button>
    <ul class="nav-links" id="navLinks" role="list">
      <li><a href="/technology/">Technology</a></li>
      <li><a href="/blog/" aria-current="page">Blog</a></li>
      <li><a href="/#research">Research</a></li>
      <li><a href="mailto:info@pelora-ai.com" class="nav-cta">Talk to us</a></li>
    </ul>
  </div>
</nav>"""

FOOTER = """<footer class="footer">
  <div class="wrap">
    <div class="footer-top">
      <img src="/imgs/logo/pelora-logo-white.png" alt="Pelora" width="110" height="26">
      <nav class="footer-nav" aria-label="Footer">
        <a href="/technology/">Technology</a>
        <a href="/blog/">Blog</a>
        <a href="/#research">Research</a>
        <a href="/#team">Team</a>
        <a href="mailto:info@pelora-ai.com">Contact</a>
        <a href="/rss.xml">RSS</a>
      </nav>
    </div>
    <div class="footer-bottom">
      <span>&copy; <span data-year>2026</span> Pelora. Delaware C-corp, team in Berlin.</span>
      <span>info@pelora-ai.com</span>
    </div>
  </div>
</footer>
<script src="/assets/js/site.js" defer></script>"""


def head(title, description, url, noindex=False, extra=""):
    robots = '\n<meta name="robots" content="noindex, nofollow">' if noindex else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(description)}">
<link rel="canonical" href="{url}">{robots}
<meta property="og:type" content="article">
<meta property="og:site_name" content="Pelora">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(description)}">
<meta property="og:image" content="{SITE}/assets/og/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{html.escape(title)}">
<meta name="twitter:description" content="{html.escape(description)}">
<meta name="twitter:image" content="{SITE}/assets/og/og.png">
<link rel="icon" type="image/png" href="/imgs/logo/pelora-logo-icononly-color-zoom.png">
<link rel="alternate" type="application/rss+xml" title="Pelora blog" href="/rss.xml">
{FONTS}
<link rel="stylesheet" href="/assets/css/site.css">{extra}
</head>
<body>
{NAV}"""


def parse(path):
    raw = open(path, encoding="utf-8").read()
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", raw, re.S)
    if not m:
        sys.exit(f"{os.path.basename(path)}: missing frontmatter block")

    meta = {}
    for line in m.group(1).splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip().strip('"')

    for required in ("title", "description", "date", "author"):
        if required not in meta:
            sys.exit(f"{os.path.basename(path)}: frontmatter is missing '{required}'")

    meta["draft"] = str(meta.get("draft", "")).lower() in ("true", "yes", "1")
    meta["slug"] = meta.get("slug") or os.path.splitext(os.path.basename(path))[0]
    meta["dt"] = datetime.strptime(meta["date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
    meta["body"] = m.group(2)
    meta["url"] = f"{SITE}/blog/{meta['slug']}/"
    return meta


def read_time(text):
    return max(1, round(len(text.split()) / 220))


def author_card(name):
    info = AUTHORS.get(name)
    if not info:
        return f'<div class="author-card"><div><div class="author-card-name">{html.escape(name)}</div></div></div>'
    return (f'<div class="author-card">'
            f'<img src="{info["photo"]}" alt="" width="56" height="56" loading="lazy">'
            f'<div><div class="author-card-name">{html.escape(name)}</div>'
            f'<div class="author-card-role">{info["role"]}</div></div></div>')


def render_post(post):
    body = markdown.markdown(post["body"], extensions=["extra", "smarty"],
                             extension_configs={"smarty": {"smart_dashes": False,
                                                           "smart_quotes": False}})
    banner = ""
    if post["draft"]:
        banner = ('<p class="eyebrow" style="color:#b08968">Draft - not published, '
                  'not indexed, awaiting review</p>')

    authors = "".join(author_card(a.strip()) for a in post["author"].split(","))

    page = head(f'{post["title"]} - Pelora', post["description"], post["url"],
                noindex=post["draft"])
    page += f"""
<main id="main">
<header class="band on-dark" style="padding-top:11rem;padding-bottom:3.5rem">
  <div class="wrap">
    <div class="article">
      {banner}
      <h1 class="article-title">{html.escape(post["title"])}</h1>
      <p class="article-meta">
        <span>{post["dt"].strftime("%d %B %Y")}</span>
        <span>{html.escape(post["author"])}</span>
        <span>{read_time(post["body"])} min read</span>
      </p>
    </div>
  </div>
</header>

<article class="band">
  <div class="wrap">
    <div class="article">
      <div class="prose">
{body}
      </div>
      <div class="author-cards">{authors}</div>
    </div>
  </div>
</article>

<section class="band on-dark band--tight">
  <div class="wrap closing">
    <h2 class="statement statement--wide">Building agents that need to know your world.</h2>
    <div class="actions" style="margin-top:2rem">
      <a class="btn btn--primary" href="mailto:info@pelora-ai.com">Talk to us <span class="btn-arrow" aria-hidden="true">-&gt;</span></a>
      <a class="btn btn--ghost" href="/blog/">More writing</a>
    </div>
  </div>
</section>
</main>
{FOOTER}
</body>
</html>
"""
    out_dir = os.path.join(BLOG_DIR, post["slug"])
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(page)


def render_index(posts):
    if posts:
        rows = "\n".join(f"""      <li class="post-row" data-reveal>
        <span class="post-date">{p["dt"].strftime("%d %B %Y")}</span>
        <a class="post-link" href="/blog/{p["slug"]}/">{html.escape(p["title"])}</a>
        <p class="post-excerpt">{html.escape(p["description"])}</p>
        <p class="post-meta">{html.escape(p["author"])} - {read_time(p["body"])} min read</p>
      </li>""" for p in posts)
        body = f'<ul class="post-list" role="list">\n{rows}\n    </ul>'
    else:
        body = '<p class="lede">The first posts are on their way.</p>'

    page = head("Blog - Pelora",
                "Writing from the Pelora team on agents, model factories and what happens "
                "when specialization stops being a training run.",
                f"{SITE}/blog/")
    page += f"""
<main id="main">
<section class="band on-dark" style="padding-top:12rem;padding-bottom:4rem">
  <div class="wrap">
    <p class="eyebrow">Blog</p>
    <h1 class="statement statement--wide" style="font-size:var(--step-4)">Notes from the factory floor.</h1>
  </div>
</section>

<section class="band">
  <div class="wrap">
    {body}
  </div>
</section>
</main>
{FOOTER}
</body>
</html>
"""
    with open(os.path.join(BLOG_DIR, "index.html"), "w", encoding="utf-8") as f:
        f.write(page)


def render_rss(posts):
    built = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")
    items = "\n".join(f"""    <item>
      <title>{html.escape(p["title"])}</title>
      <link>{p["url"]}</link>
      <guid isPermaLink="true">{p["url"]}</guid>
      <description>{html.escape(p["description"])}</description>
      <pubDate>{p["dt"].strftime("%a, %d %b %Y %H:%M:%S +0000")}</pubDate>
    </item>""" for p in posts)

    feed = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Pelora</title>
    <link>{SITE}/blog/</link>
    <description>Writing from the Pelora team on agents, model factories and what happens when specialization stops being a training run.</description>
    <language>en</language>
    <lastBuildDate>{built}</lastBuildDate>
    <atom:link href="{SITE}/rss.xml" rel="self" type="application/rss+xml"/>
{items}
  </channel>
</rss>
"""
    with open(os.path.join(ROOT, "rss.xml"), "w", encoding="utf-8") as f:
        f.write(feed)


def render_sitemap(posts):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    urls = [(f"{SITE}/", today, "1.0"),
            (f"{SITE}/technology/", today, "0.8"),
            (f"{SITE}/blog/", today, "0.6")]
    urls += [(p["url"], p["dt"].strftime("%Y-%m-%d"), "0.5") for p in posts]

    entries = "\n".join(f"""  <url>
    <loc>{loc}</loc>
    <lastmod>{mod}</lastmod>
    <priority>{pri}</priority>
  </url>""" for loc, mod, pri in urls)

    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{entries}
</urlset>
""")


def main():
    if not os.path.isdir(POSTS_DIR):
        sys.exit("No posts/ directory found.")

    # Clear previously generated post directories, keep blog/index.html slot.
    if os.path.isdir(BLOG_DIR):
        for name in os.listdir(BLOG_DIR):
            path = os.path.join(BLOG_DIR, name)
            if os.path.isdir(path):
                shutil.rmtree(path)
    os.makedirs(BLOG_DIR, exist_ok=True)

    posts = [parse(os.path.join(POSTS_DIR, f))
             for f in sorted(os.listdir(POSTS_DIR)) if f.endswith(".md")]
    posts.sort(key=lambda p: p["dt"], reverse=True)

    published = [p for p in posts if not p["draft"]]

    for post in posts:
        render_post(post)

    render_index(published)
    render_rss(published)
    render_sitemap(published)

    for post in posts:
        print(f"  {'draft ' if post['draft'] else 'live  '} /blog/{post['slug']}/")
    print(f"\n{len(published)} published, {len(posts) - len(published)} draft")


if __name__ == "__main__":
    main()
