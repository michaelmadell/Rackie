const request = require('supertest');
const { app } = require('../index');
const { pool } = require('../db');

beforeEach(async () => {
  await pool.query('TRUNCATE locations RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
});

describe('/api/locations', () => {
  it('creates then lists a location', async () => {
    const createRes = await request(app)
      .post('/api/locations')
      .send({ name: 'HQ', address: '1 Main St', lat: 10, lng: 20 });
    expect(createRes.status).toBe(201);
    expect(createRes.body.name).toBe('HQ');

    const listRes = await request(app).get('/api/locations');
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
  });

  it('rejects creation with a missing name', async () => {
    const res = await request(app)
      .post('/api/locations')
      .send({ address: '1 Main St', lat: 10, lng: 20 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/);
  });

  it('rejects creation with out-of-range coordinates', async () => {
    const res = await request(app)
      .post('/api/locations')
      .send({ name: 'HQ', address: '1 Main St', lat: 500, lng: 20 });
    expect(res.status).toBe(400);
  });

  it('updates a location', async () => {
    const createRes = await request(app)
      .post('/api/locations')
      .send({ name: 'HQ', address: '1 Main St', lat: 10, lng: 20 });
    const { id } = createRes.body;

    const updateRes = await request(app)
      .put(`/api/locations/${id}`)
      .send({ notes: 'Updated notes' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.notes).toBe('Updated notes');
  });

  it('404s updating a nonexistent location', async () => {
    const res = await request(app)
      .put('/api/locations/999999')
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });

  it('deletes a location', async () => {
    const createRes = await request(app)
      .post('/api/locations')
      .send({ name: 'HQ', address: '1 Main St', lat: 10, lng: 20 });
    const { id } = createRes.body;

    const deleteRes = await request(app).delete(`/api/locations/${id}`);
    expect(deleteRes.status).toBe(204);

    const listRes = await request(app).get('/api/locations');
    expect(listRes.body).toHaveLength(0);
  });

  it('404s deleting a nonexistent location', async () => {
    const res = await request(app).delete('/api/locations/999999');
    expect(res.status).toBe(404);
  });
});
