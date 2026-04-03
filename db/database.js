// db/database.js
// Ce fichier crée et gère la base de données SQLite

const Database = require('better-sqlite3');
const path = require('path');

// Le fichier de la base de données sera créé ici automatiquement
const DB_PATH = path.join(__dirname, '..', 'cvs.db');

const db = new Database(DB_PATH);

// Active le mode WAL pour de meilleures performances
db.pragma('journal_mode = WAL');

// ─── CRÉATION DES TABLES ───────────────────────────────────────────────────
// On crée les tables si elles n'existent pas encore

db.exec(`
  CREATE TABLE IF NOT EXISTS cvs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nom         TEXT    NOT NULL,
    poste       TEXT    NOT NULL,
    email       TEXT,
    telephone   TEXT,
    ville       TEXT,
    lien        TEXT,
    resume      TEXT,
    competences TEXT,
    langues     TEXT,
    cv_genere   TEXT,       -- Le CV final généré par l'IA (JSON)
    cree_le     DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS formations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    cv_id       INTEGER NOT NULL REFERENCES cvs(id) ON DELETE CASCADE,
    diplome     TEXT,
    etablissement TEXT,
    debut       TEXT,
    fin         TEXT
  );

  CREATE TABLE IF NOT EXISTS experiences (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    cv_id       INTEGER NOT NULL REFERENCES cvs(id) ON DELETE CASCADE,
    poste       TEXT,
    entreprise  TEXT,
    debut       TEXT,
    fin         TEXT,
    description TEXT
  );
`);

// ─── FONCTIONS UTILITAIRES ────────────────────────────────────────────────

// Sauvegarder un CV complet (infos + formations + expériences)
function sauvegarderCV(data) {
  const insertCV = db.prepare(`
    INSERT INTO cvs (nom, poste, email, telephone, ville, lien, resume, competences, langues, cv_genere)
    VALUES (@nom, @poste, @email, @telephone, @ville, @lien, @resume, @competences, @langues, @cv_genere)
  `);

  const insertFormation = db.prepare(`
    INSERT INTO formations (cv_id, diplome, etablissement, debut, fin)
    VALUES (@cv_id, @diplome, @etablissement, @debut, @fin)
  `);

  const insertExperience = db.prepare(`
    INSERT INTO experiences (cv_id, poste, entreprise, debut, fin, description)
    VALUES (@cv_id, @poste, @entreprise, @debut, @fin, @description)
  `);

  // Transaction : soit tout s'enregistre, soit rien (sécurité)
  const transaction = db.transaction((data) => {
    const result = insertCV.run({
      nom:         data.nom,
      poste:       data.poste,
      email:       data.email || '',
      telephone:   data.telephone || '',
      ville:       data.ville || '',
      lien:        data.lien || '',
      resume:      data.resume || '',
      competences: data.competences || '',
      langues:     data.langues || '',
      cv_genere:   JSON.stringify(data.cv_genere || {})
    });

    const cvId = result.lastInsertRowid;

    for (const f of (data.formations || [])) {
      insertFormation.run({ cv_id: cvId, ...f });
    }

    for (const e of (data.experiences || [])) {
      insertExperience.run({ cv_id: cvId, ...e });
    }

    return cvId;
  });

  return transaction(data);
}

// Récupérer tous les CVs (liste)
function tousLesCVs() {
  return db.prepare(`
    SELECT id, nom, poste, email, ville, cree_le
    FROM cvs
    ORDER BY cree_le DESC
  `).all();
}

// Récupérer un CV par son ID (avec formations et expériences)
function cvParId(id) {
  const cv = db.prepare('SELECT * FROM cvs WHERE id = ?').get(id);
  if (!cv) return null;

  cv.formations  = db.prepare('SELECT * FROM formations  WHERE cv_id = ?').all(id);
  cv.experiences = db.prepare('SELECT * FROM experiences WHERE cv_id = ?').all(id);
  cv.cv_genere   = JSON.parse(cv.cv_genere || '{}');

  return cv;
}

// Supprimer un CV
function supprimerCV(id) {
  return db.prepare('DELETE FROM cvs WHERE id = ?').run(id);
}

// Statistiques pour le dashboard
function statistiques() {
  const total    = db.prepare('SELECT COUNT(*) as n FROM cvs').get().n;
  const aujourdhui = db.prepare(`
    SELECT COUNT(*) as n FROM cvs
    WHERE DATE(cree_le) = DATE('now')
  `).get().n;
  const postes   = db.prepare(`
    SELECT poste, COUNT(*) as n FROM cvs GROUP BY poste ORDER BY n DESC LIMIT 5
  `).all();

  return { total, aujourdhui, postes };
}

module.exports = { sauvegarderCV, tousLesCVs, cvParId, supprimerCV, statistiques };
