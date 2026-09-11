const { pool } = require('../db');

function rowToRack(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    uHeight: row.u_height,
    positionIndex: row.position_index,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deviceCount: row.device_count !== undefined ? Number(row.device_count) : undefined,
  };
}

async function listByRoom(roomId) {
  const { rows } = await pool.query(
    `SELECT r.*, COUNT(d.id) AS device_count
     FROM racks r
     LEFT JOIN devices d ON d.rack_id = r.id
     WHERE r.room_id = $1
     GROUP BY r.id
     ORDER BY r.position_index ASC, r.id ASC`,
    [roomId]
  );
  return rows.map(rowToRack);
}

async function create({ roomId, name, uHeight = 42, positionIndex, notes }) {
  // If positionIndex is not specified, place it at the end
  let pos = positionIndex;
  if (pos === undefined || pos === null) {
    const { rows: maxRows } = await pool.query(
      `SELECT COALESCE(MAX(position_index), -1) + 1 AS next_pos FROM racks WHERE room_id = $1`,
      [roomId]
    );
    pos = maxRows[0].next_pos;
  }

  const { rows } = await pool.query(
    `INSERT INTO racks (room_id, name, u_height, position_index, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [roomId, name, uHeight, pos, notes ?? null]
  );
  return rowToRack(rows[0]);
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT r.*, COUNT(d.id) AS device_count
     FROM racks r
     LEFT JOIN devices d ON d.rack_id = r.id
     WHERE r.id = $1
     GROUP BY r.id`,
    [id]
  );
  return rowToRack(rows[0]);
}

async function update(id, fields) {
  const fieldMap = {
    name: 'name',
    uHeight: 'u_height',
    u_height: 'u_height',
    positionIndex: 'position_index',
    position_index: 'position_index',
    notes: 'notes',
  };

  const allowed = Object.keys(fieldMap);
  const matched = Object.keys(fields).filter((key) => allowed.includes(key));
  if (matched.length === 0) {
    return findById(id);
  }

  const setClauses = [];
  const values = [];
  let paramIndex = 2;

  matched.forEach((key) => {
    const col = fieldMap[key];
    setClauses.push(`${col} = $${paramIndex++}`);
    values.push(fields[key]);
  });

  const { rows } = await pool.query(
    `UPDATE racks
     SET ${setClauses.join(', ')}, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, ...values]
  );
  return rowToRack(rows[0]);
}

async function remove(id) {
  const { rows } = await pool.query(
    'DELETE FROM racks WHERE id = $1 RETURNING *',
    [id]
  );
  return rowToRack(rows[0]);
}

module.exports = { listByRoom, create, findById, update, remove };
