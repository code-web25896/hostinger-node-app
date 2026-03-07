import express from "express";
import path from "path";
import User from "../models/User\.mjs";
import News from "../models/News\.mjs";
import Training from "../models/Training\.mjs";
import StudentRecord from "../models/StudentRecord\.mjs";
import ContactRequest from "../models/ContactRequest\.mjs";
import EnrollmentRequest from "../models/EnrollmentRequest\.mjs";
import { auth } from "../middleware/auth\.mjs";
import { requireRole } from "../middleware/role\.mjs";
import { upload } from "../middleware/upload\.mjs";

const router = express.Router();

router.use(auth, requireRole("admin"));

const absoluteUrl = (req, filename, folder) => `${req.protocol}://${req.get("host")}/uploads/${folder}/${filename}`;

router.get("/student-records", async (_req, res) => {
  const records = await StudentRecord.find()
    .populate("student", "fullName email level formationMode")
    .populate("formation", "title")
    .sort({ updatedAt: -1 });

  res.json(records);
});

router.post("/uploads/training-image", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Fichier manquant" });
  }

  res.status(201).json({
    message: "Image televersee.",
    url: absoluteUrl(req, req.file.filename, "images")
  });
});

router.post("/students/:id/documents", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Fichier manquant" });
  }

  const extension = path.extname(req.file.originalname).replace(".", "").toUpperCase() || "FILE";
  const record = await StudentRecord.findOneAndUpdate(
    { student: req.params.id },
    {
      $push: {
        documents: {
          name: req.file.originalname,
          size: `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`,
          fileType: extension,
          url: absoluteUrl(req, req.file.filename, "documents")
        }
      }
    },
    { new: true, upsert: true }
  );

  res.status(201).json({ message: "Document ajoute.", record });
});

router.get("/students", async (_req, res) => {
  const students = await User.find({ role: "student" }).select("-password").sort({ createdAt: -1 });
  res.json(students);
});

router.get("/contacts", async (_req, res) => {
  const contacts = await ContactRequest.find().sort({ createdAt: -1 });
  res.json(contacts);
});

router.get("/enrollments", async (_req, res) => {
  const enrollments = await EnrollmentRequest.find().populate("training", "title priceTND").sort({ createdAt: -1 });
  res.json(enrollments);
});

router.patch("/enrollments/:id", async (req, res) => {
  const updated = await EnrollmentRequest.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).populate("training", "title priceTND");
  if (!updated) return res.status(404).json({ message: "Demande introuvable" });
  res.json(updated);
});

router.delete("/enrollments/:id", async (req, res) => {
  const deleted = await EnrollmentRequest.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Demande introuvable" });
  res.json({ message: "Demande supprimee" });
});

router.patch("/contacts/:id", async (req, res) => {
  const updated = await ContactRequest.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!updated) return res.status(404).json({ message: "Message introuvable" });
  res.json(updated);
});

router.put("/students/:id", async (req, res) => {
  const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true }).select("-password");
  if (!updated) return res.status(404).json({ message: "Eleve introuvable" });
  res.json(updated);
});

router.delete("/students/:id", async (req, res) => {
  await StudentRecord.findOneAndDelete({ student: req.params.id });
  const deleted = await User.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Eleve introuvable" });
  res.json({ message: "Eleve supprime" });
});

router.post("/students/:id/notes", async (req, res) => {
  const { module, score } = req.body;

  if (!module?.trim()) {
    return res.status(400).json({ message: "Le module est obligatoire" });
  }

  const record = await StudentRecord.findOneAndUpdate(
    { student: req.params.id },
    { $push: { notes: { module, score } }, $inc: { progressPercent: 5, hoursCompleted: 1 } },
    { new: true, upsert: true }
  );
  res.json(record);
});

router.post("/students/:id/schedule", async (req, res) => {
  const { day, dateLabel, slot, subject, room, mode } = req.body;

  if (!subject?.trim()) {
    return res.status(400).json({ message: "La matiere est obligatoire" });
  }

  const record = await StudentRecord.findOneAndUpdate(
    { student: req.params.id },
    { $push: { schedule: { day, dateLabel, slot, subject, room, mode } } },
    { new: true, upsert: true }
  );
  res.json(record);
});

router.post("/students/:id/message", async (req, res) => {
  const { title, message } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ message: "Le message Administration est obligatoire" });
  }

  const record = await StudentRecord.findOneAndUpdate(
    { student: req.params.id },
    { $push: { hrMessages: { title: title || "Message Administration", message } } },
    { new: true, upsert: true }
  );
  res.json(record);
});

router.post("/students/:id/assign-training", async (req, res) => {
  const { trainingId } = req.body;
  const record = await StudentRecord.findOneAndUpdate(
    { student: req.params.id },
    { formation: trainingId, progressPercent: 20 },
    { new: true, upsert: true }
  ).populate("formation", "title");

  res.json(record);
});

router.get("/stats", async (_req, res) => {
  const [students, trainings, posts, online, certificates, contacts, enrollments] = await Promise.all([
    User.countDocuments({ role: "student" }),
    Training.countDocuments(),
    News.countDocuments(),
    User.countDocuments({ role: "student", formationMode: "En ligne" }),
    StudentRecord.countDocuments({ certificateStatus: "Certificat delivre" }),
    ContactRequest.countDocuments({ status: "Nouveau" }),
    EnrollmentRequest.countDocuments({ status: "En attente" })
  ]);

  res.json({
    students,
    trainings,
    posts,
    online,
    onsite: students - online,
    certificates,
    newContacts: contacts,
    pendingEnrollments: enrollments
  });
});

export default router;

