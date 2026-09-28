from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import users, recipes, collections, generate

app = FastAPI(title="AI Recipe API")

app.include_router(users.router)
# Before recipes, so /recipes/generate isn't read as a recipe ID
app.include_router(generate.router)
app.include_router(recipes.router)
app.include_router(collections.router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}
