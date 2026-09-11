const request = require('supertest');
const { app } = require('../index');
const { pool } = require('../db');

beforeEach(async () => {
  // Truncate tables cleanly
  await pool.query('TRUNCATE locations, rooms, racks, devices, ports, cables RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
});

describe('Digital Twin End-to-End API Integration', () => {
  let locationId;
  let roomId;
  let rack1Id;
  let rack2Id;
  let switchTemplate;
  let serverTemplate;

  beforeEach(async () => {
    // 1. Create a test location
    const locRes = await request(app)
      .post('/api/locations')
      .send({
        name: 'Headquarters Data Center',
        address: '100 Tech Blvd, Silicon Valley',
        lat: 37.3861,
        lng: -122.0839,
      })
      .expect(201);
    locationId = locRes.body.id;

    // 2. Create a test room
    const roomRes = await request(app)
      .post('/api/rooms')
      .send({
        locationId,
        name: 'Server Room 1 (MDF)',
        floor: 'Floor 1',
        notes: 'Primary distribution frame',
      })
      .expect(201);
    roomId = roomRes.body.id;

    // 3. Create two racks in the room (one 42U, one 24U)
    const r1 = await request(app)
      .post('/api/racks')
      .send({
        roomId,
        name: 'Rack 01',
        uHeight: 42,
      })
      .expect(201);
    rack1Id = r1.body.id;

    const r2 = await request(app)
      .post('/api/racks')
      .send({
        roomId,
        name: 'Rack 02',
        uHeight: 24,
      })
      .expect(201);
    rack2Id = r2.body.id;

    // 4. Fetch device templates (Cisco switch & Dell server presets)
    const tmplRes = await request(app).get('/api/device-templates').expect(200);
    switchTemplate = tmplRes.body.find((t) => t.model.includes('9300'));
    serverTemplate = tmplRes.body.find((t) => t.model.includes('R750'));
  });

  describe('Rooms & Racks API', () => {
    it('lists rooms for a location and fetches rack counts', async () => {
      const res = await request(app)
        .get(`/api/rooms?locationId=${locationId}`)
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('Server Room 1 (MDF)');
      expect(res.body[0].rackCount).toBe(2);
    });

    it('validates rack bounds when creating a rack', async () => {
      await request(app)
        .post('/api/racks')
        .send({
          roomId,
          name: 'Invalid Rack',
          uHeight: 70, // Over 60U limit
        })
        .expect(400);
    });

    it('updates rack height and name', async () => {
      const res = await request(app)
        .put(`/api/racks/${rack2Id}`)
        .send({
          name: 'Rack 02 (Expanded)',
          uHeight: 48,
        })
        .expect(200);
      expect(res.body.name).toBe('Rack 02 (Expanded)');
      expect(res.body.uHeight).toBe(48);
    });
  });

  describe('Device Library & Templates API', () => {
    it('allows creating a custom device template with dual faceplates', async () => {
      const res = await request(app)
        .post('/api/device-templates')
        .send({
          manufacturer: 'CustomLab',
          model: 'LabRouter 4X',
          category: 'Router',
          uHeight: 1,
          color: '#319795',
          frontLayout: [
            { name: 'WAN1', type: 'rj45', face: 'front', posX: 0.2, posY: 0.5 },
            { name: 'WAN2', type: 'sfp_plus', face: 'front', posX: 0.3, posY: 0.5 },
          ],
          rearLayout: [
            { name: 'Power Inlet', type: 'c14', face: 'rear', posX: 0.85, posY: 0.5 },
          ],
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.isPreset).toBe(false);
      expect(res.body.manufacturer).toBe('CustomLab');
    });

    it('prevents deleting a system preset template', async () => {
      await request(app)
        .delete(`/api/device-templates/${switchTemplate.id}`)
        .expect(403);
    });
  });

  describe('Device Mounting & Automatic Port Instantiation', () => {
    it('mounts a switch into Rack 01 at U40 and auto-generates ports', async () => {
      const res = await request(app)
        .post('/api/devices')
        .send({
          rackId: rack1Id,
          templateId: switchTemplate.id,
          name: 'Core-Switch-01',
          uPosition: 40,
          uHeight: 1,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.uPosition).toBe(40);
      expect(res.body.ports).toBeDefined();
      // Cisco 9300 has 48 RJ45 + 4 SFP+ on front + 4 ports on rear = 56 ports
      expect(res.body.ports.length).toBe(56);

      const port1 = res.body.ports.find((p) => p.name === 'Port 1');
      expect(port1).toBeDefined();
      expect(port1.face).toBe('front');
      expect(port1.portType).toBe('rj45');

      const psu1 = res.body.ports.find((p) => p.name === 'PSU-1');
      expect(psu1).toBeDefined();
      expect(psu1.face).toBe('rear');
      expect(psu1.portType).toBe('c14');
    });

    it('prevents slot collision when mounting overlapping devices', async () => {
      // Mount server at U20 (2U: occupies U20 and U21)
      await request(app)
        .post('/api/devices')
        .send({
          rackId: rack1Id,
          templateId: serverTemplate.id,
          name: 'Server-01',
          uPosition: 20,
          uHeight: 2,
        })
        .expect(201);

      // Attempt to mount switch at U21 (overlaps with U20-U21 server)
      const res = await request(app)
        .post('/api/devices')
        .send({
          rackId: rack1Id,
          templateId: switchTemplate.id,
          name: 'Conflicting-Switch',
          uPosition: 21,
          uHeight: 1,
        })
        .expect(400);

      expect(res.body.error).toContain('collision');
    });

    it('prevents mounting beyond rack height limit', async () => {
      // Rack 2 has height 24U; attempting U24 with 2U device extends to U25
      const res = await request(app)
        .post('/api/devices')
        .send({
          rackId: rack2Id,
          templateId: serverTemplate.id,
          name: 'Overflow-Server',
          uPosition: 24,
          uHeight: 2,
        })
        .expect(400);

      expect(res.body.error).toContain('exceeds rack height');
    });
  });

  describe('Cables & Patch Routing Engine API', () => {
    let dev1;
    let dev2;
    let frontPort;
    let rearPort;

    beforeEach(async () => {
      // Mount Switch in Rack 1 at U40
      const d1Res = await request(app)
        .post('/api/devices')
        .send({
          rackId: rack1Id,
          templateId: switchTemplate.id,
          name: 'Switch-01',
          uPosition: 40,
          uHeight: 1,
        })
        .expect(201);
      dev1 = d1Res.body;
      frontPort = dev1.ports.find((p) => p.face === 'front' && p.portType === 'rj45');

      // Mount Server in Rack 2 at U10
      const d2Res = await request(app)
        .post('/api/devices')
        .send({
          rackId: rack2Id,
          templateId: serverTemplate.id,
          name: 'Server-02',
          uPosition: 10,
          uHeight: 2,
        })
        .expect(201);
      dev2 = d2Res.body;
      rearPort = dev2.ports.find((p) => p.face === 'rear' && p.portType === 'rj45');
    });

    it('creates a patch cable from Front of Rack 1 to Rear of Rack 2 with Auto routing', async () => {
      const res = await request(app)
        .post('/api/cables')
        .send({
          fromPortId: frontPort.id,
          toPortId: rearPort.id,
          cableType: 'cat6a',
          color: '#48BB78',
          routingMode: 'auto',
          label: 'UPLINK-RACK1-TO-RACK2',
          length: '5m',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.routingMode).toBe('auto');
      expect(res.body.fromPort.name).toBe(frontPort.name);
      expect(res.body.fromPort.rackName).toBe('Rack 01');
      expect(res.body.toPort.name).toBe(rearPort.name);
      expect(res.body.toPort.rackName).toBe('Rack 02');
      expect(res.body.toPort.face).toBe('rear');
    });

    it('supports switching routing mode to spline and bevelled with waypoints', async () => {
      const createRes = await request(app)
        .post('/api/cables')
        .send({
          fromPortId: frontPort.id,
          toPortId: rearPort.id,
          routingMode: 'spline',
          waypoints: [
            { x: 150, y: 300 },
            { x: 350, y: 400 },
          ],
        })
        .expect(201);

      const cableId = createRes.body.id;
      expect(createRes.body.routingMode).toBe('spline');
      expect(createRes.body.waypoints).toHaveLength(2);

      // Update to bevelled mode with new elbow waypoints
      const updateRes = await request(app)
        .put(`/api/cables/${cableId}`)
        .send({
          routingMode: 'bevelled',
          waypoints: [
            { x: 100, y: 50 },
            { x: 250, y: 50 },
            { x: 250, y: 400 },
          ],
        })
        .expect(200);

      expect(updateRes.body.routingMode).toBe('bevelled');
      expect(updateRes.body.waypoints).toHaveLength(3);
    });

    it('rejects connecting a port to itself or invalid routing mode', async () => {
      await request(app)
        .post('/api/cables')
        .send({
          fromPortId: frontPort.id,
          toPortId: frontPort.id,
        })
        .expect(400);

      await request(app)
        .post('/api/cables')
        .send({
          fromPortId: frontPort.id,
          toPortId: rearPort.id,
          routingMode: 'invalid_mode',
        })
        .expect(400);
    });

    it('loads full digital twin room canvas data via GET /api/rooms/:id/full', async () => {
      // Add a cable
      await request(app)
        .post('/api/cables')
        .send({
          fromPortId: frontPort.id,
          toPortId: rearPort.id,
          routingMode: 'straight',
        })
        .expect(201);

      const res = await request(app).get(`/api/rooms/${roomId}/full`).expect(200);

      expect(res.body.room.id).toBe(roomId);
      expect(res.body.racks).toHaveLength(2);
      expect(res.body.racks[0].devices).toHaveLength(1);
      expect(res.body.racks[1].devices).toHaveLength(1);
      expect(res.body.cables).toHaveLength(1);
      expect(res.body.cables[0].fromPort.rackId).toBe(rack1Id);
      expect(res.body.cables[0].toPort.rackId).toBe(rack2Id);
    });
  });
});
