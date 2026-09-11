exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE devices ADD COLUMN IF NOT EXISTS enclosure_data jsonb DEFAULT NULL;
    ALTER TABLE device_templates ADD COLUMN IF NOT EXISTS enclosure_data jsonb DEFAULT NULL;

    -- Ensure 'Enclosure' is supported in device_templates and seed Dell PowerEdge M1000e
    INSERT INTO device_templates (
      manufacturer, model, category, u_height, color, is_preset, front_layout, rear_layout, enclosure_data
    )
    VALUES (
      'Dell',
      'PowerEdge M1000e',
      'Enclosure',
      10,
      '#1A202C',
      true,
      '[]'::jsonb,
      '[
        {"namePrefix": "Fab-A1-P", "type": "rj45", "count": 16, "rows": 2, "layout": "odd-over-even", "startX": 0.08, "width": 0.38, "face": "rear"},
        {"namePrefix": "Fab-A2-P", "type": "rj45", "count": 16, "rows": 2, "layout": "odd-over-even", "startX": 0.54, "width": 0.38, "face": "rear"},
        {"namePrefix": "Fab-B1-SFP", "type": "sfp_plus", "count": 4, "rows": 1, "startX": 0.08, "width": 0.18, "face": "rear"},
        {"namePrefix": "Fab-B2-SFP", "type": "sfp_plus", "count": 4, "rows": 1, "startX": 0.54, "width": 0.18, "face": "rear"},
        {"name": "CMC-1", "type": "rj45", "face": "rear", "posX": 0.35, "posY": 0.65},
        {"name": "CMC-2", "type": "rj45", "face": "rear", "posX": 0.65, "posY": 0.65},
        {"name": "PSU-1", "type": "c19", "face": "rear", "posX": 0.12, "posY": 0.88},
        {"name": "PSU-2", "type": "c19", "face": "rear", "posX": 0.27, "posY": 0.88},
        {"name": "PSU-3", "type": "c19", "face": "rear", "posX": 0.42, "posY": 0.88},
        {"name": "PSU-4", "type": "c19", "face": "rear", "posX": 0.58, "posY": 0.88},
        {"name": "PSU-5", "type": "c19", "face": "rear", "posX": 0.73, "posY": 0.88},
        {"name": "PSU-6", "type": "c19", "face": "rear", "posX": 0.88, "posY": 0.88}
      ]'::jsonb,
      '{
        "isEnclosure": true,
        "enclosureType": "blade_chassis",
        "totalBays": 16,
        "bayLayout": {"rows": 2, "cols": 8},
        "frontBays": [
          {
            "bayId": 1, "bayNumber": 1, "row": 1, "col": 1, "size": "half", "occupied": true,
            "blade": {
              "id": "blade-01", "name": "ESXi-Prod-01", "model": "PowerEdge M640", "manufacturer": "Dell",
              "status": "online", "serialNumber": "CN-08T72K-7411", "specs": "2x Xeon Gold 6140 / 384GB RAM / 2x 960GB NVMe",
              "powerState": "on"
            }
          },
          {
            "bayId": 2, "bayNumber": 2, "row": 1, "col": 2, "size": "half", "occupied": true,
            "blade": {
              "id": "blade-02", "name": "ESXi-Prod-02", "model": "PowerEdge M640", "manufacturer": "Dell",
              "status": "online", "serialNumber": "CN-08T72K-7412", "specs": "2x Xeon Gold 6140 / 384GB RAM / 2x 960GB NVMe",
              "powerState": "on"
            }
          },
          {
            "bayId": 3, "bayNumber": 3, "row": 1, "col": 3, "size": "half", "occupied": true,
            "blade": {
              "id": "blade-03", "name": "Kube-Worker-01", "model": "PowerEdge M630", "manufacturer": "Dell",
              "status": "online", "serialNumber": "CN-04P91M-1123", "specs": "2x Xeon E5-2680 v4 / 256GB RAM / 2x 480GB SSD",
              "powerState": "on"
            }
          },
          {
            "bayId": 4, "bayNumber": 4, "row": 1, "col": 4, "size": "half", "occupied": true,
            "blade": {
              "id": "blade-04", "name": "Kube-Worker-02", "model": "PowerEdge M630", "manufacturer": "Dell",
              "status": "online", "serialNumber": "CN-04P91M-1124", "specs": "2x Xeon E5-2680 v4 / 256GB RAM / 2x 480GB SSD",
              "powerState": "on"
            }
          },
          {
            "bayId": 5, "bayNumber": 5, "row": 1, "col": 5, "size": "half", "occupied": false, "blade": null
          },
          {
            "bayId": 6, "bayNumber": 6, "row": 1, "col": 6, "size": "half", "occupied": false, "blade": null
          },
          {
            "bayId": 7, "bayNumber": 7, "row": 1, "col": 7, "size": "half", "occupied": false, "blade": null
          },
          {
            "bayId": 8, "bayNumber": 8, "row": 1, "col": 8, "size": "half", "occupied": false, "blade": null
          },
          {
            "bayId": 9, "bayNumber": 9, "row": 2, "col": 1, "size": "half", "occupied": true,
            "blade": {
              "id": "blade-09", "name": "DB-Primary-01", "model": "PowerEdge M640", "manufacturer": "Dell",
              "status": "online", "serialNumber": "CN-08T72K-7419", "specs": "2x Xeon Gold 6248 / 512GB RAM / 4x 1.92TB NVMe",
              "powerState": "on"
            }
          },
          {
            "bayId": 10, "bayNumber": 10, "row": 2, "col": 2, "size": "half", "occupied": true,
            "blade": {
              "id": "blade-10", "name": "DB-Replica-02", "model": "PowerEdge M640", "manufacturer": "Dell",
              "status": "online", "serialNumber": "CN-08T72K-7420", "specs": "2x Xeon Gold 6248 / 512GB RAM / 4x 1.92TB NVMe",
              "powerState": "on"
            }
          },
          {
            "bayId": 11, "bayNumber": 11, "row": 2, "col": 3, "size": "half", "occupied": false, "blade": null
          },
          {
            "bayId": 12, "bayNumber": 12, "row": 2, "col": 4, "size": "half", "occupied": false, "blade": null
          },
          {
            "bayId": 13, "bayNumber": 13, "row": 2, "col": 5, "size": "half", "occupied": false, "blade": null
          },
          {
            "bayId": 14, "bayNumber": 14, "row": 2, "col": 6, "size": "half", "occupied": false, "blade": null
          },
          {
            "bayId": 15, "bayNumber": 15, "row": 2, "col": 7, "size": "half", "occupied": false, "blade": null
          },
          {
            "bayId": 16, "bayNumber": 16, "row": 2, "col": 8, "size": "half", "occupied": false, "blade": null
          }
        ],
        "rearComponents": {
          "fabrics": [
            {"slot": "A1", "name": "Fabric A1 (10GbE)", "type": "switch", "model": "Dell PowerConnect M6348", "status": "online"},
            {"slot": "A2", "name": "Fabric A2 (10GbE)", "type": "switch", "model": "Dell PowerConnect M6348", "status": "online"},
            {"slot": "B1", "name": "Fabric B1 (Pass-Through)", "type": "passthrough", "model": "Dell 10GbE Pass-Through", "status": "online"},
            {"slot": "B2", "name": "Fabric B2 (Pass-Through)", "type": "passthrough", "model": "Dell 10GbE Pass-Through", "status": "online"},
            {"slot": "C1", "name": "Fabric C1 (Fibre Channel)", "type": "fc", "model": "Brocade M5424 8Gb FC", "status": "online"},
            {"slot": "C2", "name": "Fabric C2 (Fibre Channel)", "type": "fc", "model": "Brocade M5424 8Gb FC", "status": "online"}
          ],
          "powerSupplies": [
            {"id": "psu-1", "name": "PSU 1", "watts": 2700, "status": "online"},
            {"id": "psu-2", "name": "PSU 2", "watts": 2700, "status": "online"},
            {"id": "psu-3", "name": "PSU 3", "watts": 2700, "status": "online"},
            {"id": "psu-4", "name": "PSU 4", "watts": 2700, "status": "online"},
            {"id": "psu-5", "name": "PSU 5", "watts": 2700, "status": "online"},
            {"id": "psu-6", "name": "PSU 6", "watts": 2700, "status": "online"}
          ],
          "fans": [
            {"id": "fan-1", "name": "Fan 1", "status": "online", "rpm": 6400},
            {"id": "fan-2", "name": "Fan 2", "status": "online", "rpm": 6400},
            {"id": "fan-3", "name": "Fan 3", "status": "online", "rpm": 6400},
            {"id": "fan-4", "name": "Fan 4", "status": "online", "rpm": 6400},
            {"id": "fan-5", "name": "Fan 5", "status": "online", "rpm": 6400},
            {"id": "fan-6", "name": "Fan 6", "status": "online", "rpm": 6400},
            {"id": "fan-7", "name": "Fan 7", "status": "online", "rpm": 6400},
            {"id": "fan-8", "name": "Fan 8", "status": "online", "rpm": 6400},
            {"id": "fan-9", "name": "Fan 9", "status": "online", "rpm": 6400}
          ],
          "cmc": [
            {"id": "cmc-1", "name": "CMC 1 (Active)", "ip": "192.168.10.150", "status": "online"},
            {"id": "cmc-2", "name": "CMC 2 (Standby)", "ip": "192.168.10.151", "status": "standby"}
          ]
        }
      }'::jsonb
    )
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM device_templates WHERE model = 'PowerEdge M1000e';
    ALTER TABLE devices DROP COLUMN IF EXISTS enclosure_data;
    ALTER TABLE device_templates DROP COLUMN IF EXISTS enclosure_data;
  `);
};
