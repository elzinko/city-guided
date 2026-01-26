# Feature – Phase A (Exploration)

## Identifiant
bouton-feedback-github

## Résumé
Bouton "Feedback Beta" dans le frontend permettant aux utilisateurs de déclarer une anomalie ou suggérer une fonctionnalité. Le système crée automatiquement une issue GitHub avec le contexte utilisateur (historique d'actions) attaché.

## Problème adressé
En phase beta, les utilisateurs rencontrent des bugs ou ont des idées mais n'ont pas de moyen simple de les signaler. Le processus actuel (email, message, etc.) :
- Est fragmenté et difficile à suivre
- Ne capture pas le contexte technique
- N'est pas intégré au workflow de développement (GitHub Issues)

## Hypothèse de valeur
En offrant un bouton de feedback intégré :
- Les utilisateurs peuvent signaler des problèmes rapidement
- Le contexte technique (actions, logs, état de l'app) est automatiquement capturé
- Les issues GitHub sont créées directement, sans friction pour l'équipe
- Le taux de reporting de bugs augmente
- Les feedbacks sont de meilleure qualité (contexte complet)

⚠️ Hypothèse non validée

## Utilisateurs concernés
- **Beta-testeurs** : utilisateurs qui testent l'app et identifient des bugs
- **Utilisateurs actifs** : utilisateurs réguliers qui ont des idées d'amélioration
- **Équipe de développement** : reçoit des issues bien formattées avec contexte

## Scénarios d'usage pressentis
1. **Bug rencontré** : Utilisateur clique sur "Feedback", choisit "Bug", décrit le problème, soumet → Issue GitHub créée avec logs et historique
2. **Suggestion de feature** : Utilisateur a une idée, clique sur "Feedback", choisit "Feature", décrit l'idée, soumet → Issue GitHub créée
3. **Question** : Utilisateur ne comprend pas quelque chose, clique sur "Feedback", choisit "Question/Autre", soumet

## Idées de solution (non exclusives)

### Option A : Modal simple (MVP recommandé)
Interface en popup plein écran :
- Champ "Titre" (obligatoire)
- Champ "Description" (obligatoire, textarea)
- Radio buttons "Type" : Bug / Feature / Autre
- Checkbox "Inclure le contexte technique" (coché par défaut)
- Bouton "Envoyer"

Le contexte technique inclut :
- Historique des actions utilisateur (10 dernières)
- URL actuelle
- User agent (browser, OS)
- Timestamp

**Pros** : Simple, rapide à implémenter, UX claire  
**Cons** : Pas de preview de l'issue GitHub

### Option B : Interface avancée
Ajoute :
- Preview de l'issue avant envoi
- Upload de screenshot (facultatif)
- Sélection de labels GitHub (bug, enhancement, question)
- Champ "Email" (facultatif pour suivi)

**Pros** : Plus de contrôle pour l'utilisateur  
**Cons** : Plus complexe, peut décourager les feedbacks rapides

### Option C : Widget flottant
Bouton flottant en bas à droite (type chat widget) :
- Toujours visible
- Ouvre le modal au clic

**Pros** : Très accessible  
**Cons** : Peut gêner visuellement

## Implémentation technique (inspirée du projet GitHub existant)

**Référence** : https://github.com/elzinko/shopify-plugin-product-assistant

**Stack suggérée** :
- **Frontend** : Modal React avec formulaire
- **Backend** : API endpoint `/api/feedback` (Next.js API route)
- **GitHub API** : Utilisation de l'API GitHub pour créer l'issue
  - Token GitHub : stocké dans variable d'environnement `GITHUB_FEEDBACK_TOKEN`
  - Repo cible : `elzinko/city-guided` (à confirmer)
  
**Workflow** :
1. Utilisateur remplit le formulaire
2. Frontend envoie POST à `/api/feedback` avec :
   - Title
   - Description
   - Type (bug/feature/other)
   - Context (historique actions, URL, user agent)
3. Backend crée l'issue GitHub via API :
   ```
   POST https://api.github.com/repos/elzinko/city-guided/issues
   {
     "title": "...",
     "body": "...",
     "labels": ["feedback-beta", "bug"]
   }
   ```
4. Retourne succès à l'utilisateur

**Contexte technique à capturer** :
- Historique d'actions (breadcrumbs) : stocké en mémoire, max 50 actions
- URL courante
- Timestamp
- Browser/OS (user agent)
- Version de l'app (si disponible)

## Critères d'acceptation (brouillon)
- [ ] Bouton "Feedback" visible dans l'interface (position à définir)
- [ ] Cliquer sur "Feedback" ouvre un modal plein écran
- [ ] Le modal contient : Titre, Description, Type (Bug/Feature/Autre)
- [ ] L'utilisateur peut soumettre le feedback
- [ ] Une issue GitHub est créée automatiquement
- [ ] Le contexte technique (historique, URL, user agent) est inclus dans l'issue
- [ ] L'utilisateur reçoit une confirmation de soumission
- [ ] En cas d'erreur, un message clair est affiché
- [ ] Le token GitHub est sécurisé (variable d'environnement, pas exposé au frontend)

## Contraintes connues
- **Sécurité** : Le token GitHub ne doit JAMAIS être exposé côté client
  - Solution : API route Next.js côté serveur uniquement
- **Rate limiting** : API GitHub limite à 5000 req/heure (authenticated)
  - Solution : suffisant pour beta, monitoring si dépassement
- **Privacy** : Capture d'historique utilisateur peut être sensible
  - Solution : demander consentement, permettre de désactiver

## Hypothèses explicites
- Les utilisateurs beta acceptent de partager leur contexte technique pour aider au debugging
- Un formulaire simple (titre + description) suffit, pas besoin de champs complexes
- GitHub Issues est le bon outil pour tracker les feedbacks (vs. un système dédié)
- Le token GitHub peut rester dans les variables d'environnement (pas besoin d'OAuth)

## Dépendances pressenties
- **GitHub repo** : Repo cible pour les issues (elzinko/city-guided ?)
- **Token GitHub** : Token avec permission `repo` (write issues)
- **Système de tracking** : Besoin de stocker l'historique d'actions utilisateur (breadcrumbs)
  - Possibilité : Sentry, custom event logger, ou simple array en mémoire
- **API Next.js** : Endpoint `/api/feedback`

## Questions ouvertes
- Où placer le bouton "Feedback" ? (header, footer, bouton flottant ?)
- Quel repo GitHub utiliser pour les issues ?
- Faut-il permettre l'upload de screenshots ? (facilite le debugging mais complexe)
- Faut-il un système de suivi pour l'utilisateur ? (email quand l'issue est traitée)
- Comment gérer le spam ? (rate limiting par IP, CAPTCHA ?)
- Faut-il un mode "feedback anonyme" ou toujours demander un email ?

## Risques pressentis
- **Spam** : Possibilité de spam d'issues GitHub (mitigation : rate limiting, modération)
- **Privacy** : Capture de données sensibles dans l'historique (mitigation : filtrage, consentement)
- **Sécurité** : Exposition du token GitHub (mitigation : API route serveur uniquement)
- **Volume** : Trop de feedbacks peut submerger l'équipe (mitigation : labels, triage)

## Indicateurs de succès (indicatifs)
- Nombre de feedbacks soumis par semaine
- % de feedbacks qui mènent à une action (issue traitée)
- Taux d'erreur lors de la soumission (<1%)
- Temps moyen de résolution des bugs signalés (devrait diminuer grâce au contexte)

## Notes libres
- S'inspirer du code de https://github.com/elzinko/shopify-plugin-product-assistant
- Démarrer simple (Option A) et itérer si besoin
- Possibilité de désactiver le bouton en production (garder uniquement en beta/staging)
- Penser à ajouter un lien vers le repo GitHub dans le modal (transparence)
