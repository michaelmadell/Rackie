import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { PortSvg } from '../rack/PortGlyph';
import {
  MdAdd,
  MdArrowDropDown,
  MdCheck,
  MdContentCopy,
  MdDelete,
  MdDeveloperBoard,
  MdDevices,
  MdDragHandle,
  MdFitScreen,
  MdGridOn,
  MdGroupWork,
  MdLayersClear,
  MdPanTool,
  MdSearch,
  MdSwapHoriz,
} from 'react-icons/md';

const CATEGORIES = [
  'All',
  'Enclosure',
  'Switch',
  'Server',
  'Router',
  'Patch Panel',
  'Cable Management',
  'Power / UPS',
  'Workstation',
  'Accessory',
];

const CHASSIS_COLORS = [
  { name: 'Dark Slate', hex: '#1A202C' },
  { name: 'Graphite Navy', hex: '#1B2A4A' },
  { name: 'Brushed Silver', hex: '#CBD5E0' },
  { name: 'Matte Charcoal', hex: '#2D3748' },
  { name: 'Pitch Black', hex: '#0A0A0A' },
  { name: 'Teal Lab', hex: '#234E52' },
];

const CONNECTOR_PALETTE = [
  { label: 'Copper (RJ45)', type: 'rj45' },
  { label: 'SFP / SFP+', type: 'sfp_plus' },
  { label: 'Fiber (LC)', type: 'fiber_lc' },
  { label: 'USB-C', type: 'usb_c' },
  { label: 'USB-A', type: 'usb' },
  { label: 'HDMI', type: 'hdmi' },
  { label: 'DisplayPort', type: 'dp' },
  { label: 'Power (C14)', type: 'c14' },
  { label: 'Power (C13)', type: 'c13' },
  { label: 'Console', type: 'console' },
];

/**
 * Calculates port number based on row, column, dimensions, and chosen numbering layout.
 * Supports:
 * - 'columns' / 'odd-over-even': Odd on top (1, 3, 5...), Even on bottom (2, 4, 6...) [Switch Standard]
 * - 'rows' / 'sequential': Sequential by row (1..W on top, W+1..2W on bottom) [Patch Panel Standard]
 * - 'even-over-odd': Even on top (2, 4, 6...), Odd on bottom (1, 3, 5...) [Inverted Switch]
 * - 'bottom-to-top': Bottom row 1..W, Top row W+1..2W [Bottom-up Sequential]
 */
export function getGroupPortNumber(r, c, width, height, layout = 'columns') {
  if (height === 1) {
    return c + 1;
  }
  if (layout === 'rows' || layout === 'sequential') {
    return r * width + c + 1;
  }
  if (layout === 'even-over-odd') {
    if (height === 2) {
      return r === 0 ? c * 2 + 2 : c * 2 + 1;
    }
    return c * height + (height - 1 - r) + 1;
  }
  if (layout === 'bottom-to-top') {
    return (height - 1 - r) * width + c + 1;
  }
  // Default: 'columns' or 'odd-over-even'
  if (height === 2) {
    return r === 0 ? c * 2 + 1 : c * 2 + 2;
  }
  return c * height + r + 1;
}

export default function DeviceLibraryModal({
  isOpen,
  onClose,
  templates = [],
  allRacks = [],
  onSelectTemplateToMount,
  onCreateTemplate,
  targetRack = null,
  targetSlot = 1,
}) {
  const toast = useToast();
  const [selectedRackId, setSelectedRackId] = useState(
    targetRack?.id || (allRacks.length > 0 ? allRacks[0].id : null)
  );
  const [selectedSlotNum, setSelectedSlotNum] = useState(targetSlot || 1);

  useEffect(() => {
    if (targetRack) {
      setSelectedRackId(targetRack.id);
    } else if (allRacks.length > 0 && !selectedRackId) {
      setSelectedRackId(allRacks[0].id);
    }
    if (targetSlot) {
      setSelectedSlotNum(targetSlot);
    }
  }, [targetRack, targetSlot, allRacks, selectedRackId]);
  const gridContainerRef = useRef(null);
  const freehandCanvasRef = useRef(null);

  // Dragging states
  const [draggingGroupId, setDraggingGroupId] = useState(null);
  const [slotDragRange, setSlotDragRange] = useState(null);
  const [draggingFreehandPortId, setDraggingFreehandPortId] = useState(null);

  // Freehand Snapping Modes
  const [snapToSlotCenter, setSnapToSlotCenter] = useState(false);
  const [snapToMidlines, setSnapToMidlines] = useState(false);
  const [showGridGuides, setShowGridGuides] = useState(true);
  const [activeSnapGuideCoords, setActiveSnapGuideCoords] = useState(null);

  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Custom Device Form State
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [category, setCategory] = useState('Switch');
  const [uHeight, setUHeight] = useState(1);
  const [chassisColor, setChassisColor] = useState('#1A202C');

  // Modular Enclosure Builder State (when category === 'Enclosure')
  const [enclosurePreset, setEnclosurePreset] = useState('custom');
  const [enclosureBayOrientation, setEnclosureBayOrientation] = useState('vertical'); // 'vertical' or 'horizontal'
  const [enclosureRows, setEnclosureRows] = useState(2);
  const [enclosureCols, setEnclosureCols] = useState(8);
  const [enclosureFabricsCount, setEnclosureFabricsCount] = useState(6);
  const [enclosurePsusCount, setEnclosurePsusCount] = useState(6);
  const [enclosureFansCount, setEnclosureFansCount] = useState(9);
  const [enclosureCmcsCount, setEnclosureCmcsCount] = useState(2);

  const ENCLOSURE_PRESETS = [
    {
      id: 'custom',
      name: 'Custom Modular Enclosure',
      manufacturer: 'Generic OEM',
      model: 'Custom Enclosure',
      uHeight: 10,
      orientation: 'vertical',
      rows: 2,
      cols: 8,
      fabrics: 6,
      psus: 6,
      fans: 9,
      cmcs: 2,
      color: '#1A202C',
    },
    {
      id: 'm1000e',
      name: 'Dell PowerEdge M1000e (10U — 16 Vertical Blades: 2×8)',
      manufacturer: 'Dell',
      model: 'PowerEdge M1000e',
      uHeight: 10,
      orientation: 'vertical',
      rows: 2,
      cols: 8,
      fabrics: 6,
      psus: 6,
      fans: 9,
      cmcs: 2,
      color: '#1A202C',
    },
    {
      id: 'c7000',
      name: 'HPE BladeSystem c7000 (10U — 16 Vertical Blades: 2×8)',
      manufacturer: 'HPE',
      model: 'BladeSystem c7000',
      uHeight: 10,
      orientation: 'vertical',
      rows: 2,
      cols: 8,
      fabrics: 8,
      psus: 6,
      fans: 10,
      cmcs: 2,
      color: '#232B3E',
    },
    {
      id: 'ucs5108',
      name: 'Cisco UCS 5108 (6U — 8 Vertical Blades: 1×8)',
      manufacturer: 'Cisco',
      model: 'UCS 5108 Blade Chassis',
      uHeight: 6,
      orientation: 'vertical',
      rows: 1,
      cols: 8,
      fabrics: 2,
      psus: 4,
      fans: 8,
      cmcs: 2,
      color: '#1E293B',
    },
    {
      id: 'mx7000',
      name: 'Dell PowerEdge MX7000 (7U — 8 Modular Sleds: 2×4)',
      manufacturer: 'Dell',
      model: 'PowerEdge MX7000',
      uHeight: 7,
      orientation: 'horizontal',
      rows: 2,
      cols: 4,
      fabrics: 6,
      psus: 6,
      fans: 9,
      cmcs: 2,
      color: '#1A202C',
    },
    {
      id: 'supermicro2u',
      name: 'Supermicro 2U BigTwin (2U — 4 Horizontal Sleds: 2×2)',
      manufacturer: 'Supermicro',
      model: 'BigTwin 2029BT',
      uHeight: 2,
      orientation: 'horizontal',
      rows: 2,
      cols: 2,
      fabrics: 0,
      psus: 2,
      fans: 4,
      cmcs: 1,
      color: '#2D3748',
    },
    {
      id: 'twin1u',
      name: '1U Dual-Node Sled (1U — 2 Horizontal Sleds: 1×2)',
      manufacturer: 'Supermicro',
      model: 'Twin 1029TP',
      uHeight: 1,
      orientation: 'horizontal',
      rows: 1,
      cols: 2,
      fabrics: 0,
      psus: 2,
      fans: 4,
      cmcs: 1,
      color: '#2D3748',
    },
    {
      id: 'microblade3u',
      name: 'Supermicro MicroBlade (3U — 14 Vertical Blades: 1×14)',
      manufacturer: 'Supermicro',
      model: 'MicroBlade MBE-314E',
      uHeight: 3,
      orientation: 'vertical',
      rows: 1,
      cols: 14,
      fabrics: 2,
      psus: 4,
      fans: 8,
      cmcs: 2,
      color: '#1A202C',
    },
  ];

  const handleApplyEnclosurePreset = (presetId) => {
    setEnclosurePreset(presetId);
    const p = ENCLOSURE_PRESETS.find((ep) => ep.id === presetId);
    if (!p) return;
    if (presetId !== 'custom') {
      setManufacturer(p.manufacturer);
      setModel(p.model);
    }
    setUHeight(p.uHeight);
    setEnclosureBayOrientation(p.orientation);
    setEnclosureRows(p.rows);
    setEnclosureCols(p.cols);
    setEnclosureFabricsCount(p.fabrics);
    setEnclosurePsusCount(p.psus);
    setEnclosureFansCount(p.fans);
    setEnclosureCmcsCount(p.cmcs);
    setChassisColor(p.color);
  };

  // Mode: 'grid' (Patchdocs 28x2 per U) vs 'freehand'
  const [placementMode, setPlacementMode] = useState('grid');
  const [activeFaceTab, setActiveFaceTab] = useState('front');

  // Active connector selected in the palette
  const [activeConnectorType, setActiveConnectorType] = useState('rj45');

  // Patchdocs 28x2 Grid Groups State
  const [frontGridGroups, setFrontGridGroups] = useState([
    {
      id: 'fg-1',
      type: 'rj45',
      startX: 3, // Column 3 (1-based, out of 28)
      startY: 1, // Row 1 (1-based, out of totalRows = uHeight * 2)
      width: 12, // 12 columns wide
      height: 2, // 2 rows high (12x2 = 24 ports)
      prefix: '',
      countingDirection: 'columns', // 'columns' (odd-over-even) or 'rows'
    },
    {
      id: 'fg-2',
      type: 'sfp_plus',
      startX: 24,
      startY: 1,
      width: 2,
      height: 1, // Single-high: centered between each row!
      prefix: 'SFP',
      countingDirection: 'columns',
    },
  ]);

  const [rearGridGroups, setRearGridGroups] = useState([]);

  const [selectedGroupId, setSelectedGroupId] = useState('fg-1');

  // Freehand Mode State
  const [frontFreehandPorts, setFrontFreehandPorts] = useState([
    { id: 'f-1', name: '01', type: 'rj45', posX: 0.0893, posY: 0.25, width: 14, height: 11, orientation: 'top', face: 'front', groupId: 'fh-g-1', groupName: '4x RJ45' },
    { id: 'f-2', name: '02', type: 'rj45', posX: 0.0893, posY: 0.75, width: 14, height: 11, orientation: 'bottom', face: 'front', groupId: 'fh-g-1', groupName: '4x RJ45' },
    { id: 'f-3', name: '03', type: 'rj45', posX: 0.125, posY: 0.25, width: 14, height: 11, orientation: 'top', face: 'front', groupId: 'fh-g-1', groupName: '4x RJ45' },
    { id: 'f-4', name: '04', type: 'rj45', posX: 0.125, posY: 0.75, width: 14, height: 11, orientation: 'bottom', face: 'front', groupId: 'fh-g-1', groupName: '4x RJ45' },
    { id: 'f-5', name: 'SFP01', type: 'sfp_plus', posX: 0.8393, posY: 0.5, width: 16, height: 12, orientation: 'top', face: 'front', groupId: 'fh-g-2', groupName: '2x SFP+' },
    { id: 'f-6', name: 'SFP02', type: 'sfp_plus', posX: 0.875, posY: 0.5, width: 16, height: 12, orientation: 'top', face: 'front', groupId: 'fh-g-2', groupName: '2x SFP+' },
  ]);
  const [rearFreehandPorts, setRearFreehandPorts] = useState([]);
  const [selectedFreehandPortId, setSelectedFreehandPortId] = useState(null);
  const [selectedFreehandPortIds, setSelectedFreehandPortIds] = useState([]);
  const [selectedFreehandGroupId, setSelectedFreehandGroupId] = useState(null);

  // Active Grid Groups Accessor
  const currentGridGroups = activeFaceTab === 'front' ? frontGridGroups : rearGridGroups;
  const setCurrentGridGroups = (newGroups) => {
    if (activeFaceTab === 'front') {
      setFrontGridGroups(newGroups);
    } else {
      setRearGridGroups(newGroups);
    }
  };

  const selectedGroup = currentGridGroups.find((g) => g.id === selectedGroupId);

  // Active Freehand Ports Accessor
  const currentFreehandPorts = activeFaceTab === 'front' ? frontFreehandPorts : rearFreehandPorts;
  const setCurrentFreehandPorts = (newPorts) => {
    if (activeFaceTab === 'front') {
      setFrontFreehandPorts(newPorts);
    } else {
      setRearFreehandPorts(newPorts);
    }
  };
  const selectedFreehandPort =
    currentFreehandPorts.find((p) => p.id === selectedFreehandPortId) ||
    currentFreehandPorts.find((p) => selectedFreehandPortIds.includes(p.id));

  // Derive active freehand port groups
  const freehandGroups = useMemo(() => {
    const groupMap = {};
    currentFreehandPorts.forEach((port) => {
      if (port.groupId) {
        if (!groupMap[port.groupId]) {
          groupMap[port.groupId] = {
            id: port.groupId,
            name: port.groupName || `${port.type.toUpperCase()} Group`,
            ports: [],
          };
        }
        groupMap[port.groupId].ports.push(port);
      }
    });
    return Object.values(groupMap);
  }, [currentFreehandPorts]);

  // Total grid rows = uHeight * 2 (e.g. 1U = 2 rows, 2U = 4 rows)
  const totalRows = uHeight * 2;

  const modalBg = useColorModeValue('white', 'navy.800');
  const cardBg = useColorModeValue('secondaryGray.200', 'navy.700');
  const cardBorder = useColorModeValue('secondaryGray.400', 'whiteAlpha.100');
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const textMuted = useColorModeValue('secondaryGray.600', 'whiteAlpha.600');

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    const matchCat = selectedCategory === 'All' || t.category === selectedCategory;
    const matchSearch =
      !searchQuery ||
      t.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.model.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // Update selected group fields
  const updateGroup = (groupId, fields) => {
    setCurrentGridGroups(
      currentGridGroups.map((g) => (g.id === groupId ? { ...g, ...fields } : g))
    );
  };

  // Add new group to the 28x2 grid
  const handleAddGroupToGrid = (targetCol = 1, targetRow = 1, explicitType = null) => {
    const typeToUse = explicitType || activeConnectorType;
    const nextId = `${activeFaceTab}-g-${Date.now()}`;
    const newGroup = {
      id: nextId,
      type: typeToUse,
      startX: Math.max(1, Math.min(28, targetCol)),
      startY: Math.max(1, Math.min(totalRows, targetRow)),
      width: 1,
      height: 1, // Starts as single-high (centered between rows)
      prefix: typeToUse === 'sfp_plus' ? 'SFP' : '',
      countingDirection: 'columns',
    };

    setCurrentGridGroups([...currentGridGroups, newGroup]);
    setSelectedGroupId(nextId);
    toast({
      title: `Added ${typeToUse.toUpperCase()} port to Grid (Col ${newGroup.startX})`,
      description: 'Drag right/bottom handles or use buttons to expand.',
      status: 'info',
      duration: 2000,
    });
  };

  // Delete selected group
  const handleDeleteSelectedGroup = () => {
    if (!selectedGroupId) return;
    const remaining = currentGridGroups.filter((g) => g.id !== selectedGroupId);
    setCurrentGridGroups(remaining);
    setSelectedGroupId(remaining[0]?.id || null);
  };

  // Duplicate selected group
  const handleDuplicateSelectedGroup = () => {
    if (!selectedGroup) return;
    const nextCol = Math.min(28, selectedGroup.startX + selectedGroup.width + 1);
    const duplicated = {
      ...selectedGroup,
      id: `${activeFaceTab}-g-${Date.now()}`,
      startX: nextCol,
    };
    setCurrentGridGroups([...currentGridGroups, duplicated]);
    setSelectedGroupId(duplicated.id);
  };

  // Preset Layout Applications
  const applyPresetLayout = (presetName) => {
    if (presetName === 'switch24') {
      setUHeight(1);
      setCurrentGridGroups([
        { id: `g-sw24-1`, type: 'rj45', startX: 3, startY: 1, width: 12, height: 2, prefix: '', countingDirection: 'columns' },
        { id: `g-sw24-2`, type: 'sfp_plus', startX: 24, startY: 1, width: 2, height: 1, prefix: 'SFP', countingDirection: 'columns' },
      ]);
      setSelectedGroupId(`g-sw24-1`);
    } else if (presetName === 'switch48') {
      setUHeight(1);
      setCurrentGridGroups([
        { id: `g-sw48-1`, type: 'rj45', startX: 1, startY: 1, width: 24, height: 2, prefix: '', countingDirection: 'columns' },
        { id: `g-sw48-2`, type: 'sfp_plus', startX: 25, startY: 1, width: 4, height: 1, prefix: 'SFP', countingDirection: 'columns' },
      ]);
      setSelectedGroupId(`g-sw48-1`);
    } else if (presetName === 'patch24') {
      setUHeight(1);
      setCurrentGridGroups([
        { id: `g-pp24`, type: 'rj45', startX: 3, startY: 1, width: 24, height: 1, prefix: '', countingDirection: 'rows' },
      ]);
      setSelectedGroupId(`g-pp24`);
    } else if (presetName === 'clear') {
      setCurrentGridGroups([]);
      setSelectedGroupId(null);
    }
  };

  // Convert current face's Patchdocs 28x2 Grid groups into individual Freehand ports
  const handleConvertGridToFreehand = () => {
    const groups = activeFaceTab === 'front' ? frontGridGroups : rearGridGroups;
    if (!groups || groups.length === 0) {
      toast({
        title: 'No Grid Groups to Convert',
        description: 'Add some port groups in Grid Mode first, or use presets.',
        status: 'info',
        duration: 2000,
      });
      return;
    }

    const newFreehandPorts = [];
    groups.forEach((group) => {
      const totalGroupPorts = group.width * group.height;
      const isSingleHigh = group.height === 1;
      const fhGroupId = `fh-g-${group.id}`;
      const groupName = `${totalGroupPorts}x ${group.type.toUpperCase()}`;

      for (let r = 0; r < group.height; r++) {
        for (let c = 0; c < group.width; c++) {
          const portNumber = getGroupPortNumber(
            r,
            c,
            group.width,
            group.height,
            group.countingDirection
          );

          const colNum = group.startX + c;
          const rowNum = (group.startY || 1) + r;
          const posX = Number(((colNum - 0.5) / 28).toFixed(4));
          const posY = isSingleHigh ? 0.5 : Number(((rowNum - 0.5) / totalRows).toFixed(4));
          const isTopRow = isSingleHigh || r % 2 === 0;
          const orientation = isTopRow ? 'top' : 'bottom';
          const portName = `${group.prefix || ''}${portNumber < 10 && !group.prefix ? '0' : ''}${portNumber}`;

          newFreehandPorts.push({
            id: `${activeFaceTab}-fh-${group.id}-${r}-${c}-${Date.now()}`,
            name: portName,
            type: group.type,
            posX,
            posY,
            width: 14,
            height: 11,
            orientation,
            face: activeFaceTab,
            groupId: fhGroupId,
            groupName,
          });
        }
      }
    });

    if (newFreehandPorts.length > 0) {
      setCurrentFreehandPorts(newFreehandPorts);
      setSelectedFreehandPortId(newFreehandPorts[0].id);
      setSelectedFreehandPortIds(newFreehandPorts.map((p) => p.id));
      setSelectedFreehandGroupId(newFreehandPorts[0].groupId);
      toast({
        title: `Converted ${newFreehandPorts.length} Ports to Freehand`,
        description: 'All ports are positioned on the 28×2 grid with group borders preserved.',
        status: 'success',
        duration: 2500,
      });
    }
  };

  // Create a Port Group from CTRL+Clicked / selected freehand ports
  const handleCreateGroupFromSelection = (customName) => {
    const targetIds =
      selectedFreehandPortIds.length > 0
        ? selectedFreehandPortIds
        : selectedFreehandPortId
        ? [selectedFreehandPortId]
        : [];

    if (targetIds.length === 0) {
      toast({
        title: 'No Ports Selected',
        description: 'Hold CTRL and click ports to select them first, then click Create Group.',
        status: 'info',
        duration: 2500,
      });
      return;
    }

    const newGroupId = `fh-g-${Date.now()}`;
    const selectedPorts = currentFreehandPorts.filter((p) => targetIds.includes(p.id));
    const firstType = selectedPorts[0]?.type || activeConnectorType;
    const groupName = customName || `${selectedPorts.length}x ${firstType.toUpperCase()}`;

    setCurrentFreehandPorts(
      currentFreehandPorts.map((p) =>
        targetIds.includes(p.id)
          ? { ...p, groupId: newGroupId, groupName }
          : p
      )
    );
    setSelectedFreehandGroupId(newGroupId);
    setSelectedFreehandPortIds(targetIds);
    toast({
      title: `Created Port Group (${selectedPorts.length} Ports)`,
      description: `Ports are now linked together with a group border (${groupName}).`,
      status: 'success',
      duration: 2500,
    });
  };

  // Ungroup selected freehand ports
  const handleUngroupSelected = () => {
    const groupIdsToDissolve = new Set();
    if (selectedFreehandGroupId) {
      groupIdsToDissolve.add(selectedFreehandGroupId);
    }
    const targetIds =
      selectedFreehandPortIds.length > 0
        ? selectedFreehandPortIds
        : selectedFreehandPortId
        ? [selectedFreehandPortId]
        : [];

    currentFreehandPorts
      .filter((p) => targetIds.includes(p.id) && p.groupId)
      .forEach((p) => groupIdsToDissolve.add(p.groupId));

    if (groupIdsToDissolve.size === 0) return;

    setCurrentFreehandPorts(
      currentFreehandPorts.map((p) =>
        groupIdsToDissolve.has(p.groupId)
          ? { ...p, groupId: null, groupName: null }
          : p
      )
    );
    setSelectedFreehandGroupId(null);
    toast({
      title: 'Ports Ungrouped',
      description: 'Ports are now standalone and can be moved individually.',
      status: 'info',
      duration: 2000,
    });
  };

  // Add a new port group directly to the freehand canvas
  const handleAddFreehandGroup = (count = 4, rows = 1, type = activeConnectorType) => {
    const cols = Math.ceil(count / rows);

    // Find starting column where it fits
    const occupiedCols = new Set(
      currentFreehandPorts.map((p) => Math.max(1, Math.min(28, Math.round(p.posX * 28 + 0.5))))
    );
    let startCol = 1;
    for (let c = 1; c <= 28 - cols + 1; c++) {
      let isClear = true;
      for (let offset = 0; offset < cols; offset++) {
        if (occupiedCols.has(c + offset)) {
          isClear = false;
          break;
        }
      }
      if (isClear) {
        startCol = c;
        break;
      }
    }

    const newGroupId = `fh-g-${Date.now()}`;
    const groupName = `${count}x ${type.toUpperCase()}`;
    const newPorts = [];
    const existingCount = currentFreehandPorts.length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let localNum;
        if (rows === 2) {
          localNum = r === 0 ? c * 2 + 1 : c * 2 + 2;
        } else {
          localNum = r * cols + c + 1;
        }
        if (localNum > count) continue;

        const colNum = startCol + c;
        const posX = Number(((colNum - 0.5) / 28).toFixed(4));
        let posY;
        if (rows === 1) {
          posY = 0.5;
        } else {
          posY = Number(((r + 0.5) / totalRows).toFixed(4));
        }

        const isTopRow = rows === 1 || r % 2 === 0;
        const orientation = isTopRow ? 'top' : 'bottom';
        const portNum = existingCount + localNum;
        const portName = `${portNum < 10 ? '0' : ''}${portNum}`;

        newPorts.push({
          id: `${activeFaceTab}-fh-${newGroupId}-${r}-${c}`,
          name: portName,
          type,
          posX,
          posY,
          width: 14,
          height: 11,
          orientation,
          face: activeFaceTab,
          groupId: newGroupId,
          groupName,
        });
      }
    }

    setCurrentFreehandPorts([...currentFreehandPorts, ...newPorts]);
    setSelectedFreehandPortIds(newPorts.map((p) => p.id));
    setSelectedFreehandPortId(newPorts[0]?.id || null);
    setSelectedFreehandGroupId(newGroupId);

    toast({
      title: `Added ${groupName} (${cols}×${rows})`,
      description: `Positioned at Cols ${startCol}–${startCol + cols - 1} on the 28×2 grid.`,
      status: 'success',
      duration: 2500,
    });
  };

  // Drag Freehand Group Border (moves all ports in group together)
  const handleFreehandGroupDragStart = (e, group) => {
    e.stopPropagation();
    const canvasElem = freehandCanvasRef.current;
    if (!canvasElem) return;

    const rect = canvasElem.getBoundingClientRect();
    const startClientX = e.clientX;
    const startClientY = e.clientY;

    const initialPositions = group.ports.map((p) => ({
      id: p.id,
      posX: p.posX,
      posY: p.posY,
    }));

    setSelectedFreehandGroupId(group.id);
    setSelectedFreehandPortIds(group.ports.map((p) => p.id));
    setSelectedFreehandPortId(group.ports[0]?.id || null);

    let hasDragged = false;

    const onPointerMove = (moveEvt) => {
      const deltaX = moveEvt.clientX - startClientX;
      const deltaY = moveEvt.clientY - startClientY;

      if (!hasDragged && Math.hypot(deltaX, deltaY) > 2) {
        hasDragged = true;
      }

      if (hasDragged) {
        const deltaFracX = deltaX / rect.width;
        const deltaFracY = deltaY / rect.height;

        const anchorInitial = initialPositions[0];
        const rawAnchorX = anchorInitial.posX + deltaFracX;
        const rawAnchorY = anchorInitial.posY + deltaFracY;

        let effectiveDeltaX = deltaFracX;
        let effectiveDeltaY = deltaFracY;

        if (snapToSlotCenter || snapToMidlines) {
          const snappedAnchor = getSnappedCoords(rawAnchorX, rawAnchorY, snapToSlotCenter, snapToMidlines);
          effectiveDeltaX = snappedAnchor.posX - anchorInitial.posX;
          effectiveDeltaY = snappedAnchor.posY - anchorInitial.posY;

          setActiveSnapGuideCoords({
            x: snappedAnchor.posX,
            y: snappedAnchor.posY,
            isSlot: snapToSlotCenter,
            isMid: snapToMidlines,
          });
        }

        const updatedPorts = currentFreehandPorts.map((p) => {
          const init = initialPositions.find((ip) => ip.id === p.id);
          if (!init) return p;
          const nextPosX = Number(Math.max(0.01, Math.min(0.99, init.posX + effectiveDeltaX)).toFixed(4));
          const nextPosY = Number(Math.max(0.02, Math.min(0.98, init.posY + effectiveDeltaY)).toFixed(4));
          return { ...p, posX: nextPosX, posY: nextPosY };
        });

        setCurrentFreehandPorts(updatedPorts);
      }
    };

    const onPointerUp = () => {
      setActiveSnapGuideCoords(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Drag Handle 1: Horizontal Expand/Contract (Right border)
  const handleResizeRightStart = (e, group) => {
    e.stopPropagation();
    const startClientX = e.clientX;
    const initialWidth = group.width;
    const gridElem = gridContainerRef.current;
    if (!gridElem) return;

    // 28 columns in the equipment bay
    const rect = gridElem.getBoundingClientRect();
    const equipmentBayWidth = rect.width - 56; // minus left ear (28px) and right ear (28px)
    const colWidth = equipmentBayWidth / 28;

    const onPointerMove = (moveEvt) => {
      const deltaX = moveEvt.clientX - startClientX;
      const colsDelta = Math.round(deltaX / colWidth);
      const maxCols = 28 - group.startX + 1;
      const newW = Math.max(1, Math.min(maxCols, initialWidth + colsDelta));
      updateGroup(group.id, { width: newW });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Drag Handle 2: Vertical Expand/Contract (Bottom border)
  const handleResizeDownStart = (e, group) => {
    e.stopPropagation();
    const startClientY = e.clientY;
    const initialHeight = group.height;
    const rowHeight = 36;

    const onPointerMove = (moveEvt) => {
      const deltaY = moveEvt.clientY - startClientY;
      const rowsDelta = Math.round(deltaY / rowHeight);
      const maxRows = totalRows - group.startY + 1;
      const newH = Math.max(1, Math.min(maxRows, initialHeight + rowsDelta));
      updateGroup(group.id, { height: newH });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // CLICK-AND-DRAG 1: Move Port Group across 28x2 Grid
  const handleGroupDragStart = (e, group) => {
    // If clicking on resize handle or interactive controls, ignore
    if (
      e.target.closest('[title*="expand"]') ||
      e.target.closest('[data-resize-handle="true"]') ||
      e.target.closest('button')
    ) {
      return;
    }
    e.stopPropagation();

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const initialStartX = group.startX;
    const initialStartY = group.startY || 1;
    const initialWidth = group.width;
    const initialHeight = group.height;

    const gridElem = gridContainerRef.current;
    if (!gridElem) return;

    const rect = gridElem.getBoundingClientRect();
    const equipmentBayWidth = rect.width - 56;
    const colWidth = equipmentBayWidth / 28;
    const rowHeight = rect.height / totalRows;

    let hasDragged = false;

    const onPointerMove = (moveEvt) => {
      const deltaX = moveEvt.clientX - startClientX;
      const deltaY = moveEvt.clientY - startClientY;

      if (!hasDragged && Math.hypot(deltaX, deltaY) > 3) {
        hasDragged = true;
        setDraggingGroupId(group.id);
        setSelectedGroupId(group.id);
      }

      if (hasDragged) {
        const colsDelta = Math.round(deltaX / colWidth);
        const maxStartX = 28 - initialWidth + 1;
        const newStartX = Math.max(1, Math.min(maxStartX, initialStartX + colsDelta));

        let newStartY = initialStartY;
        if (group.height < totalRows) {
          const rowsDelta = Math.round(deltaY / rowHeight);
          const maxStartY = totalRows - initialHeight + 1;
          newStartY = Math.max(1, Math.min(maxStartY, initialStartY + rowsDelta));
        }

        updateGroup(group.id, { startX: newStartX, startY: newStartY });
      }
    };

    const onPointerUp = () => {
      if (!hasDragged) {
        setSelectedGroupId(group.id);
      }
      setDraggingGroupId(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // CLICK-AND-DRAG 2: Drag Across Empty Grid Slots to Create a Port Group
  const handleSlotPointerDown = (e, col, row) => {
    e.stopPropagation();
    const startCol = col;
    const startRow = row;
    let currentRange = { startCol, startRow, endCol: col, endRow: row };
    let hasMoved = false;

    const gridElem = gridContainerRef.current;
    if (!gridElem) return;

    const rect = gridElem.getBoundingClientRect();
    const bayLeft = rect.left + 28;
    const bayWidth = rect.width - 56;
    const colWidth = bayWidth / 28;
    const rowHeight = rect.height / totalRows;

    const onPointerMove = (moveEvt) => {
      const relX = moveEvt.clientX - bayLeft;
      const relY = moveEvt.clientY - rect.top;

      const hoverCol = Math.max(1, Math.min(28, Math.floor(relX / colWidth) + 1));
      const hoverRow = Math.max(1, Math.min(totalRows, Math.floor(relY / rowHeight) + 1));

      if (hoverCol !== startCol || hoverRow !== startRow) {
        hasMoved = true;
      }

      currentRange = { startCol, startRow, endCol: hoverCol, endRow: hoverRow };
      setSlotDragRange({ ...currentRange });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setSlotDragRange(null);

      if (hasMoved && currentRange) {
        const minCol = Math.min(currentRange.startCol, currentRange.endCol);
        const maxCol = Math.max(currentRange.startCol, currentRange.endCol);
        const minRow = Math.min(currentRange.startRow, currentRange.endRow);
        const maxRow = Math.max(currentRange.startRow, currentRange.endRow);
        const width = maxCol - minCol + 1;
        const height = maxRow - minRow + 1;

        const nextId = `${activeFaceTab}-g-${Date.now()}`;
        const newGroup = {
          id: nextId,
          type: activeConnectorType,
          startX: minCol,
          startY: minRow,
          width,
          height,
          prefix: activeConnectorType === 'sfp_plus' ? 'SFP' : '',
          countingDirection: 'columns',
        };
        setCurrentGridGroups([...currentGridGroups, newGroup]);
        setSelectedGroupId(nextId);
        toast({
          title: `Created ${width * height}x ${activeConnectorType.toUpperCase()} Group (${width}×${height})`,
          description: `Positioned at Cols ${minCol}–${maxCol}, Row ${minRow}`,
          status: 'success',
          duration: 2500,
        });
      } else {
        handleAddGroupToGrid(startCol, startRow);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // SNAPPING FUNCTION FOR FREEHAND COORDINATES
  const getSnappedCoords = (rawX, rawY, snapSlots = snapToSlotCenter, snapMids = snapToMidlines) => {
    let finalX = rawX;
    let finalY = rawY;

    if (snapSlots && !snapMids) {
      // 1. Center in Slot (28 columns x totalRows grid from grid mode)
      // Slot center X = (col - 0.5) / 28
      const col = Math.max(1, Math.min(28, Math.floor(rawX * 28) + 1));
      finalX = Number(((col - 0.5) / 28).toFixed(4));

      // Row slot centers: for 1U (totalRows = 2), Row 1 is 0.25, Row 2 is 0.75
      // If close to center (0.50), allow snapping to 0.50 (single-high centered)
      if (Math.abs(rawY - 0.5) < 0.08) {
        finalY = 0.5;
      } else {
        const row = Math.max(1, Math.min(totalRows, Math.floor(rawY * totalRows) + 1));
        finalY = Number(((row - 0.5) / totalRows).toFixed(4));
      }
    } else if (snapMids && !snapSlots) {
      // 2. Midlines between rows and columns
      // Column midlines/dividers: c / 28 (c in 1..27)
      const colDiv = Math.max(1, Math.min(27, Math.round(rawX * 28)));
      finalX = Number((colDiv / 28).toFixed(4));

      // Row midlines/dividers: for 1U, the midline between Row 1 and Row 2 is 0.50
      const rowDiv = Math.max(1, Math.min(totalRows - 1, Math.round(rawY * totalRows)));
      finalY = Number((rowDiv / totalRows).toFixed(4));
    } else if (snapSlots && snapMids) {
      // Both active: compare distance to nearest slot center vs nearest midline
      const colSlot = Math.max(1, Math.min(28, Math.floor(rawX * 28) + 1));
      const slotX = Number(((colSlot - 0.5) / 28).toFixed(4));
      const colMid = Math.max(1, Math.min(27, Math.round(rawX * 28)));
      const midX = Number((colMid / 28).toFixed(4));
      finalX = Math.abs(rawX - slotX) <= Math.abs(rawX - midX) ? slotX : midX;

      const rowSlot = Math.max(1, Math.min(totalRows, Math.floor(rawY * totalRows) + 1));
      const slotY = Number(((rowSlot - 0.5) / totalRows).toFixed(4));
      const rowMid = Math.max(1, Math.min(totalRows - 1, Math.round(rawY * totalRows)));
      const midY = Number((rowMid / totalRows).toFixed(4));
      finalY = Math.abs(rawY - slotY) <= Math.abs(rawY - midY) ? slotY : midY;
    }

    return {
      posX: Number(Math.max(0.01, Math.min(0.99, finalX)).toFixed(4)),
      posY: Number(Math.max(0.02, Math.min(0.98, finalY)).toFixed(4)),
    };
  };

  // CLICK-AND-DRAG 3: Move Ports on Freehand Canvas with Multi-Selection & Port Grouping
  const handleFreehandPortDragStart = (e, port) => {
    e.stopPropagation();
    const canvasElem = freehandCanvasRef.current;
    if (!canvasElem) return;

    const isMultiKey = e.ctrlKey || e.metaKey || e.shiftKey;

    if (isMultiKey) {
      // Toggle selection on CTRL+Click
      const isAlreadySelected = selectedFreehandPortIds.includes(port.id);
      const nextSelected = isAlreadySelected
        ? selectedFreehandPortIds.filter((id) => id !== port.id)
        : [...selectedFreehandPortIds, port.id];
      setSelectedFreehandPortIds(nextSelected);
      setSelectedFreehandPortId(nextSelected[0] || null);
      if (port.groupId) {
        setSelectedFreehandGroupId(port.groupId);
      }
      return;
    }

    // Determine affected ports for dragging
    let affectedPorts;
    if (selectedFreehandPortIds.includes(port.id) && selectedFreehandPortIds.length > 1) {
      // Dragging a multi-selection of ports
      affectedPorts = currentFreehandPorts.filter((p) => selectedFreehandPortIds.includes(p.id));
    } else if (port.groupId && !e.altKey) {
      // Dragging a port that belongs to a group -> move all ports in this group!
      affectedPorts = currentFreehandPorts.filter((p) => p.groupId === port.groupId);
      setSelectedFreehandGroupId(port.groupId);
      setSelectedFreehandPortIds(affectedPorts.map((p) => p.id));
      setSelectedFreehandPortId(port.id);
    } else {
      // Single port drag
      affectedPorts = [port];
      setSelectedFreehandPortIds([port.id]);
      setSelectedFreehandPortId(port.id);
      setSelectedFreehandGroupId(port.groupId || null);
    }

    const rect = canvasElem.getBoundingClientRect();
    const startClientX = e.clientX;
    const startClientY = e.clientY;

    const initialPositions = affectedPorts.map((p) => ({
      id: p.id,
      posX: p.posX,
      posY: p.posY,
    }));

    const anchorInitial = initialPositions.find((ip) => ip.id === port.id) || initialPositions[0];

    let hasDragged = false;

    const onPointerMove = (moveEvt) => {
      const deltaX = moveEvt.clientX - startClientX;
      const deltaY = moveEvt.clientY - startClientY;

      if (!hasDragged && Math.hypot(deltaX, deltaY) > 2) {
        hasDragged = true;
        setDraggingFreehandPortId(port.id);
      }

      if (hasDragged) {
        const deltaFracX = deltaX / rect.width;
        const deltaFracY = deltaY / rect.height;

        let effectiveDeltaX = deltaFracX;
        let effectiveDeltaY = deltaFracY;

        if (snapToSlotCenter || snapToMidlines) {
          const rawAnchorX = anchorInitial.posX + deltaFracX;
          const rawAnchorY = anchorInitial.posY + deltaFracY;
          const snappedAnchor = getSnappedCoords(rawAnchorX, rawAnchorY, snapToSlotCenter, snapToMidlines);
          effectiveDeltaX = snappedAnchor.posX - anchorInitial.posX;
          effectiveDeltaY = snappedAnchor.posY - anchorInitial.posY;

          setActiveSnapGuideCoords({
            x: snappedAnchor.posX,
            y: snappedAnchor.posY,
            isSlot: snapToSlotCenter,
            isMid: snapToMidlines,
          });
        }

        const updatedPorts = currentFreehandPorts.map((p) => {
          const init = initialPositions.find((ip) => ip.id === p.id);
          if (!init) return p;
          const nextPosX = Number(Math.max(0.01, Math.min(0.99, init.posX + effectiveDeltaX)).toFixed(4));
          const nextPosY = Number(Math.max(0.02, Math.min(0.98, init.posY + effectiveDeltaY)).toFixed(4));
          return { ...p, posX: nextPosX, posY: nextPosY };
        });

        setCurrentFreehandPorts(updatedPorts);
      }
    };

    const onPointerUp = () => {
      setDraggingFreehandPortId(null);
      setActiveSnapGuideCoords(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Save Custom Device Template
  const handleSaveCustomDevice = async () => {
    if (!manufacturer.trim() || !model.trim()) {
      toast({
        title: 'Manufacturer and Model are required',
        status: 'warning',
      });
      return;
    }

    try {
      if (category === 'Enclosure') {
        const totalBays = enclosureRows * enclosureCols;
        const frontBays = [];
        let bNum = 1;
        for (let r = 1; r <= enclosureRows; r++) {
          for (let c = 1; c <= enclosureCols; c++) {
            frontBays.push({
              bayNumber: bNum,
              row: r,
              col: c,
              orientation: enclosureBayOrientation,
              size: enclosureBayOrientation === 'vertical' ? 'half-height' : 'node-sled',
              occupied: false,
              blade: null,
            });
            bNum++;
          }
        }

        const rearLayout = [];
        // Generate rear fabric ports
        for (let f = 1; f <= enclosureFabricsCount; f++) {
          const letter = String.fromCharCode(64 + Math.ceil(f / 2));
          const num = ((f - 1) % 2) + 1;
          const fabName = `Fab-${letter}${num}`;
          rearLayout.push({
            namePrefix: `${fabName}-`,
            type: f <= 2 ? 'rj45' : 'sfp_plus',
            count: 8,
            rows: 2,
            layout: 'odd-over-even',
            startX: Number((0.04 + (f - 1) * 0.12).toFixed(4)),
            width: 0.1,
          });
        }
        // Generate CMC ports
        for (let cmc = 1; cmc <= enclosureCmcsCount; cmc++) {
          rearLayout.push({
            name: `CMC${cmc}-Mgmt`,
            face: 'rear',
            type: 'rj45',
            posX: Number((0.48 + cmc * 0.04).toFixed(4)),
            posY: 0.5,
            width: 14,
            height: 11,
          });
        }
        // Generate PSU power sockets
        for (let psu = 1; psu <= enclosurePsusCount; psu++) {
          rearLayout.push({
            name: `PSU-${psu}`,
            face: 'rear',
            type: 'c13',
            posX: Number((0.08 + (psu - 1) * 0.14).toFixed(4)),
            posY: 0.85,
            width: 14,
            height: 11,
          });
        }

        const enclosureData = {
          type: 'modular_enclosure',
          bayLayout: {
            rows: enclosureRows,
            cols: enclosureCols,
            orientation: enclosureBayOrientation,
          },
          frontBays,
          rearComponents: {
            fabricCount: enclosureFabricsCount,
            psuCount: enclosurePsusCount,
            fanCount: enclosureFansCount,
            cmcCount: enclosureCmcsCount,
          },
        };

        await onCreateTemplate({
          manufacturer: manufacturer.trim(),
          model: model.trim(),
          category: 'Enclosure',
          uHeight: Number(uHeight),
          color: chassisColor,
          frontLayout: [],
          rearLayout,
          enclosureData,
        });

        toast({
          title: `Custom Enclosure "${model}" saved!`,
          description: `${totalBays} ${enclosureBayOrientation === 'vertical' ? 'Blade' : 'Sled'} bays configured.`,
          status: 'success',
        });
        setActiveTab(0);
        return;
      }

      let finalFrontLayout, finalRearLayout;

      if (placementMode === 'grid') {
        // Convert Patchdocs 28x2 groups into template layout
        const convertGroups = (groups) =>
          groups.map((g) => ({
            namePrefix: g.prefix !== undefined ? g.prefix : 'Port ',
            type: g.type || 'rj45',
            count: g.width * g.height,
            rows: g.height,
            layout:
              g.countingDirection === 'rows'
                ? 'sequential'
                : g.countingDirection === 'columns'
                ? 'odd-over-even'
                : g.countingDirection || 'odd-over-even',
            startX: Number(((g.startX - 1) / 28).toFixed(4)),
            width: Number((g.width / 28).toFixed(4)),
            startXCol: g.startX,
            widthCols: g.width,
            startYRow: g.startY,
            heightRows: g.height,
            portWidth: 14,
            portHeight: 11,
            singleHighCentered: g.height === 1,
          }));

        finalFrontLayout = convertGroups(frontGridGroups);
        finalRearLayout = convertGroups(rearGridGroups);
      } else {
        finalFrontLayout = frontFreehandPorts;
        finalRearLayout = rearFreehandPorts;
      }

      await onCreateTemplate({
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        category,
        uHeight: Number(uHeight),
        color: chassisColor,
        frontLayout: finalFrontLayout,
        rearLayout: finalRearLayout,
      });

      toast({
        title: 'Device saved to library!',
        status: 'success',
      });

      setActiveTab(0);
    } catch (err) {
      toast({
        title: 'Failed to create template',
        description: err.message,
        status: 'error',
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent bg={modalBg} borderRadius="16px" overflow="hidden">
        <ModalHeader borderBottom="1px solid" borderColor={cardBorder} py="14px">
          <HStack justify="space-between" pr="30px" wrap="wrap" gap="10px">
            <HStack spacing="10px">
              <Icon as={MdDevices} w="24px" h="24px" color="brand.500" />
              <Text fontSize="lg" fontWeight="700" color={textColor}>
                Device Library
              </Text>
            </HStack>
            {allRacks.length > 0 ? (
              <HStack spacing="8px" bg="whiteAlpha.100" p="4px 10px" borderRadius="8px">
                <Text fontSize="xs" fontWeight="700" color="gray.400" textTransform="uppercase">
                  Target Rack:
                </Text>
                <Select
                  size="xs"
                  w="140px"
                  borderRadius="6px"
                  fontWeight="600"
                  data-testid="target-rack-select"
                  value={selectedRackId || ''}
                  onChange={(e) => setSelectedRackId(Number(e.target.value))}>
                  {allRacks.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.uHeight || 42}U)
                    </option>
                  ))}
                </Select>
                <Text fontSize="xs" fontWeight="700" color="gray.400" textTransform="uppercase">
                  Slot U:
                </Text>
                <Select
                  size="xs"
                  w="85px"
                  borderRadius="6px"
                  fontWeight="600"
                  data-testid="target-slot-select"
                  value={selectedSlotNum}
                  onChange={(e) => setSelectedSlotNum(Number(e.target.value))}>
                  {Array.from(
                    { length: allRacks.find((r) => r.id === selectedRackId)?.uHeight || 42 },
                    (_, i) => i + 1
                  ).map((u) => (
                    <option key={u} value={u}>
                      U{u}
                    </option>
                  ))}
                </Select>
              </HStack>
            ) : targetRack ? (
              <Badge colorScheme="brand" variant="subtle" fontSize="xs" px="8px" py="2px">
                Mounting target: {targetRack.name} (Slot U{targetSlot})
              </Badge>
            ) : null}
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody p="0">
          <Tabs index={activeTab} onChange={setActiveTab} isLazy colorScheme="brand">
            <TabList px="20px" pt="10px" borderBottom="1px solid" borderColor={cardBorder}>
              <Tab fontWeight="600" fontSize="sm">
                Browse Library ({templates.length})
              </Tab>
              <Tab fontWeight="600" fontSize="sm">
                + Create Custom Device
              </Tab>
            </TabList>

            <TabPanels>
              {/* TAB 1: BROWSE DEVICE LIBRARY */}
              <TabPanel p="20px">
                <Flex direction={{ base: 'column', md: 'row' }} gap="12px" mb="16px">
                  <InputGroup maxW={{ base: '100%', md: '320px' }}>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={MdSearch} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      pl="40px"
                      placeholder="Search Cisco, Dell, UniFi, Patchbox..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      borderRadius="10px"
                    />
                  </InputGroup>

                  <HStack overflowX="auto" spacing="6px" pb="4px" flex="1">
                    {CATEGORIES.map((cat) => (
                      <Button
                        key={cat}
                        size="xs"
                        variant={selectedCategory === cat ? 'solid' : 'outline'}
                        bg={selectedCategory === cat ? 'brand.500' : cardBg}
                        borderColor={selectedCategory === cat ? 'brand.500' : cardBorder}
                        color={selectedCategory === cat ? 'white' : textColor}
                        _hover={{
                          bg: selectedCategory === cat ? 'brand.600' : 'whiteAlpha.100',
                        }}
                        borderRadius="20px"
                        px="10px"
                        onClick={() => setSelectedCategory(cat)}>
                        {cat}
                      </Button>
                    ))}
                  </HStack>
                </Flex>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing="14px">
                  {filteredTemplates.map((t) => (
                    <Box
                      key={t.id}
                      p="14px"
                      borderRadius="12px"
                      bg={cardBg}
                      border="1px solid"
                      borderColor={cardBorder}
                      transition="all 0.15s ease"
                      _hover={{ borderColor: 'brand.400', transform: 'translateY(-2px)' }}>
                      <Flex justify="space-between" align="start" mb="8px">
                        <Box>
                          <HStack spacing="6px">
                            <Text fontSize="xs" fontWeight="700" color="brand.400" textTransform="uppercase">
                              {t.manufacturer}
                            </Text>
                            {t.isPreset && (
                              <Badge colorScheme="teal" variant="solid" fontSize="9px">
                                Verified
                              </Badge>
                            )}
                          </HStack>
                          <Text fontSize="sm" fontWeight="700" color={textColor}>
                            {t.model}
                          </Text>
                        </Box>
                        <Badge colorScheme="brand" variant="subtle" fontSize="xs">
                          {t.uHeight}U
                        </Badge>
                      </Flex>

                      <Box
                        w="100%"
                        h="32px"
                        borderRadius="4px"
                        bg={t.color || '#1A202C'}
                        mb="10px"
                        display="flex"
                        alignItems="center"
                        px="10px"
                        border="1px solid rgba(255,255,255,0.1)">
                        <HStack spacing="6px" overflow="hidden">
                          {t.category === 'Enclosure' || t.enclosureData || (t.model || '').toLowerCase().includes('m1000e') ? (
                            <Badge size="xs" fontSize="9px" colorScheme="blue" bg="blue.600" color="white" px="6px">
                              {t.enclosureData?.frontBays
                                ? `Modular ${t.enclosureData.frontBays.length}-Bay ${t.enclosureData.bayLayout?.orientation === 'horizontal' ? 'Sled' : 'Blade'} Enclosure`
                                : 'Modular Blade / Sled Enclosure'}
                            </Badge>
                          ) : (
                            Array.isArray(t.frontLayout) &&
                            t.frontLayout.slice(0, 4).map((item, idx) => (
                              <Badge key={idx} size="xs" fontSize="8px" bg="whiteAlpha.200" color="white">
                                {item.count ? `${item.count}x ` : ''}{item.type || 'rj45'}
                              </Badge>
                            ))
                          )}
                        </HStack>
                      </Box>

                      <Flex justify="space-between" align="center">
                        <Text fontSize="xs" color={textMuted}>
                          Category: {t.category}
                        </Text>
                        <Button
                          size="xs"
                          colorScheme="brand"
                          data-testid={`mount-template-${t.id}`}
                          leftIcon={<Icon as={MdAdd} />}
                          onClick={() => {
                            if (onSelectTemplateToMount) {
                              const chosenRack =
                                (allRacks || []).find((r) => r.id === selectedRackId) || targetRack;
                              onSelectTemplateToMount(t, chosenRack, selectedSlotNum);
                              onClose();
                            }
                          }}>
                          Mount in Rack
                        </Button>
                      </Flex>
                    </Box>
                  ))}
                </SimpleGrid>
              </TabPanel>

              {/* TAB 2: CREATE CUSTOM DEVICE TEMPLATE (PATCHDOCS 28x2 GRID) */}
              <TabPanel p="20px">
                {/* Device Metadata */}
                <SimpleGrid columns={{ base: 1, md: 4 }} spacing="12px" mb="14px">
                  <FormControl isRequired>
                    <FormLabel fontSize="xs" fontWeight="700" mb="2px">
                      Manufacturer
                    </FormLabel>
                    <Input
                      size="sm"
                      data-testid="device-manufacturer-input"
                      placeholder="e.g. Cisco, Ubiquiti, Juniper"
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel fontSize="xs" fontWeight="700" mb="2px">
                      Model Name
                    </FormLabel>
                    <Input
                      size="sm"
                      data-testid="device-model-input"
                      placeholder="e.g. USW-Enterprise-24, R650"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="xs" fontWeight="700" mb="2px">
                      Category
                    </FormLabel>
                    <Select
                      size="sm"
                      value={category}
                      onChange={(e) => {
                        const nextCat = e.target.value;
                        setCategory(nextCat);
                        if (nextCat === 'Enclosure' && uHeight < 2) {
                          setUHeight(10);
                        }
                      }}>
                      {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="xs" fontWeight="700" mb="2px">
                      Form Factor (U Height)
                    </FormLabel>
                    <Select size="sm" value={uHeight} onChange={(e) => setUHeight(Number(e.target.value))}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((u) => (
                        <option key={u} value={u}>
                          {u}U Rackmount ({u * 2} Grid Rows)
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </SimpleGrid>

                {category === 'Enclosure' ? (
                  <Box>
                    {/* Modular Enclosure Preset Selector Bar */}
                    <Box p="12px 16px" borderRadius="10px" bg={cardBg} border="1px solid" borderColor={cardBorder} mb="14px">
                      <Flex justify="space-between" align="center" wrap="wrap" gap="10px">
                        <HStack spacing="10px">
                          <Icon as={MdDeveloperBoard} color="brand.400" w="20px" h="20px" />
                          <Text fontSize="xs" fontWeight="700" textTransform="uppercase">
                            Chassis Template Preset:
                          </Text>
                          <Select
                            data-testid="enclosure-preset-select"
                            size="xs"
                            w={{ base: '240px', md: '340px' }}
                            borderRadius="6px"
                            fontWeight="600"
                            value={enclosurePreset}
                            onChange={(e) => handleApplyEnclosurePreset(e.target.value)}>
                            {ENCLOSURE_PRESETS.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </Select>
                        </HStack>

                        <HStack spacing="8px">
                          <Badge colorScheme="blue" fontSize="11px" px="8px" py="2px" borderRadius="4px">
                            {enclosureRows * enclosureCols} Total Modular Bays ({enclosureRows}×{enclosureCols} {enclosureBayOrientation === 'vertical' ? 'Blades' : 'Sleds'})
                          </Badge>
                        </HStack>
                      </Flex>
                    </Box>

                    {/* Enclosure Configuration Controls */}
                    <Box p="14px" borderRadius="12px" bg={cardBg} border="1px solid" borderColor={cardBorder} mb="14px">
                      <Text fontSize="xs" fontWeight="800" textTransform="uppercase" mb="10px" color={textColor}>
                        Enclosure Architecture & Bay Designer
                      </Text>
                      <SimpleGrid columns={{ base: 1, md: 4 }} spacing="14px" mb="12px">
                        {/* Bay Orientation */}
                        <FormControl>
                          <FormLabel fontSize="xs" fontWeight="700">Bay Orientation</FormLabel>
                          <Select
                            size="sm"
                            value={enclosureBayOrientation}
                            onChange={(e) => setEnclosureBayOrientation(e.target.value)}>
                            <option value="vertical">Vertical Blades (e.g. M1000e, c7000, UCS)</option>
                            <option value="horizontal">Horizontal Sleds (e.g. Twin, BigTwin, MX7000)</option>
                          </Select>
                        </FormControl>

                        {/* Rows */}
                        <FormControl>
                          <Flex justify="space-between" align="center" mb="2px">
                            <FormLabel fontSize="xs" fontWeight="700" mb="0">Bay Rows: {enclosureRows}</FormLabel>
                            <ButtonGroup size="xs" isAttached>
                              <Button isDisabled={enclosureRows <= 1} onClick={() => setEnclosureRows(Math.max(1, enclosureRows - 1))}>-</Button>
                              <Button isDisabled={enclosureRows >= 4} onClick={() => setEnclosureRows(Math.min(4, enclosureRows + 1))}>+</Button>
                            </ButtonGroup>
                          </Flex>
                          <Slider min={1} max={4} value={enclosureRows} onChange={(val) => setEnclosureRows(val)}>
                            <SliderTrack bg="gray.600"><SliderFilledTrack bg="brand.400" /></SliderTrack>
                            <SliderThumb boxSize={3} />
                          </Slider>
                        </FormControl>

                        {/* Columns */}
                        <FormControl>
                          <Flex justify="space-between" align="center" mb="2px">
                            <FormLabel fontSize="xs" fontWeight="700" mb="0">Bay Columns: {enclosureCols}</FormLabel>
                            <ButtonGroup size="xs" isAttached>
                              <Button isDisabled={enclosureCols <= 1} onClick={() => setEnclosureCols(Math.max(1, enclosureCols - 1))}>-</Button>
                              <Button isDisabled={enclosureCols >= 14} onClick={() => setEnclosureCols(Math.min(14, enclosureCols + 1))}>+</Button>
                            </ButtonGroup>
                          </Flex>
                          <Slider min={1} max={14} value={enclosureCols} onChange={(val) => setEnclosureCols(val)}>
                            <SliderTrack bg="gray.600"><SliderFilledTrack bg="teal.400" /></SliderTrack>
                            <SliderThumb boxSize={3} />
                          </Slider>
                        </FormControl>

                        {/* Form Factor / U Height */}
                        <FormControl>
                          <FormLabel fontSize="xs" fontWeight="700">Form Factor (U Height)</FormLabel>
                          <Select size="sm" value={uHeight} onChange={(e) => setUHeight(Number(e.target.value))}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((u) => (
                              <option key={u} value={u}>{u}U Rackmount</option>
                            ))}
                          </Select>
                        </FormControl>
                      </SimpleGrid>

                      {/* Rear Subsystems Configuration */}
                      <Text fontSize="11px" fontWeight="700" color="gray.400" textTransform="uppercase" mb="8px">
                        Rear Modular Subsystems
                      </Text>
                      <SimpleGrid columns={{ base: 2, md: 4 }} spacing="12px">
                        <FormControl>
                          <FormLabel fontSize="xs">I/O Fabric Switches</FormLabel>
                          <Select size="xs" value={enclosureFabricsCount} onChange={(e) => setEnclosureFabricsCount(Number(e.target.value))}>
                            {[0, 2, 4, 6, 8].map((n) => (
                              <option key={n} value={n}>{n} Fabric Bays</option>
                            ))}
                          </Select>
                        </FormControl>

                        <FormControl>
                          <FormLabel fontSize="xs">Power Supplies (PSUs)</FormLabel>
                          <Select size="xs" value={enclosurePsusCount} onChange={(e) => setEnclosurePsusCount(Number(e.target.value))}>
                            {[1, 2, 3, 4, 6].map((n) => (
                              <option key={n} value={n}>{n} Redundant PSUs</option>
                            ))}
                          </Select>
                        </FormControl>

                        <FormControl>
                          <FormLabel fontSize="xs">Cooling Fans</FormLabel>
                          <Select size="xs" value={enclosureFansCount} onChange={(e) => setEnclosureFansCount(Number(e.target.value))}>
                            {[2, 4, 6, 8, 9, 10, 12].map((n) => (
                              <option key={n} value={n}>{n} Hot-Plug Fans</option>
                            ))}
                          </Select>
                        </FormControl>

                        <FormControl>
                          <FormLabel fontSize="xs">Management CMCs</FormLabel>
                          <Select size="xs" value={enclosureCmcsCount} onChange={(e) => setEnclosureCmcsCount(Number(e.target.value))}>
                            {[1, 2].map((n) => (
                              <option key={n} value={n}>{n} CMC Controllers</option>
                            ))}
                          </Select>
                        </FormControl>
                      </SimpleGrid>
                    </Box>

                    {/* LIVE ENCLOSURE FACEPLATE PREVIEW */}
                    <Box p="14px" borderRadius="12px" bg={cardBg} border="1px solid" borderColor={cardBorder} mb="14px">
                      <Flex justify="space-between" align="center" mb="8px">
                        <HStack spacing="8px">
                          <Text fontSize="xs" fontWeight="700" color={textColor} textTransform="uppercase">
                            Interactive Enclosure Preview — {model || 'Custom Enclosure'} ({uHeight}U)
                          </Text>
                          <Badge colorScheme="blue" fontSize="9px">
                            {enclosureRows * enclosureCols} {enclosureBayOrientation === 'vertical' ? 'Blade' : 'Sled'} Bays
                          </Badge>
                        </HStack>
                        <Text fontSize="11px" color={textMuted}>
                          Front Faceplate Bezel & Modular Bay Matrix
                        </Text>
                      </Flex>

                      {/* Chassis Frame */}
                      <Box
                        position="relative"
                        w="100%"
                        h={`${Math.max(120, uHeight * 32)}px`}
                        borderRadius="4px"
                        bg={chassisColor}
                        border="1px solid rgba(255,255,255,0.2)"
                        boxShadow="inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 10px rgba(0,0,0,0.5)"
                        overflow="hidden">
                        {/* Left Mounting Ear */}
                        <Box
                          position="absolute"
                          left="0"
                          top="0"
                          bottom="0"
                          w="24px"
                          bg="#2D3748"
                          borderRight="1px solid #4A5568"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          zIndex={5}>
                          <Text
                            fontSize="8px"
                            fontWeight="800"
                            color="whiteAlpha.800"
                            letterSpacing="0.6px"
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(-180deg)' }}>
                            {model.slice(0, 7).toUpperCase() || 'CHASSIS'}
                          </Text>
                        </Box>

                        {/* Right Mounting Ear */}
                        <Box
                          position="absolute"
                          right="0"
                          top="0"
                          bottom="0"
                          w="24px"
                          bg="#2D3748"
                          borderLeft="1px solid #4A5568"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          zIndex={5}>
                          <Text
                            fontSize="8px"
                            fontWeight="800"
                            color="whiteAlpha.700"
                            letterSpacing="0.6px"
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(-180deg)' }}>
                            {uHeight}U
                          </Text>
                        </Box>

                        {/* Faceplate Content */}
                        <Flex position="absolute" left="24px" right="24px" top="0" bottom="0" direction="column">
                          {/* Top Bezel */}
                          <Flex
                            h="28px"
                            bg="#111726"
                            borderBottom="1px solid rgba(255,255,255,0.12)"
                            px="8px"
                            align="center"
                            justify="space-between">
                            <HStack spacing="6px">
                              <Box w="14px" h="14px" borderRadius="full" border="1px solid #4299E1" display="flex" alignItems="center" justifyContent="center">
                                <Text fontSize="7px" fontWeight="900" color="#4299E1">
                                  {(manufacturer || 'ENC').slice(0, 4).toUpperCase()}
                                </Text>
                              </Box>
                              <Text fontSize="10px" fontWeight="800" color="whiteAlpha.900" textTransform="uppercase">
                                {model || 'Modular Enclosure'}
                              </Text>
                            </HStack>

                            <HStack bg="#07192C" border="1px solid #1A365D" borderRadius="4px" px="6px" py="1px" spacing="6px">
                              <Box w="5px" h="5px" borderRadius="full" bg="#00B5D8" />
                              <Text fontSize="8px" fontFamily="mono" color="#00B5D8" fontWeight="700">
                                CMC1: OK | 600W | 22°C | 0/{enclosureRows * enclosureCols} BAYS
                              </Text>
                            </HStack>
                          </Flex>

                          {/* Bays Matrix */}
                          <Box flex="1" p="4px" position="relative">
                            <VStack spacing="4px" h="100%" align="stretch">
                              {Array.from({ length: enclosureRows }).map((_, rIdx) => (
                                <Flex key={`preview-row-${rIdx}`} flex="1" gap="3px" justify="space-between">
                                  {Array.from({ length: enclosureCols }).map((_, cIdx) => {
                                    const bayNum = rIdx * enclosureCols + cIdx + 1;
                                    return (
                                      <Box
                                        key={`preview-bay-${bayNum}`}
                                        flex="1"
                                        h="100%"
                                        borderRadius="3px"
                                        bg="#161D2E"
                                        border="1px dashed rgba(255,255,255,0.18)"
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                        position="relative">
                                        <Text fontSize="7px" fontWeight="800" color="whiteAlpha.600">
                                          {enclosureBayOrientation === 'horizontal' ? 'SLED' : 'BAY'} {String(bayNum).padStart(2, '0')}
                                        </Text>
                                      </Box>
                                    );
                                  })}
                                </Flex>
                              ))}
                            </VStack>
                          </Box>
                        </Flex>
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    {/* Chassis Color Picker & Presets */}
                    <Flex justify="space-between" align="center" mb="14px" wrap="wrap" gap="10px">
                      <HStack spacing="8px">
                        <Text fontSize="xs" fontWeight="700">
                          Chassis Color:
                        </Text>
                        {CHASSIS_COLORS.map((c) => (
                          <Box
                            key={c.hex}
                            w="22px"
                            h="22px"
                            borderRadius="full"
                            bg={c.hex}
                            cursor="pointer"
                            border="2px solid"
                            borderColor={chassisColor === c.hex ? 'brand.400' : 'transparent'}
                            boxShadow="0 1px 3px rgba(0,0,0,0.3)"
                            onClick={() => setChassisColor(c.hex)}
                            title={c.name}
                          />
                        ))}
                      </HStack>

                      {/* Mode & Face Toggles */}
                      <HStack spacing="10px">
                        <ButtonGroup size="xs" isAttached variant="outline">
                          <Button
                            leftIcon={<Icon as={MdGridOn} />}
                            colorScheme={placementMode === 'grid' ? 'brand' : 'gray'}
                            variant={placementMode === 'grid' ? 'solid' : 'ghost'}
                            onClick={() => setPlacementMode('grid')}>
                            Patchdocs Grid (28×2 per U)
                          </Button>
                          <Button
                            leftIcon={<Icon as={MdPanTool} />}
                            colorScheme={placementMode === 'freehand' ? 'teal' : 'gray'}
                            variant={placementMode === 'freehand' ? 'solid' : 'ghost'}
                            onClick={() => setPlacementMode('freehand')}>
                            Freehand Place Mode
                          </Button>
                        </ButtonGroup>

                        <ButtonGroup size="xs" isAttached variant="outline">
                          <Button
                            colorScheme={activeFaceTab === 'front' ? 'brand' : 'gray'}
                            variant={activeFaceTab === 'front' ? 'solid' : 'ghost'}
                            onClick={() => {
                              setActiveFaceTab('front');
                              setSelectedGroupId('fg-1');
                            }}>
                            FRONT
                          </Button>
                          <Button
                            colorScheme={activeFaceTab === 'rear' ? 'orange' : 'gray'}
                            variant={activeFaceTab === 'rear' ? 'solid' : 'ghost'}
                            onClick={() => {
                              setActiveFaceTab('rear');
                              setSelectedGroupId('rg-1');
                            }}>
                            REAR
                          </Button>
                        </ButtonGroup>
                      </HStack>
                    </Flex>

                    {/* CONNECTOR PALETTE TOOLBAR (Visible in BOTH Grid and Freehand Modes) */}
                    <Box p="10px 14px" borderRadius="10px" bg={cardBg} border="1px solid" borderColor={cardBorder} mb="14px">
                      <Flex justify="space-between" align="center" wrap="wrap" gap="8px">
                        <HStack spacing="6px" wrap="wrap">
                          <Text fontSize="11px" fontWeight="700" color={textMuted} mr="4px" textTransform="uppercase">
                            Connectors:
                          </Text>
                          {CONNECTOR_PALETTE.map((item) => (
                            <Button
                              key={item.type}
                              size="xs"
                              variant={activeConnectorType === item.type ? 'solid' : 'outline'}
                              colorScheme={activeConnectorType === item.type ? 'brand' : 'gray'}
                              leftIcon={<PortSvg type={item.type} width={12} height={10} />}
                              draggable
                              onDragStart={(e) => {
                                setActiveConnectorType(item.type);
                                e.dataTransfer.setData('text/plain', item.type);
                                e.dataTransfer.effectAllowed = 'copy';
                              }}
                              title={`Click or drag ${item.label} onto the faceplate`}
                              onClick={() => {
                                setActiveConnectorType(item.type);
                                if (placementMode === 'grid') {
                                  handleAddGroupToGrid(selectedGroup ? selectedGroup.startX : 1, 1, item.type);
                                } else {
                                  handleAddFreehandGroup(4, 1, item.type);
                                }
                              }}>
                              {item.label}
                            </Button>
                          ))}
                        </HStack>

                        {/* Quick Layout Presets (Grid Mode) */}
                        {placementMode === 'grid' && (
                          <HStack spacing="4px">
                            <Button size="xs" variant="ghost" onClick={() => applyPresetLayout('switch24')}>
                              24-Port Switch
                            </Button>
                            <Button size="xs" variant="ghost" onClick={() => applyPresetLayout('switch48')}>
                              48-Port Switch
                            </Button>
                            <Button size="xs" variant="ghost" onClick={() => applyPresetLayout('patch24')}>
                              24-Port Patch
                            </Button>
                            <Button size="xs" variant="ghost" colorScheme="red" onClick={() => applyPresetLayout('clear')}>
                              Clear
                            </Button>
                          </HStack>
                        )}
                      </Flex>
                    </Box>

                {/* THE 28x2 GRID CHASSIS (PATCHDOCS SPECIFICATION) */}
                {placementMode === 'grid' ? (
                  <Box
                    p="14px"
                    borderRadius="12px"
                    bg={cardBg}
                    border="1px solid"
                    borderColor={cardBorder}
                    mb="14px">
                    <Flex justify="space-between" align="center" mb="8px">
                      <HStack spacing="8px">
                        <Text fontSize="xs" fontWeight="700" color={textColor} textTransform="uppercase">
                          19" Faceplate Canvas — 28 Columns × {totalRows} Rows ({activeFaceTab.toUpperCase()})
                        </Text>
                        <Badge colorScheme="blue" fontSize="9px">
                          28×2 Grid per U
                        </Badge>
                      </HStack>
                      <Text fontSize="11px" color={textMuted}>
                        Click and drag any group to reposition across the grid. Use right/bottom handles to resize columns/rows.
                      </Text>
                    </Flex>

                    {/* Chassis Container with 30 Columns (Left Ear + 28 Slots + Right Ear) */}
                    <Box
                      ref={gridContainerRef}
                      position="relative"
                      w="100%"
                      h={`${totalRows * 36 + 4}px`}
                      borderRadius="4px"
                      bg={chassisColor}
                      border="1px solid rgba(255,255,255,0.2)"
                      boxShadow="inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 10px rgba(0,0,0,0.5)"
                      userSelect="none"
                      overflow="visible">
                      {/* Left Mounting Ear (Col 1, 28px wide) */}
                      <Box
                        position="absolute"
                        left="0"
                        top="0"
                        bottom="0"
                        w="28px"
                        bg="#2D3748"
                        borderRight="1px solid #4A5568"
                        borderTopLeftRadius="3px"
                        borderBottomLeftRadius="3px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        zIndex={5}>
                        <Text
                          fontSize="8px"
                          fontWeight="800"
                          color="whiteAlpha.800"
                          letterSpacing="0.6px"
                          style={{ writingMode: 'vertical-rl', transform: 'rotate(-180deg)' }}>
                          {model.slice(0, 6).toUpperCase() || 'DEV01'}
                        </Text>
                      </Box>

                      {/* Right Mounting Ear (Col 30, 28px wide) */}
                      <Box
                        position="absolute"
                        right="0"
                        top="0"
                        bottom="0"
                        w="28px"
                        bg="#2D3748"
                        borderLeft="1px solid #4A5568"
                        borderTopRightRadius="3px"
                        borderBottomRightRadius="3px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        zIndex={5}>
                        <Text
                          fontSize="8px"
                          fontWeight="800"
                          color="whiteAlpha.700"
                          letterSpacing="0.6px"
                          style={{ writingMode: 'vertical-rl', transform: 'rotate(-180deg)' }}>
                          {activeFaceTab.toUpperCase()}
                        </Text>
                      </Box>

                      {/* 28-Column x (uHeight*2) Rows Equipment Bay Grid */}
                      <Box
                        position="absolute"
                        left="28px"
                        right="28px"
                        top="0"
                        bottom="0"
                        display="grid"
                        gridTemplateColumns="repeat(28, 1fr)"
                        gridTemplateRows={`repeat(${totalRows}, 1fr)`}
                        gap="0px"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'copy';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const connType = e.dataTransfer.getData('text/plain');
                          if (!connType) return;
                          const gridElem = gridContainerRef.current;
                          if (!gridElem) return;
                          const rect = gridElem.getBoundingClientRect();
                          const bayLeft = rect.left + 28;
                          const bayWidth = rect.width - 56;
                          const colWidth = bayWidth / 28;
                          const rowHeight = rect.height / totalRows;

                          const dropCol = Math.max(1, Math.min(28, Math.floor((e.clientX - bayLeft) / colWidth) + 1));
                          const dropRow = Math.max(1, Math.min(totalRows, Math.floor((e.clientY - rect.top) / rowHeight) + 1));

                          setActiveConnectorType(connType);
                          handleAddGroupToGrid(dropCol, dropRow, connType);
                        }}>
                        {/* Background Slot Gridlines (28 x totalRows cells) */}
                        {Array.from({ length: 28 * totalRows }).map((_, cellIdx) => {
                          const col = (cellIdx % 28) + 1;
                          const row = Math.floor(cellIdx / 28) + 1;
                          return (
                            <Box
                              key={`grid-cell-${col}-${row}`}
                              gridColumn={col}
                              gridRow={row}
                              borderRight="1px dashed rgba(255,255,255,0.06)"
                              borderBottom="1px dashed rgba(255,255,255,0.06)"
                              _hover={{ bg: 'whiteAlpha.100' }}
                              cursor="crosshair"
                              title={`Slot Col ${col}, Row ${row} — Click or drag to place port group`}
                              onPointerDown={(e) => handleSlotPointerDown(e, col, row)}
                            />
                          );
                        })}

                        {/* Interactive Slot Drag Selection Preview */}
                        {slotDragRange && (() => {
                          const minCol = Math.min(slotDragRange.startCol, slotDragRange.endCol);
                          const maxCol = Math.max(slotDragRange.startCol, slotDragRange.endCol);
                          const minRow = Math.min(slotDragRange.startRow, slotDragRange.endRow);
                          const maxRow = Math.max(slotDragRange.startRow, slotDragRange.endRow);
                          const w = maxCol - minCol + 1;
                          const h = maxRow - minRow + 1;
                          return (
                            <Box
                              gridColumn={`${minCol} / span ${w}`}
                              gridRow={`${minRow} / span ${h}`}
                              position="relative"
                              border="2px dashed #48BB78"
                              bg="rgba(72, 187, 120, 0.25)"
                              borderRadius="4px"
                              zIndex={25}
                              pointerEvents="none">
                              <Box
                                position="absolute"
                                top="-16px"
                                left="2px"
                                bg="#48BB78"
                                color="white"
                                fontSize="8px"
                                fontWeight="800"
                                px="4px"
                                py="1px"
                                borderRadius="2px"
                                whiteSpace="nowrap">
                                + {w * h}x {activeConnectorType.toUpperCase()} ({w}×{h})
                              </Box>
                            </Box>
                          );
                        })()}

                        {/* Render Active Port Groups with Group Border & 2 Handles */}
                        {currentGridGroups.map((group) => {
                          const isSelected = group.id === selectedGroupId;
                          const isDragging = group.id === draggingGroupId;
                          const isSingleHigh = group.height === 1;

                          // Single high port: centered between each row!
                          const gridStyle = isSingleHigh
                            ? {
                                gridColumn: `${group.startX} / span ${group.width}`,
                                gridRow: '1 / -1', // span full height
                                alignSelf: 'center', // CENTERED BETWEEN EACH ROW!
                                height: '34px',
                              }
                            : {
                                gridColumn: `${group.startX} / span ${group.width}`,
                                gridRow: `${group.startY} / span ${group.height}`,
                                alignSelf: 'stretch',
                                height: '100%',
                              };

                          const totalGroupPorts = group.width * group.height;

                          return (
                            <Box
                              key={group.id}
                              position="relative"
                              style={gridStyle}
                              zIndex={isDragging ? 25 : isSelected ? 10 : 3}
                              cursor={isDragging ? 'grabbing' : 'grab'}
                              p="2px"
                              borderRadius="4px"
                              // Group Border: clearly signifies all ports inside belong to same port group!
                              border={
                                isDragging
                                  ? '2px dashed #ff745b'
                                  : isSelected
                                  ? '2px solid #3d9e99'
                                  : '1px solid rgba(255, 255, 255, 0.35)'
                              }
                              bg={
                                isDragging
                                  ? 'rgba(255, 116, 91, 0.25)'
                                  : isSelected
                                  ? 'rgba(61, 158, 153, 0.2)'
                                  : 'rgba(255, 255, 255, 0.04)'
                              }
                              boxShadow={
                                isDragging
                                  ? '0 0 16px rgba(255, 116, 91, 0.8), 0 8px 24px rgba(0,0,0,0.6)'
                                  : isSelected
                                  ? '0 0 10px rgba(163, 212, 209, 0.6)'
                                  : 'none'
                              }
                              transition={isDragging ? 'none' : 'border 0.15s ease, box-shadow 0.15s ease'}
                              title="Click and drag to move port group across grid, or use edge handles to resize"
                              onPointerDown={(e) => handleGroupDragStart(e, group)}>
                              {/* Group Border Tag (Shows port count & type) */}
                              <Box
                                position="absolute"
                                top="-14px"
                                left="2px"
                                bg={isDragging ? '#ff745b' : isSelected ? '#3d9e99' : '#4A5568'}
                                color="white"
                                fontSize="7px"
                                fontWeight="800"
                                px="4px"
                                py="1px"
                                borderRadius="2px"
                                whiteSpace="nowrap"
                                pointerEvents="none"
                                zIndex={15}>
                                {totalGroupPorts}x {group.type.toUpperCase()}{' '}
                                {isDragging
                                  ? `(Cols ${group.startX}–${group.startX + group.width - 1}) [MOVING]`
                                  : isSingleHigh
                                  ? '(1 Row Centered)'
                                  : `(${group.width}×${group.height})`}
                              </Box>

                              {/* Inside the Group Border: Subgrid of Ports */}
                              <Box
                                w="100%"
                                h="100%"
                                display="grid"
                                gridTemplateColumns={`repeat(${group.width}, 1fr)`}
                                gridTemplateRows={`repeat(${group.height}, 1fr)`}
                                gap="2px"
                                alignItems="center"
                                justifyItems="center">
                                {Array.from({ length: totalGroupPorts }).map((_, pIdx) => {
                                  // Row-major iteration matches CSS Grid auto-flow (row 0: c=0..W-1, row 1: c=0..W-1)
                                  const r = Math.floor(pIdx / group.width);
                                  const c = pIdx % group.width;
                                  const portNumber = getGroupPortNumber(
                                    r,
                                    c,
                                    group.width,
                                    group.height,
                                    group.countingDirection
                                  );

                                  const isTopRow = isSingleHigh || r % 2 === 0;
                                  const portLabel = `${group.prefix || ''}${portNumber < 10 && !group.prefix ? '0' : ''}${portNumber}`;

                                  return (
                                    <Box
                                      key={`p-${c}-${r}`}
                                      gridRow={r + 1}
                                      gridColumn={c + 1}
                                      display="flex"
                                      flexDirection="column"
                                      alignItems="center"
                                      justifyContent="center"
                                      w="100%"
                                      h="100%"
                                      overflow="hidden">
                                      {isTopRow ? (
                                        // Top Row or Single-High: Number above, SVG below
                                        <>
                                          <Text fontSize="7px" fontFamily="mono" lineHeight="1" color="whiteAlpha.900">
                                            {portLabel}
                                          </Text>
                                          <PortSvg
                                            type={group.type}
                                            orientation="top"
                                            width={Math.min(16, Math.max(10, 300 / 28))}
                                            height={10}
                                          />
                                        </>
                                      ) : (
                                        // Bottom Row: SVG above (inverted notch), Number below
                                        <>
                                          <PortSvg
                                            type={group.type}
                                            orientation="bottom"
                                            width={Math.min(16, Math.max(10, 300 / 28))}
                                            height={10}
                                          />
                                          <Text fontSize="7px" fontFamily="mono" lineHeight="1" color="whiteAlpha.900">
                                            {portLabel}
                                          </Text>
                                        </>
                                      )}
                                    </Box>
                                  );
                                })}
                              </Box>

                              {/* HANDLE 1: EXPAND HORIZONTALLY (Right Edge) */}
                              {isSelected && (
                                <Box
                                  data-resize-handle="true"
                                  position="absolute"
                                  right="-8px"
                                  top="50%"
                                  transform="translateY(-50%)"
                                  w="16px"
                                  h="24px"
                                  borderRadius="full"
                                  bg="#3d9e99"
                                  _hover={{ bg: '#ff745b' }}
                                  border="2px solid #FFFFFF"
                                  color="white"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  cursor="ew-resize"
                                  boxShadow="0 2px 6px rgba(0,0,0,0.5)"
                                  zIndex={20}
                                  title="Drag or click to expand/shrink columns horizontally"
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    handleResizeRightStart(e, group);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextW = group.width < 28 - group.startX + 1 ? group.width + 1 : 1;
                                    updateGroup(group.id, { width: nextW });
                                  }}>
                                  <Icon as={MdDragHandle} fontSize="12px" />
                                </Box>
                              )}

                              {/* HANDLE 2: EXPAND VERTICALLY (Bottom Edge) */}
                              {isSelected && (
                                <Box
                                  data-resize-handle="true"
                                  position="absolute"
                                  bottom="-8px"
                                  left="50%"
                                  transform="translateX(-50%)"
                                  w="24px"
                                  h="16px"
                                  borderRadius="full"
                                  bg="#3d9e99"
                                  _hover={{ bg: '#ff745b' }}
                                  border="2px solid #FFFFFF"
                                  color="white"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  cursor="ns-resize"
                                  boxShadow="0 2px 6px rgba(0,0,0,0.5)"
                                  zIndex={20}
                                  title="Drag or click to expand/shrink rows vertically"
                                  onPointerDown={(e) => {
                                    e.stopPropagation();
                                    handleResizeDownStart(e, group);
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextH = group.height === 1 ? Math.min(2, totalRows) : 1;
                                    updateGroup(group.id, { height: nextH });
                                  }}>
                                  <Icon as={MdDragHandle} fontSize="12px" transform="rotate(90deg)" />
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>

                    {/* Active Group Inspector Panel */}
                    {selectedGroup ? (
                      <Box mt="14px" p="12px" borderRadius="10px" bg="whiteAlpha.50" border="1px solid" borderColor={cardBorder}>
                        <Flex justify="space-between" align="center" mb="10px">
                          <HStack spacing="6px">
                            <Icon as={MdFitScreen} w="16px" h="16px" color="brand.400" />
                            <Text fontSize="xs" fontWeight="800" textTransform="uppercase">
                              Port Group Inspector ({selectedGroup.width * selectedGroup.height} Ports)
                            </Text>
                          </HStack>

                          <HStack spacing="6px">
                            <Button size="xs" variant="outline" leftIcon={<Icon as={MdContentCopy} />} onClick={handleDuplicateSelectedGroup}>
                              Duplicate Group
                            </Button>
                            <Button size="xs" colorScheme="red" variant="ghost" leftIcon={<Icon as={MdDelete} />} onClick={handleDeleteSelectedGroup}>
                              Delete Group
                            </Button>
                          </HStack>
                        </Flex>

                        <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap="10px">
                          <FormControl>
                            <FormLabel fontSize="xs">Connector Type</FormLabel>
                            <Select
                              size="sm"
                              value={selectedGroup.type}
                              onChange={(e) => updateGroup(selectedGroup.id, { type: e.target.value })}>
                              {CONNECTOR_PALETTE.map((item) => (
                                <option key={item.type} value={item.type}>
                                  {item.label}
                                </option>
                              ))}
                            </Select>
                          </FormControl>

                          <FormControl>
                            <FormLabel fontSize="xs">Port Prefix</FormLabel>
                            <Input
                              size="sm"
                              value={selectedGroup.prefix}
                              placeholder="e.g. Port , SFP, or blank"
                              onChange={(e) => updateGroup(selectedGroup.id, { prefix: e.target.value })}
                            />
                          </FormControl>

                          {/* Columns (Width) Handle Stepper */}
                          <FormControl>
                            <Flex justify="space-between">
                              <FormLabel fontSize="xs">Width (Cols): {selectedGroup.width}</FormLabel>
                              <ButtonGroup size="xs" isAttached>
                                <Button
                                  isDisabled={selectedGroup.width <= 1}
                                  onClick={() => updateGroup(selectedGroup.id, { width: selectedGroup.width - 1 })}>
                                  -
                                </Button>
                                <Button
                                  isDisabled={selectedGroup.width >= 28 - selectedGroup.startX + 1}
                                  onClick={() => updateGroup(selectedGroup.id, { width: selectedGroup.width + 1 })}>
                                  +
                                </Button>
                              </ButtonGroup>
                            </Flex>
                            <Slider
                              min={1}
                              max={28 - selectedGroup.startX + 1}
                              value={selectedGroup.width}
                              onChange={(w) => updateGroup(selectedGroup.id, { width: w })}>
                              <SliderTrack bg="gray.600">
                                <SliderFilledTrack bg="brand.400" />
                              </SliderTrack>
                              <SliderThumb boxSize={4} />
                            </Slider>
                          </FormControl>

                          {/* Rows (Height) Handle Stepper */}
                          <FormControl>
                            <Flex justify="space-between">
                              <FormLabel fontSize="xs">
                                Height (Rows): {selectedGroup.height}{' '}
                                {selectedGroup.height === 1 ? '(Centered)' : ''}
                              </FormLabel>
                              <ButtonGroup size="xs" isAttached>
                                <Button
                                  isDisabled={selectedGroup.height <= 1}
                                  onClick={() => updateGroup(selectedGroup.id, { height: selectedGroup.height - 1 })}>
                                  -
                                </Button>
                                <Button
                                  isDisabled={selectedGroup.height >= totalRows}
                                  onClick={() => updateGroup(selectedGroup.id, { height: selectedGroup.height + 1 })}>
                                  +
                                </Button>
                              </ButtonGroup>
                            </Flex>
                            <Slider
                              min={1}
                              max={totalRows}
                              value={selectedGroup.height}
                              onChange={(h) => updateGroup(selectedGroup.id, { height: h })}>
                              <SliderTrack bg="gray.600">
                                <SliderFilledTrack bg="teal.400" />
                              </SliderTrack>
                              <SliderThumb boxSize={4} />
                            </Slider>
                          </FormControl>
                        </Grid>

                        <HStack spacing="14px" mt="8px">
                          <FormControl maxW="200px">
                            <FormLabel fontSize="xs">Start Column (1–28): {selectedGroup.startX}</FormLabel>
                            <Slider
                              min={1}
                              max={28 - selectedGroup.width + 1}
                              value={selectedGroup.startX}
                              onChange={(x) => updateGroup(selectedGroup.id, { startX: x })}>
                              <SliderTrack bg="gray.600">
                                <SliderFilledTrack bg="coral.400" />
                              </SliderTrack>
                              <SliderThumb boxSize={3} />
                            </Slider>
                          </FormControl>

                          <FormControl maxW="280px">
                            <FormLabel fontSize="xs">Numbering Layout</FormLabel>
                            <Select
                              size="sm"
                              value={selectedGroup.countingDirection}
                              onChange={(e) => updateGroup(selectedGroup.id, { countingDirection: e.target.value })}>
                              <option value="columns">Odd over Even (1,3 / 2,4 — Switch Standard)</option>
                              <option value="rows">Sequential by Row (1–12 / 13–24 — Patch Panel)</option>
                              <option value="even-over-odd">Even over Odd (2,4 / 1,3 — Inverted Switch)</option>
                              <option value="bottom-to-top">Bottom to Top Sequential (13–24 / 1–12)</option>
                            </Select>
                          </FormControl>
                        </HStack>
                      </Box>
                    ) : (
                      <Flex justify="center" align="center" py="10px">
                        <Text fontSize="xs" color={textMuted}>
                          Click any port group above to adjust its columns, rows, and connector properties.
                        </Text>
                      </Flex>
                    )}
                  </Box>
                ) : (
                  // FREEHAND RESIZABLE PLACE MODE (MATCHES GRID MODE CHASSIS & 28x2 PER U GRID)
                  <Box p="14px" borderRadius="12px" bg={cardBg} border="1px solid" borderColor={cardBorder} mb="14px">
                    <Flex justify="space-between" align="center" mb="8px" wrap="wrap" gap="8px">
                      <HStack spacing="8px">
                        <Text fontSize="xs" fontWeight="700" color={textColor} textTransform="uppercase">
                          19" Faceplate Canvas — 28 Columns × {totalRows} Rows ({activeFaceTab.toUpperCase()})
                        </Text>
                        <Badge colorScheme="blue" fontSize="9px">
                          28×2 Grid per U
                        </Badge>
                        <Badge colorScheme="teal" fontSize="9px">
                          Freehand Resizable
                        </Badge>
                      </HStack>

                      <HStack spacing="8px" wrap="wrap">
                        {/* Convert Grid Groups to Freehand */}
                        <Button
                          size="xs"
                          variant="outline"
                          colorScheme="teal"
                          leftIcon={<Icon as={MdSwapHoriz} />}
                          onClick={handleConvertGridToFreehand}
                          title="Convert the current Patchdocs 28x2 Grid groups into individual resizable freehand ports">
                          Convert Grid to Freehand
                        </Button>

                        {/* Snapping Mode Toggles (User Requested: Midlines & Center in Slot) */}
                        <HStack spacing="4px" bg="whiteAlpha.100" p="2px 6px" borderRadius="8px">
                          <Text fontSize="10px" fontWeight="700" color={textMuted} mr="2px">
                            SNAP:
                          </Text>
                          <Button
                            size="xs"
                            variant={snapToSlotCenter ? 'solid' : 'ghost'}
                            colorScheme={snapToSlotCenter ? 'blue' : 'gray'}
                            onClick={() => {
                              const next = !snapToSlotCenter;
                              setSnapToSlotCenter(next);
                              if (next && selectedFreehandPort) {
                                const snapped = getSnappedCoords(selectedFreehandPort.posX, selectedFreehandPort.posY, true, snapToMidlines);
                                setCurrentFreehandPorts(
                                  currentFreehandPorts.map((p) =>
                                    p.id === selectedFreehandPortId ? { ...p, posX: snapped.posX, posY: snapped.posY } : p
                                  )
                                );
                              }
                            }}
                            title="Toggle snap to 28x2 slot centers to line up with grid mode slots">
                            🎯 Center in Slot
                          </Button>
                          <Button
                            size="xs"
                            variant={snapToMidlines ? 'solid' : 'ghost'}
                            colorScheme={snapToMidlines ? 'coral' : 'gray'}
                            onClick={() => {
                              const next = !snapToMidlines;
                              setSnapToMidlines(next);
                              if (next && selectedFreehandPort) {
                                const snapped = getSnappedCoords(selectedFreehandPort.posX, selectedFreehandPort.posY, snapToSlotCenter, true);
                                setCurrentFreehandPorts(
                                  currentFreehandPorts.map((p) =>
                                    p.id === selectedFreehandPortId ? { ...p, posX: snapped.posX, posY: snapped.posY } : p
                                  )
                                );
                              }
                            }}
                            title="Toggle snap to midlines between rows and columns">
                            ☩ Midlines
                          </Button>
                          <Button
                            size="xs"
                            variant={showGridGuides ? 'solid' : 'ghost'}
                            colorScheme={showGridGuides ? 'teal' : 'gray'}
                            onClick={() => setShowGridGuides(!showGridGuides)}
                            title="Toggle visual grid guidelines on freehand canvas">
                            Guides {showGridGuides ? 'ON' : 'OFF'}
                          </Button>
                        </HStack>

                        <Button
                          size="xs"
                          colorScheme="teal"
                          leftIcon={<Icon as={MdAdd} />}
                          onClick={() => {
                            const rawX = 0.5;
                            const rawY = 0.5;
                            const snapped = getSnappedCoords(rawX, rawY, snapToSlotCenter, snapToMidlines);
                            const newPort = {
                              id: `${activeFaceTab}-${Date.now()}`,
                              name: `0${currentFreehandPorts.length + 1}`,
                              type: activeConnectorType,
                              posX: snapped.posX,
                              posY: snapped.posY,
                              width: 14,
                              height: 11,
                              orientation: 'top',
                              face: activeFaceTab,
                            };
                            setCurrentFreehandPorts([...currentFreehandPorts, newPort]);
                            setSelectedFreehandPortId(newPort.id);
                            setSelectedFreehandPortIds([newPort.id]);
                          }}>
                          + Add Port
                        </Button>

                        {/* Add Port Group Dropdown */}
                        <Menu size="xs">
                          <MenuButton
                            as={Button}
                            size="xs"
                            colorScheme="blue"
                            leftIcon={<Icon as={MdAdd} />}
                            rightIcon={<Icon as={MdArrowDropDown} />}>
                            + Add Port Group
                          </MenuButton>
                          <MenuList bg="navy.800" borderColor="whiteAlpha.300" zIndex={30}>
                            <MenuItem
                              bg="navy.800"
                              _hover={{ bg: 'whiteAlpha.200' }}
                              fontSize="xs"
                              onClick={() => handleAddFreehandGroup(4, 1, activeConnectorType)}>
                              4 Ports (4×1 — Single Row)
                            </MenuItem>
                            <MenuItem
                              bg="navy.800"
                              _hover={{ bg: 'whiteAlpha.200' }}
                              fontSize="xs"
                              onClick={() => handleAddFreehandGroup(8, 2, activeConnectorType)}>
                              8 Ports (4×2 — Dual Row)
                            </MenuItem>
                            <MenuItem
                              bg="navy.800"
                              _hover={{ bg: 'whiteAlpha.200' }}
                              fontSize="xs"
                              onClick={() => handleAddFreehandGroup(12, 2, activeConnectorType)}>
                              12 Ports (6×2 — Dual Row)
                            </MenuItem>
                            <MenuItem
                              bg="navy.800"
                              _hover={{ bg: 'whiteAlpha.200' }}
                              fontSize="xs"
                              onClick={() => handleAddFreehandGroup(24, 2, activeConnectorType)}>
                              24 Ports (12×2 — Dual Row)
                            </MenuItem>
                          </MenuList>
                        </Menu>

                        {/* Quick Group Action when ports selected via CTRL+Click */}
                        {selectedFreehandPortIds.length > 1 && (
                          <Button
                            size="xs"
                            colorScheme="coral"
                            leftIcon={<Icon as={MdGroupWork} />}
                            onClick={() => handleCreateGroupFromSelection()}
                            title="Create a port group with group border from the selected ports">
                            Group Selected ({selectedFreehandPortIds.length})
                          </Button>
                        )}
                        {selectedFreehandPortIds.some((id) => currentFreehandPorts.find((p) => p.id === id)?.groupId) && (
                          <Button
                            size="xs"
                            variant="outline"
                            colorScheme="orange"
                            leftIcon={<Icon as={MdLayersClear} />}
                            onClick={handleUngroupSelected}
                            title="Ungroup selected ports">
                            Ungroup
                          </Button>
                        )}
                      </HStack>
                    </Flex>

                    {/* Chassis Container with 30 Columns (Left Ear + 28x2 Equipment Bay + Right Ear) — MATCHES GRID MODE EXACTLY */}
                    <Box
                      position="relative"
                      w="100%"
                      h={`${totalRows * 36 + 4}px`}
                      borderRadius="4px"
                      bg={chassisColor}
                      border="1px solid rgba(255,255,255,0.2)"
                      boxShadow="inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 10px rgba(0,0,0,0.5)"
                      userSelect="none"
                      overflow="visible">
                      {/* Left Mounting Ear (Col 1, 28px wide) */}
                      <Box
                        position="absolute"
                        left="0"
                        top="0"
                        bottom="0"
                        w="28px"
                        bg="#2D3748"
                        borderRight="1px solid #4A5568"
                        borderTopLeftRadius="3px"
                        borderBottomLeftRadius="3px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        zIndex={5}>
                        <Text
                          fontSize="8px"
                          fontWeight="800"
                          color="whiteAlpha.800"
                          letterSpacing="0.6px"
                          style={{ writingMode: 'vertical-rl', transform: 'rotate(-180deg)' }}>
                          {model.slice(0, 6).toUpperCase() || 'DEV01'}
                        </Text>
                      </Box>

                      {/* Right Mounting Ear (Col 30, 28px wide) */}
                      <Box
                        position="absolute"
                        right="0"
                        top="0"
                        bottom="0"
                        w="28px"
                        bg="#2D3748"
                        borderLeft="1px solid #4A5568"
                        borderTopRightRadius="3px"
                        borderBottomRightRadius="3px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        zIndex={5}>
                        <Text
                          fontSize="8px"
                          fontWeight="800"
                          color="whiteAlpha.700"
                          letterSpacing="0.6px"
                          style={{ writingMode: 'vertical-rl', transform: 'rotate(-180deg)' }}>
                          {activeFaceTab.toUpperCase()}
                        </Text>
                      </Box>

                      {/* 28-Column x (uHeight*2) Rows Equipment Bay (Freehand Canvas) */}
                      <Box
                        ref={freehandCanvasRef}
                        position="absolute"
                        left="28px"
                        right="28px"
                        top="0"
                        bottom="0"
                        overflow="visible"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'copy';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const connType = e.dataTransfer.getData('text/plain');
                          if (!connType) return;
                          setActiveConnectorType(connType);
                          const canvasElem = freehandCanvasRef.current;
                          if (!canvasElem) return;
                          const rect = canvasElem.getBoundingClientRect();
                          const rawDropX = Number(Math.max(0.01, Math.min(0.99, (e.clientX - rect.left) / rect.width)).toFixed(4));
                          const rawDropY = Number(Math.max(0.02, Math.min(0.98, (e.clientY - rect.top) / rect.height)).toFixed(4));
                          const snapped = getSnappedCoords(rawDropX, rawDropY, snapToSlotCenter, snapToMidlines);

                          const newPort = {
                            id: `${activeFaceTab}-${Date.now()}`,
                            name: `0${currentFreehandPorts.length + 1}`,
                            type: connType,
                            posX: snapped.posX,
                            posY: snapped.posY,
                            width: 14,
                            height: 11,
                            orientation: 'top',
                            face: activeFaceTab,
                          };
                          setCurrentFreehandPorts([...currentFreehandPorts, newPort]);
                          setSelectedFreehandPortId(newPort.id);
                          setSelectedFreehandPortIds([newPort.id]);
                        }}>

                        {/* Background 28x2 per U Grid Slots matching Grid Mode */}
                        <Box
                          position="absolute"
                          inset="0"
                          display="grid"
                          gridTemplateColumns="repeat(28, 1fr)"
                          gridTemplateRows={`repeat(${totalRows}, 1fr)`}
                          gap="0px"
                          zIndex={1}>
                          {Array.from({ length: 28 * totalRows }).map((_, cellIdx) => {
                            const col = (cellIdx % 28) + 1;
                            const row = Math.floor(cellIdx / 28) + 1;
                            return (
                              <Box
                                key={`fh-cell-${col}-${row}`}
                                gridColumn={col}
                                gridRow={row}
                                borderRight="1px dashed rgba(255,255,255,0.06)"
                                borderBottom="1px dashed rgba(255,255,255,0.06)"
                                _hover={{ bg: 'whiteAlpha.100' }}
                                cursor="crosshair"
                                title={`Slot Col ${col}, Row ${row} — Click to place port here`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const colCenter = Number(((col - 0.5) / 28).toFixed(4));
                                  const rowCenter = Number(((row - 0.5) / totalRows).toFixed(4));
                                  const newPort = {
                                    id: `${activeFaceTab}-${Date.now()}`,
                                    name: `0${currentFreehandPorts.length + 1}`,
                                    type: activeConnectorType,
                                    posX: colCenter,
                                    posY: rowCenter,
                                    width: 14,
                                    height: 11,
                                    orientation: row % 2 === 1 ? 'top' : 'bottom',
                                    face: activeFaceTab,
                                  };
                                  setCurrentFreehandPorts([...currentFreehandPorts, newPort]);
                                  setSelectedFreehandPortId(newPort.id);
                                }}
                              />
                            );
                          })}
                        </Box>

                        {/* Visual Guidelines (Columns & Row Midlines) */}
                        {showGridGuides && (
                          <>
                            {/* 28 Column Guideline Dividers */}
                            {Array.from({ length: 27 }).map((_, idx) => {
                              const leftPct = ((idx + 1) / 28) * 100;
                              return (
                                <Box
                                  key={`col-guide-${idx}`}
                                  position="absolute"
                                  left={`${leftPct}%`}
                                  top="0"
                                  bottom="0"
                                  w="1px"
                                  borderLeft={
                                    snapToMidlines
                                      ? '1px dashed rgba(159, 122, 234, 0.45)'
                                      : '1px dashed rgba(255, 255, 255, 0.12)'
                                  }
                                  pointerEvents="none"
                                  zIndex={2}
                                />
                              );
                            })}

                            {/* 28 Column Slot Centers (if Center in Slot is active) */}
                            {snapToSlotCenter &&
                              Array.from({ length: 28 }).map((_, idx) => {
                                const leftPct = ((idx + 0.5) / 28) * 100;
                                return (
                                  <Box
                                    key={`slot-center-${idx}`}
                                    position="absolute"
                                    left={`${leftPct}%`}
                                    top="0"
                                    bottom="0"
                                    w="1px"
                                    borderLeft="1px dotted rgba(49, 130, 206, 0.4)"
                                    pointerEvents="none"
                                    zIndex={2}
                                  />
                                );
                              })}

                            {/* Row Midline (Between Row 1 and Row 2 at 50%) */}
                            <Box
                              position="absolute"
                              left="0"
                              right="0"
                              top="50%"
                              h="1px"
                              borderTop={
                                snapToMidlines
                                  ? '1px dashed rgba(159, 122, 234, 0.7)'
                                  : '1px dashed rgba(255, 255, 255, 0.2)'
                              }
                              pointerEvents="none"
                              zIndex={2}
                            />

                            {/* Row Centers for Row 1 (25%) and Row 2 (75%) if Center in Slot */}
                            {snapToSlotCenter && (
                              <>
                                <Box
                                  position="absolute"
                                  left="0"
                                  right="0"
                                  top="25%"
                                  h="1px"
                                  borderTop="1px dotted rgba(49, 130, 206, 0.4)"
                                  pointerEvents="none"
                                  zIndex={2}
                                />
                                <Box
                                  position="absolute"
                                  left="0"
                                  right="0"
                                  top="75%"
                                  h="1px"
                                  borderTop="1px dotted rgba(49, 130, 206, 0.4)"
                                  pointerEvents="none"
                                  zIndex={2}
                                />
                              </>
                            )}
                          </>
                        )}

                        {/* Active Magnetic Snap Crosshairs (illuminates under dragging port) */}
                        {activeSnapGuideCoords && (
                          <>
                            <Box
                              position="absolute"
                              left={`${(activeSnapGuideCoords.x * 100).toFixed(2)}%`}
                              top="0"
                              bottom="0"
                              w="1px"
                              bg={activeSnapGuideCoords.isSlot ? '#3d9e99' : '#ff745b'}
                              boxShadow={`0 0 8px ${activeSnapGuideCoords.isSlot ? '#a3d4d1' : '#ff745b'}`}
                              pointerEvents="none"
                              zIndex={15}
                            />
                            <Box
                              position="absolute"
                              left="0"
                              right="0"
                              top={`${(activeSnapGuideCoords.y * 100).toFixed(2)}%`}
                              h="1px"
                              bg={activeSnapGuideCoords.isSlot ? '#3d9e99' : '#ff745b'}
                              boxShadow={`0 0 8px ${activeSnapGuideCoords.isSlot ? '#a3d4d1' : '#ff745b'}`}
                              pointerEvents="none"
                              zIndex={15}
                            />
                          </>
                        )}

                        {/* Freehand Port Group Bounding Borders */}
                        {freehandGroups.map((group) => {
                          const isGroupSelected =
                            selectedFreehandGroupId === group.id ||
                            group.ports.some((p) => selectedFreehandPortIds.includes(p.id));

                          const minX = Math.min(...group.ports.map((p) => p.posX));
                          const maxX = Math.max(...group.ports.map((p) => p.posX));
                          const minY = Math.min(...group.ports.map((p) => p.posY));
                          const maxY = Math.max(...group.ports.map((p) => p.posY));

                          const isSingleHigh = minY === maxY;

                          return (
                            <Box
                              key={group.id}
                              position="absolute"
                              left={`calc(${minX * 100}% - 14px)`}
                              top={`calc(${minY * 100}% - ${isSingleHigh ? 13 : 15}px)`}
                              width={`calc(${(maxX - minX) * 100}% + 28px)`}
                              height={`calc(${(maxY - minY) * 100}% + ${isSingleHigh ? 26 : 30}px)`}
                              border="2px solid"
                              borderColor={isGroupSelected ? '#3d9e99' : '#a3d4d1'}
                              borderRadius="4px"
                              bg={isGroupSelected ? 'rgba(61, 158, 153, 0.18)' : 'rgba(163, 212, 209, 0.08)'}
                              boxShadow={isGroupSelected ? '0 0 12px rgba(163, 212, 209, 0.6)' : 'none'}
                              zIndex={6}
                              cursor="pointer"
                              transition="border-color 0.15s, background-color 0.15s"
                              _hover={{
                                borderColor: '#3d9e99',
                                bg: 'rgba(61, 158, 153, 0.22)',
                              }}
                              title={`Port Group: ${group.name} (${group.ports.length} ports) — Click to select, drag to move group`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFreehandGroupId(group.id);
                                setSelectedFreehandPortIds(group.ports.map((p) => p.id));
                                setSelectedFreehandPortId(group.ports[0]?.id || null);
                              }}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                handleFreehandGroupDragStart(e, group);
                              }}>
                              {/* Group Badge */}
                              <Box
                                position="absolute"
                                top="-14px"
                                left="6px"
                                bg={isGroupSelected ? '#3d9e99' : '#0b2130'}
                                color="white"
                                fontSize="7px"
                                fontWeight="800"
                                px="5px"
                                py="1px"
                                borderRadius="2px"
                                whiteSpace="nowrap"
                                pointerEvents="none"
                                zIndex={7}
                                boxShadow="0 2px 4px rgba(0,0,0,0.4)">
                                {group.ports.length}x {group.name.toUpperCase()}
                              </Box>
                            </Box>
                          );
                        })}

                        {/* Freehand Ports Rendered Over 28x2 Grid */}
                        {currentFreehandPorts.map((port) => {
                          const isSelected = selectedFreehandPortIds.includes(port.id) || port.id === selectedFreehandPortId;
                          const isDragging = port.id === draggingFreehandPortId;
                          return (
                            <Box
                              key={port.id}
                              data-freehand-port="true"
                              data-port-type={port.type}
                              data-port-id={port.id}
                              position="absolute"
                              left={`${(port.posX * 100).toFixed(2)}%`}
                              top={`${(port.posY * 100).toFixed(2)}%`}
                              transform="translate(-50%, -50%)"
                              zIndex={isDragging ? 25 : isSelected ? 20 : 10}
                              cursor={isDragging ? 'grabbing' : 'grab'}
                              p="2px"
                              borderRadius="4px"
                              border={
                                isDragging
                                  ? '2px dashed #38B2AC'
                                  : isSelected
                                  ? '2px solid #00B5D8'
                                  : '1px solid transparent'
                              }
                              bg={
                                isDragging
                                  ? 'rgba(0, 181, 216, 0.4)'
                                  : isSelected
                                  ? 'rgba(0, 181, 216, 0.25)'
                                  : 'transparent'
                              }
                              boxShadow={
                                isDragging
                                  ? '0 0 14px #00B5D8, 0 6px 14px rgba(0,0,0,0.5)'
                                  : isSelected
                                  ? '0 0 10px #00B5D8'
                                  : 'none'
                              }
                              title="Click and drag to move port freely across canvas (Hold CTRL to multi-select)"
                              onPointerDown={(e) => handleFreehandPortDragStart(e, port)}>
                              <PortSvg
                                type={port.type}
                                orientation={port.orientation || 'top'}
                                width={port.width || 14}
                                height={port.height || 11}
                              />
                              {isSelected && (
                                <Box
                                  position="absolute"
                                  top="-16px"
                                  left="50%"
                                  transform="translateX(-50%)"
                                  bg={isDragging ? 'teal.600' : 'teal.500'}
                                  color="white"
                                  fontSize="8px"
                                  fontWeight="700"
                                  px="4px"
                                  py="1px"
                                  borderRadius="2px"
                                  whiteSpace="nowrap"
                                  pointerEvents="none"
                                  zIndex={22}
                                  boxShadow="0 2px 4px rgba(0,0,0,0.4)">
                                  {port.name}{' '}
                                  {isDragging
                                    ? `(X: ${Math.round(port.posX * 100)}%, Y: ${Math.round(port.posY * 100)}%)`
                                    : `(${port.width || 14}×${port.height || 11})`}
                                </Box>
                              )}
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>

                    {/* Freehand Inspector */}
                    {(selectedFreehandPort || selectedFreehandPortIds.length > 0) && (
                      <Box mt="12px" p="10px" borderRadius="8px" bg="whiteAlpha.50">
                        {selectedFreehandPortIds.length > 1 ? (
                          // MULTI-PORT SELECTION INSPECTOR
                          <>
                            <Flex justify="space-between" align="center" mb="8px" wrap="wrap" gap="6px">
                              <HStack spacing="6px">
                                <Badge colorScheme="coral" fontSize="10px">
                                  {selectedFreehandPortIds.length} Ports Selected
                                </Badge>
                                <Text fontSize="xs" fontWeight="700">
                                  Multi-Port Selection (CTRL+Click)
                                </Text>
                              </HStack>
                              <HStack spacing="6px" wrap="wrap">
                                <Button
                                  size="xs"
                                  colorScheme="blue"
                                  leftIcon={<Icon as={MdGroupWork} />}
                                  onClick={() => handleCreateGroupFromSelection()}>
                                  Create Group from Selection
                                </Button>
                                {selectedFreehandPortIds.some((id) => currentFreehandPorts.find((p) => p.id === id)?.groupId) && (
                                  <Button
                                    size="xs"
                                    colorScheme="orange"
                                    variant="outline"
                                    leftIcon={<Icon as={MdLayersClear} />}
                                    onClick={handleUngroupSelected}>
                                    Ungroup
                                  </Button>
                                )}
                                <Button
                                  size="xs"
                                  colorScheme="blue"
                                  variant="outline"
                                  onClick={() => {
                                    setCurrentFreehandPorts(
                                      currentFreehandPorts.map((p) =>
                                        selectedFreehandPortIds.includes(p.id)
                                          ? { ...p, ...getSnappedCoords(p.posX, p.posY, true, false) }
                                          : p
                                      )
                                    );
                                  }}>
                                  Center All in Slot
                                </Button>
                                <Button
                                  size="xs"
                                  colorScheme="coral"
                                  variant="outline"
                                  onClick={() => {
                                    setCurrentFreehandPorts(
                                      currentFreehandPorts.map((p) =>
                                        selectedFreehandPortIds.includes(p.id)
                                          ? { ...p, ...getSnappedCoords(p.posX, p.posY, false, true) }
                                          : p
                                      )
                                    );
                                  }}>
                                  Snap All to Midline
                                </Button>
                                <Button
                                  size="xs"
                                  colorScheme="red"
                                  variant="ghost"
                                  onClick={() => {
                                    setCurrentFreehandPorts(
                                      currentFreehandPorts.filter((p) => !selectedFreehandPortIds.includes(p.id))
                                    );
                                    setSelectedFreehandPortIds([]);
                                    setSelectedFreehandPortId(null);
                                  }}>
                                  Delete Selected ({selectedFreehandPortIds.length})
                                </Button>
                              </HStack>
                            </Flex>

                            <SimpleGrid columns={{ base: 1, md: 2 }} spacing="12px">
                              <Box>
                                <Text fontSize="xs">Adjust Width of All Selected Ports (px)</Text>
                                <Slider
                                  min={8}
                                  max={48}
                                  value={selectedFreehandPort?.width || 14}
                                  onChange={(w) =>
                                    setCurrentFreehandPorts(
                                      currentFreehandPorts.map((p) =>
                                        selectedFreehandPortIds.includes(p.id) ? { ...p, width: w } : p
                                      )
                                    )
                                  }>
                                  <SliderTrack bg="gray.600"><SliderFilledTrack bg="teal.400" /></SliderTrack>
                                  <SliderThumb boxSize={4} />
                                </Slider>
                              </Box>
                              <Box>
                                <Text fontSize="xs">Adjust Height of All Selected Ports (px)</Text>
                                <Slider
                                  min={6}
                                  max={36}
                                  value={selectedFreehandPort?.height || 11}
                                  onChange={(h) =>
                                    setCurrentFreehandPorts(
                                      currentFreehandPorts.map((p) =>
                                        selectedFreehandPortIds.includes(p.id) ? { ...p, height: h } : p
                                      )
                                    )
                                  }>
                                  <SliderTrack bg="gray.600"><SliderFilledTrack bg="teal.400" /></SliderTrack>
                                  <SliderThumb boxSize={4} />
                                </Slider>
                              </Box>
                            </SimpleGrid>
                          </>
                        ) : selectedFreehandPort ? (
                          // SINGLE PORT & GROUP INSPECTOR
                          <>
                            <Flex justify="space-between" align="center" mb="8px" wrap="wrap" gap="6px">
                              <HStack spacing="6px">
                                <Text fontSize="xs" fontWeight="700">
                                  Port Inspector: {selectedFreehandPort.name}
                                </Text>
                                {selectedFreehandPort.groupId && (
                                  <Badge colorScheme="blue" fontSize="9px">
                                    {selectedFreehandPort.groupName || 'Port Group'}
                                  </Badge>
                                )}
                              </HStack>
                              <HStack spacing="6px" wrap="wrap">
                                {selectedFreehandPort.groupId ? (
                                  <>
                                    <Button
                                      size="xs"
                                      colorScheme="blue"
                                      variant="solid"
                                      onClick={() => {
                                        const groupPorts = currentFreehandPorts.filter(
                                          (p) => p.groupId === selectedFreehandPort.groupId
                                        );
                                        setSelectedFreehandGroupId(selectedFreehandPort.groupId);
                                        setSelectedFreehandPortIds(groupPorts.map((p) => p.id));
                                      }}>
                                      Select Entire Group
                                    </Button>
                                    <Button
                                      size="xs"
                                      colorScheme="orange"
                                      variant="outline"
                                      leftIcon={<Icon as={MdLayersClear} />}
                                      onClick={handleUngroupSelected}>
                                      Ungroup
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="xs"
                                    colorScheme="coral"
                                    leftIcon={<Icon as={MdGroupWork} />}
                                    onClick={() => handleCreateGroupFromSelection()}>
                                    Create Group from Port
                                  </Button>
                                )}
                                <Button
                                  size="xs"
                                  colorScheme="blue"
                                  variant="outline"
                                  onClick={() => {
                                    const snapped = getSnappedCoords(selectedFreehandPort.posX, selectedFreehandPort.posY, true, false);
                                    setCurrentFreehandPorts(
                                      currentFreehandPorts.map((p) =>
                                        p.id === selectedFreehandPortId ? { ...p, posX: snapped.posX, posY: snapped.posY } : p
                                      )
                                    );
                                  }}>
                                  Center in Slot
                                </Button>
                                <Button
                                  size="xs"
                                  colorScheme="coral"
                                  variant="outline"
                                  onClick={() => {
                                    const snapped = getSnappedCoords(selectedFreehandPort.posX, selectedFreehandPort.posY, false, true);
                                    setCurrentFreehandPorts(
                                      currentFreehandPorts.map((p) =>
                                        p.id === selectedFreehandPortId ? { ...p, posX: snapped.posX, posY: snapped.posY } : p
                                      )
                                    );
                                  }}>
                                  Snap to Midline
                                </Button>
                                <Button
                                  size="xs"
                                  colorScheme="red"
                                  variant="ghost"
                                  onClick={() => {
                                    setCurrentFreehandPorts(currentFreehandPorts.filter((p) => p.id !== selectedFreehandPortId));
                                    setSelectedFreehandPortId(null);
                                    setSelectedFreehandPortIds([]);
                                  }}>
                                  Delete Port
                                </Button>
                              </HStack>
                            </Flex>

                            {selectedFreehandPort.groupId && (
                              <HStack spacing="10px" mb="10px" p="6px 8px" bg="whiteAlpha.100" borderRadius="6px">
                                <Text fontSize="11px" fontWeight="700" color="blue.300">
                                  Group Name:
                                </Text>
                                <Input
                                  size="xs"
                                  maxW="180px"
                                  value={selectedFreehandPort.groupName || ''}
                                  placeholder="e.g. 4x RJ45"
                                  onChange={(e) => {
                                    const nextName = e.target.value;
                                    setCurrentFreehandPorts(
                                      currentFreehandPorts.map((p) =>
                                        p.groupId === selectedFreehandPort.groupId
                                          ? { ...p, groupName: nextName }
                                          : p
                                      )
                                    );
                                  }}
                                />
                                <Text fontSize="10px" color={textMuted}>
                                  (Hold ALT while dragging to move a single port inside this group)
                                </Text>
                              </HStack>
                            )}

                            <SimpleGrid columns={{ base: 1, md: 4 }} spacing="12px">
                              <Box>
                                <Text fontSize="xs">Width: {selectedFreehandPort.width || 14}px</Text>
                                <Slider
                                  min={8}
                                  max={48}
                                  value={selectedFreehandPort.width || 14}
                                  onChange={(w) =>
                                    setCurrentFreehandPorts(
                                      currentFreehandPorts.map((p) => (p.id === selectedFreehandPortId ? { ...p, width: w } : p))
                                    )
                                  }>
                                  <SliderTrack bg="gray.600"><SliderFilledTrack bg="teal.400" /></SliderTrack>
                                  <SliderThumb boxSize={4} />
                                </Slider>
                              </Box>
                              <Box>
                                <Text fontSize="xs">Height: {selectedFreehandPort.height || 11}px</Text>
                                <Slider
                                  min={6}
                                  max={36}
                                  value={selectedFreehandPort.height || 11}
                                  onChange={(h) =>
                                    setCurrentFreehandPorts(
                                      currentFreehandPorts.map((p) => (p.id === selectedFreehandPortId ? { ...p, height: h } : p))
                                    )
                                  }>
                                  <SliderTrack bg="gray.600"><SliderFilledTrack bg="teal.400" /></SliderTrack>
                                  <SliderThumb boxSize={4} />
                                </Slider>
                              </Box>
                              <Box>
                                <Text fontSize="xs">Pos X: {Math.round(selectedFreehandPort.posX * 100)}%</Text>
                                <Slider
                                  min={2}
                                  max={98}
                                  value={Math.round(selectedFreehandPort.posX * 100)}
                                  onChange={(x) =>
                                    setCurrentFreehandPorts(
                                      currentFreehandPorts.map((p) =>
                                        p.id === selectedFreehandPortId
                                          ? { ...p, posX: Number((x / 100).toFixed(4)) }
                                          : p
                                      )
                                    )
                                  }>
                                  <SliderTrack bg="gray.600"><SliderFilledTrack bg="brand.400" /></SliderTrack>
                                  <SliderThumb boxSize={4} />
                                </Slider>
                              </Box>
                              <Box>
                                <Text fontSize="xs">Pos Y: {Math.round(selectedFreehandPort.posY * 100)}%</Text>
                                <Slider
                                  min={5}
                                  max={95}
                                  value={Math.round(selectedFreehandPort.posY * 100)}
                                  onChange={(y) =>
                                    setCurrentFreehandPorts(
                                      currentFreehandPorts.map((p) =>
                                        p.id === selectedFreehandPortId
                                          ? { ...p, posY: Number((y / 100).toFixed(4)) }
                                          : p
                                      )
                                    )
                                  }>
                                  <SliderTrack bg="gray.600"><SliderFilledTrack bg="brand.400" /></SliderTrack>
                                  <SliderThumb boxSize={4} />
                                </Slider>
                              </Box>
                            </SimpleGrid>
                          </>
                        ) : null}
                      </Box>
                    )}
                  </Box>
                )}
                  </Box>
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>

        <ModalFooter borderTop="1px solid" borderColor={cardBorder} py="10px">
          <Button variant="ghost" mr="10px" onClick={onClose}>
            Close
          </Button>
          {activeTab === 1 && (
            <Button colorScheme="brand" leftIcon={<Icon as={MdCheck} />} onClick={handleSaveCustomDevice}>
              Save to Library
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
