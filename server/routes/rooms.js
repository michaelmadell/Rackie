const express = require('express');
const roomsRepo = require('../db/roomsRepo');
const racksRepo = require('../db/racksRepo');
const devicesRepo = require('../db/devicesRepo');
const cablesRepo = require('../db/cablesRepo');
const { HttpError } = require('../errorHandler');

const router = express.Router();

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

// GET /api/rooms?locationId=123
router.get('/', async (req, res, next) => {
  try {
    const locationId = req.query.locationId ? Number(req.query.locationId) : null;
    if (!locationId) {
      throw new HttpError(400, 'locationId query parameter is required');
    }
    const rooms = await roomsRepo.listByLocation(locationId);
    res.json(rooms);
  } catch (err) {
    next(err);
  }
});

// POST /api/rooms
router.post('/', async (req, res, next) => {
  try {
    const { locationId, name, floor, notes } = req.body;
    if (!locationId || isNaN(Number(locationId))) {
      throw new HttpError(400, 'locationId is required');
    }
    if (!isNonEmptyString(name)) {
      throw new HttpError(400, 'name is required');
    }
    const room = await roomsRepo.create({
      locationId: Number(locationId),
      name: name.trim(),
      floor: floor ? String(floor).trim() : null,
      notes: notes ? String(notes).trim() : null,
    });
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const room = await roomsRepo.findById(id);
    if (!room) {
      throw new HttpError(404, 'Room not found');
    }
    res.json(room);
  } catch (err) {
    next(err);
  }
});

// GET /api/rooms/:id/full (Complete Digital Twin data for the room canvas!)
router.get('/:id/full', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const room = await roomsRepo.findById(id);
    if (!room) {
      throw new HttpError(404, 'Room not found');
    }

    const racks = await racksRepo.listByRoom(id);
    const racksWithDevices = await Promise.all(
      racks.map(async (rack) => {
        const devices = await devicesRepo.listByRack(rack.id);
        return {
          ...rack,
          devices,
        };
      })
    );

    const cables = await cablesRepo.listByRoom(id);

    res.json({
      room,
      racks: racksWithDevices,
      cables,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/rooms/:id
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await roomsRepo.findById(id);
    if (!existing) {
      throw new HttpError(404, 'Room not found');
    }

    const fields = {};
    if ('name' in req.body) {
      if (!isNonEmptyString(req.body.name)) {
        throw new HttpError(400, 'name must be a non-empty string');
      }
      fields.name = req.body.name.trim();
    }
    if ('floor' in req.body) fields.floor = req.body.floor ? String(req.body.floor).trim() : null;
    if ('notes' in req.body) fields.notes = req.body.notes ? String(req.body.notes).trim() : null;

    const updated = await roomsRepo.update(id, fields);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/rooms/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const deleted = await roomsRepo.remove(id);
    if (!deleted) {
      throw new HttpError(404, 'Room not found');
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
