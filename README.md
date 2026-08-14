# Gestion stock EPS — V5.4

## Correction de fond de la synchronisation

Les versions précédentes essayaient de restaurer l'état de l'écran après chaque synchronisation.
La V5.4 corrige la cause du problème :

- Supabase est toujours vérifié automatiquement toutes les 4 secondes.
- Si aucune donnée n'a changé, l'interface n'est plus reconstruite.
- Le défilement horizontal reste donc exactement où l'utilisateur l'a placé.
- L'activité sélectionnée reste affichée.
- Les lignes de statuts restent ouvertes.
- La recherche et la position dans la page restent stables.
- Si un autre téléphone modifie réellement les données, l'affichage est alors mis à jour.

Le fichier JavaScript utilise aussi une URL versionnée (`app.js?v=5.4`) afin d'éviter qu'un ancien fichier reste servi par le cache du navigateur ou de la PWA.

La base Supabase, les données et l'authentification ne sont pas modifiées.
