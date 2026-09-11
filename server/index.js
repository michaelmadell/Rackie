const path = require('path');
const express = require('express');
const { pool } = require('./db');
const { errorHandler } = require('./errorHandler');

const locationsRouter = require('./routes/locations');
const roomsRouter = require('./routes/rooms');
const racksRouter = require('./routes/racks');
const deviceTemplatesRouter = require('./routes/deviceTemplates');
const devicesRouter = require('./routes/devices');
const cablesRouter = require('./routes/cables');

const app = express();
app.use(express.json());

// Enable CORS for frontend dev server and external clients
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.get('/api/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
});

app.use('/api/locations', locationsRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/racks', racksRouter);
app.use('/api/device-templates', deviceTemplatesRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/cables', cablesRouter);

if (process.env.NODE_ENV === 'production') {
  const buildDir = path.join(__dirname, '..', 'build');
  app.use(express.static(buildDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildDir, 'index.html'));
  });
}

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = { app };
