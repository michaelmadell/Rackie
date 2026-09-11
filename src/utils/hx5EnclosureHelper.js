/**
 * Amulet Hotkey HX5 Enclosure Configuration & Dynamic Port Helper
 *
 * Hardware Specification:
 * - Height: 5U (140px in rack standard height)
 * - Front: 12 vertical node slots (Slots 1 to 12) + bottom bezel strip (Power, USB-C)
 * - Rear:
 *   - Top: 6 cooling fan bays (Fans 1 to 6)
 *   - Middle: 2 horizontal IOM bays:
 *     - Slot 1 (Top): N100 (1GbE Pass-Through) & N120 (10GbE Switch)
 *     - Slot 2 (Bottom): Blank, N205 (Secondary Pass-Through), & N230 (25GbE Fabric)
 *   - Bottom: 4 PSU bays (PSUs 1 to 4)
 * - Configurable Modules:
 *   - Front: HX1000, HX2000, HX3000, Node Blank
 *   - Rear: N100, N120, Blank, N205, N230, Fans, PSUs
 */

export const KNOWN_IMAGE_ASPECT_RATIOS = {
  '/node.png': 134 / 793,
  '/node.jpg': 133 / 794,
  '/node_hx2000.png': 148 / 793,
  '/node_hx3000.png': 148 / 793,
  '/node_blank.png': 148 / 793,
  '/node_bright.jpg': 139 / 764,
  '/node_dark.jpg': 106 / 568,
  '/node_detail_hx1000.png': 570 / 835,
  '/node_detail_hx2000.png': 758 / 1076,
  '/node_detail_hx2000_silk.png': 768 / 1080,
  '/node_detail_hx3000.png': 758 / 1076,
  '/n100.jpg': 1238 / 119,
  '/n100_trans_over.png': 1238 / 119,
  '/n120.jpg': 1858 / 169,
  '/n120_trans_over.png': 1858 / 169,
  '/n120_trans_over.jpg': 1858 / 169,
  '/n205.jpg': 1858 / 169,
  '/n205_trans_over.png': 1858 / 169,
  '/n230.jpg': 1858 / 169,
  '/n230.png': 1858 / 169,
  '/n230_trans_over.png': 1858 / 169,
  '/blank.jpg': 1227 / 109,
  '/network.jpg': 1278 / 120,
  '/fan.jpg': 206 / 248,
  '/cooling.jpg': 1278 / 262,
  '/psu.jpg': 140 / 73,
  '/power.jpg': 1278 / 121,
  '/enclosure_front_empty.jpg': 1174 / 587,
  '/enclosure_rear_empty.jpg': 1277 / 632,
  '/enclosure_rear_empty.png': 1276 / 632,
};

export const AVAILABLE_HX5_IMAGES = [
  { path: '/node_hx2000.png', name: 'HX2000 Full Sled Faceplate', category: 'Nodes' },
  { path: '/node_hx3000.png', name: 'HX3000 Full Sled Faceplate', category: 'Nodes' },
  { path: '/node.png', name: 'Generic Node Sled Faceplate (PNG)', category: 'Nodes' },
  { path: '/node_blank.png', name: 'Node Airflow Blanking Plate', category: 'Nodes' },
  { path: '/node.jpg', name: 'Generic Node (JPG)', category: 'Nodes' },
  { path: '/node_bright.jpg', name: 'Node (Bright Studio)', category: 'Nodes' },
  { path: '/node_dark.jpg', name: 'Node (Dark Matte)', category: 'Nodes' },
  { path: '/node_detail_hx2000.png', name: 'HX2000 Node Sled Detail (with PCB)', category: 'Nodes' },
  { path: '/node_detail_hx1000.png', name: 'HX1000 Node Sled Detail (with PCB)', category: 'Nodes' },
  { path: '/node_detail_hx3000.png', name: 'HX3000 Node Sled Detail (with PCB)', category: 'Nodes' },
  { path: '/node_detail_hx2000_silk.png', name: 'HX2000 Node (Silkscreen)', category: 'Nodes' },
  { path: '/enclosure_front_empty.jpg', name: 'Front Chassis (Empty)', category: 'Chassis' },
  { path: '/enclosure_rear_empty.png', name: 'Rear Chassis (Empty PNG)', category: 'Chassis' },
  { path: '/enclosure_rear_empty.jpg', name: 'Rear Chassis (Empty JPG)', category: 'Chassis' },
  { path: '/n100.jpg', name: 'N100 1GbE Pass-Through Base', category: 'IOMs' },
  { path: '/n100_trans_over.png', name: 'N100 Transparent Port Overlay', category: 'IOMs' },
  { path: '/n120.jpg', name: 'N120 10GbE Switch Base', category: 'IOMs' },
  { path: '/n120_trans_over.png', name: 'N120 Transparent Port Overlay (PNG)', category: 'IOMs' },
  { path: '/n120_trans_over.jpg', name: 'N120 Port Overlay (JPG)', category: 'IOMs' },
  { path: '/n205.jpg', name: 'N205 Secondary Pass-Through Base', category: 'IOMs' },
  { path: '/n205_trans_over.png', name: 'N205 Transparent Port Overlay', category: 'IOMs' },
  { path: '/n230.jpg', name: 'N230 25GbE Fabric Base (To Come - /n230.jpg)', category: 'IOMs' },
  { path: '/n230_trans_over.png', name: 'N230 Port Overlay (To Come - /n230_trans_over.png)', category: 'IOMs' },
  { path: '/blank.jpg', name: 'IOM Blanking Airflow Plate', category: 'IOMs' },
  { path: '/network.jpg', name: 'Network Switch Fabric Texture', category: 'IOMs' },
  { path: '/fan.jpg', name: 'Dual-Rotor Cooling Fan', category: 'Cooling' },
  { path: '/cooling.jpg', name: 'Cooling Grille Ventilation', category: 'Cooling' },
  { path: '/psu.jpg', name: '1600W Titanium Power Supply', category: 'Power' },
  { path: '/power.jpg', name: 'Power Distribution Unit Texture', category: 'Power' },
];

export const HX5_MODULE_TEMPLATES = {
  HX1000: {
    id: 'HX1000',
    name: 'CoreStation HX1000',
    model: 'HX1000',
    category: 'Workstation Node',
    image: '/node.png',
    face: 'front',
    description: 'EOL: Advantech SOM-5885 COM-E Node',
    ports: [
      { nameSuffix: 'DP', type: 'hdmi', relX: 0.6411, relY: 0.6688, width: 12, height: 9, rotation: 0 },
      { nameSuffix: 'USB-1', type: 'usb', relX: 0.3718, relY: 0.7896, width: 11, height: 8, rotation: 90 },
      { nameSuffix: 'USB-2', type: 'usb', relX: 0.6507, relY: 0.7912, width: 11, height: 8, rotation: 90 },
    ],
  },
  HX2000: {
    id: 'HX2000',
    name: 'CoreStation HX2000',
    model: 'HX2000',
    category: 'Workstation Node',
    image: '/node_hx2000.png',
    face: 'front',
    description: 'congatec TC700/TC750 COM-E Node',
    ports: [
      { nameSuffix: 'DP-1', type: 'hdmi', relX: 0.655, relY: 0.6623, width: 12, height: 9, rotation: 0 },
      { nameSuffix: 'USB-1', type: 'usb', relX: 0.3568, relY: 0.7879, width: 11, height: 8, rotation: 90 },
      { nameSuffix: 'USB-2', type: 'usb', relX: 0.6287, relY: 0.783, width: 11, height: 8, rotation: 90 },
    ],
  },
  HX3000: {
    id: 'HX3000',
    name: 'CoreStation HX3000',
    model: 'HX3000',
    category: 'Workstation Node',
    image: '/node_hx3000.png',
    face: 'front',
    description: 'AAEON HPC-ARSC COM-HPC Node',
    ports: [
      { nameSuffix: 'DP-1', type: 'hdmi', relX: 0.6462, relY: 0.6639, width: 11, height: 8, rotation: 0 },
      { nameSuffix: 'USB-1', type: 'usb', relX: 0.6287, relY: 0.7781, width: 11, height: 8, rotation: 90 },
      { nameSuffix: 'USB-2', type: 'usb', relX: 0.3919, relY: 0.7814, width: 11, height: 8, rotation: 90 },
    ],
  },
  NodeBlank: {
    id: 'NodeBlank',
    name: 'Node Blanking Sled',
    model: 'Node Blank',
    category: 'Airflow Blank',
    image: '/node_blank.png',
    face: 'front',
    description: 'Airflow baffle for empty front node slot',
    ports: [],
  },
  N100: {
    id: 'N100',
    name: 'N100 1GbE Pass-Through IOM',
    model: 'N100',
    category: 'I/O Module',
    image: '/n100.jpg',
    overlay: '/n100_trans_over.png',
    face: 'rear',
    slotPlacement: 'top',
    description: 'EOL: pass-through module for Node 1-12 with management and USB-C',
    ports: [
      { nameSuffix: 'MGMT', type: 'rj45', relX: 0.1104, relY: 0.5543, width: 13, height: 10 },
      { nameSuffix: 'CNSL', type: 'usb_c', relX: 0.2167, relY: 0.7283, width: 11, height: 8 },
      { nameSuffix: 'PTH-1', type: 'rj45', relX: 0.8965, relY: 0.5761, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'PTH-2', type: 'rj45', relX: 0.8403, relY: 0.5761, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'PTH-3', type: 'rj45', relX: 0.7819, relY: 0.5906, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'PTH-4', type: 'rj45', relX: 0.7243, relY: 0.5688, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'PTH-5', type: 'rj45', relX: 0.6674, relY: 0.5833, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'PTH-6', type: 'rj45', relX: 0.6104, relY: 0.5761, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'PTH-7', type: 'rj45', relX: 0.5528, relY: 0.5616, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'PTH-8', type: 'rj45', relX: 0.4958, relY: 0.5543, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'PTH-9', type: 'rj45', relX: 0.4382, relY: 0.5471, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'PTH-10', type: 'rj45', relX: 0.3806, relY: 0.5616, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'PTH-11', type: 'rj45', relX: 0.3229, relY: 0.5833, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'PTH-12', type: 'rj45', relX: 0.2653, relY: 0.5833, orientation: 'bottom', width: 12, height: 10 },
    ],
  },
  N120: {
    id: 'N120',
    name: 'N120 10GbE Switch IOM',
    model: 'N120',
    category: 'I/O Module',
    image: '/n120.jpg',
    overlay: '/n120_trans_over.png',
    face: 'rear',
    slotPlacement: 'top',
    description: 'Managed 10GbE switch module with 4x SFP+ [LAG] uplinks & 12x node ports',
    ports: [
      { nameSuffix: 'MGMT-1', type: 'rj45', relX: 0.1049, relY: 0.5885, width: 13, height: 10 },
      { nameSuffix: 'MGMT-2', type: 'rj45', relX: 0.1625, relY: 0.5962, width: 13, height: 10 },
      { nameSuffix: 'CNSL', type: 'usb_c', relX: 0.2125, relY: 0.7654, width: 11, height: 8 },
      { nameSuffix: 'NODE-1', type: 'rj45', relX: 0.5799, relY: 0.2654, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'NODE-2', type: 'rj45', relX: 0.5799, relY: 0.6192, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'NODE-3', type: 'rj45', relX: 0.5486, relY: 0.2731, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'NODE-4', type: 'rj45', relX: 0.5479, relY: 0.6115, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'NODE-5', type: 'rj45', relX: 0.5167, relY: 0.2885, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'NODE-6', type: 'rj45', relX: 0.5160, relY: 0.6192, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'NODE-7', type: 'rj45', relX: 0.4826, relY: 0.2731, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'NODE-8', type: 'rj45', relX: 0.4840, relY: 0.6038, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'NODE-9', type: 'rj45', relX: 0.4521, relY: 0.2731, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'NODE-10', type: 'rj45', relX: 0.4500, relY: 0.6038, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'NODE-11', type: 'rj45', relX: 0.4194, relY: 0.2808, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'NODE-12', type: 'rj45', relX: 0.4181, relY: 0.5962, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'UPLINK-1', type: 'sfp_plus', relX: 0.7354, relY: 0.6654, width: 15, height: 11 },
      { nameSuffix: 'UPLINK-2', type: 'sfp_plus', relX: 0.7688, relY: 0.6500, width: 15, height: 11 },
      { nameSuffix: 'UPLINK-3', type: 'sfp_plus', relX: 0.8014, relY: 0.6577, width: 15, height: 11 },
      { nameSuffix: 'UPLINK-4', type: 'sfp_plus', relX: 0.8347, relY: 0.6731, width: 15, height: 11 },
    ],
  },
  N205: {
    id: 'N205',
    name: 'N205 Secondary Pass-Through IOM',
    model: 'N205',
    category: 'I/O Module',
    image: '/n205.jpg',
    overlay: '/n205_trans_over.png',
    face: 'rear',
    slotPlacement: 'bottom',
    description: 'Secondary 1GbE pass-through network card for nodes 1-12',
    ports: [
      { nameSuffix: 'SEC-1', type: 'rj45', relX: 0.5799, relY: 0.2885, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'SEC-2', type: 'rj45', relX: 0.5799, relY: 0.6269, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'SEC-3', type: 'rj45', relX: 0.5479, relY: 0.2654, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'SEC-4', type: 'rj45', relX: 0.5493, relY: 0.6115, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'SEC-5', type: 'rj45', relX: 0.5160, relY: 0.2962, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'SEC-6', type: 'rj45', relX: 0.5153, relY: 0.6115, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'SEC-7', type: 'rj45', relX: 0.4840, relY: 0.2885, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'SEC-8', type: 'rj45', relX: 0.4840, relY: 0.6115, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'SEC-9', type: 'rj45', relX: 0.4507, relY: 0.2731, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'SEC-10', type: 'rj45', relX: 0.4507, relY: 0.6115, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'SEC-11', type: 'rj45', relX: 0.4188, relY: 0.2731, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'SEC-12', type: 'rj45', relX: 0.4194, relY: 0.6192, orientation: 'bottom', width: 12, height: 10 },
    ],
  },
  N230: {
    id: 'N230',
    name: 'N230 25GbE Fabric IOM',
    model: 'N230',
    category: 'I/O Module',
    image: '/n230.jpg',
    overlay: '/n230_trans_over.png',
    fallbackImage: '/network.jpg',
    imageStatus: 'to_come',
    face: 'rear',
    slotPlacement: 'bottom',
    description: 'High-speed 25GbE fabric module with 2x 25G SFP28 uplinks (separate image to come)',
    ports: [
      { nameSuffix: 'ETH-1', type: 'rj45', relX: 0.5799, relY: 0.3038, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'ETH-2', type: 'rj45', relX: 0.5799, relY: 0.6115, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'ETH-3', type: 'rj45', relX: 0.5493, relY: 0.2808, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'ETH-4', type: 'rj45', relX: 0.5486, relY: 0.6115, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'ETH-5', type: 'rj45', relX: 0.5160, relY: 0.2885, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'ETH-6', type: 'rj45', relX: 0.5160, relY: 0.6269, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'ETH-7', type: 'rj45', relX: 0.4840, relY: 0.2885, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'ETH-8', type: 'rj45', relX: 0.4840, relY: 0.6038, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'ETH-9', type: 'rj45', relX: 0.4514, relY: 0.2885, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'ETH-10', type: 'rj45', relX: 0.4514, relY: 0.6115, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: 'ETH-11', type: 'rj45', relX: 0.4188, relY: 0.2962, orientation: 'top', width: 12, height: 10 },
      { nameSuffix: 'ETH-12', type: 'rj45', relX: 0.4194, relY: 0.6115, orientation: 'bottom', width: 12, height: 10 },
      { nameSuffix: '25G-1', type: 'sfp_plus', relX: 0.8300, relY: 0.5000, width: 15, height: 11 },
      { nameSuffix: '25G-2', type: 'sfp_plus', relX: 0.8800, relY: 0.5000, width: 15, height: 11 },
    ],
  },
  IOMBlank: {
    id: 'IOMBlank',
    name: 'IOM Blanking Plate',
    model: 'Blank',
    category: 'Airflow Blank',
    image: '/blank.jpg',
    face: 'rear',
    slotPlacement: 'bottom',
    description: 'Solid blank plate for empty bottom IOM bay',
    ports: [],
  },
  Fan: {
    id: 'Fan',
    name: 'Hot-Plug Cooling Fan',
    model: 'Fan-Mod',
    category: 'Cooling',
    image: '/fan.jpg',
    face: 'rear',
    description: 'Dual-rotor counter-rotating cooling fan module',
    ports: [],
  },
  PSU: {
    id: 'PSU',
    name: 'Power Supply',
    model: 'PSU',
    category: 'Power',
    image: '/psu.jpg',
    face: 'rear',
    description: 'High efficiency hot-plug AC power supply module',
    ports: [
      { nameSuffix: 'AC-In', type: 'c14', relX: 0.7799, relY: 0.5060, width: 15, height: 12 },
    ],
  },
};

/**
 * Returns default HX5 enclosure configuration structure
 */
export function getDefaultHX5EnclosureData() {
  const frontSlots = Array.from({ length: 12 }, (_, idx) => {
    const slotNumber = idx + 1;
    let moduleType = 'Empty';
    let name = `Slot ${String(slotNumber).padStart(2, '0')}`;
    let serial = null;
    let power = 'off';

    if (slotNumber === 1 || slotNumber === 2) {
      moduleType = 'HX2000';
      name = `Node-${String(slotNumber).padStart(2, '0')} (HX2000)`;
      serial = `AH-HX20-${String(slotNumber).padStart(4, '0')}`;
      power = 'on';
    } else if (slotNumber === 3 || slotNumber === 4) {
      moduleType = 'HX1000';
      name = `Node-${String(slotNumber).padStart(2, '0')} (HX1000)`;
      serial = `AH-HX10-${String(slotNumber).padStart(4, '0')}`;
      power = 'on';
    } else if (slotNumber === 5 || slotNumber === 6) {
      moduleType = 'HX3000';
      name = `Node-${String(slotNumber).padStart(2, '0')} (HX3000)`;
      serial = `AH-HX30-${String(slotNumber).padStart(4, '0')}`;
      power = 'on';
    } else if (slotNumber === 7 || slotNumber === 8) {
      moduleType = 'NodeBlank';
      name = `Blank Sled ${String(slotNumber).padStart(2, '0')}`;
    }

    return {
      slotNumber,
      occupied: moduleType !== 'Empty',
      moduleType,
      name,
      serial,
      power,
    };
  });

  return {
    type: 'hx5_enclosure',
    enclosureType: 'hx5',
    manufacturer: 'Amulet Hotkey',
    model: 'HX5',
    uHeight: 5,
    images: {
      frontChassis: '/enclosure_front_empty.jpg',
      frontChassisOpacity: 0.35,
      rearChassis: '/enclosure_rear_empty.png',
      rearChassisOpacity: 1.0,
      fans: '/fan.jpg',
      psus: '/psu.jpg',
    },
    descriptions: {
      frontBrand: 'AMULET HOTKEY',
      frontModel: 'CORESTATION HX5',
      frontStatus: '',
      rearHeader: 'HX5 REAR',
      fanSection: '6x Hot-Plug Cooling Fans',
      topIomSection: 'IOM1',
      bottomIomSection: 'IOM2',
      psuSection: '4x Power Supplies',
      showSilkscreens: false,
      showPortTooltips: true,
      showSlotBadges: true,
    },
    chassisPorts: {
      power: { posX: 0.4756, posY: 0.9489, width: 10, height: 10 },
      usb: { posX: 0.5267, posY: 0.9533, width: 10, height: 7 },
    },
    frontSlotsConfig: {
      bayAreaLeft: 0.0,
      bayAreaWidth: 1.0,
      topY: 0.0725,
      heightY: 0.8116,
    },
    iomSlotsConfig: {
      top: { topY: 0.38, heightY: 0.18, leftX: 0.08, widthX: 0.84 },
      bottom: { topY: 0.58, heightY: 0.18, leftX: 0.08, widthX: 0.84 },
    },
    psuSlotsConfig: {
      topY: 0.78,
      heightY: 0.18,
      leftX: 0.08,
      widthX: 0.84,
    },
    frontSlots,
    rearModules: {
      fans: Array.from({ length: 6 }, (_, i) => ({
        slotNumber: i + 1,
        installed: true,
        status: 'ok',
        rpm: 6400,
      })),
      ioms: [
        {
          slotNumber: 1, // Top slot
          allowedModules: ['N100', 'N120', 'Empty'],
          installedModule: 'N120',
          name: 'IOM Top (N120)',
          status: 'online',
        },
        {
          slotNumber: 2, // Bottom slot
          allowedModules: ['IOMBlank', 'N205', 'N230', 'Empty'],
          installedModule: 'N205',
          name: 'IOM Bottom (N205)',
          status: 'online',
        },
      ],
      psus: Array.from({ length: 4 }, (_, i) => ({
        slotNumber: i + 1,
        installed: true,
        status: 'ok',
        watts: 1600,
      })),
    },
    moduleTemplates: { ...HX5_MODULE_TEMPLATES },
  };
}

/**
 * Calculates absolute normalized (posX, posY, width, height, face) ports
 * for all installed modules in the HX5 enclosure.
 */
export function generateHX5DevicePorts(enclosureData) {
  const enc = enclosureData || getDefaultHX5EnclosureData();
  const templates = enc.moduleTemplates || HX5_MODULE_TEMPLATES;
  const ports = [];

  // 1. Chassis Bezel Front Ports
  const chassisPwr = enc.chassisPorts?.power || { posX: 0.048, posY: 0.93, width: 10, height: 10 };
  const chassisUsb = enc.chassisPorts?.usb || { posX: 0.078, posY: 0.93, width: 10, height: 7 };

  ports.push({
    name: 'Chassis Power',
    face: 'front',
    portType: 'power',
    posX: chassisPwr.posX ?? 0.048,
    posY: chassisPwr.posY ?? 0.93,
    width: chassisPwr.width ?? 10,
    height: chassisPwr.height ?? 10,
    orientation: 'top',
    rotation: chassisPwr.rotation || 0,
    status: 'active',
    description: 'Chassis Power Button & State LED',
  });
  ports.push({
    name: 'Chassis USB-C',
    face: 'front',
    portType: 'usb_c',
    posX: chassisUsb.posX ?? 0.078,
    posY: chassisUsb.posY ?? 0.93,
    width: chassisUsb.width ?? 10,
    height: chassisUsb.height ?? 7,
    orientation: 'top',
    rotation: chassisUsb.rotation || 0,
    status: 'active',
    description: 'Chassis Front Maintenance USB-C Port',
  });

  // 2. Front Node Sled Ports (12 Slots)
  const frontSlots = enc.frontSlots || [];
  const frontCfg = enc.frontSlotsConfig || {};
  const bayAreaLeft = typeof frontCfg.bayAreaLeft === 'number' ? frontCfg.bayAreaLeft : 0.0;
  const bayAreaWidth = typeof frontCfg.bayAreaWidth === 'number' ? frontCfg.bayAreaWidth : 1.0;
  const frontTopY = typeof frontCfg.topY === 'number' ? frontCfg.topY : 0.0725;
  const frontHeightY = typeof frontCfg.heightY === 'number' ? frontCfg.heightY : 0.8116;
  const slotWidthNorm = bayAreaWidth / 12;

  frontSlots.forEach((slot) => {
    if (!slot.occupied || !slot.moduleType || slot.moduleType === 'Empty' || slot.moduleType === 'NodeBlank') {
      return;
    }
    const tmpl = templates[slot.moduleType] || HX5_MODULE_TEMPLATES[slot.moduleType];
    if (!tmpl || !Array.isArray(tmpl.ports)) return;

    const slotLeft = bayAreaLeft + (slot.slotNumber - 1) * slotWidthNorm;

    tmpl.ports.forEach((p) => {
      // Offset relative X and Y inside the vertical slot
      const absPosX = Number((slotLeft + (p.relX ?? 0.5) * slotWidthNorm).toFixed(4));
      const absPosY = Number((frontTopY + (p.relY ?? 0.5) * frontHeightY).toFixed(4));

      ports.push({
        name: `Node ${String(slot.slotNumber).padStart(2, '0')}: ${p.nameSuffix}`,
        face: 'front',
        portType: p.type || 'rj45',
        posX: absPosX,
        posY: absPosY,
        orientation: p.orientation || 'top',
        rotation: typeof p.rotation === 'number' ? p.rotation : 0,
        width: p.width || 12,
        height: p.height || 9,
        status: slot.power === 'on' ? 'active' : 'offline',
        slotNumber: slot.slotNumber,
        moduleType: slot.moduleType,
        description: p.description || `${tmpl.name} Port ${p.nameSuffix}`,
      });
    });
  });

  // 3. Rear IOM Ports (2 Slots in Middle Tier)
  const rearModules = enc.rearModules || {};
  const ioms = rearModules.ioms || [];
  const iomCfg = enc.iomSlotsConfig || {};
  const topIomCfg = iomCfg.top || { topY: 0.38, heightY: 0.18, leftX: 0.08, widthX: 0.84 };
  const btmIomCfg = iomCfg.bottom || { topY: 0.58, heightY: 0.18, leftX: 0.08, widthX: 0.84 };

  ioms.forEach((iom) => {
    const modId = iom.installedModule;
    if (!modId || modId === 'Empty' || modId === 'IOMBlank') return;

    const tmpl = templates[modId] || HX5_MODULE_TEMPLATES[modId];
    if (!tmpl || !Array.isArray(tmpl.ports)) return;

    const isTopSlot = iom.slotNumber === 1;
    const cfg = isTopSlot ? topIomCfg : btmIomCfg;
    const iomLeft = cfg.leftX ?? 0.08;
    const iomWidth = cfg.widthX ?? 0.84;
    const iomTopY = cfg.topY ?? (isTopSlot ? 0.38 : 0.58);
    const iomHeightY = cfg.heightY ?? 0.18;

    tmpl.ports.forEach((p) => {
      const absPosX = Number((iomLeft + (p.relX ?? 0.5) * iomWidth).toFixed(4));
      const absPosY = Number((iomTopY + (p.relY ?? 0.5) * iomHeightY).toFixed(4));

      ports.push({
        name: `${modId}-${p.nameSuffix}`,
        face: 'rear',
        portType: p.type || 'rj45',
        posX: absPosX,
        posY: absPosY,
        orientation: p.orientation || (p.relY > 0.5 ? 'bottom' : 'top'),
        rotation: typeof p.rotation === 'number' ? p.rotation : 0,
        width: p.width || 13,
        height: p.height || 10,
        status: 'active',
        iomSlot: iom.slotNumber,
        moduleType: modId,
        description: p.description || `${tmpl.name} ${p.nameSuffix}`,
      });
    });
  });

  // 4. Rear PSU Ports (4 PSUs in Bottom Tier)
  const psus = rearModules.psus || [];
  const psuCfg = enc.psuSlotsConfig || { topY: 0.78, heightY: 0.18, leftX: 0.08, widthX: 0.84 };
  const psuAreaLeft = psuCfg.leftX ?? 0.08;
  const psuAreaWidth = psuCfg.widthX ?? 0.84;
  const psuSlotWidth = psuAreaWidth / 4;

  psus.forEach((psu) => {
    if (!psu.installed) return;
    const psuLeft = psuAreaLeft + (psu.slotNumber - 1) * psuSlotWidth;
    const absPosX = Number((psuLeft + psuSlotWidth * 0.82).toFixed(4));
    const absPosY = Number((psuCfg.topY + (psuCfg.heightY ?? 0.18) * 0.5).toFixed(4)) || 0.87;

    ports.push({
      name: `PSU-${psu.slotNumber}: AC In`,
      face: 'rear',
      portType: 'c14',
      posX: absPosX,
      posY: absPosY,
      width: 15,
      height: 12,
      status: psu.status === 'ok' ? 'active' : 'offline',
      psuSlot: psu.slotNumber,
      description: '1600W AC Power Input (C14)',
    });
  });

  return ports;
}

