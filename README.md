# FruitDrama.io — Clone

Copie fidèle de [fruitdrama.io](https://fruitdrama.io) — SaaS de génération de vidéos fruits dramatiques pour TikTok/Reels/Shorts.

## Design

- Fond `#0A0A0A`, accent `#C8FF00`, police Inter
- Landing marketing + app avec sidebar
- Wizard 4 étapes sur `/generate`

## Routes

| Route | Page |
|-------|------|
| `/` | Landing (Hero, How it works, Social proof, Testimonials, Tarifs, FAQ) |
| `/generate` | Wizard : Genre → Modèle → Personnalisation → Prompt |
| `/dashboard` | Mes vidéos |
| `/credits` | Crédits & Plans |
| `/settings` | Paramètres |
| `/login`, `/register` | Auth (à brancher) |

## Démarrage

```bash
npm install
cp .env.example .env.local
# Renseigner ANTHROPIC_API_KEY et NANO_BANANA_API_KEY
npm run dev
```

## API

- `POST /api/generate-script` — script JSON via Claude
- `POST /api/suggest-idea` — idée de drama aléatoire
- `POST /api/generate-video` — clip Nano Banana par scène
- `GET /api/video-status?video_id=` — polling statut

## Supabase

Exécuter `supabase/schema.sql` dans l'éditeur SQL Supabase.
