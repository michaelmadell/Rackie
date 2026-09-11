const { pool } = require('../db');

function rowToDevice(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    rackId: row.rack_id,
    templateId: row.template_id,
    name: row.name,
    uPosition: row.u_position,
    uHeight: row.u_height,
    serialNumber: row.serial_number,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    manufacturer: row.manufacturer,
    model: row.model,
    category: row.category,
    color: row.color,
    enclosureData: row.enclosure_data,
    ports: row.ports || [],
  };
}

function expandPortGroup(group, face) {
  const ports = [];
  const count = group.count || 1;
  let prefix = group.namePrefix !== undefined ? group.namePrefix : (face === 'front' ? 'Port ' : 'Rear ');
  if (/^[A-Za-z]+$/.test(prefix)) {
    prefix = `${prefix} `;
  }
  const portType = group.type || 'rj45';
  const startX = typeof group.startX === 'number' ? group.startX : 0.1;
  const width = typeof group.width === 'number' ? group.width : 0.8;
  const rows = group.rows || 1;
  const layout = group.layout || 'odd-over-even';
  const portW = typeof group.portWidth === 'number' ? group.portWidth : 14;
  const portH = typeof group.portHeight === 'number' ? group.portHeight : 11;

  if (rows === 2) {
    const cols = Math.ceil(count / 2);
    const colStep = cols > 1 ? width / cols : width;

    if (layout === 'sequential' || layout === 'rows') {
      // Row 0 first (1..cols), then Row 1 (cols+1..2*cols)
      for (let c = 0; c < cols; c++) {
        const topNum = c + 1;
        const posX = Number((startX + (c + 0.5) * colStep).toFixed(4));
        if (topNum <= count) {
          ports.push({
            name: `${prefix}${topNum}`,
            face,
            portType,
            posX,
            posY: 0.32,
            orientation: 'top',
            width: portW,
            height: portH,
          });
        }
      }
      for (let c = 0; c < cols; c++) {
        const btmNum = c + 1 + cols;
        const posX = Number((startX + (c + 0.5) * colStep).toFixed(4));
        if (btmNum <= count) {
          ports.push({
            name: `${prefix}${btmNum}`,
            face,
            portType,
            posX,
            posY: 0.68,
            orientation: 'bottom',
            width: portW,
            height: portH,
          });
        }
      }
    } else if (layout === 'even-over-odd') {
      for (let c = 0; c < cols; c++) {
        const topNum = c * 2 + 2;
        const btmNum = c * 2 + 1;
        const posX = Number((startX + (c + 0.5) * colStep).toFixed(4));
        if (topNum <= count) {
          ports.push({
            name: `${prefix}${topNum}`,
            face,
            portType,
            posX,
            posY: 0.32,
            orientation: 'top',
            width: portW,
            height: portH,
          });
        }
        if (btmNum <= count) {
          ports.push({
            name: `${prefix}${btmNum}`,
            face,
            portType,
            posX,
            posY: 0.68,
            orientation: 'bottom',
            width: portW,
            height: portH,
          });
        }
      }
    } else if (layout === 'bottom-to-top') {
      for (let c = 0; c < cols; c++) {
        const topNum = c + 1 + cols;
        const btmNum = c + 1;
        const posX = Number((startX + (c + 0.5) * colStep).toFixed(4));
        if (topNum <= count) {
          ports.push({
            name: `${prefix}${topNum}`,
            face,
            portType,
            posX,
            posY: 0.32,
            orientation: 'top',
            width: portW,
            height: portH,
          });
        }
        if (btmNum <= count) {
          ports.push({
            name: `${prefix}${btmNum}`,
            face,
            portType,
            posX,
            posY: 0.68,
            orientation: 'bottom',
            width: portW,
            height: portH,
          });
        }
      }
    } else {
      // Default: odd-over-even / columns (Standard switch: 1,3,5... top; 2,4,6... bottom)
      for (let c = 0; c < cols; c++) {
        const topNum = c * 2 + 1;
        const btmNum = c * 2 + 2;
        const posX = Number((startX + (c + 0.5) * colStep).toFixed(4));
        if (topNum <= count) {
          ports.push({
            name: `${prefix}${topNum}`,
            face,
            portType,
            posX,
            posY: 0.32,
            orientation: 'top',
            width: portW,
            height: portH,
          });
        }
        if (btmNum <= count) {
          ports.push({
            name: `${prefix}${btmNum}`,
            face,
            portType,
            posX,
            posY: 0.68,
            orientation: 'bottom',
            width: portW,
            height: portH,
          });
        }
      }
    }
  } else {
    // 1 row
    const colStep = count > 1 ? width / count : width;
    for (let i = 0; i < count; i++) {
      const posX = Number((startX + (i + 0.5) * colStep).toFixed(4));
      ports.push({
        name: `${prefix}${i + 1}`,
        face,
        portType,
        posX,
        posY: 0.5,
        orientation: 'top',
        width: portW,
        height: portH,
      });
    }
  }

  return ports;
}

function generatePortsFromLayout(layout, face) {
  if (!Array.isArray(layout)) return [];
  const ports = [];

  for (const item of layout) {
    if (item.count && item.count > 0) {
      ports.push(...expandPortGroup(item, face));
    } else if (item.name) {
      ports.push({
        name: item.name,
        face: face || item.face || 'front',
        portType: item.portType || item.port_type || item.type || 'rj45',
        posX: typeof item.posX === 'number' ? item.posX : (typeof item.pos_x === 'number' ? item.pos_x : 0.5),
        posY: typeof item.posY === 'number' ? item.posY : (typeof item.pos_y === 'number' ? item.pos_y : 0.5),
        width: typeof item.width === 'number' ? item.width : 14,
        height: typeof item.height === 'number' ? item.height : 11,
      });
    }
  }

  return ports;
}

async function checkSlotCollision(rackId, uPosition, uHeight, excludeDeviceId = null) {
  const minU = uPosition;
  const maxU = uPosition + uHeight - 1;

  let query = `
    SELECT id, name, u_position, u_height
    FROM devices
    WHERE rack_id = $1
      AND (u_position <= $3 AND (u_position + u_height - 1) >= $2)
  `;
  const params = [rackId, minU, maxU];

  if (excludeDeviceId) {
    params.push(excludeDeviceId);
    query += ` AND id <> $4`;
  }

  const { rows } = await pool.query(query, params);
  return rows;
}

async function listByRack(rackId) {
  const { rows } = await pool.query(
    `SELECT
       d.*,
       dt.manufacturer,
       dt.model,
       dt.category,
       COALESCE(dt.color, '#2D3748') AS color,
       COALESCE(
         (
           SELECT json_agg(
             json_build_object(
               'id', p.id,
               'name', p.name,
               'face', p.face,
               'portType', p.port_type,
               'posX', p.pos_x,
               'posY', p.pos_y,
                'width', COALESCE(p.width, 14),
                'height', COALESCE(p.height, 11),
                'orientation', COALESCE(p.orientation, 'top'),
                'rotation', COALESCE(p.rotation, 0),
                'status', p.status
             ) ORDER BY p.id ASC
           )
           FROM ports p
           WHERE p.device_id = d.id
         ),
         '[]'::json
       ) AS ports
     FROM devices d
     LEFT JOIN device_templates dt ON dt.id = d.template_id
     WHERE d.rack_id = $1
     ORDER BY d.u_position DESC`,
    [rackId]
  );
  return rows.map(rowToDevice);
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT
       d.*,
       dt.manufacturer,
       dt.model,
       dt.category,
       COALESCE(dt.color, '#2D3748') AS color,
       COALESCE(
         (
           SELECT json_agg(
             json_build_object(
               'id', p.id,
               'name', p.name,
               'face', p.face,
               'portType', p.port_type,
               'posX', p.pos_x,
               'posY', p.pos_y,
                'width', COALESCE(p.width, 14),
                'height', COALESCE(p.height, 11),
                'orientation', COALESCE(p.orientation, 'top'),
                'rotation', COALESCE(p.rotation, 0),
                'status', p.status
             ) ORDER BY p.id ASC
           )
           FROM ports p
           WHERE p.device_id = d.id
         ),
         '[]'::json
       ) AS ports
     FROM devices d
     LEFT JOIN device_templates dt ON dt.id = d.template_id
     WHERE d.id = $1`,
    [id]
  );
  return rowToDevice(rows[0]);
}

async function create({
  rackId,
  templateId = null,
  name,
  uPosition,
  uHeight = 1,
  serialNumber = null,
  status = 'online',
  notes = null,
  customPorts = null,
  enclosureData = null,
}) {
  // 1. Check rack limits
  const { rows: rackRows } = await pool.query('SELECT u_height FROM racks WHERE id = $1', [rackId]);
  if (rackRows.length === 0) {
    throw new Error('Rack not found');
  }
  const rackUHeight = rackRows[0].u_height;

  if (uPosition < 1 || uPosition + uHeight - 1 > rackUHeight) {
    throw new Error(`Device position (U${uPosition} to U${uPosition + uHeight - 1}) exceeds rack height of ${rackUHeight}U`);
  }

  // 2. Check collisions
  const collisions = await checkSlotCollision(rackId, uPosition, uHeight);
  if (collisions.length > 0) {
    const c = collisions[0];
    throw new Error(`Slot collision with "${c.name}" at U${c.u_position} (Height ${c.u_height}U)`);
  }

  let effectiveEnclosureData = enclosureData;
  let tmplData = null;
  if (templateId) {
    const { rows: tmplRows } = await pool.query(
      'SELECT front_layout, rear_layout, enclosure_data FROM device_templates WHERE id = $1',
      [templateId]
    );
    if (tmplRows.length > 0) {
      tmplData = tmplRows[0];
      if (!effectiveEnclosureData && tmplData.enclosure_data) {
        effectiveEnclosureData = tmplData.enclosure_data;
      }
    }
  }

  // 3. Insert device
  const { rows: devRows } = await pool.query(
    `INSERT INTO devices (rack_id, template_id, name, u_position, u_height, serial_number, status, notes, enclosure_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      rackId,
      templateId,
      name,
      uPosition,
      uHeight,
      serialNumber,
      status,
      notes,
      effectiveEnclosureData ? JSON.stringify(effectiveEnclosureData) : null,
    ]
  );
  const device = devRows[0];

  // 4. Generate and insert ports
  let portsToInsert = [];
  if (Array.isArray(customPorts) && customPorts.length > 0) {
    portsToInsert = customPorts;
  } else if (tmplData) {
    const front = generatePortsFromLayout(tmplData.front_layout, 'front');
    const rear = generatePortsFromLayout(tmplData.rear_layout, 'rear');
    portsToInsert = [...front, ...rear];
  }

  for (const p of portsToInsert) {
    await pool.query(
      `INSERT INTO ports (device_id, name, face, port_type, pos_x, pos_y, width, height, status, orientation, rotation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        device.id,
        p.name,
        p.face || 'front',
        p.portType || p.port_type || 'rj45',
        typeof p.posX === 'number' ? p.posX : 0.5,
        typeof p.posY === 'number' ? p.posY : 0.5,
        typeof p.width === 'number' ? p.width : 14,
        typeof p.height === 'number' ? p.height : 11,
        p.status || 'active',
        p.orientation || 'top',
        typeof p.rotation === 'number' ? p.rotation : 0,
      ]);
  }

  return findById(device.id);
}

async function update(id, fields) {
  const existing = await findById(id);
  if (!existing) return undefined;

  const targetRackId = fields.rackId !== undefined ? Number(fields.rackId) : (fields.rack_id !== undefined ? Number(fields.rack_id) : existing.rackId);
  const targetUPos = fields.uPosition !== undefined ? fields.uPosition : (fields.u_position !== undefined ? fields.u_position : existing.uPosition);
  const targetUHeight = fields.uHeight !== undefined ? fields.uHeight : (fields.u_height !== undefined ? fields.u_height : existing.uHeight);

  if (targetRackId !== existing.rackId || targetUPos !== existing.uPosition || targetUHeight !== existing.uHeight) {
    const { rows: rackRows } = await pool.query('SELECT u_height FROM racks WHERE id = $1', [targetRackId]);
    if (!rackRows || rackRows.length === 0) {
      throw new Error(`Target rack ${targetRackId} not found`);
    }
    const rackUHeight = rackRows[0].u_height;
    if (targetUPos < 1 || targetUPos + targetUHeight - 1 > rackUHeight) {
      throw new Error(`Device position exceeds rack bounds (1-${rackUHeight}U)`);
    }

    const collisions = await checkSlotCollision(targetRackId, targetUPos, targetUHeight, id);
    if (collisions.length > 0) {
      const c = collisions[0];
      throw new Error(`Slot collision with "${c.name}" at U${c.u_position}`);
    }
  }

  const fieldMap = {
    rackId: 'rack_id',
    rack_id: 'rack_id',
    name: 'name',
    uPosition: 'u_position',
    u_position: 'u_position',
    uHeight: 'u_height',
    u_height: 'u_height',
    serialNumber: 'serial_number',
    serial_number: 'serial_number',
    status: 'status',
    notes: 'notes',
    enclosureData: 'enclosure_data',
    enclosure_data: 'enclosure_data',
  };

  const allowed = Object.keys(fieldMap);
  const matched = Object.keys(fields).filter((k) => allowed.includes(k));
  if (matched.length > 0) {
    const setClauses = [];
    const values = [];
    let pIdx = 2;

    matched.forEach((k) => {
      setClauses.push(`${fieldMap[k]} = $${pIdx++}`);
      const val = fields[k];
      values.push(val && typeof val === 'object' ? JSON.stringify(val) : val);
    });

    await pool.query(
      `UPDATE devices SET ${setClauses.join(', ')}, updated_at = now() WHERE id = $1`,
      [id, ...values]
    );
  }

  if (Array.isArray(fields.ports)) {
    const { rows: existingPorts } = await pool.query(
      'SELECT id, name, face FROM ports WHERE device_id = $1',
      [id]
    );
    const existingMap = new Map();
    for (const ep of existingPorts) {
      existingMap.set(`${ep.face}:${ep.name}`, ep);
    }

    const processedIds = new Set();
    for (const p of fields.ports) {
      const pFace = p.face || 'front';
      const key = `${pFace}:${p.name}`;
      const existingPort = existingMap.get(key);
      const pType = p.portType || p.port_type || p.type || 'rj45';
      const pX = typeof p.posX === 'number' ? p.posX : (typeof p.pos_x === 'number' ? p.pos_x : 0.5);
      const pY = typeof p.posY === 'number' ? p.posY : (typeof p.pos_y === 'number' ? p.pos_y : 0.5);
      const pW = typeof p.width === 'number' ? p.width : 14;
      const pH = typeof p.height === 'number' ? p.height : 11;
      const pStatus = p.status || 'active';

      if (existingPort) {
        await pool.query(
          `UPDATE ports SET port_type = $1, pos_x = $2, pos_y = $3, width = $4, height = $5, status = $6, orientation = $7, rotation = $8 WHERE id = $9`,
          [pType, pX, pY, pW, pH, pStatus, p.orientation || 'top', typeof p.rotation === 'number' ? p.rotation : 0, existingPort.id]
        );
        processedIds.add(existingPort.id);
      } else {
        const { rows: inserted } = await pool.query(
          `INSERT INTO ports (device_id, name, face, port_type, pos_x, pos_y, width, height, status, orientation, rotation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
          [id, p.name, pFace, pType, pX, pY, pW, pH, pStatus, p.orientation || 'top', typeof p.rotation === 'number' ? p.rotation : 0]
        );
        if (inserted.length > 0) {
          processedIds.add(inserted[0].id);
        }
      }
    }

    // Remove obsolete ports that are no longer present for this device
    const toDeleteIds = existingPorts.filter((ep) => !processedIds.has(ep.id)).map((ep) => ep.id);
    if (toDeleteIds.length > 0) {
      await pool.query('DELETE FROM ports WHERE id = ANY($1::int[])', [toDeleteIds]);
    }
  }

  return findById(id);
}

async function remove(id) {
  const existing = await findById(id);
  if (!existing) return undefined;
  await pool.query('DELETE FROM devices WHERE id = $1', [id]);
  return existing;
}

module.exports = {
  listByRack,
  findById,
  create,
  update,
  remove,
  generatePortsFromLayout,
  checkSlotCollision,
};
