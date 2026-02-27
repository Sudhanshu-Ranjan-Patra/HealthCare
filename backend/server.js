/* eslint-env node */

const express = require("express");
const cors = require("cors");
const http = require("http");
const crypto = require("crypto");
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

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/healthcare";
mongoose.set("bufferCommands", false);
let isMongoConnected = false;

mongoose.connection.on("connected", () => {
  isMongoConnected = true;
});

mongoose.connection.on("disconnected", () => {
  isMongoConnected = false;
});

const Roles = {
  ADMIN: "ADMIN",
  DOCTOR: "DOCTOR",
  FAMILY: "FAMILY",
};

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

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    role: {
      type: String,
      enum: Object.values(Roles),
      required: true,
      default: Roles.FAMILY,
    },
    passwordSalt: { type: String, required: true },
    passwordHash: { type: String, required: true },
    linkedPatientId: { type: String, default: null },
    phoneNumber: String,
  },
  { timestamps: true }
);

const authSessionSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const deviceSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, unique: true, index: true },
    deviceId: { type: String, required: true },
    deviceKey: { type: String, required: true },
    wifiSsid: String,
    lastSeenAt: Date,
  },
  { timestamps: true }
);

const alertSchema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, index: true },
    severity: { type: String, enum: ["HIGH", "CRITICAL"], required: true },
    type: { type: String, required: true },
    message: { type: String, required: true },
    triggeredAt: { type: Date, default: Date.now, index: true },
    acknowledged: { type: Boolean, default: false, index: true },
    acknowledgedAt: Date,
    reading: {
      heartRate: Number,
      spo2: Number,
      temperature: Number,
      ecgMean: Number,
      recordedAt: Date,
    },
    prediction: {
      riskLevel: String,
      confidence: Number,
      systolic: Number,
      diastolic: Number,
    },
  },
  { timestamps: true }
);

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    patientId: { type: String, required: true, index: true },
    alertId: { type: mongoose.Schema.Types.ObjectId, ref: "Alert" },
    title: { type: String, required: true },
    body: { type: String, required: true },
    severity: { type: String, enum: ["INFO", "HIGH", "CRITICAL"], default: "INFO" },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

const Patient = mongoose.model("Patient", patientSchema);
const SensorReading = mongoose.model("SensorReading", sensorReadingSchema);
const User = mongoose.model("User", userSchema);
const AuthSession = mongoose.model("AuthSession", authSessionSchema);
const Device = mongoose.model("Device", deviceSchema);
const Alert = mongoose.model("Alert", alertSchema);
const Notification = mongoose.model("Notification", notificationSchema);

const FALLBACKS = {
  heartRate: 80,
  temperature: 98.6,
  spo2: 97,
  ecgMean: 1.0,
};

const STALE_THRESHOLD_MINUTES = 10;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const toNumberOrFallback = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizePhone = (value) => String(value || "").replace(/\D/g, "");

const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => {
  const passwordHash = crypto.pbkdf2Sync(password, salt, 310000, 32, "sha256").toString("hex");
  return { salt, passwordHash };
};

const verifyPassword = (password, salt, expectedHash) => {
  const { passwordHash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(passwordHash, "hex"), Buffer.from(expectedHash, "hex"));
};

const safeUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  linkedPatientId: user.linkedPatientId || null,
});

const createSessionForUser = async (user) => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await AuthSession.create({ token, userId: user._id, expiresAt });
  return { token, expiresAt };
};

const titleCase = (value) => {
  if (!value) return "Unknown";
  return String(value)
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const defaultPhotoUrl = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Patient")}&background=0f766e&color=ffffff`;

const fallbackFamilyMembers = (patientId) => [
  {
    name: `Guardian ${patientId}`,
    relation: "Parent",
    phoneNumber: "+1-555-0101",
  },
];

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
    deviceId: rawData.deviceId || "esp32-default",
    deviceKey: rawData.deviceKey || null,
    wifiSsid: rawData.wifiSsid || "unknown",
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
  const row = await SensorReading.findOne({ patientId }).sort({ recordedAt: -1, createdAt: -1 }).lean();

  if (row) return row;

  return {
    patientId,
    ...FALLBACKS,
    recordedAt: null,
  };
};

const predictRisk = async (liveData) => {
  const payload = {
    heartRate: liveData.heartRate,
    temperature: liveData.temperature,
    spo2: liveData.spo2,
    ecgMean: liveData.ecgMean,
  };

  const url = process.env.ML_SERVICE_URL || "http://127.0.0.1:9000/predict";

  try {
    const response = await axios.post(url, payload);
    const mlData = response.data || {};

    return {
      riskLevel: mlData.riskLevel || "Unknown",
      confidence: Number.isFinite(Number(mlData.confidence)) ? Number(mlData.confidence) : 0,
      systolic: Number.isFinite(Number(mlData.systolic)) ? Number(mlData.systolic) : null,
      diastolic: Number.isFinite(Number(mlData.diastolic)) ? Number(mlData.diastolic) : null,
    };
  } catch (_err) {
    return {
      riskLevel: "Unavailable",
      confidence: 0,
      systolic: null,
      diastolic: null,
    };
  }
};

const createAlertAndNotify = async ({ patientId, severity, type, message, reading, prediction }) => {
  const alert = await Alert.create({
    patientId,
    severity,
    type,
    message,
    reading,
    prediction,
    triggeredAt: new Date(),
  });

  const recipients = await User.find({
    $or: [{ role: Roles.ADMIN }, { linkedPatientId: patientId }],
  }).lean();

  const notifications = recipients.map((user) => ({
    userId: user._id,
    patientId,
    alertId: alert._id,
    title: `${severity} Alert for ${patientId}`,
    body: message,
    severity,
  }));

  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }

  io.emit("alert", {
    patientId,
    severity,
    message,
    alertId: String(alert._id),
    triggeredAt: alert.triggeredAt,
  });

  return alert;
};

const evaluateAndNotify = async ({ patientId, reading, prediction }) => {
  const alerts = [];

  if (reading.heartRate > 130 || reading.heartRate < 45) {
    alerts.push({
      severity: "CRITICAL",
      type: "HEART_RATE",
      message: `Abnormal heart rate detected (${reading.heartRate} bpm).`,
    });
  }

  if (reading.spo2 < 90) {
    alerts.push({
      severity: "CRITICAL",
      type: "SPO2",
      message: `Critical SpO2 detected (${reading.spo2}%).`,
    });
  }

  if (reading.temperature >= 39 || reading.temperature < 35) {
    alerts.push({
      severity: "HIGH",
      type: "TEMPERATURE",
      message: `Temperature out of safe range (${reading.temperature} C).`,
    });
  }

  if (String(prediction.riskLevel).toLowerCase() === "high") {
    alerts.push({
      severity: "HIGH",
      type: "ML_RISK",
      message: `Model marked patient as high risk (${prediction.confidence}% confidence).`,
    });
  }

  for (const alertMeta of alerts) {
    await createAlertAndNotify({
      patientId,
      severity: alertMeta.severity,
      type: alertMeta.type,
      message: alertMeta.message,
      reading,
      prediction,
    });
  }

  return alerts.length;
};

const processIncomingReading = async (payload) => {
  const normalized = sanitizeLivePayload(payload || {});

  const device = await Device.findOne({ patientId: normalized.patientId });

  if (device && normalized.deviceKey && device.deviceKey !== normalized.deviceKey) {
    const error = new Error("Invalid device key");
    error.statusCode = 401;
    throw error;
  }

  if (!device && normalized.deviceKey) {
    await Device.create({
      patientId: normalized.patientId,
      deviceId: normalized.deviceId,
      deviceKey: normalized.deviceKey,
      wifiSsid: normalized.wifiSsid,
      lastSeenAt: normalized.recordedAt,
    });
  } else if (device) {
    await Device.updateOne(
      { _id: device._id },
      {
        $set: {
          deviceId: normalized.deviceId,
          wifiSsid: normalized.wifiSsid,
          lastSeenAt: normalized.recordedAt,
        },
      }
    );
  }

  const readingDoc = await SensorReading.create({
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

  const liveData = readingToLiveResponse(readingDoc);
  const prediction = await predictRisk(liveData);
  const alertCount = await evaluateAndNotify({
    patientId: normalized.patientId,
    reading: liveData,
    prediction,
  });

  io.emit("patient-data", {
    patientId: normalized.patientId,
    liveData,
    prediction,
  });

  return {
    message: "Reading received",
    patientId: normalized.patientId,
    alertCount,
    prediction,
    lastUpdatedAt: normalized.recordedAt,
  };
};

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const session = await AuthSession.findOne({ token }).lean();

  if (!session || new Date(session.expiresAt) <= new Date()) {
    return res.status(401).json({ message: "Session expired" });
  }

  const user = await User.findById(session.userId).lean();

  if (!user) {
    return res.status(401).json({ message: "Invalid session" });
  }

  req.user = user;
  req.authToken = token;
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

const buildPatientPayload = async (patientId) => {
  const patient = await Patient.findOne({ patientId }).lean();
  const latestReading = await getLatestReading(patientId);
  const liveData = readingToLiveResponse(latestReading);
  const previousRecords = await SensorReading.find({ patientId }).sort({ recordedAt: -1 }).limit(20).lean();

  if (!patient) {
    return {
      patientId,
      name: `Patient ${patientId}`,
      age: null,
      gender: "Unknown",
      status: "active",
      condition: "Not available",
      address: "Address not available",
      phoneNumber: "+1-555-0000",
      photoUrl: defaultPhotoUrl(`Patient ${patientId}`),
      familyMembers: fallbackFamilyMembers(patientId),
      medicalHistory: [],
      previousRecords,
      lastActiveAt: liveData.lastUpdatedAt,
      isProfileComplete: false,
    };
  }

  return {
    ...patient,
    patientId: patient.patientId,
    gender: titleCase(patient.gender || "Unknown"),
    status: String(patient.status || "active").toLowerCase(),
    address: patient.address || "Address not available",
    phoneNumber: patient.phoneNumber || "+1-555-0000",
    photoUrl: patient.photoUrl || defaultPhotoUrl(patient.name),
    familyMembers:
      Array.isArray(patient.familyMembers) && patient.familyMembers.length > 0
        ? patient.familyMembers
        : fallbackFamilyMembers(patientId),
    medicalHistory: Array.isArray(patient.medicalHistory) ? patient.medicalHistory : [],
    previousRecords,
    lastActiveAt: patient.lastActiveAt || liveData.lastUpdatedAt,
  };
};

const buildPatientListWithRisk = async () => {
  const patients = await Patient.find({}).sort({ patientId: 1 }).lean();
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

  const normalized = await Promise.all(
    patients.map(async (patient) => {
      const latestReading = await getLatestReading(patient.patientId);
      const liveData = readingToLiveResponse(latestReading);
      const prediction = await predictRisk(liveData);

      return {
        id: patient.patientId,
        patientId: patient.patientId,
        name: patient.name || `Patient ${patient.patientId}`,
        age: patient.age ?? null,
        gender: titleCase(patient.gender || "Unknown"),
        condition: patient.condition || "Not available",
        status: String(patient.status || "active").toLowerCase(),
        riskLevel: String(prediction.riskLevel || "Unknown"),
        lastVisit: patient.lastActiveAt || readingMap[patient.patientId] || null,
      };
    })
  );

  return normalized;
};

const ensureBootstrapUsers = async () => {
  const defaults = [
    {
      name: "Admin User",
      email: "admin@medicare.local",
      password: "admin123",
      role: Roles.ADMIN,
      linkedPatientId: null,
    },
    {
      name: "Family PT001",
      email: "family.pt001@medicare.local",
      password: "family123",
      role: Roles.FAMILY,
      linkedPatientId: "PT001",
    },
  ];

  for (const entry of defaults) {
    const existing = await User.findOne({ email: entry.email });
    if (existing) continue;

    const { salt, passwordHash } = hashPassword(entry.password);
    await User.create({
      name: entry.name,
      email: entry.email,
      role: entry.role,
      linkedPatientId: entry.linkedPatientId,
      passwordSalt: salt,
      passwordHash,
    });
  }
};

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", mongoConnected: isMongoConnected });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email: String(email).toLowerCase() });

  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const { token, expiresAt } = await createSessionForUser(user);

  return res.json({ token, user: safeUser(user), expiresAt });
});

app.post("/api/auth/family/register", async (req, res) => {
  const { patientId, phoneNumber, password, name, relation } = req.body || {};

  if (!patientId || !phoneNumber || !password) {
    return res.status(400).json({
      message: "patientId, phoneNumber, and password are required",
    });
  }

  const patient = await Patient.findOne({ patientId }).lean();
  if (!patient) {
    return res.status(404).json({ message: "Patient not found" });
  }

  const normalizedPhone = normalizePhone(phoneNumber);
  const matchedFamilyMember = (patient.familyMembers || []).find(
    (member) =>
      normalizePhone(member.phoneNumber) === normalizedPhone
  );
  const matchesPatientPhone =
    normalizePhone(patient.phoneNumber) === normalizedPhone;

  if (!matchedFamilyMember && !matchesPatientPhone) {
    return res.status(403).json({
      message: "Phone number is not linked to this patient in MongoDB",
    });
  }

  const existingByPhone = await User.findOne({
    role: Roles.FAMILY,
    linkedPatientId: patientId,
  });

  if (existingByPhone && normalizePhone(existingByPhone.phoneNumber) === normalizedPhone) {
    return res.status(409).json({
      message: "Family account already exists for this phone number",
    });
  }

  const sanitizedPatientId = String(patientId).toLowerCase();
  const last4 = normalizedPhone.replace(/\D/g, "").slice(-4) || "0000";
  const generatedEmail = `family.${sanitizedPatientId}.${last4}@medicare.local`;
  const { salt, passwordHash } = hashPassword(password);

  const user = await User.create({
    name:
      name ||
      matchedFamilyMember?.name ||
      `Family ${patient.name || patientId}`,
    email: generatedEmail,
    role: Roles.FAMILY,
    linkedPatientId: patientId,
    phoneNumber: normalizedPhone,
    passwordSalt: salt,
    passwordHash,
  });

  const { token, expiresAt } = await createSessionForUser(user);

  return res.status(201).json({
    token,
    expiresAt,
    user: safeUser(user),
    message: "Family account created and logged in",
  });
});

app.post("/api/auth/family/login", async (req, res) => {
  const { patientId, phoneNumber, password } = req.body || {};

  if (!patientId || !phoneNumber || !password) {
    return res.status(400).json({
      message: "patientId, phoneNumber, and password are required",
    });
  }

  const normalizedPhone = normalizePhone(phoneNumber);

  const candidates = await User.find({
    role: Roles.FAMILY,
    linkedPatientId: String(patientId),
  });

  const user = candidates.find((entry) => {
    const userPhone = normalizePhone(entry.phoneNumber);
    return userPhone === normalizedPhone;
  });

  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return res.status(401).json({ message: "Invalid family credentials" });
  }

  const { token, expiresAt } = await createSessionForUser(user);
  return res.json({ token, user: safeUser(user), expiresAt });
});

app.post("/api/auth/logout", authMiddleware, async (req, res) => {
  await AuthSession.deleteOne({ token: req.authToken });
  res.json({ ok: true });
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  res.json({ user: safeUser(req.user) });
});

app.post("/api/iot/reading", async (req, res) => {
  try {
    const responsePayload = await processIncomingReading(req.body || {});
    return res.json(responsePayload);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message || "Unable to process reading" });
  }
});

// Backward-compatible endpoint
app.post("/api/esp32-data", async (req, res) => {
  try {
    const responsePayload = await processIncomingReading(req.body || {});
    return res.json(responsePayload);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ message: err.message || "Unable to process reading" });
  }
});

app.get("/api/admin/patients", authMiddleware, requireRole(Roles.ADMIN, Roles.DOCTOR), async (_req, res) => {
  try {
    const normalized = await buildPatientListWithRisk();
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ message: "Unable to fetch patients" });
  }
});

app.get("/api/admin/patient/:id", authMiddleware, requireRole(Roles.ADMIN, Roles.DOCTOR), async (req, res) => {
  try {
    const payload = await buildPatientPayload(req.params.id);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ message: "Unable to fetch patient" });
  }
});

app.get("/api/admin/patient/:id/live", authMiddleware, requireRole(Roles.ADMIN, Roles.DOCTOR), async (req, res) => {
  const reading = await getLatestReading(req.params.id);
  res.json(readingToLiveResponse(reading));
});

app.get("/api/admin/patient/:id/prediction", authMiddleware, requireRole(Roles.ADMIN, Roles.DOCTOR), async (req, res) => {
  const reading = await getLatestReading(req.params.id);
  const liveData = readingToLiveResponse(reading);
  const prediction = await predictRisk(liveData);

  res.json({ ...prediction, lastUpdatedAt: liveData.lastUpdatedAt, isStale: liveData.isStale });
});

app.get("/api/admin/alerts", authMiddleware, requireRole(Roles.ADMIN, Roles.DOCTOR), async (req, res) => {
  const status = String(req.query.status || "open");
  const filter = status === "all" ? {} : { acknowledged: false };
  const alerts = await Alert.find(filter).sort({ triggeredAt: -1 }).limit(100).lean();
  res.json(alerts);
});

app.post("/api/admin/family-users", authMiddleware, requireRole(Roles.ADMIN, Roles.DOCTOR), async (req, res) => {
  const { name, email, password, linkedPatientId, phoneNumber } = req.body || {};

  if (!name || !email || !password || !linkedPatientId) {
    return res.status(400).json({ message: "name, email, password, linkedPatientId are required" });
  }

  const patient = await Patient.findOne({ patientId: linkedPatientId }).lean();
  if (!patient) {
    return res.status(404).json({ message: "Linked patient not found" });
  }

  const existing = await User.findOne({ email: String(email).toLowerCase() }).lean();
  if (existing) {
    return res.status(409).json({ message: "Email already exists" });
  }

  const { salt, passwordHash } = hashPassword(password);
  const user = await User.create({
    name,
    email: String(email).toLowerCase(),
    role: Roles.FAMILY,
    linkedPatientId,
    phoneNumber: phoneNumber || "",
    passwordSalt: salt,
    passwordHash,
  });

  return res.status(201).json({ user: safeUser(user) });
});

app.get("/api/family/patient", authMiddleware, requireRole(Roles.FAMILY), async (req, res) => {
  const patientId = req.user.linkedPatientId;
  if (!patientId) return res.status(400).json({ message: "No patient linked to this account" });

  const patient = await buildPatientPayload(patientId);
  const reading = await getLatestReading(patientId);
  const liveData = readingToLiveResponse(reading);
  const prediction = await predictRisk(liveData);

  res.json({ patient, liveData, prediction });
});

app.get("/api/family/feed", authMiddleware, requireRole(Roles.FAMILY), async (req, res) => {
  const feed = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json(feed);
});

app.post("/api/family/feed/:id/read", authMiddleware, requireRole(Roles.FAMILY), async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, userId: req.user._id }, { $set: { isRead: true } });
  res.json({ ok: true });
});

app.get("/api/family/alerts", authMiddleware, requireRole(Roles.FAMILY), async (req, res) => {
  if (!req.user.linkedPatientId) return res.json([]);
  const alerts = await Alert.find({ patientId: req.user.linkedPatientId }).sort({ triggeredAt: -1 }).limit(50).lean();
  res.json(alerts);
});

// Compatibility endpoints used by older frontend
app.get("/api/patients", authMiddleware, async (req, res) => {
  if (req.user.role === Roles.FAMILY) {
    const row = await buildPatientPayload(req.user.linkedPatientId || "PT001");
    const prediction = await predictRisk(
      readingToLiveResponse(await getLatestReading(row.patientId))
    );
    return res.json([
      {
        id: row.patientId,
        patientId: row.patientId,
        name: row.name,
        age: row.age,
        gender: row.gender,
        condition: row.condition,
        status: row.status,
        riskLevel: prediction.riskLevel || "Unknown",
        lastVisit: row.lastActiveAt,
      },
    ]);
  }

  try {
    const normalized = await buildPatientListWithRisk();
    return res.json(normalized);
  } catch (err) {
    return res.status(500).json({ message: "Unable to fetch patients" });
  }
});

app.get("/api/patient/:id", authMiddleware, async (req, res) => {
  if (req.user.role === Roles.FAMILY && req.user.linkedPatientId !== req.params.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const payload = await buildPatientPayload(req.params.id);
  res.json(payload);
});

app.get("/api/patient/:id/live", authMiddleware, async (req, res) => {
  if (req.user.role === Roles.FAMILY && req.user.linkedPatientId !== req.params.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const reading = await getLatestReading(req.params.id);
  res.json(readingToLiveResponse(reading));
});

app.get("/api/patient/:id/prediction", authMiddleware, async (req, res) => {
  if (req.user.role === Roles.FAMILY && req.user.linkedPatientId !== req.params.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const reading = await getLatestReading(req.params.id);
  const liveData = readingToLiveResponse(reading);
  const prediction = await predictRisk(liveData);
  res.json({ ...prediction, lastUpdatedAt: liveData.lastUpdatedAt, isStale: liveData.isStale });
});

io.on("connection", () => {
  // no-op for now
});

const start = async () => {
  server.listen(8000, () => {
    console.log("Server running on port 8000");
  });

  const connectMongoWithRetry = async () => {
    try {
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      isMongoConnected = true;
      console.log("Connected to MongoDB");
      await ensureBootstrapUsers();
    } catch (err) {
      isMongoConnected = false;
      console.error("MongoDB connection failed, retrying in 10s:", err.message);
      setTimeout(connectMongoWithRetry, 10000);
    }
  };

  connectMongoWithRetry();
};

start().catch((err) => {
  console.error("Startup failed:", err.message);
  process.exit(1);
});
