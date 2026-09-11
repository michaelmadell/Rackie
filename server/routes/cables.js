const express = require('express');
const cablesRepo = require('../db/cablesRepo');
const { HttpError } = require('../errorHandler');

const router = express.Router();

// GET /api/cables?roomId=123
router.get('/', async (req, res, next) => {
  try {
    const roomId = req.query.roomId ? Number(req.query.roomId) : null;
    if (!roomId) {
      throw new HttpError(400, 'roomId query parameter is required');
    }
    const cables = await cablesRepo.listByRoom(roomId);
    res.json(cables);
  } catch (err) {
    next(err);
  }
});

// GET /api/cables/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const cable = await cablesRepo.findById(id);
    if (!cable) {
      throw new HttpError(404, 'Cable not found');
    }
    res.json(cable);
  } catch (err) {
    next(err);
  }
});

// POST /api/cables (Create patch connection)
router.post('/', async (req, res, next) => {
  try {
    const {
      fromPortId,
      toPortId,
      cableType = 'cat6',
      color = '#3182CE',
      routingMode = 'auto',
      waypoints = [],
      visible = true,
      length,
      label,
    } = req.body;

    if (!fromPortId || isNaN(Number(fromPortId))) {
      throw new HttpError(400, 'fromPortId is required');
    }
    if (!toPortId || isNaN(Number(toPortId))) {
      throw new HttpError(400, 'toPortId is required');
    }
    if (Number(fromPortId) === Number(toPortId)) {
      throw new HttpError(400, 'Cannot connect a port to itself');
    }

    const validModes = ['auto', 'spline', 'bevelled', 'straight'];
    if (!validModes.includes(routingMode)) {
      throw new HttpError(400, `routingMode must be one of: ${validModes.join(', ')}`);
    }

    const cable = await cablesRepo.create({
      fromPortId: Number(fromPortId),
      toPortId: Number(toPortId),
      cableType,
      color,
      routingMode,
      waypoints: Array.isArray(waypoints) ? waypoints : [],
      visible: typeof visible === 'boolean' ? visible : true,
      length: length ? String(length).trim() : null,
      label: label ? String(label).trim() : null,
    });

    res.status(201).json(cable);
  } catch (err) {
    next(err);
  }
});

// PUT /api/cables/:id (Update routing mode, waypoints, visibility, color)
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await cablesRepo.findById(id);
    if (!existing) {
      throw new HttpError(404, 'Cable not found');
    }

    if (req.body.routingMode) {
      const validModes = ['auto', 'spline', 'bevelled', 'straight'];
      if (!validModes.includes(req.body.routingMode)) {
        throw new HttpError(400, `routingMode must be one of: ${validModes.join(', ')}`);
      }
    }

    const fields = {};
    if ('cableType' in req.body || 'cable_type' in req.body) {
      fields.cableType = req.body.cableType ?? req.body.cable_type;
    }
    if ('color' in req.body) fields.color = req.body.color;
    if ('routingMode' in req.body || 'routing_mode' in req.body) {
      fields.routingMode = req.body.routingMode ?? req.body.routing_mode;
    }
    if ('waypoints' in req.body) fields.waypoints = req.body.waypoints;
    if ('visible' in req.body) fields.visible = req.body.visible;
    if ('length' in req.body) fields.length = req.body.length;
    if ('label' in req.body) fields.label = req.body.label;

    const updated = await cablesRepo.update(id, fields);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cables/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const deleted = await cablesRepo.remove(id);
    if (!deleted) {
      throw new HttpError(404, 'Cable not found');
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
