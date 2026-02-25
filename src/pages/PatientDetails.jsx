// src/pages/PatientDetails.jsx

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import Card from "../components/shared/Card";

const PatientDetails = () => {
  const { id } = useParams();

  const [patient, setPatient] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    // 🔹 Fetch patient basic info
    fetch(`http://localhost:8000/api/patient/${id}`)
      .then((res) => res.json())
      .then((data) => setPatient(data));

    // 🔹 Fetch prediction
    fetch(`http://localhost:8000/api/patient/${id}/prediction`)
      .then((res) => res.json())
      .then((data) => setPrediction(data));

    // 🔹 Fetch live ESP32 data
    const interval = setInterval(() => {
      fetch(`http://localhost:8000/api/patient/${id}/live`)
        .then((res) => res.json())
        .then((data) => setLiveData(data));
    }, 3000); // refresh every 3 seconds

    return () => clearInterval(interval);
  }, [id]);

  if (!patient) return <div>Loading...</div>;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1">
        <Header />

        <div className="p-8 space-y-8">

          {/* ================= Patient Info ================= */}
          <Card title="Patient Information">
            <p><strong>Name:</strong> {patient.name}</p>
            <p><strong>Age:</strong> {patient.age}</p>
            <p><strong>Condition:</strong> {patient.condition}</p>
          </Card>

          {/* ================= Live Sensor Data ================= */}
          <Card title="Live Sensor Data (ESP32)">
            {liveData ? (
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-slate-500">Heart Rate</p>
                  <p className="text-2xl font-bold">{liveData.heartRate} bpm</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">SpO2</p>
                  <p className="text-2xl font-bold">{liveData.spo2}%</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Temperature</p>
                  <p className="text-2xl font-bold">{liveData.temperature}°C</p>
                </div>
              </div>
            ) : (
              "No live data"
            )}
          </Card>

          {/* ================= AI Prediction ================= */}
          <Card title="AI Model Prediction">
            {prediction ? (
              <div>
                <p className="text-lg font-semibold">
                  Risk Level: {prediction.riskLevel}
                </p>
                <p className="text-slate-500">
                  Confidence: {prediction.confidence}%
                </p>
              </div>
            ) : (
              "No prediction available"
            )}
          </Card>

        </div>
      </main>
    </div>
  );
};

export default PatientDetails;