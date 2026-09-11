import React, { useState } from 'react';
import {
  Badge,
  Box,
  Flex,
  HStack,
  Icon,
  IconButton,
  Image,
  Text,
  Tooltip,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import {
  MdDelete,
  MdPowerSettingsNew,
  MdSettings,
} from 'react-icons/md';
import PortNode from './PortGlyph';
import ConfigureHX5ModuleModal from './ConfigureHX5ModuleModal';
import {
  getDefaultHX5EnclosureData,
  generateHX5DevicePorts,
  HX5_MODULE_TEMPLATES,
} from '../../utils/hx5EnclosureHelper';

export default function HX5EnclosureFaceplate({
  device,
  activeFace = 'front', // 'front' or 'rear'
  cables = [],
  highlightedPortIds,
  draftSourcePort = null,
  isSelected = false,
  isDragging = false,
  onStartDragDevice,
  onSelectDevice,
  onPortClick,
  onPortHover,
  onDeleteDevice,
  onUpdateDevice,
}) {
  const toast = useToast();
  const uHeight = device.uHeight || 5;
  const heightPx = uHeight * 28 - 2; // 138px for 5U

  // Modal State for ConfigureHX5ModuleModal
  const {
    isOpen: isConfigOpen,
    onOpen: onOpenConfig,
    onClose: onCloseConfig,
  } = useDisclosure();
  const [modalInitialTab, setModalInitialTab] = useState(0);
  const [modalInitialSlot, setModalInitialSlot] = useState(null);

  // Parse enclosure data
  const rawEnclosureData = device.enclosureData;
  const parsedData =
    typeof rawEnclosureData === 'string'
      ? (() => {
          try {
            return JSON.parse(rawEnclosureData);
          } catch (e) {
            return {};
          }
        })()
      : rawEnclosureData || {};

  const defaultData = getDefaultHX5EnclosureData();
  const enclosureData = {
    ...defaultData,
    ...parsedData,
    frontSlots: parsedData.frontSlots || defaultData.frontSlots,
    rearModules: {
      ...defaultData.rearModules,
      ...(parsedData.rearModules || {}),
    },
    moduleTemplates: {
      ...HX5_MODULE_TEMPLATES,
      ...(parsedData.moduleTemplates || {}),
    },
  };

  const frontSlots = enclosureData.frontSlots || [];
  const rearModules = enclosureData.rearModules || {};
  const fans = rearModules.fans || [];
  const ioms = rearModules.ioms || [];
  const psus = rearModules.psus || [];

  const topIom = ioms.find((i) => i.slotNumber === 1) || {
    slotNumber: 1,
    installedModule: 'N120',
    status: 'online',
  };
  const bottomIom = ioms.find((i) => i.slotNumber === 2) || {
    slotNumber: 2,
    installedModule: 'N205',
    status: 'online',
  };

  // Color Theming (Amulet Hotkey Teal & Slate)
  const chassisBg = '#141A26';
  const earBg = isSelected ? '#2e817d' : '#242D3D';
  const earBorder = isSelected ? '#a3d4d1' : '#3E4C63';

  // Filter ports for the currently active face (front vs rear)
  const isRear = activeFace.toLowerCase() === 'rear';
  const visiblePorts = (device.ports || []).filter((p) => {
    const pFace = (p.face || 'front').toLowerCase();
    return isRear ? pFace === 'rear' : pFace !== 'rear';
  });

  const oppositeFace = isRear ? 'front' : 'rear';
  const oppositePorts = (device.ports || []).filter((p) => {
    const pFace = (p.face || 'front').toLowerCase();
    return isRear ? pFace !== 'rear' : pFace === 'rear';
  });
  const oppositeConnectedCables = cables.filter((c) =>
    oppositePorts.some((op) => op.id === c.fromPortId || op.id === c.toPortId)
  );

  const getPortCable = (portId) => {
    return cables.find((c) => c.fromPortId === portId || c.toPortId === portId);
  };

  // Count active compute nodes
  const occupiedFrontSlots = frontSlots.filter(
    (s) => s.occupied && s.moduleType && s.moduleType !== 'Empty' && s.moduleType !== 'NodeBlank'
  );
  const activeNodesCount = occupiedFrontSlots.filter((s) => s.power === 'on').length;
  const totalWatts = 400 + activeNodesCount * 320;

  // Handlers for quick node interactions
  const handleToggleNodePower = async (e, slotNumber) => {
    e.stopPropagation();
    const updatedFrontSlots = frontSlots.map((s) => {
      if (s.slotNumber === slotNumber) {
        const nextPower = s.power === 'on' ? 'off' : 'on';
        return { ...s, power: nextPower };
      }
      return s;
    });

    const updatedEnc = { ...enclosureData, frontSlots: updatedFrontSlots };
    const newPorts = generateHX5DevicePorts(updatedEnc);

    if (onUpdateDevice) {
      await onUpdateDevice(device.id, {
        enclosureData: updatedEnc,
        ports: newPorts,
      });
    }
  };

  const handleEjectNode = async (e, slotNumber) => {
    e.stopPropagation();
    const targetSlot = frontSlots.find((s) => s.slotNumber === slotNumber);
    const modName = targetSlot?.name || `Slot ${slotNumber}`;

    const updatedFrontSlots = frontSlots.map((s) => {
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

    const updatedEnc = { ...enclosureData, frontSlots: updatedFrontSlots };
    const newPorts = generateHX5DevicePorts(updatedEnc);

    if (onUpdateDevice) {
      await onUpdateDevice(device.id, {
        enclosureData: updatedEnc,
        ports: newPorts,
      });
    }

    toast({
      title: `Node Ejected from Slot ${slotNumber}`,
      description: `${modName} removed from enclosure.`,
      status: 'info',
      duration: 2500,
    });
  };

  const handleOpenSlotConfig = (slotType, slotNumber, tab = 0) => {
    setModalInitialSlot({ type: slotType, slotNumber });
    setModalInitialTab(tab);
    onOpenConfig();
  };

  return (
    <Box
      data-device-id={device.id}
      data-device-faceplate="true"
      data-is-enclosure="true"
      data-enclosure-type="hx5"
      position="relative"
      w="100%"
      h={`${heightPx}px`}
      borderRadius="4px"
      bg={chassisBg}
      opacity={isDragging ? 0.4 : 1}
      boxShadow={
        isDragging
          ? '0 0 0 2px #3d9e99, 0 6px 16px rgba(61, 158, 153, 0.45)'
          : isSelected
          ? '0 0 0 2px #3d9e99, 0 6px 16px rgba(163, 212, 209, 0.45)'
          : 'inset 0 1px 0 rgba(255,255,255,0.1), 0 3px 6px rgba(0,0,0,0.5)'
      }
      border={
        isDragging
          ? '2px dashed #3d9e99'
          : isSelected
          ? '1px solid #a3d4d1'
          : '1px solid rgba(0,0,0,0.6)'
      }
      overflow="hidden"
      transition="all 0.15s ease"
      cursor="pointer"
      role="group"
      onClick={(e) => {
        e.stopPropagation();
        if (onSelectDevice) onSelectDevice(device);
      }}>
      {/* Left 19" Rack Mounting Ear (Displays Rotated Enclosure ID) */}
      <Box
        position="absolute"
        left="0"
        top="0"
        bottom="0"
        w="19px"
        bg={earBg}
        borderRight="1px solid"
        borderColor={earBorder}
        borderTopLeftRadius="3px"
        borderBottomLeftRadius="3px"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        zIndex={10}
        userSelect="none">
        <Box
          position="absolute"
          top="6px"
          w="5px"
          h="5px"
          borderRadius="full"
          bg="#48BB78"
          boxShadow="0 0 4px #48BB78"
        />
        <Text
          fontSize="9px"
          fontWeight="800"
          color="whiteAlpha.900"
          letterSpacing="0.6px"
          textTransform="uppercase"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(-180deg)',
            whiteSpace: 'nowrap',
          }}>
          {device.name?.slice(0, 8).toUpperCase() || 'AH-HX5'}
        </Text>
      </Box>

      {/* Right 19" Rack Mounting Ear (Drag Handle) */}
      <Box
        data-device-drag-handle="true"
        data-device-id={device.id}
        position="absolute"
        right="0"
        top="0"
        bottom="0"
        w="19px"
        bg={earBg}
        borderLeft="1px solid"
        borderColor={earBorder}
        borderTopRightRadius="3px"
        borderBottomRightRadius="3px"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        zIndex={20}
        cursor="grab"
        _active={{ cursor: 'grabbing' }}
        _hover={{ bg: isSelected ? '#236562' : '#323E54' }}
        title="Drag HX5 enclosure to reorder / move slot in rack"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          e.preventDefault();
          if (onStartDragDevice) {
            onStartDragDevice(device, e);
          }
        }}>
        {/* Normal state: U Height label */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          _groupHover={{ opacity: 0 }}
          transition="opacity 0.15s ease"
          pointerEvents="none">
          <Text
            fontSize="8px"
            fontWeight="800"
            color="whiteAlpha.500"
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(-180deg)',
              whiteSpace: 'nowrap',
            }}>
            5U
          </Text>
        </Box>
        {/* Hover state: 2x4 Gripper Dots handle */}
        <Box
          position="absolute"
          opacity="0"
          _groupHover={{ opacity: 1 }}
          transition="opacity 0.15s ease"
          pointerEvents="none">
          <svg width="12" height="24" viewBox="0 0 12 24" fill="none">
            <circle cx="3" cy="3" r="1.5" fill="#CBD5E0" />
            <circle cx="9" cy="3" r="1.5" fill="#CBD5E0" />
            <circle cx="3" cy="9" r="1.5" fill="#CBD5E0" />
            <circle cx="9" cy="9" r="1.5" fill="#CBD5E0" />
            <circle cx="3" cy="15" r="1.5" fill="#CBD5E0" />
            <circle cx="9" cy="15" r="1.5" fill="#CBD5E0" />
            <circle cx="3" cy="21" r="1.5" fill="#CBD5E0" />
            <circle cx="9" cy="21" r="1.5" fill="#CBD5E0" />
          </svg>
        </Box>
      </Box>

      {/* Top Header Indicators: FRONT / REAR + Ghost opposite face count + Manage button */}
      <HStack position="absolute" right="24px" top="3px" spacing="5px" zIndex={15}>
        {oppositeConnectedCables.length > 0 && (
          <Badge
            colorScheme="purple"
            variant="solid"
            fontSize="7px"
            px="3px"
            py="0px"
            borderRadius="3px"
            title={`${oppositeConnectedCables.length} cables connected to ${oppositeFace}`}>
            {oppositeFace.toUpperCase()}: {oppositeConnectedCables.length} cables
          </Badge>
        )}
        <Badge
          colorScheme={!isRear ? 'teal' : 'orange'}
          variant="solid"
          fontSize="8px"
          px="4px"
          py="1px"
          borderRadius="4px">
          {activeFace.toUpperCase()}
        </Badge>
      </HStack>

      {/* ======================================================== */}
      {/* FRONT VIEW: PHOTOREALISTIC 12-SLOT NODE CHASSIS */}
      {/* ======================================================== */}
      {!isRear ? (
        <Box
          position="absolute"
          left="18px"
          right="18px"
          top="0"
          bottom="0"
          zIndex={5}
          overflow="hidden">
          {/* Photorealistic Background Base Image */}
          <Box
            position="absolute"
            inset="0"
            backgroundImage={`url('${enclosureData.images?.frontChassis || '/enclosure_front_empty.jpg'}')`}
            backgroundSize="cover"
            backgroundPosition="center"
            opacity={enclosureData.images?.frontChassisOpacity ?? 0.35}
            pointerEvents="none"
          />

          {/* 12 Vertical Node Sled Bays Canvas (Height ~98px) */}
          <Flex
            position="absolute"
            left="0px"
            right="0px"
            top="0px"
            bottom="16px"
            gap="0px"
            align="stretch">
            {frontSlots.map((slot) => {
              const isOccupied = slot.occupied && slot.moduleType && slot.moduleType !== 'Empty';
              const isBlank = slot.moduleType === 'NodeBlank';
              const isPowerOn = slot.power === 'on';
              const tmpl = enclosureData.moduleTemplates?.[slot.moduleType] || HX5_MODULE_TEMPLATES[slot.moduleType];

              return (
                <Box
                  key={`hx5-front-slot-${slot.slotNumber}`}
                  flex="1"
                  h="100%"
                  bg={
                    !isOccupied
                      ? 'rgba(17, 23, 38, 0.65)'
                      : isBlank
                      ? '#1E2533'
                      : isPowerOn
                      ? '#182030'
                      : '#1A212E'
                  }
                  border="1px solid"
                  borderColor={
                    !isOccupied
                      ? 'rgba(255,255,255,0.08)'
                      : isPowerOn
                      ? 'rgba(61, 158, 153, 0.6)'
                      : 'rgba(255,255,255,0.18)'
                  }
                  position="relative"
                  cursor="pointer"
                  role="group"
                  overflow="hidden"
                  transition="all 0.15s ease"
                  _hover={{
                    borderColor: '#3d9e99',
                    boxShadow: '0 0 8px rgba(61, 158, 153, 0.4)',
                    zIndex: 6,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenSlotConfig('front', slot.slotNumber, 0);
                  }}
                  title={
                    isOccupied
                      ? `Slot ${slot.slotNumber}: ${slot.name || slot.moduleType} (${isPowerOn ? 'ON' : 'OFF'})`
                      : `Slot ${slot.slotNumber} (Empty) — Click to insert node`
                  }>

                  {/* Slot Number Label at top of slot */}
                  {enclosureData.descriptions?.showSlotBadges !== false && (
                    <Box
                      position="absolute"
                      top="0"
                      left="0"
                      right="0"
                      h="10px"
                      bg="rgba(10, 15, 25, 0.85)"
                      borderBottom="1px solid rgba(255,255,255,0.12)"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      zIndex={7}
                      pointerEvents="none">
                      <Text fontSize="7px" fontWeight="900" color="gray.300">
                        {String(slot.slotNumber).padStart(2, '0')}
                      </Text>
                    </Box>
                  )}

                  {/* Node Face Visual / Sled Image */}
                  {isOccupied && tmpl?.image ? (
                    <Box
                      position="absolute"
                      inset="10px 0 0 0"
                      display="flex"
                      alignItems="center"
                      justifyContent="center">
                      <Image
                        src={tmpl.image}
                        alt={slot.moduleType}
                        w="100%"
                        h="100%"
                        objectFit="fill"
                        pointerEvents="none"
                      />
                    </Box>
                  ) : !isOccupied ? (
                    <Flex
                      direction="column"
                      align="center"
                      justify="center"
                      h="calc(100% - 10px)"
                      opacity="0.35">
                      <Text fontSize="6px" fontWeight="800" color="gray.400">
                        EMPTY
                      </Text>
                    </Flex>
                  ) : null}

                  {/* Compact Top Action Toolbar on Hover (Does NOT cover ports at bottom/middle of sled) */}
                  {isOccupied && (
                    <Box
                      position="absolute"
                      top="12px"
                      left="2px"
                      right="2px"
                      bg="rgba(10, 15, 29, 0.94)"
                      borderRadius="4px"
                      boxShadow="0 2px 6px rgba(0,0,0,0.6)"
                      border="1px solid rgba(61, 158, 153, 0.5)"
                      opacity="0"
                      _groupHover={{ opacity: 1 }}
                      transition="opacity 0.15s ease"
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      py="2px"
                      gap="2px"
                      zIndex={15}
                      pointerEvents="auto">
                      {!isBlank && (
                        <Tooltip label={isPowerOn ? 'Power Off Node' : 'Power On Node'} fontSize="9px" hasArrow>
                          <IconButton
                            size="xs"
                            w="15px"
                            h="15px"
                            minW="15px"
                            colorScheme={isPowerOn ? 'green' : 'gray'}
                            variant="solid"
                            icon={<Icon as={MdPowerSettingsNew} w="8px" h="8px" />}
                            onClick={(e) => handleToggleNodePower(e, slot.slotNumber)}
                          />
                        </Tooltip>
                      )}

                      <Tooltip label="Configure Slot" fontSize="9px" hasArrow>
                        <IconButton
                          size="xs"
                          w="15px"
                          h="15px"
                          minW="15px"
                          colorScheme="brand"
                          variant="solid"
                          icon={<Icon as={MdSettings} w="8px" h="8px" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSlotConfig('front', slot.slotNumber, 0);
                          }}
                        />
                      </Tooltip>

                      <Tooltip label="Eject Sled" fontSize="9px" hasArrow>
                        <IconButton
                          size="xs"
                          w="15px"
                          h="15px"
                          minW="15px"
                          colorScheme="red"
                          variant="solid"
                          icon={<Icon as={MdDelete} w="8px" h="8px" />}
                          onClick={(e) => handleEjectNode(e, slot.slotNumber)}
                        />
                      </Tooltip>
                    </Box>
                  )}

                  {/* Empty Slot Action on Hover */}
                  {!isOccupied && (
                    <Box
                      position="absolute"
                      inset="0"
                      bg="rgba(10, 15, 29, 0.8)"
                      opacity="0"
                      _groupHover={{ opacity: 1 }}
                      transition="opacity 0.15s ease"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      zIndex={15}
                      pointerEvents="auto">
                      <Badge colorScheme="brand" fontSize="7px" px="3px" borderRadius="2px">
                        + Insert
                      </Badge>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Flex>

          {/* Bottom Chassis Bezel Strip: Brand, Model, Chassis Power & USB */}
          {enclosureData.descriptions?.showSilkscreens !== false && (
            <Flex
              position="absolute"
              left="0"
              right="0"
              bottom="0"
              h="16px"
              px="6px"
              align="center"
              justify="space-between"
              borderTop="1px solid rgba(255,255,255,0.08)"
              bg="rgba(10, 14, 24, 0.85)"
              zIndex={10}>
              <HStack spacing="6px">
                <Text fontSize="8px" fontWeight="900" color="#3d9e99" letterSpacing="0.6px">
                  {enclosureData.descriptions?.frontBrand || 'AMULET HOTKEY'}
                </Text>
                <Text fontSize="7px" fontWeight="700" color="whiteAlpha.800">
                  {enclosureData.descriptions?.frontModel || 'CORESTATION HX5'}
                </Text>
                <Text fontSize="6px" color="gray.400">
                  {enclosureData.descriptions?.frontStatus || `${activeNodesCount}/12 NODES ACTIVE • ${totalWatts}W`}
                </Text>
              </HStack>
            </Flex>
          )}

          {/* Interactive Port Layer for Front Ports (Always on top of chassis/node overlays) */}
          <Box position="absolute" inset="0" zIndex={25} pointerEvents="none">
            {visiblePorts.map((port) => (
              <PortNode
                key={port.id || `front-port-${port.name}`}
                port={port}
                rackId={device.rackId}
                deviceId={device.id}
                connectedCable={getPortCable(port.id)}
                isHighlighted={highlightedPortIds && highlightedPortIds.has(port.id)}
                isDraftingSource={draftSourcePort?.id === port.id}
                onClick={onPortClick}
                onHover={onPortHover}
                zIndex={26}
              />
            ))}
          </Box>
        </Box>
      ) : (
        /* ======================================================== */
        /* REAR VIEW: 6 FANS (TOP) + 2 IOMS (MID) + 4 PSUS (BOTTOM) */
        /* ======================================================== */
        <Box
          position="absolute"
          left="20px"
          right="20px"
          top="0"
          bottom="0"
          zIndex={5}
          bg="#0E131F"
          userSelect="none"
          overflow="hidden">
          {/* Photorealistic Background Base Image for Rear if configured */}
          {enclosureData.images?.rearChassis && (
            <Box
              position="absolute"
              inset="0"
              backgroundImage={`url('${enclosureData.images.rearChassis}')`}
              backgroundSize="cover"
              backgroundPosition="center"
              opacity={enclosureData.images?.rearChassisOpacity ?? 0.25}
              pointerEvents="none"
            />
          )}

          {/* Header Strip */}
          {(enclosureData.descriptions?.showSilkscreens !== false) && (
            <Flex
              h="16px"
              px="6px"
              align="center"
              justify="space-between"
              borderBottom="1px solid rgba(255,255,255,0.08)"
              bg="rgba(10, 14, 24, 0.7)">
              <HStack spacing="6px">
                <Text fontSize="8px" fontWeight="900" color="#ff745b" letterSpacing="0.4px">
                  {enclosureData.descriptions?.rearHeader || 'HX5 REAR MODULAR'}
                </Text>
                <Text fontSize="7px" color="gray.400">
                  {`6x FANS • 2x IOM BAYS (TOP: ${topIom.installedModule}, BTM: ${bottomIom.installedModule}) • 4x PSUs`}
                </Text>
              </HStack>
              <Badge colorScheme="orange" fontSize="7px">
                REAR I/O & POWER
              </Badge>
            </Flex>
          )}

          {/* TIER 1: 6 HOT-PLUG COOLING FANS (Height ~30px) */}
          <Box
            position="absolute"
            left="4px"
            right="4px"
            top="18px"
            h="30px"
            borderRadius="3px"
            bg="#141B2B"
            border="1px solid #232D42"
            overflow="hidden">
            <Flex h="100%" align="center" justify="space-between">
              {fans.map((fan) => (
                <Tooltip
                  key={`rear-fan-${fan.slotNumber}`}
                  label={`Fan ${fan.slotNumber}: ${fan.installed ? `${fan.rpm || 6400} RPM OK` : 'Unpopulated'}${enclosureData.descriptions?.fanSection ? ` — ${enclosureData.descriptions.fanSection}` : ''}`}
                  fontSize="8px">
                  <Box
                    flex="1"
                    h="100%"
                    borderRight="1px solid rgba(255,255,255,0.06)"
                    position="relative"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    _hover={{ bg: 'whiteAlpha.100' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenSlotConfig('fan', fan.slotNumber, 0);
                    }}>
                    <Image
                      src={enclosureData.images?.fans || '/fan.jpg'}
                      alt={`Fan ${fan.slotNumber}`}
                      h="100%"
                      w="100%"
                      objectFit="cover"
                      opacity={fan.installed ? '0.75' : '0.2'}
                    />
                    <Box
                      position="absolute"
                      top="2px"
                      right="2px"
                      w="4px"
                      h="4px"
                      borderRadius="full"
                      bg={fan.installed ? '#48BB78' : '#718096'}
                      boxShadow={fan.installed ? '0 0 3px #48BB78' : 'none'}
                    />
                    {(enclosureData.descriptions?.showSlotBadges !== false) && (
                      <Text
                        position="absolute"
                        bottom="2px"
                        left="2px"
                        fontSize="6px"
                        fontWeight="800"
                        color="whiteAlpha.700">
                        F{fan.slotNumber}
                      </Text>
                    )}
                  </Box>
                </Tooltip>
              ))}
            </Flex>
          </Box>

          {/* TIER 2A: TOP IOM BAY (Slot 1: N100 / N120) (Height ~32px) */}
          <Box
            position="absolute"
            left="4px"
            right="4px"
            top="52px"
            h="32px"
            borderRadius="3px"
            bg="#161E30"
            border="1px solid"
            borderColor={topIom.installedModule !== 'Empty' ? 'teal.600' : 'gray.700'}
            overflow="hidden"
            cursor="pointer"
            role="group"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenSlotConfig('iom_top', 1, 0);
            }}
            title={`Top IOM (Slot 1): ${topIom.installedModule} — Click to configure module`}>
            {/* Background Texture & Transparent Overlay */}
            {(() => {
              const tmpl = enclosureData.moduleTemplates?.[topIom.installedModule];
              if (tmpl && tmpl.image) {
                return (
                  <Box position="absolute" inset="0">
                    <Image src={tmpl.image} alt="Top IOM Base" w="100%" h="100%" objectFit="cover" opacity="0.6" />
                    {tmpl.overlay && (
                      <Image
                        src={tmpl.overlay}
                        alt="Top IOM Overlay"
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
                );
              }
              if (topIom.installedModule === 'Empty') {
                return (
                  <Flex h="100%" align="center" justify="center" opacity="0.4">
                    <Text fontSize="8px" fontWeight="700" color="gray.400">
                      {enclosureData.descriptions?.topIomSection || 'TOP IOM BAY (EMPTY) — Click to install N100 / N120'}
                    </Text>
                  </Flex>
                );
              }
              return null;
            })()}

            {/* Left Slot Badge */}
            {(enclosureData.descriptions?.showSlotBadges !== false) && (
              <Badge
                position="absolute"
                left="3px"
                top="2px"
                colorScheme="teal"
                fontSize="6px"
                px="3px"
                py="0"
                borderRadius="2px"
                zIndex={5}>
                TOP: {topIom.installedModule}
              </Badge>
            )}
          </Box>

          {/* TIER 2B: BOTTOM IOM BAY (Slot 2: Blank / N205 / N230) (Height ~32px) */}
          <Box
            position="absolute"
            left="4px"
            right="4px"
            top="88px"
            h="32px"
            borderRadius="3px"
            bg="#161E30"
            border="1px solid"
            borderColor={bottomIom.installedModule !== 'Empty' ? 'teal.600' : 'gray.700'}
            overflow="hidden"
            cursor="pointer"
            role="group"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenSlotConfig('iom_bottom', 2, 0);
            }}
            title={`Bottom IOM (Slot 2): ${bottomIom.installedModule} — Click to configure module`}>
            {(() => {
              const tmpl = enclosureData.moduleTemplates?.[bottomIom.installedModule];
              if (tmpl && tmpl.image) {
                return (
                  <Box position="absolute" inset="0">
                    <Image
                      src={tmpl.image}
                      alt="Bottom IOM Base"
                      w="100%"
                      h="100%"
                      objectFit="cover"
                      opacity={tmpl.overlay ? "0.6" : "1.0"}
                      onError={(e) => {
                        const fallback = tmpl.fallbackImage || (tmpl.id === 'N230' ? '/network.jpg' : null);
                        if (fallback && !e.target.src.endsWith(fallback)) {
                          e.target.onerror = null;
                          e.target.src = fallback;
                        }
                      }}
                    />
                    {tmpl.overlay && (
                      <Image
                        src={tmpl.overlay}
                        alt="Bottom IOM Overlay"
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
                );
              }
              if (bottomIom.installedModule === 'Empty') {
                return (
                  <Flex h="100%" align="center" justify="center" opacity="0.4">
                    <Text fontSize="8px" fontWeight="700" color="gray.400">
                      {enclosureData.descriptions?.bottomIomSection || 'BOTTOM IOM BAY (EMPTY) — Click to install Blank / N205 / N230'}
                    </Text>
                  </Flex>
                );
              }
              return null;
            })()}

            {/* Left Slot Badge */}
            {(enclosureData.descriptions?.showSlotBadges !== false) && (
              <Badge
                position="absolute"
                left="3px"
                top="2px"
                colorScheme="teal"
                fontSize="6px"
                px="3px"
                py="0"
                borderRadius="2px"
                zIndex={5}>
                BTM: {bottomIom.installedModule}
              </Badge>
            )}
          </Box>

          {/* TIER 3: 4 HOT-PLUG PSUS (Height ~24px) */}
          <Box
            position="absolute"
            left="4px"
            right="4px"
            top="123px"
            h="24px"
            borderRadius="3px"
            bg="#111624"
            border="1px solid #232D42"
            overflow="hidden">
            <Flex h="100%" align="center" justify="space-between">
              {psus.map((psu) => (
                <Tooltip
                  key={`rear-psu-${psu.slotNumber}`}
                  label={`PSU ${psu.slotNumber}: ${psu.installed ? '1600W Titanium OK' : 'Unpopulated'}${enclosureData.descriptions?.psuSection ? ` — ${enclosureData.descriptions.psuSection}` : ''}`}
                  fontSize="8px">
                  <Box
                    flex="1"
                    h="100%"
                    borderRight="1px solid rgba(255,255,255,0.06)"
                    position="relative"
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    px="4px"
                    cursor="pointer"
                    _hover={{ bg: 'whiteAlpha.100' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenSlotConfig('psu', psu.slotNumber, 0);
                    }}>
                    <Image
                      src={enclosureData.images?.psus || '/psu.jpg'}
                      alt={`PSU ${psu.slotNumber}`}
                      position="absolute"
                      inset="0"
                      w="100%"
                      h="100%"
                      objectFit="cover"
                      opacity={psu.installed ? '0.7' : '0.2'}
                    />
                    <HStack spacing="4px" zIndex={2}>
                      <Box
                        w="4px"
                        h="4px"
                        borderRadius="full"
                        bg={psu.installed ? '#48BB78' : '#718096'}
                        boxShadow={psu.installed ? '0 0 3px #48BB78' : 'none'}
                      />
                      {(enclosureData.descriptions?.showSlotBadges !== false) && (
                        <Text fontSize="7px" fontWeight="800" color="whiteAlpha.800">
                          PSU {psu.slotNumber}
                        </Text>
                      )}
                    </HStack>
                    <Text fontSize="6px" color="gray.400" zIndex={2}>
                      {psu.installed ? '1600W' : 'OFF'}
                    </Text>
                  </Box>
                </Tooltip>
              ))}
            </Flex>
          </Box>


          {/* Interactive Port Layer for Rear Ports (Always on top of IOMs/Fans/PSUs) */}
          <Box position="absolute" inset="0" zIndex={25} pointerEvents="none">
            {visiblePorts.map((port) => (
              <PortNode
                key={port.id || `rear-port-${port.name}`}
                port={port}
                rackId={device.rackId}
                deviceId={device.id}
                connectedCable={getPortCable(port.id)}
                isHighlighted={highlightedPortIds && highlightedPortIds.has(port.id)}
                isDraftingSource={draftSourcePort?.id === port.id}
                onClick={onPortClick}
                onHover={onPortHover}
                zIndex={26}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Configuration Modal */}
      <ConfigureHX5ModuleModal
        isOpen={isConfigOpen}
        onClose={onCloseConfig}
        device={device}
        onUpdateDevice={onUpdateDevice}
        initialTab={modalInitialTab}
        initialSlot={modalInitialSlot}
      />
    </Box>
  );
}
