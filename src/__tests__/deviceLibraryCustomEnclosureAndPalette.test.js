import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import DeviceLibraryModal, { getGroupPortNumber } from '../components/deviceLibrary/DeviceLibraryModal';

const renderWithChakra = (ui) => render(<ChakraProvider>{ui}</ChakraProvider>);

describe('DeviceLibraryModal - Custom Enclosures & Palette Drag-and-Drop', () => {
  const dummyTemplates = [
    {
      id: 1,
      manufacturer: 'Dell',
      model: 'PowerEdge M1000e',
      category: 'Enclosure',
      uHeight: 10,
      color: '#1A202C',
      isPreset: true,
      frontLayout: [],
      rearLayout: [],
      enclosureData: {
        type: 'modular_enclosure',
        totalBays: 16,
        frontBays: Array.from({ length: 16 }).map((_, i) => ({
          bayNumber: i + 1,
          occupied: false,
          blade: null,
        })),
        rearComponents: { fabricCount: 6, psuCount: 6, fanCount: 9, cmcCount: 2 }
      }
    }
  ];

  test('enclosure designer renders and selecting BigTwin preset configures horizontal sled layout', () => {
    renderWithChakra(
      <DeviceLibraryModal
        isOpen={true}
        onClose={jest.fn()}
        templates={dummyTemplates}
        allRacks={[{ id: 1, name: 'Rack 1', uHeight: 42 }]}
        targetRack={null}
        targetSlot={1}
      />
    );

    // Switch to '+ Create Custom Device' Tab
    const createTab = screen.getByRole('tab', { name: /\+ Create Custom Device/i });
    fireEvent.click(createTab);

    // Change Category to Enclosure
    const selects = screen.getAllByRole('combobox');
    const categorySelect = selects.find(s => Array.from(s.options).some(o => o.value === 'Enclosure'));
    fireEvent.change(categorySelect, { target: { value: 'Enclosure' } });

    // Verify Modular Enclosure controls appear
    expect(screen.getByText(/Chassis Template Preset:/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Modular Bays/i)).toBeInTheDocument();

    // Select Supermicro BigTwin preset using data-testid
    const presetSelect = screen.getByTestId('enclosure-preset-select');
    fireEvent.change(presetSelect, { target: { value: 'supermicro2u' } });

    // Verify Multi-Node Sled badge and 4 horizontal sleds are rendered in preview
    expect(screen.getByText(/4 Total Modular Bays/i)).toBeInTheDocument();
    expect(screen.getByText(/SLED 01/i)).toBeInTheDocument();
    expect(screen.getByText(/SLED 04/i)).toBeInTheDocument();
  });

  test('connector palette is visible in Freehand mode and dragging RJ45 retains copper type', () => {
    renderWithChakra(
      <DeviceLibraryModal
        isOpen={true}
        onClose={jest.fn()}
        templates={dummyTemplates}
        allRacks={[{ id: 1, name: 'Rack 1', uHeight: 42 }]}
        targetRack={null}
        targetSlot={1}
      />
    );

    // Switch to '+ Create Custom Device' Tab
    const createTab = screen.getByRole('tab', { name: /\+ Create Custom Device/i });
    fireEvent.click(createTab);

    // Switch to Freehand Place Mode
    const freehandBtn = screen.getByRole('button', { name: /Freehand Place Mode/i });
    fireEvent.click(freehandBtn);

    // Verify connector palette is present in Freehand mode
    expect(screen.getByRole('button', { name: /Copper \(RJ45\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SFP \/ SFP\+/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fiber \(LC\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Power \(C13\)/i })).toBeInTheDocument();

    // Select SFP+ first
    const sfpBtn = screen.getByRole('button', { name: /SFP \/ SFP\+/i });
    fireEvent.click(sfpBtn);

    // Now drag RJ45 button
    const rj45Btn = screen.getByRole('button', { name: /Copper \(RJ45\)/i });
    const dataTransfer = new window.DataTransfer();
    fireEvent.dragStart(rj45Btn, { dataTransfer });

    // Verify dragged connector data is 'rj45', not 'sfp_plus'
    expect(dataTransfer.getData('text/plain')).toBe('rj45');
  });

  describe('Port Group Numbering Layouts', () => {
    test('getGroupPortNumber correctly calculates port numbers for all standard equipment layouts', () => {
      const W = 12;
      const H = 2;

      // 1. Odd over Even (Standard Switch: 1,3,5.. / 2,4,6..)
      const oddOverEvenTop = Array.from({ length: W }).map((_, c) => getGroupPortNumber(0, c, W, H, 'columns'));
      const oddOverEvenBtm = Array.from({ length: W }).map((_, c) => getGroupPortNumber(1, c, W, H, 'columns'));
      expect(oddOverEvenTop).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23]);
      expect(oddOverEvenBtm).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]);

      // 2. Sequential by Row (Standard Patch Panel: 1-12 / 13-24)
      const seqTop = Array.from({ length: W }).map((_, c) => getGroupPortNumber(0, c, W, H, 'rows'));
      const seqBtm = Array.from({ length: W }).map((_, c) => getGroupPortNumber(1, c, W, H, 'rows'));
      expect(seqTop).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      expect(seqBtm).toEqual([13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);

      // 3. Even over Odd (Inverted Switch: 2,4,6.. / 1,3,5..)
      const evenOverOddTop = Array.from({ length: W }).map((_, c) => getGroupPortNumber(0, c, W, H, 'even-over-odd'));
      const evenOverOddBtm = Array.from({ length: W }).map((_, c) => getGroupPortNumber(1, c, W, H, 'even-over-odd'));
      expect(evenOverOddTop).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24]);
      expect(evenOverOddBtm).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23]);

      // 4. Bottom to Top Sequential (13-24 / 1-12)
      const btmToTopRow0 = Array.from({ length: W }).map((_, c) => getGroupPortNumber(0, c, W, H, 'bottom-to-top'));
      const btmToTopRow1 = Array.from({ length: W }).map((_, c) => getGroupPortNumber(1, c, W, H, 'bottom-to-top'));
      expect(btmToTopRow0).toEqual([13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
      expect(btmToTopRow1).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

      // 5. Single-row height (1U centered: 1..W)
      const singleRow = Array.from({ length: W }).map((_, c) => getGroupPortNumber(0, c, W, 1, 'columns'));
      expect(singleRow).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    test('Numbering layout selector updates Grid mode port numbering', () => {
      renderWithChakra(
        <DeviceLibraryModal
          isOpen={true}
          onClose={jest.fn()}
          templates={dummyTemplates}
          allRacks={[{ id: 1, name: 'Rack 1', uHeight: 42 }]}
          targetRack={null}
          targetSlot={1}
        />
      );

      // Switch to '+ Create Custom Device' Tab
      const createTab = screen.getByRole('tab', { name: /\+ Create Custom Device/i });
      fireEvent.click(createTab);

      // Default switch layout has 24x RJ45 with Odd-over-Even (01, 03... on top row)
      expect(screen.getByText('01')).toBeInTheDocument();
      expect(screen.getByText('03')).toBeInTheDocument();
      expect(screen.getByText('24')).toBeInTheDocument();

      // Find Numbering Layout Select
      const selects = screen.getAllByRole('combobox');
      const layoutSelect = selects.find(s =>
        Array.from(s.options).some(o => o.value === 'rows' && o.text.includes('Sequential'))
      );
      expect(layoutSelect).toBeDefined();

      // Change numbering layout to Sequential (rows)
      fireEvent.change(layoutSelect, { target: { value: 'rows' } });

      // Verify port 02 is now also present (Row 0: 01, 02, 03...)
      expect(screen.getByText('02')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });
  });
});
