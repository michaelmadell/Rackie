const request = require('supertest');
const { app } = require('../index');
const { pool } = require('../db');

beforeEach(async () => {
  await pool.query('TRUNCATE locations, rooms, racks, devices, ports, cables RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
});

describe('Modular Device Enclosure & Blades API', () => {
  let locationId;
  let roomId;
  let rackId;
  let m1000eTemplate;

  beforeEach(async () => {
    // 1. Create location
    const locRes = await request(app)
      .post('/api/locations')
      .send({
        name: 'Datacenter A',
        address: '100 Core Way',
        lat: 37.0,
        lng: -122.0,
      })
      .expect(201);
    locationId = locRes.body.id;

    // 2. Create room
    const roomRes = await request(app)
      .post('/api/rooms')
      .send({
        locationId,
        name: 'MDF Hall',
        floor: 'Level 1',
      })
      .expect(201);
    roomId = roomRes.body.id;

    // 3. Create 42U rack
    const rackRes = await request(app)
      .post('/api/racks')
      .send({
        roomId,
        name: 'Rack 01',
        uHeight: 42,
      })
      .expect(201);
    rackId = rackRes.body.id;

    // 4. Retrieve M1000e template
    const tmplRes = await request(app)
      .get('/api/device-templates?category=Enclosure')
      .expect(200);
    m1000eTemplate = tmplRes.body.find((t) => t.model === 'PowerEdge M1000e');
  });

  it('provides seeded Dell PowerEdge M1000e template with 16 blade bays and rear fabrics', async () => {
    expect(m1000eTemplate).toBeDefined();
    expect(m1000eTemplate.manufacturer).toBe('Dell');
    expect(m1000eTemplate.category).toBe('Enclosure');
    expect(m1000eTemplate.uHeight).toBe(10);
    expect(m1000eTemplate.enclosureData).toBeDefined();
    expect(m1000eTemplate.enclosureData.isEnclosure).toBe(true);
    expect(m1000eTemplate.enclosureData.totalBays).toBe(16);
    expect(m1000eTemplate.enclosureData.frontBays.length).toBe(16);
    expect(m1000eTemplate.enclosureData.rearComponents.fabrics.length).toBe(6);
    expect(m1000eTemplate.enclosureData.rearComponents.powerSupplies.length).toBe(6);
  });

  it('mounts M1000e enclosure into rack and auto-instantiates rear fabric and PSU ports', async () => {
    const devRes = await request(app)
      .post('/api/devices')
      .send({
        rackId,
        templateId: m1000eTemplate.id,
        name: 'M1000E-01',
        uPosition: 1,
        uHeight: m1000eTemplate.uHeight,
      })
      .expect(201);

    const dev = devRes.body;
    expect(dev.id).toBeDefined();
    expect(dev.uPosition).toBe(1);
    expect(dev.uHeight).toBe(10);
    expect(dev.enclosureData).toBeDefined();
    expect(dev.enclosureData.frontBays.length).toBe(16);

    // Verify rear fabric ports and PSU ports were generated
    expect(dev.ports.length).toBeGreaterThan(30);
    const fabA1 = dev.ports.find((p) => p.name === 'Fab-A1-P1' || p.name === 'Fab-A1-P 1');
    expect(fabA1).toBeDefined();
    expect(fabA1.face).toBe('rear');

    const psu1 = dev.ports.find((p) => p.name === 'PSU-1');
    expect(psu1).toBeDefined();
    expect(psu1.face).toBe('rear');
  });

  it('supports inserting, powering, and ejecting blades in enclosure bays', async () => {
    // 1. Mount enclosure
    const devRes = await request(app)
      .post('/api/devices')
      .send({
        rackId,
        templateId: m1000eTemplate.id,
        name: 'M1000E-01',
        uPosition: 1,
        uHeight: 10,
      })
      .expect(201);
    const deviceId = devRes.body.id;

    // 2. Insert new blade into empty Bay 5
    const enclosureData = devRes.body.enclosureData;
    const updatedBays = enclosureData.frontBays.map((bay) => {
      if (bay.bayNumber === 5) {
        return {
          ...bay,
          occupied: true,
          blade: {
            id: 'blade-test-5',
            name: 'New-Worker-05',
            model: 'PowerEdge M640',
            manufacturer: 'Dell',
            status: 'online',
            powerState: 'on',
            specs: '2x Xeon Gold 6140 / 384GB RAM',
          },
        };
      }
      return bay;
    });

    const updateRes = await request(app)
      .put(`/api/devices/${deviceId}`)
      .send({
        enclosureData: {
          ...enclosureData,
          frontBays: updatedBays,
        },
      })
      .expect(200);

    const updatedBay5 = updateRes.body.enclosureData.frontBays.find((b) => b.bayNumber === 5);
    expect(updatedBay5.occupied).toBe(true);
    expect(updatedBay5.blade.name).toBe('New-Worker-05');
    expect(updatedBay5.blade.powerState).toBe('on');

    // 3. Eject blade from Bay 1
    const baysAfterEject = updateRes.body.enclosureData.frontBays.map((bay) => {
      if (bay.bayNumber === 1) {
        return { ...bay, occupied: false, blade: null };
      }
      return bay;
    });

    const ejectRes = await request(app)
      .put(`/api/devices/${deviceId}`)
      .send({
        enclosureData: {
          ...updateRes.body.enclosureData,
          frontBays: baysAfterEject,
        },
      })
      .expect(200);

    const bay1AfterEject = ejectRes.body.enclosureData.frontBays.find((b) => b.bayNumber === 1);
    expect(bay1AfterEject.occupied).toBe(false);
    expect(bay1AfterEject.blade).toBeNull();
  });
});
