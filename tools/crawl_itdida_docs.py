#!/usr/bin/env python3
import concurrent.futures
import html
import json
import os
import re
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qsl, quote, unquote, urljoin, urlparse, urlunparse

import requests


BASE = "http://support.itdida.com"
API = f"{BASE}/index.php/wp-json/wp/v2/docs"
OUT = Path("scraped_docs/itdida_support")
SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        "Accept": "application/json,text/html;q=0.9,*/*;q=0.8",
    }
)


def get_json(url, params=None, retries=4):
    last = None
    for attempt in range(retries):
        try:
            response = SESSION.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json(), response
        except Exception as exc:
            last = exc
            time.sleep(0.8 * (attempt + 1))
    raise RuntimeError(f"Failed JSON fetch {url}: {last}")


def get_bytes(url, retries=2):
    last = None
    for attempt in range(retries):
        try:
            response = SESSION.get(url, headers={"Referer": f"{BASE}/"}, timeout=12)
            response.raise_for_status()
            return response.content, response.headers.get("content-type", "")
        except Exception as exc:
            last = exc
            time.sleep(0.8 * (attempt + 1))
    raise RuntimeError(f"Failed asset fetch {url}: {last}")


def strip_tags(value):
    if not value:
        return ""
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.I)
    value = re.sub(r"</(p|div|li|h[1-6]|tr|figure)>", "\n", value, flags=re.I)
    value = re.sub(r"<[^>]+>", "", value)
    value = html.unescape(value)
    value = re.sub(r"[ \t\r\f\v]+", " ", value)
    value = re.sub(r"\n\s*\n+", "\n\n", value)
    return value.strip()


def safe_name(value, fallback):
    value = html.unescape(strip_tags(value or ""))
    value = re.sub(r"[\\/:*?\"<>|\x00-\x1f]", "_", value)
    value = re.sub(r"\s+", " ", value).strip()
    if not value:
        value = fallback
    return value[:90]


def normalize_url(url):
    if not url or url.startswith("blob:"):
        return url
    url = urljoin(BASE, html.unescape(url))
    parsed = urlparse(url)
    parsed = parsed._replace(fragment="")
    return urlunparse(parsed)


def get_text(url, retries=3):
    last = None
    for attempt in range(retries):
        try:
            response = SESSION.get(url, headers={"Referer": f"{BASE}/"}, timeout=25)
            response.raise_for_status()
            return response.text, response.url
        except Exception as exc:
            last = exc
            time.sleep(0.8 * (attempt + 1))
    raise RuntimeError(f"Failed page fetch {url}: {last}")


def extract_between(text, start_marker, end_marker):
    start = text.find(start_marker)
    if start < 0:
        return ""
    start = text.find(">", start)
    if start < 0:
        return ""
    depth = 1
    pos = start + 1
    tag = start_marker.split()[0].lstrip("<")
    open_re = re.compile(rf"<{tag}\b", re.I)
    close_re = re.compile(rf"</{tag}>", re.I)
    while True:
        next_open = open_re.search(text, pos)
        next_close = close_re.search(text, pos)
        if not next_close:
            break
        if next_open and next_open.start() < next_close.start():
            depth += 1
            pos = next_open.end()
            continue
        depth -= 1
        if depth == 0:
            return text[start + 1 : next_close.start()]
        pos = next_close.end()
    end = text.find(end_marker, start + 1)
    return text[start + 1 : end] if end > start else ""


def extract_public_article(page_html):
    title_match = re.search(r'<h1 class="entry-title"[^>]*>([\s\S]*?)</h1>', page_html, re.I)
    post_match = re.search(r'<article id="post-(\d+)"', page_html, re.I)
    marker = '<div class="entry-content"'
    content = extract_between(page_html, marker, "</div>")
    return {
        "public_post_id": int(post_match.group(1)) if post_match else None,
        "public_title": strip_tags(title_match.group(1)) if title_match else "",
        "entry_content_html": content,
    }


class ContentParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.links = []
        self.images = []
        self.attachments = []
        self._link_stack = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        tag = tag.lower()
        if tag in {"p", "div", "section", "article", "figure", "figcaption", "ul", "ol", "table", "tr"}:
            self.parts.append("\n")
        elif tag == "li":
            self.parts.append("\n- ")
        elif tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self.parts.append("\n\n" + "#" * int(tag[1]) + " ")
        elif tag == "br":
            self.parts.append("\n")
        elif tag == "img":
            src = normalize_url(attrs.get("src", ""))
            if src:
                alt = attrs.get("alt", "")
                self.images.append({"src": src, "alt": alt, "class": attrs.get("class", "")})
                self.parts.append(f"\n![{alt}]({src})\n")
        elif tag in {"video", "audio", "source"}:
            src = normalize_url(attrs.get("src", ""))
            if src:
                self.attachments.append({"href": src, "text": tag, "kind": tag})
                self.parts.append(f"\n[{tag}]({src})\n")
        elif tag == "a":
            href = normalize_url(attrs.get("href", ""))
            self._link_stack.append(href)
            if href:
                self.links.append({"href": href, "text": ""})

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag == "a":
            if self._link_stack:
                self._link_stack.pop()
        elif tag in {"p", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6", "figure", "figcaption", "tr"}:
            self.parts.append("\n")

    def handle_data(self, data):
        if data:
            text = data.strip()
            if not text:
                return
            self.parts.append(text + " ")
            if self._link_stack and self.links:
                self.links[-1]["text"] += text

    def markdown(self):
        text = "".join(self.parts)
        text = re.sub(r"[ \t]+\n", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()


def extract_content(rendered):
    parser = ContentParser()
    parser.feed(rendered or "")
    return parser.markdown(), parser.links + parser.attachments, parser.images


def fetch_public_pages(docs):
    pages_dir = OUT / "pages"
    pages_dir.mkdir(parents=True, exist_ok=True)

    def one(doc):
        try:
            text, final_url = get_text(doc.get("link", ""))
            article = extract_public_article(text)
            page_file = pages_dir / f"{doc['id']:04d}.html"
            page_file.write_text(text, encoding="utf-8")
            return doc["id"], {
                "ok": True,
                "final_url": final_url,
                "page_html_file": str(page_file),
                **article,
            }
        except Exception as exc:
            return doc["id"], {"ok": False, "error": str(exc)}

    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for idx, (doc_id, result) in enumerate(pool.map(one, docs), 1):
            results[doc_id] = result
            if idx % 50 == 0:
                print(f"Fetched public pages: {idx}/{len(docs)}", flush=True)
    return results


def url_asset_path(url):
    parsed = urlparse(url)
    path = unquote(parsed.path).strip("/")
    if not path:
        path = "asset"
    if parsed.query:
        suffix = "_" + quote(parsed.query, safe="")
    else:
        suffix = ""
    return OUT / "assets" / f"{path}{suffix}"


def fetch_all_docs():
    first, response = get_json(API, {"per_page": 100, "_embed": 1, "page": 1})
    total_pages = int(response.headers.get("X-WP-TotalPages", "1"))
    total = int(response.headers.get("X-WP-Total", str(len(first))))
    docs = list(first)
    for page in range(2, total_pages + 1):
        batch, _ = get_json(API, {"per_page": 100, "_embed": 1, "page": page})
        docs.extend(batch)
        print(f"Fetched API page {page}/{total_pages}: {len(docs)}/{total}", flush=True)
    return docs, total, total_pages


def enrich_docs(docs, public_pages):
    by_id = {doc["id"]: doc for doc in docs}
    children = {}
    for doc in docs:
        children.setdefault(doc.get("parent") or 0, []).append(doc["id"])
    for ids in children.values():
        ids.sort(key=lambda doc_id: (by_id[doc_id].get("menu_order", 0), by_id[doc_id].get("date", ""), doc_id))

    def breadcrumb(doc):
        chain = []
        seen = set()
        cur = doc
        while cur and cur.get("id") not in seen:
            seen.add(cur["id"])
            chain.append(strip_tags(cur.get("title", {}).get("rendered", "")) or str(cur["id"]))
            cur = by_id.get(cur.get("parent"))
        return list(reversed(chain))

    enriched = []
    for doc in docs:
        api_rendered = doc.get("content", {}).get("rendered", "")
        public_page = public_pages.get(doc["id"], {})
        page_rendered = public_page.get("entry_content_html") or ""
        rendered = page_rendered if strip_tags(page_rendered) or re.search(r"<(img|video|audio|source|iframe|a)\b", page_rendered, re.I) else api_rendered
        md, links, images = extract_content(rendered)
        title = strip_tags(doc.get("title", {}).get("rendered", "")) or f"doc-{doc['id']}"
        enriched.append(
            {
                "id": doc["id"],
                "parent": doc.get("parent") or 0,
                "children": children.get(doc["id"], []),
                "menu_order": doc.get("menu_order", 0),
                "title": title,
                "breadcrumb": breadcrumb(doc),
                "slug": doc.get("slug", ""),
                "link": doc.get("link", ""),
                "date": doc.get("date", ""),
                "modified": doc.get("modified", ""),
                "content_markdown": md,
                "content_text": strip_tags(rendered),
                "content_html": rendered,
                "api_content_html": api_rendered,
                "public_page": public_page,
                "links": links,
                "images": images,
                "raw": doc,
            }
        )
    return enriched, by_id, children


def write_docs(enriched):
    markdown_dir = OUT / "markdown"
    html_dir = OUT / "html"
    public_content_dir = OUT / "public_entry_html"
    markdown_dir.mkdir(parents=True, exist_ok=True)
    html_dir.mkdir(parents=True, exist_ok=True)
    public_content_dir.mkdir(parents=True, exist_ok=True)
    used = set()
    for doc in enriched:
        prefix = f"{doc['id']:04d}"
        name = f"{prefix}_{safe_name(doc['title'], prefix)}"
        while name in used:
            name += "_"
        used.add(name)
        doc["markdown_file"] = str(markdown_dir / f"{name}.md")
        doc["html_file"] = str(html_dir / f"{name}.html")
        doc["public_entry_html_file"] = str(public_content_dir / f"{name}.html")
        Path(doc["html_file"]).write_text(doc["content_html"], encoding="utf-8")
        Path(doc["public_entry_html_file"]).write_text(doc["public_page"].get("entry_content_html", ""), encoding="utf-8")
        body = [
            f"# {doc['title']}",
            "",
            f"- ID: {doc['id']}",
            f"- URL: {doc['link']}",
            f"- Public URL: {doc['public_page'].get('final_url', '')}",
            f"- Public Post ID: {doc['public_page'].get('public_post_id', '')}",
            f"- Public Title: {doc['public_page'].get('public_title', '')}",
            f"- Parent ID: {doc['parent']}",
            f"- Breadcrumb: {' > '.join(doc['breadcrumb'])}",
            f"- Created: {doc['date']}",
            f"- Modified: {doc['modified']}",
            "",
            "## Content",
            "",
            doc["content_markdown"] or "(empty content)",
            "",
        ]
        if doc["images"]:
            body.extend(["## Images", ""])
            for image in doc["images"]:
                body.append(f"- {image['src']}")
            body.append("")
        if doc["links"]:
            body.extend(["## Links / Media", ""])
            for link in doc["links"]:
                body.append(f"- {link.get('text','').strip()}: {link['href']}")
            body.append("")
        Path(doc["markdown_file"]).write_text("\n".join(body), encoding="utf-8")


def download_assets(enriched):
    asset_urls = []
    for doc in enriched:
        for image in doc["images"]:
            src = image["src"]
            if src and not src.startswith("blob:"):
                asset_urls.append(src)
        for link in doc["links"]:
            href = link["href"]
            if "/wp-content/uploads/" in href and not href.startswith("blob:"):
                asset_urls.append(href)
    asset_urls = sorted(set(asset_urls))
    results = {}
    (OUT / "assets").mkdir(parents=True, exist_ok=True)

    def one(url):
        path = url_asset_path(url)
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists() and path.stat().st_size > 0:
            return url, {"path": str(path), "bytes": path.stat().st_size, "content_type": "existing", "ok": True}
        try:
            content, ctype = get_bytes(url)
            path.write_bytes(content)
            return url, {"path": str(path), "bytes": len(content), "content_type": ctype, "ok": True}
        except Exception as exc:
            return url, {"ok": False, "error": str(exc)}

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for idx, (url, result) in enumerate(pool.map(one, asset_urls), 1):
            results[url] = result
            if idx % 50 == 0:
                print(f"Downloaded assets: {idx}/{len(asset_urls)}", flush=True)
    for doc in enriched:
        for image in doc["images"]:
            image["download"] = results.get(image["src"])
        for link in doc["links"]:
            if link["href"] in results:
                link["download"] = results[link["href"]]
    return results


def write_index(enriched, total, total_pages, assets):
    roots = [doc for doc in enriched if doc["parent"] == 0]
    roots.sort(key=lambda doc: (doc["menu_order"], doc["id"]))
    summary = {
        "source": BASE,
        "api": API,
        "crawled_at": datetime.now(timezone.utc).isoformat(),
        "reported_total": total,
        "reported_total_pages": total_pages,
        "saved_docs": len(enriched),
        "root_docs": [{"id": doc["id"], "title": doc["title"], "children": len(doc["children"])} for doc in roots],
        "asset_count": len(assets),
        "asset_ok": sum(1 for item in assets.values() if item.get("ok")),
        "asset_failed": sum(1 for item in assets.values() if not item.get("ok")),
    }
    (OUT / "all_docs.json").write_text(json.dumps(enriched, ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = [
        "# 易抵达物流系统支持文档抓取索引",
        "",
        f"- Source: {BASE}",
        f"- Crawled at: {summary['crawled_at']}",
        f"- Reported docs: {total}",
        f"- Saved docs: {len(enriched)}",
        f"- Assets: {summary['asset_ok']} ok / {summary['asset_failed']} failed",
        "",
        "## Root Documents",
        "",
    ]
    by_parent = {}
    by_id = {}
    for doc in enriched:
        by_id[doc["id"]] = doc
        by_parent.setdefault(doc["parent"], []).append(doc)
    for docs in by_parent.values():
        docs.sort(key=lambda doc: (doc["menu_order"], doc["id"]))

    def add_tree(parent, depth=0):
        for doc in by_parent.get(parent, []):
            indent = "  " * depth
            md_path = os.path.relpath(doc["markdown_file"], OUT)
            lines.append(f"{indent}- [{doc['title']}]({md_path})  (id={doc['id']}, children={len(doc['children'])})")
            add_tree(doc["id"], depth + 1)

    add_tree(0)
    (OUT / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    docs, total, total_pages = fetch_all_docs()
    public_pages = fetch_public_pages(docs)
    enriched, _, _ = enrich_docs(docs, public_pages)
    write_docs(enriched)
    assets = download_assets(enriched)
    write_index(enriched, total, total_pages, assets)
    print(json.dumps({
        "reported_total": total,
        "saved_docs": len(enriched),
        "asset_count": len(assets),
        "output": str(OUT),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
