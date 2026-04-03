from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from database import Base

class PredictionLog(Base):
    __tablename__ = "prediction_logs"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    auth_count = Column(Integer, default=0)
    spoofed_count = Column(Integer, default=0)
    trust_score = Column(Float, default=100.0)
    user_id = Column(String, default="admin")
