# Rackie — Project Memory & Architecture Knowledge Bank

## 1. System Overview
**Rackie** is a next-generation visual IT infrastructure and patch management digital twin application inspired by [app.patchdocs.io](https://app.patchdocs.io).

- **Frontend**: React 18, Chakra UI, React Router v6, Canvas & SVG elevation overlays (`http://localhost:3000`).
- **Backend**: Node.js, Express, PostgreSQL with `node-pg-migrate` (`http://localhost:4000`).
- **Data Model**:
  Locations (MapLibre GL) -> Rooms (Elevation Viewport) -> Racks (Dual-Face 12U-48U) -> Devices -> Ports -> Cables

---

## 2. Key Architectural Decisions & Conventions

### 2.1 Coordinate Systems & Dual-Face Racks
- Every rack supports independent **Front** and **Rear** elevation faces.
- Devices occupy integer slot positions `u_position` to `u_position + u_height - 1`.
- Ports use normalized relative coordinates:
  - `posX`: 0.0 to 1.0 normalized width across the equipment bay (between 18px mounting ears).
  - `posY`: 0.0 to 1.0 normalized height within the device's physical U span.
- Port rotation: `rotation` column on `ports` table (0, 90, 180, 270 degrees).
  - `0°`: Standard horizontal orientation.
  - `90°`: Vertical clockwise orientation (used for vertical compute node sled USB ports).
  - Port elements rotate around center `(50%, 50%)`, maintaining cable attachment coordinates.

### 2.2 Cable Routing Engines
Four selectable routing algorithms rendered via SVG `<CableOverlay />`:
1. **Auto (Patchdocs)**: Orthogonal Manhattan routing through side vertical wire ducts (48px channels) with radius bends.
2. **Spline**: Smooth cubic Bézier curves with interactive drag handles.
3. **Bevelled**: 45-degree chamfered bends with interactive control handles.
4. **Straight**: Direct point-to-point line for rapid schematic review.

---

## 3. Modular Enclosure Systems

### 3.1 Amulet Hotkey CoreStation HX5 (5U)
- **Model**: `HX5` (5U Modular Blade Enclosure).
- **Front Equipment Bay**:
  - 12 vertical sled bays.
  - Geometry: `bayAreaLeft: 0.0`, `bayAreaWidth: 1.0`, `topY: 0.0725`, `heightY: 0.8116` (spanning 10px to 122px of the 138px chassis).
  - Photographic sled faceplates render with `objectFit="fill"` to eliminate letterbox margins.
  - Default populated configuration (Device 17 at U35, Device 18 at U29, and template):
    - **Slots 1 & 2**: `HX2000` (Dual GPU, 1x DP-1 at `relX: 0.655`, `relY: 0.6623`; 2x vertical USB at `90°` rotation).
    - **Slots 3 & 4**: `HX1000` (Entry Compute, 1x DP at `relX: 0.6411`, `relY: 0.6688`; 2x vertical USB at `90°` rotation).
    - **Slots 5 & 6**: `HX3000` (Quad Display, 1x DP-1 at `relX: 0.6462`, `relY: 0.6639`; 2x vertical USB at `90°` rotation).
    - **Slots 7 & 8**: `NodeBlank` (Airflow blanks, 0 ports).
    - **Slots 9–12**: `Empty` (Empty chassis bays, 0 ports).
    - **Chassis Front**: Power button (`power`) and Maintenance USB-C (`usb_c`).
- **Rear Modules**:
  - **Top Tier (Slot 1)**: `N120` 10GbE Switch (12x node pass-throughs, 4x SFP+ uplinks, 2x MGMT, 1x CNSL).
  - **Bottom Tier (Slot 2)**: `N205` Secondary pass-through (12x RJ45) or `N230` 25GbE Fabric (12x RJ45 + 2x 25G SFP28).
  - **Top Tier**: 6x Hot-Plug Cooling Fans (`fan.jpg`).
  - **Bottom Tier**: 4x 1600W Titanium PSUs (`psu.jpg`) with C14 power sockets.
- **Port Alignment Studio (Tab 3 in Configurator)**:
  - Renders authentic Patchdocs SVG glyphs (`PortSvg`) directly inside port markers.
  - Dedicated rotation controls: `⟳ Rotate 90°` button, `0°`, `90°`, `180°`, `270°` buttons.
  - Interactive drag-and-drop calibration and pixel nudge arrow pad.
  - `⚡ Snap to Sled` button for automated alignment to photographic sockets.

### 3.2 Dell PowerEdge M1000e (10U)
- 16 vertical blade bays (2 tiers of 8).
- Supported blades: PowerEdge M640, M630, M620, M830.
- LCD Bezel displaying power wattage, temperature, and diagnostics.
- Rear: 6x Fabric switches (Fabrics A1/A2, B1/B2, C1/C2), 9x cooling fans, 6x PSUs.

---

## 4. Database & Migrations
- Migration files reside in `server/migrations/`.
- Key migrations:
  - `1757500000000_create-digital-twin-schema.js`: Core tables (`racks`, `devices`, `ports`, `cables`, `device_templates`).
  - `1757600000000_add-ports-size.js`: Adds `width` and `height` to `ports`.
  - `1757700000000_add-enclosure-data.js`: Adds `enclosure_data` jsonb to `devices` and `device_templates`.
  - `1757800000000_seed-hx5-enclosure.js`: Seeds default HX5 template with calibrated front & rear layouts.
  - `1757900000000_add-ports-orientation-rotation.js`: Adds `orientation` (text) and `rotation` (integer) to `ports`.

---

## 5. Test Suites
- **Backend Tests**: `npm test` inside `server/` (runs Jest across `server/__tests__/`, 37/37 passing).
  - Uses `server/.env.test` pointing to `rackie_test` database.
- **Frontend Tests**: `npm test -- --watchAll=false` in project root (23/23 passing).
