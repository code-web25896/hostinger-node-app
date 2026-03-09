import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

let pool;

const requiredEnv = ["MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD"];

const defaults = {
  admin: {
    fullName: "Direction Academie",
    email: "admin@academie.tn",
    password: "Admin@123",
    role: "admin",
    level: "Direction",
    formationMode: "Presentiel",
    phone: "95466836"
  },
  student: {
    fullName: "Yasmine Ben Salem",
    email: "yasmine@academie.tn",
    password: "Yasmine@123",
    role: "student",
    level: "Avance",
    formationMode: "Presentiel",
    phone: "95466836"
  },
  trainings: [
    {
      title: "Microneedling",
      image: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
      description: "Formation complete en microneedling avec protocole, hygiene et pratique sur modele.",
      duration: "3 jours",
      priceTND: 900,
      priceEUR: 290,
      availability: ["Presentiel", "En ligne"]
    },
    {
      title: "Hydrafacial",
      image: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=1200&q=80",
      description: "Hydrafacial professionnel avec diagnostic peau, extraction et protocoles premium.",
      duration: "2 jours",
      priceTND: 750,
      priceEUR: 240,
      availability: ["Presentiel", "En ligne"]
    },
    {
      title: "Esthetique avancee",
      image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80",
      description: "Parcours complet en soins avances, technologies esthetiques et relation cliente.",
      duration: "6 semaines",
      priceTND: 1200,
      priceEUR: 390,
      availability: ["Presentiel", "En ligne"]
    }
  ],
  news: [
    {
      title: "Nouvelle session de printemps",
      content: "Les inscriptions sont ouvertes pour la nouvelle session de formation professionnelle a Tunis Belvedere.",
      type: "Annonce"
    }
  ]
};

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(191) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    level_label VARCHAR(100) DEFAULT 'Debutant',
    formation_mode VARCHAR(50) DEFAULT 'Presentiel',
    role ENUM('admin','student') NOT NULL DEFAULT 'student',
    avatar_url TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS trainings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(191) NOT NULL,
    image TEXT,
    description TEXT,
    duration VARCHAR(100),
    price_tnd DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_eur DECIMAL(10,2) NOT NULL DEFAULT 0,
    availability_json TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS news (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(191) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(100) DEFAULT 'Annonce',
    published_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_news_user FOREIGN KEY (published_by) REFERENCES users(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS contact_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(191) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(191) NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Nouveau',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS enrollment_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(191) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(191) NOT NULL,
    password_hash VARCHAR(255) NULL,
    mode_label VARCHAR(50) DEFAULT 'Presentiel',
    training_id INT NOT NULL,
    notes TEXT,
    country_label VARCHAR(100) DEFAULT 'Tunisie',
    status VARCHAR(50) DEFAULT 'En attente',
    payment_status VARCHAR(50) DEFAULT 'En attente',
    payment_provider VARCHAR(50) DEFAULT 'Stripe',
    stripe_session_id VARCHAR(255) NULL,
    amount_value DECIMAL(10,2) DEFAULT 0,
    currency_code VARCHAR(10) DEFAULT 'EUR',
    paid_at TIMESTAMP NULL,
    student_user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_enrollment_training FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS student_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL UNIQUE,
    formation_id INT NULL,
    avatar_url TEXT NULL,
    progress_percent INT DEFAULT 0,
    hours_completed INT DEFAULT 0,
    total_hours INT DEFAULT 24,
    internship_label VARCHAR(100) DEFAULT 'En attente',
    certificate_status VARCHAR(100) DEFAULT 'En cours d''acquisition',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_record_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_record_training FOREIGN KEY (formation_id) REFERENCES trainings(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS student_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_record_id INT NOT NULL,
    module_name VARCHAR(191) NOT NULL,
    score INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_note_record FOREIGN KEY (student_record_id) REFERENCES student_records(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS student_schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_record_id INT NOT NULL,
    day_label VARCHAR(20),
    date_label VARCHAR(20),
    slot_label VARCHAR(100),
    subject VARCHAR(191) NOT NULL,
    room_label VARCHAR(100),
    mode_label VARCHAR(50) DEFAULT 'Presentiel',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_schedule_record FOREIGN KEY (student_record_id) REFERENCES student_records(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS student_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_record_id INT NOT NULL,
    name VARCHAR(191) NOT NULL,
    size_label VARCHAR(50),
    file_type VARCHAR(20),
    url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_document_record FOREIGN KEY (student_record_id) REFERENCES student_records(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS student_hr_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_record_id INT NOT NULL,
    title VARCHAR(191) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_hr_record FOREIGN KEY (student_record_id) REFERENCES student_records(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS student_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_record_id INT NOT NULL,
    subject VARCHAR(191) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_student_message_record FOREIGN KEY (student_record_id) REFERENCES student_records(id) ON DELETE CASCADE
  )`
];

const getPool = () => {
  if (!pool) {
    const missing = requiredEnv.filter((key) => !process.env[key]);
    if (missing.length) {
      throw new Error(`Variables MySQL manquantes: ${missing.join(", ")}`);
    }

    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: "utf8mb4"
    });
  }

  return pool;
};

export const query = async (sql, params = []) => {
  const [rows] = await getPool().execute(sql, params);
  return rows;
};

export const insert = async (sql, params = []) => {
  const [result] = await getPool().execute(sql, params);
  return result;
};

const ensureColumn = async (tableName, columnName, definition) => {
  const rows = await query("SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?", [tableName, columnName]);
  if (!rows[0]?.count) {
    await query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

const userFromRow = (row) => ({
  id: row.id,
  _id: String(row.id),
  fullName: row.full_name,
  email: row.email,
  phone: row.phone,
  level: row.level_label,
  formationMode: row.formation_mode,
  role: row.role,
  avatar: row.avatar_url
});

export const getUserById = async (id) => {
  const rows = await query("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
  return rows[0] ? userFromRow(rows[0]) : null;
};

export const getUserWithPasswordByEmail = async (email) => {
  const rows = await query("SELECT * FROM users WHERE email = ? LIMIT 1", [email.toLowerCase()]);
  if (!rows[0]) return null;
  return {
    ...userFromRow(rows[0]),
    passwordHash: rows[0].password_hash
  };
};

export const getStudentRecordBundle = async (studentId) => {
  const records = await query(
    `SELECT sr.*, u.full_name, u.email, u.phone, u.level_label, u.formation_mode,
            t.id AS training_id, t.title AS training_title, t.duration AS training_duration, t.price_tnd AS training_price_tnd, t.price_eur AS training_price_eur, t.image AS training_image
     FROM student_records sr
     INNER JOIN users u ON u.id = sr.student_id
     LEFT JOIN trainings t ON t.id = sr.formation_id
     WHERE sr.student_id = ?
     LIMIT 1`,
    [studentId]
  );

  if (!records[0]) return null;
  const record = records[0];
  const [notes, schedule, documents, hrMessages, studentMessages] = await Promise.all([
    query("SELECT * FROM student_notes WHERE student_record_id = ? ORDER BY created_at ASC", [record.id]),
    query("SELECT * FROM student_schedule WHERE student_record_id = ? ORDER BY created_at ASC", [record.id]),
    query("SELECT * FROM student_documents WHERE student_record_id = ? ORDER BY created_at ASC", [record.id]),
    query("SELECT * FROM student_hr_messages WHERE student_record_id = ? ORDER BY sent_at ASC", [record.id]),
    query("SELECT * FROM student_messages WHERE student_record_id = ? ORDER BY sent_at ASC", [record.id])
  ]);

  return {
    id: record.id,
    _id: String(record.id),
    student: {
      id: record.student_id,
      _id: String(record.student_id),
      fullName: record.full_name,
      email: record.email,
      phone: record.phone,
      level: record.level_label,
      formationMode: record.formation_mode
    },
    formation: record.training_id
      ? {
          id: record.training_id,
          _id: String(record.training_id),
          title: record.training_title,
          duration: record.training_duration,
          priceTND: Number(record.training_price_tnd),
          priceEUR: Number(record.training_price_eur),
          image: record.training_image
        }
      : null,
    avatar: record.avatar_url,
    progressPercent: record.progress_percent,
    hoursCompleted: record.hours_completed,
    totalHours: record.total_hours,
    internship: record.internship_label,
    certificateStatus: record.certificate_status,
    notes: notes.map((item) => ({ _id: String(item.id), module: item.module_name, score: item.score, createdAt: item.created_at })),
    schedule: schedule.map((item) => ({ _id: String(item.id), day: item.day_label, dateLabel: item.date_label, slot: item.slot_label, subject: item.subject, room: item.room_label, mode: item.mode_label })),
    documents: documents.map((item) => ({ _id: String(item.id), name: item.name, size: item.size_label, fileType: item.file_type, url: item.url })),
    hrMessages: hrMessages.map((item) => ({ _id: String(item.id), title: item.title, message: item.message, sentAt: item.sent_at })),
    studentMessages: studentMessages.map((item) => ({ _id: String(item.id), subject: item.subject, message: item.message, sentAt: item.sent_at }))
  };
};

const ensureSeedData = async () => {
  const [userCount] = await query("SELECT COUNT(*) AS count FROM users");
  if (userCount.count > 0) return;

  const adminHash = await bcrypt.hash(defaults.admin.password, 10);
  const studentHash = await bcrypt.hash(defaults.student.password, 10);

  const adminResult = await insert(
    `INSERT INTO users (full_name, email, password_hash, phone, level_label, formation_mode, role)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [defaults.admin.fullName, defaults.admin.email, adminHash, defaults.admin.phone, defaults.admin.level, defaults.admin.formationMode, defaults.admin.role]
  );

  const studentResult = await insert(
    `INSERT INTO users (full_name, email, password_hash, phone, level_label, formation_mode, role, avatar_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [defaults.student.fullName, defaults.student.email, studentHash, defaults.student.phone, defaults.student.level, defaults.student.formationMode, defaults.student.role, "/logo.jpeg"]
  );

  const trainingIds = [];
  for (const training of defaults.trainings) {
    const result = await insert(
      `INSERT INTO trainings (title, image, description, duration, price_tnd, price_eur, availability_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [training.title, training.image, training.description, training.duration, training.priceTND, training.priceEUR, JSON.stringify(training.availability)]
    );
    trainingIds.push(result.insertId);
  }

  for (const item of defaults.news) {
    await insert(`INSERT INTO news (title, content, type, published_by) VALUES (?, ?, ?, ?)`, [item.title, item.content, item.type, adminResult.insertId]);
  }

  const recordResult = await insert(
    `INSERT INTO student_records (student_id, formation_id, avatar_url, progress_percent, hours_completed, total_hours, internship_label, certificate_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [studentResult.insertId, trainingIds[2] || trainingIds[0] || null, "/logo.jpeg", 75, 12, 24, "En cours", "En cours d'acquisition"]
  );

  await insert(
    `INSERT INTO student_notes (student_record_id, module_name, score) VALUES
     (?, 'Pratique Microneedling', 18),
     (?, 'Theorie Peau', 16),
     (?, 'Hygiene & Securite', 19)`,
    [recordResult.insertId, recordResult.insertId, recordResult.insertId]
  );

  await insert(
    `INSERT INTO student_schedule (student_record_id, day_label, date_label, slot_label, subject, room_label, mode_label) VALUES
     (?, 'LUN', '12', '09:00 - 12:00', 'Pratique Soins Visage', 'Salle 2', 'Presentiel'),
     (?, 'MER', '14', '14:00 - 16:00', 'Theorie Dermatologie', 'Salle 3', 'En ligne')`,
    [recordResult.insertId, recordResult.insertId]
  );

  await insert(
    `INSERT INTO student_documents (student_record_id, name, size_label, file_type, url) VALUES
     (?, 'Support_Cours_V1.pdf', '2.4 MB', 'PDF', '#'),
     (?, 'Protocole_Hydrafacial.docx', '1.1 MB', 'DOCX', '#')`,
    [recordResult.insertId, recordResult.insertId]
  );

  await insert(
    `INSERT INTO student_hr_messages (student_record_id, title, message) VALUES
     (?, 'Rappel Convention de stage', 'N''oubliez pas de ramener votre convention signee avant vendredi.'),
     (?, 'Changement de salle', 'Le cours de pratique aura lieu dans la salle 3.')`,
    [recordResult.insertId, recordResult.insertId]
  );
};

export const connectDB = async () => {
  const connection = getPool();
  await connection.query("SELECT 1");
  for (const statement of schemaStatements) {
    await connection.query(statement);
  }
  await ensureColumn("trainings", "price_eur", "DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER price_tnd");
  await ensureColumn("enrollment_requests", "password_hash", "VARCHAR(255) NULL AFTER email");
  await ensureColumn("enrollment_requests", "country_label", "VARCHAR(100) DEFAULT 'Tunisie' AFTER notes");
  await ensureColumn("enrollment_requests", "payment_status", "VARCHAR(50) DEFAULT 'En attente' AFTER status");
  await ensureColumn("enrollment_requests", "payment_provider", "VARCHAR(50) DEFAULT 'Stripe' AFTER payment_status");
  await ensureColumn("enrollment_requests", "stripe_session_id", "VARCHAR(255) NULL AFTER payment_provider");
  await ensureColumn("enrollment_requests", "amount_value", "DECIMAL(10,2) DEFAULT 0 AFTER stripe_session_id");
  await ensureColumn("enrollment_requests", "currency_code", "VARCHAR(10) DEFAULT 'EUR' AFTER amount_value");
  await ensureColumn("enrollment_requests", "paid_at", "TIMESTAMP NULL AFTER currency_code");
  await ensureColumn("enrollment_requests", "student_user_id", "INT NULL AFTER paid_at");
  await query("UPDATE trainings SET price_eur = CASE WHEN title = 'Microneedling' THEN 290 WHEN title = 'Hydrafacial' THEN 240 WHEN title = 'Esthetique avancee' THEN 390 ELSE ROUND(price_tnd / 3.2, 0) END WHERE price_eur = 0");
  await ensureSeedData();
  console.log(`MySQL connecte: ${process.env.MYSQL_HOST}/${process.env.MYSQL_DATABASE}`);
};
