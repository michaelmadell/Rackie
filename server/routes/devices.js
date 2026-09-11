const express = require('express');
const devicesRepo = require('../db/devicesRepo');
const { HttpError } = require('../errorHandler');

const router = express.Router();

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

// GET /api/devices?rackId=123
router.get('/', async (req, res, next) => {
  try {
    const rackId = req.query.rackId ? Number(req.query.rackId) : null;
    if (!rackId) {
      throw new HttpError(400, 'rackId query parameter is required');
    }
    const devices = await devicesRepo.listByRack(rackId);
    res.json(devices);
  } catch (err) {
    next(err);
  }
});

// GET /api/devices/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const device = await devicesRepo.findById(id);
    if (!device) {
      throw new HttpError(404, 'Device not found');
    }
    res.json(device);
  } catch (err) {
    next(err);
  }
});

// POST /api/devices (Mount device in rack slot)
router.post('/', async (req, res, next) => {
  try {
    const {
      rackId,
      templateId,
      name,
      uPosition,
      uHeight = 1,
      serialNumber,
      status = 'online',
      notes,
      customPorts,
      enclosureData,
      enclosure_data,
    } = req.body;

    if (!rackId || isNaN(Number(rackId))) {
      throw new HttpError(400, 'rackId is required');
    }
    if (!isNonEmptyString(name)) {
      throw new HttpError(400, 'name is required');
    }
    const parsedUPos = Number(uPosition);
    if (isNaN(parsedUPos) || parsedUPos < 1) {
      throw new HttpError(400, 'uPosition must be a positive integer');
    }
    const parsedUHeight = Number(uHeight);
    if (isNaN(parsedUHeight) || parsedUHeight < 1) {
      throw new HttpError(400, 'uHeight must be a positive integer');
    }

    const device = await devicesRepo.create({
      rackId: Number(rackId),
      templateId: templateId ? Number(templateId) : null,
      name: name.trim(),
      uPosition: parsedUPos,
      uHeight: parsedUHeight,
      serialNumber: serialNumber ? String(serialNumber).trim() : null,
      status: isNonEmptyString(status) ? status.trim() : 'online',
      notes: notes ? String(notes).trim() : null,
      customPorts: Array.isArray(customPorts) ? customPorts : null,
      enclosureData: enclosureData || enclosure_data || null,
    });

    res.status(201).json(device);
  } catch (err) {
    if (err.message && (err.message.includes('collision') || err.message.includes('exceeds rack height'))) {
      return next(new HttpError(400, err.message));
    }
    next(err);
  }
});

// PUT /api/devices/:id
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await devicesRepo.findById(id);
    if (!existing) {
      throw new HttpError(404, 'Device not found');
    }

    const fields = {};
    if ('rackId' in req.body || 'rack_id' in req.body) {
      const rId = Number(req.body.rackId ?? req.body.rack_id);
      if (isNaN(rId) || rId < 1) {
        throw new HttpError(400, 'rackId must be a positive integer');
      }
      fields.rackId = rId;
    }
    if ('name' in req.body) {
      if (!isNonEmptyString(req.body.name)) {
        throw new HttpError(400, 'name must be a non-empty string');
      }
      fields.name = req.body.name.trim();
    }
    if ('uPosition' in req.body || 'u_position' in req.body) {
      const uPos = Number(req.body.uPosition ?? req.body.u_position);
      if (isNaN(uPos) || uPos < 1) {
        throw new HttpError(400, 'uPosition must be a positive integer');
      }
      fields.uPosition = uPos;
    }
    if ('uHeight' in req.body || 'u_height' in req.body) {
      const uH = Number(req.body.uHeight ?? req.body.u_height);
      if (isNaN(uH) || uH < 1) {
        throw new HttpError(400, 'uHeight must be a positive integer');
      }
      fields.uHeight = uH;
    }
    if ('serialNumber' in req.body || 'serial_number' in req.body) {
      fields.serialNumber = req.body.serialNumber ?? req.body.serial_number;
    }
    if ('status' in req.body) fields.status = req.body.status;
    if ('notes' in req.body) fields.notes = req.body.notes;
    if ('enclosureData' in req.body || 'enclosure_data' in req.body) {
      fields.enclosureData = req.body.enclosureData ?? req.body.enclosure_data;
    }
    if ('ports' in req.body && Array.isArray(req.body.ports)) {
      fields.ports = req.body.ports;
    }

    const updated = await devicesRepo.update(id, fields);
    res.json(updated);
  } catch (err) {
    if (err.message && (err.message.includes('collision') || err.message.includes('bounds'))) {
      return next(new HttpError(400, err.message));
    }
    next(err);
  }
});

// DELETE /api/devices/:id (Unmount device from rack)
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const deleted = await devicesRepo.remove(id);
    if (!deleted) {
      throw new HttpError(404, 'Device not found');
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
