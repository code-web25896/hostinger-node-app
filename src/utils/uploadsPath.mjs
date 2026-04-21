import fs from "fs";
import path from "path";

const uniqueCandidates = (values) => {
  const seen = new Set();
  return values.filter((value) => {
    if (!value) return false;
    const normalized = path.resolve(value);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

export const resolveUploadsRoot = ({ appDir = process.cwd() } = {}) => {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const hostingerPersistentDir = process.env.HOSTINGER_PERSISTENT_DIR
    ? path.resolve(process.env.HOSTINGER_PERSISTENT_DIR)
    : "";

  const candidates = uniqueCandidates([
    process.env.UPLOADS_DIR,
    hostingerPersistentDir ? path.join(hostingerPersistentDir, "uploads") : "",
    process.env.NODE_ENV === "production" && homeDir
      ? path.join(homeDir, "academy-storage", "uploads")
      : "",
    path.join(appDir, "uploads")
  ]);

  for (const candidate of candidates) {
    try {
      const resolved = path.resolve(candidate);
      fs.mkdirSync(path.join(resolved, "images"), { recursive: true });
      fs.mkdirSync(path.join(resolved, "documents"), { recursive: true });
      fs.accessSync(resolved, fs.constants.R_OK | fs.constants.W_OK);
      return resolved;
    } catch (error) {
      console.warn(`[uploads] unavailable path skipped: ${candidate} (${error.message})`);
    }
  }

  const fallbackDir = path.resolve(path.join(appDir, "uploads"));
  fs.mkdirSync(path.join(fallbackDir, "images"), { recursive: true });
  fs.mkdirSync(path.join(fallbackDir, "documents"), { recursive: true });
  return fallbackDir;
};
