import express from "express";
import { auth } from "../middleware/auth.mjs";
import { requireRole } from "../middleware/role.mjs";
import { insert, query } from "../config/db.mjs";

const router = express.Router();

const normalizeImage = (value, title = "") => {
  let image = (value || "").trim();
  if (
    !image ||
    image.includes("unsplash.com") ||
    ["/logo.jpeg", "logo.jpeg", "/picpro.jpeg", "picpro.jpeg", "/foundatrice.jpeg", "foundatrice.jpeg", "/brand-logo.svg", "brand-logo.svg", "/logo-academie.svg", "logo-academie.svg"].includes(image)
  ) {
    const t = (title || "").toLowerCase();
    if (t.includes("microneedling")) return "/formation-microneedling.jpeg";
    if (t.includes("hydrafacial") || t.includes("soin visage")) return "/formation-soin-visage.jpeg";
    if (t.includes("laser") && t.includes("pack")) return "/master-pack-laser.jpeg";
    if (t.includes("laser") || t.includes("epilation") || t.includes("épilation")) return "/formation-epilation-laser.jpeg";
    if (t.includes("hifu")) return "/formation-hifu.jpeg";
    if (t.includes("hyaluron")) return "/formation-hyaluron-pen.jpeg";
    if (t.includes("radio") || t.includes("oxy")) return "/radio-frequence-oxygeneo.jpeg";
    if (t.includes("pro") || t.includes("master")) return "/formation-pro-training.jpeg";
    if (t.includes("esth") || t.includes("avancee") || t.includes("avancée")) return "/backgroundesthetique.jpeg";
    return "/formation-microneedling.jpeg";
  }
  if (image.startsWith("/uploads/")) return image;
  if (image.startsWith("uploads/")) return `/${image}`;
  const uploadsIndex = image.indexOf("/uploads/");
  if (uploadsIndex >= 0) return image.slice(uploadsIndex);
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(image)) {
    const match = image.match(/\/uploads\/.+$/i);
    if (match) return match[0];
  }
  return image;
};

export const DEFAULT_ALL_TRAININGS = [
  {
    id: 1,
    _id: "1",
    title: "Microneedling & BB Glow Cutané",
    image: "/formation-microneedling.jpeg",
    description: "Induction de collagène par micro-perforations contrôlées, traitement des cicatrices, vergetures, hyperpigmentations et unification du teint BB Glow.",
    category: "Dermo-esthétique",
    duration: "2 jours",
    priceTND: 850,
    priceEUR: 275,
    availability: ["Présentiel", "En ligne"]
  },
  {
    id: 2,
    _id: "2",
    title: "Hydrafacial & Dermo-Nettoyage Profond",
    image: "/formation-soin-visage.jpeg",
    description: "Protocole signature complet en hydro-dermabrasion, peeling doux, extraction des comédons, infusion de sérums vitaminés et luminothérapie LED.",
    category: "Soins visage",
    duration: "2 jours",
    priceTND: 750,
    priceEUR: 240,
    availability: ["Présentiel", "En ligne"]
  },
  {
    id: 3,
    _id: "3",
    title: "Esthétique Avancée Professionnelle",
    image: "/backgroundesthetique.jpeg",
    description: "Formation intensive complète aux soins dermo-esthétiques modernes : diagnostic cutané, protocoles anti-âge, peeling aux acides de fruits et soins régénérants.",
    category: "Esthétique avancée",
    duration: "4 semaines",
    priceTND: 1200,
    priceEUR: 390,
    availability: ["Présentiel", "En ligne"]
  },
  {
    id: 4,
    _id: "4",
    title: "Épilation Laser Diode & Alexandrite",
    image: "/formation-epilation-laser.jpeg",
    description: "Formation certifiante complète en épilation définitive laser diode & alexandrite. Protocoles de sécurité, réglages longueurs d'ondes, phototypes et pratique réelle.",
    category: "Laser & IPL",
    duration: "3 jours",
    priceTND: 1200,
    priceEUR: 390,
    availability: ["Présentiel", "En ligne"]
  },
  {
    id: 5,
    _id: "5",
    title: "HIFU Lifting Non-Chirurgical & Remodelage",
    image: "/formation-hifu.jpeg",
    description: "Maîtrise des ultrasons focalisés de haute intensité (HIFU) visage & corps. Rajeunissement cutané profond, cartouches multi-profondeurs et protocoles anti-âge.",
    category: "Anti-Âge Haute Technologie",
    duration: "2 jours",
    priceTND: 1100,
    priceEUR: 350,
    availability: ["Présentiel", "En ligne"]
  },
  {
    id: 6,
    _id: "6",
    title: "Hyaluron Pen & Volumétrie des Lèvres",
    image: "/formation-hyaluron-pen.jpeg",
    description: "Technique d'injection sans aiguille par pression d'acide hyaluronique. Comblement des ridules, hydratation profonde et augmentation subtile du volume labial.",
    category: "Dermo-esthétique",
    duration: "2 jours",
    priceTND: 950,
    priceEUR: 310,
    availability: ["Présentiel", "En ligne"]
  },
  {
    id: 7,
    _id: "7",
    title: "Master Pro Esthétique Avancée & Gestion d'Institut",
    image: "/formation-pro-training.jpeg",
    description: "Cursus d'élite complet pour futures cheffes d'institut : diagnostic cutané high-tech, maîtrise de 7 technologies, hygiène médicale et gestion commerciale rentable.",
    category: "Expertise & Innovation",
    duration: "6 semaines",
    priceTND: 1800,
    priceEUR: 580,
    availability: ["Présentiel", "En ligne"]
  },
  {
    id: 8,
    _id: "8",
    title: "Soin Visage Expert & Hydrafacial 7 en 1",
    image: "/formation-soin-visage.jpeg",
    description: "Protocole haute technologie 7-en-1 : hydro-peeling, ultrasons, radiofréquence, marteau cryo et pulvérisation d'oxygène pur pour un éclat immédiat.",
    category: "Soins visage",
    duration: "3 jours",
    priceTND: 850,
    priceEUR: 275,
    availability: ["Présentiel", "En ligne"]
  },
  {
    id: 9,
    _id: "9",
    title: "Master Pack Laser & Nouvelles Technologies 2026",
    image: "/master-pack-laser.jpeg",
    description: "Le cursus ultime combinant Laser Diode, HIFU 7D, Radiofréquence fractionnée et Cryolipolyse. Devenez une référence technique incontournable.",
    category: "Technologies esthétiques",
    duration: "5 jours",
    priceTND: 2200,
    priceEUR: 710,
    availability: ["Présentiel", "En ligne"]
  },
  {
    id: 10,
    _id: "10",
    title: "Radiofréquence & Oxygénéo Révolution",
    image: "/radio-frequence-oxygeneo.jpeg",
    description: "Soin 3-en-1 stimulant la production naturelle de collagène par oxygénation sous-cutanée, exfoliation douce et resserrement tissulaire radiofréquence.",
    category: "Technologies esthétiques",
    duration: "2 jours",
    priceTND: 900,
    priceEUR: 290,
    availability: ["Présentiel", "En ligne"]
  }
];

const mapTraining = (row) => ({
  id: row.id,
  _id: String(row.id),
  title: row.title,
  image: normalizeImage(row.image, row.title),
  description: row.description,
  category: row.category_label,
  duration: row.duration,
  priceTND: Number(row.price_tnd),
  priceEUR: Number(row.price_eur),
  availability: row.availability_json ? (typeof row.availability_json === "string" ? JSON.parse(row.availability_json) : row.availability_json) : ["Présentiel", "En ligne"]
});

router.get("/", async (_req, res) => {
  try {
    let trainings = await query("SELECT * FROM trainings ORDER BY price_tnd ASC, id ASC");
    if (!trainings) trainings = [];

    // Identifier les formations par défaut manquantes
    const existingTitles = new Set(trainings.map((t) => (t.title || "").toLowerCase().trim()));
    const missing = DEFAULT_ALL_TRAININGS.filter((d) => {
      const dt = d.title.toLowerCase().trim();
      if (existingTitles.has(dt)) return false;
      return !trainings.some((t) => {
        const tt = (t.title || "").toLowerCase().trim();
        return (tt === "microneedling" && dt.includes("microneedling")) ||
               (tt === "hydrafacial" && dt.includes("hydrafacial & dermo")) ||
               (tt.includes("esthetique avancee") && dt.includes("esthétique avancée pro"));
      });
    });

    // Auto-insérer les formations manquantes dans MySQL pour pérenniser
    for (const item of missing) {
      try {
        await insert(
          `INSERT INTO trainings (title, image, description, category_label, duration, price_tnd, price_eur, availability_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.title, item.image, item.description, item.category, item.duration, item.priceTND, item.priceEUR, JSON.stringify(item.availability)]
        );
      } catch (_e) {}
    }

    if (missing.length > 0) {
      try {
        const refreshed = await query("SELECT * FROM trainings ORDER BY price_tnd ASC, id ASC");
        if (refreshed && refreshed.length) trainings = refreshed;
      } catch (_e) {}
    }

    if (trainings.length >= 7) {
      return res.json(trainings.map(mapTraining));
    }

    return res.json(DEFAULT_ALL_TRAININGS);
  } catch (error) {
    console.error("Erreur DB trainings, utilisation des 10 formations par défaut:", error.message);
    res.json(DEFAULT_ALL_TRAININGS);
  }
});

router.post("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const { title, image, description, category, duration, priceTND, priceEUR, availability = [] } = req.body;
    const result = await insert(
      `INSERT INTO trainings (title, image, description, category_label, duration, price_tnd, price_eur, availability_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, normalizeImage(image), description, category || "Esthetique avancee", duration, Number(priceTND || 0), Number(priceEUR || 0), JSON.stringify(availability)]
    );
    const [training] = await query("SELECT * FROM trainings WHERE id = ?", [result.insertId]);
    res.status(201).json(mapTraining(training));
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || "Erreur lors de la creation de la formation" });
  }
});

router.put("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const { title, image, description, category, duration, priceTND, priceEUR, availability = [] } = req.body;
    const result = await insert(
      `UPDATE trainings
       SET title = ?, image = ?, description = ?, category_label = ?, duration = ?, price_tnd = ?, price_eur = ?, availability_json = ?
       WHERE id = ?`,
      [title, normalizeImage(image), description, category || "Esthetique avancee", duration, Number(priceTND || 0), Number(priceEUR || 0), JSON.stringify(availability), req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Formation introuvable" });
    const [training] = await query("SELECT * FROM trainings WHERE id = ?", [req.params.id]);
    if (!training) return res.status(404).json({ message: "Formation introuvable" });
    res.json(mapTraining(training));
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || "Erreur lors de la modification de la formation" });
  }
});

router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const result = await insert("DELETE FROM trainings WHERE id = ?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Formation introuvable" });
    res.json({ message: "Formation supprimee" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || "Erreur lors de la suppression de la formation" });
  }
});

export default router;
