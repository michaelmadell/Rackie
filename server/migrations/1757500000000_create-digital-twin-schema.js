exports.up = (pgm) => {
  pgm.sql(`
    -- 1. Rooms Table
    CREATE TABLE rooms (
      id           serial PRIMARY KEY,
      location_id  integer NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
      name         text NOT NULL,
      floor        text,
      notes        text,
      created_at   timestamptz NOT NULL DEFAULT now(),
      updated_at   timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_rooms_location_id ON rooms(location_id);

    -- 2. Racks Table
    CREATE TABLE racks (
      id              serial PRIMARY KEY,
      room_id         integer NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      name            text NOT NULL,
      u_height        integer NOT NULL DEFAULT 42 CHECK (u_height > 0 AND u_height <= 60),
      position_index  integer NOT NULL DEFAULT 0,
      notes           text,
      created_at      timestamptz NOT NULL DEFAULT now(),
      updated_at      timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_racks_room_id ON racks(room_id);

    -- 3. Device Templates Table (Reusable Library)
    CREATE TABLE device_templates (
      id            serial PRIMARY KEY,
      manufacturer  text NOT NULL,
      model         text NOT NULL,
      category      text NOT NULL,
      u_height      integer NOT NULL DEFAULT 1 CHECK (u_height >= 1),
      color         text DEFAULT '#2D3748',
      front_layout  jsonb NOT NULL DEFAULT '[]'::jsonb,
      rear_layout   jsonb NOT NULL DEFAULT '[]'::jsonb,
      is_preset     boolean NOT NULL DEFAULT false,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now()
    );

    -- 4. Deployed Devices in Racks
    CREATE TABLE devices (
      id             serial PRIMARY KEY,
      rack_id        integer NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
      template_id    integer REFERENCES device_templates(id) ON DELETE SET NULL,
      name           text NOT NULL,
      u_position     integer NOT NULL CHECK (u_position >= 1),
      u_height       integer NOT NULL CHECK (u_height >= 1),
      serial_number  text,
      status         text NOT NULL DEFAULT 'online',
      notes          text,
      created_at     timestamptz NOT NULL DEFAULT now(),
      updated_at     timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT u_slot_fit CHECK (u_position + u_height - 1 <= 60)
    );
    CREATE INDEX idx_devices_rack_id ON devices(rack_id);

    -- 5. Individual Ports
    CREATE TABLE ports (
      id           serial PRIMARY KEY,
      device_id    integer NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      name         text NOT NULL,
      face         text NOT NULL CHECK (face IN ('front', 'rear')),
      port_type    text NOT NULL,
      pos_x        double precision NOT NULL DEFAULT 0.0,
      pos_y        double precision NOT NULL DEFAULT 0.0,
      status       text NOT NULL DEFAULT 'active',
      created_at   timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_ports_device_id ON ports(device_id);

    -- 6. Cables (Patch Connections)
    CREATE TABLE cables (
      id            serial PRIMARY KEY,
      from_port_id  integer NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
      to_port_id    integer NOT NULL REFERENCES ports(id) ON DELETE CASCADE,
      cable_type    text NOT NULL DEFAULT 'cat6',
      color         text NOT NULL DEFAULT '#3182CE',
      routing_mode  text NOT NULL DEFAULT 'auto' CHECK (routing_mode IN ('auto', 'spline', 'bevelled', 'straight')),
      waypoints     jsonb NOT NULL DEFAULT '[]'::jsonb,
      visible       boolean NOT NULL DEFAULT true,
      length        text,
      label         text,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT chk_different_ports CHECK (from_port_id <> to_port_id)
    );
    CREATE INDEX idx_cables_from_port ON cables(from_port_id);
    CREATE INDEX idx_cables_to_port ON cables(to_port_id);

    -- Seed Standard Preset Device Templates
    INSERT INTO device_templates (manufacturer, model, category, u_height, color, is_preset, front_layout, rear_layout)
    VALUES
    (
      'Cisco',
      'Catalyst 9300-48P',
      'Switch',
      1,
      '#1B2A4A',
      true,
      '[
        {"namePrefix": "Port", "type": "rj45", "count": 48, "rows": 2, "layout": "odd-over-even", "startX": 0.12, "width": 0.72},
        {"namePrefix": "Uplink", "type": "sfp_plus", "count": 4, "rows": 1, "startX": 0.86, "width": 0.12}
      ]'::jsonb,
      '[
        {"name": "Console", "type": "console", "face": "rear", "posX": 0.15, "posY": 0.5},
        {"name": "Mgmt", "type": "rj45", "face": "rear", "posX": 0.25, "posY": 0.5},
        {"name": "PSU-1", "type": "c14", "face": "rear", "posX": 0.75, "posY": 0.5},
        {"name": "PSU-2", "type": "c14", "face": "rear", "posX": 0.88, "posY": 0.5}
      ]'::jsonb
    ),
    (
      'Ubiquiti',
      'USW-Pro-Max-24',
      'Switch',
      1,
      '#CBD5E0',
      true,
      '[
        {"namePrefix": "Port", "type": "rj45", "count": 24, "rows": 2, "layout": "odd-over-even", "startX": 0.22, "width": 0.58},
        {"namePrefix": "SFP+", "type": "sfp_plus", "count": 2, "rows": 1, "startX": 0.84, "width": 0.12}
      ]'::jsonb,
      '[
        {"name": "AC In", "type": "c14", "face": "rear", "posX": 0.85, "posY": 0.5}
      ]'::jsonb
    ),
    (
      'Dell',
      'PowerEdge R750',
      'Server',
      2,
      '#1A202C',
      true,
      '[
        {"name": "iDRAC Direct", "type": "usb", "face": "front", "posX": 0.10, "posY": 0.75},
        {"name": "USB 2.0", "type": "usb", "face": "front", "posX": 0.15, "posY": 0.75}
      ]'::jsonb,
      '[
        {"name": "iDRAC Mgmt", "type": "rj45", "face": "rear", "posX": 0.15, "posY": 0.3},
        {"name": "NIC-1", "type": "rj45", "face": "rear", "posX": 0.25, "posY": 0.3},
        {"name": "NIC-2", "type": "rj45", "face": "rear", "posX": 0.32, "posY": 0.3},
        {"name": "SFP-1", "type": "sfp_plus", "face": "rear", "posX": 0.45, "posY": 0.3},
        {"name": "SFP-2", "type": "sfp_plus", "face": "rear", "posX": 0.52, "posY": 0.3},
        {"name": "PSU-1", "type": "c14", "face": "rear", "posX": 0.80, "posY": 0.4},
        {"name": "PSU-2", "type": "c14", "face": "rear", "posX": 0.90, "posY": 0.4}
      ]'::jsonb
    ),
    (
      'PATCHBOX',
      'PATCHBOX Plus+ 24',
      'Cable Management',
      1,
      '#0A0A0A',
      true,
      '[
        {"namePrefix": "Cassette", "type": "rj45", "count": 24, "rows": 1, "startX": 0.05, "width": 0.90}
      ]'::jsonb,
      '[
        {"namePrefix": "Feed", "type": "rj45", "count": 24, "rows": 1, "startX": 0.05, "width": 0.90}
      ]'::jsonb
    ),
    (
      'Amulet Hotkey',
      'CoreStation DX',
      'Workstation',
      1,
      '#2D3748',
      true,
      '[
        {"name": "USB-1", "type": "usb", "face": "front", "posX": 0.85, "posY": 0.5},
        {"name": "USB-2", "type": "usb", "face": "front", "posX": 0.90, "posY": 0.5}
      ]'::jsonb,
      '[
        {"name": "LAN-1", "type": "rj45", "face": "rear", "posX": 0.15, "posY": 0.5},
        {"name": "LAN-2", "type": "rj45", "face": "rear", "posX": 0.22, "posY": 0.5},
        {"name": "DP-1", "type": "hdmi", "face": "rear", "posX": 0.35, "posY": 0.4},
        {"name": "DP-2", "type": "hdmi", "face": "rear", "posX": 0.42, "posY": 0.4},
        {"name": "DP-3", "type": "hdmi", "face": "rear", "posX": 0.49, "posY": 0.4},
        {"name": "DP-4", "type": "hdmi", "face": "rear", "posX": 0.56, "posY": 0.4},
        {"name": "Power", "type": "c14", "face": "rear", "posX": 0.88, "posY": 0.5}
      ]'::jsonb
    ),
    (
      'Generic',
      'Cat6 1U 24-Port Patch Panel',
      'Patch Panel',
      1,
      '#1A202C',
      true,
      '[
        {"namePrefix": "Jack", "type": "rj45", "count": 24, "rows": 1, "startX": 0.08, "width": 0.84}
      ]'::jsonb,
      '[
        {"namePrefix": "IDC", "type": "rj45", "count": 24, "rows": 1, "startX": 0.08, "width": 0.84}
      ]'::jsonb
    ),
    (
      'APC',
      'Smart-UPS RT 3000VA',
      'Power / UPS',
      2,
      '#171923',
      true,
      '[]'::jsonb,
      '[
        {"name": "Input", "type": "c20", "face": "rear", "posX": 0.15, "posY": 0.4},
        {"name": "NMC", "type": "rj45", "face": "rear", "posX": 0.30, "posY": 0.3},
        {"name": "Out-1", "type": "c13", "face": "rear", "posX": 0.45, "posY": 0.3},
        {"name": "Out-2", "type": "c13", "face": "rear", "posX": 0.52, "posY": 0.3},
        {"name": "Out-3", "type": "c13", "face": "rear", "posX": 0.59, "posY": 0.3},
        {"name": "Out-4", "type": "c13", "face": "rear", "posX": 0.66, "posY": 0.3},
        {"name": "Out-5", "type": "c13", "face": "rear", "posX": 0.73, "posY": 0.3},
        {"name": "Out-6", "type": "c13", "face": "rear", "posX": 0.80, "posY": 0.3},
        {"name": "Out-C19-1", "type": "c19", "face": "rear", "posX": 0.88, "posY": 0.3},
        {"name": "Out-C19-2", "type": "c19", "face": "rear", "posX": 0.94, "posY": 0.3}
      ]'::jsonb
    ),
    (
      'Generic',
      '1U Horizontal Cable Organizer',
      'Cable Management',
      1,
      '#2D3748',
      true,
      '[]'::jsonb,
      '[]'::jsonb
    ),
    (
      'Generic',
      '1U Blanking Panel',
      'Accessory',
      1,
      '#2D3748',
      true,
      '[]'::jsonb,
      '[]'::jsonb
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS cables;
    DROP TABLE IF EXISTS ports;
    DROP TABLE IF EXISTS devices;
    DROP TABLE IF EXISTS device_templates;
    DROP TABLE IF EXISTS racks;
    DROP TABLE IF EXISTS rooms;
  `);
};
