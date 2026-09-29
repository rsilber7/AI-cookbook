"""End-to-end smoke test against a running backend, as a real logged-in user.

Run from backend/ with the server running:
    .venv/bin/python scripts/smoke_test.py [base_url]

Uses a TEST account (its profile is set to kosher + tree nuts). Makes 2-4 AI
calls (well under a cent) and deletes everything it creates at the end.
"""
import getpass
import os
import sys

import httpx
from dotenv import load_dotenv
from supabase import create_client

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
COLLECTION = "Smoke Test"

failures = 0


def check(label: str, ok: bool, detail: str = "") -> None:
    global failures
    if not ok:
        failures += 1
    print(f"  {'✅' if ok else '❌'} {label}" + (f"  ({detail})" if detail and not ok else ""))


def step(title: str) -> None:
    print(f"\n{title}")


def main() -> None:
    load_dotenv(".env")
    email = input("Test user email: ")
    password = getpass.getpass("Test user password (hidden): ")

    step("1. Log in")
    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    session = supabase.auth.sign_in_with_password({"email": email, "password": password}).session
    check("got a login token", bool(session and session.access_token))

    api = httpx.Client(
        base_url=BASE_URL,
        headers={"Authorization": f"Bearer {session.access_token}"},
        timeout=120,
    )
    created_recipe_ids: list[str] = []
    collection_existed = any(c["name"] == COLLECTION for c in api.get("/collections/").json())

    try:

        step("2. Set profile to kosher + tree nuts")
        r = api.patch("/users/me", json={"dietary_system": "kosher", "allergies": ["tree nuts"]})
        check("profile updated", r.status_code == 200, r.text)

        step("3. Generate a recipe that tempts the rules (AI call)")
        r = api.post("/recipes/generate", json={"description": "chicken with a creamy almond sauce"})
        check("generate returned 200", r.status_code == 200, r.text)
        draft = r.json()["recipe"]
        print(f"     → {draft['title']} ({draft['kosher_category']})")
        print(f"     → ingredients: {', '.join(i['name'] for i in draft['ingredients'])}")
        check("dietary_system is kosher", draft["dietary_system"] == "kosher")
        check("classified meat/dairy/parve", draft["kosher_category"] in ("meat", "dairy", "parve"))
        check("tree nuts recorded as applied", "tree nuts" in draft["allergies_applied"])
        check("source is ai_generated", draft["source"] == "ai_generated")
        check("no safety warnings", r.json()["warnings"] == [], str(r.json()["warnings"]))

        step(f"4. Save it into a new collection '{COLLECTION}'")
        r = api.post("/recipes/", json={**draft, "collection_names": [COLLECTION]})
        check("save returned 201", r.status_code == 201, r.text)
        original = r.json()
        created_recipe_ids.append(original["id"])

        step("5. Read it back")
        r = api.get(f"/recipes/{original['id']}")
        check("recipe can be fetched", r.status_code == 200, r.text)
        collections = api.get("/collections/").json()
        check("collection was created", any(c["name"] == COLLECTION for c in collections))

        step("6. Adapt the saved recipe to also be gluten-free (AI call)")
        r = api.post(
            "/recipes/generate",
            json={"description": "make it gluten-free", "base_recipe_id": original["id"], "extra_allergies": ["gluten"]},
        )
        check("adapt returned 200", r.status_code == 200, r.text)
        copy_draft = r.json()["recipe"]
        print(f"     → {copy_draft['title']}")
        check("parent points to the original", copy_draft["parent_recipe_id"] == original["id"])
        check("gluten + tree nuts applied", {"gluten", "tree nuts"} <= set(copy_draft["allergies_applied"]))
        check("original's collection pre-selected", copy_draft["collection_names"] == [COLLECTION])

        step("7. Save the copy and confirm the original is untouched")
        r = api.post("/recipes/", json=copy_draft)
        check("copy saved", r.status_code == 201, r.text)
        created_recipe_ids.append(r.json()["id"])
        after = api.get(f"/recipes/{original['id']}").json()
        check("original unchanged", after["ingredients"] == original["ingredients"] and after["title"] == original["title"])
        check("copy is a separate recipe", r.json()["id"] != original["id"])

        step("8. Import a pasted recipe that breaks the rules (AI call)")
        pasted = (
            "Walnut Beef Stir-Fry\n"
            "1 lb beef strips, 1/2 cup walnuts, 2 tbsp butter, 1 onion, soy sauce\n"
            "Melt butter, brown the beef, add onion and walnuts, finish with soy sauce."
        )
        r = api.post("/recipes/import", json={"text": pasted})
        check("import returned 200", r.status_code == 200, r.text)
        imported = r.json()["recipe"]
        names = [i["name"].lower() for i in imported["ingredients"]]
        print(f"     → {imported['title']} ({imported['kosher_category']})")
        print(f"     → ingredients: {', '.join(names)}")
        check("walnuts removed", not any("walnut" in n for n in names))
        check("classified meat/dairy/parve", imported["kosher_category"] in ("meat", "dairy", "parve"))
        check("source is pasted", imported["source"] == "pasted")
        check("original text kept", imported["original_text"] == pasted)
        check("no safety warnings", r.json()["warnings"] == [], str(r.json()["warnings"]))

        r = api.post("/recipes/", json=imported)
        check("imported recipe saved", r.status_code == 201, r.text)
        created_recipe_ids.append(r.json()["id"])
        check("saved as pasted", r.json()["source"] == "pasted")

        r = api.post("/recipes/import", json={"text": ""})
        check("empty paste rejected", r.status_code == 422, str(r.status_code))

        
        step("8. Security: requests without a login are rejected")
        r = httpx.get(f"{BASE_URL}/recipes/", timeout=10)
        check("no-login request rejected", r.status_code in (401, 422), str(r.status_code))
    finally:
        step("9. Clean up")
        for recipe_id in created_recipe_ids:
            api.delete(f"/recipes/{recipe_id}")
        if not collection_existed:
            for c in api.get("/collections/").json():
                if c["name"] == COLLECTION:
                    api.delete(f"/collections/{c['id']}")
        check("test data deleted", all(api.get(f"/recipes/{i}").status_code == 404 for i in created_recipe_ids))



    print(f"\n{'All checks passed 🎉' if failures == 0 else f'{failures} check(s) failed'}")
    sys.exit(1 if failures else 0)




if __name__ == "__main__":
    main()
