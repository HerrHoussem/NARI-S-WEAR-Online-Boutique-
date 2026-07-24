# Product hover fix

The quick-order overlay was positioned relative to the entire product card, so it could cover the price and stock details.

Fixed:
- The button now lives inside the product image area.
- Product name, price, colors and stock are never covered.
- Desktop: the button appears smoothly on image hover.
- Mobile: the button remains visible inside the image area.
- Added a subtle image zoom/dimming effect.
