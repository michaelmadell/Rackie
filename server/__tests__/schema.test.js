const { pool } = require('../db');

afterAll(async () => {
  await pool.end();
});

describe('database schema integrity', () => {
  it('locations table has the expected columns', async () => {
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

  it('rooms table has the expected columns', async () => {
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'rooms'
       ORDER BY column_name`
    );
    const columns = rows.map((r) => r.column_name);
    expect(columns).toEqual([
      'created_at',
      'floor',
      'id',
      'location_id',
      'name',
      'notes',
      'updated_at',
    ]);
  });

  it('racks table has the expected columns', async () => {
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'racks'
       ORDER BY column_name`
    );
    const columns = rows.map((r) => r.column_name);
    expect(columns).toEqual([
      'created_at',
      'id',
      'name',
      'notes',
      'position_index',
      'room_id',
      'u_height',
      'updated_at',
    ]);
  });

  it('device_templates table has the expected columns and seeded presets', async () => {
    const { rows: colRows } = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'device_templates'
       ORDER BY column_name`
    );
    const columns = colRows.map((r) => r.column_name);
    expect(columns).toEqual([
      'category',
      'color',
      'created_at',
      'enclosure_data',
      'front_layout',
      'id',
      'is_preset',
      'manufacturer',
      'model',
      'rear_layout',
      'u_height',
      'updated_at',
    ]);

    const { rows: presets } = await pool.query(
      `SELECT manufacturer, model FROM device_templates WHERE is_preset = true ORDER BY manufacturer, model`
    );
    expect(presets.length).toBeGreaterThanOrEqual(8);
  });

  it('devices table has the expected columns', async () => {
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'devices'
       ORDER BY column_name`
    );
    const columns = rows.map((r) => r.column_name);
    expect(columns).toEqual([
      'created_at',
      'enclosure_data',
      'id',
      'name',
      'notes',
      'rack_id',
      'serial_number',
      'status',
      'template_id',
      'u_height',
      'u_position',
      'updated_at',
    ]);
  });

  it('ports table has the expected columns', async () => {
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'ports'
       ORDER BY column_name`
    );
    const columns = rows.map((r) => r.column_name);
    expect(columns).toEqual([
      'created_at',
      'device_id',
      'face',
      'height',
      'id',
      'name',
      'orientation',
      'port_type',
      'pos_x',
      'pos_y',
      'rotation',
      'status',
      'width',
    ]);
  });

  it('cables table has the expected columns', async () => {
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'cables'
       ORDER BY column_name`
    );
    const columns = rows.map((r) => r.column_name);
    expect(columns).toEqual([
      'cable_type',
      'color',
      'created_at',
      'from_port_id',
      'id',
      'label',
      'length',
      'routing_mode',
      'to_port_id',
      'updated_at',
      'visible',
      'waypoints',
    ]);
  });
});
