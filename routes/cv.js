// routes/cv.js
const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const Groq    = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/generer', async (req, res) => {
  try {
    const data = req.body;
    if (!data.nom || !data.poste) {
      return res.status(400).json({ erreur: 'Le nom et le poste sont obligatoires.' });
    }

    const formationsText = (data.formations || [])
      .map(f => `- ${f.diplome || ''} à ${f.etablissement || ''} (${f.debut || ''} – ${f.fin || ''})`)
      .join('\n') || 'Non renseigné';

    const experiencesText = (data.experiences || [])
      .map(e => `- ${e.poste || ''} chez ${e.entreprise || ''} (${e.debut || ''} – ${e.fin || 'présent'}) : ${e.description || ''}`)
      .join('\n') || 'Non renseigné';

    const prompt = `Tu es expert en rédaction de CV professionnels optimisés ATS.
Génère un CV complet en français. Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans backticks.

Format attendu :
{
  "nom": "...",
  "poste": "...",
  "contact": "email | téléphone | ville | lien",
  "resume": "Résumé professionnel amélioré...",
  "formations": [{"titre": "...", "etablissement": "...", "periode": "...", "detail": "..."}],
  "experiences": [{"poste": "...", "entreprise": "...", "periode": "...", "description": "..."}],
  "competences": "Liste des compétences améliorée...",
  "langues": "..."
}

Données :
Nom : ${data.nom}
Poste visé : ${data.poste}
Email : ${data.email || ''}
Téléphone : ${data.telephone || ''}
Ville : ${data.ville || ''}
Lien : ${data.lien || ''}
Résumé : ${data.resume || ''}
Formations :
${formationsText}
Expériences :
${experiencesText}
Compétences : ${data.competences || ''}
Langues : ${data.langues || ''}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1500,
    });

    const rawText   = completion.choices[0].message.content;
    const cleanText = rawText.replace(/```json|```/g, '').trim();
    const cvGenere  = JSON.parse(cleanText);
    const cvId = db.sauvegarderCV({ ...data, cv_genere: cvGenere });
    res.json({ succes: true, id: cvId, cv: cvGenere });

  } catch (err) {
    console.error('Erreur génération CV:', err);
    res.status(500).json({ erreur: 'Erreur lors de la génération. Réessaie.' });
  }
});

router.get('/', (req, res) => {
  try { res.json(db.tousLesCVs()); }
  catch (err) { res.status(500).json({ erreur: err.message }); }
});

router.get('/stats', (req, res) => {
  try { res.json(db.statistiques()); }
  catch (err) { res.status(500).json({ erreur: err.message }); }
});

router.get('/:id', (req, res) => {
  try {
    const cv = db.cvParId(parseInt(req.params.id));
    if (!cv) return res.status(404).json({ erreur: 'CV introuvable.' });
    res.json(cv);
  } catch (err) { res.status(500).json({ erreur: err.message }); }
});

router.delete('/:id', (req, res) => {
  try { db.supprimerCV(parseInt(req.params.id)); res.json({ succes: true }); }
  catch (err) { res.status(500).json({ erreur: err.message }); }
});

module.exports = router;
