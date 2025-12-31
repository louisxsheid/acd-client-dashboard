# AeroCell Client Dashboard

## What This Is
Client-facing dashboard for AeroCell's B2B data intelligence platform. Clients use this to browse tower data, search leads, and view analytics on cell tower ownership data.

## Business Context
AeroCell provides market intelligence for the cell tower industry:
- Detects hidden cell tower assets via ML (small cells, rooftops, rural towers)
- Pierces corporate veil to find actual decision-makers behind LLCs/Trusts
- Provides life event signals (age 65+, divorce, legal disputes) indicating seller readiness
- 98%+ accuracy target vs industry 60-70%

See `/Users/leonardob/dev/AeroCellpipeline/context/master-prompt-v2.md` for full business context.

## Tech Stack
- **Framework**: SvelteKit 2 + TypeScript
- **UI**: Custom Svelte components, dark theme
- **Map**: deck.gl + MapLibre GL
- **Search**: Meilisearch (fast full-text search)
- **Database**: PostgreSQL via Hasura GraphQL
- **Auth**: Auth.js with credentials provider
- **Deploy**: Railway (Docker)

## Key Commands
```bash
npm run dev          # Start dev server (localhost:5173)
npm run build        # Production build
npm run check        # TypeScript check
npm run seed:user    # Create test user
npm run sync:meilisearch  # Sync search index
```

## Local Development
```bash
# Start Postgres + Meilisearch
docker compose -f docker-compose.dev.yml up -d

# Run app
npm run dev
```

## Project Structure
```
src/
├── routes/
│   ├── auth/        # Sign in/up pages
│   ├── map/         # Main dashboard with map
│   ├── analytics/   # Analytics page
│   └── api/         # API endpoints (search, tower details)
├── lib/
│   ├── components/  # Svelte components (35+)
│   ├── graphql/     # URQL client, queries
│   ├── server/      # Server-only (db, meilisearch)
│   └── types.ts     # TypeScript types
└── hooks.server.ts  # Auth middleware
```

## Key Components
- `DeckGLMap.svelte` / `ClientDeckGLMap.svelte` - Interactive tower maps
- `TowerList.svelte` / `TowerDetail.svelte` - Tower browsing
- `SearchBar.svelte` - Meilisearch-powered search
- `StatCard.svelte` - Metric display cards
- Various chart components (Bar, Doughnut, Timeline)

## Database Tables (via Hasura)
- `tower_sites` - Tower locations and site info
- `entities` - Normalized property owners
- `entity_contacts` - Contacts for entities
- `companies` / `users` - Client access control
- `company_towers` - Which towers each company can see

## Related Projects
- `ACDemoViewer/aerocell-demo` - Sales demo dashboard (React)
- `AeroCellpipeline` - Backend data pipeline
