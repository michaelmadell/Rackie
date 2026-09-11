import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import RoomCanvas from '../components/rack/RoomCanvas';
import * as digitalTwinApi from '../services/digitalTwinApi';

jest.mock('../services/digitalTwinApi', () => ({
  getRoomFull: jest.fn(),
  getDeviceTemplates: jest.fn(),
  createCable: jest.fn(),
  createDevice: jest.fn(),
  createDeviceTemplate: jest.fn(),
  createRack: jest.fn(),
  deleteCable: jest.fn(),
  deleteDevice: jest.fn(),
  updateDevice: jest.fn(),
  deleteRack: jest.fn(),
  updateCable: jest.fn(),
}));

const mockRoomData = {
  room: { id: 1, name: 'Main Data Center', floor: 'Level 2' },
  racks: [
    {
      id: 101,
      name: 'Rack 01',
      uHeight: 42,
      devices: [
        {
          id: 501,
          name: 'Core Switch 01',
          model: 'Switch 48G',
          manufacturer: 'Cisco',
          uPosition: 20,
          uHeight: 1,
          ports: [{ id: 901, name: 'Gig0/1', face: 'front' }],
        },
      ],
    },
  ],
  cables: [],
};

const renderWithChakra = (ui) => render(<ChakraProvider>{ui}</ChakraProvider>);

describe('Rack Elevation Zoom & Ctrl + Scroll Support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    digitalTwinApi.getRoomFull.mockResolvedValue(mockRoomData);
    digitalTwinApi.getDeviceTemplates.mockResolvedValue([]);
  });

  test('renders zoom controls and defaults to 100% zoom', async () => {
    renderWithChakra(<RoomCanvas roomId={1} />);

    // Wait for room to load
    await waitFor(() => {
      expect(screen.getByText(/Main Data Center/i)).toBeInTheDocument();
    });

    // Check zoom button displays 100%
    expect(screen.getByTitle('Current Zoom Level')).toHaveTextContent('100%');
    expect(screen.getByText(/Ctrl \+ Scroll to Zoom • Drag to Pan \(100%\)/i)).toBeInTheDocument();
  });

  test('zooms in and out using toolbar zoom buttons', async () => {
    renderWithChakra(<RoomCanvas roomId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Main Data Center/i)).toBeInTheDocument();
    });

    const zoomInBtn = screen.getByTitle('Zoom In (Ctrl + Scroll Up or Ctrl + +)');
    const zoomOutBtn = screen.getByTitle('Zoom Out (Ctrl + Scroll Down or Ctrl + -)');
    const resetZoomBtn = screen.getByTitle('Reset Zoom (Ctrl + 0)');

    // Zoom in once
    fireEvent.click(zoomInBtn);
    expect(screen.getByTitle('Current Zoom Level')).toHaveTextContent('110%');

    // Zoom in again
    fireEvent.click(zoomInBtn);
    expect(screen.getByTitle('Current Zoom Level')).toHaveTextContent('120%');

    // Zoom out
    fireEvent.click(zoomOutBtn);
    expect(screen.getByTitle('Current Zoom Level')).toHaveTextContent('110%');

    // Reset zoom
    fireEvent.click(resetZoomBtn);
    expect(screen.getByTitle('Current Zoom Level')).toHaveTextContent('100%');
  });

  test('zooms in and out with Ctrl + Wheel on canvas viewport', async () => {
    renderWithChakra(<RoomCanvas roomId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Main Data Center/i)).toBeInTheDocument();
    });

    const viewport = screen.getByTestId('room-canvas-viewport');

    // Wheel without Ctrl should NOT zoom
    const normalWheel = new WheelEvent('wheel', {
      deltaY: -100,
      ctrlKey: false,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(viewport, normalWheel);
    expect(screen.getByTitle('Current Zoom Level')).toHaveTextContent('100%');

    // Wheel with Ctrl + deltaY < 0 (scroll up) zooms IN
    const ctrlWheelUp = new WheelEvent('wheel', {
      deltaY: -100,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(viewport, ctrlWheelUp);
    expect(screen.getByTitle('Current Zoom Level')).toHaveTextContent('110%');

    // Wheel with Ctrl + deltaY > 0 (scroll down) zooms OUT
    const ctrlWheelDown = new WheelEvent('wheel', {
      deltaY: 100,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(viewport, ctrlWheelDown);
    expect(screen.getByTitle('Current Zoom Level')).toHaveTextContent('100%');

    // Wheel with Meta (Cmd on Mac) also zooms
    const cmdWheelUp = new WheelEvent('wheel', {
      deltaY: -100,
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(viewport, cmdWheelUp);
    expect(screen.getByTitle('Current Zoom Level')).toHaveTextContent('110%');
  });

  test('pans viewport when clicking and dragging on empty canvas space', async () => {
    renderWithChakra(<RoomCanvas roomId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Main Data Center/i)).toBeInTheDocument();
    });

    const viewport = screen.getByTestId('room-canvas-viewport');
    viewport.scrollLeft = 100;
    viewport.scrollTop = 100;

    // Mouse down on empty canvas space (button 0 = left click)
    fireEvent.mouseDown(viewport, { clientX: 300, clientY: 300, button: 0 });

    // Drag mouse by moving 60px left and 40px up
    fireEvent.mouseMove(window, { clientX: 240, clientY: 260 });

    // scrollLeft should have increased by 60px (dx = -60 => scrollLeft = 100 - (-60) = 160)
    expect(viewport.scrollLeft).toBe(160);
    expect(viewport.scrollTop).toBe(140);

    // Mouse up ends panning
    fireEvent.mouseUp(window);
  });

  test('does not initiate canvas pan when clicking on interactive port or device', async () => {
    renderWithChakra(<RoomCanvas roomId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Main Data Center/i)).toBeInTheDocument();
    });

    const viewport = screen.getByTestId('room-canvas-viewport');
    viewport.scrollLeft = 100;
    viewport.scrollTop = 100;

    // Find port button (interactive element)
    const portBtn = document.querySelector('[data-port-id="901"]');
    expect(portBtn).not.toBeNull();

    // Mouse down on port
    fireEvent.mouseDown(portBtn, { clientX: 300, clientY: 300, button: 0 });

    // Mouse move
    fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });

    // Viewport scroll must NOT change because mousedown was on interactive port
    expect(viewport.scrollLeft).toBe(100);
    expect(viewport.scrollTop).toBe(100);

    fireEvent.mouseUp(window);
  });
});
