const express = require('express');
const racksRepo = require('../db/racksRepo');
const devicesRepo = require('../db/devicesRepo');
const { HttpError } = require('../errorHandler');

const router = express.Router();

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

// GET /api/racks?roomId=123
router.get('/', async (req, res, next) => {
  try {
    const roomId = req.query.roomId ? Number(req.query.roomId) : null;
    if (!roomId) {
      throw new HttpError(400, 'roomId query parameter is required');
    }
    const racks = await racksRepo.listByRoom(roomId);
    res.json(racks);
  } catch (err) {
    next(err);
  }
});

// POST /api/racks
router.post('/', async (req, res, next) => {
  try {
    const { roomId, name, uHeight = 42, positionIndex, notes } = req.body;
    if (!roomId || isNaN(Number(roomId))) {
      throw new HttpError(400, 'roomId is required');
    }
    if (!isNonEmptyString(name)) {
      throw new HttpError(400, 'name is required');
    }
    const parsedUHeight = Number(uHeight);
    if (isNaN(parsedUHeight) || parsedUHeight < 1 || parsedUHeight > 60) {
      throw new HttpError(400, 'uHeight must be a number between 1 and 60');
    }

    const rack = await racksRepo.create({
      roomId: Number(roomId),
      name: name.trim(),
      uHeight: parsedUHeight,
      positionIndex: positionIndex !== undefined ? Number(positionIndex) : undefined,
      notes: notes ? String(notes).trim() : null,
    });
    res.status(201).json(rack);
  } catch (err) {
    next(err);
  }
});

// GET /api/racks/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const rack = await racksRepo.findById(id);
    if (!rack) {
      throw new HttpError(404, 'Rack not found');
    }
    res.json(rack);
  } catch (err) {
    next(err);
  }
});

// GET /api/racks/:id/devices
router.get('/:id/devices', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const rack = await racksRepo.findById(id);
    if (!rack) {
      throw new HttpError(404, 'Rack not found');
    }
    const devices = await devicesRepo.listByRack(id);
    res.json(devices);
  } catch (err) {
    next(err);
  }
});

// PUT /api/racks/:id
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await racksRepo.findById(id);
    if (!existing) {
      throw new HttpError(404, 'Rack not found');
    }

    const fields = {};
    if ('name' in req.body) {
      if (!isNonEmptyString(req.body.name)) {
        throw new HttpError(400, 'name must be a non-empty string');
      }
      fields.name = req.body.name.trim();
    }
    if ('uHeight' in req.body || 'u_height' in req.body) {
      const uH = Number(req.body.uHeight ?? req.body.u_height);
      if (isNaN(uH) || uH < 1 || uH > 60) {
        throw new HttpError(400, 'uHeight must be between 1 and 60');
      }
      fields.uHeight = uH;
    }
    if ('positionIndex' in req.body || 'position_index' in req.body) {
      fields.positionIndex = Number(req.body.positionIndex ?? req.body.position_index);
    }
    if ('notes' in req.body) fields.notes = req.body.notes ? String(req.body.notes).trim() : null;

    const updated = await racksRepo.update(id, fields);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/racks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const deleted = await racksRepo.remove(id);
    if (!deleted) {
      throw new HttpError(404, 'Rack not found');
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
