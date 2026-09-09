# ÉCHOS — site de lecture

Version web du manuscrit **ÉCHOS — Des lieux, des êtres et du temps qui passe**.

## Source éditable

Le manuscrit affiché par le site est le fichier :

`content/manuscrit.md`

Il est volontairement conservé en **Markdown** afin de pouvoir être modifié facilement dans GitHub.

## Structure

- `index.html` : interface de lecture
- `style.css` : mise en page et thèmes
- `app.js` : lecture, sommaire, recherche, progression, reprise et taille du texte
- `content/manuscrit.md` : texte éditable du manuscrit
- `assets/cover.jpg` : couverture originale

## Déploiement

Le projet est un site statique. Il peut être servi directement par Vercel depuis GitHub.

Chaque modification validée sur la branche `main` déclenchera un nouveau déploiement Vercel lorsque le dépôt est connecté au projet.
