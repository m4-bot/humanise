from pathlib import Path
from typing import Literal
import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "dengue_sample.csv"
MODEL_PATH = BASE_DIR / "backend" / "models" / "random_forest.joblib"

app = FastAPI(title="Dengue Risk Spotter API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PatientInput(BaseModel):
    district: str
    area_type: str
    age: int
    fever_days: int
    temperature_c: float
    platelet_count: int
    wbc_count: int
    rainfall_mm: float
    lat: float
    lng: float


def error_response(message: str, status_code: int = 400) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"status": "error", "message": message},
    )


def load_model():
    if not MODEL_PATH.exists():
        return None
    return joblib.load(MODEL_PATH)


@app.get("/")
def health_check():
    return {"status": "ok"}


@app.post("/predict")
def predict_risk(payload: dict):
    try:
        data = PatientInput(**payload)
    except ValidationError as exc:
        first_err = exc.errors()[0]
        field = ".".join(str(x) for x in first_err.get("loc", [])) or "input"
        return error_response(f"{field}: {first_err.get('msg', 'invalid value')}")

    model = load_model()
    if model is None:
        return error_response("Model not trained yet. Run python backend/train.py first.", 500)

    row = pd.DataFrame([data.model_dump()])
    prob = float(model.predict_proba(row)[0][1])
    high_risk: Literal[0, 1] = 1 if prob >= 0.5 else 0
    risk_label: Literal["High", "Low"] = "High" if high_risk == 1 else "Low"

    return {
        "status": "ok",
        "model_name": "random_forest",
        "high_risk": high_risk,
        "risk_probability": round(prob, 2),
        "risk_label": risk_label,
    }


@app.get("/cases")
def get_cases():
    if not DATA_PATH.exists():
        return error_response("Sample dataset not found.", 404)

    df = pd.read_csv(DATA_PATH)
    cases = []
    for idx, r in df.iterrows():
        cases.append(
            {
                "id": int(idx + 1),
                "district": str(r["district"]),
                "lat": float(r["lat"]),
                "lng": float(r["lng"]),
                "high_risk": int(r["high_risk"]),
            }
        )
    return {"status": "ok", "cases": cases}