import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import morgan from "morgan";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import trainingRoutes from "./routes/trainingRoutes.js";
import newsRoutes from "./routes/newsRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";

dotenv.config();
await connectDB();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");
const frontendDist = path.resolve(__dirname, "../../frontend/dist");
const hasFrontendBuild = fs.existsSync(path.join(frontendDist, "index.html"));

fs.mkdirSync(path.join(uploadsDir, "images"), { recursive: true });
fs.mkdirSync(path.join(uploadsDir, "documents"), { recursive: true });

const clientUrl = process.env.CLIENT_URL || true;
app.use(cors({ origin: clientUrl, credentials: true }));
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

if (hasFrontendBuild) {
  app.use(express.static(frontendDist));
  app.get(/^\/(?!api|uploads).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || "Erreur serveur" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`API demarree sur http://localhost:${PORT}`);
});
