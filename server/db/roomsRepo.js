const { pool } = require('../db');

function rowToRoom(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    locationId: row.location_id,
    name: row.name,
    floor: row.floor,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    rackCount: row.rack_count !== undefined ? Number(row.rack_count) : undefined,
  };
}

async function listByLocation(locationId) {
  const { rows } = await pool.query(
    `SELECT r.*, COUNT(rk.id) AS rack_count
     FROM rooms r
     LEFT JOIN racks rk ON rk.room_id = r.id
     WHERE r.location_id = $1
     GROUP BY r.id
     ORDER BY r.id ASC`,
    [locationId]
  );
  return rows.map(rowToRoom);
}

async function create({ locationId, name, floor, notes }) {
  const { rows } = await pool.query(
    `INSERT INTO rooms (location_id, name, floor, notes)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [locationId, name, floor ?? null, notes ?? null]
  );
  return rowToRoom(rows[0]);
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT r.*, COUNT(rk.id) AS rack_count
     FROM rooms r
     LEFT JOIN racks rk ON rk.room_id = r.id
     WHERE r.id = $1
     GROUP BY r.id`,
    [id]
  );
  return rowToRoom(rows[0]);
}

async function update(id, fields) {
  const allowed = ['name', 'floor', 'notes'];
  const keys = Object.keys(fields).filter((key) => allowed.includes(key));
  if (keys.length === 0) {
    return findById(id);
  }
  const setClause = keys.map((key, i) => `${key} = $${i + 2}`).join(', ');
  const values = keys.map((key) => fields[key]);
  const { rows } = await pool.query(
    `UPDATE rooms
     SET ${setClause}, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, ...values]
  );
  return rowToRoom(rows[0]);
}

async function remove(id) {
  const { rows } = await pool.query(
    'DELETE FROM rooms WHERE id = $1 RETURNING *',
    [id]
  );
  return rowToRoom(rows[0]);
}

module.exports = { listByLocation, create, findById, update, remove };
