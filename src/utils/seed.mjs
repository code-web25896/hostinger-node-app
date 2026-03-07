import dotenv from "dotenv";
import { connectDB } from "../config/db.mjs";

dotenv.config();
await connectDB();
console.log("Base MySQL initialisee.");
process.exit(0);
