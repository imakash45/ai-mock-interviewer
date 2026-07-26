import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from app.database import get_db
from app.models.models import Session, Question, Answer, Report
from app.services.groq_client import call_groq

router = APIRouter(prefix="/sessions", tags=["reports"])

SYSTEM_PROMPT = """You are an expert interview coach producing a final performance report.
You are given the full transcript of questions and answers with their scores.
Calculate overall_score as the average of all individual answer scores across the whole transcript,
rounded to the nearest whole number. Only use 0 if every single answer scored 0 with no exceptions.
If even one answer scored above 0, overall_score must reflect that — do not floor to 0.
Respond ONLY in this JSON format:
{"overall_score": 0-5,
 "strengths": "2-3 sentence summary",
 "weaknesses": "2-3 sentence summary",
 "improved_answers": [{"question": "...", "original_answer": "...", "better_answer": "..."}]}
Pick the 2-3 weakest-scoring answers for improved_answers."""


def build_transcript(session_id: int, db: DBSession):
    questions = db.query(Question).filter(Question.session_id == session_id).order_by(Question.question_number).all()
    transcript = []
    for q in questions:
        answers = db.query(Answer).filter(Answer.question_id == q.id).all()
        for a in answers:
            transcript.append({
                "number": q.question_number,
                "question": q.question_text,
                "category": q.category,
                "answer": a.answer_text,
                "scores": a.scores,
                "feedback": a.feedback,
                "is_follow_up": a.is_follow_up,
            })
    return transcript


@router.post("/{session_id}/report")
def generate_report(session_id: int, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    existing = db.query(Report).filter(Report.session_id == session_id).first()
    if existing:
        return {
            "session_id": session_id,
            "overall_score": session.overall_score,
            "strengths": existing.strengths,
            "weaknesses": existing.weaknesses,
            "improved_answers": existing.improved_answers,
            "transcript": build_transcript(session_id, db),
        }

    transcript = build_transcript(session_id, db)

    if not transcript:
        raise HTTPException(status_code=400, detail="No answers recorded for this session")

    raw = call_groq(SYSTEM_PROMPT, json.dumps({"role": session.role, "transcript": transcript}))
    parsed = json.loads(raw)

    report = Report(
        session_id=session_id,
        strengths=parsed["strengths"],
        weaknesses=parsed["weaknesses"],
        improved_answers=parsed["improved_answers"],
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    session.overall_score = parsed["overall_score"]
    session.status = "completed"
    db.commit()

    return {
        "session_id": session_id,
        "overall_score": parsed["overall_score"],
        "strengths": report.strengths,
        "weaknesses": report.weaknesses,
        "improved_answers": report.improved_answers,
        "transcript": transcript,
    }


@router.get("/{session_id}/report")
def get_report(session_id: int, db: DBSession = Depends(get_db)):
    report = db.query(Report).filter(Report.session_id == session_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found for this session")
    return {
        "overall_score": report.session.overall_score,
        "strengths": report.strengths,
        "weaknesses": report.weaknesses,
        "improved_answers": report.improved_answers,
    }