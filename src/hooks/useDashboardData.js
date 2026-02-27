import { useState, useEffect } from "react";
import { analyticsData, patientsData, statsData } from "../data/dashboardData";
import { apiFetch } from "../utils/api";

const useDashboardData = () => {
  const [stats, setStats] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const patientRows = await apiFetch("/admin/patients");
      const rows = Array.isArray(patientRows) ? patientRows : [];
      setPatients(rows);

      const total = rows.length;
      const active = rows.filter((p) => p.status === "active").length;
      const followUp = rows.filter((p) => p.status === "follow-up").length;
      const discharged = rows.filter((p) => p.status === "discharged").length;

      setStats([
        { id: 1, label: "Total Patients", value: String(total), trend: "+0%", trendDown: false },
        { id: 2, label: "Active Cases", value: String(active), trend: `${active}`, trendDown: false },
        { id: 3, label: "Follow-up", value: String(followUp), trend: `${followUp}`, trendDown: false },
        { id: 4, label: "Discharged", value: String(discharged), trend: `${discharged}`, trendDown: false },
      ]);

      setAnalytics(analyticsData);
    } catch (err) {
      setStats(statsData);
      setAnalytics(analyticsData);
      setPatients(patientsData);
      setError(err instanceof Error ? `${err.message} Showing fallback demo data.` : "Unable to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    stats,
    analytics,
    patients,
    loading,
    error,
    refetch: loadData,
  };
};

export default useDashboardData;
