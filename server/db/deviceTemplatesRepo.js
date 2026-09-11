const { pool } = require('../db');

function rowToTemplate(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    manufacturer: row.manufacturer,
    model: row.model,
    category: row.category,
    uHeight: row.u_height,
    color: row.color,
    frontLayout: row.front_layout,
    rearLayout: row.rear_layout,
    enclosureData: row.enclosure_data,
    isPreset: row.is_preset,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listAll({ category, search, manufacturer } = {}) {
  let query = 'SELECT * FROM device_templates WHERE 1=1';
  const params = [];

  if (category) {
    params.push(category);
    query += ` AND category = $${params.length}`;
  }

  if (manufacturer) {
    params.push(manufacturer);
    query += ` AND manufacturer ILIKE $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    query += ` AND (manufacturer ILIKE $${params.length} OR model ILIKE $${params.length})`;
  }

  query += ' ORDER BY is_preset DESC, manufacturer ASC, model ASC';

  const { rows } = await pool.query(query, params);
  return rows.map(rowToTemplate);
}

async function create({
  manufacturer,
  model,
  category,
  uHeight = 1,
  color = '#2D3748',
  frontLayout = [],
  rearLayout = [],
  enclosureData = null,
}) {
  const { rows } = await pool.query(
    `INSERT INTO device_templates (
       manufacturer, model, category, u_height, color, front_layout, rear_layout, is_preset, enclosure_data
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8)
     RETURNING *`,
    [
      manufacturer,
      model,
      category,
      uHeight,
      color,
      JSON.stringify(frontLayout),
      JSON.stringify(rearLayout),
      enclosureData ? JSON.stringify(enclosureData) : null,
    ]
  );
  return rowToTemplate(rows[0]);
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT * FROM device_templates WHERE id = $1',
    [id]
  );
  return rowToTemplate(rows[0]);
}

async function remove(id) {
  // Prevent deleting system presets
  const { rows } = await pool.query(
    'DELETE FROM device_templates WHERE id = $1 AND is_preset = false RETURNING *',
    [id]
  );
  return rowToTemplate(rows[0]);
}

module.exports = { listAll, create, findById, remove };
