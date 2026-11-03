# QUADCORE

Outil interne de QUADCORE : prospection, suivi des clients par tickets, production des sites web.
Il est pensé d'abord pour le téléphone, s'installe comme une application (PWA) et est partagé entre les quatre associés : Salim EL RHALMANI, Hasan AKAR, Sadish AROUL et Moustakine MOUHAMAD.

**Stack :** React 18 + TypeScript, Vite, Tailwind CSS, Supabase (Auth, Postgres, Realtime, Storage), Lucide.

---

## 1. Ce que fait l'application

| Module | Contenu |
|---|---|
| **Accueil** | 12 indicateurs cliquables. « À faire aujourd'hui » (vue Moi ou Équipe) regroupe les tâches, relances, retouches, livraisons proches, validations en attente et tickets. Le fil d'activité de l'équipe est alimenté par la base. |
| **Suivi › Tickets** | Chaque demande client devient un ticket numéroté (#1001, #1002…) : type, canal de réception, priorité, responsable, date de traitement proposée selon la priorité. Statuts Nouveau, En cours, En attente du client, Résolu, Fermé. Vues Ouverts, Mes tickets, Sans responsable, En retard, Attente client, Résolus. Recherche par objet, client ou numéro. Liste sur mobile, Kanban sur ordinateur. Bouton « + », touche `T` ou raccourci de l'icône. |
| **Fil d'un ticket** | Échanges avec le client (téléphone, WhatsApp, e-mail, Instagram, sur place) et notes internes bien distingués, captures, historique complet écrit par la base. Le délai est suspendu pendant l'attente du client. Une attente de plus de 3 jours remonte dans « À faire aujourd'hui ». |
| **Suivi › Clients** | Toutes les fiches gagnées : tickets ouverts et en retard, état du site, date du dernier échange. Les clients sans ticket en cours ni nouvelles depuis 30 jours sont signalés « À recontacter ». |
| **Prospects** | Ajout express : seul le nom est obligatoire, via le bouton « + », la touche `N` ou le raccourci de l'icône. Pipeline en 9 statuts, modifiable depuis la carte. Liste filtrable sur mobile, Kanban glisser-déposer sur ordinateur. Actions natives : `tel:`, `wa.me`, `mailto:`, Instagram, site existant, programmer une relance. Le motif de refus est demandé et la fiche n'est jamais supprimée automatiquement. Le passage en « gagné » propose de créer le projet en reprenant les informations. La fiche réunit tickets, projets, tâches et échanges du client. |
| **Projets** | Statut de production en 12 étapes, distinct du statut commercial. Couleurs discrètes et bouton « étape suivante ». URL de démo, URL définitive et dépôt GitHub. Prix proposé et accepté, facturation, documents joints, commentaires. Historique complet des statuts. Envoi de la démo par WhatsApp ou e-mail en un geste. |
| **Retouches** | Rattachées à un projet et organisées en séries. Coller une liste crée une retouche par ligne. États à faire, en cours et terminé, avec responsable, date limite, captures et commentaires. Progression « 3 / 4 terminées ». Quand tout est terminé, l'application propose de repasser le projet en attente de validation. Les séries précédentes sont conservées. |
| **Tâches** | Vues Aujourd'hui, En retard, Cette semaine, Mes tâches et Toutes. Chaque tâche peut être liée à un prospect ou un projet. Une relance terminée est inscrite dans l'historique commercial du prospect. |
| **Équipe** | Profils (initiales et couleur), rôles Administrateur et Collaborateur, invitation par e-mail, désactivation d'accès, archives. Préférences de l'appareil : thème clair, sombre ou auto, rappels navigateur, installation. Sur téléphone, on y accède par l'avatar de l'accueil. |

**Notifications navigateur.** Elles sont implémentées et ne s'activent qu'avec l'accord de l'utilisateur.
- Il n'y a pas de serveur de push. Les rappels se déclenchent donc quand l'application est ouverte ou en arrière-plan, pas quand elle est complètement fermée.
- Sur iPhone, il faut d'abord installer l'app sur l'écran d'accueil (iOS 16.4 ou plus récent).

**Hors ligne.** L'application s'ouvre sans réseau, mais les modifications ne sont pas mises en attente : elles échouent avec un message et il faut les refaire au retour du réseau.

## 2. Mise en ligne pour l'équipe

Il faut les adresses e-mail des quatre associés, puis trois comptes gratuits : Supabase (base de données), un service d'envoi d'e-mails et un hébergeur.

### a. Supabase
1. Créez un projet sur [supabase.com](https://supabase.com), région Europe (Paris ou Francfort).
2. Dans **Authentication › Sign In / Providers**, **désactivez « Allow new users to sign up »**.
3. Dans **SQL Editor**, exécutez dans l'ordre `supabase/migrations/0001_quadcore.sql` puis `supabase/migrations/0002_suivi_clients.sql`. Ils créent les tables, la RLS, les triggers d'historique et d'activité, le temps réel et le bucket de fichiers.
4. Créez le compte de Salim, qui sera **administrateur** : **Authentication › Users › Add user**, e-mail et mot de passe, *Auto confirm* coché. Le tout premier compte reçoit automatiquement ce rôle, et c'est le seul à être actif d'office.

### b. Envoi des e-mails (obligatoire)
Sans service d'envoi, Supabase n'écrit qu'aux membres de son organisation et se limite à 2 e-mails par heure : ni les invitations ni « mot de passe oublié » ne fonctionneraient.
1. Créez un compte sur un service SMTP ([Resend](https://resend.com) par exemple, gratuit jusqu'à 3 000 e-mails par mois) et vérifiez-y le domaine `quad-core.fr`.
2. Renseignez-le dans **Authentication › Emails › SMTP Settings**, sans suivi des liens côté service d'envoi.

### c. Hébergement
[Cloudflare Pages](https://pages.cloudflare.com) est recommandé : l'offre Vercel Hobby est réservée à un usage non commercial.
1. Importez le dépôt. Commande de build `npm run build`, dossier de sortie `dist`.
2. Ajoutez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les variables d'environnement (Supabase › Project Settings › API Keys, clé publique). Sans elles, le build échoue volontairement plutôt que de publier le mode démonstration.
3. Dans Supabase, **Authentication › URL Configuration** : indiquez l'URL obtenue (ex. `https://app.quad-core.fr`) dans *Site URL* et *Redirect URLs*.

Le fichier `vercel.json` reste fourni pour un hébergement sur Vercel Pro. Cloudflare Pages sert l'application sans configuration supplémentaire.

### d. Invitations
```bash
npx supabase login
npx supabase link --project-ref <votre-ref>
npx supabase functions deploy invite-member --no-verify-jwt
```
La fonction vérifie elle-même que l'appelant est administrateur.

1. Salim se connecte et renseigne son nom dans **Équipe › Mon profil**.
2. Dans **Équipe › Inviter**, il choisit Hasan, Sadish puis Moustakine (noms proposés en un geste) et saisit leur e-mail. Chacun reçoit un lien, choisit son mot de passe et arrive dans l'app.
3. Sur chaque téléphone, ouvrez l'URL et choisissez **Ajouter à l'écran d'accueil**.

Un compte créé autrement qu'avec **Inviter** reste sans accès jusqu'à ce qu'un administrateur le réactive dans **Équipe**.

### e. Sauvegardes
Le plan gratuit de Supabase n'a pas de sauvegarde automatique et met en pause un projet inactif pendant une semaine. Avant d'y mettre de vraies données clients, passez au plan Pro (sauvegardes quotidiennes conservées 7 jours), ou faites vous-même un export régulier avec `npx supabase db dump`.

### Développement local
```bash
cp .env.example .env.local   # renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
npm install
npm run dev                  # http://localhost:5173
```
Sans variables Supabase, `npm run dev` démarre en **mode démonstration** : les données sont fictives et stockées dans le navigateur.

`npm run build:demo` produit `dist-demo/index.html`. C'est un aperçu autonome en un seul fichier, en mode démo.

## 3. Architecture

```
src/
  data/       backend.ts (contrat) · supabaseBackend.ts · demoBackend.ts (miroir des triggers) · seed.ts
              store.ts (état + temps réel + écritures optimistes) · actions.ts (règles métier)
  lib/        types, constantes (statuts, couleurs), dates locales, liens natifs, calculs du tableau de bord
  components/ Shell (navigation, FAB, en-têtes), ui (feuilles, sélecteurs, toasts), Kanban, bits
  features/   dashboard · prospects · tickets (suivi) · projects (+ Revisions) · tasks · team · auth · shared (fil, fichiers)
supabase/
  migrations/0001_quadcore.sql · 0002_suivi_clients.sql
  functions/invite-member/
```

Un client est une fiche de la table `prospects` au statut `gagne`. Un ticket lui appartient toujours. Un commentaire avec un canal est un échange avec le client, sans canal une note interne.

**Travail simultané sans perte de données**
- Seuls les champs réellement modifiés sont envoyés. Deux personnes peuvent éditer des champs différents d'une même fiche sans s'écraser.
- Toutes les tables sont diffusées en temps réel. Les écritures sont optimistes et annulées proprement en cas d'erreur.
- Au retour du réseau et au retour de l'application au premier plan, les données sont rechargées.

**L'historique ne dépend pas du client**
- Les changements de statut, le fil d'activité, les numéros de ticket, les dates de complétion et de résolution et le regroupement des retouches sont écrits par des triggers Postgres. Chaque événement correspond donc à une action réelle en base.
- Seuls les administrateurs peuvent archiver, supprimer, changer un rôle ou désactiver un accès. Ces règles sont imposées à la fois par la RLS et par des triggers.
- La base garantit qu'il reste toujours au moins un administrateur actif.

## 4. Sécurité

- **Contrôle d'accès** : la RLS est active sur toutes les tables, et seuls les membres actifs voient les données. Un nouveau compte n'a accès à rien tant qu'il n'a pas été invité ou activé par un administrateur, même si les inscriptions publiques restaient ouvertes par erreur.
- **Fichiers** : ils sont stockés dans un bucket privé et servis par URL signée valable 1 h.
- **Rôle administrateur** : il n'est jamais lu depuis les métadonnées fournies par l'utilisateur. L'invitation d'un administrateur passe par la fonction serveur.
- **Suppression** : supprimer définitivement un dossier efface aussi ses commentaires, l'historique et les références de fichiers. Les fichiers eux-mêmes restent dans le stockage et se retirent depuis Supabase › Storage.
- **Liens externes** : tous en `noopener` ; aucune API Instagram ou WhatsApp n'est utilisée, uniquement des liens standard.
