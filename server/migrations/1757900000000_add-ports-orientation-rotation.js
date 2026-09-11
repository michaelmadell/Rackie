exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE ports ADD COLUMN IF NOT EXISTS orientation text DEFAULT 'top';
    ALTER TABLE ports ADD COLUMN IF NOT EXISTS rotation integer DEFAULT 0;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE ports DROP COLUMN IF EXISTS orientation;
    ALTER TABLE ports DROP COLUMN IF EXISTS rotation;
  `);
};
