// src/hooks/useDashboardData.js

import { useState, useEffect } from "react";
import {
  statsData,
  analyticsData,
  patientsData,
} from "../data/dashboardData";

const API_BASE = "http://localhost:8000/api";

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
      const response = await fetch(`${API_BASE}/patients`);

      if (!response.ok) {
        throw new Error("Unable to fetch patient list from backend.");
      }

      const patientRows = await response.json();
      setPatients(Array.isArray(patientRows) ? patientRows : []);

      const total = Array.isArray(patientRows) ? patientRows.length : 0;
      const active = patientRows.filter((p) => p.status === "active").length;
      const followUp = patientRows.filter((p) => p.status === "follow-up").length;
      const discharged = patientRows.filter((p) => p.status === "discharged").length;

      setStats([
        {
          id: 1,
          label: "Total Patients",
          value: String(total),
          trend: "+0%",
          trendDown: false,
        },
        {
          id: 2,
          label: "Active Cases",
          value: String(active),
          trend: `${active}`,
          trendDown: false,
        },
        {
          id: 3,
          label: "Follow-up",
          value: String(followUp),
          trend: `${followUp}`,
          trendDown: false,
        },
        {
          id: 4,
          label: "Discharged",
          value: String(discharged),
          trend: `${discharged}`,
          trendDown: false,
        },
      ]);

      setAnalytics(analyticsData);
    } catch (err) {
      // Keep app usable even if backend is down.
      setStats(statsData);
      setAnalytics(analyticsData);
      setPatients(patientsData);
      setError(
        err instanceof Error
          ? `${err.message} Showing fallback demo data.`
          : "Unable to load dashboard data."
      );
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
