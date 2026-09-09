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
