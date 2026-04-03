from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import get_db, engine, Base
import models
from predictor import GNSSPredictor
import pandas as pd
import io
import os

Base.metadata.create_all(bind=engine)

app = FastAPI(title="GNSS Cybersecurity API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],  # Adjust this for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_path = os.path.join(os.path.dirname(__file__), "..", "gnss_spoof_detector.pkl")
config_path = os.path.join(os.path.dirname(__file__), "..", "feature_config.json")
predictor = GNSSPredictor(model_path, config_path)

@app.post("/api/login")
def login(username: str = Form(...), password: str = Form(...)):

    if username == "admin" and password == "password":
        return {"status": "success", "token": "mock_token_123", "user": {"id": 1, "username": "admin"}}
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/upload")
async def upload_data(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
        
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        

        predictions = predictor.predict(df)
        
    
        auth_count = int(sum(predictions == 0))
        spoof_count = int(sum(predictions == 1))
        
        trust_score = (auth_count / len(predictions)) * 100 if len(predictions) > 0 else 0
        
    
        log = models.PredictionLog(
            filename=file.filename,
            auth_count=auth_count,
            spoofed_count=spoof_count,
            trust_score=trust_score
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        
    
        manipulated_rows = df[predictions == 1].head(5)
        explanations = []
        for i, row in manipulated_rows.iterrows():
            explanations.append({
                "index": i,
                "reasons": predictor.get_explainability(row.to_dict()),
                "data": row.to_dict()
            })
            
        return {
            "status": "success",
            "message": "File processed successfully",
            "results": {
                "total_rows": len(predictions),
                "authentic": auth_count,
                "manipulated": spoof_count,
                "trust_score": round(trust_score, 2),
                "log_id": log.id
            },
            "explanations": explanations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
def get_history(db: Session = Depends(get_db)):
    logs = db.query(models.PredictionLog).order_by(models.PredictionLog.timestamp.desc()).all()
    return logs
