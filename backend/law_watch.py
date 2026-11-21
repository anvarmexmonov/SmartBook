"""
Law Watch — a tiny agent that keeps the legal references in SmartBook books up to date.

One run of the agent:
  1. Observe: download each tracked act from lex.uz (one request per act).
  2. Read:    split the act into articles (number, title, paragraphs).
  3. Check:   for every reference cited in a book
                - is the cited article still about the expected topic?  (renumbering)
                - is the article marked as repealed ("утратил силу")?    (expired)
                - did the official text change since the last check?   (amended)
  4. Act:     create a proposal for the professor. Nothing in a book changes
              until a professor approves it.

It only reads public pages of lex.uz and does not use any AI model: every decision
is a plain comparison that can be shown step by step.
"""

import html
import re
import time
import urllib.request
from dataclasses import dataclass

USER_AGENT = "SmartBook-LawWatch/1.0 (LexHackathon demo; contact: professor)"
REPEALED_RE = re.compile(r"утратил[аио]?\s+силу|o[‘'`]?z\s+kuchini\s+yo[‘'`]?qotgan", re.I)


@dataclass
class Article:
    number: int
    title: str
    text: str  # paragraphs joined with blank lines


@dataclass
class Act:
    url: str
    title: str
    articles: dict[int, Article]
    size: int


def _clean(fragment: str) -> str:
    text = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def fetch_act(url: str, timeout: float = 25) -> Act:
    """Download a lex.uz document page and split it into articles."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "ru,uz;q=0.8"})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        page = res.read().decode("utf-8", errors="replace")

    title_m = re.search(r"<title>(.*?)</title>", page, re.S)
    title = _clean(title_m.group(1)) if title_m else url

    # Every element of the act body is <div name="ID" id="ID">…</div>, in reading order.
    elements = [(int(m.group(1)), _clean(m.group(2))) for m in re.finditer(r'<div name="(\d+)" id="\1">(.*?)</div>', page, re.S)]
    articles: dict[int, Article] = {}
    current: Article | None = None
    for _, text in elements:
        head = re.match(r"^Статья\s+(\d+)\.\s*(.*)$", text) or re.match(r"^(\d+)-modda\.\s*(.*)$", text)
        if head:
            current = Article(int(head.group(1)), head.group(2).strip(), "")
            articles.setdefault(current.number, current)
        elif current is not None and text and not re.match(r"^(ГЛАВА|РАЗДЕЛ|§|BOB|BO‘LIM)\b", text, re.I):
            current.text = f"{current.text}\n\n{text}" if current.text else text
    return Act(url=url, title=title, articles=articles, size=len(page))


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s or "").strip().lower()


def find_by_topic(act: Act, topic: str) -> Article | None:
    t = _norm(topic)
    exact = [a for a in act.articles.values() if _norm(a.title) == t]
    if exact:
        return exact[0]
    loose = [a for a in act.articles.values() if t in _norm(a.title)]
    return min(loose, key=lambda a: len(a.title)) if loose else None


def check_reference(act: Act, cited: int, topic: str, known_text: str | None) -> dict:
    """Compare one cited article with the live act. Returns a finding (kind 'ok' when nothing to do)."""
    art = act.articles.get(cited)
    if art and _norm(topic) not in _norm(art.title):
        # the number now belongs to another article: look for the topic elsewhere
        moved = find_by_topic(act, topic)
        if moved:
            return {
                "kind": "renumber",
                "article": moved,
                "summary": f"Art. {cited} on Lex.uz is now “{art.title}”. The provision on “{topic}” is Art. {moved.number}.",
                "cited_title": art.title,
            }
        return {"kind": "missing", "article": art, "summary": f"Art. {cited} is now “{art.title}” and no article titled “{topic}” was found.", "cited_title": art.title}
    if not art:
        moved = find_by_topic(act, topic)
        if moved:
            return {"kind": "renumber", "article": moved, "summary": f"Art. {cited} no longer exists. “{topic}” is Art. {moved.number}.", "cited_title": None}
        return {"kind": "missing", "article": None, "summary": f"Art. {cited} was not found in the act.", "cited_title": None}
    if REPEALED_RE.search(art.text) and len(art.text) < 400:
        return {"kind": "repealed", "article": art, "summary": f"Art. {cited} “{art.title}” is marked as no longer in force.", "cited_title": art.title}
    if known_text and _norm(known_text) != _norm(art.text):
        return {"kind": "amended", "article": art, "summary": f"The wording of Art. {cited} “{art.title}” has changed since the last check.", "cited_title": art.title}
    return {"kind": "ok", "article": art, "summary": f"Art. {cited} “{art.title}” — up to date.", "cited_title": art.title}


def now() -> float:
    return time.time()
