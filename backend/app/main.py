from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import questions, sessions, answers, reports

app = FastAPI(title="Interview Prep Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router)
app.include_router(questions.router)
app.include_router(answers.router)
app.include_router(reports.router)


@app.get("/health")
def health():
    return {"status": "ok"}