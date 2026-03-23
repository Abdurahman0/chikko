# Project Structure

## Purpose

This project uses a small, app-first React structure intended for a mock-first CRM/admin frontend that will later grow into feature modules without mixing route concerns, shell concerns, and business logic.

## Main Folders

### `src/app`

Purpose:
Application-level composition only.

What belongs here:

- route registration
- route wrappers and route gates
- route-level pages
- future app bootstrap concerns tied to routing/session startup

What should not go here:

- reusable shared UI components
- feature-specific business logic
- generic utility helpers

Current pattern:

- `app/routes`: router setup and route-level wrappers
- `app/pages/public`: pages rendered outside the internal shell
- `app/pages/protected`: pages rendered inside the internal shell

### `src/layout`

Purpose:
Shared layout primitives for the internal application shell.

What belongs here:

- app shell
- sidebar
- topbar
- future shell-only layout pieces

What should not go here:

- business module widgets
- feature-specific cards or lists

### `src/components`

Purpose:
Reusable UI shared across multiple features or app areas.

What belongs here:

- generic presentational components
- shared empty states
- shared placeholders
- future reusable form/table primitives

What should not go here:

- route definitions
- feature-owned business UI that only belongs to one module

Current pattern:

- `components/shared`: cross-feature reusable components

### `src/features`

Purpose:
Business modules owned by product domain.

What belongs here:

- leads
- customers
- orders
- products
- payments
- chat
- notifications
- future domain logic tied to one module

What should not go here:

- app shell
- app-wide route bootstrap
- generic shared UI

Recommended future pattern:

```text
features/
  leads/
    components/
    pages/
    hooks/
    services/
    types/
    utils/
```

Guideline:

- keep feature code inside its module until at least two modules genuinely need to share it
- only promote code to `components`, `hooks`, `lib`, or `services` when it is truly cross-feature

### `src/config`

Purpose:
Static app configuration and architecture metadata.

What belongs here:

- module map
- route config
- navigation config
- future environment-safe frontend config

What should not go here:

- runtime API clients
- feature logic

### `src/constants`

Purpose:
Stable global constants that are not better represented as config records.

Examples later:

- date format tokens
- pagination defaults
- storage keys

### `src/types`

Purpose:
Shared TypeScript contracts used across multiple app areas.

What belongs here:

- architecture-level types
- future shared UI contracts

What should not go here:

- all business entity types by default

Rule:

- feature-specific types should stay inside `features/<module>/types` unless multiple modules depend on them

### `src/services`

Purpose:
Cross-app service boundaries and API adapters later.

What belongs here later:

- API clients
- DTO-to-UI mapping adapters
- shared transport helpers

What should not go here:

- page rendering logic
- hardcoded mock pages

### `src/hooks`

Purpose:
Reusable hooks shared across app areas.

What belongs here later:

- shell hooks
- reusable query-state hooks
- reusable responsive helpers

Rule:

- feature-specific hooks should stay inside the feature until reuse is proven

### `src/mock`

Purpose:
Mock-first data sources used before backend endpoints are ready.

Rule:

- mock data should target frontend-safe UI models, not raw backend response guesses

### `src/lib`

Purpose:
Low-level helpers that are framework-light or cross-cutting.

What belongs here:

- utilities
- mapping helpers
- formatting helpers

### `src/styles`

Purpose:
Shared visual foundation.

Current pattern:

- `tokens.css`: design tokens
- `utilities.css`: reusable layout and UI rule classes
- `global.css`: app-wide and shell-level styling

## Mock-First, API-Later Fit

The structure should support the following progression:

1. build pages against frontend-safe UI models
2. keep mock data in `src/mock`
3. later add API adapters in `src/services`
4. map backend responses into the same UI models before they reach pages

Pages should not depend directly on raw backend response shapes.

## Practical Rules

- Put route composition in `src/app/routes`, not inside feature folders.
- Put shell layout in `src/layout`, not in `src/app/pages`.
- Keep shared reusable UI out of feature folders unless it is truly feature-owned.
- Keep feature logic local first; extract later only when reuse is real.
- Avoid adding new top-level folders unless there is a clear responsibility boundary.
- Prefer shallow, readable folder trees over deep abstraction.
