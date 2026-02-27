import { useEffect, useState } from "react";
import { BellRing, Gauge, HeartPulse, ShieldAlert, Thermometer, Waves } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import Card from "../components/shared/Card";
import Badge from "../components/shared/Badge";
import LoadingState from "../components/states/LoadingState";
import ErrorState from "../components/states/ErrorState";
import { apiFetch } from "../utils/api";
import { formatDateTime } from "../utils/helpers";

const FamilyDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [patientBundle, setPatientBundle] = useState(null);
  const [feed, setFeed] = useState([]);

  const loadData = async () => {
    setError("");
    try {
      const [bundle, notifications] = await Promise.all([
        apiFetch("/family/patient"),
        apiFetch("/family/feed"),
      ]);

      setPatientBundle(bundle);
      setFeed(Array.isArray(notifications) ? notifications : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load family dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 3000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <AppShell>
        <LoadingState label="Loading family dashboard..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <ErrorState title="Unable to load family dashboard" message={error} onRetry={loadData} />
      </AppShell>
    );
  }

  const patient = patientBundle?.patient;
  const liveData = patientBundle?.liveData;
  const prediction = patientBundle?.prediction;

  return (
    <AppShell>
      <section className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Family Monitoring Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tracking {patient?.name || "your patient"}. Last active: {formatDateTime(liveData?.lastUpdatedAt)}
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card title="Heart Rate" icon={<HeartPulse size={18} />}>
          <p className="text-3xl font-bold text-slate-900">{liveData?.heartRate ?? "--"} bpm</p>
        </Card>
        <Card title="SpO2" icon={<Waves size={18} />}>
          <p className="text-3xl font-bold text-slate-900">{liveData?.spo2 ?? "--"}%</p>
        </Card>
        <Card title="Temperature" icon={<Thermometer size={18} />}>
          <p className="text-3xl font-bold text-slate-900">{liveData?.temperature ?? "--"} C</p>
        </Card>
        <Card title="Blood Pressure" icon={<Gauge size={18} />}>
          <p className="text-2xl font-bold text-slate-900">
            {prediction?.systolic ?? "--"}/{prediction?.diastolic ?? "--"} mmHg
          </p>
        </Card>
        <Card title="Risk Level" icon={<ShieldAlert size={18} />}>
          <p className="text-2xl font-bold text-slate-900">{prediction?.riskLevel || "Unknown"}</p>
          <p className="mt-1 text-sm text-slate-500">Confidence: {prediction?.confidence ?? 0}%</p>
        </Card>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Patient Details">
          <div className="space-y-2 text-sm text-slate-700">
            <p><span className="font-semibold">Name:</span> {patient?.name || "N/A"}</p>
            <p><span className="font-semibold">Condition:</span> {patient?.condition || "N/A"}</p>
            <p><span className="font-semibold">Phone:</span> {patient?.phoneNumber || "N/A"}</p>
            <p><span className="font-semibold">Address:</span> {patient?.address || "N/A"}</p>
          </div>
        </Card>

        <Card title="Alerts & Notifications" icon={<BellRing size={18} />}>
          <div className="space-y-3">
            {feed.length > 0 ? (
              feed.slice(0, 10).map((item) => (
                <div key={item._id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                    <Badge tone={item.severity === "CRITICAL" ? "danger" : item.severity === "HIGH" ? "warning" : "info"}>
                      {item.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{item.body}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No alerts yet.</p>
            )}
          </div>
        </Card>
      </section>
    </AppShell>
  );
};

export default FamilyDashboard;
