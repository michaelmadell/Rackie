const { pool } = require('../db');

function rowToCable(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    fromPortId: row.from_port_id,
    toPortId: row.to_port_id,
    cableType: row.cable_type,
    color: row.color,
    routingMode: row.routing_mode,
    waypoints: row.waypoints || [],
    visible: row.visible,
    length: row.length,
    label: row.label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fromPort: {
      id: row.from_port_id,
      name: row.from_port_name,
      face: row.from_port_face,
      portType: row.from_port_type,
      posX: row.from_port_pos_x,
      posY: row.from_port_pos_y,
      deviceId: row.from_device_id,
      deviceName: row.from_device_name,
      uPosition: row.from_device_u_pos,
      uHeight: row.from_device_u_height,
      rackId: row.from_rack_id,
      rackName: row.from_rack_name,
      roomId: row.from_room_id,
    },
    toPort: {
      id: row.to_port_id,
      name: row.to_port_name,
      face: row.to_port_face,
      portType: row.to_port_type,
      posX: row.to_port_pos_x,
      posY: row.to_port_pos_y,
      deviceId: row.to_device_id,
      deviceName: row.to_device_name,
      uPosition: row.to_device_u_pos,
      uHeight: row.to_device_u_height,
      rackId: row.to_rack_id,
      rackName: row.to_rack_name,
      roomId: row.to_room_id,
    },
  };
}

const CABLE_QUERY_SELECT = `
  SELECT
    c.*,
    fp.name AS from_port_name,
    fp.face AS from_port_face,
    fp.port_type AS from_port_type,
    fp.pos_x AS from_port_pos_x,
    fp.pos_y AS from_port_pos_y,
    fd.id AS from_device_id,
    fd.name AS from_device_name,
    fd.u_position AS from_device_u_pos,
    fd.u_height AS from_device_u_height,
    fr.id AS from_rack_id,
    fr.name AS from_rack_name,
    fr.room_id AS from_room_id,
    tp.name AS to_port_name,
    tp.face AS to_port_face,
    tp.port_type AS to_port_type,
    tp.pos_x AS to_port_pos_x,
    tp.pos_y AS to_port_pos_y,
    td.id AS to_device_id,
    td.name AS to_device_name,
    td.u_position AS to_device_u_pos,
    td.u_height AS to_device_u_height,
    tr.id AS to_rack_id,
    tr.name AS to_rack_name,
    tr.room_id AS to_room_id
  FROM cables c
  JOIN ports fp ON fp.id = c.from_port_id
  JOIN devices fd ON fd.id = fp.device_id
  JOIN racks fr ON fr.id = fd.rack_id
  JOIN ports tp ON tp.id = c.to_port_id
  JOIN devices td ON td.id = tp.device_id
  JOIN racks tr ON tr.id = td.rack_id
`;

async function listByRoom(roomId) {
  const { rows } = await pool.query(
    `${CABLE_QUERY_SELECT}
     WHERE fr.room_id = $1 OR tr.room_id = $1
     ORDER BY c.id ASC`,
    [roomId]
  );
  return rows.map(rowToCable);
}

async function findById(id) {
  const { rows } = await pool.query(
    `${CABLE_QUERY_SELECT}
     WHERE c.id = $1`,
    [id]
  );
  return rowToCable(rows[0]);
}

async function create({
  fromPortId,
  toPortId,
  cableType = 'cat6',
  color = '#3182CE',
  routingMode = 'auto',
  waypoints = [],
  visible = true,
  length = null,
  label = null,
}) {
  if (fromPortId === toPortId) {
    throw new Error('Cannot connect a port to itself');
  }

  const validModes = ['auto', 'spline', 'bevelled', 'straight'];
  if (!validModes.includes(routingMode)) {
    throw new Error(`Invalid routing mode. Must be one of: ${validModes.join(', ')}`);
  }

  const { rows } = await pool.query(
    `INSERT INTO cables (from_port_id, to_port_id, cable_type, color, routing_mode, waypoints, visible, length, label)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      fromPortId,
      toPortId,
      cableType,
      color,
      routingMode,
      JSON.stringify(waypoints),
      visible,
      length,
      label,
    ]
  );

  return findById(rows[0].id);
}

async function update(id, fields) {
  const fieldMap = {
    cableType: 'cable_type',
    cable_type: 'cable_type',
    color: 'color',
    routingMode: 'routing_mode',
    routing_mode: 'routing_mode',
    waypoints: 'waypoints',
    visible: 'visible',
    length: 'length',
    label: 'label',
  };

  const allowed = Object.keys(fieldMap);
  const matched = Object.keys(fields).filter((k) => allowed.includes(k));
  if (matched.length > 0) {
    const setClauses = [];
    const values = [];
    let pIdx = 2;

    matched.forEach((k) => {
      const col = fieldMap[k];
      setClauses.push(`${col} = $${pIdx++}`);
      if (k === 'waypoints') {
        values.push(JSON.stringify(fields[k]));
      } else {
        values.push(fields[k]);
      }
    });

    await pool.query(
      `UPDATE cables SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $1`,
      [id, ...values]
    );
  }

  return findById(id);
}

async function remove(id) {
  const existing = await findById(id);
  if (!existing) return undefined;
  await pool.query('DELETE FROM cables WHERE id = $1', [id]);
  return existing;
}

module.exports = { listByRoom, findById, create, update, remove };
