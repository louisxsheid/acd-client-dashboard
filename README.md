# ACD Client Dashboard

Client-facing dashboard for viewing tower data with authentication, search, and analytics.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Railway Deployment                        │
├─────────────────┬───────────────────┬───────────────────────┤
│  SvelteKit App  │   Meilisearch     │   PostgreSQL + Hasura │
│  (This Project) │   (Search)        │   (ACD-API)           │
└─────────────────┴───────────────────┴───────────────────────┘
```

## Features

- **Authentication**: Email/password via Auth.js
- **Search**: Blazing fast search via Meilisearch
  - Search by entity name, contact name, address, city, state
  - Coordinate search (lat, lng)
  - Fuzzy matching / typo tolerance
- **Map View**: Interactive deck.gl map with tower points
- **Tower List**: Paginated, searchable list
- **Tower Details**: Full site, entity, and contact information
- **Analytics**: (Coming soon) Collapsible analytics section

## Tech Stack

- **Framework**: SvelteKit 2 with TypeScript
- **UI**: Custom components with dark theme
- **Map**: deck.gl + MapLibre GL
- **Search**: Meilisearch
- **Database**: PostgreSQL via Hasura GraphQL
- **Auth**: Auth.js with credentials provider
- **Deployment**: Railway (Docker)

## Environment Variables

```bash
# Auth.js
AUTH_SECRET=your-auth-secret
AUTH_TRUST_HOST=true

# Database
DATABASE_URL=postgres://...

# Hasura
VITE_HASURA_GRAPHQL_ENDPOINT=https://your-hasura.railway.app/v1/graphql
HASURA_ADMIN_SECRET=your-secret

# Meilisearch
MEILISEARCH_HOST=https://your-meilisearch.railway.app
MEILISEARCH_API_KEY=your-master-key
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Railway Deployment

1. Create a new Railway project
2. Add services:
   - **Meilisearch**: Use the official Meilisearch template
   - **Client Dashboard**: Deploy from GitHub repo
3. Set environment variables
4. Run Meilisearch sync to populate search index

### Meilisearch Setup

After deploying, run the sync script to populate the search index:

```bash
# Via Railway CLI or in the app
npm run sync:meilisearch
```

## Database Schema

The client system uses these tables (in the main ACD database):

- `entities` - Normalized property owners
- `entity_contacts` - Contacts belonging to entities
- `tower_sites` - Tower location and site info
- `companies` - Client companies
- `users` - Client users
- `api_keys` - API access keys
- `company_towers` - Access control (which towers each company can see)

See `migrations/005_client_system.sql` in acd-api for full schema.

## Project Structure

```
src/
├── routes/
│   ├── auth/           # Sign in, sign up, forgot password
│   ├── map/            # Main dashboard with map
│   ├── settings/       # User settings, API keys
│   └── api/            # API endpoints
├── lib/
│   ├── components/     # Svelte components
│   ├── graphql/        # URQL client and queries
│   ├── server/         # Server-only code (DB, Meilisearch)
│   └── types.ts        # TypeScript types
└── auth.ts             # Auth.js configuration
```
