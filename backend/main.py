from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import joblib
import numpy as np
from pymongo import MongoClient

# ========================
# MONGODB CONNECTION
# ========================
MONGO_URI = "mongodb+srv://tapaswinidashdev_db_user:qES9xWzqUNhOe4re@cluster0.k5msefv.mongodb.net/?appName=Cluster0"

try:
    client = MongoClient(MONGO_URI)
    db = client["healthcare_db"]
    patients_collection = db["patients"]
    sensor_data_collection = db["sensor_data"]
    # Test connection
    client.admin.command('ping')
    print("✅ MongoDB connected successfully!")
except Exception as e:
    print(f"❌ MongoDB connection error: {e}")
    client = None
    db = None
    patients_collection = None
    sensor_data_collection = None

# ========================
# LOAD ML MODEL
# ========================
model = joblib.load("xgboost_bp_model.pkl")

app = FastAPI(title="Healthcare IoT Monitor")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Models
class SensorData(BaseModel):
    patient_id: str
    heart_rate: int
    spo2: int
    temperature: float
    ecg_mean: float

class Patient(BaseModel):
    patient_id: str
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    condition: Optional[str] = None

def determine_severity(bp_systolic, bp_diastolic):
    if bp_systolic < 120 and bp_diastolic < 80:
        return "low", "Normal"
    elif bp_systolic < 130:
        return "medium", "Elevated"
    elif bp_systolic < 140:
        return "high", "High BP Stage 1"
    else:
        return "critical", "High BP Stage 2"

# WebSocket
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"status": "connected"})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ========================
# PATIENT ENDPOINTS
# ========================

# Add a patient
@app.post("/api/patients")
async def add_patient(patient: Patient):
    if patients_collection is not None:
        patients_collection.insert_one(patient.dict())
    return {"message": "Patient added"}

# Get all patients
@app.get("/api/patients")
async def get_all_patients():
    if patients_collection is not None:
        patients = list(patients_collection.find({}, {"_id": 0}))
        return patients
    return []

# Get single patient with latest sensor data
@app.get("/api/patients/{patient_id}")
async def get_patient(patient_id: str):
    if patients_collection is not None:
        patient = patients_collection.find_one({"patient_id": patient_id}, {"_id": 0})
        if patient:
            # Get latest sensor data
            if sensor_data_collection is not None:
                latest_data = sensor_data_collection.find_one(
                    {"patient_id": patient_id},
                    {"_id": 0}
                )
                patient["latest_sensor_data"] = latest_data
            return patient
    raise HTTPException(status_code=404, detail="Patient not found")

# ========================
# SENSOR DATA ENDPOINT
# ========================

@app.post("/api/sensor-data")
async def receive_sensor_data(data: SensorData):
    # ML Prediction
    input_features = np.array([[data.heart_rate, data.spo2, data.temperature, data.ecg_mean]])
    prediction = model.predict(input_features)[0]
    bp_systolic = round(prediction[0])
    bp_diastolic = round(prediction[1])
    severity, risk_level = determine_severity(bp_systolic, bp_diastolic)

    # Create sensor record
    sensor_record = {
        "patient_id": data.patient_id,
        "heart_rate": data.heart_rate,
        "spo2": data.spo2,
        "temperature": data.temperature,
        "ecg_mean": data.ecg_mean,
        "predicted_bp_systolic": bp_systolic,
        "predicted_bp_diastolic": bp_diastolic,
        "severity": severity,
        "risk_level": risk_level,
        "confidence": round(85 + np.random.rand() * 10, 1),
        "timestamp": datetime.now().isoformat()
    }

    # Save to MongoDB
    if sensor_data_collection is not None:
        sensor_data_collection.insert_one(sensor_record)
        # Update patient's latest data
        if patients_collection is not None:
            patients_collection.update_one(
                {"patient_id": data.patient_id},
                {"$set": {"latest_sensor_data": sensor_record}}
            )

    # Broadcast to frontend
    await manager.broadcast({
        "type": "sensor-data",
        "data": sensor_record
    })

    # Send alert if critical
    if severity in ["high", "critical"]:
        await manager.broadcast({
            "type": "alert",
            "patient_id": data.patient_id,
            "severity": severity,
            "message": f"High BP detected: {bp_systolic}/{bp_diastolic}",
            "timestamp": datetime.now().isoformat()
        })

    return {
        "message": "Data processed",
        "predicted_bp": f"{bp_systolic}/{bp_diastolic}",
        "severity": severity,
        "confidence": sensor_record["confidence"]
    }

@app.get("/")
def home():
    return {"message": "Healthcare IoT Server running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)