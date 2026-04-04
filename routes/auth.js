// routes/auth.js
const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const Database   = require('better-sqlite3');
const path       = require('path');

const db = new Database(path.join(__dirname, '..', 'cvs.db'));

// Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nom        TEXT    NOT NULL,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    verifie    INTEGER DEFAULT 0,
    cree_le    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS codes_verification (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT    NOT NULL,
    code       TEXT    NOT NULL,
    expire_le  DATETIME NOT NULL,
    utilise    INTEGER DEFAULT 0
  );
`);

const JWT_SECRET = process.env.JWT_SECRET || 'cvgen-secret-2024';

// ── Transporteur Email ────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ── Générer un code à 6 chiffres ──────────────────────────────────────────
function genererCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── Vérifier la force du mot de passe ────────────────────────────────────
function verifierMotDePasse(password) {
  if (password.length < 8) return 'Le mot de passe doit faire au moins 8 caractères.';
  if (!/[A-Z]/.test(password)) return 'Le mot de passe doit contenir au moins une majuscule.';
  if (!/[0-9]/.test(password)) return 'Le mot de passe doit contenir au moins un chiffre.';
  if (!/[!@#$%^&*()_+\-=\[\]{};:,.<>?]/.test(password)) return 'Le mot de passe doit contenir au moins un symbole (!@#$...).';
  return null;
}

// ── Envoyer le code par email ─────────────────────────────────────────────
async function envoyerCode(email, code, nom) {
  await transporter.sendMail({
    from: `"CVGen Pro" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Ton code de vérification CVGen Pro',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#faf8f4;border-radius:12px">
        <h1 style="font-size:24px;color:#0f0e0d;margin-bottom:8px">CVGen Pro</h1>
        <p style="color:#7a7672;margin-bottom:24px">Bonjour ${nom} 👋</p>
        <p style="color:#3a3835;margin-bottom:16px">Voici ton code de vérification :</p>
        <div style="background:#c8622a;color:#fff;font-size:32px;font-weight:700;letter-spacing:8px;text-align:center;padding:20px;border-radius:8px;margin-bottom:24px">
          ${code}
        </div>
        <p style="color:#7a7672;font-size:13px">Ce code expire dans <strong>10 minutes</strong>.</p>
        <p style="color:#7a7672;font-size:13px">Si tu n'as pas créé de compte, ignore cet email.</p>
      </div>
    `
  });
}

// ─── POST /api/auth/inscription ──────────────────────────────────────────
router.post('/inscription', async (req, res) => {
  try {
    const { nom, email, password } = req.body;

    if (!nom || !email || !password) {
      return res.status(400).json({ erreur: 'Tous les champs sont obligatoires.' });
    }

    // Vérifier format email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ erreur: 'Adresse email invalide.' });
    }

    // Vérifier force du mot de passe
    const erreurMdp = verifierMotDePasse(password);
    if (erreurMdp) return res.status(400).json({ erreur: erreurMdp });

    // Vérifier si email déjà utilisé
    const existant = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existant) return res.status(400).json({ erreur: 'Cet email est déjà utilisé.' });

    // Hasher le mot de passe et créer l'utilisateur (non vérifié)
    const hash = await bcrypt.hash(password, 10);
    db.prepare('INSERT OR REPLACE INTO users (nom, email, password, verifie) VALUES (?, ?, ?, 0)').run(nom, email, hash);

    // Générer et sauvegarder le code
    const code = genererCode();
    const expiration = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    db.prepare('DELETE FROM codes_verification WHERE email = ?').run(email);
    db.prepare('INSERT INTO codes_verification (email, code, expire_le) VALUES (?, ?, ?)').run(email, code, expiration);

    // Envoyer le code par email
    await envoyerCode(email, code, nom);

    res.json({ succes: true, message: 'Code envoyé sur ton email !', email });

  } catch (err) {
    console.error('Erreur inscription:', err);
    res.status(500).json({ erreur: 'Erreur serveur. Vérifie ta configuration email.' });
  }
});

// ─── POST /api/auth/verifier ─────────────────────────────────────────────
router.post('/verifier', async (req, res) => {
  try {
    const { email, code } = req.body;

    const entry = db.prepare('SELECT * FROM codes_verification WHERE email = ? AND utilise = 0 ORDER BY id DESC LIMIT 1').get(email);

    if (!entry) return res.status(400).json({ erreur: 'Aucun code trouvé pour cet email.' });
    if (new Date(entry.expire_le) < new Date()) return res.status(400).json({ erreur: 'Code expiré. Réinscris-toi.' });
    if (entry.code !== code.trim()) return res.status(400).json({ erreur: 'Code incorrect.' });

    // Marquer comme utilisé et vérifier l'utilisateur
    db.prepare('UPDATE codes_verification SET utilise = 1 WHERE id = ?').run(entry.id);
    db.prepare('UPDATE users SET verifie = 1 WHERE email = ?').run(email);

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    const token = jwt.sign({ id: user.id, nom: user.nom, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ succes: true, token, user: { id: user.id, nom: user.nom, email: user.email } });

  } catch (err) {
    console.error('Erreur vérification:', err);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// ─── POST /api/auth/connexion ────────────────────────────────────────────
router.post('/connexion', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ erreur: 'Email et mot de passe requis.' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(400).json({ erreur: 'Email ou mot de passe incorrect.' });

    if (!user.verifie) return res.status(400).json({ erreur: 'Compte non vérifié. Vérifie ton email.' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ erreur: 'Email ou mot de passe incorrect.' });

    const token = jwt.sign({ id: user.id, nom: user.nom, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ succes: true, token, user: { id: user.id, nom: user.nom, email: user.email } });

  } catch (err) {
    console.error('Erreur connexion:', err);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// ─── GET /api/auth/moi ───────────────────────────────────────────────────
router.get('/moi', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ erreur: 'Non connecté.' });
    const user = jwt.verify(token, JWT_SECRET);
    res.json({ user: { id: user.id, nom: user.nom, email: user.email } });
  } catch {
    res.status(401).json({ erreur: 'Session expirée.' });
  }
});

module.exports = router;
