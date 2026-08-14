# Gestion stock EPS — V5.1 mot de passe commun

Cette version remplace la connexion par compte visible par un accès très simple.

## Connexion
- L'utilisateur voit uniquement **Mot de passe** puis **Entrer**.
- L'adresse technique Supabase est utilisée automatiquement en arrière-plan.
- Le mot de passe commun n'est PAS présent dans les fichiers de l'application.
- Le mot de passe saisi est envoyé à Supabase Auth pour vérification.
- Les inscriptions publiques et les connexions anonymes doivent rester désactivées dans Supabase.

## Synchronisation
Les données sont enregistrées dans Supabase et l'application actualise régulièrement l'inventaire partagé.

## Changer le mot de passe
Le mot de passe commun pourra être modifié dans Supabase sur l'unique utilisateur technique.
Aucune modification du code de l'application ne sera nécessaire.

## Migration V4.7
Si la base distante est vide et que les données V4.7 sont encore présentes dans le même navigateur, le bouton d'import local reste disponible.

## Premier test
1. Décompresser ce ZIP dans un nouveau dossier.
2. Ouvrir `index.html` avec Live Server.
3. Saisir le mot de passe commun créé dans Supabase.
4. Vérifier que l'inventaire s'ouvre.
5. Si proposé, importer les données locales V4.7.
