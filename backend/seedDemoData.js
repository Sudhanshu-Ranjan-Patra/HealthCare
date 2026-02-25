/* eslint-env node */

const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/healthcare";

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

const firstNames = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Krishna", "Ishaan", "Rohan", "Kabir",
  "Anaya", "Diya", "Aadhya", "Myra", "Ira", "Saanvi", "Kiara", "Riya", "Meera", "Naina",
];

const lastNames = [
  "Sharma", "Verma", "Patel", "Singh", "Gupta", "Kumar", "Das", "Sinha", "Mehta", "Nair",
];

const conditions = [
  "Hypertension",
  "Diabetes Type 2",
  "Asthma",
  "Coronary Artery Disease",
  "COPD",
  "Hypothyroidism",
  "Chronic Kidney Disease",
  "Arrhythmia",
  "Migraine",
  "Post-Surgery Recovery",
];

const toPatientId = (n) => `PT${String(n).padStart(3, "0")}`;

const createPatients = () => {
  const now = Date.now();
  const genders = ["Male", "Female"];
  const statuses = ["active", "follow-up", "discharged"];

  return Array.from({ length: 50 }, (_, i) => {
    const index = i + 1;
    const patientId = toPatientId(index);
    const name = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
    const age = 18 + ((i * 3) % 60);
    const gender = genders[i % genders.length];
    const status = statuses[i % statuses.length];
    const condition = conditions[i % conditions.length];
    const lastActiveAt = new Date(now - ((i % 12) * 30 + (i % 5) * 7) * 60 * 1000);
    const address = `${100 + i} Health Street, Sector ${1 + (i % 9)}, Metro City`;
    const phoneNumber = `+1-555-${String(1000 + i).padStart(4, "0")}`;
    const familyMembers = [
      {
        name: `Parent of ${name}`,
        relation: "Parent",
        phoneNumber: `+1-555-${String(2000 + i).padStart(4, "0")}`,
      },
      {
        name: `Sibling of ${name}`,
        relation: "Sibling",
        phoneNumber: `+1-555-${String(3000 + i).padStart(4, "0")}`,
      },
    ];
    const medicalHistory = [
      {
        date: new Date(lastActiveAt.getTime() - 30 * 24 * 60 * 60 * 1000),
        note: "Routine follow-up visit completed.",
      },
      {
        date: new Date(lastActiveAt.getTime() - 75 * 24 * 60 * 60 * 1000),
        note: "Medication plan adjusted based on vitals trend.",
      },
    ];
    const photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=0f766e&color=ffffff`;

    return {
      patientId,
      name,
      age,
      gender,
      status,
      condition,
      address,
      phoneNumber,
      photoUrl,
      familyMembers,
      medicalHistory,
      lastActiveAt,
    };
  });
};

const createReadings = (patients) => {
  return patients.flatMap((patient, i) => {
    return Array.from({ length: 3 }, (_, j) => {
      const recordedAt = new Date(
        patient.lastActiveAt.getTime() - (2 - j) * 5 * 60 * 1000
      );

      return {
        patientId: patient.patientId,
        heartRate: 68 + ((i * 7 + j * 3) % 35),
        temperature: Number((97.0 + ((i + j) % 5) * 0.4).toFixed(1)),
        spo2: 94 + ((i + j) % 6),
        ecgMean: Number((0.7 + ((i * 11 + j) % 20) / 10).toFixed(2)),
        recordedAt,
      };
    });
  });
};

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });

    const patients = createPatients();
    const readings = createReadings(patients);

    await Patient.deleteMany({ patientId: { $in: patients.map((p) => p.patientId) } });
    await SensorReading.deleteMany({ patientId: { $in: patients.map((p) => p.patientId) } });

    await Patient.insertMany(patients);
    await SensorReading.insertMany(readings);

    console.log(`Seeded ${patients.length} patients and ${readings.length} sensor readings.`);
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
