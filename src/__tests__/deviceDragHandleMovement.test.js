import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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
        {
          id: 502,
          name: 'Storage Server 01',
          model: 'PowerEdge R750',
          manufacturer: 'Dell',
          uPosition: 30,
          uHeight: 2,
          ports: [{ id: 902, name: 'eth0', face: 'front' }],
        },
      ],
    },
  ],
  cables: [],
};

const renderWithChakra = (ui) => render(<ChakraProvider>{ui}</ChakraProvider>);

describe('Device Movement via Drag Handle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    digitalTwinApi.getRoomFull.mockResolvedValue(mockRoomData);
    digitalTwinApi.getDeviceTemplates.mockResolvedValue([]);
    digitalTwinApi.updateDevice.mockResolvedValue({ id: 501, uPosition: 25 });
  });

  test('renders drag handle with data-device-drag-handle on right mounting ear', async () => {
    renderWithChakra(<RoomCanvas roomId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Main Data Center/i)).toBeInTheDocument();
    });

    const dragHandle = document.querySelector(
      '[data-device-drag-handle="true"][data-device-id="501"]'
    );
    expect(dragHandle).not.toBeNull();
    expect(dragHandle).toHaveAttribute('title', expect.stringMatching(/drag device to reorder \/ move slot/i));
  });

  test('initiates drag and displays ghost drop target indicator', async () => {
    renderWithChakra(<RoomCanvas roomId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Main Data Center/i)).toBeInTheDocument();
    });

    const dragHandle = document.querySelector(
      '[data-device-drag-handle="true"][data-device-id="501"]'
    );
    expect(dragHandle).not.toBeNull();

    // Mock getBoundingClientRect on the equipment bay
    const equipmentBay = document.getElementById('rack-equipment-bay-101');
    expect(equipmentBay).not.toBeNull();
    jest.spyOn(equipmentBay, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 1276,
      left: 100,
      right: 440,
      width: 340,
      height: 1176,
    });

    // Mousedown on drag handle (button 0 = left click)
    fireEvent.mouseDown(dragHandle, { clientX: 200, clientY: 716, button: 0 });

    // Drag mouse to U25
    // Top of U25 = (42 - 25) * 28 = 17 * 28 = 476px from equipment bay top
    // ClientY = 100 + 476 + 14 = 590
    fireEvent.mouseMove(window, { clientX: 200, clientY: 590 });

    // Ghost drop indicator should be rendered
    const ghost = document.querySelector('[data-drag-ghost="true"]');
    expect(ghost).not.toBeNull();
    expect(ghost).toHaveAttribute('data-target-u', '25');
    expect(ghost).toHaveAttribute('data-has-collision', 'false');
    expect(ghost).toHaveTextContent(/Move to U25/i);

    // Mouse up to complete drop
    await act(async () => {
      fireEvent.mouseUp(window);
    });

    // Expect updateDevice to have been called with device 501 and uPosition 25
    await waitFor(() => {
      expect(digitalTwinApi.updateDevice).toHaveBeenCalledWith(501, { uPosition: 25 });
    });
  });

  test('prevents drop and shows collision warning when target slot is occupied', async () => {
    renderWithChakra(<RoomCanvas roomId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Main Data Center/i)).toBeInTheDocument();
    });

    const dragHandle = document.querySelector(
      '[data-device-drag-handle="true"][data-device-id="501"]'
    );
    expect(dragHandle).not.toBeNull();

    const equipmentBay = document.getElementById('rack-equipment-bay-101');
    jest.spyOn(equipmentBay, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 1276,
      left: 100,
      right: 440,
      width: 340,
      height: 1176,
    });

    // Mousedown on drag handle
    fireEvent.mouseDown(dragHandle, { clientX: 200, clientY: 716, button: 0 });

    // Drag over U30 (occupied by Storage Server 01, which is at U30-U31)
    // Top of U30 = (42 - 30) * 28 = 12 * 28 = 336px
    // ClientY = 100 + 336 + 14 = 450
    fireEvent.mouseMove(window, { clientX: 200, clientY: 450 });

    const ghost = document.querySelector('[data-drag-ghost="true"]');
    expect(ghost).not.toBeNull();
    expect(ghost).toHaveAttribute('data-target-u', '30');
    expect(ghost).toHaveAttribute('data-has-collision', 'true');
    expect(ghost).toHaveTextContent(/Blocked by Storage Server 01/i);

    // Mouse up on colliding slot
    await act(async () => {
      fireEvent.mouseUp(window);
    });

    // Should NOT call updateDevice because of collision
    expect(digitalTwinApi.updateDevice).not.toHaveBeenCalled();
  });

  test('dragging device handle does not trigger canvas pan', async () => {
    renderWithChakra(<RoomCanvas roomId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Main Data Center/i)).toBeInTheDocument();
    });

    const viewport = screen.getByTestId('room-canvas-viewport');
    viewport.scrollLeft = 50;
    viewport.scrollTop = 50;

    const dragHandle = document.querySelector(
      '[data-device-drag-handle="true"][data-device-id="501"]'
    );
    expect(dragHandle).not.toBeNull();

    fireEvent.mouseDown(dragHandle, { clientX: 200, clientY: 716, button: 0 });
    fireEvent.mouseMove(window, { clientX: 100, clientY: 600 });

    // Viewport scroll must NOT be modified by device handle drag
    expect(viewport.scrollLeft).toBe(50);
    expect(viewport.scrollTop).toBe(50);

    fireEvent.mouseUp(window);
  });
});