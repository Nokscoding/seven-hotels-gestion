# Seven Gestion — Portail administrateur Web

Portail web professionnel réservé au personnel autorisé de Seven Hotels & Apartments.

## Déploiement Netlify

Ce dépôt est distinct du site vitrine : `Nokscoding/sevenhoels`.

- **Projet Netlify dédié :** `sevengestion` (https://sevengestion.netlify.app)
- **Dépôt :** `Nokscoding/seven-hotels-gestion`, branche `main`
- **Build command :** aucun (site HTML/CSS/JS statique)
- **Publish directory :** `.` (racine)
- **Données et authentification :** Supabase Auth, accès contrôlés par les rôles/RLS du projet Seven
- **Aucune clé service_role** ne doit se trouver dans ce dépôt.

Le site public **Seven Hotels** est déployé séparément à https://sevenhotels.netlify.app depuis `Nokscoding/sevenhoels`, dossier `public`. Ne pas utiliser ce dépôt admin pour publier la vitrine.

## Version

Cette base reprend le portail ERP Web existant. La version Windows V3 est un produit distinct dont la fusion complète des modules web devra être validée avant mise en production.

## Sécurité

L'accès au serveur Supabase exige un compte autorisé. Ne pas publier de dossiers administratifs ou de données clients avec ce site. Les permissions doivent rester vérifiées côté Supabase, et non uniquement dans l'interface.
