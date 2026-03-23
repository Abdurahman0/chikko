# Getting Started

## Run The Project

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

## Structure Overview

- `src/app`: routes and route-level pages
- `src/layout`: shell layout components
- `src/components/shared`: reusable UI building blocks
- `src/config`: module, route, and navigation config
- `src/constants`: typed frontend constant lists and labels
- `src/types`: frontend-safe domain and architecture models
- `src/services`: contracts, mock services, API placeholders, adapters, and registry
- `src/styles`: tokens, reusable CSS utilities, and global shell styles

See also:

- [project-structure.md](c:\Users\HP\OneDrive\Desktop\chikko\docs\project-structure.md)
- [frontend-architecture.md](c:\Users\HP\OneDrive\Desktop\chikko\docs\frontend-architecture.md)
- [data-architecture.md](c:\Users\HP\OneDrive\Desktop\chikko\docs\data-architecture.md)

## How To Add A New Feature Module

1. add or confirm the frontend-safe types in `src/types`
2. add route and navigation metadata in `src/config`
3. create route-level pages under `src/app/pages`
4. build feature-owned UI later under `src/features/<module>`
5. keep shared UI in `src/components/shared`
6. add service contracts or extend them in `src/services/core`

## How To Build Pages

Use the shared page composition system under `src/components/shared/page`:

- `PageLayout`
- `PageHeader`
- `PageSection`
- `PageCard`
- `EmptyState`
- `LoadingState`

The current placeholder pages demonstrate the intended scaffold pattern.

## Services: Mock vs API

The frontend is mock-first by default.

Current service architecture:

- `src/services/core`: contracts and data-source config
- `src/services/mock`: active mock implementations
- `src/services/api`: future API implementations
- `src/services/adapters`: DTO-to-frontend-model mapping
- `src/services/registry.ts`: central typed resolver

UI should import services from `src/services`, not from `mock` or `api` folders directly.

## How To Switch Data Source

Data source selection is centralized in:

- `src/services/core/data-source.ts`

You can:

- switch the default mode for all modules
- override one module at a time to `api`
- keep the rest on `mock` during gradual backend rollout

## Safe Backend Integration Rule

When backend endpoints arrive:

1. create or update API services
2. map backend DTOs in `src/services/adapters`
3. return frontend-safe models from service contracts
4. keep pages and shared UI dependent only on `src/types` models
