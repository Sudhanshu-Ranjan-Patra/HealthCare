// src/utils/helpers.js

// Format date nicely
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "No recent reading";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Get initials from name
export const getInitials = (name) => {
  if (!name) return "NA";
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

// Format number with commas
export const formatNumber = (num) => {
  return new Intl.NumberFormat().format(num);
};

// Status color mapping
export const getStatusColor = (status) => {
  const normalized = String(status || "").toLowerCase();

  switch (normalized) {
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "follow-up":
      return "bg-amber-100 text-amber-700";
    case "discharged":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

export const toTitleCase = (value) => {
  if (!value) return "N/A";
  return String(value)
    .toLowerCase()
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const getVitalTone = (type, value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "neutral";

  if (type === "heartRate") {
    if (numericValue < 50 || numericValue > 120) return "danger";
    if (numericValue < 60 || numericValue > 100) return "warning";
    return "success";
  }

  if (type === "spo2") {
    if (numericValue < 90) return "danger";
    if (numericValue < 95) return "warning";
    return "success";
  }

  if (type === "temperature") {
    if (numericValue >= 39 || numericValue < 35) return "danger";
    if (numericValue >= 37.5 || numericValue < 36) return "warning";
    return "success";
  }

  return "neutral";
};

export const getBpTone = (systolic, diastolic) => {
  const s = Number(systolic);
  const d = Number(diastolic);

  if (!Number.isFinite(s) || !Number.isFinite(d)) return "neutral";
  if (s >= 140 || d >= 90 || s < 90 || d < 60) return "danger";
  if (s >= 130 || d >= 80) return "warning";
  return "success";
};

export const getToneLabel = (tone) => {
  switch (tone) {
    case "success":
      return "Normal";
    case "warning":
      return "Watch";
    case "danger":
      return "Critical";
    default:
      return "Unknown";
  }
};
