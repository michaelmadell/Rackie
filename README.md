# Rackie

A web-based digital twin and physical infrastructure management platform for server rooms, data halls, and rack elevations. Rackie provides interactive dual-sided rack visualization, patch cabling modeling, modular blade enclosure configuration, and a custom device designer.

---

## Features

### Room & Rack Elevation Canvas
- **Multi-Rack Side-by-Side View**: Render entire data halls and server rooms within a responsive canvas featuring pan and zoom controls.
- **Independent Dual-Face Toggle**: Switch individual racks between Front and Rear elevation views to trace connections between front patch panels and rear server interfaces without switching pages.
- **Variable Rack Heights**: Supports standard EIA-310-D rack sizes (12U, 18U, 24U, 36U, 42U, 45U, 48U) with accurate unit rail markings and cage nut slot spacing.
- **Drag-and-Drop Mounting**: Drag devices to reorder or mount them across rack units with live ghost previews and slot collision detection.
- **Device Properties Drawer**: Slide-out inspector showing device metadata, slot occupancy, power status, serial numbers, and port lists with disconnect actions.

### Patch Cable Management
- **Four Routing Modes**:
  - `Auto`: Routes cables neatly through lateral finger ducts and vertical cable management channels.
  - `Spline`: Smooth Bézier curves with interactive control handles for custom sagging and wire bundling.
  - `Bevelled`: 45-degree chamfered routes replicating physical structured cabling raceways.
  - `Straight`: Direct point-to-point connections for schematic overviews.
- **Connection Workflows**: Click-to-connect port interactions across any rack in the room with configurable cable standards (Cat6, Cat6A, OM4, Single-mode, Power), wire colors, lengths, and active highlight states.

### Modular Blade Enclosures
- **Dell PowerEdge M1000e (10U)**:
  - 16-bay vertical blade matrix across two tiers.
  - Backlit status LCD bezel displaying power consumption, ambient temperature, and active bay telemetry.
  - Blade insertion workflows with hardware presets (M640, M630, M620, M830) and per-blade power toggling.
  - Rear modular fabric bays (A1/A2, B1/B2, C1/C2), 9 hot-plug cooling fans, dual redundant CMCs, and 6 C19/C20 power supplies.
- **Amulet Hotkey CoreStation HX5 (5U)**:
  - 5-slot vertical compute bay housing high-density workstation sleds (HX1000, HX2000, HX3000, N205, N230).
  - Photographic node faceplates with integrated front USB, DisplayPort, and power controls.
  - Dedicated slot configuration modal for swapping sled models and adjusting hardware assignments.

### Port Alignment Studio
- Calibration workspace for photographic device faceplates.
- Controls for canvas zoom, natural aspect ratio, contain, and fill modes.
- Coordinate placement and custom port dimensions.
- **90° Port Rotation**: Rotate port glyphs (0°, 90°, 180°, 270°) to match physical vertical sockets such as high-density USB ports on blade sleds.
- Instant preset alignment for standard blade profiles.

### Device Library & Custom Designer
- **Hardware Catalog**: Pre-modeled templates for equipment from Cisco, Dell, Ubiquiti UniFi, HPE, Fortinet, APC, PATCHBOX, and Amulet Hotkey.
- **28x2 Equipment Grid**: 28-column by 2-row per U layout matching standard 19-inch faceplate geometry. Single-height port groups automatically center vertically; double-height blocks fill both rows with alternating top/bottom latch orientations.
- **Freehand Placement Mode**: Freeform port positioning with magnetic alignment guides, column dividers, slot center snapping, and horizontal/vertical midline snaps.
- **Port Grouping**: Select multiple ports to bind them into a single group with unified boundary indicators, or ungroup existing arrays.
- **SVG Port Glyphs**: Accurate vector renderings for RJ45, SFP/SFP+, QSFP, LC Duplex, SC, C13/C14, C19/C20, USB Type-A, DisplayPort, HDMI, and RJ45/DB9 Serial Console interfaces.

### Geographic Site Management
- Interactive geographic map powered by MapLibre GL for tracking multiple data center locations.
- Physical address search, GPS coordinate lookup, and site-level rack and device summary cards.

---

## Tech Stack

- **Frontend**: React 19, Chakra UI 2, React Router 6, MapLibre GL, Framer Motion, React Icons.
- **Backend**: Node.js, Express 4.
- **Database**: PostgreSQL with `pg` connection pooling.
- **Database Migrations**: `node-pg-migrate`.
- **Testing**: Jest, React Testing Library, Supertest.

---

## Directory Structure

```
Rackie/
├── public/                 # Static assets, device faceplates, and enclosure textures
├── src/                    # Frontend React application
│   ├── assets/             # Global stylesheets and static assets
│   ├── components/
│   │   ├── cables/         # CableOverlay SVG renderer and routing engines
│   │   ├── deviceLibrary/  # Device Library modal and 28x2 / freehand designer
│   │   ├── rack/           # RackElevation, DeviceFaceplate, EnclosureFaceplates,
│   │   │                   # PortGlyph, and Port Alignment Studio
│   │   └── sidebar/        # Navigation sidebar components
│   ├── services/           # API client services (digitalTwinApi.js, geocode.js)
│   ├── utils/              # Calculation helpers (hx5EnclosureHelper.js)
│   └── views/admin/
│       ├── default/        # GIS Locations overview and dashboard
│       ├── deviceLibrary/  # Standalone Device Library view
│       └── room/           # Multi-rack interactive room canvas
├── server/                 # Express backend API
│   ├── __tests__/          # Backend integration and unit test suites
│   ├── db/                 # PostgreSQL repository modules (racks, devices, cables, etc.)
│   ├── migrations/         # Schema migrations for digital twin data structures
│   ├── routes/             # REST API route handlers
│   ├── index.js            # Express application entry point
│   └── package.json        # Backend dependencies and migration scripts
├── docs/                   # System specifications and technical documentation
│   └── superpowers/specs/  # Complete product specification (2026-09-10-rackie-product-spec.md)
├── MEMORY.md               # Architecture notes, schema rules, and configuration memory
└── package.json            # Frontend dependencies and root scripts
```

---

## Prerequisites

- **Node.js**: v18.0.0 or later
- **npm**: v9.0.0 or later
- **PostgreSQL**: v14.0 or later running locally or accessible via network

---

## Getting Started

### 1. Clone the Repository

```bash
git clone git@github.com:michaelmadell/Rackie.git
cd Rackie
```

### 2. Install Dependencies

Install root dependencies (frontend):

```bash
npm install
```

Install server dependencies:

```bash
cd server
npm install
cd ..
```

### 3. Configure Environment Variables

Create a `.env` file in the `server/` directory based on `server/.env.example`:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your database connection details:

```env
DATABASE_URL=postgres://username:password@localhost:5432/rackie
PORT=4000
```

Ensure the target PostgreSQL database exists:

```bash
createdb rackie
```

### 4. Run Database Migrations

Apply all schema migrations to create tables and seed default hardware templates:

```bash
cd server
npm run migrate:up
cd ..
```

To roll back the last migration:

```bash
cd server
npm run migrate:down
cd ..
```

### 5. Start the Application

You can start both frontend and backend concurrently from the project root:

```bash
npm run dev
```

Alternatively, run them in separate terminal sessions:

**Terminal 1 (Backend API):**
```bash
cd server
npm start
# Runs on http://localhost:4000
```

**Terminal 2 (Frontend Client):**
```bash
npm start
# Runs on http://localhost:3000
```

Open [http://localhost:3000/admin/rack-room](http://localhost:3000/admin/rack-room) in your browser to view the interactive room canvas.

---

## Testing

### Backend Test Suite

Runs schema validation, route integration, repository operations, and enclosure tests:

```bash
cd server
npm test
```

### Frontend Test Suite

Runs component tests, drag-and-drop verification, faceplate rendering, and enclosure state tests:

```bash
npm test -- --watchAll=false
```

---

## REST API Overview

All API endpoints are served under `/api` on port `4000`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health and database connectivity check |
| `GET`, `POST` | `/api/locations` | List all geographic sites or create a new site |
| `GET`, `PUT`, `DELETE` | `/api/locations/:id` | Retrieve, update, or remove a site |
| `GET`, `POST` | `/api/rooms` | List rooms by location (`?location_id=`) or create a room |
| `GET`, `PUT`, `DELETE` | `/api/rooms/:id` | Retrieve, update, or remove a room |
| `GET` | `/api/rooms/:id/full` | Retrieve a room with its racks, devices, ports, and cables |
| `GET`, `POST` | `/api/racks` | List racks by room (`?room_id=`) or create a rack |
| `GET`, `PUT`, `DELETE` | `/api/racks/:id` | Retrieve, update, or remove a rack |
| `GET`, `POST` | `/api/devices` | List devices by rack (`?rack_id=`) or mount a device |
| `GET`, `PUT`, `DELETE` | `/api/devices/:id` | Retrieve, update, or unmount a device |
| `GET`, `POST` | `/api/cables` | List cables by room (`?room_id=`) or create a patch cable |
| `GET`, `PUT`, `DELETE` | `/api/cables/:id` | Retrieve, update routing/color, or delete a cable |
| `GET`, `POST` | `/api/device-templates` | List pre-modeled hardware catalog or register a template |
| `GET`, `PUT`, `DELETE` | `/api/device-templates/:id` | Retrieve, update, or delete a template |

---

## Specifications & Documentation

For detailed architectural decisions, data schemas, and UI specifications, refer to:
- [Rackie Product & Architecture Specification](docs/superpowers/specs/2026-09-10-rackie-product-spec.md)
- [Project Architecture & Schema Rules](MEMORY.md)
