# 🚀 CV Generator Pro — Guide complet

## Ce que tu as construit

Un vrai projet **fullstack** :

```
cv-app/
├── server.js           ← Serveur Express (backend)
├── package.json        ← Dépendances Node.js
├── .env.example        ← Template pour les variables secrètes
├── .gitignore          ← Fichiers à ne pas partager
├── db/
│   └── database.js     ← Base de données SQLite + toutes les fonctions
├── routes/
│   └── cv.js           ← API REST (les routes /api/cv/...)
└── public/
    └── index.html      ← Frontend complet (formulaire + dashboard)
```

---

## ⚙️ Installation sur ton PC

### Étape 1 — Installe Node.js
Va sur **nodejs.org** et télécharge la version LTS (recommandée).
Vérifie l'installation :
```bash
node --version
npm --version
```

### Étape 2 — Installe les dépendances
```bash
cd cv-app
npm install
```

### Étape 3 — Configure ta clé API
```bash
# Copie le fichier exemple
cp .env.example .env

# Ouvre .env dans un éditeur et remplace la clé :
# ANTHROPIC_API_KEY=sk-ant-ta-vraie-cle-ici
```
> 💡 Ta clé API Anthropic est sur : console.anthropic.com

### Étape 4 — Lance le serveur
```bash
npm start
```
Ouvre ton navigateur sur **http://localhost:3000** — c'est là !

---

## ☁️ Déploiement en ligne GRATUIT (Railway)

Railway est la plateforme la plus simple pour héberger Node.js gratuitement.

### Étape 1 — Mets ton code sur GitHub
1. Crée un compte sur **github.com**
2. Crée un nouveau dépôt (repository) nommé `cv-generator`
3. Dans ton dossier `cv-app`, fais :
```bash
git init
git add .
git commit -m "Premier commit"
git remote add origin https://github.com/TON_USERNAME/cv-generator.git
git push -u origin main
```

### Étape 2 — Déploie sur Railway
1. Va sur **railway.app** et connecte-toi avec GitHub
2. Clique **"New Project"** → **"Deploy from GitHub repo"**
3. Sélectionne ton dépôt `cv-generator`
4. Railway détecte automatiquement Node.js et installe les dépendances

### Étape 3 — Configure la clé API sur Railway
1. Dans ton projet Railway, va dans **"Variables"**
2. Ajoute : `ANTHROPIC_API_KEY` = ta clé API
3. Railway redémarre automatiquement le serveur

### Étape 4 — Obtiens ton lien public
Dans Railway, clique sur **"Settings"** → **"Generate Domain"**
Tu obtiens un lien comme : `https://cv-generator-production.up.railway.app`

**Partage ce lien à tout le monde !** 🎉

---

## 🗄️ Comment fonctionne la base de données

Le fichier `cvs.db` est créé automatiquement au premier démarrage.
Il contient 3 tables :

| Table | Ce qu'elle stocke |
|---|---|
| `cvs` | Les infos principales de chaque CV |
| `formations` | Les diplômes liés à chaque CV |
| `experiences` | Les expériences liées à chaque CV |

Pour voir le contenu de ta base de données, installe **DB Browser for SQLite** (gratuit).

---

## 🔌 Les routes API disponibles

| Méthode | URL | Description |
|---|---|---|
| POST | `/api/cv/generer` | Génère un CV avec l'IA et le sauvegarde |
| GET | `/api/cv` | Liste tous les CVs |
| GET | `/api/cv/stats` | Statistiques (total, aujourd'hui) |
| GET | `/api/cv/:id` | Récupère un CV par son ID |
| DELETE | `/api/cv/:id` | Supprime un CV |

---

## 💰 Comment gagner de l'argent

1. **Déploie en ligne** avec Railway (gratuit)
2. **Partage le lien** dans des groupes WhatsApp/Facebook d'étudiants
3. **Facture 3 à 10€ par CV** via CashPlus, Wave, ou PayPal
4. **Automatise** : les gens remplissent eux-mêmes, tu encaisses !

---

## 🆘 Problèmes courants

**"Cannot find module 'better-sqlite3'"**
→ Lance `npm install` dans le dossier cv-app

**"ANTHROPIC_API_KEY manquante"**
→ Vérifie que ton fichier `.env` existe et contient la clé

**Le port 3000 est déjà utilisé**
→ Change `PORT=3001` dans le fichier `.env`
