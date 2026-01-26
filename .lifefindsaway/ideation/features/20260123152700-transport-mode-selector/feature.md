# Feature – Phase A (Exploration)

## Identifiant
transport-mode-selector

## Résumé
Permettre à l'utilisateur de choisir un mode de transport (piéton/voiture) pour adapter la vitesse de simulation. Le multiplicateur de vitesse existant reste fonctionnel.

## Problème adressé
La vitesse de déplacement simulée ne correspond pas au mode de transport réel de l'utilisateur. Un piéton et une voiture n'ont pas la même vitesse de base.

## Hypothèse de valeur
Adapter la vitesse de base au mode de transport offre une expérience plus réaliste et permet de mieux calibrer les timings des audio guides.

## Utilisateurs concernés
- Utilisateurs en navigation réelle
- Développeurs testant l'application

## Scénarios d'usage pressentis
- **Scénario 1** : L'utilisateur est à pied → sélectionne "Piéton" → vitesse de base ~5 km/h
- **Scénario 2** : L'utilisateur est en voiture → sélectionne "Voiture" → vitesse de base ~50 km/h
- **Scénario 3** : Le multiplicateur x2 s'applique sur la vitesse de base choisie

## Idées de solution (non exclusives)

### Option A : Toggle simple Piéton/Voiture
Deux boutons ou un switch pour choisir le mode.

### Option B : Sélecteur étendu
Piéton / Vélo / Voiture avec vitesses de base configurables.

## Critères d'acceptation (brouillon)

- [ ] Sélecteur de mode visible (piéton/voiture minimum)
- [ ] Vitesse de base différente selon le mode
- [ ] Le multiplicateur existant s'applique sur la vitesse de base
- [ ] Persistance du choix (localStorage ou préférences)

## Contraintes connues
- Ne pas complexifier l'UI pour l'utilisateur lambda
- Compatible avec le système de multiplicateur existant

## Dépendances pressenties
- Système de vitesse existant
- Lié à l'Epic "Audio Guide Adaptatif" (contexte-deplacement)

## Questions ouvertes
- Vitesses de base par défaut ? (5 km/h piéton, 30-50 km/h voiture ?)
- Ajouter le vélo ?
- Où placer le sélecteur dans l'UI ?

## Notes libres
Cette feature est un premier pas vers la détection automatique de mode de transport prévue dans l'Epic "Audio Guide Adaptatif".
