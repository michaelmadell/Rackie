const express = require('express');
const templatesRepo = require('../db/deviceTemplatesRepo');
const { HttpError } = require('../errorHandler');

const router = express.Router();

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

// GET /api/device-templates?category=...&search=...&manufacturer=...
router.get('/', async (req, res, next) => {
  try {
    const { category, search, manufacturer } = req.query;
    const templates = await templatesRepo.listAll({ category, search, manufacturer });
    res.json(templates);
  } catch (err) {
    next(err);
  }
});

// GET /api/device-templates/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const template = await templatesRepo.findById(id);
    if (!template) {
      throw new HttpError(404, 'Device template not found');
    }
    res.json(template);
  } catch (err) {
    next(err);
  }
});

// POST /api/device-templates (Device Library custom device creator)
router.post('/', async (req, res, next) => {
  try {
    const {
      manufacturer,
      model,
      category,
      uHeight = 1,
      color = '#2D3748',
      frontLayout = [],
      rearLayout = [],
      enclosureData = null,
    } = req.body;

    if (!isNonEmptyString(manufacturer)) {
      throw new HttpError(400, 'manufacturer is required');
    }
    if (!isNonEmptyString(model)) {
      throw new HttpError(400, 'model is required');
    }
    if (!isNonEmptyString(category)) {
      throw new HttpError(400, 'category is required');
    }
    const parsedUHeight = Number(uHeight);
    if (isNaN(parsedUHeight) || parsedUHeight < 1 || parsedUHeight > 14) {
      throw new HttpError(400, 'uHeight must be between 1 and 14');
    }

    const template = await templatesRepo.create({
      manufacturer: manufacturer.trim(),
      model: model.trim(),
      category: category.trim(),
      uHeight: parsedUHeight,
      color: isNonEmptyString(color) ? color.trim() : '#2D3748',
      frontLayout: Array.isArray(frontLayout) ? frontLayout : [],
      rearLayout: Array.isArray(rearLayout) ? rearLayout : [],
      enclosureData: enclosureData || null,
    });

    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/device-templates/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existing = await templatesRepo.findById(id);
    if (!existing) {
      throw new HttpError(404, 'Device template not found');
    }
    if (existing.isPreset) {
      throw new HttpError(403, 'System presets cannot be deleted');
    }

    const deleted = await templatesRepo.remove(id);
    if (!deleted) {
      throw new HttpError(404, 'Device template not found');
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
