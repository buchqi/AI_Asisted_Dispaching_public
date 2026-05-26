import os
import time

import requests


BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000")
TOKEN = os.getenv("TOKEN", "")
COMPANY_ID = int(os.getenv("COMPANY_ID", "2"))
TRUCK_ID = int(os.getenv("TRUCK_ID", "1"))


headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}


def check(condition, message):
    if not condition:
        raise AssertionError(f"FAILED: {message}")

    print(f"PASS: {message}")


def request(method, path, **kwargs):
    url = f"{BASE_URL}{path}"
    response = requests.request(method, url, headers=headers, **kwargs)

    print(f"\n{method} {path}")
    print("Status:", response.status_code)

    try:
        print("Response:", response.json())
    except Exception:
        print("Response text:", response.text)

    response.raise_for_status()
    return response.json()


def main():
    check(TOKEN, "TOKEN environment variable is set")

    prefs = request(
        "GET",
        f"/companies/{COMPANY_ID}/scoring-preferences/me",
    )
    check(
        prefs["company_id"] == COMPANY_ID,
        "Phase 14 default scoring preferences returned",
    )

    updated_prefs = request(
        "PATCH",
        f"/companies/{COMPANY_ID}/scoring-preferences/me",
        json={
            "min_rate": 2000,
            "min_rate_per_mile": 2.0,
            "preferred_origin_states": ["GA"],
            "preferred_destination_states": ["TX", "FL"],
            "preferred_brokers": ["TQL"],
            "avoided_brokers": ["Bad Broker LLC"],
            "max_miles": 1000,
            "rate_weight": 1.5,
            "rpm_weight": 2.0,
            "mileage_weight": 0.8,
            "origin_weight": 0.5,
            "destination_weight": 1.0,
            "broker_weight": 1.0,
            "driver_preference_weight": 0.5,
        },
    )
    check(updated_prefs["min_rate"] == 2000, "Phase 14 scoring preferences updated")

    search_batch = request(
        "POST",
        "/searches/start",
        json={
            "company_id": COMPANY_ID,
            "truck_ids": [TRUCK_ID],
            "filters": {
                "origin_state": "GA",
                "equipment_type": "REEFER",
            },
            "timeout_seconds": 120,
        },
    )
    search_batch_id = search_batch["id"]
    print("Search batch id:", search_batch_id)

    time.sleep(2)

    truck_sessions = request(
        "GET",
        f"/searches/{search_batch_id}/truck-sessions",
    )
    check(len(truck_sessions) > 0, "TruckSearchSession created")

    truck_search_session_id = truck_sessions[0]["id"]
    print("Truck search session id:", truck_search_session_id)

    loads = request(
        "GET",
        f"/truck-search-sessions/{truck_search_session_id}/loads",
    )
    check(len(loads) > 0, "Loads returned for truck search session")

    booked_loads_before = request(
        "GET",
        f"/companies/{COMPANY_ID}/booked-loads",
    )
    active_booked_load_ids = {
        booking["load_id"]
        for booking in booked_loads_before
        if booking["status"] in ["booked", "picked_up"]
    }
    selected_load = next(
        (
            load
            for load in loads
            if load["load_id"] not in active_booked_load_ids
        ),
        loads[0],
    )

    load_id = selected_load["load_id"]
    load_snapshot_id = selected_load["id"]
    posted_rate = selected_load.get("posted_rate")

    print("Load id:", load_id)
    print("Load snapshot id:", load_snapshot_id)

    score = request(
        "GET",
        f"/load-snapshots/{load_snapshot_id}/score",
    )
    check(
        score["load_snapshot_id"] == load_snapshot_id,
        "Phase 14 score belongs to selected snapshot",
    )
    check(score["score"] is not None, "Phase 14 numeric score returned")
    check(score["breakdown"] is not None, "Phase 14 score breakdown returned")

    ranked_scores = request(
        "GET",
        f"/truck-search-sessions/{truck_search_session_id}/score",
    )
    check(len(ranked_scores) > 0, "Phase 14 ranked scores returned")
    check(
        ranked_scores
        == sorted(ranked_scores, key=lambda item: item["score"], reverse=True),
        "Phase 14 ranked scores are sorted descending",
    )

    booking_payload = {
        "truck_id": TRUCK_ID,
        "load_snapshot_id": load_snapshot_id,
        "final_rate": posted_rate,
        "notes": "Phase 13 smoke test booking.",
    }

    if load_id in active_booked_load_ids:
        duplicate_response = requests.post(
            f"{BASE_URL}/loads/{load_id}/book",
            headers=headers,
            json=booking_payload,
        )

        print(f"\nPOST /loads/{load_id}/book")
        print("Status:", duplicate_response.status_code)
        try:
            print("Response:", duplicate_response.json())
        except Exception:
            print("Response text:", duplicate_response.text)

        check(
            duplicate_response.status_code == 400,
            "Phase 13 duplicate active booking is rejected",
        )
        print("\nPhase 13 booking and Phase 14 scoring smoke test passed.")
        return

    booking = request(
        "POST",
        f"/loads/{load_id}/book",
        json=booking_payload,
    )
    booked_load_id = booking["id"]

    check(booking["status"] == "booked", "Phase 13 load booked")
    check(booking["load_id"] == load_id, "Phase 13 booking references selected load")
    check(
        booking["load_snapshot_id"] == load_snapshot_id,
        "Phase 13 booking references selected snapshot",
    )
    check(booking["truck_id"] == TRUCK_ID, "Phase 13 booking stores selected truck")

    booked_loads_after = request(
        "GET",
        f"/companies/{COMPANY_ID}/booked-loads",
    )
    check(
        any(item["id"] == booked_load_id for item in booked_loads_after),
        "Phase 13 booking appears in company booking history",
    )

    booking_details = request(
        "GET",
        f"/booked-loads/{booked_load_id}",
    )
    check(booking_details["id"] == booked_load_id, "Phase 13 booking details returned")

    duplicate_response = requests.post(
        f"{BASE_URL}/loads/{load_id}/book",
        headers=headers,
        json=booking_payload,
    )

    print(f"\nPOST /loads/{load_id}/book")
    print("Status:", duplicate_response.status_code)
    try:
        print("Response:", duplicate_response.json())
    except Exception:
        print("Response text:", duplicate_response.text)

    check(
        duplicate_response.status_code == 400,
        "Phase 13 duplicate active booking is rejected",
    )

    picked_up = request(
        "PATCH",
        f"/booked-loads/{booked_load_id}",
        json={
            "status": "picked_up",
            "notes": "Phase 13 smoke test picked up.",
        },
    )
    check(picked_up["status"] == "picked_up", "Phase 13 booking status updated")

    delivered = request(
        "PATCH",
        f"/booked-loads/{booked_load_id}",
        json={
            "status": "delivered",
            "notes": "Phase 13 smoke test delivered.",
        },
    )
    check(
        delivered["status"] == "delivered",
        "Phase 13 booking can be marked delivered",
    )

    print("\nPhase 13 booking and Phase 14 scoring smoke test passed.")


if __name__ == "__main__":
    main()
