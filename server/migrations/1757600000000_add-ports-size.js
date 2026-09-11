exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE ports ADD COLUMN IF NOT EXISTS width integer DEFAULT 14;
    ALTER TABLE ports ADD COLUMN IF NOT EXISTS height integer DEFAULT 11;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE ports DROP COLUMN IF EXISTS width;
    ALTER TABLE ports DROP COLUMN IF EXISTS height;
  `);
};
