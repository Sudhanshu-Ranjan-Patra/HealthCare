// src/hooks/useDashboardData.js

import { useState, useEffect } from "react";
import {
  statsData,
  analyticsData,
  patientsData,
} from "../data/dashboardData";

const useDashboardData = () => {
  const [stats, setStats] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = () => {
    setLoading(true);
    setError("");

    setTimeout(() => {
      try {
        setStats(statsData);
        setAnalytics(analyticsData);
        setPatients(patientsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }, 500);
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
