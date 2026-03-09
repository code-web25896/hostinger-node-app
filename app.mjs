import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import morgan from "morgan";
import { fileURLToPath } from "url";
import { connectDB } from "./src/config/db.mjs";
import authRoutes from "./src/routes/authRoutes.mjs";
import trainingRoutes from "./src/routes/trainingRoutes.mjs";
import newsRoutes from "./src/routes/newsRoutes.mjs";
import studentRoutes from "./src/routes/studentRoutes.mjs";
import adminRoutes from "./src/routes/adminRoutes.mjs";
import publicRoutes from "./src/routes/publicRoutes.mjs";
import paymentRoutes, { konnectWebhookHandler } from "./src/routes/paymentRoutes.mjs";

dotenv.config();
await connectDB();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "uploads");
const publicDir = path.resolve(__dirname, "public");

fs.mkdirSync(path.join(uploadsDir, "images"), { recursive: true });
fs.mkdirSync(path.join(uploadsDir, "documents"), { recursive: true });

app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.get("/api/payments/konnect/webhook", konnectWebhookHandler);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/public", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/trainings", trainingRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);

app.use(express.static(publicDir));
app.get(/^\/(?!api|uploads).*/, (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || "Erreur serveur" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Application demarree sur http://localhost:${PORT}`);
});
