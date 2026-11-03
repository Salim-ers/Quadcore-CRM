# QUADCORE

Outil interne de QUADCORE : prospection, suivi des clients par tickets, production des sites web.
Il est pensé d'abord pour le téléphone, s'installe comme une application (PWA) et est partagé entre les quatre associés : Salim EL RHALMANI, Hasan AKAR, Sadish AROUL et Moustakine MOUHAMAD.

**Stack :** React 18 + TypeScript, Vite, Tailwind CSS, Neon (Postgres, Managed Better Auth, Data API, Functions, Object Storage), Vercel, Lucide.

---

## 1. Ce que fait l'application

| Module | Contenu |
|---|---|
| **Accueil** | Une grande carte pour les sites livrés et en cours, un camembert du chiffre d'affaires (réel : clients acceptés ; prévisionnel : les autres prix proposés, sans les refus), une carte Prospection avec la répartition des fiches (Prospects, Clients vus, En attente, Acceptés, Refusés). Pensé d'abord pour le téléphone. « À faire aujourd'hui » n'apparaît que s'il y a quelque chose à faire, trois lignes au plus. L'activité de l'équipe est repliée. |
| **Plus › Tickets** | Pour les problèmes et les demandes : chaque ticket est numéroté (#1001, #1002…). Sur un site, « Signaler un problème » ouvre une fiche avec le client et le site déjà remplis. Statuts Nouveau, En cours, En attente du client, Résolu, Fermé. Liste sur mobile, Kanban sur ordinateur. |
| **Fil d'un ticket** | Échanges avec le client (téléphone, WhatsApp, e-mail, Instagram, sur place) et notes internes bien distingués, captures, historique complet écrit par la base. Le délai est suspendu pendant l'attente du client. Une attente de plus de 3 jours remonte dans « À faire aujourd'hui ». |
| **Plus › Tickets › Clients** | Toutes les fiches acceptées : tickets ouverts et en retard, état du site, date du dernier échange. Les clients sans ticket en cours ni nouvelles depuis 30 jours sont signalés « À recontacter ». |
| **Prospects** | Ajout express : seul le nom est obligatoire. Cinq étapes : Prospect, Client vu, En attente, Accepté, Refusé. Sur chaque carte, l'étape suivante est un bouton, avec Annuler pendant quelques secondes. Le lien du site se met dès la création et crée le site, livré. Accepté crée le site s'il n'existe pas encore. Le motif de refus se choisit en un geste, et une fiche refusée peut être reprise. Sur la fiche, les détails (échanges, tickets, tâches, informations, fichiers) sont repliés. |
| **Sites** | Deux étapes : Site livré, Site en cours. Un site ajouté est livré d'office ; on le passe en cours à la main. La liste montre les livrés d'abord, puis les en cours. Le prix proposé est à côté de chaque site et de chaque fiche qui a un site, et se change en un geste. Liens de démo et du site, envoi de la démo par WhatsApp ou e-mail. Retouches, tickets, tâches, prix et facturation, fichiers et historique sont repliés. La base garde ses statuts détaillés : l'application les regroupe sur ces étapes (`src/lib/constants.ts`). |
| **Retouches** | Rattachées à un site. Coller une liste crée une retouche par ligne. États à faire, en cours et terminé, avec responsable, date limite, captures et commentaires. Une retouche ajoutée à un site livré le repasse en cours. Les demandes précédentes sont conservées. |
| **Tâches** | Dans Plus. Vues Aujourd'hui, En retard, Cette semaine, Mes tâches et Toutes. Chaque tâche peut être liée à un prospect ou un projet. Une relance terminée est inscrite dans l'historique commercial du prospect. |
| **Équipe** | Dans Plus : profils, rôles Administrateur et Collaborateur, invitation par e-mail, désactivation d'accès, archives. Préférences de l'appareil : thème, rappels navigateur, installation. |

**Notifications navigateur.** Elles sont implémentées et ne s'activent qu'avec l'accord de l'utilisateur.
- Il n'y a pas de serveur de push. Les rappels se déclenchent donc quand l'application est ouverte ou en arrière-plan, pas quand elle est complètement fermée.
- Sur iPhone, il faut d'abord installer l'app sur l'écran d'accueil (iOS 16.4 ou plus récent).

**Travail à plusieurs.** Chaque appareil ouvert récupère le travail des autres toutes les 10 secondes, et tout est rechargé au retour sur l'application.

**Hors ligne.** L'application s'ouvre sans réseau, mais les modifications ne sont pas mises en attente : elles échouent avec un message et il faut les refaire au retour du réseau.

## 2. Mise en ligne

L'application est hébergée sur le projet Vercel `quadcore-crm` (https://quadcore-crm.vercel.app), relié à ce dépôt, et ses données sur le projet Neon `long-haze-30062964` (organisation « Vercel: QuadCore », région Francfort). Les comptes des quatre associés sont décrits dans `src/lib/team.json`.

### a. Neon
```bash
npx neon login                                                       # ou une clé dans NEON_API_KEY
npx neon link --project-id long-haze-30062964 --org-id org-falling-art-60262323
npx neon deploy                                                      # authentification, Data API, bucket, fonction (neon.ts)
```
`neon deploy` écrit aussi les accès dans `.env.local`, qui n'est pas versionné.

### b. Vercel
Rien à configurer : le déploiement suit le dépôt. Les adresses Neon publiques sont dans `.env.production`, et `api/auth-proxy.js` relaie l'authentification par le domaine de l'app. Sans ce relais, le cookie de session serait un cookie tiers, bloqué par Safari et l'iPhone, et il faudrait se reconnecter sans cesse.

Si le projet Neon change, mettez à jour `.env.production` (`npx neon data-api get`, `npx neon functions get fichiers`) et l'adresse de secours en tête de `api/auth-proxy.js`.

### c. Installation
```bash
APP_URL=https://quadcore-crm.vercel.app npm run neon:installer
```
Le script applique le schéma, ferme les inscriptions publiques et l'accès depuis localhost, autorise le domaine, configure le bucket, crée les quatre comptes administrateurs et vérifie les droits. Il peut être relancé sans risque. Relancez-le si l'adresse de l'application change : le bucket n'accepte qu'une seule origine, la dernière indiquée.

Pour que les e-mails portent le bon nom, renseignez **QUADCORE** dans **Neon › Settings › Better Auth › Application Name**.

### d. Première connexion
```bash
APP_URL=https://quadcore-crm.vercel.app npm run neon:installer -- --envoyer-liens
```
Chacun reçoit un lien pour choisir son mot de passe. **Il est valable 1 heure** : passé ce délai, « Mot de passe oublié » sur l'écran de connexion en envoie un autre. Sur chaque téléphone, ouvrez l'URL et choisissez **Ajouter à l'écran d'accueil**.

### e. E-mails
L'expéditeur partagé de Neon (`auth@mail.myneon.app`) a un débit limité et ne vient pas de votre domaine : à la première installation, ses messages ne sont pas arrivés. Tant qu'aucun service SMTP n'est renseigné dans **Neon › Settings › Better Auth › Custom SMTP provider**, ne comptez ni sur les invitations ni sur « Mot de passe oublié ».

### f. Sauvegardes
Le plan gratuit de Neon permet de revenir 6 heures en arrière, avec une seule sauvegarde manuelle. Avant d'y mettre de vraies données clients, passez au plan Launch (facturé à l'usage, sans minimum), qui va jusqu'à 7 jours. En plan gratuit, la base s'endort après 5 minutes sans activité : la première action qui suit prend une seconde de plus.

### Développement local
```bash
npm install
npm run dev                  # http://localhost:5173
```
Sans variables Neon, `npm run dev` démarre en **mode démonstration** : les données sont fictives et stockées dans le navigateur. Pour travailler sur Neon, créez une branche Neon (`npx neon branches create`, puis `npx neon deploy --branch <nom> --no-env-pull`), écrivez ses accès avec `npx neon env pull --branch <nom> --file .env.local`, et complétez ce fichier d'après `.env.example`. La branche principale refuse les connexions depuis localhost.

`npm run build:demo` produit `dist-demo/index.html`. C'est un aperçu autonome en un seul fichier, en mode démo.

## 3. Architecture

```
neon.ts            services Neon (authentification, Data API, bucket, fonction)
neon-functions/    fichiers.ts : URL signées du bucket, réservées aux membres actifs
api/               auth-proxy.js : relais de Neon Auth par le domaine de l'app (Vercel Function)
scripts/           installer-neon.mjs : schéma, CORS, comptes de l'équipe
db/migrations/     0001_quadcore · 0002_suivi_clients · 0003_synchronisation · 0004_identite_fiable
src/
  data/       backend.ts (contrat) · neonBackend.ts · demoBackend.ts (miroir des triggers) · seed.ts
              store.ts (état + synchronisation + écritures optimistes) · actions.ts (règles métier)
  lib/        types, constantes (statuts, couleurs), team.json, dates locales, liens natifs, calculs du tableau de bord
  components/ Shell (navigation, FAB, en-têtes), ui (feuilles, sélecteurs, toasts), Kanban, bits
  features/   dashboard · prospects · tickets (suivi) · projects (+ Revisions) · tasks · team · auth · shared (fil, fichiers)
```

Le navigateur parle à trois services : le relais d'authentification (même domaine), la Data API de Neon pour les données (jeton de session, RLS appliquée par Postgres) et la fonction `fichiers` pour obtenir des URL signées.

Un client est une fiche de la table `prospects` au statut `gagne`. Un ticket lui appartient toujours. Un commentaire avec un canal est un échange avec le client, sans canal une note interne.

**Travail simultané sans perte de données**
- Seuls les champs réellement modifiés sont envoyés. Deux personnes peuvent éditer des champs différents d'une même fiche sans s'écraser.
- Chaque changement est inscrit par trigger dans `db_changes`, que les appareils relisent toutes les 10 secondes tant que l'app est au premier plan. En arrière-plan, plus aucune requête : la base peut s'endormir, et tout est rechargé au retour.
- Les écritures sont optimistes et annulées proprement en cas d'erreur.

**L'historique ne dépend pas du client**
- Les changements de statut, le fil d'activité, les numéros de ticket, les dates de complétion et de résolution et le regroupement des retouches sont écrits par des triggers Postgres. Chaque événement correspond donc à une action réelle en base.
- Seuls les administrateurs peuvent archiver, supprimer, changer un rôle ou désactiver un accès. Ces règles sont imposées à la fois par la RLS et par des triggers.
- La base garantit qu'il reste toujours au moins un administrateur actif.

## 4. Sécurité

- **Identité** : `public.current_uid()` lit le jeton vérifié par la Data API. N'utilisez pas `auth.uid()` : sur une connexion neuve, elle renvoie NULL pendant la première requête, et la RLS répond alors « aucune ligne » sans erreur.
- **Contrôle d'accès** : la RLS est active sur toutes les tables, et seuls les membres actifs voient les données. Un compte sans profil actif n'a accès à rien, même si les inscriptions publiques étaient rouvertes par erreur : les profils sont créés uniquement par l'installation et par **Équipe › Inviter**.
- **Fichiers** : ils sont stockés dans un bucket privé et servis par URL signée, valable 1 h en lecture et 5 min à l'envoi. Les clés S3 ne quittent jamais la fonction.
- **Rôles** : le rôle `profiles.role` décide des droits sur les données. Le rôle de Neon Auth donne le droit de créer un compte ; il est aligné à chaque changement dans **Équipe**.
- **Suppression** : supprimer définitivement un dossier efface aussi ses commentaires, l'historique et les références de fichiers. Les fichiers eux-mêmes restent dans le bucket et se retirent depuis Neon › Object storage.
- **Liens externes** : tous en `noopener` ; aucune API Instagram ou WhatsApp n'est utilisée, uniquement des liens standard.
