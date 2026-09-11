import React, { useState } from 'react';
import {
  Badge,
  Box,
  Flex,
  HStack,
  Icon,
  IconButton,
  Text,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import PortNode from './PortGlyph';
import InsertBladeModal from './InsertBladeModal';
import HX5EnclosureFaceplate from './HX5EnclosureFaceplate';
import {
  MdDelete,
  MdPowerSettingsNew,
  MdSettings,
  MdSwapHoriz,
} from 'react-icons/md';

export default function EnclosureFaceplate({
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
  const uHeight = device.uHeight || 10;
  const heightPx = uHeight * 28 - 2;

  // Insert Blade Modal State
  const {
    isOpen: isInsertOpen,
    onOpen: onOpenInsert,
    onClose: onCloseInsert,
  } = useDisclosure();
  const [targetBayNumber, setTargetBayNumber] = useState(1);
  const bezelBg = useColorModeValue('#141A28', '#0E131F');

  // Enclosure Data from device or default
  const rawEnclosureData = device.enclosureData;
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

  const isHX5 =
    (device.model || '').toLowerCase().includes('hx5') ||
    (device.name || '').toLowerCase().includes('hx5') ||
    enclosureData.type === 'hx5_enclosure' ||
    enclosureData.enclosureType === 'hx5';

  if (isHX5) {
    return (
      <HX5EnclosureFaceplate
        device={device}
        activeFace={activeFace}
        cables={cables}
        highlightedPortIds={highlightedPortIds}
        draftSourcePort={draftSourcePort}
        isSelected={isSelected}
        isDragging={isDragging}
        onStartDragDevice={onStartDragDevice}
        onSelectDevice={onSelectDevice}
        onPortClick={onPortClick}
        onPortHover={onPortHover}
        onDeleteDevice={onDeleteDevice}
        onUpdateDevice={onUpdateDevice}
      />
    );
  }

  const frontBays = enclosureData.frontBays || [];

  const bayLayout = enclosureData.bayLayout || {};
  const orientation = bayLayout.orientation || frontBays[0]?.orientation || 'vertical';
  const numRows = bayLayout.rows || (frontBays.length > 8 ? 2 : 1);
  const numCols = bayLayout.cols || Math.ceil((frontBays.length || 16) / numRows) || 8;

  const bayRows = [];
  for (let r = 0; r < numRows; r++) {
    bayRows.push(frontBays.slice(r * numCols, (r + 1) * numCols));
  }

  const rearComponents = enclosureData.rearComponents || {
    fabricCount: 6,
    psuCount: 6,
    fanCount: 9,
    cmcCount: 2,
  };
  const fanCount = rearComponents.fanCount ?? 9;
  const psuCount = rearComponents.psuCount ?? 6;
  const cmcCount = rearComponents.cmcCount ?? 2;
  const fabricCount = rearComponents.fabricCount ?? 6;

  // Color Theming
  const chassisBg = device.color || '#1A202C';
  const earBg = isSelected ? '#2e817d' : '#2D3748';
  const earBorder = isSelected ? '#a3d4d1' : '#4A5568';

  // Filter ports for the currently active face (front vs rear)
  const visiblePorts = (device.ports || []).filter(
    (p) => (p.face || 'front').toLowerCase() === activeFace.toLowerCase()
  );
  const oppositeFace = activeFace.toLowerCase() === 'front' ? 'rear' : 'front';
  const oppositePorts = (device.ports || []).filter(
    (p) => (p.face || 'front').toLowerCase() === oppositeFace
  );
  const oppositeConnectedCables = cables.filter((c) =>
    oppositePorts.some((op) => op.id === c.fromPortId || op.id === c.toPortId)
  );

  const getPortCable = (portId) => {
    return cables.find((c) => c.fromPortId === portId || c.toPortId === portId);
  };

  // Blade operations
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
      description: `${bladeData.model} (${bladeData.name}) is now online.`,
      status: 'success',
      duration: 3000,
    });
  };

  const handleEjectBlade = async (e, bayNum) => {
    e.stopPropagation();
    const targetBay = frontBays.find((b) => b.bayNumber === bayNum);
    const bladeName = targetBay?.blade?.name || `Blade in Bay ${bayNum}`;

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
      description: `${bladeName} removed from enclosure.`,
      status: 'info',
      duration: 2500,
    });
  };

  const handleToggleBladePower = async (e, bayNum) => {
    e.stopPropagation();
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

  // Count active blades and total power calculation
  const occupiedBaysCount = frontBays.filter((b) => b.occupied).length;
  const activeBladesCount = frontBays.filter((b) => b.occupied && b.blade?.powerState === 'on').length;
  const totalWatts = 600 + activeBladesCount * 360;

  return (
    <Box
      data-device-id={device.id}
      data-device-faceplate="true"
      data-is-enclosure="true"
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
          : 'inset 0 1px 0 rgba(255,255,255,0.1), 0 3px 6px rgba(0,0,0,0.4)'
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
      {/* Left 19" Rack Mounting Ear (Displays Enclosure ID rotated -90deg) */}
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
          {device.name?.slice(0, 7).toUpperCase() || 'M1000E'}
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
        _hover={{ bg: isSelected ? '#236562' : '#3A475C' }}
        title="Drag enclosure to reorder / move slot in rack"
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
            {uHeight}U
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

      {/* Top Indicators Badge: FRONT / REAR + Ghost opposite face */}
      <HStack position="absolute" right="24px" top="3px" spacing="4px" zIndex={15}>
        {oppositeConnectedCables.length > 0 && (
          <Tooltip
            label={`${oppositeConnectedCables.length} connection(s) active on ${oppositeFace.toUpperCase()} face.`}
            fontSize="xs"
            hasArrow>
            <Badge
              colorScheme="coral"
              variant="solid"
              fontSize="8px"
              px="4px"
              py="1px"
              borderRadius="4px">
              <Icon as={MdSwapHoriz} mr="2px" />
              {oppositeFace.toUpperCase()}: {oppositeConnectedCables.length}
            </Badge>
          </Tooltip>
        )}

        <Badge
          colorScheme={activeFace === 'front' ? 'teal' : 'orange'}
          variant="solid"
          fontSize="8px"
          px="4px"
          py="1px"
          borderRadius="4px">
          {activeFace.toUpperCase()}
        </Badge>
      </HStack>

      {/* ======================================================== */}
      {/* FRONT VIEW: MODULAR CHASSIS BEZEL & BLADE / SLED MATRIX */}
      {/* ======================================================== */}
      {activeFace === 'front' ? (
        <Flex
          position="absolute"
          left="20px"
          right="20px"
          top="0"
          bottom="0"
          direction="column"
          zIndex={5}>
          {/* Top Control Panel Bezel (32px) */}
          <Flex
            h="32px"
            bg={bezelBg}
            borderBottom="1px solid rgba(255,255,255,0.12)"
            px="8px"
            align="center"
            justify="space-between"
            userSelect="none">
            {/* Left: Brand Logo + Model label */}
            <HStack spacing="6px">
              <Box
                w="16px"
                h="16px"
                borderRadius="full"
                border="1px solid #4299E1"
                display="flex"
                alignItems="center"
                justifyContent="center">
                <Text fontSize="7px" fontWeight="900" color="#4299E1" lineHeight="1">
                  {(device.manufacturer || 'ENC').slice(0, 4).toUpperCase()}
                </Text>
              </Box>
              <Text
                fontSize="11px"
                fontWeight="800"
                color="whiteAlpha.900"
                letterSpacing="0.4px"
                textTransform="uppercase">
                {device.model || device.name || 'Modular Enclosure'}
              </Text>
              <Badge colorScheme="blue" variant="subtle" fontSize="9px" px="4px">
                {orientation === 'horizontal' ? 'Multi-Node Sled' : 'Modular Enclosure'}
              </Badge>
            </HStack>

            {/* Center: Backlit LCD Interactive Display */}
            <HStack
              bg="#07192C"
              border="1px solid #1A365D"
              borderRadius="4px"
              px="8px"
              py="2px"
              spacing="8px"
              boxShadow="inset 0 0 6px rgba(0, 181, 216, 0.25)">
              <Box w="6px" h="6px" borderRadius="full" bg="#00B5D8" boxShadow="0 0 4px #00B5D8" />
              <Text
                fontSize="9px"
                fontFamily="mono"
                fontWeight="700"
                color="#00B5D8"
                letterSpacing="0.5px">
                CMC1: OK | {totalWatts}W | 22°C | {occupiedBaysCount}/{frontBays.length} BAYS
              </Text>
            </HStack>

            {/* Right: Quick Enclosure Actions */}
            <HStack spacing="6px">
              <Tooltip label="Click to open Enclosure Properties & Components" fontSize="xs">
                <Badge
                  colorScheme="brand"
                  fontSize="9px"
                  px="6px"
                  py="1px"
                  cursor="pointer"
                  borderRadius="4px"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectDevice) onSelectDevice(device);
                  }}>
                  <Icon as={MdSettings} mr="2px" />
                  Manage
                </Badge>
              </Tooltip>
            </HStack>
          </Flex>

          {/* Modular Blade or Horizontal Sled Matrix Canvas */}
          <Box flex="1" p="4px 2px" position="relative" overflow="hidden">
            <VStack spacing="4px" h="100%" align="stretch">
              {bayRows.map((rowBays, rIdx) => (
                <Flex
                  key={`bay-row-${rIdx}`}
                  flex="1"
                  gap={orientation === 'horizontal' ? '4px' : '3px'}
                  justify="space-between">
                  {rowBays.map((bay) =>
                    orientation === 'horizontal' ? (
                      <HorizontalSledSlot
                        key={bay.bayNumber}
                        bay={bay}
                        onOpenInsert={() => {
                          setTargetBayNumber(bay.bayNumber);
                          onOpenInsert();
                        }}
                        onEject={(e) => handleEjectBlade(e, bay.bayNumber)}
                        onTogglePower={(e) => handleToggleBladePower(e, bay.bayNumber)}
                        onInspectBlade={() => {
                          if (onSelectDevice) onSelectDevice(device);
                        }}
                      />
                    ) : (
                      <BladeBaySlot
                        key={bay.bayNumber}
                        bay={bay}
                        onOpenInsert={() => {
                          setTargetBayNumber(bay.bayNumber);
                          onOpenInsert();
                        }}
                        onEject={(e) => handleEjectBlade(e, bay.bayNumber)}
                        onTogglePower={(e) => handleToggleBladePower(e, bay.bayNumber)}
                        onInspectBlade={() => {
                          if (onSelectDevice) onSelectDevice(device);
                        }}
                      />
                    )
                  )}
                </Flex>
              ))}
            </VStack>
          </Box>
        </Flex>
      ) : (
        /* ======================================================== */
        /* REAR VIEW: I/O FABRIC SWITCHES, FANS, CMCS & PSUS */
        /* ======================================================== */
        <Box
          position="absolute"
          left="20px"
          right="20px"
          top="0"
          bottom="0"
          zIndex={5}
          p="6px"
          bg={bezelBg}
          userSelect="none">
          {/* Rear Modular Layout Header */}
          <Flex justify="space-between" align="center" mb="4px" px="4px">
            <Text fontSize="10px" fontWeight="800" color="whiteAlpha.800" textTransform="uppercase">
              Rear Modular Bays — {fabricCount}x Fabrics • {psuCount}x PSUs • {cmcCount}x CMCs • {fanCount}x Fans
            </Text>
            <Badge colorScheme="orange" fontSize="9px" px="4px">
              Configurable Rear Modular
            </Badge>
          </Flex>

          {/* Rear Sections Canvas */}
          <Flex direction="column" h="calc(100% - 22px)" justify="space-between">
            {/* Top Fabric Modules: Fabric A1 & A2 (10GbE Switches) */}
            <Box
              h="70px"
              bg="#1E2638"
              borderRadius="4px"
              border="1px solid #2D3748"
              p="4px"
              position="relative">
              <Flex justify="space-between" align="center" mb="2px">
                <HStack spacing="6px">
                  <Badge colorScheme="blue" fontSize="8px">Fabric A1 (10GbE Switch)</Badge>
                  <Badge colorScheme="blue" fontSize="8px">Fabric A2 (10GbE Switch)</Badge>
                </HStack>
                <Text fontSize="8px" color="gray.400">{device.manufacturer || 'Modular'} Fabrics ({fabricCount} Total)</Text>
              </Flex>

              {/* Fabric A Ports Canvas */}
              <Box position="relative" h="44px" borderTop="1px solid rgba(255,255,255,0.06)" pt="2px">
                {visiblePorts
                  .filter((p) => p.name.startsWith('Fab-A'))
                  .map((port) => (
                    <PortNode
                      key={port.id}
                      port={port}
                      rackId={device.rackId}
                      deviceId={device.id}
                      connectedCable={getPortCable(port.id)}
                      isHighlighted={highlightedPortIds && highlightedPortIds.has(port.id)}
                      isDraftingSource={draftSourcePort?.id === port.id}
                      onClick={onPortClick}
                      onHover={onPortHover}
                    />
                  ))}
              </Box>
            </Box>

            {/* Mid Fabric Modules: Fabric B1 & B2 (SFP+ Modules) + Fans + CMCs */}
            <Flex h="78px" gap="4px" align="center">
              {/* Fabric B1 SFP Module */}
              <Box flex="1" h="100%" bg="#1A202C" borderRadius="4px" border="1px solid #2D3748" p="4px">
                <Text fontSize="8px" fontWeight="700" color="coral.300">Fabric B1 (SFP+ Pass)</Text>
                <Box position="relative" h="48px">
                  {visiblePorts
                    .filter((p) => p.name.startsWith('Fab-B1'))
                    .map((port) => (
                      <PortNode
                        key={port.id}
                        port={port}
                        rackId={device.rackId}
                        deviceId={device.id}
                        connectedCable={getPortCable(port.id)}
                        isHighlighted={highlightedPortIds && highlightedPortIds.has(port.id)}
                        isDraftingSource={draftSourcePort?.id === port.id}
                        onClick={onPortClick}
                        onHover={onPortHover}
                      />
                    ))}
                </Box>
              </Box>

              {/* Cooling Fans Grid */}
              <Box w="100px" h="100%" bg="#111726" borderRadius="4px" border="1px solid #2D3748" p="2px">
                <Text fontSize="7px" fontWeight="700" color="gray.400" textAlign="center">
                  {fanCount}x Hot-Plug Fans
                </Text>
                <Flex wrap="wrap" justify="center" gap="3px" mt="2px">
                  {Array.from({ length: fanCount }).map((_, fIdx) => {
                    const fan = fIdx + 1;
                    return (
                      <Tooltip key={`fan-${fan}`} label={`Fan ${fan}: 6,400 RPM (Normal)`} fontSize="9px">
                        <Box
                          w="16px"
                          h="16px"
                          borderRadius="full"
                          bg="#1A2234"
                          border="1px solid #283141"
                          display="flex"
                          alignItems="center"
                          justifyContent="center">
                          <Box w="6px" h="6px" borderRadius="full" bg="#48BB78" opacity="0.8" />
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Flex>
              </Box>

              {/* CMCs: CMC 1 & 2 with Management Ports */}
              <Box w="60px" h="100%" bg="#1A202C" borderRadius="4px" border="1px solid #2D3748" p="2px">
                <Text fontSize="7px" fontWeight="700" color="teal.300" textAlign="center">
                  CMC 1{cmcCount > 1 ? ` / ${cmcCount}` : ''}
                </Text>
                <Box position="relative" h="48px">
                  {visiblePorts
                    .filter((p) => p.name.startsWith('CMC'))
                    .map((port) => (
                      <PortNode
                        key={port.id}
                        port={port}
                        rackId={device.rackId}
                        deviceId={device.id}
                        connectedCable={getPortCable(port.id)}
                        isHighlighted={highlightedPortIds && highlightedPortIds.has(port.id)}
                        isDraftingSource={draftSourcePort?.id === port.id}
                        onClick={onPortClick}
                        onHover={onPortHover}
                      />
                    ))}
                </Box>
              </Box>

              {/* Fabric B2 SFP Module */}
              <Box flex="1" h="100%" bg="#1A202C" borderRadius="4px" border="1px solid #2D3748" p="4px">
                <Text fontSize="8px" fontWeight="700" color="coral.300">Fabric B2 (SFP+ Pass)</Text>
                <Box position="relative" h="48px">
                  {visiblePorts
                    .filter((p) => p.name.startsWith('Fab-B2'))
                    .map((port) => (
                      <PortNode
                        key={port.id}
                        port={port}
                        rackId={device.rackId}
                        deviceId={device.id}
                        connectedCable={getPortCable(port.id)}
                        isHighlighted={highlightedPortIds && highlightedPortIds.has(port.id)}
                        isDraftingSource={draftSourcePort?.id === port.id}
                        onClick={onPortClick}
                        onHover={onPortHover}
                      />
                    ))}
                </Box>
              </Box>
            </Flex>

            {/* Bottom Row: Power Supplies (PSU 1 to psuCount) */}
            <Box
              h="56px"
              bg="#141A28"
              borderRadius="4px"
              border="1px solid #2D3748"
              p="3px"
              position="relative">
              <Flex justify="space-between" align="center" mb="1px" px="4px">
                <Text fontSize="8px" fontWeight="700" color="yellow.400">
                  {psuCount}x High-Efficiency PSUs ({Math.ceil(psuCount / 2)}+{Math.floor(psuCount / 2)} Redundant)
                </Text>
                <Badge colorScheme="green" fontSize="7px">AC INPUT OK</Badge>
              </Flex>

              {/* PSU Ports Canvas */}
              <Box position="relative" h="36px">
                {visiblePorts
                  .filter((p) => p.name.startsWith('PSU'))
                  .map((port) => (
                    <PortNode
                      key={port.id}
                      port={port}
                      rackId={device.rackId}
                      deviceId={device.id}
                      connectedCable={getPortCable(port.id)}
                      isHighlighted={highlightedPortIds && highlightedPortIds.has(port.id)}
                      isDraftingSource={draftSourcePort?.id === port.id}
                      onClick={onPortClick}
                      onHover={onPortHover}
                    />
                  ))}
              </Box>
            </Box>
          </Flex>
        </Box>
      )}

      {/* Insert Blade Modal */}
      <InsertBladeModal
        isOpen={isInsertOpen}
        onClose={onCloseInsert}
        targetBay={targetBayNumber}
        onInsertBlade={handleInsertBlade}
      />
    </Box>
  );
}

/**
 * Single Blade Bay Component:
 * If empty: renders bay slot frame with slot number and click to insert blade.
 * If occupied: renders realistic blade server with latch, status LED, label, and hover menu.
 */
function BladeBaySlot({
  bay,
  onOpenInsert,
  onEject,
  onTogglePower,
  onInspectBlade,
}) {
  const isOccupied = bay.occupied && bay.blade;
  const blade = bay.blade;
  const isPowerOn = blade?.powerState === 'on';

  const statusColor =
    !isPowerOn
      ? '#718096'
      : blade?.status === 'online'
      ? '#48BB78'
      : blade?.status === 'warning'
      ? '#ED8936'
      : '#E53E3E';

  if (!isOccupied) {
    return (
      <Box
        flex="1"
        h="100%"
        borderRadius="3px"
        bg="#141A28"
        border="1px dashed"
        borderColor="rgba(255,255,255,0.12)"
        position="relative"
        cursor="pointer"
        role="group"
        transition="all 0.15s ease"
        _hover={{
          borderColor: 'brand.400',
          bg: 'rgba(49, 130, 206, 0.08)',
          transform: 'scale(1.02)',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onOpenInsert();
        }}
        title={`Bay ${bay.bayNumber} (Empty) — Click to insert blade server`}>
        {/* Subtle ventilation lines */}
        <Box
          position="absolute"
          top="14px"
          bottom="14px"
          left="4px"
          right="4px"
          opacity="0.25"
          backgroundImage="repeating-linear-gradient(0deg, #2D3748, #2D3748 1px, transparent 1px, transparent 4px)"
        />

        {/* Slot Number */}
        <Flex
          direction="column"
          align="center"
          justify="center"
          h="100%"
          userSelect="none">
          <Text fontSize="7px" fontWeight="800" color="gray.500" letterSpacing="0.4px">
            BAY {String(bay.bayNumber).padStart(2, '0')}
          </Text>
          <Box
            opacity="0"
            _groupHover={{ opacity: 1 }}
            transition="opacity 0.15s"
            mt="4px">
            <Badge colorScheme="brand" fontSize="7px" px="3px" borderRadius="2px">
              + Insert
            </Badge>
          </Box>
        </Flex>
      </Box>
    );
  }

  // OCCUPIED BLADE SERVER
  return (
    <Box
      flex="1"
      h="100%"
      borderRadius="3px"
      bg="#222A3A"
      border="1px solid"
      borderColor={isPowerOn ? '#3d9e99' : '#4A5568'}
      boxShadow={isPowerOn ? 'inset 0 0 4px rgba(163, 212, 209, 0.25)' : 'none'}
      position="relative"
      cursor="pointer"
      role="group"
      overflow="hidden"
      transition="all 0.15s ease"
      _hover={{
        borderColor: '#a3d4d1',
        boxShadow: '0 0 8px rgba(163, 212, 209, 0.55)',
        transform: 'scale(1.02)',
        zIndex: 6,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onInspectBlade();
      }}
      title={`Bay ${bay.bayNumber}: ${blade.name} (${blade.model})\nStatus: ${blade.status?.toUpperCase()} | Power: ${blade.powerState?.toUpperCase()}\nSpecs: ${blade.specs || 'N/A'}`}>
      {/* Top Ejection Handle Latch */}
      <Box
        h="8px"
        bg="#374359"
        borderBottom="1px solid rgba(0,0,0,0.5)"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px="2px">
        <Box w="3px" h="3px" borderRadius="full" bg="#718096" />
        <Box w="6px" h="2px" bg="#A0AEC0" borderRadius="1px" />
        <Box w="3px" h="3px" borderRadius="full" bg="#718096" />
      </Box>

      {/* Blade Status LED + Bay Number */}
      <Flex justify="space-between" align="center" px="2px" pt="2px">
        <Tooltip label={`Power: ${blade.powerState?.toUpperCase()}`} fontSize="9px">
          <Box
            w="5px"
            h="5px"
            borderRadius="full"
            bg={statusColor}
            boxShadow={isPowerOn ? `0 0 4px ${statusColor}` : 'none'}
          />
        </Tooltip>
        <Text fontSize="6px" fontWeight="800" color="whiteAlpha.600">
          {String(bay.bayNumber).padStart(2, '0')}
        </Text>
      </Flex>

      {/* Vertical Blade Hostname / Model Text */}
      <Flex
        direction="column"
        align="center"
        justify="center"
        h="calc(100% - 28px)"
        overflow="hidden"
        userSelect="none">
        <Text
          fontSize="7px"
          fontWeight="800"
          color="whiteAlpha.900"
          letterSpacing="0.4px"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(-180deg)',
            whiteSpace: 'nowrap',
          }}>
          {blade.name}
        </Text>
      </Flex>

      {/* Bottom mini release clip */}
      <Box
        position="absolute"
        bottom="0"
        left="0"
        right="0"
        h="5px"
        bg="#2D3748"
        borderTop="1px solid rgba(0,0,0,0.4)"
      />

      {/* Hover Action Overlay */}
      <Box
        position="absolute"
        inset="0"
        bg="rgba(10, 15, 29, 0.88)"
        opacity="0"
        _groupHover={{ opacity: 1 }}
        transition="opacity 0.15s ease"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="space-around"
        p="2px"
        zIndex={10}>
        <Tooltip label={isPowerOn ? 'Power Off Blade' : 'Power On Blade'} fontSize="9px">
          <IconButton
            size="xs"
            w="18px"
            h="18px"
            minW="18px"
            colorScheme={isPowerOn ? 'green' : 'gray'}
            variant="solid"
            icon={<Icon as={MdPowerSettingsNew} w="10px" h="10px" />}
            onClick={onTogglePower}
          />
        </Tooltip>

        <Tooltip label="Eject Blade" fontSize="9px">
          <IconButton
            size="xs"
            w="18px"
            h="18px"
            minW="18px"
            colorScheme="red"
            variant="solid"
            icon={<Icon as={MdDelete} w="10px" h="10px" />}
            onClick={onEject}
          />
        </Tooltip>
      </Box>
    </Box>
  );
}

/**
 * Horizontal Sled Bay Component (for multi-node sled enclosures like Supermicro Twin/BigTwin, Dell MX7000/FX2):
 * If empty: renders dashed sled bay frame with slot number and click to insert sled.
 * If occupied: renders realistic horizontal sled node with left release latch, status LED, hostname, and hover menu.
 */
function HorizontalSledSlot({
  bay,
  onOpenInsert,
  onEject,
  onTogglePower,
  onInspectBlade,
}) {
  const isOccupied = bay.occupied && bay.blade;
  const blade = bay.blade;
  const isPowerOn = blade?.powerState === 'on';

  const statusColor =
    !isPowerOn
      ? '#718096'
      : blade?.status === 'online'
      ? '#48BB78'
      : blade?.status === 'warning'
      ? '#ED8936'
      : '#E53E3E';

  if (!isOccupied) {
    return (
      <Box
        flex="1"
        h="100%"
        borderRadius="3px"
        bg="#141A28"
        border="1px dashed"
        borderColor="rgba(255,255,255,0.14)"
        position="relative"
        cursor="pointer"
        role="group"
        transition="all 0.15s ease"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px="8px"
        _hover={{
          borderColor: 'brand.400',
          bg: 'rgba(49, 130, 206, 0.08)',
          transform: 'scale(1.01)',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onOpenInsert();
        }}
        title={`Sled / Bay ${bay.bayNumber} (Empty) — Click to insert modular sled/node`}>
        {/* Subtle ventilation lines */}
        <Box
          position="absolute"
          top="4px"
          bottom="4px"
          left="20%"
          right="20%"
          opacity="0.2"
          backgroundImage="repeating-linear-gradient(90deg, #2D3748, #2D3748 1px, transparent 1px, transparent 4px)"
        />
        <HStack spacing="6px" zIndex={2}>
          <Box w="6px" h="10px" borderRadius="2px" bg="#2D3748" border="1px solid #4A5568" />
          <Text fontSize="8px" fontWeight="800" color="gray.400" letterSpacing="0.4px">
            SLED {String(bay.bayNumber).padStart(2, '0')}
          </Text>
        </HStack>
        <Badge
          colorScheme="brand"
          fontSize="7px"
          px="4px"
          borderRadius="2px"
          opacity="0"
          _groupHover={{ opacity: 1 }}
          transition="opacity 0.15s"
          zIndex={2}>
          + Insert Sled
        </Badge>
      </Box>
    );
  }

  return (
    <Box
      flex="1"
      h="100%"
      borderRadius="3px"
      bg="#202838"
      border="1px solid"
      borderColor={isPowerOn ? '#3d9e99' : '#4A5568'}
      boxShadow={isPowerOn ? 'inset 0 0 4px rgba(163, 212, 209, 0.25)' : 'none'}
      position="relative"
      cursor="pointer"
      role="group"
      overflow="hidden"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      px="6px"
      transition="all 0.15s ease"
      _hover={{
        borderColor: '#a3d4d1',
        boxShadow: '0 0 8px rgba(163, 212, 209, 0.55)',
        transform: 'scale(1.01)',
        zIndex: 6,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onInspectBlade();
      }}
      title={`Sled ${bay.bayNumber}: ${blade.name} (${blade.model})\nStatus: ${blade.status?.toUpperCase()} | Power: ${blade.powerState?.toUpperCase()}\nSpecs: ${blade.specs || 'N/A'}`}>
      {/* Left Sled Handle with Status LED & Bay number */}
      <HStack spacing="6px" zIndex={2}>
        <Box w="6px" h="14px" borderRadius="2px" bg="#374359" border="1px solid #4A5568" />
        <Tooltip label={`Power: ${blade.powerState?.toUpperCase()}`} fontSize="9px">
          <Box
            w="6px"
            h="6px"
            borderRadius="full"
            bg={statusColor}
            boxShadow={isPowerOn ? `0 0 4px ${statusColor}` : 'none'}
          />
        </Tooltip>
        <Text fontSize="7px" fontWeight="800" color="whiteAlpha.700">
          #{String(bay.bayNumber).padStart(2, '0')}
        </Text>
      </HStack>

      {/* Center Sled Info */}
      <HStack spacing="8px" zIndex={2} overflow="hidden" flex="1" px="6px">
        <Text fontSize="9px" fontWeight="800" color="whiteAlpha.900" isTruncated>
          {blade.name}
        </Text>
        <Badge fontSize="7px" colorScheme="blue" variant="subtle">
          {blade.model}
        </Badge>
      </HStack>

      {/* Hover Action Overlay */}
      <Box
        position="absolute"
        right="0"
        top="0"
        bottom="0"
        bg="rgba(10, 15, 29, 0.92)"
        opacity="0"
        _groupHover={{ opacity: 1 }}
        transition="opacity 0.15s ease"
        display="flex"
        alignItems="center"
        gap="4px"
        px="6px"
        zIndex={10}>
        <Tooltip label={isPowerOn ? 'Power Off' : 'Power On'} fontSize="9px">
          <IconButton
            size="xs"
            w="18px"
            h="18px"
            minW="18px"
            colorScheme={isPowerOn ? 'green' : 'gray'}
            variant="solid"
            icon={<Icon as={MdPowerSettingsNew} w="10px" h="10px" />}
            onClick={onTogglePower}
          />
        </Tooltip>
        <Tooltip label="Eject Sled" fontSize="9px">
          <IconButton
            size="xs"
            w="18px"
            h="18px"
            minW="18px"
            colorScheme="red"
            variant="solid"
            icon={<Icon as={MdDelete} w="10px" h="10px" />}
            onClick={onEject}
          />
        </Tooltip>
      </Box>
    </Box>
  );
}

