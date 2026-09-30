"""End-to-end smoke test against a running backend, as a real logged-in user.

Run from backend/ with the server running:
    .venv/bin/python scripts/smoke_test.py [base_url]

Uses a TEST account (its profile is set to kosher + tree nuts). Makes 3-5 AI
calls (well under a cent) and deletes everything it creates at the end.
"""
import getpass
import os
import sys
import uuid

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
    created_collection_ids: list[str] = []
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

        step("9. Manage collections")
        r = api.post("/collections/", json={"name": f"{COLLECTION} Empty"})
        check("empty collection created", r.status_code == 201, r.text)
        extra = r.json()
        created_collection_ids.append(extra["id"])
        r = api.get(f"/collections/{extra['id']}/recipes")
        check("empty collection loads with no recipes", r.status_code == 200 and r.json() == [], r.text)
        r = api.post("/collections/", json={"name": f"{COLLECTION} EMPTY"})
        check("duplicate name rejected (any capitalization)", r.status_code == 409, r.text)
        r = api.patch(f"/collections/{extra['id']}", json={"name": f"{COLLECTION} Moved"})
        check("collection renamed", r.status_code == 200 and r.json()["name"] == f"{COLLECTION} Moved", r.text)

        smoke_id = next(c["id"] for c in api.get("/collections/").json() if c["name"] == COLLECTION)
        r = api.put(f"/recipes/{original['id']}/collections", json={"collection_ids": [extra["id"]]})
        check("recipe moved to the other collection", r.status_code == 200 and [c["id"] for c in r.json()] == [extra["id"]], r.text)
        old_contents = api.get(f"/collections/{smoke_id}/recipes").json()
        check("recipe left the old collection", all(x["id"] != original["id"] for x in old_contents))
        r = api.delete(f"/collections/{extra['id']}/recipes/{original['id']}")
        check("recipe removed from collection", r.status_code == 204, r.text)
        check("collection is empty again", api.get(f"/collections/{extra['id']}/recipes").json() == [])
        r = api.put(f"/recipes/{original['id']}/collections", json={"collection_ids": [str(uuid.uuid4())]})
        check("can't move a recipe into someone else's collection", r.status_code == 404, r.text)

        api.put(f"/recipes/{original['id']}/collections", json={"collection_ids": [extra["id"]]})
        r = api.delete(f"/collections/{extra['id']}")
        check("collection deleted", r.status_code == 204, r.text)
        check("its recipe still exists", api.get(f"/recipes/{original['id']}").status_code == 200)

        step("10. Security: no access to anything that isn't yours")
        r = httpx.get(f"{BASE_URL}/recipes/", timeout=10)
        check("no-login request gets 401", r.status_code == 401, str(r.status_code))
        # A made-up ID goes through the same ownership check as another user's ID
        not_mine = str(uuid.uuid4())
        r = api.get(f"/collections/{not_mine}/recipes")
        check("someone else's collection returns nothing", r.status_code == 200 and r.json() == [], r.text)
        count_before = len(api.get("/recipes/").json())
        r = api.post("/recipes/", json={"title": "Should not save", "ingredients": [], "steps": [], "collection_ids": [not_mine]})
        check("saving into someone else's collection rejected", r.status_code == 404, r.text)
        r = api.post("/recipes/", json={"title": "Should not save", "ingredients": [], "steps": [], "parent_recipe_id": not_mine})
        check("claiming someone else's recipe as parent rejected", r.status_code == 404, r.text)
        check("rejected saves left nothing behind", len(api.get("/recipes/").json()) == count_before)
        r = api.get("/recipes/not-a-real-id")
        check("malformed ID gets 422, not a crash", r.status_code == 422, str(r.status_code))
    finally:
        step("11. Clean up")
        for collection_id in created_collection_ids:
            api.delete(f"/collections/{collection_id}")
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
