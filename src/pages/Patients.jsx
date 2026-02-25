import { useMemo, useState } from "react";

import AppShell from "../components/layout/AppShell";
import StatCard from "../components/dashboard/StatCard";
import PatientFilters from "../components/patients/PatientFilters";
import PatientTable from "../components/patients/PatientTable";
import LoadingState from "../components/states/LoadingState";
import ErrorState from "../components/states/ErrorState";

import useDashboardData from "../hooks/useDashboardData";

const Patients = () => {
  const { patients, loading, error, refetch } = useDashboardData();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const stats = useMemo(() => {
    const total = patients.length;
    const discharged = patients.filter((p) => p.status === "discharged").length;
    const followUp = patients.filter((p) => p.status === "follow-up").length;
    const active = patients.filter((p) => p.status === "active").length;

    return [
      {
        id: 1,
        label: "Total Patients",
        value: total,
        trend: "+4%",
      },
      {
        id: 2,
        label: "Active Cases",
        value: active,
        trend: "+2",
      },
      {
        id: 3,
        label: "Follow-up",
        value: followUp,
        trend: "-1",
        trendDown: true,
      },
      {
        id: 4,
        label: "Discharged",
        value: discharged,
        trend: "+3",
      },
    ];
  }, [patients]);

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || patient.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [patients, searchTerm, statusFilter]);

  return (
    <AppShell>
      <section className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Patient Registry</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage active cases, follow-up schedules, and discharge progress.
        </p>
      </section>

      {loading && <LoadingState label="Loading patient records..." />}

      {!loading && error && (
        <ErrorState
          title="Unable to load patient records"
          message={error}
          onRetry={refetch}
        />
      )}

      {!loading && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard key={stat.id} {...stat} />
            ))}
          </div>

          <PatientFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            resultCount={filteredPatients.length}
          />

          <PatientTable patients={filteredPatients} />
        </div>
      )}
    </AppShell>
  );
};

export default Patients;
