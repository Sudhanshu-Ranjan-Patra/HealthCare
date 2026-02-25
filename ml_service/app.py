from fastapi import FastAPI
from pydantic import BaseModel
import joblib
from pathlib import Path


app = FastAPI()


class Features(BaseModel):
  heartRate: float
  temperature: float
  spo2: float
  ecgMean: float  # derived ECG feature from ESP32


model_path = Path(__file__).parent / "model.pkl"
model = joblib.load(model_path)


def classify_bp(systolic: float, diastolic: float) -> str:
  if systolic >= 140 or diastolic >= 90:
    return "High"
  if systolic < 90 or diastolic < 60:
    return "Low"
  return "Normal"


@app.post("/predict")
def predict(features: Features):
  # Model was trained on 4 features: HR, SpO2, Temperature, ECG_mean.
  # Map them in the same order using the ecgMean sent from ESP32.
  X = [[features.heartRate, features.spo2, features.temperature, features.ecgMean]]

  # Basic prediction from model (e.g. systolic/diastolic)
  raw_pred = model.predict(X)[0]

  # Convert to numeric values
  if hasattr(raw_pred, "tolist"):
    values = raw_pred.tolist()
  else:
    values = raw_pred

  if isinstance(values, (list, tuple)) and len(values) >= 2:
    systolic, diastolic = float(values[0]), float(values[1])
  else:
    systolic, diastolic = float(values), 0.0

  risk_label = classify_bp(systolic, diastolic)

  # Optional confidence if the model supports predict_proba
  confidence_value = 90.0
  predict_proba = getattr(model, "predict_proba", None)
  if callable(predict_proba):
    probs = predict_proba(X)[0]
    confidence_value = float(max(probs) * 100.0)

  return {
    "riskLevel": risk_label,
    "confidence": round(confidence_value, 2),
    "systolic": round(systolic, 2),
    "diastolic": round(diastolic, 2),
  }

