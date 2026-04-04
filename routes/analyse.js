// routes/analyse.js
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const pdfParse = require('pdf-parse');
const mammoth  = require('mammoth');
const Groq     = require('groq-sdk');
const path     = require('path');

const groq    = new Groq({ apiKey: process.env.GROQ_API_KEY });
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── POST /api/analyse ────────────────────────────────────────────────────
router.post('/', upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ erreur: 'Aucun fichier reçu.' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    let texte = '';

    // Extraire le texte selon le type de fichier
    if (ext === '.pdf') {
      const data = await pdfParse(req.file.buffer);
      texte = data.text;
    } else if (ext === '.docx' || ext === '.doc') {
      const data = await mammoth.extractRawText({ buffer: req.file.buffer });
      texte = data.value;
    } else {
      return res.status(400).json({ erreur: 'Format non supporté. Utilise PDF ou Word (.docx).' });
    }

    if (!texte || texte.trim().length < 50) {
      return res.status(400).json({ erreur: 'Le fichier semble vide ou illisible.' });
    }

    // Prompt pour analyser et convertir en ATS
    const prompt = `Tu es expert en optimisation de CV pour les systèmes ATS (Applicant Tracking System).

Voici le contenu d'un CV existant :
---
${texte.slice(0, 3000)}
---

Ta mission :
1. Analyse ce CV et identifie les problèmes ATS (mauvais format, colonnes, tableaux, manque de mots-clés, etc.)
2. Réécris-le entièrement en format ATS optimisé
3. Améliore le contenu avec des verbes d'action forts
4. Garde toutes les vraies informations, n'invente rien

Réponds UNIQUEMENT avec du JSON valide sans markdown ni backticks :

{
  "analyse": {
    "score_original": 45,
    "problemes": ["Utilise des tableaux", "Pas de mots-clés", "Format en colonnes"],
    "score_ats": 92
  },
  "cv": {
    "nom": "...",
    "poste": "...",
    "contact": "email | téléphone | ville",
    "resume": "...",
    "formations": [{"titre": "...", "etablissement": "...", "periode": "...", "detail": "..."}],
    "experiences": [{"poste": "...", "entreprise": "...", "periode": "...", "description": "..."}],
    "competences": "...",
    "langues": "..."
  }
}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 2000,
    });

    const rawText   = completion.choices[0].message.content;
    const cleanText = rawText.replace(/```json|```/g, '').trim();
    const result    = JSON.parse(cleanText);

    res.json({ succes: true, ...result });

  } catch (err) {
    console.error('Erreur analyse CV:', err);
    res.status(500).json({ erreur: 'Erreur lors de l\'analyse. Réessaie.' });
  }
});

module.exports = router;
