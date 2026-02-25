import { useParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { HeartPulse, Thermometer, Waves, Gauge } from "lucide-react";

import AppShell from "../components/layout/AppShell";
import Card from "../components/shared/Card";
import Badge from "../components/shared/Badge";
import Button from "../components/shared/Button";
import LoadingState from "../components/states/LoadingState";
import ErrorState from "../components/states/ErrorState";

import {
  formatDateTime,
  getBpTone,
  getToneLabel,
  getVitalTone,
} from "../utils/helpers";

const API_BASE = "http://localhost:8000/api";

const MetricCard = ({ label, value, unit, icon, tone = "neutral" }) => {
  const toneClasses = {
    success: "bg-emerald-50 border-emerald-100",
    warning: "bg-amber-50 border-amber-100",
    danger: "bg-red-50 border-red-100",
    neutral: "bg-slate-50 border-slate-200",
  };

  return (
    <div className={`rounded-xl border p-4 ${toneClasses[tone]}`}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <span className="text-slate-500">{icon}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">
        {value} <span className="text-base font-medium text-slate-500">{unit}</span>
      </p>
      <div className="mt-2">
        <Badge tone={tone}>{getToneLabel(tone)}</Badge>
      </div>
    </div>
  );
};

const PatientDetails = () => {
  const { id } = useParams();

  const [patient, setPatient] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPatient = useCallback(async () => {
    const res = await fetch(`${API_BASE}/patient/${id}`);
    if (!res.ok) {
      throw new Error("Patient details could not be loaded.");
    }
    return res.json();
  }, [id]);

  const fetchLiveData = useCallback(async () => {
    const res = await fetch(`${API_BASE}/patient/${id}/live`);
    if (!res.ok) {
      throw new Error("Live data endpoint is unavailable.");
    }
    return res.json();
  }, [id]);

  const fetchPrediction = useCallback(async () => {
    const res = await fetch(`${API_BASE}/patient/${id}/prediction`);
    if (!res.ok) {
      throw new Error("Prediction service is unavailable.");
    }
    return res.json();
  }, [id]);

  const loadPageData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [patientResult, liveResult, predictionResult] =
        await Promise.allSettled([
        fetchPatient(),
        fetchLiveData(),
        fetchPrediction(),
      ]);

      if (patientResult.status === "fulfilled") {
        setPatient(patientResult.value);
      } else {
        setPatient({
          patientId: id,
          name: `Patient ${id}`,
          age: null,
          condition: "Not available",
          lastActiveAt: null,
        });
      }

      if (liveResult.status === "fulfilled") {
        setLiveData(liveResult.value);
      }

      if (predictionResult.status === "fulfilled") {
        setPrediction(predictionResult.value);
      }

      const hasAnyData =
        patientResult.status === "fulfilled" ||
        liveResult.status === "fulfilled" ||
        predictionResult.status === "fulfilled";

      if (!hasAnyData) {
        throw new Error("Patient details could not be loaded.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load patient data.");
    } finally {
      setLoading(false);
    }
  }, [fetchLiveData, fetchPatient, fetchPrediction, id]);

  useEffect(() => {
    let active = true;

    const refreshRealtimeData = async () => {
      const [liveResult, predictionResult] = await Promise.allSettled([
        fetchLiveData(),
        fetchPrediction(),
      ]);

      if (!active) return;

      if (liveResult.status === "fulfilled") {
        setLiveData(liveResult.value);
      }

      if (predictionResult.status === "fulfilled") {
        setPrediction(predictionResult.value);
      }
    };

    loadPageData();
    const intervalId = setInterval(refreshRealtimeData, 5000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [fetchLiveData, fetchPrediction, loadPageData]);

  if (loading) {
    return (
      <AppShell>
        <LoadingState label="Loading patient profile..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <ErrorState title="Unable to open patient profile" message={error} onRetry={loadPageData} />
      </AppShell>
    );
  }

  const heartRateTone = getVitalTone("heartRate", liveData?.heartRate);
  const spo2Tone = getVitalTone("spo2", liveData?.spo2);
  const temperatureTone = getVitalTone("temperature", liveData?.temperature);
  const bpTone = getBpTone(prediction?.systolic, prediction?.diastolic);
  const lastActiveAt =
    liveData?.lastUpdatedAt ||
    prediction?.lastUpdatedAt ||
    patient?.lastActiveAt ||
    null;
  const dataIsStale = Boolean(liveData?.isStale || prediction?.isStale);

  return (
    <AppShell>
      <section className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{patient?.name || "Patient"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Patient ID: {id} • {patient?.age || "N/A"} years • {patient?.condition || "N/A"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-xs text-slate-500">
              Last Active: {formatDateTime(lastActiveAt)}
            </p>
            {dataIsStale && (
              <Badge tone="warning">Device Offline (Last Known Reading)</Badge>
            )}
          </div>
        </div>
        <Button variant="ghost" onClick={loadPageData}>
          Refresh Data
        </Button>
      </section>

      <div className="space-y-6">
        <Card title="Patient Information">
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
            <div>
              <p className="text-slate-500">Name</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{patient?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-slate-500">Age</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{patient?.age || "N/A"}</p>
            </div>
            <div>
              <p className="text-slate-500">Condition</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{patient?.condition || "N/A"}</p>
            </div>
          </div>
        </Card>

        <Card title="Live Sensor Data (ESP32)">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Heart Rate"
              value={liveData?.heartRate ?? "--"}
              unit="bpm"
              tone={heartRateTone}
              icon={<HeartPulse size={18} />}
            />

            <MetricCard
              label="SpO2"
              value={liveData?.spo2 ?? "--"}
              unit="%"
              tone={spo2Tone}
              icon={<Waves size={18} />}
            />

            <MetricCard
              label="Temperature"
              value={liveData?.temperature ?? "--"}
              unit="C"
              tone={temperatureTone}
              icon={<Thermometer size={18} />}
            />

            <MetricCard
              label="Blood Pressure"
              value={`${prediction?.systolic ?? "--"}/${prediction?.diastolic ?? "--"}`}
              unit="mmHg"
              tone={bpTone}
              icon={<Gauge size={18} />}
            />
          </div>
        </Card>

        <Card title="AI Risk Prediction">
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-slate-500">Risk Level</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {prediction?.riskLevel || "Unknown"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-slate-500">Model Confidence</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {prediction?.confidence ?? "--"}%
              </p>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
};

export default PatientDetails;
