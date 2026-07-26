# Image fix applied

The previous `index.html` still contained the placeholder CSS and did not reference the included image files.

Fixed paths:

- `./assets/images/hero-naris.webp?v=2`
- `./assets/images/naris-brand-art.webp?v=2`

The hero now uses a real `<img>` element instead of relying only on a CSS background. This is more reliable on GitHub Pages.

After uploading, wait for GitHub Pages to finish deploying and refresh with Ctrl+F5.
