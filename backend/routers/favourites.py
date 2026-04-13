"""Favourites router — track companies of interest for deal sourcing."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db import fetch_all, fetch_one, execute

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/favourites", tags=["favourites"])


class FavouriteCreate(BaseModel):
    enterprise_number: str
    notes: Optional[str] = None


def _serialize_row(row: dict) -> dict:
    """Convert Decimal/date types to JSON-safe primitives."""
    import decimal
    import datetime
    out = {}
    for k, v in row.items():
        if isinstance(v, decimal.Decimal):
            out[k] = float(v)
        elif isinstance(v, (datetime.date, datetime.datetime)):
            out[k] = str(v)
        else:
            out[k] = v
    return out


# ---------------------------------------------------------------------------
# GET /api/favourites
# ---------------------------------------------------------------------------

@router.get("")
async def list_favourites():
    """List all favourites with company name, sector, and latest financials.

    SQL extracted from app/components.py get_favourites().
    Global favourites (not per-user) for now.
    """
    try:
        rows = fetch_all("""
            SELECT f.enterprise_number, f.added_at, f.notes,
                   d.denomination AS "name",
                   a.nace_code, fl.revenue, fl.ebitda, fl.fte_total,
                   CASE WHEN fl.revenue > 0
                        THEN ROUND((fl.ebitda / fl.revenue * 100)::numeric, 1)
                   END AS "margin"
            FROM favourite f
            LEFT JOIN (
                SELECT entity_number, denomination FROM denomination
                WHERE type_of_denomination = '001'
                GROUP BY entity_number, denomination
            ) d ON d.entity_number = f.enterprise_number
            LEFT JOIN (
                SELECT entity_number, nace_code
                FROM activity
                WHERE classification = 'MAIN' AND nace_version = '2008'
                GROUP BY entity_number, nace_code
            ) a ON a.entity_number = f.enterprise_number
            LEFT JOIN financial_latest fl ON fl.enterprise_number = f.enterprise_number
            ORDER BY f.added_at DESC
        """)

        return [_serialize_row(r) for r in rows]
    except Exception as e:
        logger.exception("List favourites failed")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# POST /api/favourites
# ---------------------------------------------------------------------------

@router.post("", status_code=201)
async def add_favourite(body: FavouriteCreate):
    """Add a company to favourites (no-op if already there).

    SQL extracted from app/components.py add_favourite().
    """
    cbe = str(body.enterprise_number).replace(".", "").zfill(10)

    try:
        execute(
            "INSERT INTO favourite (enterprise_number, notes) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (cbe, body.notes),
        )
        return {"enterprise_number": cbe, "status": "added"}
    except Exception as e:
        logger.exception("Add favourite failed")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# DELETE /api/favourites/{cbe}
# ---------------------------------------------------------------------------

@router.delete("/{cbe}")
async def remove_favourite(cbe: str):
    """Remove a company from favourites.

    SQL extracted from app/components.py remove_favourite().
    """
    cbe = cbe.strip().replace(".", "").zfill(10)

    try:
        # Check it exists first
        existing = fetch_one(
            "SELECT 1 FROM favourite WHERE enterprise_number = %s",
            (cbe,),
        )
        if not existing:
            raise HTTPException(status_code=404, detail=f"Favourite {cbe} not found")

        execute(
            "DELETE FROM favourite WHERE enterprise_number = %s",
            (cbe,),
        )
        return {"enterprise_number": cbe, "status": "removed"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Remove favourite failed")
        raise HTTPException(status_code=500, detail=str(e))
