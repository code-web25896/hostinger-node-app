import fs from "fs";
import path from "path";
import multer from "multer";

const uploadsRoot = path.resolve(
  process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads")
);
const imageDir = path.join(uploadsRoot, "images");
const documentDir = path.join(uploadsRoot, "documents");

fs.mkdirSync(imageDir, { recursive: true });
fs.mkdirSync(documentDir, { recursive: true });

const sanitize = (value) => value.replace(/[^a-zA-Z0-9.-]/g, "-").toLowerCase();

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const target = file.mimetype.startsWith("image/") ? imageDir : documentDir;
    cb(null, target);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    cb(null, `${Date.now()}-${sanitize(baseName)}${extension}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const accepted = file.mimetype.startsWith("image/") || [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ].includes(file.mimetype);

  if (!accepted) {
    return cb(new Error("Type de fichier non supporte"));
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

