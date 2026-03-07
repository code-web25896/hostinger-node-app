import mongoose from "mongoose";

const studentRecordSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    formation: { type: mongoose.Schema.Types.ObjectId, ref: "Training" },
    avatar: { type: String, default: "" },
    progressPercent: { type: Number, default: 0 },
    hoursCompleted: { type: Number, default: 0 },
    totalHours: { type: Number, default: 24 },
    notes: [
      {
        module: String,
        score: Number
      }
    ],
    internship: { type: String, default: "Non commence" },
    schedule: [
      {
        day: String,
        dateLabel: String,
        slot: String,
        subject: String,
        room: String,
        mode: String
      }
    ],
    hrMessages: [
      {
        title: { type: String, default: "Message Administration" },
        message: String,
        sentAt: { type: Date, default: Date.now }
      }
    ],
    studentMessages: [
      {
        subject: { type: String, default: "Message eleve" },
        message: String,
        sentAt: { type: Date, default: Date.now }
      }
    ],
    documents: [
      {
        name: String,
        size: String,
        fileType: String,
        url: String
      }
    ],
    certificateStatus: { type: String, default: "En cours d'acquisition" }
  },
  { timestamps: true }
);

export default mongoose.model("StudentRecord", studentRecordSchema);
