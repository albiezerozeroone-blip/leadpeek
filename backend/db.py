"""Database connection module for the FastAPI backend.

Mirrors the pattern from src/db.py — uses psycopg2 with
SET default_transaction_read_only = off for Supabase compatibility.
"""

import os
import logging
from contextlib import contextmanager

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

_DATABASE_URL = os.getenv("DATABASE_URL", "")


def get_connection():
    """Get a PostgreSQL connection. Caller is responsible for closing it."""
    if not _DATABASE_URL:
        raise RuntimeError("DATABASE_URL not set in environment / .env file")
    conn = psycopg2.connect(_DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()
    cur.execute("SET default_transaction_read_only = off")
    conn.commit()
    cur.close()
    return conn


@contextmanager
def get_conn():
    """Context manager that yields a connection and closes it on exit."""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def fetch_all(sql: str, params: tuple | list = None) -> list[dict]:
    """Execute a query and return all rows as a list of dicts."""
    conn = get_connection()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(sql, params)
        rows = cur.fetchall()
        cur.close()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def fetch_one(sql: str, params: tuple | list = None) -> dict | None:
    """Execute a query and return the first row as a dict, or None."""
    conn = get_connection()
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(sql, params)
        row = cur.fetchone()
        cur.close()
        return dict(row) if row else None
    finally:
        conn.close()


def execute(sql: str, params: tuple | list = None):
    """Execute a write query (INSERT/UPDATE/DELETE) and commit."""
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
        cur.close()
    finally:
        conn.close()
