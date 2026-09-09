exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE locations (
      id serial PRIMARY KEY,
      name text NOT NULL,
      notes text,
      address text NOT NULL,
      lat double precision NOT NULL,
      lng double precision NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE locations;`);
};
