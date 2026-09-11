import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import EnclosureFaceplate from '../components/rack/EnclosureFaceplate';

const renderWithChakra = (ui) => render(<ChakraProvider>{ui}</ChakraProvider>);

describe('EnclosureFaceplate - Modular Enclosures & Multi-Node Sleds', () => {
  const m1000eDevice = {
    id: 101,
    rackId: 1,
    name: 'Dell PowerEdge M1000e',
    manufacturer: 'Dell',
    model: 'PowerEdge M1000e',
    uHeight: 10,
    uPosition: 1,
    color: '#1A202C',
    category: 'Enclosure',
    enclosureData: {
      type: 'modular_enclosure',
      bayLayout: {
        rows: 2,
        cols: 8,
        orientation: 'vertical',
      },
      frontBays: Array.from({ length: 16 }).map((_, i) => ({
        bayNumber: i + 1,
        row: Math.floor(i / 8) + 1,
        col: (i % 8) + 1,
        orientation: 'vertical',
        size: 'half-height',
        occupied: i === 0,
        blade: i === 0 ? {
          name: 'ESXi-Prod-01',
          model: 'PowerEdge M640',
          status: 'online',
          powerState: 'on',
          specs: { cpu: '2x Xeon Gold 6248', ram: '256GB ECC', storage: '2x 960GB NVMe' }
        } : null,
      })),
      rearComponents: {
        fabricCount: 6,
        psuCount: 6,
        fanCount: 9,
        cmcCount: 2,
      },
    },
    ports: [],
  };

  const bigTwinDevice = {
    id: 102,
    rackId: 1,
    name: 'Supermicro BigTwin SYS-2029BT',
    manufacturer: 'Supermicro',
    model: 'BigTwin SYS-2029BT',
    uHeight: 2,
    uPosition: 11,
    color: '#161D2E',
    category: 'Enclosure',
    enclosureData: {
      type: 'modular_enclosure',
      bayLayout: {
        rows: 2,
        cols: 2,
        orientation: 'horizontal',
      },
      frontBays: [
        {
          bayNumber: 1,
          row: 1,
          col: 1,
          orientation: 'horizontal',
          size: 'node-sled',
          occupied: true,
          blade: {
            name: 'Kube-Worker-01',
            model: 'SYS-2029BT Node',
            status: 'online',
            powerState: 'on',
            specs: { cpu: '2x Xeon Gold 6140', ram: '192GB ECC', storage: '4x 1.92TB SAS' }
          }
        },
        {
          bayNumber: 2,
          row: 1,
          col: 2,
          orientation: 'horizontal',
          size: 'node-sled',
          occupied: false,
          blade: null,
        },
        {
          bayNumber: 3,
          row: 2,
          col: 1,
          orientation: 'horizontal',
          size: 'node-sled',
          occupied: false,
          blade: null,
        },
        {
          bayNumber: 4,
          row: 2,
          col: 2,
          orientation: 'horizontal',
          size: 'node-sled',
          occupied: false,
          blade: null,
        }
      ],
      rearComponents: {
        fabricCount: 2,
        psuCount: 2,
        fanCount: 4,
        cmcCount: 1,
      },
    },
    ports: [],
  };

  test('renders Dell M1000e vertical blade enclosure with LCD bezel and bays', () => {
    renderWithChakra(<EnclosureFaceplate device={m1000eDevice} activeFace="front" />);
    
    // Header brand and model
    expect(screen.getByText('DELL')).toBeInTheDocument();
    expect(screen.getByText('PowerEdge M1000e')).toBeInTheDocument();
    
    // Backlit LCD status bar
    expect(screen.getByText(/CMC1: OK.*1\/16 BAYS/)).toBeInTheDocument();
    
    // Occupied blade 1
    expect(screen.getByText('ESXi-Prod-01')).toBeInTheDocument();
    
    // Empty bays
    expect(screen.getByText('BAY 02')).toBeInTheDocument();
    expect(screen.getByText('BAY 16')).toBeInTheDocument();
  });

  test('renders Supermicro BigTwin horizontal multi-node sled enclosure', () => {
    renderWithChakra(<EnclosureFaceplate device={bigTwinDevice} activeFace="front" />);
    
    // Brand and model
    expect(screen.getByText('SUPE')).toBeInTheDocument();
    expect(screen.getByText('BigTwin SYS-2029BT')).toBeInTheDocument();
    expect(screen.getByText('Multi-Node Sled')).toBeInTheDocument();
    
    // Occupied sled 1
    expect(screen.getByText('Kube-Worker-01')).toBeInTheDocument();
    
    // Empty horizontal sled slots
    expect(screen.getByText('SLED 02')).toBeInTheDocument();
    expect(screen.getByText('SLED 03')).toBeInTheDocument();
    expect(screen.getByText('SLED 04')).toBeInTheDocument();
  });

  test('renders rear modular subsystems on rear face', () => {
    renderWithChakra(<EnclosureFaceplate device={m1000eDevice} activeFace="rear" />);
    
    // Rear cooling fans & PSUs
    expect(screen.getByText(/9x Hot-Plug Fans/)).toBeInTheDocument();
    expect(screen.getByText(/6x High-Efficiency PSUs/)).toBeInTheDocument();
    expect(screen.getByText(/Fabric A1/)).toBeInTheDocument();
    expect(screen.getByText(/Fabric B1/)).toBeInTheDocument();
  });
});
