"""Reset the shared DEMO account and fill it with sample recipes.

Run from backend/ with the server running:
    .venv/bin/python scripts/seed_demo.py [base_url]

DELETES every recipe and collection in the account you log in as, so only ever
use it on the demo account. Makes no AI calls (free). Re-run it whenever demo
visitors have made a mess.
"""
import getpass
import json
import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv
from supabase import create_client

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
RECIPES_FILE = Path(__file__).with_name("demo_recipes.json")
DEMO_PROFILE = {"dietary_system": "kosher", "allergies": ["tree nuts"]}


def main() -> None:
    load_dotenv(".env")
    email = input("DEMO account email: ")
    password = getpass.getpass("DEMO account password (hidden): ")
    if input(f'This deletes ALL recipes and collections in {email}. Type "reset" to continue: ') != "reset":
        sys.exit("Cancelled.")

    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    session = supabase.auth.sign_in_with_password({"email": email, "password": password}).session
    api = httpx.Client(base_url=BASE_URL, headers={"Authorization": f"Bearer {session.access_token}"}, timeout=30)

    def call(method: str, path: str, **kwargs):
        response = api.request(method, path, **kwargs)
        response.raise_for_status()
        return response.json() if response.content else None

    for recipe in call("GET", "/recipes/"):
        call("DELETE", f"/recipes/{recipe['id']}")
    for collection in call("GET", "/collections/"):
        call("DELETE", f"/collections/{collection['id']}")
    print("Cleared the account.")

    call("PATCH", "/users/me", json=DEMO_PROFILE)
    for entry in json.loads(RECIPES_FILE.read_text()):
        saved = call("POST", "/recipes/", json={**entry["recipe"], "collection_names": entry["collections"]})
        if entry["pinned"]:
            call("PATCH", f"/recipes/{saved['id']}", json={"is_pinned": True})
        print(f"  + {saved['title']}")
    print("Demo account is ready.")


if __name__ == "__main__":
    main()
