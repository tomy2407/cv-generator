// server.js  — Point d'entrée principal du serveur

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const cvRoutes = require('./routes/cv');
const authRoutes = require('./routes/auth');
const analyseRoutes = require('./routes/analyse');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARES ──────────────────────────────────────────────────────────
app.use(cors());                          // Autorise les requêtes cross-origin
app.use(express.json());                  // Parse le JSON des requêtes
app.use(express.static('public'));        // Sert les fichiers HTML/CSS/JS du frontend

// ─── ROUTES API ───────────────────────────────────────────────────────────
app.use('/api/cv', cvRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/analyse', analyseRoutes);

// ─── ROUTE FALLBACK ───────────────────────────────────────────────────────
// Toutes les autres routes renvoient le frontend (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── DÉMARRAGE ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
  console.log(`📦 Base de données : cvs.db`);
  console.log(`🔑 Clé API : ${process.env.GROQ_API_KEY ? 'configurée' : '⚠ manquante'}`);
});
