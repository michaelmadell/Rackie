const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.test') });

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.endsWith('_test')) {
  throw new Error(
    'server/.env.test is missing or DATABASE_URL does not point at a _test database. ' +
    'Copy server/.env.test.example to server/.env.test and point it at a dedicated test database ' +
    'before running tests — the test suite TRUNCATEs the locations table.'
  );
}
