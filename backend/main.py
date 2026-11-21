"""
SmartBook user API (FastAPI).

Stores user accounts and login sessions in a local SQLite file (data/smartbook.db).
Everything else in SmartBook (books, reading progress, ...) still lives in the browser.

Passwords are stored only as salted PBKDF2-SHA256 hashes. This is a hackathon demo,
not a production authentication service (no HTTPS, rate limiting, e-mail checks, ...).
"""

import hashlib
import hmac
import json
import re
import secrets
import sqlite3
import time
from contextlib import asynccontextmanager, closing
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

import law_watch

DB_PATH = Path(__file__).parent / "data" / "smartbook.db"
SESSION_DAYS = 30
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")

# Same demo accounts as shown on the log-in page.
DEMO_USERS = [
    ("student-demo", "Aziza Karimova", "student@smartbook.demo", "student-demo", "student"),
    ("prof-rakhimova", "Prof. Dilnoza Rakhimova", "professor@smartbook.demo", "professor-demo", "professor"),
]

Role = Literal["student", "professor"]

# References the Law Watch agent tracks. One act, the five Civil Code articles cited in
# "Civil Law Fundamentals", chapter 4. `topic` is the article title the book relies on.
CIVIL_CODE = ("Civil Code of the Republic of Uzbekistan (Part One)", "https://lex.uz/ru/docs/111181")
TRACKED_REFS = [
    # id, owner, book, block, cited article, topic (title on lex.uz)
    ("cc-353", "prof-rakhimova", "civil-law-fundamentals", "c4-lex-353", 353, "Понятие договора"),
    ("cc-354", "prof-rakhimova", "civil-law-fundamentals", "c4-lex-354", 354, "Свобода договора"),
    ("cc-364", "prof-rakhimova", "civil-law-fundamentals", "c4-lex-364", 364, "Основные положения о заключении договора"),
    ("cc-365", "prof-rakhimova", "civil-law-fundamentals", "c4-lex-365", 365, "Оферта"),
    ("cc-370", "prof-rakhimova", "civil-law-fundamentals", "c4-lex-370", 370, "Акцепт"),
]


# ---------------- database ----------------

def db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000).hex()


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with closing(db()) as conn, conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id            TEXT PRIMARY KEY,
                name          TEXT NOT NULL,
                email         TEXT NOT NULL UNIQUE,
                role          TEXT NOT NULL CHECK (role IN ('student', 'professor')),
                salt          TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                demo          INTEGER NOT NULL DEFAULT 0,
                created_at    REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token      TEXT PRIMARY KEY,
                user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS law_refs (
                id            TEXT PRIMARY KEY,
                owner_id      TEXT NOT NULL,
                book_id       TEXT NOT NULL,
                block_id      TEXT NOT NULL,
                act_title     TEXT NOT NULL,
                act_url       TEXT NOT NULL,
                cited_article INTEGER NOT NULL,
                topic         TEXT NOT NULL,
                official_text TEXT,
                status        TEXT NOT NULL DEFAULT 'unchecked',
                checked_at    REAL
            );
            CREATE TABLE IF NOT EXISTS law_proposals (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                ref_id        TEXT NOT NULL REFERENCES law_refs(id),
                kind          TEXT NOT NULL,
                summary       TEXT NOT NULL,
                cited_article INTEGER NOT NULL,
                cited_title   TEXT,
                found_article INTEGER,
                found_title   TEXT,
                new_text      TEXT,
                status        TEXT NOT NULL DEFAULT 'pending',
                created_at    REAL NOT NULL,
                decided_by    TEXT,
                decided_at    REAL
            );
            CREATE TABLE IF NOT EXISTS law_runs (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_id    TEXT NOT NULL,
                started_at  REAL NOT NULL,
                finished_at REAL,
                checked     INTEGER NOT NULL DEFAULT 0,
                issues      INTEGER NOT NULL DEFAULT 0,
                error       TEXT,
                steps       TEXT NOT NULL DEFAULT '[]'
            );
            """
        )
        for rid, owner, book, block, article, topic in TRACKED_REFS:
            conn.execute(
                "INSERT OR IGNORE INTO law_refs (id, owner_id, book_id, block_id, act_title, act_url, cited_article, topic) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (rid, owner, book, block, CIVIL_CODE[0], CIVIL_CODE[1], article, topic),
            )
        for uid, name, email, password, role in DEMO_USERS:
            if not conn.execute("SELECT 1 FROM users WHERE id = ?", (uid,)).fetchone():
                salt = secrets.token_hex(16)
                conn.execute(
                    "INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, 1, ?)",
                    (uid, name, email, role, salt, hash_password(password, salt), time.time()),
                )


def public_user(row: sqlite3.Row) -> dict:
    return {"id": row["id"], "name": row["name"], "email": row["email"], "role": row["role"], "demo": bool(row["demo"])}


def new_session(conn: sqlite3.Connection, user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    conn.execute("DELETE FROM sessions WHERE expires_at < ?", (time.time(),))
    conn.execute("INSERT INTO sessions VALUES (?, ?, ?)", (token, user_id, time.time() + SESSION_DAYS * 86400))
    return token


# ---------------- API ----------------

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="SmartBook users API", version="1.0.0", lifespan=lifespan)

# The Vite dev server proxies /api, so CORS is only needed when calling the API directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173", "http://127.0.0.1:4173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SignUpIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(max_length=200)
    password: str = Field(min_length=8, max_length=200)
    role: Role

    @field_validator("name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = " ".join(v.split())
        if len(v) < 2:
            raise ValueError("Enter your full name.")
        return v

    @field_validator("email")
    @classmethod
    def check_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("This doesn't look like an email address.")
        return v

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("Include at least one letter and one number.")
        return v


class LogInIn(BaseModel):
    email: str
    password: str


def error(code: int, message: str, field: str | None = None):
    raise HTTPException(status_code=code, detail={"error": message, "field": field})


def current_user(authorization: str | None = Header(default=None)) -> sqlite3.Row:
    token = (authorization or "").removeprefix("Bearer ").strip()
    if not token:
        error(status.HTTP_401_UNAUTHORIZED, "Not logged in.")
    with closing(db()) as conn:
        row = conn.execute(
            "SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?",
            (token, time.time()),
        ).fetchone()
    if not row:
        error(status.HTTP_401_UNAUTHORIZED, "Your session has expired. Please log in again.")
    return row


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/auth/signup", status_code=status.HTTP_201_CREATED)
def sign_up(body: SignUpIn):
    salt = secrets.token_hex(16)
    user_id = "user-" + secrets.token_hex(6)
    with closing(db()) as conn, conn:
        if conn.execute("SELECT 1 FROM users WHERE email = ?", (body.email,)).fetchone():
            error(status.HTTP_409_CONFLICT, "An account with this email already exists. Log in instead.", "email")
        conn.execute(
            "INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
            (user_id, body.name, body.email, body.role, salt, hash_password(body.password, salt), time.time()),
        )
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return {"user": public_user(row)}


@app.post("/api/auth/login")
def log_in(body: LogInIn):
    with closing(db()) as conn, conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (body.email.strip().lower(),)).fetchone()
        if not row:
            error(status.HTTP_401_UNAUTHORIZED, "No account uses this email. Check the spelling or create an account.", "email")
        if not hmac.compare_digest(hash_password(body.password, row["salt"]), row["password_hash"]):
            error(status.HTTP_401_UNAUTHORIZED, "The password is incorrect.", "password")
        token = new_session(conn, row["id"])
    return {"token": token, "user": public_user(row)}


@app.get("/api/auth/me")
def me(user: sqlite3.Row = Depends(current_user)):
    return {"user": public_user(user)}


@app.post("/api/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def log_out(authorization: str | None = Header(default=None)):
    token = (authorization or "").removeprefix("Bearer ").strip()
    if token:
        with closing(db()) as conn, conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


# ---------------- Law Watch agent (professors only) ----------------

def professor(user: sqlite3.Row = Depends(current_user)) -> sqlite3.Row:
    if user["role"] != "professor":
        error(status.HTTP_403_FORBIDDEN, "Only professors can use Law Watch.")
    return user


def _ref(row: sqlite3.Row) -> dict:
    return {k: row[k] for k in ("id", "book_id", "block_id", "act_title", "act_url", "cited_article", "topic", "status", "checked_at")}


def _proposal(row: sqlite3.Row) -> dict:
    return dict(row)


def _state(conn: sqlite3.Connection, owner_id: str) -> dict:
    refs = conn.execute("SELECT * FROM law_refs WHERE owner_id = ? ORDER BY cited_article", (owner_id,)).fetchall()
    ids = [r["id"] for r in refs] or [""]
    marks = ",".join("?" * len(ids))
    proposals = conn.execute(
        f"SELECT p.*, r.book_id, r.block_id, r.act_title, r.act_url, r.topic FROM law_proposals p JOIN law_refs r ON r.id = p.ref_id "
        f"WHERE p.ref_id IN ({marks}) ORDER BY (p.status = 'pending') DESC, p.created_at DESC LIMIT 20",
        ids,
    ).fetchall()
    run = conn.execute("SELECT * FROM law_runs WHERE owner_id = ? ORDER BY id DESC LIMIT 1", (owner_id,)).fetchone()
    last_run = None
    if run:
        last_run = {k: run[k] for k in ("started_at", "finished_at", "checked", "issues", "error")} | {"steps": json.loads(run["steps"])}
    return {"refs": [_ref(r) for r in refs], "proposals": [_proposal(p) for p in proposals], "last_run": last_run}


@app.get("/api/law-watch")
def law_watch_state(user: sqlite3.Row = Depends(professor)):
    with closing(db()) as conn:
        return _state(conn, user["id"])


@app.post("/api/law-watch/run")
def law_watch_run(user: sqlite3.Row = Depends(professor)):
    """Runs the agent once over every reference the professor's books cite."""
    steps: list[dict] = []

    def log(text: str, kind: str = "info"):
        steps.append({"t": round(time.time(), 3), "kind": kind, "text": text})

    with closing(db()) as conn, conn:
        refs = conn.execute("SELECT * FROM law_refs WHERE owner_id = ? ORDER BY cited_article", (user["id"],)).fetchall()
        run_id = conn.execute("INSERT INTO law_runs (owner_id, started_at) VALUES (?, ?)", (user["id"], time.time())).lastrowid
        if not refs:
            log("No legal references are tracked for your books yet.")
        checked = issues = 0
        err = None
        for act_url in sorted({r["act_url"] for r in refs}):
            act_refs = [r for r in refs if r["act_url"] == act_url]
            log(f"Downloading {act_refs[0]['act_title']} from {act_url}")
            try:
                act = law_watch.fetch_act(act_url)
            except Exception as e:  # network, timeout, HTML changes
                err = f"Could not read {act_url}: {e}"
                log(err, "error")
                continue
            log(f"Read “{act.title}”: {len(act.articles)} articles ({act.size // 1024} KB).")
            for r in act_refs:
                checked += 1
                f = law_watch.check_reference(act, r["cited_article"], r["topic"], r["official_text"])
                art = f["article"]
                if f["kind"] == "ok":
                    conn.execute(
                        "UPDATE law_refs SET status = 'current', checked_at = ?, official_text = COALESCE(official_text, ?) WHERE id = ?",
                        (time.time(), art.text, r["id"]),
                    )
                    log(f["summary"], "ok")
                    continue
                issues += 1
                conn.execute("UPDATE law_refs SET status = 'attention', checked_at = ? WHERE id = ?", (time.time(), r["id"]))
                duplicate = conn.execute(
                    "SELECT 1 FROM law_proposals WHERE ref_id = ? AND kind = ? AND IFNULL(found_article, -1) = ? AND IFNULL(new_text, '') = ? AND status != 'approved'",
                    (r["id"], f["kind"], art.number if art else -1, art.text if art else ""),
                ).fetchone()
                if duplicate:
                    log(f["summary"] + " (already proposed)", "warn")
                    continue
                conn.execute(
                    "INSERT INTO law_proposals (ref_id, kind, summary, cited_article, cited_title, found_article, found_title, new_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (r["id"], f["kind"], f["summary"], r["cited_article"], f["cited_title"], art.number if art else None, art.title if art else None, art.text if art else None, time.time()),
                )
                log(f["summary"] + " → proposal sent to the professor.", "warn")
        log(f"Done: {checked} checked, {issues} need attention.", "done")
        conn.execute(
            "UPDATE law_runs SET finished_at = ?, checked = ?, issues = ?, error = ?, steps = ? WHERE id = ?",
            (time.time(), checked, issues, err, json.dumps(steps, ensure_ascii=False), run_id),
        )
    with closing(db()) as conn:
        return _state(conn, user["id"])


def _owned_proposal(conn: sqlite3.Connection, pid: int, user: sqlite3.Row) -> sqlite3.Row:
    row = conn.execute(
        "SELECT p.*, r.owner_id, r.book_id, r.block_id, r.act_url FROM law_proposals p JOIN law_refs r ON r.id = p.ref_id WHERE p.id = ?", (pid,)
    ).fetchone()
    if not row or row["owner_id"] != user["id"]:
        error(status.HTTP_404_NOT_FOUND, "Proposal not found.")
    if row["status"] != "pending":
        error(status.HTTP_409_CONFLICT, "This proposal has already been decided.")
    return row


@app.post("/api/law-watch/proposals/{pid}/approve")
def law_watch_approve(pid: int, user: sqlite3.Row = Depends(professor)):
    with closing(db()) as conn, conn:
        p = _owned_proposal(conn, pid, user)
        now = time.time()
        conn.execute("UPDATE law_proposals SET status = 'approved', decided_by = ?, decided_at = ? WHERE id = ?", (user["name"], now, pid))
        if p["kind"] in ("renumber", "amended"):
            conn.execute(
                "UPDATE law_refs SET cited_article = ?, official_text = ?, status = 'current', checked_at = ? WHERE id = ?",
                (p["found_article"], p["new_text"], now, p["ref_id"]),
            )
        else:
            conn.execute("UPDATE law_refs SET status = 'repealed', checked_at = ? WHERE id = ?", (now, p["ref_id"]))
        # what the frontend must change in the book
        update = {
            "book_id": p["book_id"],
            "block_id": p["block_id"],
            "kind": p["kind"],
            "article": p["found_article"],
            "official_title": p["found_title"],
            "official_text": p["new_text"],
            "source_url": p["act_url"],
            "approved_by": user["name"],
            "approved_at": now,
        }
        return {"update": update, **_state(conn, user["id"])}


@app.post("/api/law-watch/proposals/{pid}/reject")
def law_watch_reject(pid: int, user: sqlite3.Row = Depends(professor)):
    with closing(db()) as conn, conn:
        _owned_proposal(conn, pid, user)
        conn.execute("UPDATE law_proposals SET status = 'rejected', decided_by = ?, decided_at = ? WHERE id = ?", (user["name"], time.time(), pid))
        return _state(conn, user["id"])
