# QUADCORE CRM

Outil interne de prospection et de suivi des sites web de QUADCORE.
Il est pensé d'abord pour le téléphone, s'installe comme une application (PWA) et est partagé entre les quatre collaborateurs.

**Stack :** React 18 + TypeScript, Vite, Tailwind CSS, Supabase (Auth, Postgres, Realtime, Storage), Lucide.

---

## 1. Ce que fait l'application

| Module | Contenu |
|---|---|
| **Accueil** | 8 indicateurs cliquables. « À faire aujourd'hui » (vue Moi ou Équipe) regroupe les tâches, relances, retouches, livraisons proches et validations en attente. Le fil d'activité de l'équipe est alimenté par la base. |
| **Prospects** | Ajout express : seul le nom est obligatoire, via le bouton « + », la touche `N` ou le raccourci de l'icône. Pipeline en 9 statuts, modifiable depuis la carte. Liste filtrable sur mobile, Kanban glisser-déposer sur ordinateur. Actions natives : `tel:`, `wa.me`, `mailto:`, Instagram, site existant, programmer une relance. Le motif de refus est demandé et la fiche n'est jamais supprimée automatiquement. Le passage en « gagné » propose de créer le projet en reprenant les informations. |
| **Projets** | Statut de production en 12 étapes, distinct du statut commercial. Couleurs discrètes et bouton « étape suivante ». URL de démo, URL définitive et dépôt GitHub. Prix proposé et accepté, facturation, documents joints, commentaires. Historique complet des statuts. Envoi de la démo par WhatsApp ou e-mail en un geste. |
| **Retouches** | Rattachées à un projet et organisées en séries. Coller une liste crée une retouche par ligne. États à faire, en cours et terminé, avec responsable, date limite, captures et commentaires. Progression « 3 / 4 terminées ». Quand tout est terminé, l'application propose de repasser le projet en attente de validation. Les séries précédentes sont conservées. |
| **Tâches** | Vues Aujourd'hui, En retard, Cette semaine, Mes tâches et Toutes. Chaque tâche peut être liée à un prospect ou un projet. Une relance terminée est inscrite dans l'historique commercial du prospect. |
| **Équipe** | Profils (initiales et couleur), rôles Administrateur et Collaborateur, invitation par e-mail, désactivation d'accès, archives. Préférences de l'appareil : thème clair, sombre ou auto, rappels navigateur, installation. |

**Notifications navigateur.** Elles sont implémentées et ne s'activent qu'avec l'accord de l'utilisateur.
- Il n'y a pas de serveur de push. Les rappels se déclenchent donc quand l'application est ouverte ou en arrière-plan, pas quand elle est complètement fermée.
- Sur iPhone, il faut d'abord installer l'app sur l'écran d'accueil (iOS 16.4 ou plus récent).

## 2. Mise en route (≈ 15 min)

### a. Supabase
1. Créez un projet sur [supabase.com](https://supabase.com) (région Europe, Paris ou Francfort).
2. Dans **SQL Editor**, exécutez tout le fichier `supabase/migrations/0001_quadcore_crm.sql`. Il crée :
   - les tables et la RLS ;
   - les triggers d'historique et d'activité ;
   - le temps réel et le bucket de fichiers.
3. Dans **Authentication › Sign In / Providers**, **désactivez « Allow new users to sign up »**. Seuls les membres invités pourront se connecter.
4. Dans **Authentication › URL Configuration**, indiquez l'URL de production (ex. `https://crm.quad-core.fr`) dans *Site URL* et *Redirect URLs*.
5. Créez le premier compte, qui sera **administrateur**. Allez dans **Authentication › Users › Add user**, renseignez e-mail et mot de passe, puis cochez *Auto confirm*. Le tout premier compte reçoit automatiquement le rôle administrateur.
6. Déployez la fonction d'invitation :
   ```bash
   npx supabase login
   npx supabase link --project-ref <votre-ref>
   npx supabase functions deploy invite-member
   ```
   Les autres collaborateurs s'invitent ensuite depuis **Équipe › Inviter**. Ils reçoivent un e-mail, choisissent leur mot de passe et arrivent dans l'app.

### b. Application
```bash
cp .env.example .env.local   # renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
npm install
npm run dev                  # http://localhost:5173
```
Sans variables Supabase, l'app démarre en **mode démonstration** : les données sont fictives et stockées dans le navigateur.

### c. Déploiement (Vercel recommandé)
1. Importez le dépôt dans Vercel. Le framework détecté est Vite et le fichier `vercel.json` gère les routes.
2. Ajoutez les deux variables `VITE_SUPABASE_*` dans *Settings › Environment Variables*.
3. Ouvrez l'URL sur votre téléphone et choisissez **Ajouter à l'écran d'accueil**.

`npm run build:demo` produit `dist-demo/index.html`. C'est un aperçu autonome en un seul fichier, en mode démo.

## 3. Architecture

```
src/
  data/       backend.ts (contrat) · supabaseBackend.ts · demoBackend.ts (miroir des triggers) · seed.ts
              store.ts (état + temps réel + écritures optimistes) · actions.ts (règles métier)
  lib/        types, constantes (statuts, couleurs), dates locales, liens natifs, calculs du tableau de bord
  components/ Shell (navigation, FAB, en-têtes), ui (feuilles, sélecteurs, toasts), Kanban, bits
  features/   dashboard · prospects · projects (+ Revisions) · tasks · team · auth · shared (fil, fichiers)
supabase/
  migrations/0001_quadcore_crm.sql
  functions/invite-member/
```

**Travail simultané sans perte de données**
- Seuls les champs réellement modifiés sont envoyés. Deux personnes peuvent éditer des champs différents d'une même fiche sans s'écraser.
- Toutes les tables sont diffusées en temps réel. Les écritures sont optimistes et annulées proprement en cas d'erreur.
- Au retour du réseau, l'application se resynchronise.

**L'historique ne dépend pas du client**
- Les changements de statut, le fil d'activité, les dates de complétion et le regroupement des retouches sont écrits par des triggers Postgres. Chaque événement correspond donc à une action réelle en base.
- Seuls les administrateurs peuvent archiver, supprimer, changer un rôle ou désactiver un accès. Ces règles sont imposées à la fois par la RLS et par des triggers.
- La base garantit qu'il reste toujours au moins un administrateur actif.

## 4. Sécurité

- **Contrôle d'accès** : la RLS est active sur toutes les tables, et seuls les membres actifs voient les données.
- **Fichiers** : ils sont stockés dans un bucket privé et servis par URL signée valable 1 h.
- **Rôle administrateur** : il n'est jamais lu depuis les métadonnées fournies par l'utilisateur. L'invitation d'un administrateur passe par la fonction serveur.
- **Liens externes** : tous en `noopener` ; aucune API Instagram ou WhatsApp n'est utilisée, uniquement des liens standard.
