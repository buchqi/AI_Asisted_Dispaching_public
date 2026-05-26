import os

import requests


BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000")
TOKEN = os.getenv("TOKEN", "")
COMPANY_ID = os.getenv("COMPANY_ID")
TRUCK_SEARCH_SESSION_ID = os.getenv("TRUCK_SEARCH_SESSION_ID")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}


def pass_check(message):
    print(f"✅ {message}")


def fail_check(message):
    print(f"❌ {message}")
    raise AssertionError(message)


def check(condition, message):
    if condition:
        pass_check(message)
        return

    fail_check(message)


def require_env(name, value):
    check(bool(value), f"{name} environment variable is set")


def request(method, path, **kwargs):
    url = f"{BASE_URL}{path}"
    response = requests.request(method, url, headers=headers, **kwargs)

    print(f"\n{method} {path}")
    print("Status:", response.status_code)

    try:
        body = response.json()
        print("Response:", body)
    except Exception:
        body = response.text
        print("Response text:", body)

    if response.status_code >= 400:
        fail_check(f"Backend returned HTTP {response.status_code}")

    return body


def fetch_ranked_scores():
    return request(
        "GET",
        f"/truck-search-sessions/{TRUCK_SEARCH_SESSION_ID}/score",
    )


def generate_ai_explanations(limit=1):
    return request(
        "POST",
        (
            f"/truck-search-sessions/{TRUCK_SEARCH_SESSION_ID}"
            f"/ai-explanations?limit={limit}"
        ),
    )


def fetch_stored_ai_explanations():
    return request(
        "GET",
        f"/truck-search-sessions/{TRUCK_SEARCH_SESSION_ID}/ai-explanations",
    )


def assert_results_are_ranked(results):
    scores = [item["score"] for item in results]
    check(
        scores == sorted(scores, reverse=True),
        "GET /score results are sorted descending",
    )


def assert_company_matches(results):
    expected_company_id = int(COMPANY_ID)
    check(
        all(item["company_id"] == expected_company_id for item in results),
        "GET /score results belong to COMPANY_ID",
    )


def assert_score_has_no_ai_fields(results):
    forbidden_fields = {"ai_explanation", "explanation_text"}
    leaked_fields = [
        field
        for item in results
        for field in forbidden_fields
        if field in item
    ]
    check(
        not leaked_fields,
        f"GET /score response has no AI fields: {leaked_fields}",
    )


def score_by_snapshot_id(scores):
    return {
        score["load_snapshot_id"]: score["score"]
        for score in scores
    }


def print_explanations(explanations, scores_by_snapshot_id):
    print("\nAI explanation results:")

    for explanation in explanations:
        print(
            "load_snapshot_id={load_snapshot_id} | "
            "score={score} | "
            "explanation_text={explanation_text}".format(
                load_snapshot_id=explanation["load_snapshot_id"],
                score=scores_by_snapshot_id.get(explanation["load_snapshot_id"]),
                explanation_text=explanation.get("explanation_text"),
            )
        )


def explanation_ids(explanations):
    return {
        explanation["load_snapshot_id"]: explanation["id"]
        for explanation in explanations
    }


def main():
    require_env("TOKEN", TOKEN)
    require_env("COMPANY_ID", COMPANY_ID)
    require_env("TRUCK_SEARCH_SESSION_ID", TRUCK_SEARCH_SESSION_ID)

    print("\nPhase 15 AI explanations smoke test")
    print("BASE_URL:", BASE_URL)
    print("COMPANY_ID:", COMPANY_ID)
    print("TRUCK_SEARCH_SESSION_ID:", TRUCK_SEARCH_SESSION_ID)

    first_scores = fetch_ranked_scores()
    check(len(first_scores) > 0, "Scored load results exist")
    assert_results_are_ranked(first_scores)
    assert_company_matches(first_scores)
    assert_score_has_no_ai_fields(first_scores)
    scores_by_snapshot_id = score_by_snapshot_id(first_scores)

    if not GEMINI_API_KEY:
        pass_check(
            "GEMINI_API_KEY is missing locally; verifying /score still works "
            "without AI"
        )

    before_explanations = fetch_stored_ai_explanations()
    before_ids = explanation_ids(before_explanations)

    first_generated = generate_ai_explanations(limit=1)
    check(
        len(first_generated) <= 1,
        "POST /ai-explanations?limit=1 returns at most one explanation",
    )
    print_explanations(first_generated, scores_by_snapshot_id)

    if GEMINI_API_KEY:
        check(
            len(first_generated) == 1,
            "POST /ai-explanations?limit=1 generated or reused the top explanation",
        )
        check(
            bool(first_generated[0].get("explanation_text")),
            "Generated/reused explanation has explanation_text",
        )
    else:
        pass_check(
            "If backend Gemini is also missing/invalid, POST may return no "
            "explanations and should still not crash"
        )

    second_generated = generate_ai_explanations(limit=1)
    check(
        explanation_ids(first_generated) == explanation_ids(second_generated),
        "Second POST reuses existing explanations without duplicates",
    )

    stored_explanations = fetch_stored_ai_explanations()
    print_explanations(stored_explanations, scores_by_snapshot_id)
    stored_ids = explanation_ids(stored_explanations)

    for snapshot_id, explanation_id in before_ids.items():
        check(
            stored_ids.get(snapshot_id) == explanation_id,
            f"Existing explanation reused for load_snapshot_id={snapshot_id}",
        )

    final_scores = fetch_ranked_scores()
    assert_results_are_ranked(final_scores)
    assert_score_has_no_ai_fields(final_scores)

    print("\n✅ Phase 15 separated scoring/AI explanation workflow passed.")


if __name__ == "__main__":
    main()
