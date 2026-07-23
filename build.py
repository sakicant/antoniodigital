"""Static site build script for antoniodigital.com.

Each page lives in src/pages/<page-id>/<lang>/ as a meta.json + content.html
pair. <page-id> groups the translations of one logical page together (e.g.
"about"); <lang> is an ISO 639-1 code. English is canonical and served at the
site root (e.g. /about/); Croatian is served under /hr/ (e.g. /hr/o-meni/).

For every page-id the script generates reciprocal hreflang alternates across
all language variants that exist, plus an x-default pointing at English.

Run `python build.py` after editing any partial or page content.
"""
import datetime
import hashlib
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")
PAGES_DIR = os.path.join(SRC, "pages")
PARTIALS_DIR = os.path.join(SRC, "partials")

SITE_URL = "https://antoniodigital.com"
DEFAULT_OG_IMAGE = f"{SITE_URL}/assets/img/og-image.png"
# Croatian is the primary language, served at the site root. English is
# secondary and will be served under /en/ once translations are added.
DEFAULT_LANG = "hr"

# Supported languages. Codes must be valid ISO 639-1 for correct hreflang.
# English is added here later, at translation time.
LANGUAGES = ["hr"]

HOME_LABEL = {"hr": "Početna", "en": "Home"}
LANGUAGE_LABELS = {"hr": "HR", "en": "EN"}


def compute_asset_version():
    """Short hash of styles.css + script.js so browsers fetch fresh copies
    whenever either file changes instead of serving a stale cached copy."""
    hasher = hashlib.md5()
    for name in ("styles.css", "script.js"):
        with open(os.path.join(ROOT, name), "rb") as f:
            hasher.update(f.read())
    return hasher.hexdigest()[:10]


def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def url_path(lang, slug):
    """Root-relative path (no domain), e.g. /hr/ or /hr/usluge/."""
    if lang == DEFAULT_LANG:
        path = f"{slug}/" if slug else ""
    else:
        path = f"{lang}/{slug}/" if slug else f"{lang}/"
    return f"/{path}"


def canonical_url(lang, slug):
    return f"{SITE_URL}{url_path(lang, slug)}"


def output_path(lang, slug):
    if lang == DEFAULT_LANG:
        rel = os.path.join(slug, "index.html") if slug else "index.html"
    else:
        rel = os.path.join(lang, slug, "index.html") if slug else os.path.join(lang, "index.html")
    return os.path.join(ROOT, rel)


def discover_pages():
    """Returns {page_id: {lang: meta_dict}} for every page-id/lang combo found."""
    pages = {}
    for page_id in sorted(os.listdir(PAGES_DIR)):
        page_dir = os.path.join(PAGES_DIR, page_id)
        if not os.path.isdir(page_dir):
            continue
        variants = {}
        for lang in sorted(os.listdir(page_dir)):
            lang_dir = os.path.join(page_dir, lang)
            meta_path = os.path.join(lang_dir, "meta.json")
            if lang not in LANGUAGES or not os.path.isfile(meta_path):
                continue
            with open(meta_path, "r", encoding="utf-8") as f:
                variants[lang] = json.load(f)
        if variants:
            pages[page_id] = variants
    return pages


def build_hreflang_block(page_id, variants):
    links = []
    for lang, meta in variants.items():
        url = canonical_url(lang, meta.get("slug", ""))
        links.append(f'<link rel="alternate" hreflang="{lang}" href="{url}">')
    if DEFAULT_LANG in variants:
        default_url = canonical_url(DEFAULT_LANG, variants[DEFAULT_LANG].get("slug", ""))
        links.append(f'<link rel="alternate" hreflang="x-default" href="{default_url}">')
    return "\n".join(links)


def build_lang_switcher(variants, current_lang):
    """Simple HR | EN switcher. A language links to its own translation of the
    current page when one exists; otherwise it points at that language's home.
    Hidden entirely while the site is single-language."""
    if len(LANGUAGES) < 2:
        return ""
    items = []
    for lang in LANGUAGES:
        label = LANGUAGE_LABELS[lang]
        target = variants[lang].get("slug", "") if lang in variants else ""
        url = url_path(lang, target)
        cls = "lang-item active" if lang == current_lang else "lang-item"
        items.append(f'<a href="{url}" class="{cls}" hreflang="{lang}">{label}</a>')
    return '<div class="lang-switch">' + '<span class="lang-sep">/</span>'.join(items) + '</div>'


_PARTIAL_CACHE = {}


def load_partial(name, lang):
    """Return <name>.<lang>.html if it exists, else the English <name>.html."""
    key = (name, lang)
    if key not in _PARTIAL_CACHE:
        localized = os.path.join(PARTIALS_DIR, f"{name}.{lang}.html")
        path = localized if os.path.isfile(localized) else os.path.join(PARTIALS_DIR, f"{name}.html")
        _PARTIAL_CACHE[key] = read(path)
    return _PARTIAL_CACHE[key]


def build_variant(lang, meta, content_path, base_tpl, hreflang_block, variants, asset_version):
    body = read(content_path)
    slug = meta.get("slug", "")
    canonical = canonical_url(lang, slug)
    footer_html = load_partial("footer", lang)
    header_html = load_partial("header", lang).replace("{{LANG_SWITCHER}}", build_lang_switcher(variants, lang))

    schema = meta.get("schema")
    schema_list = schema if isinstance(schema, list) else ([schema] if schema else [])
    if slug:  # Auto breadcrumb (Home > this page) on every page except home.
        schema_list = list(schema_list) + [{
            "@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": HOME_LABEL.get(lang, "Home"),
                 "item": canonical_url(lang, "")},
                {"@type": "ListItem", "position": 2, "name": meta["title"].split("|")[0].strip(),
                 "item": canonical},
            ],
        }]
    schema_block = "\n".join(
        '<script type="application/ld+json">\n' + json.dumps(s, indent=2, ensure_ascii=False) + "\n</script>"
        for s in schema_list
    )

    html = base_tpl
    replacements = {
        "{{LANG}}": lang,
        "{{TITLE}}": meta["title"],
        "{{DESCRIPTION}}": meta["description"],
        "{{KEYWORDS}}": meta.get("keywords", ""),
        "{{CANONICAL}}": canonical,
        "{{HREFLANGS}}": hreflang_block,
        "{{OG_IMAGE}}": meta.get("og_image", DEFAULT_OG_IMAGE),
        "{{SCHEMA}}": schema_block,
        "{{ASSET_VERSION}}": asset_version,
        "{{HEADER}}": header_html,
        "{{FOOTER}}": footer_html,
        "{{BODY}}": body,
    }
    for k, v in replacements.items():
        html = html.replace(k, v)

    out_path = output_path(lang, slug)
    write(out_path, html)
    print(f"built {os.path.relpath(out_path, ROOT)}")


def page_priority(slug):
    if slug == "":
        return "1.0"
    if slug in ("services", "usluge", "portfolio"):
        return "0.9"
    if slug in ("privacy-policy", "pravila-privatnosti"):
        return "0.3"
    return "0.8"


def write_sitemap(pages):
    today = datetime.date.today().isoformat()
    entries = []
    for page_id, variants in pages.items():
        alts = [(lang, canonical_url(lang, variants[lang].get("slug", "")))
                for lang in LANGUAGES if lang in variants]
        default_lang = DEFAULT_LANG if DEFAULT_LANG in variants else next(iter(variants))
        xdefault = canonical_url(default_lang, variants[default_lang].get("slug", ""))
        for lang, meta in variants.items():
            loc = canonical_url(lang, meta.get("slug", ""))
            entries.append((loc, page_priority(meta.get("slug", "")), alts, xdefault))
    entries.sort(key=lambda e: e[0])

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
             'xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for loc, prio, alts, xdefault in entries:
        lines.append("  <url>")
        lines.append(f"    <loc>{loc}</loc>")
        lines.append(f"    <lastmod>{today}</lastmod>")
        lines.append("    <changefreq>monthly</changefreq>")
        lines.append(f"    <priority>{prio}</priority>")
        for lang, href in alts:
            lines.append(f'    <xhtml:link rel="alternate" hreflang="{lang}" href="{href}"/>')
        lines.append(f'    <xhtml:link rel="alternate" hreflang="x-default" href="{xdefault}"/>')
        lines.append("  </url>")
    lines.append("</urlset>")
    write(os.path.join(ROOT, "sitemap.xml"), "\n".join(lines) + "\n")
    print(f"built sitemap.xml ({len(entries)} URLs)")


def main():
    asset_version = compute_asset_version()
    base_tpl = read(os.path.join(PARTIALS_DIR, "base.html"))
    pages = discover_pages()
    for page_id, variants in pages.items():
        hreflang_block = build_hreflang_block(page_id, variants)
        for lang, meta in variants.items():
            content_path = os.path.join(PAGES_DIR, page_id, lang, "content.html")
            build_variant(lang, meta, content_path, base_tpl, hreflang_block, variants, asset_version)
    write_sitemap(pages)


if __name__ == "__main__":
    main()
