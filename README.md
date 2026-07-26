# Nari's Wear — GitHub Pages + Supabase

## Setup
1. Create a Supabase project.
2. Run `supabase-setup.sql` in the Supabase SQL Editor.
3. Copy the Project URL and anon public key into `config.js`.
4. Upload this folder to the root of a GitHub repository.
5. Enable GitHub Pages from the `main` branch and `/root`.

## Included
- Live Supabase product catalog
- Safe demo mode before configuration
- Search, filters and sorting
- Stock and sold-out indicators
- All 58 Algerian wilayas
- Algerian phone validation
- Order storage plus WhatsApp confirmation
- Responsive mobile layout
- Safer database text rendering

Replace the placeholder hero, story and lookbook areas with real boutique photos before launch.

## Product colors and galleries
Before using the new color-variant editor, run `product-variants-migration.sql` in the Supabase SQL Editor.
The admin can then add several colors, set stock per color, and upload multiple photos for each color. Selecting a color on the storefront changes the product gallery automatically.
