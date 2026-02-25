import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Calendar, Activity } from "lucide-react";

import AppShell from "../components/layout/AppShell";
import AnalyticItem from "../components/dashboard/AnalyticItem";
import StatCard from "../components/dashboard/StatCard";
import PerformanceCard from "../components/dashboard/PerformanceCard";
import PatientTable from "../components/patients/PatientTable";
import PatientFilters from "../components/patients/PatientFilters";
import Card from "../components/shared/Card";
import ScheduleRow from "../components/activity/ScheduleRow";
import ActivityRow from "../components/activity/ActivityRow";
import LoadingState from "../components/states/LoadingState";
import ErrorState from "../components/states/ErrorState";
import Badge from "../components/shared/Badge";
import { formatDateTime } from "../utils/helpers";

import useDashboardData from "../hooks/useDashboardData";

const Dashboard = () => {
  const { stats, analytics, patients, loading, error, refetch } = useDashboardData();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [liveSnapshot, setLiveSnapshot] = useState(null);

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const matchesSearch = patient.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || patient.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [patients, searchTerm, statusFilter]);

  const primaryPatientId = patients[0]?.id || "PT001";

  useEffect(() => {
    let active = true;

    const fetchSnapshot = async () => {
      try {
        const [liveRes, predRes] = await Promise.all([
          fetch(`http://localhost:8000/api/patient/${primaryPatientId}/live`),
          fetch(`http://localhost:8000/api/patient/${primaryPatientId}/prediction`),
        ]);

        const liveData = liveRes.ok ? await liveRes.json() : null;
        const predData = predRes.ok ? await predRes.json() : null;

        if (!active) return;

        setLiveSnapshot({
          heartRate: liveData?.heartRate ?? "--",
          spo2: liveData?.spo2 ?? "--",
          temperature: liveData?.temperature ?? "--",
          bp:
            predData?.systolic != null && predData?.diastolic != null
              ? `${predData.systolic}/${predData.diastolic}`
              : "--/--",
          lastActive: liveData?.lastUpdatedAt || predData?.lastUpdatedAt || null,
          isStale: Boolean(liveData?.isStale || predData?.isStale),
        });
      } catch {
        if (!active) return;
        setLiveSnapshot(null);
      }
    };

    fetchSnapshot();
    const timer = setInterval(fetchSnapshot, 10000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [primaryPatientId]);

  return (
    <AppShell>
      <section className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Clinical Operations Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track patient health, monitor live vitals, and respond to risk signals quickly.
        </p>
      </section>

      {loading && <LoadingState label="Loading dashboard data..." />}

      {!loading && error && (
        <ErrorState
          title="Unable to load dashboard"
          message={error}
          onRetry={refetch}
        />
      )}

      {!loading && !error && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <TrendingUp className="text-blue-500" size={20} />
                  Monthly Analytics Overview
                </h3>
                <p className="text-xs text-slate-500">Comprehensive insights for February 2026</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {analytics.map((item) => (
                <AnalyticItem key={item.id} {...item} />
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.id} {...stat} />
            ))}
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-4">
            <Card title="Today's Schedule" icon={<Calendar size={18} />} footer="View Full Schedule">
              <div className="space-y-3">
                <ScheduleRow label="Morning" count="8 patients" />
                <ScheduleRow label="Afternoon" count="12 patients" />
                <ScheduleRow label="Evening" count="8 patients" />
              </div>
            </Card>

            <Card title="Recent Activity" icon={<Activity size={18} />}>
              <div className="space-y-4">
                <ActivityRow dot="bg-emerald-500" label="Lab results uploaded" time="2 minutes ago" />
                <ActivityRow dot="bg-orange-400" label="Appointment rescheduled" time="15 minutes ago" />
                <ActivityRow dot="bg-blue-500" label="New patient registered" time="1 hour ago" />
              </div>
            </Card>

            <PerformanceCard />

            <Card title="Last Known Vitals">
              {liveSnapshot ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-slate-500">HR</p>
                      <p className="text-lg font-semibold text-slate-900">{liveSnapshot.heartRate} bpm</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-slate-500">SpO2</p>
                      <p className="text-lg font-semibold text-slate-900">{liveSnapshot.spo2}%</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-slate-500">Temp</p>
                      <p className="text-lg font-semibold text-slate-900">{liveSnapshot.temperature} C</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-slate-500">BP</p>
                      <p className="text-lg font-semibold text-slate-900">{liveSnapshot.bp} mmHg</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Last Active: {formatDateTime(liveSnapshot.lastActive)}
                  </p>
                  {liveSnapshot.isStale && <Badge tone="warning">Device Offline</Badge>}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No snapshot available yet.</p>
              )}
            </Card>
          </section>

          <section className="space-y-4">
            <PatientFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              resultCount={filteredPatients.length}
            />

            <PatientTable patients={filteredPatients} />
          </section>
        </div>
      )}
    </AppShell>
  );
};

export default Dashboard;
