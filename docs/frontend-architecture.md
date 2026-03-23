# Frontend Architecture

## 1. Project Purpose Summary

Chikko is planned as an admin CRM and AI sales agent dashboard frontend built with React and TypeScript. The immediate goal of this foundation task is to define a clean product structure that later tasks can use to add routing, layout, reusable UI, mock-driven screens, and eventual backend integration without reworking the information architecture.

This foundation is intentionally limited to project setup, folder structure, architecture definition, and a machine-readable module map. No business pages, service layer, data fetching, or backend coupling are introduced in this task.

## 2. Chosen Frontend Setup

- Framework: React
- Language: TypeScript
- Build tool: Vite
- Styling for starter screen: plain CSS only
- Scope choice: no routing library, state library, UI kit, or API tooling yet

Why this setup:

- Vite keeps the initial React project fast and lightweight.
- TypeScript provides a stable contract for architecture config from the start.
- Avoiding extra libraries at Task 1 keeps the foundation adaptable while product structure is still being defined.

## 3. Suggested Top-Level Frontend Structure

```text
src/
  app/
    pages/
  components/
  config/
  constants/
  features/
  hooks/
  layout/
  lib/
    utils/
  mock/
  services/
  styles/
  types/
docs/
```

Structure intent:

- `app/pages`: future route-level screens and route composition
- `features`: module-owned business UI and feature slices
- `components`: cross-module reusable UI primitives and composites
- `layout`: admin shell, navigation, header, responsive frame
- `constants`: stable app-wide constants and enum-like values
- `types`: shared TypeScript contracts, starting with architecture-only types
- `config`: machine-readable product structure and app-level configuration
- `docs`: architecture and delivery guidance
- `mock`: mock-first data sources for future tasks
- `services`: future API adapters and data-access boundaries
- `hooks`: reusable React hooks
- `lib/utils`: framework-agnostic helpers and mapping utilities

## 4. Role Model And Access Approach

Canonical frontend roles:

- `developer`
- `admin`
- `operator`

Architecture-level access rules:

- `developer` has broad access across operational, configuration, and system modules.
- `admin` has broad access across operational modules, but `ai-settings` and `logs` are not standard admin modules.
- `operator` access is not fully static. Operator-visible modules, pages, and actions must later be driven by backend-returned permissions.

Access implementation direction for later tasks:

- Navigation hiding is necessary but not sufficient.
- Direct URL access must also be guarded so hidden pages cannot be opened manually.
- Unauthorized access should later redirect to a safe page such as dashboard or an access-denied screen.
- Developer and admin navigation can mostly start from role-based rules.
- Operator navigation and allowed actions must stay permission-aware from the start of route architecture.

This task does not implement auth or permission guards. It only makes the architecture ready for them.

## 5. Main Frontend Modules

### Dashboard

Purpose:
Operational overview, KPI monitoring, and safe landing page after login.

Planned screens:

- Dashboard Home
- Performance Snapshot

### Leads

Purpose:
Lead intake, qualification, ownership, and movement through the top of the sales funnel.

Planned screens:

- Lead List
- Lead Detail
- Create Lead
- Edit Lead

### Customers

Purpose:
Customer record management after qualification or conversion, including relationship context and historical review.

Planned screens:

- Customer List
- Customer Detail
- Create Customer
- Edit Customer

### Products

Purpose:
Catalog administration and product reference information used by order and payment workflows.

Planned screens:

- Product List
- Product Detail
- Create Product
- Edit Product

### Orders

Purpose:
Sales conversion outcomes, order lifecycle visibility, and coordination with downstream operational processes.

Planned screens:

- Order List
- Order Detail
- Create Order
- Edit Order

### Payments

Purpose:
Payment visibility, reconciliation support, and commercial follow-up separate from order state.

Planned screens:

- Payment List
- Payment Detail
- Reconciliation Queue

### Chat

Purpose:
AI sales-agent conversation review and operational follow-up.

Planned screens:

- Chat Sessions
- Chat Detail

### Notifications

Purpose:
Alert review, acknowledgement workflows, and notification preference readiness.

Planned screens:

- Notification Center
- Notification Preferences

### Profile

Purpose:
Personal account surface for the signed-in user.

Planned screens:

- Profile Overview
- Profile Preferences

### AI Settings

Purpose:
AI configuration and agent-operation controls intended for developer-level access.

Planned screens:

- AI Settings Overview
- AI Policies
- Agent Behavior

### Logs

Purpose:
System and audit visibility intended for developer-level troubleshooting and review.

Planned screens:

- Event Logs
- Audit Log

## 6. Module Grouping

Operational modules:

- Dashboard
- Leads
- Customers
- Products
- Orders
- Payments
- Chat
- Notifications

Intelligence/configuration modules:

- AI Settings

Personal/system modules:

- Profile
- Logs

Role-aware visibility summary:

- `developer`: broad/full module access, including `ai-settings` and `logs`
- `admin`: broad operational access, without treating `ai-settings` and `logs` as standard admin modules
- `operator`: permission-scoped visibility and action access, based on backend-returned permissions

## 7. Cross-System Shared Capabilities

These are shared concerns, not standalone business domains:

- Auth foundation readiness
- Global search readiness across high-volume modules
- Shared filtering conventions for list-heavy admin surfaces
- Export flow readiness for reports and operational records
- Audit/activity support for key entity history and operator actions
- Role-aware navigation and access readiness
- Permission-aware route guard readiness
- Safe unauthorized redirect handling
- Notification badge support in the app shell
- Responsive admin-shell readiness for desktop-first but mobile-safe usage
- UI state patterns for empty, loading, error, and success states

These concerns should be built as shared systems later, not reimplemented per module.

## 8. Recommended Future Implementation Order

Recommended sequence for later tasks:

1. Auth foundation
2. App shell, routing, layout, navigation, and shared page foundation
3. Dashboard
4. Leads
5. Orders
6. Payments
7. Basic Products
8. Basic Chat
9. Customers
10. Notifications
11. Profile
12. AI Settings
13. Logs

Reasoning:

- Auth and shell foundations must exist before role-aware routing and navigation can be built safely.
- Dashboard is the best safe landing page and route fallback target.
- Leads, orders, and payments reflect the most immediate operational direction.
- Products and chat can follow with a basic first pass once the core flow exists.
- Customers, notifications, profile, AI settings, and logs can be layered in after the core operational path is stable.

## 9. Mock-First, API-Later Development Notes

The project is expected to start with mock data while backend endpoints are developed in parallel.

Recommended rule:

- Screens should consume frontend-safe UI models.
- Mock data should already match those UI models.
- When APIs become available, raw backend responses should be mapped into the same UI models inside adapters or mapping utilities.
- Page components should not depend directly on backend response shape.

Benefits:

- UI development can proceed independently of backend timing.
- API migration later becomes a mapping task instead of a page rewrite.
- Backend contract changes stay localized instead of leaking into all screens.

This rule also applies to permissions:

- mock auth and mock permission payloads should later map into frontend-safe access models
- route and navigation decisions should consume those frontend-safe models, not raw backend response objects

## 10. Scalability Notes

To keep the frontend scalable:

- Separate route-level pages from module-owned feature implementation.
- Keep reusable UI in shared `components`, not inside domain modules.
- Keep service adapters separate from UI state and component composition.
- Introduce entity-specific types later inside the appropriate feature boundaries, not globally by default.
- Prefer explicit module ownership so features can expand without cross-folder ambiguity.

## 11. Why the Modules Are Separated This Way

The separation follows product workflow boundaries instead of only database entities.

- `Leads` and `Customers` are distinct because pre-conversion and post-conversion workflows are different.
- `Orders` and `Payments` are separated because commercial fulfillment and payment reconciliation are operationally different concerns.
- `Chat` and `Logs` are separated because operator-facing conversation review is different from developer-focused troubleshooting and audit visibility.
- `AI Settings` is isolated because it is a higher-sensitivity configuration area and should not be treated as a standard operational admin module.
- `Profile` remains separate from system modules because it is user-scoped rather than business-scoped.

This structure keeps modules understandable for product, design, and engineering while still allowing shared infrastructure later.
