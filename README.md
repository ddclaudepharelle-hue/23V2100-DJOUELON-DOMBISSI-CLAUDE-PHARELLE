# SGS PLUS — Système de Gestion Sanitaire

Application web Flask pour la gestion épidémiologique d'un centre de santé.

## Structure du projet

```
sgs_plus/
├── app.py                  # Serveur Flask + API JSON
├── requirements.txt
├── patients.json           # Base de données (créée automatiquement)
├── static/
│   ├── style.css           # CSS page de connexion
│   ├── app.css             # CSS application principale
│   └── app.js              # JavaScript (dashboard, liste, formulaire)
└── templates/
    ├── index.html          # Page de connexion
    ├── dashboard.html      # Tableau de bord
    ├── formulaire.html     # Formulaire d'ajout patient
    ├── listepatient.html   # Liste des patients
    ├── layout.html         # Sidebar (partial)
    └── topbar.html         # Barre supérieure (partial)
```

## Installation & lancement

```bash
# 1. Installer les dépendances
pip install -r requirements.txt

# 2. Lancer l'application
python app.py

# 3. Ouvrir dans le navigateur
# http://localhost:5000
```

## Utilisation

- Sur la page de connexion, entrez n'importe quel identifiant et mot de passe
- **Tableau de bord** : statistiques + 3 graphiques (maladie, sexe, âge)
- **Nouveau patient** : formulaire d'enregistrement complet
- **Liste des patients** : tableau paginé avec recherche et suppression

## API REST

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/patients` | Récupérer tous les patients |
| POST | `/api/patients` | Ajouter un patient |
| DELETE | `/api/patients/<id>` | Supprimer un patient |

## Technologies

- **Backend** : Python / Flask
- **Frontend** : HTML5, CSS3, JavaScript vanilla
- **Graphiques** : Chart.js 4.4
- **Stockage** : fichier `patients.json` (local)
