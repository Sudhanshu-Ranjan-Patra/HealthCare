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

// MongoDB connection
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

// Patient model
const patientSchema = new mongoose.Schema({
  patientId: { type: String, required: true, unique: true },
  name: String,
  age: Number,
  condition: String,
});

const Patient = mongoose.model("Patient", patientSchema);

let latestPatientData = {};

// ESP32 sends data here
app.post("/api/esp32-data", (req, res) => {
  const data = req.body;

  console.log("ESP32 Data:", data);

  // Save latest data
  latestPatientData = data;

  // Emit to frontend in real-time
  io.emit("patient-data", data);

  res.json({ message: "Data received" });
});

// Live data route
app.get("/api/patient/:id/live", (req, res) => {
  res.json({
    heartRate: latestPatientData.heartRate || 94,
    temperature: latestPatientData.temperature || 30.6,
    spo2: latestPatientData.spo2 || 97,
  });
});

// Prediction route - delegates to external ML service
app.get("/api/patient/:id/prediction", async (req, res) => {
  const payload = {
    heartRate: latestPatientData.heartRate || 80,
    temperature: latestPatientData.temperature || 98.6,
    spo2: latestPatientData.spo2 || 97,
    ecgMean: latestPatientData.ecgMean || 1.0,
  };

  const url =
    process.env.ML_SERVICE_URL ||
    "http://127.0.0.1:9000/predict";

  try {
    const response = await axios.post(url, payload);
    // Expecting { riskLevel, confidence, ... }
    res.json(response.data);
  } catch (error) {
    console.error(
      "Prediction error:",
      error.message
    );
    res.status(500).json({
      message: "Prediction service error",
    });
  }
});

// Frontend patient basic info route (from MongoDB)
app.get("/api/patient/:id", (req, res) => {
  const { id } = req.params;

  Patient.findOne({ patientId: id })
    .then((patient) => {
      if (!patient) {
        return res.status(404).json({
          message: "Patient not found",
        });
      }
      res.json(patient);
    })
    .catch((err) => {
      console.error("Error fetching patient:", err);
      res
        .status(500)
        .json({ message: "Server error" });
    });
});

io.on("connection", (socket) => {
  console.log("Frontend connected");
});

server.listen(8000, () => {
  console.log("Server running on port 8000");
});