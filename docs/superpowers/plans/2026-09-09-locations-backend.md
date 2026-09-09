# Locations Backend + Address Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the dashboard a real backend so users can search for an address, save it as a named location, and see/edit/delete saved locations on a map and in a list — and remove the unused, unbacked sign-in/sign-up UI.

**Architecture:** A new `server/` Express app (own `package.json`, own `node_modules`) talks to Postgres via the `pg` driver — no ORM, one table. CRA's dev server proxies `/api/*` to it; in production the same Express app serves the built React app and the API from one process. Address search calls MapTiler's geocoding API directly from the browser (the MapTiler key is already client-side for map tiles); the backend only ever stores the location the user picked and saved.

**Tech Stack:** Express, `pg`, `node-pg-migrate`, Jest + `supertest` (backend tests), React (existing CRA app), `maplibre-gl` (already installed), MapTiler geocoding API.

**Spec:** `docs/superpowers/specs/2026-09-09-locations-backend-design.md`

## Global Constraints

- No authentication/authorization anywhere in this feature — the locations API is open. (Spec: "Non-goals")
- Locations are a single shared list, not per-user. (Spec: "Non-goals")
- No ORM — plain SQL via `pg`, migrations via `node-pg-migrate`. (Spec: "Architecture")
- Geocoding (address search) is called directly from the frontend to MapTiler, never proxied through the backend. (Spec: "Geocoding")
- `lat` must be a number in `[-90, 90]`; `lng` must be a number in `[-180, 180]`; both required on create. `name` and `address` are required strings on create. (Spec: "API")
- No new frontend test framework/tests are introduced for this feature — frontend is verified by running the app. (Spec: "Testing")
- Dev: backend on port 4000, frontend proxies `/api/*` to it. Prod: one Express process serves both the built frontend and the API. (Spec: "Architecture")

**Prerequisite (once, before Task 1):** a local PostgreSQL server must be running and reachable. Create two databases:

```bash
createdb rackie
createdb rackie_test
```

(Substitute your own Postgres connection details in the `.env`/`.env.test` files created in Task 1 if `createdb` isn't on your PATH or you're using a different host/user — any reachable Postgres 12+ works.)

---

### Task 1: Server scaffold — Express app, DB pool, health check

**Files:**
- Create: `server/package.json`
- Create: `server/db.js`
- Create: `server/errorHandler.js`
- Create: `server/index.js`
- Create: `server/jest.setup.js`
- Create: `server/.env` (gitignored)
- Create: `server/.env.test` (gitignored)
- Create: `server/.env.example`
- Create: `server/.gitignore`
- Create: `server/__tests__/health.test.js`
- Modify: `.gitignore` (root)

**Interfaces:**
- Produces: `server/db.js` exports `{ pool }` — a `pg.Pool` reading `DATABASE_URL` from the environment. All later backend tasks import this.
- Produces: `server/errorHandler.js` exports `{ HttpError, errorHandler }`. `HttpError` is `class HttpError extends Error { constructor(status, message) }`. `errorHandler` is a 4-arg Express error middleware. Task 4 uses both.
- Produces: `server/index.js` exports `{ app }` (an Express app, not listening) for `supertest` to import directly, and calls `app.listen()` only when run as the entry script (`require.main === module`).

- [ ] **Step 1: Create the server's `package.json`**

```json
{
  "name": "rackie-server",
  "version": "1.0.0",
  "private": true,
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js",
    "migrate:up": "node-pg-migrate up",
    "migrate:down": "node-pg-migrate down",
    "test": "jest"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "pg": "^8.12.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "node-pg-migrate": "^7.6.1",
    "supertest": "^7.0.0"
  },
  "jest": {
    "testEnvironment": "node",
    "setupFiles": ["<rootDir>/jest.setup.js"]
  }
}
```

- [ ] **Step 2: Install server dependencies**

Run: `cd server && npm install`
Expected: `node_modules` created under `server/`, no errors.

- [ ] **Step 3: Add server env files**

`server/.env`:
```
DATABASE_URL=postgres://localhost:5432/rackie
PORT=4000
```

`server/.env.test`:
```
DATABASE_URL=postgres://localhost:5432/rackie_test
```

`server/.env.example`:
```
DATABASE_URL=postgres://localhost:5432/rackie
PORT=4000
```

`server/.gitignore`:
```
node_modules
.env
.env.test
```

Modify root `.gitignore` — add at the end:
```

# server-local env (see server/.env.example)
server/.env
server/.env.test
```

- [ ] **Step 4: Create the DB pool module**

`server/db.js`:
```js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = { pool };
```

- [ ] **Step 5: Create the error handler module**

`server/errorHandler.js`:
```js
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  if (status === 500) {
    console.error(err);
  }
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : err.message,
  });
}

module.exports = { HttpError, errorHandler };
```

- [ ] **Step 6: Write the failing health check test**

`server/__tests__/health.test.js`:
```js
const request = require('supertest');
const { app } = require('../index');
const { pool } = require('../db');

afterAll(async () => {
  await pool.end();
});

describe('GET /api/health', () => {
  it('returns ok status when the database is reachable', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 7: Create the Jest setup file that loads `.env.test`**

`server/jest.setup.js`:
```js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.test') });
```

- [ ] **Step 8: Run the test to verify it fails**

Run: `cd server && npm test`
Expected: FAIL — `Cannot find module '../index'` (it doesn't exist yet).

- [ ] **Step 9: Create the Express app**

`server/index.js`:
```js
const path = require('path');
const express = require('express');
const { pool } = require('./db');
const { errorHandler } = require('./errorHandler');

const app = express();
app.use(express.json());

app.get('/api/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
});

if (process.env.NODE_ENV === 'production') {
  const buildDir = path.join(__dirname, '..', 'build');
  app.use(express.static(buildDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildDir, 'index.html'));
  });
}

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = { app };
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `cd server && npm test`
Expected: PASS — 1 passed. (Requires the `rackie_test` database from the Prerequisite to exist and be reachable.)

- [ ] **Step 11: Commit**

```bash
git add server/package.json server/db.js server/errorHandler.js server/index.js server/jest.setup.js server/.env.example server/.gitignore server/__tests__/health.test.js .gitignore
git commit -m "server: scaffold Express app with DB pool and health check"
```

(`server/.env` and `server/.env.test` are gitignored and won't be staged — that's expected.)

---

### Task 2: `locations` table migration

**Files:**
- Create: `server/migrations/1757440000000_create-locations.js`

**Interfaces:**
- Produces: the `locations` table with columns `id, name, notes, address, lat, lng, created_at, updated_at` — Task 3's repo functions and Task 4's routes depend on this exact shape.

- [ ] **Step 1: Write the migration**

`server/migrations/1757440000000_create-locations.js`:
```js
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE locations (
      id serial PRIMARY KEY,
      name text NOT NULL,
      notes text,
      address text NOT NULL,
      lat double precision NOT NULL,
      lng double precision NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE locations;`);
};
```

- [ ] **Step 2: Run the migration against both databases**

Run:
```bash
cd server
DATABASE_URL=postgres://localhost:5432/rackie npm run migrate:up
DATABASE_URL=postgres://localhost:5432/rackie_test npm run migrate:up
```
Expected: both commands print `> Migrating files: ... 1757440000000_create-locations` with no errors.

- [ ] **Step 3: Write a test confirming the schema**

`server/__tests__/schema.test.js`:
```js
const { pool } = require('../db');

afterAll(async () => {
  await pool.end();
});

describe('locations table', () => {
  it('has the expected columns', async () => {
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'locations'
       ORDER BY column_name`
    );
    const columns = rows.map((r) => r.column_name);
    expect(columns).toEqual([
      'address',
      'created_at',
      'id',
      'lat',
      'lng',
      'name',
      'notes',
      'updated_at',
    ]);
  });
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd server && npm test`
Expected: PASS — 2 passed (health + schema).

- [ ] **Step 5: Commit**

```bash
git add server/migrations/1757440000000_create-locations.js server/__tests__/schema.test.js
git commit -m "server: add locations table migration"
```

---

### Task 3: `locationsRepo` — database access functions

**Files:**
- Create: `server/db/locationsRepo.js`
- Create: `server/__tests__/locationsRepo.test.js`

**Interfaces:**
- Consumes: `server/db.js`'s `{ pool }` (Task 1).
- Produces: `server/db/locationsRepo.js` exports `{ listAll, create, update, remove, findById }`:
  - `listAll(): Promise<Location[]>`
  - `create({ name, notes, address, lat, lng }): Promise<Location>`
  - `findById(id): Promise<Location | undefined>`
  - `update(id, fields): Promise<Location | undefined>` — `fields` may contain any subset of `name, notes, address, lat, lng`
  - `remove(id): Promise<Location | undefined>`
  - `Location` shape: `{ id, name, notes, address, lat, lng, createdAt, updatedAt }`
  - Task 4's routes call these directly.

- [ ] **Step 1: Write the failing tests**

`server/__tests__/locationsRepo.test.js`:
```js
const { pool } = require('../db');
const repo = require('../db/locationsRepo');

beforeEach(async () => {
  await pool.query('TRUNCATE locations RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
});

describe('locationsRepo', () => {
  it('creates and lists a location', async () => {
    const created = await repo.create({
      name: 'Main Warehouse',
      notes: 'Loading dock on the east side',
      address: '123 Main St, Springfield',
      lat: 39.78,
      lng: -89.65,
    });
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Main Warehouse');

    const all = await repo.listAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(created.id);
  });

  it('creates a location without notes', async () => {
    const created = await repo.create({
      name: 'No Notes',
      address: '1 A St',
      lat: 1,
      lng: 1,
    });
    expect(created.notes).toBeNull();
  });

  it('updates a location and bumps updated_at', async () => {
    const created = await repo.create({
      name: 'Old Name',
      address: '1 A St',
      lat: 1,
      lng: 1,
    });
    const updated = await repo.update(created.id, { name: 'New Name' });
    expect(updated.name).toBe('New Name');
    expect(updated.address).toBe('1 A St');
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(created.updatedAt).getTime()
    );
  });

  it('removes a location', async () => {
    const created = await repo.create({
      name: 'Temp',
      address: '2 B St',
      lat: 2,
      lng: 2,
    });
    const deleted = await repo.remove(created.id);
    expect(deleted.id).toBe(created.id);

    const all = await repo.listAll();
    expect(all).toHaveLength(0);
  });

  it('returns undefined when removing a nonexistent location', async () => {
    const result = await repo.remove(999999);
    expect(result).toBeUndefined();
  });

  it('returns undefined when finding a nonexistent location', async () => {
    const result = await repo.findById(999999);
    expect(result).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd server && npm test -- locationsRepo`
Expected: FAIL — `Cannot find module '../db/locationsRepo'`.

- [ ] **Step 3: Implement the repo**

`server/db/locationsRepo.js`:
```js
const { pool } = require('../db');

function rowToLocation(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listAll() {
  const { rows } = await pool.query('SELECT * FROM locations ORDER BY id ASC');
  return rows.map(rowToLocation);
}

async function create({ name, notes, address, lat, lng }) {
  const { rows } = await pool.query(
    `INSERT INTO locations (name, notes, address, lat, lng)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, notes ?? null, address, lat, lng]
  );
  return rowToLocation(rows[0]);
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM locations WHERE id = $1', [id]);
  return rowToLocation(rows[0]);
}

async function update(id, fields) {
  const allowed = ['name', 'notes', 'address', 'lat', 'lng'];
  const keys = Object.keys(fields).filter((key) => allowed.includes(key));
  if (keys.length === 0) {
    return findById(id);
  }
  const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
  const values = keys.map((key) => fields[key]);
  const { rows } = await pool.query(
    `UPDATE locations
     SET ${setClause}, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, ...values]
  );
  return rowToLocation(rows[0]);
}

async function remove(id) {
  const { rows } = await pool.query(
    'DELETE FROM locations WHERE id = $1 RETURNING *',
    [id]
  );
  return rowToLocation(rows[0]);
}

module.exports = { listAll, create, update, remove, findById };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd server && npm test -- locationsRepo`
Expected: PASS — 6 passed.

- [ ] **Step 5: Commit**

```bash
git add server/db/locationsRepo.js server/__tests__/locationsRepo.test.js
git commit -m "server: add locationsRepo database access functions"
```

---

### Task 4: `/api/locations` routes — validation + CRUD + error handling

**Files:**
- Create: `server/routes/locations.js`
- Create: `server/__tests__/locationsRoutes.test.js`
- Modify: `server/index.js`

**Interfaces:**
- Consumes: `server/db/locationsRepo.js`'s `{ listAll, create, update, remove, findById }` (Task 3), `server/errorHandler.js`'s `{ HttpError }` (Task 1).
- Produces: an Express Router mounted at `/api/locations` in `server/index.js`, exposing `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` as described in the spec's API table. Task 7 (frontend API client) depends on these exact routes/status codes.

- [ ] **Step 1: Write the failing route tests**

`server/__tests__/locationsRoutes.test.js`:
```js
const request = require('supertest');
const { app } = require('../index');
const { pool } = require('../db');

beforeEach(async () => {
  await pool.query('TRUNCATE locations RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
});

describe('/api/locations', () => {
  it('creates then lists a location', async () => {
    const createRes = await request(app)
      .post('/api/locations')
      .send({ name: 'HQ', address: '1 Main St', lat: 10, lng: 20 });
    expect(createRes.status).toBe(201);
    expect(createRes.body.name).toBe('HQ');

    const listRes = await request(app).get('/api/locations');
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
  });

  it('rejects creation with a missing name', async () => {
    const res = await request(app)
      .post('/api/locations')
      .send({ address: '1 Main St', lat: 10, lng: 20 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/);
  });

  it('rejects creation with out-of-range coordinates', async () => {
    const res = await request(app)
      .post('/api/locations')
      .send({ name: 'HQ', address: '1 Main St', lat: 500, lng: 20 });
    expect(res.status).toBe(400);
  });

  it('updates a location', async () => {
    const createRes = await request(app)
      .post('/api/locations')
      .send({ name: 'HQ', address: '1 Main St', lat: 10, lng: 20 });
    const { id } = createRes.body;

    const updateRes = await request(app)
      .put(`/api/locations/${id}`)
      .send({ notes: 'Updated notes' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.notes).toBe('Updated notes');
  });

  it('404s updating a nonexistent location', async () => {
    const res = await request(app)
      .put('/api/locations/999999')
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  it('deletes a location', async () => {
    const createRes = await request(app)
      .post('/api/locations')
      .send({ name: 'HQ', address: '1 Main St', lat: 10, lng: 20 });
    const { id } = createRes.body;

    const deleteRes = await request(app).delete(`/api/locations/${id}`);
    expect(deleteRes.status).toBe(204);

    const listRes = await request(app).get('/api/locations');
    expect(listRes.body).toHaveLength(0);
  });

  it('404s deleting a nonexistent location', async () => {
    const res = await request(app).delete('/api/locations/999999');
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd server && npm test -- locationsRoutes`
Expected: FAIL — all requests 404 (no `/api/locations` route mounted yet).

- [ ] **Step 3: Implement the routes**

`server/routes/locations.js`:
```js
const express = require('express');
const repo = require('../db/locationsRepo');
const { HttpError } = require('../errorHandler');

const router = express.Router();

function isValidCoordinate(lat, lng) {
  return (
    typeof lat === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === 'number' &&
    lng >= -180 &&
    lng <= 180
  );
}

function validateCreate(body) {
  if (!body || typeof body.name !== 'string' || body.name.trim() === '') {
    throw new HttpError(400, 'name is required');
  }
  if (typeof body.address !== 'string' || body.address.trim() === '') {
    throw new HttpError(400, 'address is required');
  }
  if (!isValidCoordinate(body.lat, body.lng)) {
    throw new HttpError(400, 'lat/lng must be numbers within valid ranges');
  }
}

router.get('/', async (req, res, next) => {
  try {
    res.json(await repo.listAll());
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    validateCreate(req.body);
    const { name, notes, address, lat, lng } = req.body;
    const location = await repo.create({ name, notes, address, lat, lng });
    res.status(201).json(location);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await repo.findById(id);
    if (!existing) {
      throw new HttpError(404, 'location not found');
    }

    const fields = {};
    ['name', 'notes', 'address', 'lat', 'lng'].forEach((key) => {
      if (key in req.body) fields[key] = req.body[key];
    });

    if ('lat' in fields || 'lng' in fields) {
      const lat = 'lat' in fields ? fields.lat : existing.lat;
      const lng = 'lng' in fields ? fields.lng : existing.lng;
      if (!isValidCoordinate(lat, lng)) {
        throw new HttpError(400, 'lat/lng must be numbers within valid ranges');
      }
    }

    res.json(await repo.update(id, fields));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const deleted = await repo.remove(id);
    if (!deleted) {
      throw new HttpError(404, 'location not found');
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

- [ ] **Step 4: Mount the router**

Modify `server/index.js` — add the import near the top:
```js
const locationsRouter = require('./routes/locations');
```

and mount it right after the `/api/health` route (before the `if (process.env.NODE_ENV === 'production')` block):
```js
app.use('/api/locations', locationsRouter);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd server && npm test`
Expected: PASS — all suites (health, schema, locationsRepo, locationsRoutes) green.

- [ ] **Step 6: Commit**

```bash
git add server/routes/locations.js server/__tests__/locationsRoutes.test.js server/index.js
git commit -m "server: add /api/locations CRUD routes with validation"
```

---

### Task 5: Wire the root project to the backend (dev proxy + prod static serving)

**Files:**
- Modify: `package.json` (root)

**Interfaces:**
- Produces: root `npm run dev` (starts both frontend and backend for local development), root `"proxy"` field so `fetch('/api/...')` from the React app resolves to the backend in dev. Tasks 7-10 (frontend) rely on `/api/locations` being reachable via this proxy during development.

- [ ] **Step 1: Install `concurrently` at the root**

Run: `bun add -d concurrently`
Expected: `concurrently` added to root `devDependencies`.

- [ ] **Step 2: Add the dev proxy and scripts**

Modify root `package.json` — add a top-level `"proxy"` key (sibling of `"scripts"`/`"dependencies"`):
```json
  "proxy": "http://localhost:4000",
```

Modify the root `"scripts"` block to add:
```json
    "server": "cd server && npm start",
    "server:dev": "cd server && npm run dev",
    "dev": "concurrently -n web,api \"npm run start\" \"npm run server:dev\"",
```

- [ ] **Step 3: Verify dev proxy works**

Run: `bun run dev`
Expected: both processes start; open `http://localhost:3000` and confirm the page loads. Then run `curl http://localhost:3000/api/health` (in another terminal) and expect `{"status":"ok"}` — proving CRA proxied the request to the Express server on port 4000.

Stop both processes (Ctrl+C) before continuing.

- [ ] **Step 4: Verify production serving works**

Run:
```bash
bun run build
NODE_ENV=production PORT=4000 node server/index.js
```
Then in another terminal: `curl http://localhost:4000/api/health` (expect `{"status":"ok"}`) and `curl -s http://localhost:4000/ | head -c 200` (expect the start of the built `index.html`, not a 404).

Stop the server (Ctrl+C) before continuing.

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock
git commit -m "build: wire dev proxy and production static serving to the backend"
```

---

### Task 6: Remove the unused sign-in/sign-up UI

**Files:**
- Delete: `src/views/auth/` (entire directory)
- Delete: `src/layouts/auth/` (entire directory)
- Modify: `src/App.js`
- Modify: `src/routes.js`

**Interfaces:** None — this task only removes dead UI; no other task depends on it.

- [ ] **Step 1: Delete the auth views and layout**

```bash
git rm -r src/views/auth src/layouts/auth
```

- [ ] **Step 2: Remove the auth route from `App.js`**

Modify `src/App.js` — remove the import:
```js
import AuthLayout from './layouts/auth';
```
and remove the route:
```jsx
        <Route path="auth/*" element={<AuthLayout />} />
```
The remaining `<Routes>` block should be just the `admin/*` route and the `/` redirect.

- [ ] **Step 3: Remove the Sign In entry from `routes.js`**

Modify `src/routes.js` — remove the import:
```js
import SignInCentered from 'views/auth/signIn';
```
remove `MdLock` from the `react-icons/md` import list (it's only used by the Sign In entry), and remove the whole route object:
```js
  {
    name: 'Sign In',
    layout: '/auth',
    path: '/sign-in',
    icon: <Icon as={MdLock} width="20px" height="20px" color="inherit" />,
    component: <SignInCentered />,
  },
```

- [ ] **Step 4: Verify the app still runs**

Run the app via the `run` skill (or `bun start`) and confirm:
- The dev server compiles with no new errors.
- `http://localhost:3000/` redirects to `/admin/default` as before.
- The sidebar no longer shows a "Sign In" entry.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Remove unused sign-in/sign-up UI (auth will be handled at the server level)"
```

---

### Task 7: Frontend API client for locations

**Files:**
- Create: `src/services/locationsApi.js`

**Interfaces:**
- Produces: `getLocations(): Promise<Location[]>`, `createLocation(fields): Promise<Location>`, `updateLocation(id, fields): Promise<Location>`, `deleteLocation(id): Promise<null>`, all calling `/api/locations` (Task 4). Tasks 9-10 use these.

- [ ] **Step 1: Implement the client**

`src/services/locationsApi.js`:
```js
const BASE_URL = "/api/locations";

async function handleResponse(res) {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export async function getLocations() {
  const res = await fetch(BASE_URL);
  return handleResponse(res);
}

export async function createLocation(location) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(location),
  });
  return handleResponse(res);
}

export async function updateLocation(id, fields) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  return handleResponse(res);
}

export async function deleteLocation(id) {
  const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE" });
  return handleResponse(res);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `bun start` (or confirm the already-running dev server has no new errors after saving this file). It isn't imported anywhere yet, so there's nothing to exercise in the UI — Task 9 wires it up.

- [ ] **Step 3: Commit**

```bash
git add src/services/locationsApi.js
git commit -m "frontend: add locations API client"
```

---

### Task 8: Frontend geocoding client (MapTiler address search)

**Files:**
- Create: `src/services/geocode.js`

**Interfaces:**
- Produces: `searchAddress(query: string): Promise<{ address: string, lat: number, lng: number }[]>`. Task 10 uses this.

- [ ] **Step 1: Implement the client**

`src/services/geocode.js`:
```js
const MAPTILER_KEY = "5QIzD0yJGQmiB2p50Aah";

export async function searchAddress(query) {
  if (!query || query.trim().length < 3) {
    return [];
  }

  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
    query
  )}.json?key=${MAPTILER_KEY}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Address search failed");
  }

  const data = await res.json();
  return (data.features || []).map((feature) => ({
    address: feature.place_name,
    lat: feature.center[1],
    lng: feature.center[0],
  }));
}
```

(MapTiler's geocoding response uses GeoJSON `[lng, lat]` order in `feature.center` — the mapping above deliberately swaps it back to `{lat, lng}` for the rest of the app.)

- [ ] **Step 2: Verify it compiles**

Run: `bun start` and confirm no new errors. Not imported yet — Task 10 wires it up.

- [ ] **Step 3: Commit**

```bash
git add src/services/geocode.js
git commit -m "frontend: add MapTiler geocoding client"
```

---

### Task 9: Lift locations state into the dashboard, rewrite `LocationList.js`

**Files:**
- Modify: `src/views/admin/default/index.jsx`
- Modify: `src/views/admin/default/components/LocationList.js`

**Interfaces:**
- Consumes: `src/services/locationsApi.js` (Task 7).
- Produces: `index.jsx` now owns `locations` state and passes props `locations` (array) to both children; `onCreate(fields)`, `onUpdate(id, fields)`, `onDelete(id)` (all async) to `LocationList`, and `locations` + `onCreate` to `Locations` (Task 10 implements `Locations.js` against this same prop contract).

- [ ] **Step 1: Lift state into `index.jsx`**

Modify `src/views/admin/default/index.jsx`:

Change the React import to pull in hooks:
```js
import React, { useCallback, useEffect, useState } from "react";
```

Add the API client import alongside the other imports:
```js
import {
  createLocation,
  deleteLocation,
  getLocations,
  updateLocation,
} from "services/locationsApi";
```

Inside `UserReports`, replace:
```js
  const devices = 42;
```
with:
```js
  const devices = 42;
  const [locations, setLocations] = useState([]);

  const refreshLocations = useCallback(async () => {
    const data = await getLocations();
    setLocations(data || []);
  }, []);

  useEffect(() => {
    refreshLocations();
  }, [refreshLocations]);

  const handleCreateLocation = async (fields) => {
    await createLocation(fields);
    await refreshLocations();
  };

  const handleUpdateLocation = async (id, fields) => {
    await updateLocation(id, fields);
    await refreshLocations();
  };

  const handleDeleteLocation = async (id) => {
    await deleteLocation(id);
    await refreshLocations();
  };
```

Change the "Locations" `MiniStatistics` value from the shared `devices` variable to the real count — find:
```jsx
          name='Locations'
          value={devices}
        />
```
and change `value={devices}` to `value={locations.length}` (this was previously a copy-paste duplicate of the Devices stat above it).

Change the render of the two location components from:
```jsx
        <Locations />
        <LocationList />
```
to:
```jsx
        <Locations locations={locations} onCreate={handleCreateLocation} />
        <LocationList
          locations={locations}
          onUpdate={handleUpdateLocation}
          onDelete={handleDeleteLocation}
        />
```

- [ ] **Step 2: Rewrite `LocationList.js`**

`src/views/admin/default/components/LocationList.js`:
```jsx
import {
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  useDisclosure,
  useToast,
  VStack,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import React, { useState } from "react";
import { MdDelete, MdEdit } from "react-icons/md";

export default function LocationList({ locations, onUpdate, onDelete }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editing, setEditing] = useState(null);
  const toast = useToast();

  const startEdit = (location) => {
    setEditing({
      id: location.id,
      name: location.name,
      notes: location.notes || "",
      address: location.address,
      lat: String(location.lat),
      lng: String(location.lng),
    });
    onOpen();
  };

  const saveEdit = async () => {
    try {
      await onUpdate(editing.id, {
        name: editing.name,
        notes: editing.notes,
        address: editing.address,
        lat: Number(editing.lat),
        lng: Number(editing.lng),
      });
      onClose();
    } catch (err) {
      toast({
        title: "Couldn't save changes",
        description: err.message,
        status: "error",
        isClosable: true,
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await onDelete(id);
    } catch (err) {
      toast({
        title: "Couldn't delete location",
        description: err.message,
        status: "error",
        isClosable: true,
      });
    }
  };

  return (
    <Card
      justifyContent='center'
      align='center'
      direction='column'
      w='100%'
      mb='0px'>
      <Text fontSize='xl' fontWeight='700' mb='16px' alignSelf='flex-start'>
        Locations
      </Text>
      <VStack w='100%' align='stretch' spacing='12px'>
        {locations.length === 0 && (
          <Text color='secondaryGray.600'>No locations saved yet.</Text>
        )}
        {locations.map((location) => (
          <Flex
            key={location.id}
            justify='space-between'
            align='center'
            w='100%'
            p='12px'
            borderRadius='12px'
            bg='secondaryGray.100'>
            <Box>
              <Text fontWeight='600'>{location.name}</Text>
              <Text fontSize='sm' color='secondaryGray.600'>
                {location.address}
              </Text>
              {location.notes && (
                <Text fontSize='sm' color='secondaryGray.600'>
                  {location.notes}
                </Text>
              )}
            </Box>
            <Flex gap='8px'>
              <IconButton
                aria-label='Edit location'
                icon={<MdEdit />}
                size='sm'
                onClick={() => startEdit(location)}
              />
              <IconButton
                aria-label='Delete location'
                icon={<MdDelete />}
                size='sm'
                onClick={() => handleDelete(location.id)}
              />
            </Flex>
          </Flex>
        ))}
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit location</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing='12px'>
              <Input
                placeholder='Name'
                value={editing?.name || ""}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
              <Input
                placeholder='Address'
                value={editing?.address || ""}
                onChange={(e) =>
                  setEditing({ ...editing, address: e.target.value })
                }
              />
              <Flex gap='8px' w='100%'>
                <Input
                  placeholder='Latitude'
                  value={editing?.lat || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, lat: e.target.value })
                  }
                />
                <Input
                  placeholder='Longitude'
                  value={editing?.lng || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, lng: e.target.value })
                  }
                />
              </Flex>
              <Textarea
                placeholder='Notes'
                value={editing?.notes || ""}
                onChange={(e) =>
                  setEditing({ ...editing, notes: e.target.value })
                }
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant='outline' mr='12px' onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme='brand' onClick={saveEdit}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  );
}
```

- [ ] **Step 3: Verify it runs**

With the backend running (`bun run server:dev` in one terminal, or the full `bun run dev`), open the dashboard. Expected: the "Locations" list card shows "No locations saved yet." (table is empty), and the "Locations" stat tile shows `0`. No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/views/admin/default/index.jsx src/views/admin/default/components/LocationList.js
git commit -m "frontend: lift locations state into dashboard, wire up LocationList edit/delete"
```

---

### Task 10: Rewrite `Locations.js` — map, address search, save flow

**Files:**
- Modify: `src/views/admin/default/components/Locations.js`

**Interfaces:**
- Consumes: `src/services/geocode.js`'s `searchAddress` (Task 8); receives `locations` and `onCreate` props from `index.jsx` (Task 9).

- [ ] **Step 1: Rewrite the component**

`src/views/admin/default/components/Locations.js`:
```jsx
import {
  Box,
  Button,
  Flex,
  Input,
  List,
  ListItem,
  Text,
  Textarea,
  useToast,
  VStack,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import React, { useEffect, useRef, useState } from "react";
import { Map, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { searchAddress } from "services/geocode";

const MAPTILER_KEY = "5QIzD0yJGQmiB2p50Aah";

export default function Locations({ locations, onCreate }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const draftMarkerRef = useRef(null);
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchError, setSearchError] = useState(null);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    mapRef.current = new Map({
      container: mapContainerRef.current,
      style: `https://api.maptiler.com/maps/openstreetmap/style.json?key=${MAPTILER_KEY}`,
      center: [-122.4, 37.8],
      zoom: 1,
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = locations.map((location) =>
      new Marker().setLngLat([location.lng, location.lat]).addTo(map)
    );
  }, [locations]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (query.trim().length < 3) {
        setSuggestions([]);
        setSearchError(null);
        return;
      }
      try {
        const results = await searchAddress(query);
        setSuggestions(results);
        setSearchError(results.length === 0 ? "No results found" : null);
      } catch {
        setSuggestions([]);
        setSearchError("Address search failed — check your connection and try again");
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const selectSuggestion = (suggestion) => {
    setSuggestions([]);
    setSearchError(null);
    setQuery(suggestion.address);
    setDraft({
      address: suggestion.address,
      lat: suggestion.lat,
      lng: suggestion.lng,
      name: "",
      notes: "",
    });

    const map = mapRef.current;
    if (map) {
      map.flyTo({ center: [suggestion.lng, suggestion.lat], zoom: 14 });
      draftMarkerRef.current?.remove();
      draftMarkerRef.current = new Marker({ color: "#f00" })
        .setLngLat([suggestion.lng, suggestion.lat])
        .addTo(map);
    }
  };

  const cancelDraft = () => {
    setDraft(null);
    setQuery("");
    draftMarkerRef.current?.remove();
    draftMarkerRef.current = null;
  };

  const saveDraft = async () => {
    try {
      await onCreate({
        name: draft.name,
        notes: draft.notes,
        address: draft.address,
        lat: draft.lat,
        lng: draft.lng,
      });
      cancelDraft();
    } catch (err) {
      toast({
        title: "Couldn't save location",
        description: err.message,
        status: "error",
        isClosable: true,
      });
    }
  };

  return (
    <Card
      justifyContent='center'
      align='center'
      direction='column'
      w='100%'
      mb='0px'>
      <Box w='100%' mb='12px'>
        <Input
          placeholder='Search for an address...'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {suggestions.length > 0 && (
          <List
            border='1px solid'
            borderColor='secondaryGray.300'
            borderRadius='8px'
            mt='4px'
            maxH='200px'
            overflowY='auto'>
            {suggestions.map((suggestion, index) => (
              <ListItem
                key={index}
                p='8px'
                cursor='pointer'
                _hover={{ bg: "secondaryGray.100" }}
                onClick={() => selectSuggestion(suggestion)}>
                {suggestion.address}
              </ListItem>
            ))}
          </List>
        )}
        {searchError && suggestions.length === 0 && (
          <Text fontSize='sm' color='red.500' mt='4px'>
            {searchError}
          </Text>
        )}
      </Box>

      {draft && (
        <VStack w='100%' align='stretch' spacing='8px' mb='12px'>
          <Text fontSize='sm' color='secondaryGray.600'>
            {draft.address}
          </Text>
          <Input
            placeholder='Name'
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <Textarea
            placeholder='Notes (optional)'
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
          <Flex gap='8px'>
            <Button
              colorScheme='brand'
              onClick={saveDraft}
              isDisabled={!draft.name.trim()}>
              Save location
            </Button>
            <Button variant='outline' onClick={cancelDraft}>
              Cancel
            </Button>
          </Flex>
        </VStack>
      )}

      <Flex justify='space-between' ps='0px' pe='20px' pt='5px' w='100%'>
        <Box w='100%' h='400px'>
          <div
            ref={mapContainerRef}
            style={{ width: "100%", height: "100%" }}
          />
        </Box>
      </Flex>
    </Card>
  );
}
```

- [ ] **Step 2: Verify the full flow manually**

With the backend running (`bun run dev`), open the dashboard and:
1. Type at least 3 characters of a real address into the search box → suggestions appear.
2. Click a suggestion → the map flies to it, a red draft marker appears, and the name/notes form shows below the search box.
3. Type a name, click "Save location" → the draft form closes, the red marker is gone, a normal marker appears in its place, the location shows up in the `LocationList` card on the right, and the "Locations" stat tile count increases by one.
4. In the list, click the edit icon, change the name, click Save → the list updates.
5. In the list, click the delete icon → the entry disappears from both the list and the map.

- [ ] **Step 3: Commit**

```bash
git add src/views/admin/default/components/Locations.js
git commit -m "frontend: add address search and save flow to the Locations map"
```

---

## Post-implementation check

Run the full backend suite once more from a clean state to confirm nothing regressed across tasks:

```bash
cd server && npm test
```
Expected: all suites pass (health, schema, locationsRepo, locationsRoutes).
