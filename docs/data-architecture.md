# Data Architecture

## Goal

This frontend uses a mock-first, API-later service structure so pages can start against stable frontend-safe models now and later switch to real backend data with minimal UI rewrites.

## Layers

### `src/services/core`

- service contracts/interfaces
- shared data-source selection config
- frontend-oriented return types for service methods

UI should depend on these contracts and frontend-safe models, not on raw backend DTOs.

### `src/services/mock`

- mock implementations of the service contracts
- safe placeholder outputs for early development
- no business-heavy fake datasets required at this stage

### `src/services/api`

- future API implementations for the same contracts
- currently typed placeholders only
- no real backend calls yet

### `src/services/adapters`

- DTO-to-frontend-model mapping layer
- future backend responses should be converted here before they reach pages

## Switching Data Sources

Data source selection is centralized in:

- `src/services/core/data-source.ts`
- `src/services/registry.ts`

Current default:

- all modules resolve to `mock`

Later options:

- switch the global default to `api`
- override one module at a time while other modules stay on mock

## Safe Integration Rule

Pages and shared UI must consume frontend-safe types from `src/types/`.

Do not:

- bind UI directly to backend response shape
- import DTO types into pages
- mix transformation logic into route components

Do:

1. fetch or receive backend data inside API services
2. map DTOs to frontend models in adapters
3. return frontend models through service contracts
4. let UI depend only on those frontend models

## Current Scope

This task establishes:

- contracts
- mock services
- API placeholders
- adapters
- central registry

It does not yet wire services into pages, hooks, or state management.
