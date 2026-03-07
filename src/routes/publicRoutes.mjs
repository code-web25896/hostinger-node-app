import express from "express";
import ContactRequest from "../models/ContactRequest\.mjs";
import EnrollmentRequest from "../models/EnrollmentRequest\.mjs";
import Training from "../models/Training\.mjs";
import News from "../models/News\.mjs";

const router = express.Router();

router.get("/search", async (req, res) => {
  const keyword = (req.query.q || "").trim();

  if (!keyword) {
    return res.json({ trainings: [], news: [] });
  }

  const pattern = new RegExp(keyword, "i");
  const [trainings, news] = await Promise.all([
    Training.find({
      $or: [{ title: pattern }, { description: pattern }]
    }).sort({ createdAt: -1 }),
    News.find({
      $or: [{ title: pattern }, { content: pattern }, { type: pattern }]
    }).sort({ createdAt: -1 })
  ]);

  res.json({ trainings, news });
});

router.get("/enrollments/status", async (req, res) => {
  const email = (req.query.email || "").trim().toLowerCase();
  const phone = (req.query.phone || "").trim();

  if (!email || !phone) {
    return res.status(400).json({ message: "Email et numero obligatoires" });
  }

  const enrollments = await EnrollmentRequest.find({ email, phone })
    .populate("training", "title priceTND")
    .sort({ createdAt: -1 });

  res.json(enrollments);
});

router.post("/contact", async (req, res) => {
  const contact = await ContactRequest.create(req.body);
  res.status(201).json({ message: "Votre message a ete envoye.", contact });
});

router.post("/enrollments", async (req, res) => {
  const training = await Training.findById(req.body.trainingId);
  if (!training) {
    return res.status(404).json({ message: "Formation introuvable" });
  }

  const enrollment = await EnrollmentRequest.create({
    fullName: req.body.fullName,
    phone: req.body.phone,
    email: req.body.email,
    mode: req.body.mode,
    training: training._id,
    notes: req.body.notes || ""
  });

  res.status(201).json({ message: "Demande d'inscription envoyee.", enrollment });
});

export default router;

