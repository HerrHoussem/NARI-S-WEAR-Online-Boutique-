# NARI’S WEAR v2.4 — Stock par couleur et par taille

Cette version ajoute :

- plusieurs photos pour chaque couleur ;
- stock global par couleur ;
- stock optionnel par taille pour chaque couleur ;
- désactivation automatique des tailles épuisées ;
- changement automatique de galerie quand la couleur change ;
- couleur et taille sélectionnées dans la commande Supabase et le message WhatsApp.

## Supabase

Aucune nouvelle migration SQL n’est nécessaire si `product-variants-migration.sql` a déjà été exécuté. Les stocks par taille sont enregistrés dans la colonne JSONB `variants`.

## Administration

Dans chaque couleur, utilisez **Stock par taille**. Laissez la liste vide pour conserver le fonctionnement par stock global de la couleur.
