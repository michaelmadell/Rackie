import React, { useEffect, useState, useRef } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  Icon,
  IconButton,
  Image,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  SimpleGrid,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Tooltip,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react';
import {
  MdAdd,
  MdArrowBack,
  MdArrowDownward,
  MdArrowForward,
  MdArrowUpward,
  MdCenterFocusStrong,
  MdCheck,
  MdContentCopy,
  MdDelete,
  MdDescription,
  MdDeveloperBoard,
  MdGridOn,
  MdImage,
  MdOutlineRefresh,
  MdRotateRight,
  MdTune,
  MdViewModule,
} from 'react-icons/md';

import { PortSvg } from './PortGlyph';

import {
  AVAILABLE_HX5_IMAGES,
  getDefaultHX5EnclosureData,
  generateHX5DevicePorts,
  HX5_MODULE_TEMPLATES,
  KNOWN_IMAGE_ASPECT_RATIOS,
} from '../../utils/hx5EnclosureHelper';


export default function ConfigureHX5ModuleModal({
  isOpen,
  onClose,
  device,
  onUpdateDevice,
  initialTab = 0,
  initialSlot = null,
}) {
  const toast = useToast();

  const modalBg = useColorModeValue('white', 'gray.800');
  const cardBg = useColorModeValue('gray.50', 'whiteAlpha.50');
  const borderCol = useColorModeValue('gray.200', 'whiteAlpha.200');
  const textMuted = useColorModeValue('gray.600', 'gray.400');

  // Enclosure data state
  const [encData, setEncData] = useState(() => getDefaultHX5EnclosureData());
  const [activeTabIdx, setActiveTabIdx] = useState(initialTab);

  // Selected slot in Tab 1 (Slot Manager)
  const [selectedSlotType, setSelectedSlotType] = useState('front'); // 'front', 'iom_top', 'iom_bottom', 'fan', 'psu'
  const [selectedSlotNum, setSelectedSlotNum] = useState(1);

  // Tab 3: Visual Port Alignment Studio State
  const [alignTarget, setAlignTarget] = useState('HX2000'); // 'HX1000', 'HX2000', 'HX3000', 'N100', 'N120', 'N205', 'N230', 'PSU', 'ChassisFront'
  const [selectedPortIdx, setSelectedPortIdx] = useState(0);
  const [studioZoom, setStudioZoom] = useState(1.0);
  const [studioFitMode, setStudioFitMode] = useState('natural'); // 'natural', 'contain', 'fill'
  const [studioShowGrid, setStudioShowGrid] = useState(true);
  const [imageAspectRatios, setImageAspectRatios] = useState({});
  const [draggingPortIndex, setDraggingPortIndex] = useState(null);
  const studioCanvasRef = useRef(null);


  // Sync state whenever device or modal opens
  useEffect(() => {
    if (isOpen && device) {
      const raw = device.enclosureData;
      let parsed = {};
      if (typeof raw === 'string') {
        try {
          parsed = JSON.parse(raw);
        } catch (e) {
          parsed = {};
        }
      } else if (raw && typeof raw === 'object') {
        parsed = raw;
      }

      const defaultData = getDefaultHX5EnclosureData();
      const merged = {
        ...defaultData,
        ...parsed,
        images: {
          ...defaultData.images,
          ...(parsed.images || {}),
        },
        descriptions: {
          ...defaultData.descriptions,
          ...(parsed.descriptions || {}),
        },
        frontSlots: parsed.frontSlots || defaultData.frontSlots,
        rearModules: {
          ...defaultData.rearModules,
          ...(parsed.rearModules || {}),
        },
        moduleTemplates: {
          ...HX5_MODULE_TEMPLATES,
          ...(parsed.moduleTemplates || {}),
        },
      };

      setEncData(merged);

      if (initialSlot) {
        if (initialSlot.type) setSelectedSlotType(initialSlot.type);
        if (initialSlot.slotNumber) setSelectedSlotNum(initialSlot.slotNumber);
      }
      if (typeof initialTab === 'number') {
        setActiveTabIdx(initialTab);
      }
    }
  }, [isOpen, device, initialSlot, initialTab]);


  // Current slot being inspected in Tab 1
  const currentFrontSlot =
    selectedSlotType === 'front'
      ? (encData.frontSlots || []).find((s) => s.slotNumber === selectedSlotNum) || encData.frontSlots[0]
      : null;

  const currentIomTop = encData.rearModules?.ioms?.find((i) => i.slotNumber === 1);
  const currentIomBottom = encData.rearModules?.ioms?.find((i) => i.slotNumber === 2);

  // Handler for updating front slot
  const handleUpdateFrontSlot = (slotNumber, updates) => {
    setEncData((prev) => {
      const nextSlots = (prev.frontSlots || []).map((s) => {
        if (s.slotNumber === slotNumber) {
          const modType = updates.moduleType !== undefined ? updates.moduleType : s.moduleType;
          const isOccupied = modType !== 'Empty';
          return {
            ...s,
            ...updates,
            occupied: isOccupied,
          };
        }
        return s;
      });
      return { ...prev, frontSlots: nextSlots };
    });
  };

  // Batch front slot actions
  const handleBatchFrontSlots = (action) => {
    setEncData((prev) => {
      const nextSlots = (prev.frontSlots || []).map((s) => {
        if (action === 'fill_hx2000' && (!s.occupied || s.moduleType === 'Empty')) {
          return {
            ...s,
            occupied: true,
            moduleType: 'HX2000',
            name: `Node-${String(s.slotNumber).padStart(2, '0')} (HX2000)`,
            serial: `AH-HX20-${String(s.slotNumber).padStart(4, '0')}`,
            power: 'on',
          };
        }
        if (action === 'fill_blanks' && (!s.occupied || s.moduleType === 'Empty')) {
          return {
            ...s,
            occupied: true,
            moduleType: 'NodeBlank',
            name: `Blank Sled ${String(s.slotNumber).padStart(2, '0')}`,
            serial: null,
            power: 'off',
          };
        }
        if (action === 'clear_all') {
          return {
            ...s,
            occupied: false,
            moduleType: 'Empty',
            name: `Slot ${String(s.slotNumber).padStart(2, '0')}`,
            serial: null,
            power: 'off',
          };
        }
        return s;
      });
      return { ...prev, frontSlots: nextSlots };
    });
  };

  // Handler for updating IOM slots
  const handleUpdateIOM = (slotNumber, updates) => {
    setEncData((prev) => {
      const nextIOMs = (prev.rearModules?.ioms || []).map((i) => {
        if (i.slotNumber === slotNumber) {
          return { ...i, ...updates };
        }
        return i;
      });
      return {
        ...prev,
        rearModules: {
          ...prev.rearModules,
          ioms: nextIOMs,
        },
      };
    });
  };

  // Handler for updating Fan slot
  const handleUpdateFan = (slotNumber, updates) => {
    setEncData((prev) => {
      const nextFans = (prev.rearModules?.fans || []).map((f) => {
        if (f.slotNumber === slotNumber) {
          return { ...f, ...updates };
        }
        return f;
      });
      return {
        ...prev,
        rearModules: {
          ...prev.rearModules,
          fans: nextFans,
        },
      };
    });
  };

  // Handler for updating PSU slot
  const handleUpdatePSU = (slotNumber, updates) => {
    setEncData((prev) => {
      const nextPSUs = (prev.rearModules?.psus || []).map((p) => {
        if (p.slotNumber === slotNumber) {
          return { ...p, ...updates };
        }
        return p;
      });
      return {
        ...prev,
        rearModules: {
          ...prev.rearModules,
          psus: nextPSUs,
        },
      };
    });
  };

  // ==========================================
  // TAB 2: IMAGE & TEXTURE MAPPING HANDLERS
  // ==========================================
  const handleUpdateChassisImage = (key, value) => {
    setEncData((prev) => ({
      ...prev,
      images: {
        ...(prev.images || {}),
        [key]: value,
      },
    }));
  };

  const handleUpdateTemplateImage = (moduleId, field, value) => {
    setEncData((prev) => {
      const tmpls = { ...prev.moduleTemplates };
      const current = { ...(tmpls[moduleId] || HX5_MODULE_TEMPLATES[moduleId] || {}) };
      current[field] = value;
      tmpls[moduleId] = current;
      return { ...prev, moduleTemplates: tmpls };
    });
  };

  const handleResetAllImages = () => {
    const defaults = getDefaultHX5EnclosureData();
    setEncData((prev) => {
      const tmpls = { ...prev.moduleTemplates };
      Object.keys(HX5_MODULE_TEMPLATES).forEach((k) => {
        if (tmpls[k]) {
          tmpls[k] = {
            ...tmpls[k],
            image: HX5_MODULE_TEMPLATES[k].image,
            overlay: HX5_MODULE_TEMPLATES[k].overlay,
          };
        }
      });
      return {
        ...prev,
        images: { ...defaults.images },
        moduleTemplates: tmpls,
      };
    });
    toast({
      title: 'Textures Reset',
      description: 'All enclosure images and module textures reset to factory defaults.',
      status: 'info',
      duration: 2500,
    });
  };

  // ==========================================
  // TAB 3: VISUAL PORT ALIGNMENT STUDIO HANDLERS
  // ==========================================
  const getTargetPorts = () => {
    if (alignTarget === 'ChassisFront') {
      const pwr = encData.chassisPorts?.power || { posX: 0.048, posY: 0.93, width: 10, height: 10 };
      const usb = encData.chassisPorts?.usb || { posX: 0.078, posY: 0.93, width: 10, height: 7 };
      return [
        {
          nameSuffix: 'Power Button',
          type: 'power',
          relX: pwr.posX ?? 0.048,
          relY: pwr.posY ?? 0.93,
          width: pwr.width ?? 10,
          height: pwr.height ?? 10,
          orientation: 'top',
          description: 'Chassis Power Button & State LED',
        },
        {
          nameSuffix: 'Maintenance USB-C',
          type: 'usb_c',
          relX: usb.posX ?? 0.078,
          relY: usb.posY ?? 0.93,
          width: usb.width ?? 10,
          height: usb.height ?? 7,
          orientation: 'top',
          description: 'Front Maintenance USB-C Port',
        },
      ];
    }
    const tmpl = encData.moduleTemplates?.[alignTarget] || HX5_MODULE_TEMPLATES[alignTarget];
    return tmpl?.ports || [];
  };

  const currentTargetPorts = getTargetPorts();
  const currentTargetPort = currentTargetPorts[selectedPortIdx] || currentTargetPorts[0] || null;

  const handleUpdateTargetPort = (portIndex, updates) => {
    if (alignTarget === 'ChassisFront') {
      setEncData((prev) => {
        const cp = { ...(prev.chassisPorts || {}) };
        if (portIndex === 0) {
          cp.power = {
            ...(cp.power || {}),
            posX: updates.relX !== undefined ? updates.relX : cp.power?.posX,
            posY: updates.relY !== undefined ? updates.relY : cp.power?.posY,
            width: updates.width !== undefined ? updates.width : cp.power?.width,
            height: updates.height !== undefined ? updates.height : cp.power?.height,
          };
        } else if (portIndex === 1) {
          cp.usb = {
            ...(cp.usb || {}),
            posX: updates.relX !== undefined ? updates.relX : cp.usb?.posX,
            posY: updates.relY !== undefined ? updates.relY : cp.usb?.posY,
            width: updates.width !== undefined ? updates.width : cp.usb?.width,
            height: updates.height !== undefined ? updates.height : cp.usb?.height,
          };
        }
        return { ...prev, chassisPorts: cp };
      });
      return;
    }

    setEncData((prev) => {
      const tmpls = { ...prev.moduleTemplates };
      const current = { ...(tmpls[alignTarget] || HX5_MODULE_TEMPLATES[alignTarget]) };
      const ports = [...(current.ports || [])];
      if (ports[portIndex]) {
        ports[portIndex] = { ...ports[portIndex], ...updates };
        current.ports = ports;
        tmpls[alignTarget] = current;
      }
      return { ...prev, moduleTemplates: tmpls };
    });
  };

  const handleNudgePort = (deltaX, deltaY) => {
    if (!currentTargetPort) return;
    const newX = Math.max(0, Math.min(1, Number(((currentTargetPort.relX ?? 0.5) + deltaX).toFixed(4))));
    const newY = Math.max(0, Math.min(1, Number(((currentTargetPort.relY ?? 0.5) + deltaY).toFixed(4))));
    handleUpdateTargetPort(selectedPortIdx, { relX: newX, relY: newY });
  };

  const handleAddPortToTarget = () => {
    if (alignTarget === 'ChassisFront') return;
    setEncData((prev) => {
      const tmpls = { ...prev.moduleTemplates };
      const current = { ...(tmpls[alignTarget] || HX5_MODULE_TEMPLATES[alignTarget]) };
      const ports = [...(current.ports || [])];
      const newPortNum = ports.length + 1;
      const defaultType =
        current.face === 'rear'
          ? current.id?.startsWith('N120') || current.id?.startsWith('N230')
            ? 'sfp_plus'
            : 'rj45'
          : 'hdmi';

      const newPort = {
        nameSuffix: `P-${newPortNum}`,
        type: defaultType,
        relX: 0.5,
        relY: Number((0.2 + (ports.length % 5) * 0.15).toFixed(3)),
        width: defaultType === 'sfp_plus' ? 15 : 12,
        height: 10,
        orientation: ports.length % 2 === 0 ? 'top' : 'bottom',
        rotation: 0,
        description: `Port ${newPortNum} on ${current.name || alignTarget}`,
      };
      ports.push(newPort);
      current.ports = ports;
      tmpls[alignTarget] = current;
      setSelectedPortIdx(ports.length - 1);
      return { ...prev, moduleTemplates: tmpls };
    });
  };

  const handleDuplicateTargetPort = () => {
    if (alignTarget === 'ChassisFront' || !currentTargetPort) return;
    setEncData((prev) => {
      const tmpls = { ...prev.moduleTemplates };
      const current = { ...(tmpls[alignTarget] || HX5_MODULE_TEMPLATES[alignTarget]) };
      const ports = [...(current.ports || [])];
      const clone = {
        ...currentTargetPort,
        nameSuffix: `${currentTargetPort.nameSuffix}-copy`,
        relX: Math.min(1, Number(((currentTargetPort.relX ?? 0.5) + 0.04).toFixed(4))),
        relY: Math.min(1, Number(((currentTargetPort.relY ?? 0.5) + 0.04).toFixed(4))),
      };
      ports.push(clone);
      current.ports = ports;
      tmpls[alignTarget] = current;
      setSelectedPortIdx(ports.length - 1);
      return { ...prev, moduleTemplates: tmpls };
    });
  };

  const handleDeleteTargetPort = (portIndex) => {
    if (alignTarget === 'ChassisFront') return;
    setEncData((prev) => {
      const tmpls = { ...prev.moduleTemplates };
      const current = { ...(tmpls[alignTarget] || HX5_MODULE_TEMPLATES[alignTarget]) };
      const ports = (current.ports || []).filter((_, idx) => idx !== portIndex);
      current.ports = ports;
      tmpls[alignTarget] = current;
      if (selectedPortIdx >= ports.length) {
        setSelectedPortIdx(Math.max(0, ports.length - 1));
      }
      return { ...prev, moduleTemplates: tmpls };
    });
  };

  const handleResetTargetPortsToDefaults = () => {
    if (alignTarget === 'ChassisFront') {
      setEncData((prev) => ({
        ...prev,
        chassisPorts: {
          power: { posX: 0.048, posY: 0.93, width: 10, height: 10 },
          usb: { posX: 0.078, posY: 0.93, width: 10, height: 7 },
        },
      }));
      toast({ title: 'Chassis ports reset to factory defaults', status: 'info', duration: 2000 });
      return;
    }
    const factory = HX5_MODULE_TEMPLATES[alignTarget];
    if (!factory) return;
    setEncData((prev) => {
      const tmpls = { ...prev.moduleTemplates };
      tmpls[alignTarget] = {
        ...(tmpls[alignTarget] || {}),
        ports: JSON.parse(JSON.stringify(factory.ports || [])),
      };
      return { ...prev, moduleTemplates: tmpls };
    });
    setSelectedPortIdx(0);
    toast({ title: `Reset ${alignTarget} ports to factory defaults`, status: 'info', duration: 2000 });
  };

  const handleSnapPortsToSled = () => {
    if (alignTarget === 'ChassisFront') return;

    setEncData((prev) => {
      const tmpls = { ...prev.moduleTemplates };
      const current = { ...(tmpls[alignTarget] || HX5_MODULE_TEMPLATES[alignTarget]) };
      const ports = [...(current.ports || [])];
      const isVertical = ['HX1000', 'HX2000', 'HX3000', 'NodeBlank'].includes(alignTarget);

      if (isVertical) {
        let usbCount = 0;

        const updatedPorts = ports.map((p) => {
          const type = (p.type || '').toLowerCase();
          const name = (p.nameSuffix || '').toLowerCase();

          if (type.includes('hdmi') || type.includes('dp') || name.includes('dp')) {
            if (alignTarget === 'HX2000') {
              return { ...p, relX: 0.655, relY: 0.6623, width: 12, height: 9, rotation: 0 };
            } else if (alignTarget === 'HX1000') {
              return { ...p, relX: 0.6411, relY: 0.6688, width: 12, height: 9, rotation: 0 };
            } else if (alignTarget === 'HX3000') {
              return { ...p, relX: 0.6462, relY: 0.6639, width: 11, height: 8, rotation: 0 };
            } else {
              return { ...p, relX: 0.65, relY: 0.66, width: 12, height: 9, rotation: 0 };
            }
          } else if (type.includes('usb') || name.includes('usb')) {
            usbCount++;
            if (alignTarget === 'HX2000') {
              return usbCount === 1
                ? { ...p, relX: 0.3568, relY: 0.7879, width: 11, height: 8, rotation: 90 }
                : { ...p, relX: 0.6287, relY: 0.7830, width: 11, height: 8, rotation: 90 };
            } else if (alignTarget === 'HX1000') {
              return usbCount === 1
                ? { ...p, relX: 0.3718, relY: 0.7896, width: 11, height: 8, rotation: 90 }
                : { ...p, relX: 0.6507, relY: 0.7912, width: 11, height: 8, rotation: 90 };
            } else if (alignTarget === 'HX3000') {
              return usbCount === 1
                ? { ...p, relX: 0.6287, relY: 0.7781, width: 11, height: 8, rotation: 90 }
                : { ...p, relX: 0.3919, relY: 0.7814, width: 11, height: 8, rotation: 90 };
            } else {
              return usbCount === 1
                ? { ...p, relX: 0.38, relY: 0.785, width: 11, height: 8 }
                : { ...p, relX: 0.62, relY: 0.785, width: 11, height: 8 };
            }
          }
          return p;
        });

        current.ports = updatedPorts;
        tmpls[alignTarget] = current;

        toast({
          title: 'Ports Snapped to Sled Faceplate',
          description: `Aligned DisplayPort and USB ports directly to photographic sockets on ${current.name || alignTarget}.`,
          status: 'success',
          duration: 3000,
        });

        return { ...prev, moduleTemplates: tmpls };
      }

      if (alignTarget === 'N230') {
        const n230Ports = [
          ...Array.from({ length: 12 }, (_, i) => ({
            nameSuffix: `ETH-${i + 1}`,
            type: 'rj45',
            relX: Number((0.26 + i * 0.042).toFixed(4)),
            relY: i % 2 === 0 ? 0.32 : 0.68,
            orientation: i % 2 === 0 ? 'top' : 'bottom',
            width: 12,
            height: 10,
            description: `Node ${i + 1} 25GbE Fabric Connection`,
          })),
          { nameSuffix: '25G-1', type: 'sfp_plus', relX: 0.83, relY: 0.5, width: 15, height: 11, description: '25G SFP28 Uplink 1' },
          { nameSuffix: '25G-2', type: 'sfp_plus', relX: 0.88, relY: 0.5, width: 15, height: 11, description: '25G SFP28 Uplink 2' },
        ];
        current.ports = n230Ports;
        tmpls.N230 = current;
        toast({
          title: 'N230 25GbE Fabric Ports Aligned',
          description: 'Arranged 12x RJ45 node pass-through ports and 2x 25G SFP28 uplinks.',
          status: 'success',
          duration: 3000,
        });
        return { ...prev, moduleTemplates: tmpls };
      }

      toast({
        title: 'Preset Not Applicable',
        description: 'Auto-snap is designed for front compute node sleds (HX1000, HX2000, HX3000) and N230 fabric.',
        status: 'info',
        duration: 2500,
      });
      return prev;
    });
  };

  // ==========================================
  // TAB 4: PART DESCRIPTIONS & SILKSCREENS HANDLERS
  // ==========================================
  const handleUpdateDescription = (key, value) => {
    setEncData((prev) => ({
      ...prev,
      descriptions: {
        ...(prev.descriptions || {}),
        [key]: value,
      },
    }));
  };

  const handleUpdateTemplateMetadata = (moduleId, field, value) => {
    setEncData((prev) => {
      const tmpls = { ...prev.moduleTemplates };
      const current = { ...(tmpls[moduleId] || HX5_MODULE_TEMPLATES[moduleId] || {}) };
      current[field] = value;
      tmpls[moduleId] = current;
      return { ...prev, moduleTemplates: tmpls };
    });
  };

  const handleResetDescriptionsToDefaults = () => {
    const defaults = getDefaultHX5EnclosureData();
    setEncData((prev) => ({
      ...prev,
      descriptions: { ...defaults.descriptions },
    }));
    toast({ title: 'Descriptions and silkscreens reset to factory defaults', status: 'info', duration: 2000 });
  };


  // ==========================================
  // SAVE & APPLY TO DEVICE
  // ==========================================
  const handleSaveAndApply = async () => {
    try {
      // Recompute normalized ports for device based on new module configurations
      const generatedPorts = generateHX5DevicePorts(encData);

      if (onUpdateDevice && device) {
        await onUpdateDevice(device.id, {
          enclosureData: encData,
          ports: generatedPorts,
        });
      }

      toast({
        title: 'HX5 Enclosure Updated',
        description: `Configured ${encData.frontSlots.filter((s) => s.occupied).length} active front nodes & ${generatedPorts.length} total device ports.`,
        status: 'success',
        duration: 3000,
      });

      onClose();
    } catch (err) {
      toast({
        title: 'Failed to update HX5 Enclosure',
        description: err.message,
        status: 'error',
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
      <ModalOverlay backdropFilter="blur(3px)" />
      <ModalContent bg={modalBg} maxH="90vh" borderRadius="12px" overflow="hidden">
        {/* Header */}
        <ModalHeader borderBottom="1px solid" borderColor={borderCol} py="12px" px="20px">
          <Flex justify="space-between" align="center">
            <HStack spacing="10px">
              <Box
                w="32px"
                h="32px"
                borderRadius="8px"
                bg="brand.500"
                display="flex"
                alignItems="center"
                justifyContent="center"
                color="white">
                <Icon as={MdDeveloperBoard} w="20px" h="20px" />
              </Box>
              <Box>
                <HStack spacing="8px">
                  <Text fontSize="lg" fontWeight="800" letterSpacing="0.4px">
                    Amulet Hotkey HX5 Enclosure Configuration
                  </Text>
                  <Badge colorScheme="teal" fontSize="10px">
                    5U • 12 Nodes • Modular
                  </Badge>
                </HStack>
                <Text fontSize="xs" color={textMuted}>
                  Configure slot allocations, node workstations, rear IOMs, cooling fans, and customize module ports.
                </Text>
              </Box>
            </HStack>
          </Flex>
          <ModalCloseButton top="12px" right="16px" />
        </ModalHeader>

        {/* Modal Body with Tabs */}
        <ModalBody p="0">
          <Tabs
            index={activeTabIdx}
            onChange={(idx) => setActiveTabIdx(idx)}
            variant="enclosed"
            colorScheme="brand"
            isFitted>
            <TabList px="20px" pt="8px" borderBottom="1px solid" borderColor={borderCol}>
              <Tab fontWeight="700" fontSize="xs">
                <Icon as={MdViewModule} mr="6px" />
                1. Slot Allocation & Installed Modules
              </Tab>

              <Tab fontWeight="700" fontSize="xs">
                <Icon as={MdImage} mr="6px" />
                2. Image & Texture Mapping
              </Tab>
              <Tab fontWeight="700" fontSize="xs">
                <Icon as={MdTune} mr="6px" />
                3. Visual Port Alignment Studio
              </Tab>
              <Tab fontWeight="700" fontSize="xs">
                <Icon as={MdDescription} mr="6px" />
                4. Part Descriptions & Silkscreens
              </Tab>
            </TabList>


            <TabPanels>
              {/* ======================================================== */}
              {/* TAB 1: SLOT ALLOCATION & BAY MANAGER */}
              {/* ======================================================== */}
              <TabPanel p="20px">
                <VStack spacing="18px" align="stretch">
                  {/* Slot Category Selector Pills */}
                  <Flex justify="space-between" align="center" wrap="wrap" gap="8px">
                    <HStack spacing="6px">
                      <Button
                        size="xs"
                        variant={selectedSlotType === 'front' ? 'solid' : 'outline'}
                        colorScheme={selectedSlotType === 'front' ? 'brand' : 'gray'}
                        onClick={() => {
                          setSelectedSlotType('front');
                          setSelectedSlotNum(1);
                        }}>
                        Front Slots (1–12)
                      </Button>
                      <Button
                        size="xs"
                        variant={selectedSlotType === 'iom_top' ? 'solid' : 'outline'}
                        colorScheme={selectedSlotType === 'iom_top' ? 'teal' : 'gray'}
                        onClick={() => setSelectedSlotType('iom_top')}>
                        Rear Top IOM (Slot 1)
                      </Button>
                      <Button
                        size="xs"
                        variant={selectedSlotType === 'iom_bottom' ? 'solid' : 'outline'}
                        colorScheme={selectedSlotType === 'iom_bottom' ? 'teal' : 'gray'}
                        onClick={() => setSelectedSlotType('iom_bottom')}>
                        Rear Bottom IOM (Slot 2)
                      </Button>
                      <Button
                        size="xs"
                        variant={selectedSlotType === 'fan' ? 'solid' : 'outline'}
                        colorScheme={selectedSlotType === 'fan' ? 'cyan' : 'gray'}
                        onClick={() => setSelectedSlotType('fan')}>
                        Rear Cooling Fans (1–6)
                      </Button>
                      <Button
                        size="xs"
                        variant={selectedSlotType === 'psu' ? 'solid' : 'outline'}
                        colorScheme={selectedSlotType === 'psu' ? 'orange' : 'gray'}
                        onClick={() => setSelectedSlotType('psu')}>
                        Rear PSUs (1–4)
                      </Button>
                    </HStack>

                    {selectedSlotType === 'front' && (
                      <HStack spacing="6px">
                        <Button
                          size="xs"
                          variant="ghost"
                          colorScheme="brand"
                          onClick={() => handleBatchFrontSlots('fill_hx2000')}>
                          Fill Empty with HX2000
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          colorScheme="teal"
                          onClick={() => handleBatchFrontSlots('fill_blanks')}>
                          Fill Empty with Blanks
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleBatchFrontSlots('clear_all')}>
                          Clear All
                        </Button>
                      </HStack>
                    )}
                  </Flex>

                  {/* FRONT SLOTS MANAGER */}
                  {selectedSlotType === 'front' && (
                    <Box>
                      {/* Visual 12-Slot Picker Bar */}
                      <Text fontSize="xs" fontWeight="700" color={textMuted} mb="6px" textTransform="uppercase">
                        Select a Front Slot to Configure:
                      </Text>
                      <SimpleGrid columns={{ base: 6, md: 12 }} spacing="6px" mb="16px">
                        {(encData.frontSlots || []).map((slot) => {
                          const isSel = slot.slotNumber === selectedSlotNum;
                          const isOccupied = slot.occupied && slot.moduleType !== 'Empty';
                          const isBlank = slot.moduleType === 'NodeBlank';
                          const isPowerOn = slot.power === 'on';

                          return (
                            <Box
                              key={`slot-picker-${slot.slotNumber}`}
                              p="6px 4px"
                              borderRadius="6px"
                              border="2px solid"
                              borderColor={
                                isSel
                                  ? 'brand.500'
                                  : isOccupied
                                  ? isPowerOn
                                    ? '#3d9e99'
                                    : 'gray.500'
                                  : borderCol
                              }
                              bg={isSel ? 'brand.50' : cardBg}
                              _dark={{ bg: isSel ? 'whiteAlpha.200' : 'whiteAlpha.50' }}
                              cursor="pointer"
                              textAlign="center"
                              transition="all 0.15s"
                              _hover={{ transform: 'translateY(-2px)', borderColor: 'brand.400' }}
                              onClick={() => setSelectedSlotNum(slot.slotNumber)}>
                              <Flex justify="space-between" align="center" mb="4px">
                                <Text fontSize="9px" fontWeight="800">
                                  #{slot.slotNumber}
                                </Text>
                                <Box
                                  w="6px"
                                  h="6px"
                                  borderRadius="full"
                                  bg={
                                    !isOccupied
                                      ? 'gray.400'
                                      : isBlank
                                      ? 'gray.600'
                                      : isPowerOn
                                      ? '#48BB78'
                                      : '#A0AEC0'
                                  }
                                />
                              </Flex>
                              <Text
                                fontSize="10px"
                                fontWeight="800"
                                color={isOccupied ? (isBlank ? 'gray.400' : 'brand.400') : textMuted}
                                isTruncated>
                                {slot.moduleType}
                              </Text>
                            </Box>
                          );
                        })}
                      </SimpleGrid>

                      {/* Selected Front Slot Editor */}
                      {currentFrontSlot && (
                        <Box
                          p="16px"
                          borderRadius="8px"
                          border="1px solid"
                          borderColor={borderCol}
                          bg={cardBg}>
                          <Flex justify="space-between" align="center" mb="14px">
                            <HStack spacing="10px">
                              <Badge colorScheme="brand" fontSize="12px" px="8px" py="2px" borderRadius="4px">
                                Slot {currentFrontSlot.slotNumber}
                              </Badge>
                              <Text fontSize="sm" fontWeight="700">
                                Node Slot Configuration
                              </Text>
                            </HStack>
                            <HStack spacing="8px">
                              <Text fontSize="xs" fontWeight="600" color={textMuted}>
                                Power State:
                              </Text>
                              <Switch
                                colorScheme="green"
                                isChecked={currentFrontSlot.power === 'on'}
                                onChange={(e) =>
                                  handleUpdateFrontSlot(currentFrontSlot.slotNumber, {
                                    power: e.target.checked ? 'on' : 'off',
                                  })
                                }
                              />
                              <Badge
                                colorScheme={currentFrontSlot.power === 'on' ? 'green' : 'gray'}
                                fontSize="9px">
                                {currentFrontSlot.power?.toUpperCase()}
                              </Badge>
                            </HStack>
                          </Flex>

                          <SimpleGrid columns={{ base: 1, md: 3 }} spacing="16px">
                            {/* Module Type Selector */}
                            <FormControl>
                              <FormLabel fontSize="xs" fontWeight="700">
                                Installed Module
                              </FormLabel>
                              <Select
                                size="sm"
                                borderRadius="6px"
                                value={currentFrontSlot.moduleType || 'Empty'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  let newName = `Slot ${String(currentFrontSlot.slotNumber).padStart(2, '0')}`;
                                  let newSerial = null;
                                  if (val.startsWith('HX')) {
                                    newName = `Node-${String(currentFrontSlot.slotNumber).padStart(2, '0')} (${val})`;
                                    newSerial = `AH-${val.slice(0, 4)}-${String(currentFrontSlot.slotNumber).padStart(4, '0')}`;
                                  } else if (val === 'NodeBlank') {
                                    newName = `Blank Sled ${String(currentFrontSlot.slotNumber).padStart(2, '0')}`;
                                  }
                                  handleUpdateFrontSlot(currentFrontSlot.slotNumber, {
                                    moduleType: val,
                                    name: newName,
                                    serial: newSerial,
                                    power: val.startsWith('HX') ? 'on' : 'off',
                                  });
                                }}>
                                <option value="HX2000">CoreStation HX2000 (Dual GPU)</option>
                                <option value="HX1000">CoreStation HX1000 (Entry Compute)</option>
                                <option value="HX3000">CoreStation HX3000 (Quad Display)</option>
                                <option value="NodeBlank">Node Blanking Sled (Airflow Plate)</option>
                                <option value="Empty">Empty Slot (Unpopulated)</option>
                              </Select>
                            </FormControl>

                            {/* Node Name */}
                            <FormControl>
                              <FormLabel fontSize="xs" fontWeight="700">
                                Node Label / Hostname
                              </FormLabel>
                              <Input
                                size="sm"
                                borderRadius="6px"
                                value={currentFrontSlot.name || ''}
                                onChange={(e) =>
                                  handleUpdateFrontSlot(currentFrontSlot.slotNumber, {
                                    name: e.target.value,
                                  })
                                }
                                placeholder="e.g. Node-01 (HX2000)"
                              />
                            </FormControl>

                            {/* Serial Number */}
                            <FormControl>
                              <FormLabel fontSize="xs" fontWeight="700">
                                Serial Number
                              </FormLabel>
                              <Input
                                size="sm"
                                borderRadius="6px"
                                fontFamily="mono"
                                value={currentFrontSlot.serial || ''}
                                onChange={(e) =>
                                  handleUpdateFrontSlot(currentFrontSlot.slotNumber, {
                                    serial: e.target.value,
                                  })
                                }
                                placeholder="e.g. AH-HX20-0001"
                              />
                            </FormControl>
                          </SimpleGrid>

                          {/* Quick Module Preview Box */}
                          {currentFrontSlot.moduleType !== 'Empty' && (
                            <Flex
                              mt="14px"
                              p="10px"
                              borderRadius="6px"
                              bg="whiteAlpha.100"
                              border="1px solid"
                              borderColor={borderCol}
                              align="center"
                              justify="space-between">
                              <HStack spacing="12px">
                                {encData.moduleTemplates?.[currentFrontSlot.moduleType]?.image && (
                                  <Image
                                    src={encData.moduleTemplates[currentFrontSlot.moduleType].image}
                                    alt={currentFrontSlot.moduleType}
                                    h="36px"
                                    w="auto"
                                    borderRadius="4px"
                                    bg="blackAlpha.400"
                                    p="2px"
                                  />
                                )}
                                <Box>
                                  <Text fontSize="xs" fontWeight="800">
                                    {encData.moduleTemplates?.[currentFrontSlot.moduleType]?.name || currentFrontSlot.moduleType}
                                  </Text>
                                  <Text fontSize="10px" color={textMuted}>
                                    {encData.moduleTemplates?.[currentFrontSlot.moduleType]?.description || 'Amulet Hotkey Module'}
                                  </Text>
                                </Box>
                              </HStack>
                              <Badge colorScheme="blue" fontSize="10px">
                                {(encData.moduleTemplates?.[currentFrontSlot.moduleType]?.ports || []).length} Ports Exposed
                              </Badge>
                            </Flex>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* REAR TOP IOM MANAGER (SLOT 1) */}
                  {selectedSlotType === 'iom_top' && currentIomTop && (
                    <Box p="16px" borderRadius="8px" border="1px solid" borderColor={borderCol} bg={cardBg}>
                      <Flex justify="space-between" align="center" mb="14px">
                        <HStack spacing="10px">
                          <Badge colorScheme="teal" fontSize="12px" px="8px" py="2px" borderRadius="4px">
                            Rear Slot 1 (Top IOM Bay)
                          </Badge>
                          <Text fontSize="sm" fontWeight="700">
                            Primary Network I/O Module
                          </Text>
                        </HStack>
                        <Badge colorScheme="green" fontSize="10px">
                          {currentIomTop.status?.toUpperCase() || 'ONLINE'}
                        </Badge>
                      </Flex>

                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing="16px">
                        <FormControl>
                          <FormLabel fontSize="xs" fontWeight="700">
                            Installed IOM Module (Top Slot)
                          </FormLabel>
                          <Select
                            size="sm"
                            borderRadius="6px"
                            value={currentIomTop.installedModule || 'N120'}
                            onChange={(e) =>
                              handleUpdateIOM(1, {
                                installedModule: e.target.value,
                                name: `IOM Top (${e.target.value})`,
                              })
                            }>
                            <option value="N100">N100 1GbE Pass-Through IOM (12x RJ45 Pass + MGMT + CNSL)</option>
                            <option value="N120">N120 10GbE Switch IOM (12x RJ45 + 4x SFP+ + 2x MGMT + CNSL)</option>
                            <option value="Empty">Empty Bay (Unpopulated)</option>
                          </Select>
                        </FormControl>

                        <FormControl>
                          <FormLabel fontSize="xs" fontWeight="700">
                            Module Display Name
                          </FormLabel>
                          <Input
                            size="sm"
                            borderRadius="6px"
                            value={currentIomTop.name || ''}
                            onChange={(e) => handleUpdateIOM(1, { name: e.target.value })}
                          />
                        </FormControl>
                      </SimpleGrid>

                      {/* Visual Preview */}
                      {currentIomTop.installedModule !== 'Empty' && (
                        <Box mt="14px" p="10px" borderRadius="6px" bg="whiteAlpha.100" border="1px solid" borderColor={borderCol}>
                          <HStack spacing="12px" mb="8px">
                            {encData.moduleTemplates?.[currentIomTop.installedModule]?.image && (
                              <Image
                                src={encData.moduleTemplates[currentIomTop.installedModule].image}
                                alt={currentIomTop.installedModule}
                                h="44px"
                                w="auto"
                                borderRadius="4px"
                              />
                            )}
                            <Box>
                              <Text fontSize="xs" fontWeight="800">
                                {encData.moduleTemplates?.[currentIomTop.installedModule]?.name}
                              </Text>
                              <Text fontSize="10px" color={textMuted}>
                                {encData.moduleTemplates?.[currentIomTop.installedModule]?.description}
                              </Text>
                            </Box>
                          </HStack>
                          <Text fontSize="10px" color="teal.400" fontWeight="700">
                            Exposes {(encData.moduleTemplates?.[currentIomTop.installedModule]?.ports || []).length} active rear ports on Slot 1.
                          </Text>
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* REAR BOTTOM IOM MANAGER (SLOT 2) */}
                  {selectedSlotType === 'iom_bottom' && currentIomBottom && (
                    <Box p="16px" borderRadius="8px" border="1px solid" borderColor={borderCol} bg={cardBg}>
                      <Flex justify="space-between" align="center" mb="14px">
                        <HStack spacing="10px">
                          <Badge colorScheme="teal" fontSize="12px" px="8px" py="2px" borderRadius="4px">
                            Rear Slot 2 (Bottom IOM Bay)
                          </Badge>
                          <Text fontSize="sm" fontWeight="700">
                            Secondary Network / Expansion Module
                          </Text>
                        </HStack>
                        <Badge colorScheme="green" fontSize="10px">
                          {currentIomBottom.status?.toUpperCase() || 'ONLINE'}
                        </Badge>
                      </Flex>

                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing="16px">
                        <FormControl>
                          <FormLabel fontSize="xs" fontWeight="700">
                            Installed IOM Module (Bottom Slot)
                          </FormLabel>
                          <Select
                            size="sm"
                            borderRadius="6px"
                            value={currentIomBottom.installedModule || 'N205'}
                            onChange={(e) =>
                              handleUpdateIOM(2, {
                                installedModule: e.target.value,
                                name: `IOM Bottom (${e.target.value})`,
                              })
                            }>
                            <option value="IOMBlank">IOM Blanking Plate (Solid Airflow Cover)</option>
                            <option value="N205">N205 Secondary Pass-Through IOM (12x Secondary RJ45)</option>
                            <option value="N230">N230 25GbE Fabric IOM (12x RJ45 + 2x 25G SFP28)</option>
                            <option value="Empty">Empty Bay (Unpopulated)</option>
                          </Select>
                        </FormControl>

                        <FormControl>
                          <FormLabel fontSize="xs" fontWeight="700">
                            Module Display Name
                          </FormLabel>
                          <Input
                            size="sm"
                            borderRadius="6px"
                            value={currentIomBottom.name || ''}
                            onChange={(e) => handleUpdateIOM(2, { name: e.target.value })}
                          />
                        </FormControl>
                      </SimpleGrid>

                      {/* Visual Preview */}
                      {currentIomBottom.installedModule !== 'Empty' && (
                        <Box mt="14px" p="10px" borderRadius="6px" bg="whiteAlpha.100" border="1px solid" borderColor={borderCol}>
                          <HStack spacing="12px" mb="8px">
                            {encData.moduleTemplates?.[currentIomBottom.installedModule]?.image && (
                              <Image
                                src={encData.moduleTemplates[currentIomBottom.installedModule].image}
                                alt={currentIomBottom.installedModule}
                                h="44px"
                                w="auto"
                                borderRadius="4px"
                              />
                            )}
                            <Box>
                              <Text fontSize="xs" fontWeight="800">
                                {encData.moduleTemplates?.[currentIomBottom.installedModule]?.name}
                              </Text>
                              <Text fontSize="10px" color={textMuted}>
                                {encData.moduleTemplates?.[currentIomBottom.installedModule]?.description}
                              </Text>
                            </Box>
                          </HStack>
                          <Text fontSize="10px" color="teal.400" fontWeight="700">
                            Exposes {(encData.moduleTemplates?.[currentIomBottom.installedModule]?.ports || []).length} active rear ports on Slot 2.
                          </Text>
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* REAR FANS MANAGER */}
                  {selectedSlotType === 'fan' && (
                    <Box p="16px" borderRadius="8px" border="1px solid" borderColor={borderCol} bg={cardBg}>
                      <Flex justify="space-between" align="center" mb="12px">
                        <Text fontSize="sm" fontWeight="700">
                          Hot-Plug Dual-Rotor Cooling Fans (6 Bays)
                        </Text>
                        <Badge colorScheme="cyan" fontSize="10px">
                          {(encData.rearModules?.fans || []).filter((f) => f.installed).length}/6 Installed
                        </Badge>
                      </Flex>
                      <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing="10px">
                        {(encData.rearModules?.fans || []).map((fan) => (
                          <Box
                            key={`fan-${fan.slotNumber}`}
                            p="10px"
                            borderRadius="6px"
                            border="1px solid"
                            borderColor={fan.installed ? 'cyan.500' : borderCol}
                            bg="whiteAlpha.100"
                            textAlign="center">
                            <Text fontSize="xs" fontWeight="800" mb="6px">
                              Fan {fan.slotNumber}
                            </Text>
                            <Box w="32px" h="32px" mx="auto" mb="6px" borderRadius="full" bg="#1A2234" border="1px solid #283141" display="flex" alignItems="center" justifyContent="center">
                              <Box w="10px" h="10px" borderRadius="full" bg={fan.installed ? '#48BB78' : '#718096'} />
                            </Box>
                            <Switch
                              size="sm"
                              colorScheme="cyan"
                              isChecked={fan.installed}
                              onChange={(e) => handleUpdateFan(fan.slotNumber, { installed: e.target.checked })}
                            />
                            <Text fontSize="9px" color={textMuted} mt="4px">
                              {fan.installed ? `${fan.rpm || 6400} RPM` : 'Empty'}
                            </Text>
                          </Box>
                        ))}
                      </SimpleGrid>
                    </Box>
                  )}

                  {/* REAR PSUS MANAGER */}
                  {selectedSlotType === 'psu' && (
                    <Box p="16px" borderRadius="8px" border="1px solid" borderColor={borderCol} bg={cardBg}>
                      <Flex justify="space-between" align="center" mb="12px">
                        <Text fontSize="sm" fontWeight="700">
                          1600W Titanium Power Supplies (4 Bays)
                        </Text>
                        <Badge colorScheme="orange" fontSize="10px">
                          {(encData.rearModules?.psus || []).filter((p) => p.installed).length}/4 Installed
                        </Badge>
                      </Flex>
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing="12px">
                        {(encData.rearModules?.psus || []).map((psu) => (
                          <Box
                            key={`psu-${psu.slotNumber}`}
                            p="12px"
                            borderRadius="6px"
                            border="1px solid"
                            borderColor={psu.installed ? 'orange.400' : borderCol}
                            bg="whiteAlpha.100">
                            <Flex justify="space-between" align="center" mb="8px">
                              <Text fontSize="xs" fontWeight="800">
                                PSU {psu.slotNumber}
                              </Text>
                              <Switch
                                size="sm"
                                colorScheme="orange"
                                isChecked={psu.installed}
                                onChange={(e) => handleUpdatePSU(psu.slotNumber, { installed: e.target.checked })}
                              />
                            </Flex>
                            <Text fontSize="10px" color={textMuted}>
                              {psu.installed ? '1600W Titanium (AC In C14)' : 'Unpopulated'}
                            </Text>
                            <Badge colorScheme={psu.installed ? 'green' : 'gray'} fontSize="9px" mt="4px">
                              {psu.installed ? 'AC POWER OK' : 'OFFLINE'}
                            </Badge>
                          </Box>
                        ))}
                      </SimpleGrid>
                    </Box>
                  )}
                </VStack>
              </TabPanel>

              {/* ======================================================== */}
              {/* TAB 2: IMAGE & TEXTURE MAPPING */}
              {/* ======================================================== */}
              <TabPanel p="20px">
                <VStack spacing="18px" align="stretch">
                  <Flex justify="space-between" align="center" wrap="wrap" gap="8px">
                    <Box>
                      <Text fontSize="md" fontWeight="800">
                        Chassis & Module Texture Customizer
                      </Text>
                      <Text fontSize="xs" color={textMuted}>
                        Assign any image from the 27 catalog renders in public/ or specify custom URLs for any section of the HX5 enclosure.
                      </Text>
                    </Box>
                    <Button
                      size="xs"
                      variant="outline"
                      colorScheme="gray"
                      leftIcon={<Icon as={MdOutlineRefresh} />}
                      onClick={handleResetAllImages}>
                      Reset All Textures to Factory Defaults
                    </Button>
                  </Flex>

                  {/* Section 1: Chassis Base Images */}
                  <Box p="14px" borderRadius="8px" border="1px solid" borderColor={borderCol} bg={cardBg}>
                    <Text fontSize="xs" fontWeight="800" textTransform="uppercase" color="teal.500" mb="12px">
                      1. Chassis Enclosure Bases (Front & Rear)
                    </Text>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing="16px">
                      {/* Front Chassis */}
                      <Box p="12px" borderRadius="6px" border="1px solid" borderColor={borderCol} bg="whiteAlpha.100">
                        <HStack spacing="12px" mb="10px" align="start">
                          <Image
                            src={encData.images?.frontChassis || '/enclosure_front_empty.jpg'}
                            alt="Front Chassis"
                            w="80px"
                            h="50px"
                            objectFit="cover"
                            borderRadius="4px"
                            border="1px solid rgba(255,255,255,0.2)"
                          />
                          <Box flex="1">
                            <Text fontSize="xs" fontWeight="700">
                              Front Chassis Base Frame
                            </Text>
                            <Text fontSize="10px" color={textMuted}>
                              Background plate for 12 front node sleds & bottom bezel
                            </Text>
                          </Box>
                        </HStack>
                        <FormControl mb="8px">
                          <FormLabel fontSize="10px" mb="2px">
                            Select Image Asset:
                          </FormLabel>
                          <Select
                            size="xs"
                            borderRadius="4px"
                            value={encData.images?.frontChassis || '/enclosure_front_empty.jpg'}
                            onChange={(e) => handleUpdateChassisImage('frontChassis', e.target.value)}>
                            {AVAILABLE_HX5_IMAGES.map((img) => (
                              <option key={`fc-${img.path}`} value={img.path}>
                                [{img.category}] {img.name} ({img.path})
                              </option>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl mb="8px">
                          <FormLabel fontSize="10px" mb="2px">
                            Custom Image Path / URL:
                          </FormLabel>
                          <Input
                            size="xs"
                            borderRadius="4px"
                            value={encData.images?.frontChassis || ''}
                            onChange={(e) => handleUpdateChassisImage('frontChassis', e.target.value)}
                            placeholder="/enclosure_front_empty.jpg"
                          />
                        </FormControl>
                        <FormControl>
                          <Flex justify="space-between" align="center">
                            <FormLabel fontSize="10px" mb="0">
                              Overlay Opacity:
                            </FormLabel>
                            <Text fontSize="10px" fontWeight="700">
                              {Math.round((encData.images?.frontChassisOpacity ?? 0.35) * 100)}%
                            </Text>
                          </Flex>
                          <Slider
                            value={encData.images?.frontChassisOpacity ?? 0.35}
                            min={0.05}
                            max={1}
                            step={0.05}
                            onChange={(val) => handleUpdateChassisImage('frontChassisOpacity', val)}>
                            <SliderTrack bg="gray.600">
                              <SliderFilledTrack bg="brand.500" />
                            </SliderTrack>
                            <SliderThumb />
                          </Slider>
                        </FormControl>
                      </Box>

                      {/* Rear Chassis */}
                      <Box p="12px" borderRadius="6px" border="1px solid" borderColor={borderCol} bg="whiteAlpha.100">
                        <HStack spacing="12px" mb="10px" align="start">
                          <Image
                            src={encData.images?.rearChassis || '/enclosure_rear_empty.png'}
                            alt="Rear Chassis"
                            w="80px"
                            h="50px"
                            objectFit="cover"
                            borderRadius="4px"
                            border="1px solid rgba(255,255,255,0.2)"
                          />
                          <Box flex="1">
                            <Text fontSize="xs" fontWeight="700">
                              Rear Chassis Base Frame
                            </Text>
                            <Text fontSize="10px" color={textMuted}>
                              Background frame for Fans, Top/Bottom IOMs, and 4 PSUs
                            </Text>
                          </Box>
                        </HStack>
                        <FormControl mb="8px">
                          <FormLabel fontSize="10px" mb="2px">
                            Select Image Asset:
                          </FormLabel>
                          <Select
                            size="xs"
                            borderRadius="4px"
                            value={encData.images?.rearChassis || '/enclosure_rear_empty.png'}
                            onChange={(e) => handleUpdateChassisImage('rearChassis', e.target.value)}>
                            {AVAILABLE_HX5_IMAGES.map((img) => (
                              <option key={`rc-${img.path}`} value={img.path}>
                                [{img.category}] {img.name} ({img.path})
                              </option>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl mb="8px">
                          <FormLabel fontSize="10px" mb="2px">
                            Custom Image Path / URL:
                          </FormLabel>
                          <Input
                            size="xs"
                            borderRadius="4px"
                            value={encData.images?.rearChassis || ''}
                            onChange={(e) => handleUpdateChassisImage('rearChassis', e.target.value)}
                            placeholder="/enclosure_rear_empty.png"
                          />
                        </FormControl>
                        <FormControl>
                          <Flex justify="space-between" align="center">
                            <FormLabel fontSize="10px" mb="0">
                              Overlay Opacity:
                            </FormLabel>
                            <Text fontSize="10px" fontWeight="700">
                              {Math.round((encData.images?.rearChassisOpacity ?? 0.25) * 100)}%
                            </Text>
                          </Flex>
                          <Slider
                            value={encData.images?.rearChassisOpacity ?? 0.25}
                            min={0.05}
                            max={1}
                            step={0.05}
                            onChange={(val) => handleUpdateChassisImage('rearChassisOpacity', val)}>
                            <SliderTrack bg="gray.600">
                              <SliderFilledTrack bg="brand.500" />
                            </SliderTrack>
                            <SliderThumb />
                          </Slider>
                        </FormControl>
                      </Box>
                    </SimpleGrid>
                  </Box>

                  {/* Section 2: Front Compute Node Sled Textures */}
                  <Box p="14px" borderRadius="8px" border="1px solid" borderColor={borderCol} bg={cardBg}>
                    <Text fontSize="xs" fontWeight="800" textTransform="uppercase" color="blue.400" mb="12px">
                      2. Front Compute Node Sled Textures (Slots 1–12)
                    </Text>
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing="14px">
                      {['HX1000', 'HX2000', 'HX3000', 'NodeBlank'].map((modId) => {
                        const tmpl = encData.moduleTemplates?.[modId] || HX5_MODULE_TEMPLATES[modId] || {};
                        return (
                          <Box key={`tex-${modId}`} p="10px" borderRadius="6px" border="1px solid" borderColor={borderCol} bg="whiteAlpha.100">
                            <HStack spacing="10px" mb="8px">
                              <Image
                                src={tmpl.image}
                                alt={modId}
                                w="36px"
                                h="70px"
                                objectFit="cover"
                                borderRadius="3px"
                                border="1px solid rgba(255,255,255,0.15)"
                              />
                              <Box>
                                <Text fontSize="xs" fontWeight="800">
                                  {tmpl.name || modId}
                                </Text>
                                <Badge fontSize="9px" colorScheme={modId === 'NodeBlank' ? 'gray' : 'teal'}>
                                  {modId}
                                </Badge>
                              </Box>
                            </HStack>
                            <FormControl mb="6px">
                              <FormLabel fontSize="9px" mb="1px">
                                Select Image:
                              </FormLabel>
                              <Select
                                size="xs"
                                borderRadius="4px"
                                value={tmpl.image || ''}
                                onChange={(e) => handleUpdateTemplateImage(modId, 'image', e.target.value)}>
                                {AVAILABLE_HX5_IMAGES.filter((img) => img.category === 'Nodes' || img.category === 'Chassis').map((img) => (
                                  <option key={`opt-${modId}-${img.path}`} value={img.path}>
                                    {img.name}
                                  </option>
                                ))}
                              </Select>
                            </FormControl>
                            <FormControl>
                              <FormLabel fontSize="9px" mb="1px">
                                Custom Path:
                              </FormLabel>
                              <Input
                                size="xs"
                                borderRadius="4px"
                                value={tmpl.image || ''}
                                onChange={(e) => handleUpdateTemplateImage(modId, 'image', e.target.value)}
                                placeholder="/node_detail_hx2000.png"
                              />
                            </FormControl>
                          </Box>
                        );
                      })}
                    </SimpleGrid>
                  </Box>

                  {/* Section 3: Rear Modules, IOMs, Fans & PSUs */}
                  <Box p="14px" borderRadius="8px" border="1px solid" borderColor={borderCol} bg={cardBg}>
                    <Text fontSize="xs" fontWeight="800" textTransform="uppercase" color="orange.400" mb="12px">
                      3. Rear Modules, I/O Modules (IOMs), Fans & Power
                    </Text>
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing="14px">
                      {/* Fans */}
                      <Box p="10px" borderRadius="6px" border="1px solid" borderColor={borderCol} bg="whiteAlpha.100">
                        <HStack spacing="10px" mb="8px">
                          <Image
                            src={encData.images?.fans || '/fan.jpg'}
                            alt="Cooling Fan"
                            w="48px"
                            h="48px"
                            objectFit="cover"
                            borderRadius="3px"
                            border="1px solid rgba(255,255,255,0.15)"
                          />
                          <Box>
                            <Text fontSize="xs" fontWeight="800">
                              Cooling Fan Module
                            </Text>
                            <Text fontSize="9px" color={textMuted}>
                              6x Hot-plug fan bays
                            </Text>
                          </Box>
                        </HStack>
                        <Select
                          size="xs"
                          borderRadius="4px"
                          mb="6px"
                          value={encData.images?.fans || '/fan.jpg'}
                          onChange={(e) => {
                            handleUpdateChassisImage('fans', e.target.value);
                            handleUpdateTemplateImage('Fan', 'image', e.target.value);
                          }}>
                          {AVAILABLE_HX5_IMAGES.filter((i) => i.category === 'Cooling' || i.category === 'IOMs').map((img) => (
                            <option key={`fan-img-${img.path}`} value={img.path}>
                              {img.name}
                            </option>
                          ))}
                        </Select>
                        <Input
                          size="xs"
                          borderRadius="4px"
                          value={encData.images?.fans || ''}
                          onChange={(e) => {
                            handleUpdateChassisImage('fans', e.target.value);
                            handleUpdateTemplateImage('Fan', 'image', e.target.value);
                          }}
                          placeholder="/fan.jpg"
                        />
                      </Box>

                      {/* Top IOM N120 */}
                      <Box p="10px" borderRadius="6px" border="1px solid" borderColor={borderCol} bg="whiteAlpha.100">
                        <HStack spacing="10px" mb="8px">
                          <Box position="relative" w="64px" h="36px" borderRadius="3px" overflow="hidden">
                            <Image
                              src={encData.moduleTemplates?.N120?.image || '/n120.jpg'}
                              alt="N120 Base"
                              w="100%"
                              h="100%"
                              objectFit="cover"
                            />
                            {encData.moduleTemplates?.N120?.overlay && (
                              <Image
                                src={encData.moduleTemplates.N120.overlay}
                                alt="N120 Overlay"
                                position="absolute"
                                inset="0"
                                w="100%"
                                h="100%"
                                objectFit="cover"
                              />
                            )}
                          </Box>
                          <Box>
                            <Text fontSize="xs" fontWeight="800">
                              Top IOM (N120 / N100)
                            </Text>
                            <Text fontSize="9px" color={textMuted}>
                              Base texture + transparent port overlay
                            </Text>
                          </Box>
                        </HStack>
                        <FormControl mb="4px">
                          <FormLabel fontSize="9px" mb="1px">Base Texture:</FormLabel>
                          <Select
                            size="xs"
                            borderRadius="4px"
                            value={encData.moduleTemplates?.N120?.image || '/n120.jpg'}
                            onChange={(e) => {
                              handleUpdateTemplateImage('N120', 'image', e.target.value);
                              handleUpdateTemplateImage('N100', 'image', e.target.value);
                            }}>
                            {AVAILABLE_HX5_IMAGES.filter((i) => i.category === 'IOMs').map((img) => (
                              <option key={`top-base-${img.path}`} value={img.path}>
                                {img.name}
                              </option>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl>
                          <FormLabel fontSize="9px" mb="1px">Overlay Texture:</FormLabel>
                          <Select
                            size="xs"
                            borderRadius="4px"
                            value={encData.moduleTemplates?.N120?.overlay || '/n120_trans_over.png'}
                            onChange={(e) => {
                              handleUpdateTemplateImage('N120', 'overlay', e.target.value);
                              handleUpdateTemplateImage('N100', 'overlay', e.target.value);
                            }}>
                            {AVAILABLE_HX5_IMAGES.filter((i) => i.category === 'IOMs').map((img) => (
                              <option key={`top-over-${img.path}`} value={img.path}>
                                {img.name}
                              </option>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>

                      {/* Bottom IOM: N205 Secondary Pass-Through */}
                      <Box p="10px" borderRadius="6px" border="1px solid" borderColor={borderCol} bg="whiteAlpha.100">
                        <HStack spacing="10px" mb="8px" justify="space-between">
                          <HStack spacing="10px">
                            <Box position="relative" w="64px" h="36px" borderRadius="3px" overflow="hidden" bg="#161E30">
                              <Image
                                src={encData.moduleTemplates?.N205?.image || '/n205.jpg'}
                                alt="N205 Base"
                                w="100%"
                                h="100%"
                                objectFit="cover"
                              />
                              {encData.moduleTemplates?.N205?.overlay && (
                                <Image
                                  src={encData.moduleTemplates.N205.overlay}
                                  alt="N205 Overlay"
                                  position="absolute"
                                  inset="0"
                                  w="100%"
                                  h="100%"
                                  objectFit="cover"
                                />
                              )}
                            </Box>
                            <Box>
                              <Text fontSize="xs" fontWeight="800">
                                Bottom IOM: N205 Secondary Pass-Through
                              </Text>
                              <Text fontSize="9px" color={textMuted}>
                                12x Node secondary 1GbE pass-through module
                              </Text>
                            </Box>
                          </HStack>
                          <Badge colorScheme="teal" fontSize="8px">
                            1GbE
                          </Badge>
                        </HStack>
                        <FormControl mb="4px">
                          <FormLabel fontSize="9px" mb="1px">Base Texture:</FormLabel>
                          <Select
                            size="xs"
                            borderRadius="4px"
                            value={encData.moduleTemplates?.N205?.image || '/n205.jpg'}
                            onChange={(e) => handleUpdateTemplateImage('N205', 'image', e.target.value)}>
                            {AVAILABLE_HX5_IMAGES.filter((i) => i.category === 'IOMs').map((img) => (
                              <option key={`n205-base-${img.path}`} value={img.path}>
                                {img.name}
                              </option>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl>
                          <FormLabel fontSize="9px" mb="1px">Overlay Texture:</FormLabel>
                          <Select
                            size="xs"
                            borderRadius="4px"
                            value={encData.moduleTemplates?.N205?.overlay || '/n205_trans_over.png'}
                            onChange={(e) => handleUpdateTemplateImage('N205', 'overlay', e.target.value)}>
                            <option value="">None (No Overlay)</option>
                            {AVAILABLE_HX5_IMAGES.filter((i) => i.category === 'IOMs').map((img) => (
                              <option key={`n205-over-${img.path}`} value={img.path}>
                                {img.name}
                              </option>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>

                      {/* Bottom IOM: N230 25GbE Fabric (Separate Module & Image - To Come) */}
                      <Box p="10px" borderRadius="6px" border="1px solid" borderColor="orange.400" bg="rgba(237, 137, 54, 0.05)">
                        <HStack spacing="10px" mb="8px" justify="space-between">
                          <HStack spacing="10px">
                            <Box position="relative" w="64px" h="36px" borderRadius="3px" overflow="hidden" bg="#161E30" border="1px dashed" borderColor="orange.400">
                              <Image
                                src={encData.moduleTemplates?.N230?.image || '/n230.jpg'}
                                alt="N230 Base"
                                w="100%"
                                h="100%"
                                objectFit="cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/network.jpg';
                                }}
                              />
                              {encData.moduleTemplates?.N230?.overlay && (
                                <Image
                                  src={encData.moduleTemplates.N230.overlay}
                                  alt="N230 Overlay"
                                  position="absolute"
                                  inset="0"
                                  w="100%"
                                  h="100%"
                                  objectFit="cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              )}
                            </Box>
                            <Box>
                              <HStack spacing="6px">
                                <Text fontSize="xs" fontWeight="800">
                                  Bottom IOM: N230 25GbE Fabric
                                </Text>
                                <Badge colorScheme="orange" fontSize="8px" variant="solid">
                                  Image To Come
                                </Badge>
                              </HStack>
                              <Text fontSize="9px" color="orange.300">
                                High-speed 25GbE fabric (12x Node + 2x 25G SFP28). Separate image from N205.
                              </Text>
                            </Box>
                          </HStack>
                          <Badge colorScheme="purple" fontSize="8px">
                            25GbE + SFP28
                          </Badge>
                        </HStack>
                        <FormControl mb="4px">
                          <Flex justify="space-between" align="center" mb="1px">
                            <FormLabel fontSize="9px" mb="0">Base Texture (Separate Image):</FormLabel>
                            <Text fontSize="8px" color="gray.400">Fallback: /network.jpg</Text>
                          </Flex>
                          <Select
                            size="xs"
                            borderRadius="4px"
                            value={encData.moduleTemplates?.N230?.image || '/n230.jpg'}
                            onChange={(e) => handleUpdateTemplateImage('N230', 'image', e.target.value)}>
                            {AVAILABLE_HX5_IMAGES.filter((i) => i.category === 'IOMs').map((img) => (
                              <option key={`n230-base-${img.path}`} value={img.path}>
                                {img.name}
                              </option>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl mb="4px">
                          <FormLabel fontSize="9px" mb="1px">Custom Image File Path (when uploaded):</FormLabel>
                          <HStack spacing="4px">
                            <Input
                              size="xs"
                              borderRadius="4px"
                              placeholder="/n230.jpg or /n230.png"
                              value={encData.moduleTemplates?.N230?.image || ''}
                              onChange={(e) => handleUpdateTemplateImage('N230', 'image', e.target.value)}
                            />
                            <Button
                              size="xs"
                              variant="outline"
                              colorScheme="orange"
                              onClick={() => handleUpdateTemplateImage('N230', 'image', '/n230.jpg')}>
                              Set /n230.jpg
                            </Button>
                          </HStack>
                        </FormControl>
                        <FormControl>
                          <FormLabel fontSize="9px" mb="1px">Overlay Texture:</FormLabel>
                          <Select
                            size="xs"
                            borderRadius="4px"
                            value={encData.moduleTemplates?.N230?.overlay || '/n230_trans_over.png'}
                            onChange={(e) => handleUpdateTemplateImage('N230', 'overlay', e.target.value)}>
                            <option value="">None (No Overlay)</option>
                            {AVAILABLE_HX5_IMAGES.filter((i) => i.category === 'IOMs').map((img) => (
                              <option key={`n230-over-${img.path}`} value={img.path}>
                                {img.name}
                              </option>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>

                      {/* Bottom IOM Blank Plate */}
                      <Box p="10px" borderRadius="6px" border="1px solid" borderColor={borderCol} bg="whiteAlpha.100">
                        <HStack spacing="10px" mb="8px">
                          <Image
                            src={encData.moduleTemplates?.IOMBlank?.image || '/blank.jpg'}
                            alt="IOM Blank"
                            w="64px"
                            h="36px"
                            objectFit="cover"
                            borderRadius="3px"
                            border="1px solid rgba(255,255,255,0.15)"
                          />
                          <Box>
                            <Text fontSize="xs" fontWeight="800">
                              Bottom IOM Airflow Blank
                            </Text>
                            <Text fontSize="9px" color={textMuted}>
                              Solid plate when Slot 2 is empty
                            </Text>
                          </Box>
                        </HStack>
                        <Select
                          size="xs"
                          borderRadius="4px"
                          value={encData.moduleTemplates?.IOMBlank?.image || '/blank.jpg'}
                          onChange={(e) => handleUpdateTemplateImage('IOMBlank', 'image', e.target.value)}>
                          {AVAILABLE_HX5_IMAGES.filter((i) => i.category === 'IOMs' || i.category === 'Nodes').map((img) => (
                            <option key={`iom-blk-${img.path}`} value={img.path}>
                              {img.name}
                            </option>
                          ))}
                        </Select>
                      </Box>

                      {/* Power Supplies (PSUs) */}
                      <Box p="10px" borderRadius="6px" border="1px solid" borderColor={borderCol} bg="whiteAlpha.100">
                        <HStack spacing="10px" mb="8px">
                          <Image
                            src={encData.images?.psus || '/psu.jpg'}
                            alt="PSU"
                            w="64px"
                            h="36px"
                            objectFit="cover"
                            borderRadius="3px"
                            border="1px solid rgba(255,255,255,0.15)"
                          />
                          <Box>
                            <Text fontSize="xs" fontWeight="800">
                              1600W Titanium Power Supply
                            </Text>
                            <Text fontSize="9px" color={textMuted}>
                              4x hot-plug PSU slots (AC In C14)
                            </Text>
                          </Box>
                        </HStack>
                        <Select
                          size="xs"
                          borderRadius="4px"
                          mb="6px"
                          value={encData.images?.psus || '/psu.jpg'}
                          onChange={(e) => {
                            handleUpdateChassisImage('psus', e.target.value);
                            handleUpdateTemplateImage('PSU', 'image', e.target.value);
                          }}>
                          {AVAILABLE_HX5_IMAGES.filter((i) => i.category === 'Power' || i.category === 'IOMs').map((img) => (
                            <option key={`psu-img-${img.path}`} value={img.path}>
                              {img.name}
                            </option>
                          ))}
                        </Select>
                        <Input
                          size="xs"
                          borderRadius="4px"
                          value={encData.images?.psus || ''}
                          onChange={(e) => {
                            handleUpdateChassisImage('psus', e.target.value);
                            handleUpdateTemplateImage('PSU', 'image', e.target.value);
                          }}
                          placeholder="/psu.jpg"
                        />
                      </Box>
                    </SimpleGrid>
                  </Box>
                </VStack>
              </TabPanel>

              {/* ======================================================== */}
              {/* TAB 3: VISUAL PORT ALIGNMENT & CALIBRATION STUDIO */}
              {/* ======================================================== */}
              <TabPanel p="20px">
                <VStack spacing="16px" align="stretch">
                  {/* Studio Toolbar */}
                  <Flex justify="space-between" align="center" wrap="wrap" gap="10px">
                    <HStack spacing="10px">
                      <Text fontSize="xs" fontWeight="800" textTransform="uppercase" color={textMuted}>
                        Calibrate Target:
                      </Text>
                      <Select
                        aria-label="Calibrate Target"
                        size="sm"
                        w="280px"
                        borderRadius="6px"
                        fontWeight="700"
                        value={alignTarget}
                        onChange={(e) => {
                          setAlignTarget(e.target.value);
                          setSelectedPortIdx(0);
                        }}>
                        <optgroup label="Front Compute Node Sleds">
                          <option value="HX2000">CoreStation HX2000 (Dual GPU)</option>
                          <option value="HX1000">CoreStation HX1000 (Entry Compute)</option>
                          <option value="HX3000">CoreStation HX3000 (Quad Display)</option>
                        </optgroup>
                        <optgroup label="Front Chassis Bezel">
                          <option value="ChassisFront">Front Bezel (Power & USB-C)</option>
                        </optgroup>
                        <optgroup label="Rear I/O Modules (IOMs)">
                          <option value="N120">N120 10GbE Switch (12x Node + 4x SFP+)</option>
                          <option value="N100">N100 1GbE Pass-Through (12x Node + MGMT)</option>
                          <option value="N205">N205 Secondary Pass-Through (12x Node)</option>
                          <option value="N230">N230 25GbE Fabric (12x Node + 2x 25G SFP)</option>
                        </optgroup>
                        <optgroup label="Rear Power">
                          <option value="PSU">1600W Titanium Power Supply</option>
                        </optgroup>
                      </Select>
                    </HStack>

                    <HStack spacing="8px" wrap="wrap">
                      {/* Zoom controls */}
                      <HStack spacing="2px" bg="whiteAlpha.100" p="2px" borderRadius="6px" border="1px solid" borderColor={borderCol}>
                        <Button
                          size="xs"
                          variant={studioZoom === 0.75 ? 'solid' : 'ghost'}
                          colorScheme={studioZoom === 0.75 ? 'brand' : 'gray'}
                          onClick={() => setStudioZoom(0.75)}>
                          75%
                        </Button>
                        <Button
                          size="xs"
                          variant={studioZoom === 1.0 ? 'solid' : 'ghost'}
                          colorScheme={studioZoom === 1.0 ? 'brand' : 'gray'}
                          onClick={() => setStudioZoom(1.0)}>
                          100%
                        </Button>
                        <Button
                          size="xs"
                          variant={studioZoom === 1.25 ? 'solid' : 'ghost'}
                          colorScheme={studioZoom === 1.25 ? 'brand' : 'gray'}
                          onClick={() => setStudioZoom(1.25)}>
                          125%
                        </Button>
                        <Button
                          size="xs"
                          variant={studioZoom === 1.5 ? 'solid' : 'ghost'}
                          colorScheme={studioZoom === 1.5 ? 'brand' : 'gray'}
                          onClick={() => setStudioZoom(1.5)}>
                          150%
                        </Button>
                        <Button
                          size="xs"
                          variant={studioZoom === 2.0 ? 'solid' : 'ghost'}
                          colorScheme={studioZoom === 2.0 ? 'brand' : 'gray'}
                          onClick={() => setStudioZoom(2.0)}>
                          200%
                        </Button>
                      </HStack>

                      {/* Fit Mode Selector */}
                      <Select
                        size="xs"
                        w="115px"
                        borderRadius="6px"
                        value={studioFitMode}
                        onChange={(e) => setStudioFitMode(e.target.value)}
                        title="Canvas Fit Mode">
                        <option value="natural">Natural Ratio</option>
                        <option value="contain">Contain</option>
                        <option value="fill">Fill (Stretch)</option>
                      </Select>

                      {/* Grid Toggle */}
                      <Button
                        size="xs"
                        variant={studioShowGrid ? 'solid' : 'outline'}
                        colorScheme={studioShowGrid ? 'teal' : 'gray'}
                        leftIcon={<Icon as={MdGridOn} />}
                        onClick={() => setStudioShowGrid(!studioShowGrid)}>
                        Grid {studioShowGrid ? 'ON' : 'OFF'}
                      </Button>

                      {/* Snap to Sled Button */}
                      {['HX1000', 'HX2000', 'HX3000'].includes(alignTarget) && (
                        <Button
                          size="xs"
                          colorScheme="teal"
                          variant="solid"
                          onClick={handleSnapPortsToSled}
                          title="Snap DisplayPort, USBs, and Power button directly to photograph sockets">
                          ⚡ Snap to Sled
                        </Button>
                      )}

                      {alignTarget === 'N230' && (
                        <Button
                          size="xs"
                          colorScheme="orange"
                          variant="solid"
                          onClick={handleSnapPortsToSled}
                          title="Snap 12x RJ45 node pass-throughs and 2x 25G SFP28 uplinks">
                          ⚡ Snap 25GbE Ports
                        </Button>
                      )}

                      {/* Reset Target Defaults */}
                      <Button
                        size="xs"
                        variant="outline"
                        colorScheme="gray"
                        leftIcon={<Icon as={MdOutlineRefresh} />}
                        onClick={handleResetTargetPortsToDefaults}>
                        Reset Ports
                      </Button>

                      {alignTarget !== 'ChassisFront' && (
                        <Button
                          size="xs"
                          colorScheme="brand"
                          leftIcon={<Icon as={MdAdd} />}
                          onClick={handleAddPortToTarget}>
                          + Add Port
                        </Button>
                      )}
                    </HStack>
                  </Flex>

                  {/* Two-Column Studio Layout: Visual Canvas on Left, Precision Inspector on Right */}
                  <Grid templateColumns={{ base: '1fr', lg: '7fr 5fr' }} gap="16px" align="start">
                    {/* Left Column: Interactive Visual Canvas */}
                    <GridItem>
                      <Box
                        borderRadius="8px"
                        border="1px solid"
                        borderColor={borderCol}
                        bg="#0B0F19"
                        p="16px"
                        overflow="auto"
                        minH="420px"
                        maxH="580px"
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center">
                        <Text fontSize="10px" color="gray.400" mb="8px">
                          Click any port to select • Drag ports directly on the image to calibrate alignment pixel-perfectly
                        </Text>

                        {alignTarget === 'N230' && (
                          <HStack spacing="6px" mb="8px" bg="orange.900" px="8px" py="3px" borderRadius="4px" border="1px solid" borderColor="orange.500">
                            <Badge colorScheme="orange" fontSize="8px">N230 Separate Image To Come</Badge>
                            <Text fontSize="9px" color="orange.200">
                              Displaying /network.jpg preview until /n230.jpg or /n230.png is added.
                            </Text>
                          </HStack>
                        )}

                        {/* Scaled Preview Canvas Wrapper */}
                        <Box
                          position="relative"
                          p="4px"
                          border="1px solid rgba(255,255,255,0.15)"
                          borderRadius="6px"
                          bg="#141B2B"
                          boxShadow="0 8px 24px rgba(0,0,0,0.5)">
                          {/* Inner Canvas */}
                          {(() => {
                            // Target dimensions & image based on module type
                            const isVertical = ['HX1000', 'HX2000', 'HX3000', 'NodeBlank'].includes(alignTarget);
                            const isIom = ['N100', 'N120', 'N205', 'N230'].includes(alignTarget);
                            const isPsu = alignTarget === 'PSU';
                            const isChassis = alignTarget === 'ChassisFront';

                            const targetTmpl = encData.moduleTemplates?.[alignTarget] || HX5_MODULE_TEMPLATES[alignTarget] || {};
                            const bgImage =
                              isChassis
                                ? encData.images?.frontChassis || '/enclosure_front_empty.jpg'
                                : isPsu
                                ? encData.images?.psus || '/psu.jpg'
                                : targetTmpl.image || (alignTarget === 'N230' ? '/n230.jpg' : '/node_hx2000.png');
                            const overlayImage = targetTmpl.overlay || null;

                            // Calculate aspect ratio dynamically (width / height)
                            const detectedAspect =
                              imageAspectRatios[bgImage] ||
                              KNOWN_IMAGE_ASPECT_RATIOS[bgImage] ||
                              (isVertical ? 148 / 793 : isIom ? 1858 / 169 : isPsu ? 140 / 73 : 2.0);

                            let baseWidth, baseHeight;

                            if (studioFitMode === 'fill') {
                              baseWidth = isVertical ? 170 : isIom ? 680 : isPsu ? 260 : 700;
                              baseHeight = isVertical ? 380 : isIom ? 120 : isPsu ? 100 : 200;
                            } else {
                              if (isVertical) {
                                if (detectedAspect < 0.35) {
                                  // Tall vertical sleds (node.png, node_hx2000.png, node_hx3000.png, node_blank.png)
                                  baseHeight = 490;
                                  baseWidth = Math.max(70, Math.round(baseHeight * detectedAspect)); // ~90-95px
                                } else {
                                  // Detail images with PCB (node_detail_hx2000.png)
                                  baseHeight = 440;
                                  baseWidth = Math.round(baseHeight * detectedAspect); // ~310px
                                }
                              } else if (isIom) {
                                baseWidth = 720;
                                baseHeight = Math.max(50, Math.round(baseWidth / detectedAspect));
                              } else if (isPsu) {
                                baseWidth = 240;
                                baseHeight = Math.round(baseWidth / detectedAspect);
                              } else if (isChassis) {
                                baseWidth = 720;
                                baseHeight = Math.round(baseWidth / detectedAspect);
                              } else {
                                baseHeight = 400;
                                baseWidth = Math.round(baseHeight * detectedAspect);
                              }
                            }

                            const canvasW = Math.round(baseWidth * studioZoom);
                            const canvasH = Math.round(baseHeight * studioZoom);

                            return (
                              <Box
                                ref={studioCanvasRef}
                                position="relative"
                                w={`${canvasW}px`}
                                h={`${canvasH}px`}
                                userSelect="none"
                                cursor="crosshair"
                                overflow="hidden"
                                onMouseMove={(e) => {
                                  if (draggingPortIndex === null || !studioCanvasRef.current) return;
                                  const rect = studioCanvasRef.current.getBoundingClientRect();
                                  const relX = Math.max(0, Math.min(1, Number(((e.clientX - rect.left) / rect.width).toFixed(4))));
                                  const relY = Math.max(0, Math.min(1, Number(((e.clientY - rect.top) / rect.height).toFixed(4))));
                                  handleUpdateTargetPort(draggingPortIndex, { relX, relY });
                                }}
                                onMouseUp={() => setDraggingPortIndex(null)}
                                onMouseLeave={() => setDraggingPortIndex(null)}>
                                {/* Background Image */}
                                {bgImage && (
                                  <Image
                                    src={bgImage}
                                    alt={alignTarget}
                                    position="absolute"
                                    inset="0"
                                    w="100%"
                                    h="100%"
                                    objectFit={studioFitMode === 'fill' ? 'fill' : 'contain'}
                                    opacity={isChassis ? encData.images?.frontChassisOpacity ?? 0.35 : 0.9}
                                    pointerEvents="none"
                                    onError={(e) => {
                                      if (alignTarget === 'N230') {
                                        e.target.onerror = null;
                                        e.target.src = '/network.jpg';
                                      }
                                    }}
                                    onLoad={(e) => {
                                      const { naturalWidth, naturalHeight } = e.target;
                                      if (naturalWidth && naturalHeight) {
                                        const ratio = naturalWidth / naturalHeight;
                                        setImageAspectRatios((prev) => {
                                          if (prev[bgImage] === ratio) return prev;
                                          return { ...prev, [bgImage]: ratio };
                                        });
                                      }
                                    }}
                                  />
                                )}

                                {/* Transparent Overlay (for IOMs) */}
                                {overlayImage && (
                                  <Image
                                    src={overlayImage}
                                    alt={`${alignTarget} Overlay`}
                                    position="absolute"
                                    inset="0"
                                    w="100%"
                                    h="100%"
                                    objectFit={studioFitMode === 'fill' ? 'fill' : 'contain'}
                                    pointerEvents="none"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                )}

                                {/* Grid Guidelines */}
                                {studioShowGrid && (
                                  <Box
                                    position="absolute"
                                    inset="0"
                                    pointerEvents="none"
                                    opacity="0.25"
                                    backgroundImage="linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)"
                                    backgroundSize="10% 10%"
                                  />
                                )}

                                {/* Selected Port Magnetic Crosshair Guides */}
                                {currentTargetPort && (
                                  <>
                                    <Box
                                      position="absolute"
                                      left={`${(currentTargetPort.relX * 100).toFixed(2)}%`}
                                      top="0"
                                      bottom="0"
                                      w="1px"
                                      borderLeft="1px dashed #ff745b"
                                      opacity="0.6"
                                      pointerEvents="none"
                                    />
                                    <Box
                                      position="absolute"
                                      top={`${(currentTargetPort.relY * 100).toFixed(2)}%`}
                                      left="0"
                                      right="0"
                                      h="1px"
                                      borderTop="1px dashed #ff745b"
                                      opacity="0.6"
                                      pointerEvents="none"
                                    />
                                  </>
                                )}

                                {/* Interactive Port Markers (Actual Port Glyphs with 90° Rotation Support) */}
                                {currentTargetPorts.map((p, pIdx) => {
                                  const isSelected = pIdx === selectedPortIdx;
                                  const isPower = p.type === 'power';
                                  const portRot = typeof p.rotation === 'number' ? p.rotation : 0;

                                  const scaledW = Math.max(9, Math.round((p.width || 12) * studioZoom));
                                  const scaledH = Math.max(8, Math.round((p.height || 10) * studioZoom));

                                  const rotTransform = portRot ? `rotate(${portRot}deg)` : '';
                                  const transformStr = ['translate(-50%, -50%)', rotTransform].filter(Boolean).join(' ');

                                  return (
                                    <Box
                                      key={`target-port-${pIdx}`}
                                      data-testid={`target-port-${pIdx}`}
                                      position="absolute"
                                      left={`${((p.relX ?? 0.5) * 100).toFixed(2)}%`}
                                      top={`${((p.relY ?? 0.5) * 100).toFixed(2)}%`}
                                      transform={transformStr}
                                      w={`${scaledW}px`}
                                      h={`${scaledH}px`}
                                      borderRadius={isPower ? 'full' : '2px'}
                                      bg={isSelected ? 'rgba(255, 116, 91, 0.35)' : 'rgba(0, 0, 0, 0.45)'}
                                      border={isSelected ? '2px solid #ff745b' : '1px solid rgba(255,255,255,0.45)'}
                                      boxShadow={
                                        isSelected
                                          ? '0 0 12px 3px #ff745b, 0 0 4px #FFFFFF'
                                          : '0 0 4px rgba(0,0,0,0.8)'
                                      }
                                      cursor="move"
                                      zIndex={isSelected ? 10 : 5}
                                      display="flex"
                                      alignItems="center"
                                      justifyContent="center"
                                      p="1px"
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setSelectedPortIdx(pIdx);
                                        setDraggingPortIndex(pIdx);
                                      }}
                                      title={`[#${pIdx + 1}] ${p.nameSuffix || 'Port'} (${(p.type || 'rj45').toUpperCase()}) — ${portRot}° — X: ${((p.relX ?? 0.5) * 100).toFixed(1)}%, Y: ${((p.relY ?? 0.5) * 100).toFixed(1)}%`}>
                                      {/* Actual Port Glyph SVG */}
                                      <PortSvg
                                        type={p.type || 'rj45'}
                                        orientation={p.orientation || (p.relY > 0.5 ? 'bottom' : 'top')}
                                        width={scaledW}
                                        height={scaledH}
                                        isHighlighted={isSelected}
                                        isHoveredEmpty={false}
                                        isConnected={false}
                                      />

                                      {/* Small text label if zoomed */}
                                      {studioZoom >= 1.5 && (
                                        <Text
                                          position="absolute"
                                          fontSize="7px"
                                          fontWeight="900"
                                          color="#FFFFFF"
                                          pointerEvents="none"
                                          letterSpacing="-0.3px"
                                          textShadow="0 0 2px #000">
                                          {p.nameSuffix?.substring(0, 4)}
                                        </Text>
                                      )}

                                      {/* Coordinates badge on selected port */}
                                      {isSelected && (
                                        <Badge
                                          position="absolute"
                                          top={`-${20 * studioZoom * 0.7}px`}
                                          left="50%"
                                          transform="translateX(-50%)"
                                          colorScheme="red"
                                          fontSize="8px"
                                          px="4px"
                                          py="0"
                                          borderRadius="3px"
                                          whiteSpace="nowrap"
                                          pointerEvents="none"
                                          zIndex={12}>
                                          #{pIdx + 1} {p.nameSuffix} ({portRot}° | X: {p.relX}, Y: {p.relY})
                                        </Badge>
                                      )}
                                    </Box>
                                  );
                                })}
                              </Box>
                            );
                          })()}
                        </Box>
                      </Box>
                    </GridItem>

                    {/* Right Column: Precision Fine-Tuning & Port Inspector */}
                    <GridItem>
                      <Box borderRadius="8px" border="1px solid" borderColor={borderCol} bg={cardBg} p="14px">
                        {currentTargetPort ? (
                          <VStack spacing="14px" align="stretch">
                            {/* Selected Port Header */}
                            <Flex justify="space-between" align="center">
                              <HStack spacing="8px">
                                <Badge colorScheme="teal" fontSize="11px" px="6px" py="2px" borderRadius="4px">
                                  Port #{selectedPortIdx + 1} of {currentTargetPorts.length}
                                </Badge>
                                <Text fontSize="xs" fontWeight="800">
                                  {currentTargetPort.nameSuffix || 'Port'}
                                </Text>
                              </HStack>
                              <HStack spacing="4px">
                                {alignTarget !== 'ChassisFront' && (
                                  <>
                                    <Tooltip label="Rotate 90°" fontSize="xs">
                                      <IconButton
                                        size="xs"
                                        colorScheme="teal"
                                        variant="solid"
                                        icon={<Icon as={MdRotateRight} />}
                                        onClick={() => {
                                          const nextRot = ((currentTargetPort.rotation || 0) + 90) % 360;
                                          handleUpdateTargetPort(selectedPortIdx, { rotation: nextRot });
                                        }}
                                      />
                                    </Tooltip>
                                    <Tooltip label="Duplicate Port" fontSize="xs">
                                      <IconButton
                                        size="xs"
                                        variant="outline"
                                        icon={<Icon as={MdContentCopy} />}
                                        onClick={handleDuplicateTargetPort}
                                      />
                                    </Tooltip>
                                    <Tooltip label="Delete Port" fontSize="xs">
                                      <IconButton
                                        size="xs"
                                        colorScheme="red"
                                        variant="ghost"
                                        icon={<Icon as={MdDelete} />}
                                        onClick={() => handleDeleteTargetPort(selectedPortIdx)}
                                      />
                                    </Tooltip>
                                  </>
                                )}
                              </HStack>
                            </Flex>

                            {/* Fine-Tuning Nudge Arrow Pad */}
                            <Box p="10px" borderRadius="6px" border="1px solid" borderColor={borderCol} bg="whiteAlpha.100">
                              <Text fontSize="10px" fontWeight="800" textTransform="uppercase" color="teal.500" mb="8px">
                                Pixel Alignment Nudge (Arrow Buttons)
                              </Text>
                              <Flex justify="center" align="center" direction="column" gap="4px">
                                {/* Up Row */}
                                <HStack spacing="4px">
                                  <Tooltip label="Fast Up (-2%)" fontSize="xs">
                                    <Button size="xs" h="22px" px="6px" onClick={() => handleNudgePort(0, -0.02)}>
                                      ▲▲
                                    </Button>
                                  </Tooltip>
                                  <Tooltip label="Nudge Up (-0.5%)" fontSize="xs">
                                    <IconButton
                                      size="xs"
                                      h="22px"
                                      icon={<Icon as={MdArrowUpward} />}
                                      onClick={() => handleNudgePort(0, -0.005)}
                                    />
                                  </Tooltip>
                                </HStack>

                                {/* Left / Center / Right Row */}
                                <HStack spacing="4px">
                                  <Tooltip label="Fast Left (-2%)" fontSize="xs">
                                    <Button size="xs" h="22px" px="6px" onClick={() => handleNudgePort(-0.02, 0)}>
                                      ◀◀
                                    </Button>
                                  </Tooltip>
                                  <Tooltip label="Nudge Left (-0.5%)" fontSize="xs">
                                    <IconButton
                                      size="xs"
                                      h="22px"
                                      icon={<Icon as={MdArrowBack} />}
                                      onClick={() => handleNudgePort(-0.005, 0)}
                                    />
                                  </Tooltip>
                                  <Tooltip label="Center Horizontally (X: 0.50)" fontSize="xs">
                                    <Button size="xs" h="22px" px="6px" colorScheme="teal" onClick={() => handleUpdateTargetPort(selectedPortIdx, { relX: 0.5 })}>
                                      <Icon as={MdCenterFocusStrong} />
                                    </Button>
                                  </Tooltip>
                                  <Tooltip label="Nudge Right (+0.5%)" fontSize="xs">
                                    <IconButton
                                      size="xs"
                                      h="22px"
                                      icon={<Icon as={MdArrowForward} />}
                                      onClick={() => handleNudgePort(0.005, 0)}
                                    />
                                  </Tooltip>
                                  <Tooltip label="Fast Right (+2%)" fontSize="xs">
                                    <Button size="xs" h="22px" px="6px" onClick={() => handleNudgePort(0.02, 0)}>
                                      ▶▶
                                    </Button>
                                  </Tooltip>
                                </HStack>

                                {/* Down Row */}
                                <HStack spacing="4px">
                                  <Tooltip label="Fast Down (+2%)" fontSize="xs">
                                    <Button size="xs" h="22px" px="6px" onClick={() => handleNudgePort(0, 0.02)}>
                                      ▼▼
                                    </Button>
                                  </Tooltip>
                                  <Tooltip label="Nudge Down (+0.5%)" fontSize="xs">
                                    <IconButton
                                      size="xs"
                                      h="22px"
                                      icon={<Icon as={MdArrowDownward} />}
                                      onClick={() => handleNudgePort(0, 0.005)}
                                    />
                                  </Tooltip>
                                </HStack>
                              </Flex>
                            </Box>

                            {/* Coordinate & Size Properties */}
                            <SimpleGrid columns={2} spacing="10px">
                              <FormControl>
                                <FormLabel fontSize="10px" mb="2px">
                                  Rel Pos X (0.0 – 1.0)
                                </FormLabel>
                                <NumberInput
                                  size="xs"
                                  step={0.005}
                                  min={0}
                                  max={1}
                                  precision={4}
                                  value={currentTargetPort.relX ?? 0.5}
                                  onChange={(_, val) => handleUpdateTargetPort(selectedPortIdx, { relX: val })}>
                                  <NumberInputField borderRadius="4px" />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              </FormControl>

                              <FormControl>
                                <FormLabel fontSize="10px" mb="2px">
                                  Rel Pos Y (0.0 – 1.0)
                                </FormLabel>
                                <NumberInput
                                  size="xs"
                                  step={0.005}
                                  min={0}
                                  max={1}
                                  precision={4}
                                  value={currentTargetPort.relY ?? 0.5}
                                  onChange={(_, val) => handleUpdateTargetPort(selectedPortIdx, { relY: val })}>
                                  <NumberInputField borderRadius="4px" />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              </FormControl>

                              <FormControl>
                                <FormLabel fontSize="10px" mb="2px">
                                  Width (px)
                                </FormLabel>
                                <NumberInput
                                  size="xs"
                                  step={1}
                                  min={6}
                                  max={40}
                                  value={currentTargetPort.width ?? 12}
                                  onChange={(_, val) => handleUpdateTargetPort(selectedPortIdx, { width: val })}>
                                  <NumberInputField borderRadius="4px" />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              </FormControl>

                              <FormControl>
                                <FormLabel fontSize="10px" mb="2px">
                                  Height (px)
                                </FormLabel>
                                <NumberInput
                                  size="xs"
                                  step={1}
                                  min={6}
                                  max={40}
                                  value={currentTargetPort.height ?? 10}
                                  onChange={(_, val) => handleUpdateTargetPort(selectedPortIdx, { height: val })}>
                                  <NumberInputField borderRadius="4px" />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              </FormControl>
                            </SimpleGrid>

                            {/* Name, Type & Description */}
                            <FormControl>
                              <FormLabel fontSize="10px" mb="2px">
                                Port Name Suffix:
                              </FormLabel>
                              <Input
                                size="xs"
                                borderRadius="4px"
                                value={currentTargetPort.nameSuffix || ''}
                                onChange={(e) => handleUpdateTargetPort(selectedPortIdx, { nameSuffix: e.target.value })}
                                placeholder="e.g. DP-1, MGMT, NODE-1"
                              />
                            </FormControl>

                            <SimpleGrid columns={2} spacing="10px">
                              <FormControl>
                                <FormLabel fontSize="10px" mb="2px">
                                  Connector Type:
                                </FormLabel>
                                <Select
                                  size="xs"
                                  borderRadius="4px"
                                  value={currentTargetPort.type || 'rj45'}
                                  onChange={(e) => handleUpdateTargetPort(selectedPortIdx, { type: e.target.value })}>
                                  <option value="rj45">RJ45 Ethernet</option>
                                  <option value="sfp_plus">SFP+ / 10GbE</option>
                                  <option value="hdmi">DisplayPort / HDMI</option>
                                  <option value="usb">USB Type-A</option>
                                  <option value="usb_c">USB Type-C</option>
                                  <option value="power">Power Button</option>
                                  <option value="c14">C14 Power In</option>
                                  <option value="fiber_lc">Fiber LC</option>
                                  <option value="console">Console Serial</option>
                                </Select>
                              </FormControl>

                              <FormControl>
                                <FormLabel fontSize="10px" mb="2px">
                                  Orientation (Notch):
                                </FormLabel>
                                <Select
                                  size="xs"
                                  borderRadius="4px"
                                  value={currentTargetPort.orientation || 'top'}
                                  onChange={(e) => handleUpdateTargetPort(selectedPortIdx, { orientation: e.target.value })}>
                                  <option value="top">Top Notch (Odd)</option>
                                  <option value="bottom">Bottom Notch (Even)</option>
                                </Select>
                              </FormControl>
                            </SimpleGrid>

                            {/* Port Rotation (0°, 90°, 180°, 270°) */}
                            <FormControl>
                              <Flex justify="space-between" align="center" mb="4px">
                                <FormLabel fontSize="10px" mb="0" fontWeight="700">
                                  Port Rotation:
                                </FormLabel>
                                <Button
                                  size="xs"
                                  h="20px"
                                  fontSize="10px"
                                  px="8px"
                                  colorScheme="teal"
                                  variant="solid"
                                  leftIcon={<Icon as={MdRotateRight} />}
                                  onClick={() => {
                                    const nextRot = ((currentTargetPort.rotation || 0) + 90) % 360;
                                    handleUpdateTargetPort(selectedPortIdx, { rotation: nextRot });
                                  }}
                                  title="Rotate port 90 degrees clockwise">
                                  ⟳ Rotate 90°
                                </Button>
                              </Flex>
                              <HStack spacing="4px">
                                {[0, 90, 180, 270].map((deg) => (
                                  <Button
                                    key={`rot-btn-${deg}`}
                                    size="xs"
                                    flex="1"
                                    h="24px"
                                    fontSize="10px"
                                    variant={(currentTargetPort.rotation || 0) === deg ? 'solid' : 'outline'}
                                    colorScheme={(currentTargetPort.rotation || 0) === deg ? 'teal' : 'gray'}
                                    onClick={() => handleUpdateTargetPort(selectedPortIdx, { rotation: deg })}>
                                    {deg}°
                                  </Button>
                                ))}
                              </HStack>
                            </FormControl>

                            <FormControl>
                              <FormLabel fontSize="10px" mb="2px">
                                Port Description (Tooltip & Properties):
                              </FormLabel>
                              <Input
                                size="xs"
                                borderRadius="4px"
                                value={currentTargetPort.description || ''}
                                onChange={(e) => handleUpdateTargetPort(selectedPortIdx, { description: e.target.value })}
                                placeholder="e.g. Primary 10GbE SFP+ Fiber Uplink"
                              />
                            </FormControl>
                          </VStack>
                        ) : (
                          <Box textAlign="center" py="30px">
                            <Text fontSize="xs" color={textMuted}>
                              No ports configured for {alignTarget}.
                            </Text>
                            <Button
                              size="xs"
                              mt="10px"
                              colorScheme="brand"
                              leftIcon={<Icon as={MdAdd} />}
                              onClick={handleAddPortToTarget}>
                              Add First Port
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </GridItem>
                  </Grid>
                </VStack>
              </TabPanel>

              {/* ======================================================== */}
              {/* TAB 4: PART DESCRIPTIONS & SILKSCREENS */}
              {/* ======================================================== */}
              <TabPanel p="20px">
                <VStack spacing="18px" align="stretch">
                  <Flex justify="space-between" align="center" wrap="wrap" gap="8px">
                    <Box>
                      <Text fontSize="md" fontWeight="800">
                        Part Descriptions & Silkscreen Headers
                      </Text>
                      <Text fontSize="xs" color={textMuted}>
                        Configure silkscreen text printed on the faceplates, section titles, and technical descriptions for every component.
                      </Text>
                    </Box>
                    <Button
                      size="xs"
                      variant="outline"
                      colorScheme="gray"
                      leftIcon={<Icon as={MdOutlineRefresh} />}
                      onClick={handleResetDescriptionsToDefaults}>
                      Reset Descriptions to Defaults
                    </Button>
                  </Flex>

                  {/* Silkscreen Display Toggles */}
                  <Box p="14px" borderRadius="8px" border="1px solid" borderColor={borderCol} bg={cardBg}>
                    <Text fontSize="xs" fontWeight="800" textTransform="uppercase" color="teal.500" mb="10px">
                      Visual Silkscreen & Badge Toggles
                    </Text>
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing="14px">
                      <Flex justify="space-between" align="center" p="8px 12px" borderRadius="6px" bg="whiteAlpha.100">
                        <Box>
                          <Text fontSize="xs" fontWeight="700">
                            Faceplate Silkscreens
                          </Text>
                          <Text fontSize="10px" color={textMuted}>
                            Print header bars & model brand
                          </Text>
                        </Box>
                        <Switch
                          colorScheme="teal"
                          isChecked={encData.descriptions?.showSilkscreens !== false}
                          onChange={(e) => handleUpdateDescription('showSilkscreens', e.target.checked)}
                        />
                      </Flex>

                      <Flex justify="space-between" align="center" p="8px 12px" borderRadius="6px" bg="whiteAlpha.100">
                        <Box>
                          <Text fontSize="xs" fontWeight="700">
                            Slot Position Badges
                          </Text>
                          <Text fontSize="10px" color={textMuted}>
                            Display F1–F6, TOP, BTM, PSU badges
                          </Text>
                        </Box>
                        <Switch
                          colorScheme="teal"
                          isChecked={encData.descriptions?.showSlotBadges !== false}
                          onChange={(e) => handleUpdateDescription('showSlotBadges', e.target.checked)}
                        />
                      </Flex>

                      <Flex justify="space-between" align="center" p="8px 12px" borderRadius="6px" bg="whiteAlpha.100">
                        <Box>
                          <Text fontSize="xs" fontWeight="700">
                            Port Tooltip Descriptions
                          </Text>
                          <Text fontSize="10px" color={textMuted}>
                            Show rich descriptions on port hover
                          </Text>
                        </Box>
                        <Switch
                          colorScheme="teal"
                          isChecked={encData.descriptions?.showPortTooltips !== false}
                          onChange={(e) => handleUpdateDescription('showPortTooltips', e.target.checked)}
                        />
                      </Flex>
                    </SimpleGrid>
                  </Box>

                  {/* Chassis Silkscreens */}
                  <Box p="14px" borderRadius="8px" border="1px solid" borderColor={borderCol} bg={cardBg}>
                    <Text fontSize="xs" fontWeight="800" textTransform="uppercase" color="teal.500" mb="12px">
                      Chassis Silkscreen Headers & Status Banners
                    </Text>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing="14px">
                      <FormControl>
                        <FormLabel fontSize="10px" mb="2px">
                          Front Brand Silkscreen:
                        </FormLabel>
                        <Input
                          size="xs"
                          borderRadius="4px"
                          value={encData.descriptions?.frontBrand || ''}
                          onChange={(e) => handleUpdateDescription('frontBrand', e.target.value)}
                          placeholder="AMULET HOTKEY"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel fontSize="10px" mb="2px">
                          Front Model Title:
                        </FormLabel>
                        <Input
                          size="xs"
                          borderRadius="4px"
                          value={encData.descriptions?.frontModel || ''}
                          onChange={(e) => handleUpdateDescription('frontModel', e.target.value)}
                          placeholder="CORESTATION HX5 (5U 12-NODE)"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel fontSize="10px" mb="2px">
                          Front Status / Telemetry Banner:
                        </FormLabel>
                        <Input
                          size="xs"
                          borderRadius="4px"
                          value={encData.descriptions?.frontStatus || ''}
                          onChange={(e) => handleUpdateDescription('frontStatus', e.target.value)}
                          placeholder="12 SLOTS • 4800W MAX • ACTIVE"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel fontSize="10px" mb="2px">
                          Rear Header Title:
                        </FormLabel>
                        <Input
                          size="xs"
                          borderRadius="4px"
                          value={encData.descriptions?.rearHeader || ''}
                          onChange={(e) => handleUpdateDescription('rearHeader', e.target.value)}
                          placeholder="HX5 REAR MODULAR"
                        />
                      </FormControl>
                    </SimpleGrid>
                  </Box>

                  {/* Rear Section Subtitles & Tooltips */}
                  <Box p="14px" borderRadius="8px" border="1px solid" borderColor={borderCol} bg={cardBg}>
                    <Text fontSize="xs" fontWeight="800" textTransform="uppercase" color="orange.400" mb="12px">
                      Rear Section Labels & Subtitles
                    </Text>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing="14px">
                      <FormControl>
                        <FormLabel fontSize="10px" mb="2px">
                          Cooling Fans Section Description:
                        </FormLabel>
                        <Input
                          size="xs"
                          borderRadius="4px"
                          value={encData.descriptions?.fanSection || ''}
                          onChange={(e) => handleUpdateDescription('fanSection', e.target.value)}
                          placeholder="6x Hot-Plug Cooling Fans (6,400 RPM)"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel fontSize="10px" mb="2px">
                          Top IOM (Slot 1) Section Description:
                        </FormLabel>
                        <Input
                          size="xs"
                          borderRadius="4px"
                          value={encData.descriptions?.topIomSection || ''}
                          onChange={(e) => handleUpdateDescription('topIomSection', e.target.value)}
                          placeholder="Slot 1: Primary Network I/O Module"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel fontSize="10px" mb="2px">
                          Bottom IOM (Slot 2) Section Description:
                        </FormLabel>
                        <Input
                          size="xs"
                          borderRadius="4px"
                          value={encData.descriptions?.bottomIomSection || ''}
                          onChange={(e) => handleUpdateDescription('bottomIomSection', e.target.value)}
                          placeholder="Slot 2: Secondary Network / Expansion Module"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel fontSize="10px" mb="2px">
                          Power Supply Section Description:
                        </FormLabel>
                        <Input
                          size="xs"
                          borderRadius="4px"
                          value={encData.descriptions?.psuSection || ''}
                          onChange={(e) => handleUpdateDescription('psuSection', e.target.value)}
                          placeholder="4x 1600W Titanium Power Supplies"
                        />
                      </FormControl>
                    </SimpleGrid>
                  </Box>

                  {/* Module Metadata Table */}
                  <Box p="14px" borderRadius="8px" border="1px solid" borderColor={borderCol} bg={cardBg}>
                    <Text fontSize="xs" fontWeight="800" textTransform="uppercase" color="blue.400" mb="12px">
                      Module Names, Models & Technical Descriptions
                    </Text>
                    <VStack spacing="8px" align="stretch" maxH="300px" overflowY="auto" pr="4px">
                      {Object.keys(encData.moduleTemplates || HX5_MODULE_TEMPLATES).map((modKey) => {
                        const tmpl = encData.moduleTemplates?.[modKey] || HX5_MODULE_TEMPLATES[modKey];
                        return (
                          <Flex
                            key={`meta-${modKey}`}
                            p="8px 10px"
                            borderRadius="6px"
                            border="1px solid"
                            borderColor={borderCol}
                            bg="whiteAlpha.100"
                            align="center"
                            gap="10px">
                            <Badge fontSize="10px" w="70px" textAlign="center" colorScheme="teal">
                              {modKey}
                            </Badge>
                            <FormControl w="180px">
                              <FormLabel fontSize="9px" mb="1px">Display Name</FormLabel>
                              <Input
                                size="xs"
                                borderRadius="4px"
                                value={tmpl.name || ''}
                                onChange={(e) => handleUpdateTemplateMetadata(modKey, 'name', e.target.value)}
                              />
                            </FormControl>
                            <FormControl w="110px">
                              <FormLabel fontSize="9px" mb="1px">Model Code</FormLabel>
                              <Input
                                size="xs"
                                borderRadius="4px"
                                value={tmpl.model || ''}
                                onChange={(e) => handleUpdateTemplateMetadata(modKey, 'model', e.target.value)}
                              />
                            </FormControl>
                            <FormControl flex="1">
                              <FormLabel fontSize="9px" mb="1px">Technical Description</FormLabel>
                              <Input
                                size="xs"
                                borderRadius="4px"
                                value={tmpl.description || ''}
                                onChange={(e) => handleUpdateTemplateMetadata(modKey, 'description', e.target.value)}
                              />
                            </FormControl>
                          </Flex>
                        );
                      })}
                    </VStack>
                  </Box>
                </VStack>
              </TabPanel>

            </TabPanels>
          </Tabs>
        </ModalBody>

        {/* Footer */}
        <ModalFooter borderTop="1px solid" borderColor={borderCol} py="12px" px="20px">
          <Flex justify="space-between" w="100%" align="center">
            <Text fontSize="xs" color={textMuted}>
              Saving will update all configured slots and synchronize patch ports across the rack.
            </Text>
            <HStack spacing="10px">
              <Button size="sm" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                colorScheme="brand"
                leftIcon={<Icon as={MdCheck} />}
                onClick={handleSaveAndApply}>
                Apply & Save Enclosure
              </Button>
            </HStack>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
