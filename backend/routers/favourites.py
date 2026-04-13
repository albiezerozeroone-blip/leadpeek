"""Favourites router — per-user company tracking."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from db import fetch_all, fetch_one, execute
from auth import get_current_user, optional_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/favourites", tags=["favourites"])


class FavouriteCreate(BaseModel):
    enterprise_number: str
    notes: Optional[str] = None


def _serialize_row(row: dict) -> dict:
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


@router.get("")
async def list_favourites(user=Depends(get_current_user)):
    """List favourites for the logged-in user."""
    try:
        rows = fetch_all("""
            SELECT f.enterprise_number, f.added_at, f.notes,
                   COALESCE(ci.name, d.denomination) AS "name",
                   ci.city, ci.nace_code,
                   fl.revenue, fl.ebitda, fl.fte_total,
                   CASE WHEN fl.revenue > 0
                        THEN ROUND((fl.ebitda / fl.revenue * 100)::numeric, 1)
                   END AS "margin"
            FROM favourite f
            LEFT JOIN company_info ci ON ci.enterprise_number = f.enterprise_number
            LEFT JOIN denomination d ON d.entity_number = f.enterprise_number
                 AND d.type_of_denomination = '001' AND d.language IN ('2','1')
            LEFT JOIN financial_latest fl ON fl.enterprise_number = f.enterprise_number
            WHERE f.user_id = %s
            ORDER BY f.added_at DESC
        """, (user["id"],))
        return [_serialize_row(r) for r in rows]
    except Exception as e:
        logger.exception("List favourites failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", status_code=201)
async def add_favourite(body: FavouriteCreate, user=Depends(get_current_user)):
    """Add a company to the user's favourites."""
    cbe = str(body.enterprise_number).replace(".", "").zfill(10)
    try:
        execute(
            """INSERT INTO favourite (user_id, enterprise_number, notes)
               VALUES (%s, %s, %s) ON CONFLICT DO NOTHING""",
            (user["id"], cbe, body.notes),
        )
        return {"enterprise_number": cbe, "status": "added"}
    except Exception as e:
        logger.exception("Add favourite failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{cbe}")
async def remove_favourite(cbe: str, user=Depends(get_current_user)):
    """Remove a company from the user's favourites."""
    cbe = cbe.strip().replace(".", "").zfill(10)
    try:
        existing = fetch_one(
            "SELECT 1 FROM favourite WHERE user_id = %s AND enterprise_number = %s",
            (user["id"], cbe),
        )
        if not existing:
            raise HTTPException(status_code=404, detail=f"Favourite {cbe} not found")

        execute(
            "DELETE FROM favourite WHERE user_id = %s AND enterprise_number = %s",
            (user["id"], cbe),
        )
        return {"enterprise_number": cbe, "status": "removed"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Remove favourite failed")
        raise HTTPException(status_code=500, detail=str(e))
