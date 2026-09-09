# ÉCHOS — site de lecture

Version web du manuscrit **ÉCHOS — Des lieux, des êtres et du temps qui passe**.

## Structure

- `index.html` : interface de lecture
- `style.css` : mise en page, thèmes et impression
- `app.js` : sommaire, recherche, progression, reprise, taille du texte et thèmes
- `content/manuscript.json` : texte structuré à partir du document Word source

## Déploiement GitHub → Vercel

1. Créer un dépôt GitHub, par exemple `manuscrit-lecture`.
2. Importer tout le contenu de ce dossier dans le dépôt.
3. Dans Vercel : **Add New → Project → Import Git Repository**.
4. Sélectionner le dépôt GitHub.
5. Pour ce projet statique, aucune commande de build n'est nécessaire. Vercel peut servir directement `index.html`.

Après le premier déploiement, chaque commit/push vers GitHub peut déclencher un nouveau déploiement Vercel.

## Confidentialité éditoriale

Le manuscrit source indique : « Édition personnelle provisoire, non destinée à la diffusion ». Avant toute publication publique, vérifier que le niveau de diffusion souhaité est bien compatible avec cette mention.
