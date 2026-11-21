"""
AI Tutor answers from Google Gemini.

The API key is read from the environment (or backend/.env) and never leaves the server.
Gemini only sees the current chapter and the student's selection/question, and is told
to answer from that text.
"""

import json
import os
import urllib.error
import urllib.request
from pathlib import Path

API_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
DEFAULT_MODEL = "gemini-2.5-flash"
MAX_CONTEXT_CHARS = 14_000


def load_env_file() -> None:
    """Minimal .env loader (KEY=value lines) so no extra package is needed."""
    env = Path(__file__).parent / ".env"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def api_key() -> str | None:
    return os.environ.get("GEMINI_API_KEY") or None


def model() -> str:
    return os.environ.get("GEMINI_MODEL") or DEFAULT_MODEL


SYSTEM = """You are the AI Tutor inside SmartBook, a digital textbook app for law students in Uzbekistan.
The student may ask anything. Use the chapter text you are given when it is relevant; otherwise answer from general knowledge.
Rules:
- Plain, clear English for a law student. Keep it short: at most about 150 words.
- You may give one short, realistic example (e.g. with sums in soums).
- Do not invent article numbers, case names or legal provisions. If you are not sure about Uzbek law, say so.
- For exact legal wording, remind the student that the official text on Lex.uz is authoritative.
- Use **bold** for key terms. Short paragraphs or a brief list; no headings."""

TASKS = {
    "explain": "Explain the selected passage in simple terms and why it matters.",
    "summarize": "Summarise the selected passage in 2-3 sentences, then give the one key idea to remember.",
    "ask": "Answer the student's question.",
}


class TutorError(Exception):
    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


def answer(mode: str, book_title: str, chapter_title: str, chapter_text: str, selection: str, question: str) -> str:
    key = api_key()
    if not key:
        raise TutorError("Gemini is not configured (set GEMINI_API_KEY in backend/.env).", 503)

    parts = [
        f"Book: {book_title}\nChapter: {chapter_title}\n\n--- CHAPTER TEXT ---\n{chapter_text[:MAX_CONTEXT_CHARS]}\n--- END OF CHAPTER ---",
        f"Task: {TASKS.get(mode, TASKS['ask'])}",
    ]
    if selection:
        parts.append(f"Selected passage:\n\"{selection[:2000]}\"")
    if question:
        parts.append(f"Student's question: {question[:1000]}")

    body = {
        "systemInstruction": {"parts": [{"text": SYSTEM}]},
        "contents": [{"role": "user", "parts": [{"text": "\n\n".join(parts)}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 2048},
    }
    req = urllib.request.Request(
        API_URL.format(model=model()),
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            data = json.loads(res.read().decode())
    except urllib.error.HTTPError as e:
        detail = ""
        try:
            detail = json.loads(e.read().decode()).get("error", {}).get("message", "")
        except Exception:
            pass
        if e.code in (400, 401, 403) and "key" in detail.lower():
            raise TutorError("Gemini rejected the API key. Check GEMINI_API_KEY in backend/.env.", 502)
        if e.code == 429:
            raise TutorError("Gemini rate limit reached. Please wait a moment and try again.", 429)
        if e.code == 404:
            raise TutorError(f"Gemini model “{model()}” was not found. Set GEMINI_MODEL in backend/.env.", 502)
        raise TutorError(f"Gemini error {e.code}: {detail or e.reason}", 502)
    except (urllib.error.URLError, TimeoutError) as e:
        raise TutorError(f"Could not reach Gemini: {e}", 502)

    candidates = data.get("candidates") or []
    text = "".join(p.get("text", "") for c in candidates[:1] for p in (c.get("content") or {}).get("parts", []))
    if not text.strip():
        reason = (candidates[0].get("finishReason") if candidates else None) or (data.get("promptFeedback") or {}).get("blockReason") or "empty response"
        raise TutorError(f"Gemini returned no answer ({reason}).", 502)
    return text.strip()
