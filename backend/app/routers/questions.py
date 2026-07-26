import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from app.database import get_db
from app.models.models import Session, Question
from app.services.groq_client import call_groq

router = APIRouter(prefix="/sessions", tags=["questions"])

SYSTEM_PROMPT = """You are an expert technical and behavioral interviewer.
Generate exactly one interview question for the given role and interview type.
Respond ONLY in this JSON format: {"question": "...", "category": "..."}
For Technical: category is the specific skill area being tested.
For Behavioral: category is the competency being tested (e.g. leadership, conflict resolution).
Do not repeat any question listed as already asked."""


@router.post("/{session_id}/questions/next")
def generate_next_question(session_id: int, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    asked = db.query(Question).filter(Question.session_id == session_id).all()
    asked_texts = [q.question_text for q in asked]

    user_prompt = json.dumps({
        "role": session.role,
        "interview_type": session.interview_type,
        "already_asked": asked_texts,
    })

    raw = call_groq(SYSTEM_PROMPT, user_prompt)
    parsed = json.loads(raw)

    question = Question(
        session_id=session_id,
        question_text=parsed["question"],
        category=parsed["category"],
        question_number=len(asked) + 1,
    )
    db.add(question)
    db.commit()
    db.refresh(question)

    return {"id": question.id, "question": question.question_text, "category": question.category}