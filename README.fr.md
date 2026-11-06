# 🏐 VolleyBall Team Management (VTM)

[🇬🇧 English](README.md) · 🇫🇷 Français

VTM est une application web légère pour gérer des joueurs de volleyball et composer des **équipes équitables et bien mélangées** sur un ou plusieurs terrains. Elle fonctionne dans tout navigateur récent, sur ordinateur comme sur smartphone, sans serveur ni compte, et enregistre ses données dans un **fichier XML** portable que l'on peut partager entre appareils.

## Fonctionnalités

- **Onglet Terrains** : ajout/suppression de terrains, représentés par des terrains orange classiques à lignes blanches (une équipe en haut, une en bas). Les joueurs apparaissent en miniature avec leur nom, placés selon leurs positions préférentielles.
  - **Aléatoire équitable** : mélange les joueurs disponibles et équilibre les équipes sur chaque critère (et sur les positions) pour des matchs variés *et* équilibrés.
  - **Du + au − fort** (bascule : du − au + fort) : regroupe les meilleurs joueurs ensemble et fait s'affronter les équipes les plus fortes entre elles, en commençant par le terrain 1.
  - Touchez un joueur puis un autre (ou un joueur de la liste « non placés ») pour les échanger manuellement.
- **Onglet Joueurs** : ajout, modification, suppression ou désactivation de joueurs. Chaque joueur a une photo, un nom, des jauges de 0 à 10 et des positions préférentielles.
  - Critères toujours présents : **Force, Vitesse, Agilité** (vous pouvez en ajouter dans les paramètres).
  - Positions : **Passeur, Attaquant, Milieu, Tech**. Aucune sélection = peut jouer à toutes les positions.
- **Import / export** de toute la configuration au format XML.
- **Installable** sur smartphone (PWA) et utilisable hors-ligne.

## Lancer l'application

Aucune étape de build, aucune dépendance. Au choix :

- ouvrir `index.html` dans un navigateur, ou
- servir le dossier (nécessaire pour l'installation sur smartphone / le mode hors-ligne) :

```bash
python -m http.server 8080
# puis ouvrir http://localhost:8080
```

Pour essayer sur un téléphone connecté au même Wi-Fi, ouvrez `http://<IP-de-votre-PC>:8080` dans le navigateur du téléphone (autorisez Python dans le pare-feu Windows si demandé).

## Utilisation

1. **Premier lancement** : choisissez *Importer une configuration* (fichier XML) ou *Créer une nouvelle configuration*.
2. **Onglet Joueurs** : touchez **+** (en haut à droite) pour ajouter un joueur. Renseignez photo, nom, jauges et positions préférentielles. Touchez une fiche pour la modifier, désactiver ou supprimer le joueur. Les joueurs désactivés sont ignorés lors de la génération des équipes.
3. **Onglet Terrains** : réglez le nombre de terrains avec **−** / **+**, puis appuyez sur **Aléatoire équitable** ou **Du + au − fort**. Sur téléphone, balayez à gauche/droite pour passer d'un terrain à l'autre.
4. **Paramètres (⚙)** : nombre de joueurs par équipe (1 à 6, 6 par défaut), critères personnalisés, import/export.

S'il y a plus de joueurs actifs que de places, les joueurs en trop sont listés comme *non placés* et sont prioritaires la fois suivante. S'il y en a trop peu, le nombre d'équipes diminue (toujours un nombre pair).

## Import / export

Les données sont enregistrées automatiquement dans le navigateur (stockage local). Pour sauvegarder ou changer d'appareil :

- **Export** : ⚙ → *Exporter la configuration (XML)* → le fichier `vtm-config.xml` est téléchargé (joueurs, photos, critères, terrains et équipes en cours).
- **Import** : ⚙ → *Importer une configuration (XML)* → sélectionnez le fichier. La configuration actuelle est remplacée. Le même choix est proposé au premier lancement quand rien n'est chargé.
- Pour partager avec un autre appareil, envoyez le fichier (mail, messagerie, cloud) puis importez-le sur l'autre appareil.

## Installer sur smartphone

Le site doit être servi en **HTTPS** (par ex. GitHub Pages, Netlify, Cloudflare Pages) pour que l'installation et le mode hors-ligne fonctionnent.

- **Android (Chrome)** : ouvrez le site → menu ⋮ → **Installer l'application** (ou *Ajouter à l'écran d'accueil*).
- **iPhone / iPad (Safari)** : ouvrez le site → bouton **Partager** → **Sur l'écran d'accueil**.

L'application s'ouvre alors en plein écran avec sa propre icône et fonctionne hors-ligne. Chaque appareil garde ses propres données : utilisez l'export/import pour les synchroniser.

### Publier avec GitHub Pages

1. Poussez le dépôt sur GitHub.
2. *Settings → Pages* → Source : *Deploy from a branch* → choisissez votre branche et le dossier `/ (root)`.
3. Après une minute, le site est disponible sur `https://<utilisateur>.github.io/<depot>/`.

## Structure du projet

| Fichier | Rôle |
|---------|------|
| `index.html` | Structure de la page |
| `style.css` | Styles (responsive, mobile d'abord) |
| `app.js` | Logique : données, génération des équipes, affichage, import/export XML |
| `manifest.webmanifest`, `icon.svg`, `sw.js` | Installation PWA et mode hors-ligne |

## Technologie

HTML, CSS et JavaScript natifs : aucun framework, aucun outil de build.
