"""Dashboard router — KPI stats for the home page."""

import logging
from fastapi import APIRouter, HTTPException

from db import fetch_one, fetch_all

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
async def get_dashboard():
    """Return KPI stats: enterprise count, financial count, filing count,
    admin count, and snapshot date."""
    try:
        enterprise_count = fetch_one(
            "SELECT COUNT(*) AS cnt FROM enterprise WHERE status='AC'"
        )
        financial_count = fetch_one(
            "SELECT COUNT(DISTINCT enterprise_number) AS cnt FROM financial_data"
        )
        filing_count = fetch_one(
            "SELECT COUNT(DISTINCT deposit_key) AS cnt FROM financial_data"
        )
        admin_count = fetch_one(
            "SELECT COUNT(DISTINCT name) AS cnt FROM administrator"
        )
        snapshot_date = fetch_one(
            "SELECT value FROM meta WHERE variable='SnapshotDate'"
        )

        return {
            "enterprise_count": enterprise_count["cnt"] if enterprise_count else 0,
            "financial_count": financial_count["cnt"] if financial_count else 0,
            "filing_count": filing_count["cnt"] if filing_count else 0,
            "admin_count": admin_count["cnt"] if admin_count else 0,
            "snapshot_date": snapshot_date["value"] if snapshot_date else None,
        }
    except Exception as e:
        logger.exception("Dashboard query failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/top-companies")
async def get_top_companies(metric: str = "revenue", limit: int = 15):
    """Return top companies ranked by a given metric."""
    allowed_metrics = {"revenue", "ebitda", "fte_total"}
    if metric not in allowed_metrics:
        raise HTTPException(status_code=400, detail=f"metric must be one of {allowed_metrics}")
    if limit < 1 or limit > 100:
        limit = 15

    try:
        rows = fetch_all(f"""
            SELECT fl.enterprise_number,
                   COALESCE(d.denomination, fl.enterprise_number) AS "name",
                   fl.{metric} AS "metric_value",
                   fl.ebitda,
                   fl.revenue,
                   CASE WHEN fl.revenue > 0
                        THEN ROUND((fl.ebitda / fl.revenue * 100)::numeric, 1)
                   END AS "margin",
                   fl.fte_total,
                   fl.fiscal_year,
                   ci.nace_code,
                   COALESCE(nl.description, ci.nace_code) AS "sector",
                   ci.city
            FROM financial_latest fl
            JOIN company_info ci ON ci.enterprise_number = fl.enterprise_number
            LEFT JOIN denomination d ON d.entity_number = fl.enterprise_number
                 AND d.type_of_denomination = '001' AND d.language IN ('2','1')
            LEFT JOIN nace_lookup nl ON nl.nace_code = ci.nace_code
            WHERE fl.{metric} IS NOT NULL AND fl.{metric} > 0
            ORDER BY fl.{metric} DESC
            LIMIT %s
        """, (limit,))
        return rows
    except Exception as e:
        logger.exception("Top companies query failed")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recently-loaded")
async def get_recently_loaded(limit: int = 10):
    """Return recently loaded financials."""
    if limit < 1 or limit > 50:
        limit = 10

    try:
        rows = fetch_all("""
            SELECT fl.enterprise_number,
                   COALESCE(d.denomination, fl.enterprise_number) AS "name",
                   fl.revenue, fl.ebitda, fl.fiscal_year, n.loaded_at
            FROM financial_latest fl
            JOIN (
                SELECT enterprise_number, MAX(loaded_at) AS loaded_at
                FROM nbb_load_log
                WHERE deposit_key != 'NO_FILINGS'
                GROUP BY enterprise_number
            ) n ON n.enterprise_number = fl.enterprise_number
            LEFT JOIN denomination d ON d.entity_number = fl.enterprise_number
                 AND d.type_of_denomination = '001' AND d.language IN ('2','1')
            ORDER BY n.loaded_at DESC
            LIMIT %s
        """, (limit,))

        # Convert datetime objects to strings for JSON serialization
        for row in rows:
            if row.get("loaded_at"):
                row["loaded_at"] = str(row["loaded_at"])

        return rows
    except Exception as e:
        logger.exception("Recently loaded query failed")
        raise HTTPException(status_code=500, detail=str(e))
