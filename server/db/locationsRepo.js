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
