"""Builds the docs site from src/ into docs/, which GitHub Pages serves as is.

Each page in src/pages is an HTML fragment that starts with a meta comment:
<!--meta {"title": "Containers", "section": "Guides", "order": 30, "summary": "One line for search and cards."} -->
Run: python build.py
"""
import html
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
OUT = ROOT / "docs"
SECTIONS = ["Start here", "Guides", "Systems", "Reference", "Help"]
SITE = "Blackline"
VERSION = "1.0.0"
# Change this once the GitHub repository exists. Support links point at its issue tracker.
REPO = "https://github.com/lcoclea/blackline-docs"

META = re.compile(r"^\s*<!--meta\s+(\{.*?\})\s*-->", re.S)
HEADING = re.compile(r"<h([23])(?:\s+id=\"([^\"]+)\")?>(.*?)</h\1>", re.S)
TAG = re.compile(r"<[^>]+>")


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", TAG.sub("", text).lower()).strip("-")


def load_pages():
    pages = []
    for path in sorted((SRC / "pages").glob("*.html")):
        text = path.read_text(encoding="utf-8")
        match = META.match(text)
        if not match:
            raise SystemExit(f"{path.name}: missing the meta comment")
        meta = json.loads(match.group(1))
        if meta.get("section") not in SECTIONS:
            raise SystemExit(f"{path.name}: section must be one of {SECTIONS}")
        body = text[match.end():].strip()
        pages.append({"slug": path.stem, "body": body, **meta})
    pages.sort(key=lambda p: (SECTIONS.index(p["section"]), p.get("order", 999), p["title"]))
    return pages


def add_heading_ids(body):
    seen = set()

    def fix(match):
        level, given, inner = match.group(1), match.group(2), match.group(3)
        anchor = given or slugify(inner)
        while anchor in seen:
            anchor += "-2"
        seen.add(anchor)
        return f'<h{level} id="{anchor}">{inner}<a class="anchor" href="#{anchor}" aria-label="Link to this section">#</a></h{level}>'

    return HEADING.sub(fix, body)


def nav_html(pages, current):
    parts = []
    for section in SECTIONS:
        items = [p for p in pages if p["section"] == section]
        if not items:
            continue
        parts.append(f'<div class="nav-section"><div class="nav-title">{section}</div>')
        for p in items:
            active = ' class="active"' if p["slug"] == current else ""
            parts.append(f'<a href="{p["slug"]}.html"{active}>{html.escape(p["title"])}</a>')
        parts.append("</div>")
    return "\n".join(parts)


def search_entry(page):
    text = TAG.sub(" ", page["body"])
    text = re.sub(r"\s+", " ", html.unescape(text)).strip()
    headings = [TAG.sub("", h[2]) for h in HEADING.findall(page["body"])]
    return {"t": page["title"], "u": f'{page["slug"]}.html', "s": page.get("summary", ""), "h": headings, "x": text[:6000]}


def main():
    pages = load_pages()
    template = (SRC / "template.html").read_text(encoding="utf-8")
    if OUT.exists():
        for child in OUT.iterdir():
            if child.name != "img":
                shutil.rmtree(child) if child.is_dir() else child.unlink()
    OUT.mkdir(exist_ok=True)
    shutil.copytree(SRC / "assets", OUT / "assets")
    (OUT / ".nojekyll").write_text("", encoding="utf-8")

    ordered = [p for p in pages if p.get("order", 0) >= 0]
    for index, page in enumerate(pages):
        prev_page = ordered[index - 1] if 0 < index <= len(ordered) - 1 else None
        next_page = ordered[index + 1] if index + 1 < len(ordered) else None
        pager = ""
        if prev_page:
            pager += f'<a class="prev" href="{prev_page["slug"]}.html"><span>Previous</span>{html.escape(prev_page["title"])}</a>'
        if next_page:
            pager += f'<a class="next" href="{next_page["slug"]}.html"><span>Next</span>{html.escape(next_page["title"])}</a>'
        out = (template
               .replace("{{title}}", html.escape(page["title"]))
               .replace("{{summary}}", html.escape(page.get("summary", "")))
               .replace("{{site}}", SITE)
               .replace("{{version}}", VERSION)
               .replace("{{repo}}", REPO)
               .replace("{{section}}", page["section"])
               .replace("{{nav}}", nav_html(pages, page["slug"]))
               .replace("{{pager}}", pager)
               .replace("{{bodyclass}}", page.get("layout", "doc"))
               .replace("{{content}}", add_heading_ids(page["body"])))
        (OUT / f'{page["slug"]}.html').write_text(out, encoding="utf-8")

    index = [search_entry(p) for p in pages]
    (OUT / "assets" / "search-index.js").write_text("window.SEARCH_INDEX = " + json.dumps(index, ensure_ascii=False) + ";\n", encoding="utf-8")

    missing = []
    for page in pages:
        for ref in re.findall(r'(?:src|href)="((?:img|assets)/[^"#]+)"', page["body"]):
            if not (OUT / ref).exists():
                missing.append(f'{page["slug"]}: {ref}')
        for ref in re.findall(r'href="([a-z0-9-]+)\.html', page["body"]):
            if not (SRC / "pages" / f"{ref}.html").exists():
                missing.append(f'{page["slug"]}: link to {ref}.html')
    print(f"Built {len(pages)} pages into {OUT}")
    for line in missing:
        print("MISSING", line)


if __name__ == "__main__":
    main()
