import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel
from app.database import get_db
from app.models.models import Question, Answer
from app.services.groq_client import call_groq

router = APIRouter(prefix="/questions", tags=["answers"])

SYSTEM_PROMPT = """You are an expert interview coach scoring a candidate's spoken answer.
For Technical questions, score: clarity, relevance, technical_accuracy (each 0-5).
For Behavioral questions, score: clarity, relevance, star_structure (each 0-5).
Score 0 across all categories if the answer contains no real attempt to address the question
(e.g. "I don't know", "next question please", silence, or off-topic filler). Only use 1 or above
if the candidate made a genuine attempt, however weak.
Also decide if the answer was vague or incomplete enough to warrant one follow-up question.
Respond ONLY in this JSON format:
{"scores": {"clarity": 1-5, "relevance": 1-5, "technical_accuracy_or_star_structure": 1-5},
 "feedback": "one or two sentence explanation",
 "follow_up_needed": true/false,
 "follow_up_question": "..." or null}
Only set follow_up_needed true if this answer has not already received one follow-up."""


class AnswerSubmit(BaseModel):
    answer_text: str
    is_follow_up: bool = False


@router.post("/{question_id}/answers")
def submit_answer(question_id: int, payload: AnswerSubmit, db: DBSession = Depends(get_db)):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    existing_follow_up = db.query(Answer).filter(
        Answer.question_id == question_id, Answer.is_follow_up == True
    ).first()

    user_prompt = json.dumps({
        "question": question.question_text,
        "category": question.category,
        "answer": payload.answer_text,
        "already_has_follow_up": existing_follow_up is not None,
    })

    raw = call_groq(SYSTEM_PROMPT, user_prompt)
    parsed = json.loads(raw)

    follow_up_needed = parsed["follow_up_needed"] and existing_follow_up is None

    answer = Answer(
        question_id=question_id,
        answer_text=payload.answer_text,
        scores=parsed["scores"],
        feedback=parsed["feedback"],
        is_follow_up=payload.is_follow_up,
    )
    db.add(answer)
    db.commit()
    db.refresh(answer)

    return {
        "id": answer.id,
        "scores": answer.scores,
        "feedback": answer.feedback,
        "follow_up_needed": follow_up_needed,
        "follow_up_question": parsed["follow_up_question"] if follow_up_needed else None,
    }