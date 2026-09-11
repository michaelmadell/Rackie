import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import HX5EnclosureFaceplate from '../components/rack/HX5EnclosureFaceplate';
import ConfigureHX5ModuleModal from '../components/rack/ConfigureHX5ModuleModal';
import {
  getDefaultHX5EnclosureData,
  generateHX5DevicePorts,
  HX5_MODULE_TEMPLATES,
} from '../utils/hx5EnclosureHelper';

const renderWithChakra = (ui) => render(<ChakraProvider>{ui}</ChakraProvider>);

describe('Amulet Hotkey HX5 Enclosure System', () => {
  const hx5Device = {
    id: 14,
    rackId: 1,
    name: 'Amulet Hotkey HX5',
    manufacturer: 'Amulet Hotkey',
    model: 'CoreStation HX5',
    uHeight: 5,
    uPosition: 1,
    color: '#141A26',
    category: 'Enclosure',
    enclosureData: getDefaultHX5EnclosureData(),
    ports: generateHX5DevicePorts(getDefaultHX5EnclosureData()),
  };

  test('generateHX5DevicePorts correctly generates ports for installed modules with proper types and no erroneous RJ45s', () => {
    const defaultData = getDefaultHX5EnclosureData();
    const ports = generateHX5DevicePorts(defaultData);

    // Front ports: Chassis Power + Chassis USB-C + 18 node ports (Nodes 01-06)
    const frontPorts = ports.filter((p) => p.face === 'front');
    expect(frontPorts.length).toBe(20);
    expect(frontPorts.every((p) => p.portType !== 'rj45')).toBe(true);

    const pwr = frontPorts.find((p) => p.name === 'Chassis Power');
    expect(pwr).toBeDefined();
    expect(pwr.portType).toBe('power');

    const usbc = frontPorts.find((p) => p.name === 'Chassis USB-C');
    expect(usbc).toBeDefined();
    expect(usbc.portType).toBe('usb_c');

    const dp = frontPorts.find((p) => p.name === 'Node 01: DP-1');
    expect(dp).toBeDefined();
    expect(dp.portType).toBe('hdmi');

    const usb1 = frontPorts.find((p) => p.name === 'Node 01: USB-1');
    expect(usb1).toBeDefined();
    expect(usb1.portType).toBe('usb');

    // Rear ports: IOM 1 (N120: 12 node + 4 uplinks + 2 mgmt + cnsl) + IOM 2 (N205: 12 ports) + 4 PSUs
    const rearPorts = ports.filter((p) => p.face === 'rear');
    expect(rearPorts.length).toBe(35);
    expect(rearPorts.some((p) => p.name.includes('N120'))).toBe(true);
    expect(rearPorts.some((p) => p.name.includes('N205'))).toBe(true);
    expect(rearPorts.some((p) => p.name.includes('PSU-1'))).toBe(true);
  });

  test('HX5EnclosureFaceplate renders 12 node slots and chassis header on front view', () => {
    const silkscreenDevice = {
      ...hx5Device,
      enclosureData: {
        ...hx5Device.enclosureData,
        descriptions: { ...hx5Device.enclosureData.descriptions, showSilkscreens: true },
      },
    };
    renderWithChakra(<HX5EnclosureFaceplate device={silkscreenDevice} activeFace="front" />);

    expect(screen.getAllByText(/AMULET HOTKEY/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/CORESTATION HX5/i)).toBeInTheDocument();
    expect(screen.getByText('FRONT')).toBeInTheDocument();

    // Verify 12 slots are rendered
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  test('HX5EnclosureFaceplate renders rear fans, IOM bays, and PSUs on rear view', () => {
    const silkscreenDevice = {
      ...hx5Device,
      enclosureData: {
        ...hx5Device.enclosureData,
        descriptions: { ...hx5Device.enclosureData.descriptions, showSilkscreens: true },
      },
    };
    renderWithChakra(<HX5EnclosureFaceplate device={silkscreenDevice} activeFace="rear" />);

    expect(screen.getByText(/HX5 REAR/i)).toBeInTheDocument();
    expect(screen.getAllByText(/REAR/i).length).toBeGreaterThan(0);

    // Fans
    expect(screen.getByText('F1')).toBeInTheDocument();
    expect(screen.getByText('F6')).toBeInTheDocument();

    // IOMs
    expect(screen.getAllByText(/TOP: N120/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BTM: N205/i).length).toBeGreaterThan(0);

    // PSUs
    expect(screen.getByText('PSU 1')).toBeInTheDocument();
    expect(screen.getByText('PSU 4')).toBeInTheDocument();
  });

  test('ConfigureHX5ModuleModal renders slot management, image mapping, port alignment, and silkscreen tabs', () => {
    const handleUpdate = jest.fn();
    renderWithChakra(
      <ConfigureHX5ModuleModal
        isOpen={true}
        onClose={jest.fn()}
        device={hx5Device}
        onUpdateDevice={handleUpdate}
      />
    );

    expect(screen.getByText(/Amulet Hotkey HX5 Enclosure Configuration/i)).toBeInTheDocument();
    expect(screen.getByText(/1. Slot Allocation & Installed Modules/i)).toBeInTheDocument();
    expect(screen.getByText(/2. Image & Texture Mapping/i)).toBeInTheDocument();
    expect(screen.getByText(/3. Visual Port Alignment Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/4. Part Descriptions & Silkscreens/i)).toBeInTheDocument();

    // Switch to Image & Texture Mapping tab
    const imageTab = screen.getByText(/2. Image & Texture Mapping/i);
    fireEvent.click(imageTab);
    expect(screen.getByText(/Chassis & Module Texture Customizer/i)).toBeInTheDocument();
    expect(screen.getByText(/Reset All Textures to Factory Defaults/i)).toBeInTheDocument();

    // Switch to Visual Port Alignment Studio tab
    const alignTab = screen.getByText(/3. Visual Port Alignment Studio/i);
    fireEvent.click(alignTab);
    expect(screen.getByText(/Calibrate Target:/i)).toBeInTheDocument();
    expect(screen.getByText(/Pixel Alignment Nudge/i)).toBeInTheDocument();

    // Switch to Part Descriptions & Silkscreens tab
    const descTab = screen.getByText(/4. Part Descriptions & Silkscreens/i);
    fireEvent.click(descTab);
    expect(screen.getByText(/Part Descriptions & Silkscreen Headers/i)).toBeInTheDocument();
    expect(screen.getByText(/Faceplate Silkscreens/i)).toBeInTheDocument();
  });

  test('Port Alignment Studio supports natural aspect ratio, zoom levels, and snap to sled sockets', () => {
    const handleUpdate = jest.fn();
    renderWithChakra(
      <ConfigureHX5ModuleModal
        isOpen={true}
        onClose={jest.fn()}
        device={hx5Device}
        onUpdateDevice={handleUpdate}
        initialTab={2}
      />
    );

    // Verify Tab 3 is open
    expect(screen.getByText(/Calibrate Target:/i)).toBeInTheDocument();

    // Verify Zoom Controls (75%, 100%, 125%, 150%, 200%)
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
    expect(screen.getByText('125%')).toBeInTheDocument();
    expect(screen.getByText('150%')).toBeInTheDocument();
    expect(screen.getByText('200%')).toBeInTheDocument();

    // Verify Fit Mode options
    expect(screen.getByText('Natural Ratio')).toBeInTheDocument();
    expect(screen.getByText('Contain')).toBeInTheDocument();
    expect(screen.getByText('Fill (Stretch)')).toBeInTheDocument();

    // Verify Snap to Sled button is present for compute node
    const snapBtn = screen.getByText(/⚡ Snap to Sled/i);
    expect(snapBtn).toBeInTheDocument();

    // Verify image is rendered
    const sledImgs = screen.getAllByAltText('HX2000');
    expect(sledImgs.length).toBeGreaterThan(0);

    // Click Snap to Sled
    fireEvent.click(snapBtn);

    // Verify toast or updated ports
    expect(screen.getByText(/Ports Snapped to Sled Faceplate/i)).toBeInTheDocument();
  });

  test('N230 is decoupled from N205 with dedicated image configuration and port alignment', () => {
    // 1. Verify template decoupling
    expect(HX5_MODULE_TEMPLATES.N205.image).toBe('/n205.jpg');
    expect(HX5_MODULE_TEMPLATES.N230.image).toBe('/n230.jpg');
    expect(HX5_MODULE_TEMPLATES.N230.fallbackImage).toBe('/network.jpg');
    expect(HX5_MODULE_TEMPLATES.N230.imageStatus).toBe('to_come');
    expect(HX5_MODULE_TEMPLATES.N230.ports.length).toBe(14); // 12 ETH + 2x 25G uplinks
    expect(HX5_MODULE_TEMPLATES.N205.ports.length).toBe(12);

    // 2. Verify Tab 2 renders separate cards for N205 and N230
    const handleUpdate = jest.fn();
    renderWithChakra(
      <ConfigureHX5ModuleModal
        isOpen={true}
        onClose={jest.fn()}
        device={hx5Device}
        onUpdateDevice={handleUpdate}
        initialTab={1}
      />
    );

    expect(screen.getByText(/Bottom IOM: N205 Secondary Pass-Through/i)).toBeInTheDocument();
    expect(screen.getByText(/Bottom IOM: N230 25GbE Fabric/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Image To Come/i).length).toBeGreaterThan(0);

    // 3. Verify Tab 3 has dedicated N230 banner and snap button
    const alignTab = screen.getByText(/3. Visual Port Alignment Studio/i);
    fireEvent.click(alignTab);

    const targetSelect = screen.getByRole('combobox', { name: /Calibrate Target/i });
    fireEvent.change(targetSelect, { target: { value: 'N230' } });

    expect(screen.getByText(/N230 Separate Image To Come/i)).toBeInTheDocument();
    expect(screen.getByText(/⚡ Snap 25GbE Ports/i)).toBeInTheDocument();
  });

  test('HX5EnclosureFaceplate renders N230 in bottom IOM slot with fallback resilience', () => {
    const customDevice = {
      ...hx5Device,
      enclosureData: {
        ...hx5Device.enclosureData,
        rearModules: {
          ...hx5Device.enclosureData.rearModules,
          ioms: [
            hx5Device.enclosureData.rearModules.ioms[0],
            {
              ...hx5Device.enclosureData.rearModules.ioms[1],
              installedModule: 'N230',
              name: 'IOM Bottom (N230)',
            },
          ],
        },
      },
    };

    renderWithChakra(<HX5EnclosureFaceplate device={customDevice} activeFace="rear" />);
    expect(screen.getAllByText(/BTM: N230/i).length).toBeGreaterThan(0);
  });
});

