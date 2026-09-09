# Locations backend + address search — design

Date: 2026-09-09
Status: approved, pending implementation plan

## Purpose

The dashboard has a map view (`Locations.js`) and a stub list view
(`LocationList.js`) but no way to persist locations — everything is
hardcoded. This project adds a real backend + database so users can
add, search for, edit, and delete named locations, with address
lookup backed by MapTiler's geocoding API.

As part of this work, the app's unused sign-in/sign-up auth UI is
removed. It was never backed by a real backend, and the plan going
forward is server/proxy-level auth (`.htpasswd` or similar) added
later as its own project — not application-level auth. The locations
API therefore ships with no authentication or authorization.

## Non-goals

- No in-app authentication/authorization (deferred to a future,
  separate `.htpasswd`-style project at the reverse-proxy/server
  level).
- No per-user data — locations are a single shared list.
- No frontend component test suite for this feature (see Testing).
- No PostGIS / advanced geo queries — plain lat/lng columns are
  sufficient at this scale.

## Architecture

- New `/server` directory: a plain Express app.
- Postgres for storage, accessed via the `pg` driver (no ORM — a
  single table doesn't justify Prisma/Knex's overhead).
- Schema managed via `node-pg-migrate` (plain SQL migration files,
  no generated client, easy to read top to bottom).
- Dev: backend runs on port 4000. CRA's `package.json` gets
  `"proxy": "http://localhost:4000"` so frontend `fetch('/api/...')`
  calls work in dev without CORS configuration.
- Production: the Express app serves the built React static files
  (`build/`) *and* the API from one process — one deploy target,
  matching the "self-hosted Node/Express" decision.
- Config via `.env` (already gitignored pattern in this repo):
  `DATABASE_URL` for Postgres. The MapTiler key stays where it
  already lives today — hardcoded client-side in `Locations.js` — for
  the map tiles. See "Geocoding" below for why it isn't proxied
  through the backend.

## Data model

Single table, `locations`:

```sql
CREATE TABLE locations (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  notes       text,
  address     text NOT NULL,      -- formatted address string from geocoding
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

`updated_at` is bumped by the API on every `PUT`, not by a DB trigger
— keeps the migration simple.

## API

Base path `/api/locations`, JSON in/out, no auth middleware:

| Method | Path                 | Body                                | Notes |
|--------|----------------------|--------------------------------------|-------|
| GET    | `/api/locations`     | —                                    | Returns all locations, feeds map markers + list view |
| POST   | `/api/locations`     | `{name, notes?, address, lat, lng}`  | 400 if `name`/`address` missing, or `lat`/`lng` not numeric within valid ranges (-90..90 / -180..180) |
| PUT    | `/api/locations/:id` | any subset of the above fields       | 404 if id doesn't exist |
| DELETE | `/api/locations/:id` | —                                    | 404 if id doesn't exist |

Validation happens server-side regardless of the missing auth layer —
bad data shouldn't be saveable just because there's no login.

## Geocoding (address search)

Address search-as-you-type calls MapTiler's geocoding API **directly
from the frontend**, not proxied through the backend:

- The MapTiler key is already present in the client bundle today (for
  map tiles), so calling the geocoding endpoint from the browser adds
  no new exposure.
- Proxying every keystroke through Express would add latency and
  backend code for no security benefit at this exposure level.
- The backend only gets involved once the user picks a result and
  hits save — it stores the final `{name, notes, address, lat, lng}`,
  it never talks to MapTiler itself.

If server-level auth (`.htpasswd`) is added later, this can be
revisited if hiding the key becomes a real goal — out of scope now.

## Frontend changes

- **`Locations.js`**: keep the existing map. Add a search input that
  calls MapTiler geocoding directly and shows autocomplete
  suggestions. Picking a suggestion drops a draft marker and opens a
  small form (name, notes, position confirm/adjust) that `POST`s to
  `/api/locations` on save. On load, `GET /api/locations` renders all
  saved locations as markers; clicking one opens edit/delete.
- **`LocationList.js`**: replace the stub with a real list (table or
  cards) of saved locations, with edit and delete actions against the
  same `/api/locations` endpoints. (Centering the map on a selected
  row is a nice-to-have, not required for this pass.)
- **Auth removal**: delete `src/views/auth/*` and `src/layouts/auth/*`,
  remove their routes from `src/routes.js`, and remove any nav links
  to sign-in/sign-up. The app's current authenticated landing route
  becomes the only landing route.

## Error handling

- Backend: a centralized Express error-handling middleware returns
  `{error: message}` JSON with correct status codes — 400 for
  validation failures, 404 for missing records, 500 for anything
  unexpected. Unexpected errors are logged server-side; the client
  never sees stack traces or raw DB error text.
- Frontend: a failed geocode search shows an inline "no results" or
  "network error" message in the search UI itself. A failed save or
  delete shows a Chakra `useToast` notification and preserves the
  user's in-progress form input (no silent data loss on failure).

## Testing

- Backend: an integration test suite (Jest + `supertest`) exercising
  the real `/api/locations` routes against a real (test) Postgres
  database — covers create/list/update/delete and the validation
  error paths.
- Frontend: verified by running the app (via the `run` skill) rather
  than a new component test suite — this repo has no existing
  frontend test coverage, and introducing one for a single feature
  would be scope creep beyond what was asked for.

## Open questions / follow-ups (explicitly deferred)

- Real auth (`.htpasswd` or similar) at the server/proxy level — a
  separate future project, not part of this one.
- Whether to proxy geocoding through the backend once real auth
  exists — revisit then, not now.
