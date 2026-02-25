/* eslint-env node */

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const axios = require("axios");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
});

app.use(cors());
app.use(express.json());

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/healthcare";

mongoose
  .connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
  });

const patientSchema = new mongoose.Schema({
  patientId: { type: String, required: true, unique: true },
  name: String,
  age: Number,
  gender: String,
  status: String,
  condition: String,
  address: String,
  phoneNumber: String,
  photoUrl: String,
  familyMembers: [
    {
      name: String,
      relation: String,
      phoneNumber: String,
    },
  ],
  medicalHistory: [
    {
      date: Date,
      note: String,
    },
  ],
  lastActiveAt: Date,
});

const sensorReadingSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    heartRate: Number,
    temperature: Number,
    spo2: Number,
    ecgMean: Number,
    recordedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

const Patient = mongoose.model("Patient", patientSchema);
const SensorReading = mongoose.model("SensorReading", sensorReadingSchema);

let latestPatientData = {};

const FALLBACKS = {
  heartRate: 80,
  temperature: 98.6,
  spo2: 97,
  ecgMean: 1.0,
};

const STALE_THRESHOLD_MINUTES = 10;

const toNumberOrFallback = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isStaleTimestamp = (value) => {
  if (!value) return true;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return true;
  return Date.now() - time > STALE_THRESHOLD_MINUTES * 60 * 1000;
};

const sanitizeLivePayload = (rawData = {}) => {
  const patientId = String(rawData.patientId || "PT001");
  const recordedAt = rawData.recordedAt || rawData.timestamp || new Date().toISOString();

  return {
    patientId,
    heartRate: toNumberOrFallback(rawData.heartRate, FALLBACKS.heartRate),
    temperature: toNumberOrFallback(rawData.temperature, FALLBACKS.temperature),
    spo2: toNumberOrFallback(rawData.spo2, FALLBACKS.spo2),
    ecgMean: toNumberOrFallback(rawData.ecgMean, FALLBACKS.ecgMean),
    recordedAt,
  };
};

const readingToLiveResponse = (reading) => {
  const lastUpdatedAt = reading?.recordedAt || null;

  return {
    patientId: reading?.patientId || null,
    heartRate: toNumberOrFallback(reading?.heartRate, FALLBACKS.heartRate),
    temperature: toNumberOrFallback(reading?.temperature, FALLBACKS.temperature),
    spo2: toNumberOrFallback(reading?.spo2, FALLBACKS.spo2),
    ecgMean: toNumberOrFallback(reading?.ecgMean, FALLBACKS.ecgMean),
    lastUpdatedAt,
    isStale: isStaleTimestamp(lastUpdatedAt),
  };
};

const getLatestReading = async (patientId) => {
  const byPatient = await SensorReading.findOne({ patientId })
    .sort({ recordedAt: -1, createdAt: -1 })
    .lean();

  if (byPatient) return byPatient;

  const anyReading = await SensorReading.findOne({})
    .sort({ recordedAt: -1, createdAt: -1 })
    .lean();

  if (anyReading) return anyReading;

  if (Object.keys(latestPatientData).length > 0) {
    return {
      ...latestPatientData,
      patientId: latestPatientData.patientId || patientId,
      recordedAt: latestPatientData.recordedAt || new Date().toISOString(),
    };
  }

  return {
    patientId,
    ...FALLBACKS,
    recordedAt: null,
  };
};

const titleCase = (value) => {
  if (!value) return "Unknown";
  return String(value)
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const defaultPhotoUrl = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "Patient"
  )}&background=0f766e&color=ffffff`;

const fallbackFamilyMembers = (patientId) => [
  {
    name: `Guardian ${patientId}`,
    relation: "Parent",
    phoneNumber: "+1-555-0101",
  },
  {
    name: `Emergency Contact ${patientId}`,
    relation: "Sibling",
    phoneNumber: "+1-555-0112",
  },
];

app.post("/api/esp32-data", async (req, res) => {
  const normalized = sanitizeLivePayload(req.body || {});

  console.log("ESP32 Data:", normalized);

  latestPatientData = normalized;

  try {
    await SensorReading.create({
      patientId: normalized.patientId,
      heartRate: normalized.heartRate,
      temperature: normalized.temperature,
      spo2: normalized.spo2,
      ecgMean: normalized.ecgMean,
      recordedAt: normalized.recordedAt,
    });

    await Patient.updateOne(
      { patientId: normalized.patientId },
      { $set: { lastActiveAt: normalized.recordedAt } }
    );
  } catch (err) {
    console.error("Failed to persist sensor reading:", err.message);
  }

  io.emit("patient-data", normalized);

  res.json({
    message: "Data received",
    patientId: normalized.patientId,
    lastUpdatedAt: normalized.recordedAt,
  });
});

app.get("/api/patient/:id/live", async (req, res) => {
  const { id } = req.params;

  try {
    const latestReading = await getLatestReading(id);
    res.json(readingToLiveResponse(latestReading));
  } catch (err) {
    console.error("Live data error:", err.message);
    res.status(500).json({ message: "Unable to fetch live data" });
  }
});

app.get("/api/patient/:id/prediction", async (req, res) => {
  const { id } = req.params;

  try {
    const latestReading = await getLatestReading(id);
    const liveData = readingToLiveResponse(latestReading);

    const payload = {
      heartRate: liveData.heartRate,
      temperature: liveData.temperature,
      spo2: liveData.spo2,
      ecgMean: liveData.ecgMean,
    };

    const url =
      process.env.ML_SERVICE_URL ||
      "http://127.0.0.1:9000/predict";

    try {
      const response = await axios.post(url, payload);
      const mlData = response.data || {};
      const systolicValue = Number(mlData.systolic);
      const diastolicValue = Number(mlData.diastolic);
      const confidenceValue = Number(mlData.confidence);

      return res.json({
        riskLevel: mlData.riskLevel || "Unknown",
        confidence: Number.isFinite(confidenceValue)
          ? confidenceValue
          : 0,
        systolic: Number.isFinite(systolicValue)
          ? systolicValue
          : null,
        diastolic: Number.isFinite(diastolicValue)
          ? diastolicValue
          : null,
        lastUpdatedAt: liveData.lastUpdatedAt,
        isStale: liveData.isStale,
      });
    } catch (error) {
      console.error("Prediction error:", error.message);
      return res.json({
        riskLevel: "Unavailable",
        confidence: 0,
        systolic: null,
        diastolic: null,
        lastUpdatedAt: liveData.lastUpdatedAt,
        isStale: liveData.isStale,
      });
    }
  } catch (err) {
    console.error("Prediction route error:", err.message);
    res.status(500).json({
      message: "Prediction service error",
    });
  }
});

app.get("/api/patient/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const patient = await Patient.findOne({ patientId: id }).lean();
    const latestReading = await getLatestReading(id);
    const liveData = readingToLiveResponse(latestReading);
    const recentReadings = await SensorReading.find({ patientId: id })
      .sort({ recordedAt: -1 })
      .limit(10)
      .lean();

    const previousRecords = recentReadings.map((row) => ({
      recordedAt: row.recordedAt,
      heartRate: row.heartRate,
      spo2: row.spo2,
      temperature: row.temperature,
      ecgMean: row.ecgMean,
    }));

    if (patient) {
      return res.json({
        ...patient,
        patientId: patient.patientId || id,
        gender: titleCase(patient.gender || "Unknown"),
        status: String(patient.status || "active").toLowerCase(),
        address: patient.address || "Address not available",
        phoneNumber: patient.phoneNumber || "+1-555-0000",
        photoUrl: patient.photoUrl || defaultPhotoUrl(patient.name),
        familyMembers:
          Array.isArray(patient.familyMembers) &&
          patient.familyMembers.length > 0
            ? patient.familyMembers
            : fallbackFamilyMembers(id),
        medicalHistory:
          Array.isArray(patient.medicalHistory) &&
          patient.medicalHistory.length > 0
            ? patient.medicalHistory
            : [],
        previousRecords,
        lastActiveAt: patient.lastActiveAt || liveData.lastUpdatedAt,
      });
    }

    return res.json({
      patientId: id,
      name: `Patient ${id}`,
      age: null,
      gender: "Unknown",
      status: "active",
      condition: "Not available",
      address: "Address not available",
      phoneNumber: "+1-555-0000",
      photoUrl: defaultPhotoUrl(`Patient ${id}`),
      familyMembers: fallbackFamilyMembers(id),
      medicalHistory: [],
      previousRecords,
      lastActiveAt: liveData.lastUpdatedAt,
      isProfileComplete: false,
    });
  } catch (err) {
    console.error("Error fetching patient:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/patients", async (_req, res) => {
  try {
    const patients = await Patient.find({})
      .sort({ patientId: 1 })
      .lean();

    const latestReadings = await SensorReading.aggregate([
      { $sort: { recordedAt: -1 } },
      {
        $group: {
          _id: "$patientId",
          lastVisit: { $first: "$recordedAt" },
        },
      },
    ]);

    const readingMap = latestReadings.reduce((acc, item) => {
      acc[item._id] = item.lastVisit;
      return acc;
    }, {});

    const normalized = patients.map((patient) => ({
      id: patient.patientId,
      patientId: patient.patientId,
      name: patient.name || `Patient ${patient.patientId}`,
      age: patient.age ?? null,
      gender: titleCase(patient.gender || "Unknown"),
      condition: patient.condition || "Not available",
      status: String(patient.status || "active").toLowerCase(),
      lastVisit:
        patient.lastActiveAt ||
        readingMap[patient.patientId] ||
        null,
    }));

    res.json(normalized);
  } catch (err) {
    console.error("Error fetching patients:", err.message);
    res.status(500).json({ message: "Unable to fetch patients" });
  }
});

io.on("connection", () => {
  console.log("Frontend connected");
});

server.listen(8000, () => {
  console.log("Server running on port 8000");
});
