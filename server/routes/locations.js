const express = require('express');
const repo = require('../db/locationsRepo');
const { HttpError } = require('../errorHandler');

const router = express.Router();

function isValidCoordinate(lat, lng) {
  return (
    typeof lat === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === 'number' &&
    lng >= -180 &&
    lng <= 180
  );
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function validateCreate(body) {
  if (!body || !isNonEmptyString(body.name)) {
    throw new HttpError(400, 'name is required');
  }
  if (!isNonEmptyString(body.address)) {
    throw new HttpError(400, 'address is required');
  }
  if (!isValidCoordinate(body.lat, body.lng)) {
    throw new HttpError(400, 'lat/lng must be numbers within valid ranges');
  }
}

router.get('/', async (req, res, next) => {
  try {
    res.json(await repo.listAll());
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    validateCreate(req.body);
    const { name, notes, address, lat, lng } = req.body;
    const location = await repo.create({ name, notes, address, lat, lng });
    res.status(201).json(location);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await repo.findById(id);
    if (!existing) {
      throw new HttpError(404, 'location not found');
    }

    const fields = {};
    ['name', 'notes', 'address', 'lat', 'lng'].forEach((key) => {
      if (key in req.body) fields[key] = req.body[key];
    });

    if ('name' in fields && !isNonEmptyString(fields.name)) {
      throw new HttpError(400, 'name must be a non-empty string');
    }
    if ('address' in fields && !isNonEmptyString(fields.address)) {
      throw new HttpError(400, 'address must be a non-empty string');
    }

    if ('lat' in fields || 'lng' in fields) {
      const lat = 'lat' in fields ? fields.lat : existing.lat;
      const lng = 'lng' in fields ? fields.lng : existing.lng;
      if (!isValidCoordinate(lat, lng)) {
        throw new HttpError(400, 'lat/lng must be numbers within valid ranges');
      }
    }

    res.json(await repo.update(id, fields));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const deleted = await repo.remove(id);
    if (!deleted) {
      throw new HttpError(404, 'location not found');
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
