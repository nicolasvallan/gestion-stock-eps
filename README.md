# Gestion stock EPS — V5.3.3

Version basée sur la V5.3.2.

## Correction importante de navigation
Le filtre d'activité et la recherche ne dépendent plus de la reconstruction de la page lors des synchronisations Supabase.

Concrètement :
- si « Arts du cirque » est sélectionné, l'application reste sur « Arts du cirque » ;
- les synchronisations automatiques toutes les quelques secondes ne remettent plus « Toutes les activités » ;
- après une modification d'un matériel, l'activité sélectionnée reste active ;
- la recherche saisie reste active ;
- les lignes de statut dépliées restent ouvertes ;
- le menu déroulant des lieux est conservé.

La base Supabase et les données ne sont pas modifiées.
