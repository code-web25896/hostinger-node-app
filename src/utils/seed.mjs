import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db\.mjs";
import User from "../models/User\.mjs";
import Training from "../models/Training\.mjs";
import News from "../models/News\.mjs";
import StudentRecord from "../models/StudentRecord\.mjs";
import ContactRequest from "../models/ContactRequest\.mjs";
import EnrollmentRequest from "../models/EnrollmentRequest\.mjs";

dotenv.config();
await connectDB();

const trainings = [
  {
    title: "Microneedling",
    image: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
    description: "Formation pratique et theorique sur les protocoles visage, hygiene, indications et suivi cliente.",
    duration: "6 semaines",
    priceTND: 900,
    availability: ["En ligne", "Presentiel"]
  },
  {
    title: "Capillaire",
    image: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80",
    description: "Diagnostic capillaire, protocoles de soin, techniques d'application et accompagnement salon.",
    duration: "4 semaines",
    priceTND: 600,
    availability: ["En ligne", "Presentiel"]
  },
  {
    title: "Hydrafacial",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80",
    description: "Parcours premium pour maitriser la gestuelle Hydrafacial et l'experience cliente haut de gamme.",
    duration: "5 semaines",
    priceTND: 750,
    availability: ["En ligne", "Presentiel"]
  },
  {
    title: "Esthetique avancee",
    image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80",
    description: "Programme expert en soins avances, diagnostic de peau, protocoles cabine et suivi professionnel.",
    duration: "8 semaines",
    priceTND: 1200,
    availability: ["En ligne", "Presentiel"]
  },
  {
    title: "Suppression tatouage",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80",
    description: "Bases techniques, securite, consultation cliente et indications pratiques sur suppression de tatouage.",
    duration: "7 semaines",
    priceTND: 1000,
    availability: ["Presentiel"]
  },
  {
    title: "Soins visage",
    image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80",
    description: "Soins essentiels et avances, routines institut, protocoles anti-age et peau sensible.",
    duration: "4 semaines",
    priceTND: 550,
    availability: ["En ligne", "Presentiel"]
  },
  {
    title: "Coiffure professionnelle",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80",
    description: "Techniques coupe, brushing, coiffage evenementiel et service client salon.",
    duration: "6 semaines",
    priceTND: 800,
    availability: ["Presentiel"]
  }
];

await Promise.all([
  Training.deleteMany({}),
  News.deleteMany({}),
  StudentRecord.deleteMany({}),
  ContactRequest.deleteMany({}),
  EnrollmentRequest.deleteMany({}),
  User.deleteMany({})
]);

const insertedTrainings = await Training.insertMany(trainings);

const adminPassword = await bcrypt.hash("Admin@123", 10);
const studentPassword = await bcrypt.hash("Yasmine@123", 10);

const admin = await User.create({
  fullName: "Directrice L'Academie",
  email: "admin@academie.tn",
  password: adminPassword,
  role: "admin",
  phone: "95 466 836"
});

const student = await User.create({
  fullName: "Yasmine Ben Salem",
  email: "yasmine@academie.tn",
  password: studentPassword,
  role: "student",
  phone: "95 466 836",
  level: "Avance",
  formationMode: "Presentiel"
});

const advanced = insertedTrainings.find((item) => item.title === "Esthetique avancee");
const micro = insertedTrainings.find((item) => item.title === "Microneedling");
const hydra = insertedTrainings.find((item) => item.title === "Hydrafacial");

await StudentRecord.create({
  student: student._id,
  formation: advanced._id,
  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
  progressPercent: 75,
  hoursCompleted: 12,
  totalHours: 16,
  internship: "En cours",
  certificateStatus: "En cours d'acquisition",
  notes: [
    { module: "Pratique Microneedling", score: 18 },
    { module: "Theorie Peau", score: 16 },
    { module: "Hygiene & Securite", score: 19 }
  ],
  schedule: [
    { day: "LUN", dateLabel: "12", slot: "09:00 - 12:00", subject: "Pratique Soins Visage", room: "Salle 2", mode: "Presentiel" },
    { day: "MER", dateLabel: "14", slot: "14:00 - 16:00", subject: "Theorie Dermatologie", room: "En ligne", mode: "En ligne" }
  ],
  hrMessages: [
    { title: "Message Administration", message: "N'oubliez pas de ramener votre convention signee avant vendredi." },
    { title: "Message Administration", message: "Le cours de pratique aura lieu dans la salle 3." }
  ],
  documents: [
    { name: "Support_Cours_V1.pdf", size: "2.4 MB", fileType: "PDF", url: "#" },
    { name: "Protocole_Hydrafacial.docx", size: "1.1 MB", fileType: "DOC", url: "#" }
  ]
});

await News.insertMany([
  {
    title: "Nouvelle session Hydrafacial - Avril 2026",
    content: "Les inscriptions sont ouvertes pour une nouvelle cohorte Hydrafacial avec places limitees.",
    type: "Nouvelle formation",
    publishedBy: admin._id
  },
  {
    title: "Promotion printemps sur Microneedling",
    content: "Reduction exceptionnelle pour les inscriptions confirmees avant la fin du mois.",
    type: "Promotion",
    publishedBy: admin._id
  },
  {
    title: "Journee portes ouvertes a Tunis Belvedere",
    content: "Visite du centre, rencontre pedagogique et presentation des parcours presentiel et en ligne.",
    type: "Evenement",
    publishedBy: admin._id
  }
]);

await ContactRequest.insertMany([
  {
    fullName: "Safa Bouazizi",
    phone: "22 111 222",
    email: "safa@email.tn",
    message: "Je souhaite des details sur la formation capillaire et les horaires.",
    status: "Nouveau"
  },
  {
    fullName: "Meriem Trabelsi",
    phone: "55 333 444",
    email: "meriem@email.tn",
    message: "Pouvez-vous me rappeler pour la formule en ligne Hydrafacial ?",
    status: "Traite"
  }
]);

await EnrollmentRequest.insertMany([
  {
    fullName: "Safa B.",
    phone: "22 111 222",
    email: "safa@email.tn",
    mode: "Presentiel",
    training: advanced._id,
    notes: "Souhaite commencer en avril.",
    status: "Confirmee"
  },
  {
    fullName: "Lina M.",
    phone: "20 987 654",
    email: "lina@email.tn",
    mode: "En ligne",
    training: hydra._id,
    notes: "Disponible en soiree.",
    status: "En attente"
  },
  {
    fullName: "Amira S.",
    phone: "99 654 321",
    email: "amira@email.tn",
    mode: "Presentiel",
    training: micro._id,
    notes: "Recherche une certification rapide.",
    status: "Confirmee"
  }
]);

console.log("Seed termine");
process.exit(0);

