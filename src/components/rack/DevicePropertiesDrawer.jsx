import React, { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Select,
  SimpleGrid,
  Text,
  Textarea,
  Tooltip,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react';
import {
  MdAdd,
  MdCable,
  MdCheck,
  MdContentCopy,
  MdDelete,
  MdDeveloperBoard,
  MdLink,
  MdMoreVert,
  MdPowerSettingsNew,
  MdSettings,
} from 'react-icons/md';
import { getDeviceDisplayId } from './DeviceFaceplate';
import InsertBladeModal from './InsertBladeModal';
import ConfigureHX5ModuleModal from './ConfigureHX5ModuleModal';
import { generateHX5DevicePorts } from '../../utils/hx5EnclosureHelper';

export default function DevicePropertiesDrawer({
  isOpen,
  onClose,
  device,
  rack,
  room,
  cables = [],
  allRacks = [],
  onUpdateDevice,
  onDeleteDevice,
  onDisconnectCable,
  onStartPatch,
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  // Form State
  const [referenceId, setReferenceId] = useState('');
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [modelName, setModelName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [uPosition, setUPosition] = useState(1);
  const [status, setStatus] = useState('online');
  const [notes, setNotes] = useState('');
  const [isInsertOpen, setIsInsertOpen] = useState(false);
  const [targetBayNumber, setTargetBayNumber] = useState(1);
  const [isHX5ModalOpen, setIsHX5ModalOpen] = useState(false);
  const [hx5InitialTab, setHx5InitialTab] = useState(0);
  const [hx5InitialSlot, setHx5InitialSlot] = useState(null);

  // Sync state when selected device changes
  useEffect(() => {
    if (device) {
      setReferenceId(getDeviceDisplayId(device));
      setName(device.name || '');
      setManufacturer(device.manufacturer || '');
      setModelName(device.model || '');
      setSerialNumber(device.serialNumber || '');
      setUPosition(device.uPosition || 1);
      setStatus(device.status || 'online');
      setNotes(device.notes || '');
    }
  }, [device]);

  const drawerBg = useColorModeValue('white', 'navy.800');
  const borderCol = useColorModeValue('secondaryGray.300', 'whiteAlpha.100');
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const mutedCol = useColorModeValue('secondaryGray.600', 'whiteAlpha.600');
  const itemBg = useColorModeValue('gray.50', 'whiteAlpha.50');

  if (!device) return null;

  // Build breadcrumb: e.g. RACKIE / OFC01 / RK01 / SW01
  const locationTag = room?.locationName || 'HOME';
  const floorTag = room?.floor || 'GF';
  const roomTag = room?.name || 'ROOM';
  const rackTag = rack?.name || `RK0${rack?.id || 1}`;
  const deviceTag = referenceId || getDeviceDisplayId(device);
  const breadcrumb = `${locationTag}/${floorTag}/${roomTag}/${rackTag}/${deviceTag}`;

  // Find all ports for this device, sorted naturally by name
  const ports = [...(device.ports || [])].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
  );

  // Build helper map: portId -> { cable, peerPort, peerDevice, peerRack }
  const portConnections = {};
  ports.forEach((p) => {
    const cable = cables.find((c) => c.fromPortId === p.id || c.toPortId === p.id);
    if (cable) {
      const isFrom = cable.fromPortId === p.id;
      const peerPortId = isFrom ? cable.toPortId : cable.fromPortId;
      // Search peer in allRacks
      let peerPort = null;
      let peerDev = null;
      let peerRk = null;

      for (const r of allRacks) {
        for (const d of r.devices || []) {
          const matchedPort = (d.ports || []).find((dp) => dp.id === peerPortId);
          if (matchedPort) {
            peerPort = matchedPort;
            peerDev = d;
            peerRk = r;
            break;
          }
        }
        if (peerPort) break;
      }

      portConnections[p.id] = {
        cable,
        isFrom,
        peerPort,
        peerDevice: peerDev,
        peerRack: peerRk,
      };
    }
  });

  const wiredPortsCount = Object.keys(portConnections).length;

  // Handle Save
  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedFields = {
        name: referenceId.trim() || name.trim() || device.name,
        serialNumber: serialNumber.trim() || null,
        uPosition: Number(uPosition),
        status,
        notes: notes.trim() || null,
      };

      if (onUpdateDevice) {
        await onUpdateDevice(device.id, updatedFields);
      }

      toast({
        title: 'Device properties updated',
        status: 'success',
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: 'Failed to update device',
        description: err.message,
        status: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard?.writeText(text);
    toast({ title: `${label} copied to clipboard`, status: 'info', duration: 1500 });
  };

  const isEnclosure =
    (device?.category || '').toLowerCase() === 'enclosure' ||
    device?.enclosureData?.type === 'modular_enclosure' ||
    device?.enclosureData?.isEnclosure ||
    Boolean(device?.enclosureData?.frontBays) ||
    (device?.model || '').toLowerCase().includes('m1000e');

  const rawEnclosureData = device?.enclosureData;
  const enclosureData =
    typeof rawEnclosureData === 'string'
      ? (() => {
          try {
            return JSON.parse(rawEnclosureData);
          } catch (e) {
            return {};
          }
        })()
      : rawEnclosureData || {};
  const frontBays = enclosureData.frontBays || [];
  const rearComponents = enclosureData.rearComponents || {};
  const occupiedBaysCount = frontBays.filter((b) => b.occupied).length;

  const handleInsertBlade = async (bayNum, bladeData) => {
    const updatedBays = frontBays.map((bay) => {
      if (bay.bayNumber === bayNum) {
        return {
          ...bay,
          occupied: true,
          blade: bladeData,
        };
      }
      return bay;
    });

    const updatedEnclosureData = {
      ...enclosureData,
      frontBays: updatedBays,
    };

    if (onUpdateDevice) {
      await onUpdateDevice(device.id, { enclosureData: updatedEnclosureData });
    }

    toast({
      title: `Blade Inserted into Bay ${bayNum}`,
      status: 'success',
      duration: 2000,
    });
  };

  const handleEjectBlade = async (bayNum) => {
    const updatedBays = frontBays.map((bay) => {
      if (bay.bayNumber === bayNum) {
        return {
          ...bay,
          occupied: false,
          blade: null,
        };
      }
      return bay;
    });

    const updatedEnclosureData = {
      ...enclosureData,
      frontBays: updatedBays,
    };

    if (onUpdateDevice) {
      await onUpdateDevice(device.id, { enclosureData: updatedEnclosureData });
    }

    toast({
      title: `Blade Ejected from Bay ${bayNum}`,
      status: 'info',
      duration: 2000,
    });
  };

  const handleToggleBladePower = async (bayNum) => {
    const updatedBays = frontBays.map((bay) => {
      if (bay.bayNumber === bayNum && bay.blade) {
        const nextState = bay.blade.powerState === 'on' ? 'off' : 'on';
        return {
          ...bay,
          blade: {
            ...bay.blade,
            powerState: nextState,
            status: nextState === 'on' ? 'online' : 'offline',
          },
        };
      }
      return bay;
    });

    const updatedEnclosureData = {
      ...enclosureData,
      frontBays: updatedBays,
    };

    if (onUpdateDevice) {
      await onUpdateDevice(device.id, { enclosureData: updatedEnclosureData });
    }
  };

  const isHX5Enclosure =
    (device?.model || '').toLowerCase().includes('hx5') ||
    (device?.name || '').toLowerCase().includes('hx5') ||
    enclosureData?.type === 'hx5_enclosure' ||
    enclosureData?.enclosureType === 'hx5';

  const hx5FrontSlots = enclosureData.frontSlots || [];
  const hx5RearModules = enclosureData.rearModules || {};
  const hx5OccupiedCount = hx5FrontSlots.filter(
    (s) => s.occupied && s.moduleType && s.moduleType !== 'Empty' && s.moduleType !== 'NodeBlank'
  ).length;
  const hx5ActiveCount = hx5FrontSlots.filter((s) => s.occupied && s.power === 'on').length;

  const handleToggleHX5Power = async (slotNumber) => {
    const nextFrontSlots = hx5FrontSlots.map((s) => {
      if (s.slotNumber === slotNumber) {
        return { ...s, power: s.power === 'on' ? 'off' : 'on' };
      }
      return s;
    });
    const updatedEnc = { ...enclosureData, frontSlots: nextFrontSlots };
    const newPorts = generateHX5DevicePorts(updatedEnc);
    if (onUpdateDevice) {
      await onUpdateDevice(device.id, { enclosureData: updatedEnc, ports: newPorts });
    }
  };

  const handleEjectHX5Node = async (slotNumber) => {
    const nextFrontSlots = hx5FrontSlots.map((s) => {
      if (s.slotNumber === slotNumber) {
        return {
          ...s,
          occupied: false,
          moduleType: 'Empty',
          name: `Slot ${String(slotNumber).padStart(2, '0')}`,
          serial: null,
          power: 'off',
        };
      }
      return s;
    });
    const updatedEnc = { ...enclosureData, frontSlots: nextFrontSlots };
    const newPorts = generateHX5DevicePorts(updatedEnc);
    if (onUpdateDevice) {
      await onUpdateDevice(device.id, { enclosureData: updatedEnc, ports: newPorts });
    }
    toast({
      title: `Node removed from Slot ${slotNumber}`,
      status: 'info',
      duration: 2000,
    });
  };

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
      <DrawerOverlay />
      <DrawerContent bg={drawerBg} color={textColor}>
        <DrawerCloseButton />

        {/* Patchdocs-style Header with Breadcrumb & Menu */}
        <DrawerHeader
          borderBottom="1px solid"
          borderColor={borderCol}
          py="12px"
          px="16px"
          pr="48px">
          <Flex justify="space-between" align="center">
            <Box overflow="hidden" maxW="280px">
              <Text
                fontSize="xs"
                fontWeight="700"
                fontFamily="mono"
                color="brand.400"
                isTruncated
                title={breadcrumb}>
                {breadcrumb}
              </Text>
              <Text fontSize="sm" fontWeight="800" color={textColor} isTruncated>
                {device.model || device.name}
              </Text>
            </Box>

            <Menu size="xs">
              <MenuButton
                as={IconButton}
                icon={<Icon as={MdMoreVert} />}
                size="xs"
                variant="ghost"
                borderRadius="6px"
              />
              <MenuList bg="navy.800" borderColor="whiteAlpha.200" zIndex={30}>
                <MenuItem
                  icon={<Icon as={MdContentCopy} />}
                  fontSize="xs"
                  onClick={() => copyToClipboard(deviceTag, 'Device ID')}>
                  Copy ID ({deviceTag})
                </MenuItem>
                <MenuItem
                  icon={<Icon as={MdLink} />}
                  fontSize="xs"
                  onClick={() => copyToClipboard(breadcrumb, 'Full Path')}>
                  Copy Breadcrumb Path
                </MenuItem>
                <Divider my="4px" />
                <MenuItem
                  icon={<Icon as={MdDelete} color="red.400" />}
                  fontSize="xs"
                  color="red.300"
                  onClick={() => {
                    onClose();
                    if (onDeleteDevice) onDeleteDevice(device.id);
                  }}>
                  Unmount Device
                </MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </DrawerHeader>

        <DrawerBody p="0">
          <Accordion defaultIndex={[0, 1]} allowMultiple>
            {/* SECTION 1: SETTINGS */}
            <AccordionItem borderTop="none" borderColor={borderCol}>
              <h2>
                <AccordionButton
                  bg={itemBg}
                  _hover={{ bg: 'whiteAlpha.100' }}
                  py="8px"
                  px="16px">
                  <HStack flex="1" spacing="6px">
                    <Icon as={MdSettings} w="14px" h="14px" color="brand.400" />
                    <Text fontSize="xs" fontWeight="700" textTransform="uppercase">
                      Settings
                    </Text>
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb="16px" px="16px" pt="12px">
                <VStack spacing="12px" align="stretch">
                  <FormControl isRequired>
                    <FormLabel fontSize="11px" fontWeight="700" mb="2px">
                      ID * (Left Ear Tag)
                    </FormLabel>
                    <Input
                      size="sm"
                      fontFamily="mono"
                      textTransform="uppercase"
                      value={referenceId}
                      onChange={(e) => setReferenceId(e.target.value.toUpperCase())}
                      placeholder="e.g. SW01, PP01, R01"
                      borderRadius="8px"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="11px" fontWeight="700" mb="2px">
                      Name / Description
                    </FormLabel>
                    <Input
                      size="sm"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Core Switch 01"
                      borderRadius="8px"
                    />
                  </FormControl>

                  <HStack spacing="10px">
                    <FormControl>
                      <FormLabel fontSize="11px" fontWeight="700" mb="2px">
                        Manufacturer
                      </FormLabel>
                      <Input
                        size="sm"
                        value={manufacturer}
                        onChange={(e) => setManufacturer(e.target.value)}
                        placeholder="e.g. Cisco, Ubiquiti"
                        borderRadius="8px"
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="11px" fontWeight="700" mb="2px">
                        Model Name
                      </FormLabel>
                      <Input
                        size="sm"
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        placeholder="e.g. Catalyst 9300-48P"
                        borderRadius="8px"
                      />
                    </FormControl>
                  </HStack>

                  <HStack spacing="10px">
                    <FormControl>
                      <FormLabel fontSize="11px" fontWeight="700" mb="2px">
                        Rack Slot (U Position)
                      </FormLabel>
                      <Input
                        size="sm"
                        type="number"
                        min="1"
                        max={rack?.uHeight || 48}
                        value={uPosition}
                        onChange={(e) => setUPosition(e.target.value)}
                        borderRadius="8px"
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="11px" fontWeight="700" mb="2px">
                        Status
                      </FormLabel>
                      <Select
                        size="sm"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        borderRadius="8px">
                        <option value="online">Online / Active</option>
                        <option value="warning">Warning / Degraded</option>
                        <option value="offline">Offline / Unpowered</option>
                      </Select>
                    </FormControl>
                  </HStack>

                  <FormControl>
                    <FormLabel fontSize="11px" fontWeight="700" mb="2px">
                      Serial Number
                    </FormLabel>
                    <Input
                      size="sm"
                      fontFamily="mono"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="e.g. FOC234120X9"
                      borderRadius="8px"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="11px" fontWeight="700" mb="2px">
                      Notes
                    </FormLabel>
                    <Textarea
                      size="sm"
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Maintenance notes, VLAN tags, IP address..."
                      borderRadius="8px"
                    />
                  </FormControl>

                  <Button
                    size="xs"
                    colorScheme="brand"
                    leftIcon={<Icon as={MdCheck} />}
                    isLoading={saving}
                    onClick={handleSave}>
                    Save Settings
                  </Button>
                </VStack>
              </AccordionPanel>
            </AccordionItem>

            {/* ENCLOSURE SECTION: HX5 AMULET HOTKEY OR GENERIC BLADE ENCLOSURE */}
            {isHX5Enclosure ? (
              <AccordionItem borderColor={borderCol}>
                <h2>
                  <AccordionButton
                    bg={itemBg}
                    _hover={{ bg: 'whiteAlpha.100' }}
                    py="8px"
                    px="16px">
                    <HStack flex="1" spacing="6px">
                      <Icon as={MdDeveloperBoard} w="14px" h="14px" color="teal.400" />
                      <Text fontSize="xs" fontWeight="700" textTransform="uppercase">
                        HX5 Modular Chassis ({hx5OccupiedCount}/12 Nodes Active)
                      </Text>
                    </HStack>
                    <AccordionIcon />
                  </AccordionButton>
                </h2>
                <AccordionPanel pb="16px" px="16px" pt="10px">
                  {/* Status Banner */}
                  <Flex
                    p="8px 10px"
                    mb="12px"
                    borderRadius="8px"
                    bg="whiteAlpha.50"
                    border="1px solid"
                    borderColor={borderCol}
                    justify="space-between"
                    align="center">
                    <Box>
                      <Text fontSize="11px" fontWeight="700" color={textColor}>
                        Amulet Hotkey CoreStation HX5 (5U)
                      </Text>
                      <Text fontSize="10px" color={mutedCol}>
                        12x Workstation Sleds • 2x IOMs • 6x Fans • 4x 1600W PSUs
                      </Text>
                    </Box>
                    <Button
                      size="xs"
                      colorScheme="brand"
                      leftIcon={<Icon as={MdSettings} />}
                      onClick={() => {
                        setHx5InitialTab(0);
                        setHx5InitialSlot({ type: 'front', slotNumber: 1 });
                        setIsHX5ModalOpen(true);
                      }}>
                      Configure Chassis
                    </Button>
                  </Flex>

                  {/* Front Node Slots (1 to 12) */}
                  <Flex justify="space-between" align="center" mb="6px">
                    <Text fontSize="11px" fontWeight="700" color="gray.400" textTransform="uppercase">
                      Front Node Sleds (1–12)
                    </Text>
                    <Badge colorScheme="teal" fontSize="9px">
                      {hx5ActiveCount} Online
                    </Badge>
                  </Flex>
                  <VStack spacing="6px" align="stretch" maxH="280px" overflowY="auto" pr="2px">
                    {hx5FrontSlots.map((slot) => {
                      const isOccupied = slot.occupied && slot.moduleType && slot.moduleType !== 'Empty';
                      const isBlank = slot.moduleType === 'NodeBlank';
                      const isPowerOn = slot.power === 'on';

                      return (
                        <Flex
                          key={`hx5-slot-${slot.slotNumber}`}
                          p="6px 8px"
                          borderRadius="6px"
                          border="1px solid"
                          borderColor={isOccupied ? (isPowerOn ? '#3d9e99' : borderCol) : 'whiteAlpha.200'}
                          bg={isOccupied ? 'whiteAlpha.50' : 'transparent'}
                          justify="space-between"
                          align="center"
                          gap="6px">
                          <Badge
                            fontSize="9px"
                            px="5px"
                            py="1px"
                            borderRadius="3px"
                            colorScheme={isOccupied ? (isPowerOn ? 'green' : 'gray') : 'blackAlpha'}>
                            #{String(slot.slotNumber).padStart(2, '0')}
                          </Badge>

                          <Box flex="1" overflow="hidden">
                            {isOccupied ? (
                              <>
                                <HStack spacing="6px">
                                  <Text fontSize="xs" fontWeight="700" isTruncated>
                                    {slot.name}
                                  </Text>
                                  <Badge fontSize="8px" colorScheme={isBlank ? 'gray' : 'blue'}>
                                    {slot.moduleType}
                                  </Badge>
                                </HStack>
                                {slot.serial && (
                                  <Text fontSize="9px" fontFamily="mono" color={mutedCol}>
                                    SN: {slot.serial}
                                  </Text>
                                )}
                              </>
                            ) : (
                              <Text fontSize="xs" color="gray.500" fontStyle="italic">
                                Empty Slot
                              </Text>
                            )}
                          </Box>

                          <HStack spacing="4px">
                            {isOccupied && !isBlank && (
                              <Tooltip label={isPowerOn ? 'Power Off' : 'Power On'} fontSize="xs">
                                <IconButton
                                  size="xs"
                                  colorScheme={isPowerOn ? 'green' : 'gray'}
                                  variant="solid"
                                  icon={<Icon as={MdPowerSettingsNew} />}
                                  onClick={() => handleToggleHX5Power(slot.slotNumber)}
                                />
                              </Tooltip>
                            )}
                            <Tooltip label="Configure Slot" fontSize="xs">
                              <IconButton
                                size="xs"
                                colorScheme="brand"
                                variant="ghost"
                                icon={<Icon as={MdSettings} />}
                                onClick={() => {
                                  setHx5InitialSlot({ type: 'front', slotNumber: slot.slotNumber });
                                  setHx5InitialTab(0);
                                  setIsHX5ModalOpen(true);
                                }}
                              />
                            </Tooltip>
                            {isOccupied && (
                              <Tooltip label="Eject Sled" fontSize="xs">
                                <IconButton
                                  size="xs"
                                  colorScheme="red"
                                  variant="ghost"
                                  icon={<Icon as={MdDelete} />}
                                  onClick={() => handleEjectHX5Node(slot.slotNumber)}
                                />
                              </Tooltip>
                            )}
                          </HStack>
                        </Flex>
                      );
                    })}
                  </VStack>

                  {/* Rear IOM Modules Summary */}
                  <Box mt="14px" pt="10px" borderTop="1px dashed" borderColor={borderCol}>
                    <Text fontSize="11px" fontWeight="700" color="gray.400" textTransform="uppercase" mb="6px">
                      Rear I/O Modules & Infrastructure
                    </Text>
                    <SimpleGrid columns={2} spacing="6px">
                      <Box
                        p="6px 8px"
                        bg="whiteAlpha.50"
                        borderRadius="6px"
                        border="1px solid"
                        borderColor={borderCol}
                        cursor="pointer"
                        _hover={{ borderColor: 'teal.400' }}
                        onClick={() => {
                          setHx5InitialSlot({ type: 'iom_top', slotNumber: 1 });
                          setHx5InitialTab(0);
                          setIsHX5ModalOpen(true);
                        }}>
                        <Text fontSize="10px" fontWeight="700" color="teal.300">
                          Top IOM: {hx5RearModules.ioms?.[0]?.installedModule || 'N120'}
                        </Text>
                        <Text fontSize="9px" color="gray.400">
                          Slot 1 • Click to configure
                        </Text>
                      </Box>
                      <Box
                        p="6px 8px"
                        bg="whiteAlpha.50"
                        borderRadius="6px"
                        border="1px solid"
                        borderColor={borderCol}
                        cursor="pointer"
                        _hover={{ borderColor: 'teal.400' }}
                        onClick={() => {
                          setHx5InitialSlot({ type: 'iom_bottom', slotNumber: 2 });
                          setHx5InitialTab(0);
                          setIsHX5ModalOpen(true);
                        }}>
                        <Text fontSize="10px" fontWeight="700" color="teal.300">
                          Bottom IOM: {hx5RearModules.ioms?.[1]?.installedModule || 'N205'}
                        </Text>
                        <Text fontSize="9px" color="gray.400">
                          Slot 2 • Click to configure
                        </Text>
                      </Box>
                      <Box p="6px 8px" bg="whiteAlpha.50" borderRadius="6px" border="1px solid" borderColor={borderCol}>
                        <Text fontSize="10px" fontWeight="700" color="cyan.300">
                          {(hx5RearModules.fans || []).filter((f) => f.installed).length}/6 Hot-Plug Fans
                        </Text>
                        <Text fontSize="9px" color="gray.400">6,400 RPM Dual-Rotor</Text>
                      </Box>
                      <Box p="6px 8px" bg="whiteAlpha.50" borderRadius="6px" border="1px solid" borderColor={borderCol}>
                        <Text fontSize="10px" fontWeight="700" color="orange.300">
                          {(hx5RearModules.psus || []).filter((p) => p.installed).length}/4 Titanium PSUs
                        </Text>
                        <Text fontSize="9px" color="gray.400">1600W AC Redundant</Text>
                      </Box>
                    </SimpleGrid>
                  </Box>
                </AccordionPanel>
              </AccordionItem>
            ) : isEnclosure ? (
              <AccordionItem borderColor={borderCol}>
                <h2>
                  <AccordionButton
                    bg={itemBg}
                    _hover={{ bg: 'whiteAlpha.100' }}
                    py="8px"
                    px="16px">
                    <HStack flex="1" spacing="6px">
                      <Icon as={MdDeveloperBoard} w="14px" h="14px" color="blue.400" />
                      <Text fontSize="xs" fontWeight="700" textTransform="uppercase">
                        Modular Enclosure ({occupiedBaysCount}/{frontBays.length} Blades/Sleds Active)
                      </Text>
                    </HStack>
                    <AccordionIcon />
                  </AccordionButton>
                </h2>
                <AccordionPanel pb="16px" px="16px" pt="10px">
                  {/* Quick status summary */}
                  <Flex
                    p="8px 10px"
                    mb="12px"
                    borderRadius="8px"
                    bg="whiteAlpha.50"
                    border="1px solid"
                    borderColor={borderCol}
                    justify="space-between"
                    align="center">
                    <Box>
                      <Text fontSize="11px" fontWeight="700" color={textColor}>
                        {device?.manufacturer || ''} {device?.model || device?.name || 'Modular Chassis'} ({device?.uHeight || 10}U)
                      </Text>
                      <Text fontSize="10px" color={mutedCol}>
                        {frontBays.length} Bays • {rearComponents.fabricCount ?? 6} I/O Fabrics • {rearComponents.psuCount ?? 6} PSUs • {rearComponents.cmcCount ?? 2} CMCs
                      </Text>
                    </Box>
                    <Badge colorScheme="brand" fontSize="9px" px="6px" py="1px" borderRadius="4px">
                      {occupiedBaysCount} Installed
                    </Badge>
                  </Flex>

                  {/* Front Bays List */}
                  <Text fontSize="11px" fontWeight="700" color="gray.400" textTransform="uppercase" mb="6px">
                    Modular Server Bays (1–{frontBays.length})
                  </Text>
                  <VStack spacing="6px" align="stretch" maxH="340px" overflowY="auto" pr="2px">
                    {frontBays.map((bay) => {
                      const isOccupied = bay.occupied && bay.blade;
                      const blade = bay.blade;
                      const isPowerOn = blade?.powerState === 'on';

                      return (
                        <Flex
                          key={`drawer-bay-${bay.bayNumber}`}
                          p="8px"
                          borderRadius="8px"
                          border="1px solid"
                          borderColor={isOccupied ? (isPowerOn ? 'brand.400' : borderCol) : 'whiteAlpha.200'}
                          bg={isOccupied ? 'whiteAlpha.50' : 'transparent'}
                          justify="space-between"
                          align="center"
                          gap="8px">
                          {/* Bay number badge */}
                          <Badge
                            fontSize="9px"
                            px="6px"
                            py="1px"
                            borderRadius="4px"
                            colorScheme={isOccupied ? (isPowerOn ? 'green' : 'gray') : 'blackAlpha'}>
                            Bay {String(bay.bayNumber).padStart(2, '0')}
                          </Badge>

                          {/* Blade Info or Empty state */}
                          <Box flex="1" overflow="hidden">
                            {isOccupied ? (
                              <>
                                <HStack spacing="6px">
                                  <Text fontSize="xs" fontWeight="700" isTruncated>
                                    {blade.name}
                                  </Text>
                                  <Badge fontSize="8px" colorScheme="blue">
                                    {blade.model}
                                  </Badge>
                                </HStack>
                                <Text fontSize="10px" color={mutedCol} isTruncated>
                                  {blade.specs || 'Standard Blade Config'}
                                </Text>
                              </>
                            ) : (
                              <Text fontSize="xs" color="gray.500" fontStyle="italic">
                                Empty Bay (Available for Blade)
                              </Text>
                            )}
                          </Box>

                          {/* Action Buttons */}
                          <HStack spacing="4px">
                            {isOccupied ? (
                              <>
                                <Tooltip
                                  label={isPowerOn ? 'Power Off Blade' : 'Power On Blade'}
                                  fontSize="xs">
                                  <IconButton
                                    size="xs"
                                    colorScheme={isPowerOn ? 'green' : 'gray'}
                                    variant="solid"
                                    icon={<Icon as={MdPowerSettingsNew} />}
                                    onClick={() => handleToggleBladePower(bay.bayNumber)}
                                  />
                                </Tooltip>
                                <Tooltip label="Eject Blade" fontSize="xs">
                                  <IconButton
                                    size="xs"
                                    colorScheme="red"
                                    variant="ghost"
                                    icon={<Icon as={MdDelete} />}
                                    onClick={() => handleEjectBlade(bay.bayNumber)}
                                  />
                                </Tooltip>
                              </>
                            ) : (
                              <Button
                                size="xs"
                                colorScheme="brand"
                                variant="outline"
                                fontSize="10px"
                                leftIcon={<Icon as={MdAdd} />}
                                onClick={() => {
                                  setTargetBayNumber(bay.bayNumber);
                                  setIsInsertOpen(true);
                                }}>
                                Insert Blade
                              </Button>
                            )}
                          </HStack>
                        </Flex>
                      );
                    })}
                  </VStack>

                  {/* Rear Modules Summary */}
                  <Box mt="14px" pt="10px" borderTop="1px dashed" borderColor={borderCol}>
                    <Text fontSize="11px" fontWeight="700" color="gray.400" textTransform="uppercase" mb="6px">
                      Rear Modules & Fabric Interconnects
                    </Text>
                    <SimpleGrid columns={2} spacing="6px">
                      <Box p="6px 8px" bg="whiteAlpha.50" borderRadius="6px" border="1px solid" borderColor={borderCol}>
                        <Text fontSize="10px" fontWeight="700" color="blue.300">Fabric A1/A2 (10GbE)</Text>
                        <Text fontSize="9px" color="gray.400">Dell PowerConnect M6348 (32 Ports)</Text>
                      </Box>
                      <Box p="6px 8px" bg="whiteAlpha.50" borderRadius="6px" border="1px solid" borderColor={borderCol}>
                        <Text fontSize="10px" fontWeight="700" color="coral.300">Fabric B1/B2 (SFP+)</Text>
                        <Text fontSize="9px" color="gray.400">10GbE Pass-Through (8 Ports)</Text>
                      </Box>
                      <Box p="6px 8px" bg="whiteAlpha.50" borderRadius="6px" border="1px solid" borderColor={borderCol}>
                        <Text fontSize="10px" fontWeight="700" color="yellow.400">6x 2700W PSUs</Text>
                        <Text fontSize="9px" color="gray.400">3+3 AC Redundant (Online)</Text>
                      </Box>
                      <Box p="6px 8px" bg="whiteAlpha.50" borderRadius="6px" border="1px solid" borderColor={borderCol}>
                        <Text fontSize="10px" fontWeight="700" color="teal.300">CMC 1 & CMC 2</Text>
                        <Text fontSize="9px" color="gray.400">Dual Active/Standby 192.168.10.150</Text>
                      </Box>
                    </SimpleGrid>
                  </Box>
                </AccordionPanel>
              </AccordionItem>
            ) : null}

            {/* SECTION 3: PORTS (Patchdocs-style Wired Ports List) */}
            <AccordionItem borderColor={borderCol}>
              <h2>
                <AccordionButton
                  bg={itemBg}
                  _hover={{ bg: 'whiteAlpha.100' }}
                  py="8px"
                  px="16px">
                  <HStack flex="1" spacing="6px">
                    <Icon as={MdCable} w="14px" h="14px" color="brand.400" />
                    <Text fontSize="xs" fontWeight="700" textTransform="uppercase">
                      Ports ({ports.length} total • {wiredPortsCount} wired)
                    </Text>
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>
              </h2>
              <AccordionPanel pb="16px" px="16px" pt="10px">
                {ports.length === 0 ? (
                  <Text fontSize="xs" color={mutedCol}>
                    No ports defined on this device.
                  </Text>
                ) : (
                  <VStack spacing="8px" align="stretch">
                    {ports.map((port) => {
                      const conn = portConnections[port.id];
                      const isPatched = !!conn;

                      return (
                        <Box
                          key={port.id}
                          p="8px 10px"
                          borderRadius="8px"
                          border="1px solid"
                          borderColor={isPatched ? 'brand.400' : borderCol}
                          bg={isPatched ? 'whiteAlpha.50' : 'transparent'}
                          transition="all 0.15s">
                          <Flex justify="space-between" align="center" mb="4px">
                            <HStack spacing="8px">
                              <Text fontSize="xs" fontWeight="700" fontFamily="mono">
                                {port.name}
                              </Text>
                              <Badge
                                size="xs"
                                fontSize="9px"
                                colorScheme={
                                  (port.portType || '').includes('sfp')
                                    ? 'coral'
                                    : (port.portType || '').includes('fiber')
                                    ? 'teal'
                                    : 'blue'
                                }
                                textTransform="uppercase">
                                {port.portType || 'rj45'} ({port.face})
                              </Badge>
                            </HStack>

                            {isPatched ? (
                              <HStack spacing="6px">
                                <Box
                                  w="8px"
                                  h="8px"
                                  borderRadius="full"
                                  bg={conn.cable.color || '#3d9e99'}
                                />
                                <IconButton
                                  size="xs"
                                  variant="ghost"
                                  colorScheme="red"
                                  icon={<Icon as={MdDelete} />}
                                  title="Unplug / Disconnect Cable"
                                  onClick={() => {
                                    if (onDisconnectCable) onDisconnectCable(conn.cable.id);
                                  }}
                                />
                              </HStack>
                            ) : (
                              <Button
                                size="xs"
                                variant="outline"
                                colorScheme="brand"
                                fontSize="10px"
                                h="20px"
                                onClick={() => {
                                  onClose();
                                  if (onStartPatch) onStartPatch(port);
                                }}>
                                + Patch
                              </Button>
                            )}
                          </Flex>

                          {/* Patch Connection Route Path (Patchdocs style Up/Down arrows) */}
                          {isPatched && (
                            <VStack align="stretch" spacing="2px" mt="6px" pt="4px" borderTop="1px dashed" borderColor="whiteAlpha.200">
                              <HStack spacing="4px" fontSize="10px" fontFamily="mono" color="brand.400">
                                <Text fontWeight="700">↑</Text>
                                <Text isTruncated>
                                  {rackTag}/{deviceTag}/{port.name}
                                </Text>
                              </HStack>
                              <HStack spacing="4px" fontSize="10px" fontFamily="mono" color="green.400">
                                <Text fontWeight="700">↓</Text>
                                <Text isTruncated>
                                  {conn.peerRack?.name || 'PEER'}/{conn.peerDevice?.name || 'DEV'}/{conn.peerPort?.name || 'PORT'}
                                </Text>
                              </HStack>
                            </VStack>
                          )}
                        </Box>
                      );
                    })}
                  </VStack>
                )}
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </DrawerBody>

        <DrawerFooter borderTop="1px solid" borderColor={borderCol} py="10px" px="16px">
          <Flex justify="space-between" w="100%">
            <Button
              size="xs"
              colorScheme="red"
              variant="ghost"
              leftIcon={<Icon as={MdDelete} />}
              onClick={() => {
                onClose();
                if (onDeleteDevice) onDeleteDevice(device.id);
              }}>
              Unmount
            </Button>
            <Button size="xs" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </Flex>
        </DrawerFooter>

        {isEnclosure && !isHX5Enclosure && (
          <InsertBladeModal
            isOpen={isInsertOpen}
            onClose={() => setIsInsertOpen(false)}
            targetBay={targetBayNumber}
            onInsertBlade={handleInsertBlade}
          />
        )}

        {isHX5Enclosure && (
          <ConfigureHX5ModuleModal
            isOpen={isHX5ModalOpen}
            onClose={() => setIsHX5ModalOpen(false)}
            device={device}
            onUpdateDevice={onUpdateDevice}
            initialTab={hx5InitialTab}
            initialSlot={hx5InitialSlot}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}
