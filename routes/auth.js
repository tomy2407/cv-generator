// routes/auth.js
const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path     = require('path');

const db = new Database(path.join(__dirname, '..', 'cvs.db'));

// Créer la table users si elle n'existe pas
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nom        TEXT    NOT NULL,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    cree_le    DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const JWT_SECRET = process.env.JWT_SECRET || 'cvgen-secret-2024';

// ─── POST /api/auth/inscription ──────────────────────────────────────────
router.post('/inscription', async (req, res) => {
  try {
    const { nom, email, password } = req.body;
    if (!nom || !email || !password) {
      return res.status(400).json({ erreur: 'Tous les champs sont obligatoires.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ erreur: 'Le mot de passe doit faire au moins 6 caractères.' });
    }

    const existant = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existant) {
      return res.status(400).json({ erreur: 'Cet email est déjà utilisé.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (nom, email, password) VALUES (?, ?, ?)').run(nom, email, hash);

    const token = jwt.sign({ id: result.lastInsertRowid, nom, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ succes: true, token, user: { id: result.lastInsertRowid, nom, email } });

  } catch (err) {
    console.error('Erreur inscription:', err);
    res.status(500).json({ erreur: 'Erreur serveur.' });
  }
});

// ─── POST /api/auth/connexion ────────────────────────────────────────────
router.post('/connexion', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ erreur: 'Email et mot de passe requis.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(400).json({ erreur: 'Email ou mot de passe incorrect.' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ erreur: 'Email ou mot de passe incorrect.' });
    }

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
