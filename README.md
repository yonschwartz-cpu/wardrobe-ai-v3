# WARDROBE AI V3 — iPhone-first rebuild

## Deployment
1. Unzip this archive.
2. Upload the CONTENTS of `WARDROBE_AI_V3` to your GitHub repository (or use this folder as the Vercel Root Directory).
3. In Vercel, set the Root Directory to the folder containing `index.html`.
4. Redeploy. On iPhone, open in Safari → Share → Add to Home Screen.
5. Optional: add `OPENAI_API_KEY` and `BRAVE_SEARCH_API_KEY` to Vercel Settings → Environment Variables, then redeploy.

## Included and functioning without API keys
- Closet with watches, photo uploads, item details, original retailer links, favorites.
- School/Shabbos/casual/formal outfit rules, layering based on feels-like weather, learning from likes/dislikes and worn history.
- Open-Meteo live current, hourly, and 7-day weather; automatic refresh while open, manual city.
- Outfit journal/calendar, packing suggestions, care notes, statistics, style preferences, JSON backup.
- Mobile-first installable PWA.

## Optional live integrations
- AI Q&A stylist: OpenAI API key.
- Product URL analysis: Vercel serverless endpoint; only works when retailer pages expose metadata and allow server access.
- Discover: Brave Search API key. These are web results, not a verified shopping feed; prices and stock images are not guaranteed.

## Not yet implemented
- User accounts, cloud syncing and cloud photo storage.
- Native iOS App Store package or Apple WeatherKit.
- Automatic outfit-photo recognition.
- Verified product pricing, deep material analysis and actual cost-per-wear accounting.
- Fully automated destination-weather packing.

These require additional backend services and development. The UI does not claim they are working. Your old localStorage data under `wardrobe-ai-v2` is NOT migrated automatically. Export or retain your old app before replacing it.

## Security and privacy
Never put API keys in browser code. Wardrobe data is local to each browser and can be lost if website storage is cleared. Back up regularly.
