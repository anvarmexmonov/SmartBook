"""
SmartBook user API (FastAPI).

Stores user accounts and login sessions in a local SQLite file (data/smartbook.db).
Everything else in SmartBook (books, reading progress, ...) still lives in the browser.

Passwords are stored only as salted PBKDF2-SHA256 hashes. This is a hackathon demo,
not a production authentication service (no HTTPS, rate limiting, e-mail checks, ...).
"""

import hashlib
import hmac
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

DB_PATH = Path(__file__).parent / "data" / "smartbook.db"
SESSION_DAYS = 30
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")

# Same demo accounts as shown on the log-in page.
DEMO_USERS = [
    ("student-demo", "Aziza Karimova", "student@smartbook.demo", "student-demo", "student"),
    ("prof-rakhimova", "Prof. Dilnoza Rakhimova", "professor@smartbook.demo", "professor-demo", "professor"),
]

Role = Literal["student", "professor"]


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
            """
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
