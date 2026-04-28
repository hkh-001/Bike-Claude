"""``/api/dashboard/*`` 端点 happy-path 测试."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_summary_returns_full_payload() -> None:
    resp = client.get("/api/dashboard/summary")
    assert resp.status_code == 200
    body = resp.json()
    for key in ("kpi", "region_ranking", "risk_stations", "recent_alerts", "etl_health"):
        assert key in body, f"summary missing key: {key}"

    kpi = body["kpi"]
    for key in (
        "total_stations",
        "active_stations",
        "total_bikes_available",
        "avg_occupancy_rate",
        "alerts",
    ):
        assert key in kpi
    for level in ("info", "warning", "critical"):
        assert level in kpi["alerts"]


def test_kpi_endpoint() -> None:
    resp = client.get("/api/dashboard/kpi")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_stations"] >= 1
    assert 0.0 <= body["avg_occupancy_rate"] <= 1.0


def test_risks_endpoint() -> None:
    resp = client.get("/api/dashboard/risks")
    assert resp.status_code == 200
    body = resp.json()
    assert "empty_risks" in body and "full_risks" in body
    assert isinstance(body["empty_risks"], list)
    assert isinstance(body["full_risks"], list)
