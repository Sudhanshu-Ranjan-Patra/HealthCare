// src/data/dashboardData.js

export const statsData = [
  {
    id: 1,
    label: "Total Patients",
    value: "1,234",
    trend: "+12%",
    trendDown: false,
  },
  {
    id: 2,
    label: "Today's Appointments",
    value: "28",
    trend: "+3",
    trendDown: false,
  },
  {
    id: 3,
    label: "Active Cases",
    value: "89",
    trend: "-5%",
    trendDown: true,
  },
  {
    id: 4,
    label: "Avg. Wait Time",
    value: "15 min",
    trend: "-2 min",
    trendDown: false,
  },
];

export const analyticsData = [
  {
    id: 1,
    label: "Patient Growth",
    value: "+18%",
    sub: "+42 new patients vs last month",
    progress: 70,
  },
  {
    id: 2,
    label: "Appointment Rate",
    value: "94%",
    sub: "Average attendance rate",
    progress: 85,
  },
  {
    id: 3,
    label: "Patient Satisfaction",
    value: "4.8/5",
    sub: "Based on 156 reviews",
    progress: 90,
  },
];

export const patientsData = [
  {
    id: "PT001",
    name: "Vikash Kumar",
    age: 28,
    gender: "Male",
    condition: "Hypertension",
    status: "active",
    riskLevel: "Normal",
    lastVisit: "2026-02-15",
  },
  {
    id: "PT002",
    name: "Subham Suar",
    age: 15,
    gender: "Male",
    condition: "Diabetes Type 2",
    status: "follow-up",
    riskLevel: "High",
    lastVisit: "2026-01-10",
  },
  {
    id: "PT003",
    name: "Romyajit Das",
    age: 20,
    gender: "male",
    condition: "Asthma",
    status: "active",
    riskLevel: "Low",
    lastVisit: "2025-12-28",
  },
];