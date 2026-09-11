exports.up = (pgm) => {
  pgm.sql(`
    -- Seed or update Amulet Hotkey HX5 5U Enclosure
    DELETE FROM device_templates WHERE model ILIKE 'HX5%' AND manufacturer = 'Amulet Hotkey';

    INSERT INTO device_templates (
      manufacturer, model, category, u_height, color, is_preset, front_layout, rear_layout, enclosure_data
    )
    VALUES (
      'Amulet Hotkey',
      'HX5',
      'Enclosure',
      5,
      '#1A202C',
      true,
      '${JSON.stringify(frontPorts).replace(/'/g, "''")}'::jsonb,
      '${JSON.stringify(rearPorts).replace(/'/g, "''")}'::jsonb,
      '${JSON.stringify(encData).replace(/'/g, "''")}'::jsonb
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM device_templates WHERE model = 'HX5' AND manufacturer = 'Amulet Hotkey';
  `);
};
