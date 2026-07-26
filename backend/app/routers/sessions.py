from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel
from app.database import get_db
from app.models.models import Session

router = APIRouter(prefix="/sessions", tags=["sessions"])


class SessionCreate(BaseModel):
    user_id: str
    role: str
    interview_type: str


@router.post("")
def create_session(payload: SessionCreate, db: DBSession = Depends(get_db)):
    session = Session(
        user_id=payload.user_id,
        role=payload.role,
        interview_type=payload.interview_type,
        status="in_progress",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"id": session.id, "status": session.status}


@router.get("/{session_id}")
def get_session(session_id: int, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "id": session.id,
        "user_id": session.user_id,
        "role": session.role,
        "interview_type": session.interview_type,
        "status": session.status,
        "overall_score": session.overall_score,
        "created_at": session.created_at,
        "completed_at": session.completed_at,
    }


@router.get("")
def list_sessions(user_id: str, db: DBSession = Depends(get_db)):
    sessions = db.query(Session).filter(Session.user_id == user_id).order_by(Session.created_at.desc()).all()
    return [{"id": s.id, "role": s.role, "status": s.status, "overall_score": s.overall_score} for s in sessions]