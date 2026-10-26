# Client Detail and Listing Presentation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the client edit popup entry point with a readable client table and a parameterized client detail route that matches the application visual system.

**Architecture:** Keep the existing shared management screen for all master resources. Add a client-specific row renderer and navigation branch in the management page, expose the existing `GET /clients/:id` endpoint through the frontend API, and add a dedicated App Router page at `/gestion/clients/[id]` for the client detail. The detail page is read-only in this scope; editing behavior for other resources remains unchanged.

**Tech Stack:** Next.js App Router, TypeScript, CSS Modules, existing API client, existing UI primitives.

---

### Task 1: Add API coverage for fetching a client

**Files:**
- Modify: `frontend/src/lib/api/masters.api.ts`
- Test: `frontend/src/lib/api/masters.api.test.ts` (or the existing API test location)

1. Write a failing test proving `getClient(token, id)` requests `GET /clients/:id`.
2. Run the focused frontend test and confirm it fails because the helper is missing.
3. Add the typed `getClient` helper using the existing `apiRequest` function.
4. Run the focused test and the full frontend test suite.

### Task 2: Improve client listing presentation and navigation

**Files:**
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/page.module.css`

1. Add a failing component/API-level assertion for the client row navigation target or cover the behavior with the browser flow.
2. Change only the `clients` branch of `buildColumns` to render stacked values with semantic wrappers: client name/CUIT, address/location, and one contact block per contact.
3. Make client table rows navigate to `/gestion/clients/${id}` instead of opening `MasterModal`; preserve modal editing for every other master resource.
4. Add CSS Module classes for stacked cell content, secondary values, and contact blocks, using existing tokens and responsive wrapping.
5. Run lint/typecheck/build and inspect the live client list in the browser.

### Task 3: Add the parameterized client detail route

**Files:**
- Create: `frontend/src/app/gestion/clients/[id]/page.tsx`
- Create: `frontend/src/app/gestion/clients/[id]/ClientDetail.module.css`

1. Add the page using `useParams`, the stored session, `getClient`, `AppTopBar`, and existing `Button`/navigation conventions.
2. Render a consistent page header with breadcrumb, client name, CUIT/CUIL, active state, address information, and structured contact cards.
3. Add loading, unauthenticated, not-found/API error, and empty-contact states.
4. Add a back link to `/gestion/clients` and ensure the route is deep-linkable by client UUID.
5. Run the frontend build and manually navigate from the client table into the detail route, refresh the detail route directly, and return to the list.

### Task 4: Verification and regression checks

1. Run the frontend test suite.
2. Run the frontend build.
3. Run the Impeccable mechanical detector on the changed UI files.
4. Verify `localhost:3000/gestion/clients` and `/gestion/clients/<id>` respond without an overlay or console/runtime error.
5. Do not commit; leave all changes in the current working tree for the user’s final review.
