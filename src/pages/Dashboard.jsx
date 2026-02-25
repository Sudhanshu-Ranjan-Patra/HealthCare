import { useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";

import AnalyticItem from "../components/dashboard/AnalyticItem";
import PerformanceCard from "../components/dashboard/PerformanceCard";
import DashboardCards from "../components/dashboard/DashboardCards";

import PatientTable from "../components/patients/PatientTable";
import PatientFilters from "../components/patients/PatientFilters";

import Card from "../components/shared/Card";

import ScheduleRow from "../components/activity/ScheduleRow";
import ActivityRow from "../components/activity/ActivityRow";

import { TrendingUp, Calendar, Activity } from "lucide-react";

import useDashboardData from "../hooks/useDashboardData";

const Dashboard = () => {
    const { analytics, patients, loading, patientData, alerts } = useDashboardData();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const filteredPatients = patients.filter((patient) => {
        const matchesSearch =
            patient.name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === "all" || patient.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <p className="text-lg font-semibold text-slate-500">
                    Loading Dashboard...
                </p>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-700">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                <Header />
                <div className="p-8 space-y-8">

                    {/* ANALYTICS SECTION */}
                    <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <TrendingUp className="text-blue-500" size={20} />
                                    Monthly Analytics Overview
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Comprehensive insights for October 2025
                                </p>
                            </div>
                            <button className="text-blue-600 text-sm font-semibold hover:underline">
                                View Details
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-8">
                            {analytics.map((item) => (
                                <AnalyticItem key={item.id} {...item} />
                            ))}
                        </div>
                    </section>

                    {/* LIVE PATIENT MONITOR - Real-time IoT Data */}
                    {patientData ? (
                        <section className="bg-white rounded-2xl p-6 border-2 border-red-200 shadow-lg">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <span className="animate-pulse">🔴</span>
                                        Live Patient Monitor
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        Real-time IoT sensor data - Patient: {patientData.patient_id}
                                    </p>
                                </div>
                                <div className={`px-4 py-2 rounded-full text-white font-bold ${
                                    patientData.severity === 'low' ? 'bg-green-500' :
                                    patientData.severity === 'medium' ? 'bg-yellow-500' :
                                    patientData.severity === 'high' ? 'bg-orange-500' :
                                    'bg-red-500'
                                }`}>
                                    {patientData.severity.toUpperCase()}
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-6">
                                <div className="bg-red-50 p-4 rounded-xl text-center">
                                    <p className="text-red-600 font-semibold">Heart Rate</p>
                                    <p className="text-3xl font-bold text-red-700">{patientData.heart_rate}</p>
                                    <p className="text-red-400 text-sm">bpm</p>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-xl text-center">
                                    <p className="text-blue-600 font-semibold">SpO2</p>
                                    <p className="text-3xl font-bold text-blue-700">{patientData.spo2}</p>
                                    <p className="text-blue-400 text-sm">%</p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-xl text-center">
                                    <p className="text-purple-600 font-semibold">Blood Pressure</p>
                                    <p className="text-3xl font-bold text-purple-700">
                                        {patientData.predicted_bp_systolic}/{patientData.predicted_bp_diastolic}
                                    </p>
                                    <p className="text-purple-400 text-sm">mmHg (ML Predicted)</p>
                                </div>
                                <div className="bg-orange-50 p-4 rounded-xl text-center">
                                    <p className="text-orange-600 font-semibold">Temperature</p>
                                    <p className="text-3xl font-bold text-orange-700">{patientData.temperature}</p>
                                    <p className="text-orange-400 text-sm">°C</p>
                                </div>
                            </div>
                        </section>
                    ) : (
                        <section className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                            <div className="text-center py-8">
                                <p className="text-slate-400">No patient data available. Waiting for IoT sensor data...</p>
                            </div>
                        </section>
                    )}

                    {/* ALERTS */}
                    {alerts.length > 0 && (
                        <section className="bg-red-50 rounded-2xl p-6 border border-red-200">
                            <h3 className="text-lg font-bold text-red-700 mb-4">⚠️ Alerts</h3>
                            {alerts.map((alert, index) => (
                                <div key={index} className="bg-white p-4 rounded-xl mb-2 border-l-4 border-red-500">
                                    <p className="font-bold text-red-600">{alert.severity.toUpperCase()}</p>
                                    <p className="text-slate-700">{alert.message}</p>
                                </div>
                            ))}
                        </section>
                    )}

                    {/* SECONDARY CARDS */}
                    <div className="grid grid-cols-3 gap-6">
                        <Card title="Today's Schedule" icon={<Calendar size={18} />} footer="View Full Schedule">
                            <div className="space-y-3">
                                <ScheduleRow label="Morning" count="8 patients" />
                                <ScheduleRow label="Afternoon" count="12 patients" />
                                <ScheduleRow label="Evening" count="8 patients" />
                            </div>
                        </Card>
                        <Card title="Recent Activity" icon={<Activity size={18} />} footer="">
                            <div className="space-y-4">
                                <ActivityRow dot="bg-emerald-500" label="Lab results uploaded" time="2 minutes ago" />
                                <ActivityRow dot="bg-orange-400" label="Appointment rescheduled" time="15 minutes ago" />
                                <ActivityRow dot="bg-blue-500" label="New patient registered" time="1 hour ago" />
                            </div>
                        </Card>
                        <PerformanceCard />
                    </div>

                    {/* PATIENT TABLE */}
                    <PatientFilters
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                    />
                    <PatientTable patients={filteredPatients} />

                </div>
            </main>
        </div>
    );
};

export default Dashboard;