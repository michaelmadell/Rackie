const { pool } = require('../db');
const repo = require('../db/locationsRepo');

beforeEach(async () => {
  await pool.query('TRUNCATE locations RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
});

describe('locationsRepo', () => {
  it('creates and lists a location', async () => {
    const created = await repo.create({
      name: 'Main Warehouse',
      notes: 'Loading dock on the east side',
      address: '123 Main St, Springfield',
      lat: 39.78,
      lng: -89.65,
    });
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Main Warehouse');

    const all = await repo.listAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(created.id);
  });

  it('creates a location without notes', async () => {
    const created = await repo.create({
      name: 'No Notes',
      address: '1 A St',
      lat: 1,
      lng: 1,
    });
    expect(created.notes).toBeNull();
  });

  it('updates a location and bumps updated_at', async () => {
    const created = await repo.create({
      name: 'Old Name',
      address: '1 A St',
      lat: 1,
      lng: 1,
    });
    const updated = await repo.update(created.id, { name: 'New Name' });
    expect(updated.name).toBe('New Name');
    expect(updated.address).toBe('1 A St');
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(created.updatedAt).getTime()
    );
  });

  it('removes a location', async () => {
    const created = await repo.create({
      name: 'Temp',
      address: '2 B St',
      lat: 2,
      lng: 2,
    });
    const deleted = await repo.remove(created.id);
    expect(deleted.id).toBe(created.id);

    const all = await repo.listAll();
    expect(all).toHaveLength(0);
  });

  it('returns undefined when removing a nonexistent location', async () => {
    const result = await repo.remove(999999);
    expect(result).toBeUndefined();
  });

  it('returns undefined when finding a nonexistent location', async () => {
    const result = await repo.findById(999999);
    expect(result).toBeUndefined();
  });
});
