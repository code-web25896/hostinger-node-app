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

  return path.resolve(candidates[0] || path.join(appDir, "uploads"));
};
