from app.database import Base, engine
from app.models.models import Session, Question, Answer, Report

Base.metadata.create_all(bind=engine)
print("Tables created.")