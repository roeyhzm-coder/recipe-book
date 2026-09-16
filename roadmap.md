# Roadmap

- [x] Move Gemini calls to a server function with GEMINI_API_KEY secret; remove API-key UI/storage
- [x] Ingredient display: approximate kitchen-measure conversion next to gram/ml amounts, scaling with multiplier (detail view; verified 1x/2x)
- [x] Rating badge colors by score (red/amber/lime/green/teal/blue) on home cards and recipe page (verified 7.4/8.6/9.2)
- [x] Fix recipe list failing to load: stored base64 photos up to 8MB caused statement timeout; compressed existing rows (12 fixed) and added client-side image compression on upload
- [ ] Verify smart import works end to end after model-ranking fix
