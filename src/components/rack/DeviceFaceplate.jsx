import React from 'react';
import {
  Badge,
  Box,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import PortNode from './PortGlyph';
import EnclosureFaceplate from './EnclosureFaceplate';
import { MdDelete, MdMoreVert, MdSwapHoriz } from 'react-icons/md';

/**
 * Format clean concise Device ID for left mounting ear (e.g. SW01, PP01, SRV01, ENC01)
 */
export function getDeviceDisplayId(device) {
  if (!device) return 'DEV';
  if (device.reference) return String(device.reference).toUpperCase();
  if (device.name && device.name.trim().length <= 6 && !device.name.includes(' ')) {
    return device.name.trim().toUpperCase();
  }
  const cat = (device.category || '').toLowerCase();
  const num = String(device.id || 1).padStart(2, '0');
  if (cat.includes('enclosure') || cat.includes('blade') || (device.model || '').toLowerCase().includes('m1000e')) return `ENC${num}`;
  if (cat.includes('switch')) return `SW${num}`;
  if (cat.includes('patch')) return `PP${num}`;
  if (cat.includes('server')) return `SRV${num}`;
  if (cat.includes('router')) return `RTR${num}`;
  if (cat.includes('power') || cat.includes('ups')) return `PDU${num}`;
  if (cat.includes('cable') || cat.includes('management')) return `CM${num}`;
  return `DEV${num}`;
}

export default function DeviceFaceplate({
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
  const isEnclosure =
    (device?.category || '').toLowerCase() === 'enclosure' ||
    device?.enclosureData?.isEnclosure ||
    device?.enclosureData?.type === 'modular_enclosure' ||
    Boolean(device?.enclosureData?.frontBays) ||
    (device?.model || '').toLowerCase().includes('m1000e');

  if (isEnclosure) {
    return (
      <EnclosureFaceplate
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

  const uHeight = device.uHeight || 1;
  const heightPx = uHeight * 28 - 2; // 28px per 1U with 2px slot gap

  // Filter ports strictly for the currently active face (front vs rear)
  const isRear = activeFace.toLowerCase() === 'rear';
  const visiblePorts = (device.ports || []).filter((p) => {
    const portFace = (p.face || '').toLowerCase();
    return isRear ? portFace === 'rear' : portFace !== 'rear';
  });

  // Check if any ports on the OPPOSITE face have active cable connections
  const oppositeFace = isRear ? 'front' : 'rear';
  const oppositePorts = (device.ports || []).filter((p) => {
    const portFace = (p.face || '').toLowerCase();
    return isRear ? portFace !== 'rear' : portFace === 'rear';
  });
  const oppositeConnectedCables = cables.filter((c) =>
    oppositePorts.some((op) => op.id === c.fromPortId || op.id === c.toPortId)
  );

  // Map cables to visible ports for quick lookup
  const getPortCable = (portId) => {
    return cables.find((c) => c.fromPortId === portId || c.toPortId === portId);
  };

  const chassisBg = device.color || '#1A202C';
  const earBg = isSelected ? '#2e817d' : '#2D3748';
  const earBorder = isSelected ? '#a3d4d1' : '#4A5568';
  const displayId = getDeviceDisplayId(device);

  const statusLedColor =
    device.status === 'online'
      ? '#48BB78'
      : device.status === 'warning'
      ? '#ff745b'
      : '#E53E3E';

  return (
    <Box
      data-device-id={device.id}
      data-device-faceplate="true"
      position="relative"
      w="100%"
      h={`${heightPx}px`}
      borderRadius="4px"
      bg={chassisBg}
      opacity={isDragging ? 0.4 : 1}
      boxShadow={
        isDragging
          ? '0 0 0 2px #3d9e99, 0 4px 12px rgba(61, 158, 153, 0.4)'
          : isSelected
          ? '0 0 0 2px #3d9e99, 0 4px 12px rgba(163, 212, 209, 0.45)'
          : 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.3)'
      }
      border={
        isDragging
          ? '2px dashed #3d9e99'
          : isSelected
          ? '1px solid #a3d4d1'
          : '1px solid rgba(0,0,0,0.5)'
      }
      overflow="visible"
      transition="all 0.15s ease"
      cursor="pointer"
      role="group"
      onClick={(e) => {
        e.stopPropagation();
        if (onSelectDevice) onSelectDevice(device);
      }}>
      {/* Left 19" Rack Mounting Ear (Displays Device ID only, rotated -90deg) */}
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
        zIndex={2}
        userSelect="none"
        overflow="hidden"
        title={`Device ID: ${displayId} (Click for Properties)`}>
        {/* Subtle Status LED Dot at top of ear */}
        <Box
          position="absolute"
          top="3px"
          w="4px"
          h="4px"
          borderRadius="full"
          bg={statusLedColor}
          boxShadow={`0 0 3px ${statusLedColor}`}
        />

        {/* Rotated Device ID Text (Patchdocs specification) */}
        <Text
          fontSize="8px"
          fontWeight="800"
          color={isSelected ? '#FFFFFF' : 'whiteAlpha.900'}
          letterSpacing="0.6px"
          textTransform="uppercase"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(-180deg)',
            whiteSpace: 'nowrap',
          }}>
          {displayId}
        </Text>
      </Box>

      {/* Right 19" Rack Mounting Ear (Drag Handle with 2x4 Gripper Dots) */}
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
        zIndex={12}
        cursor="grab"
        _active={{ cursor: 'grabbing' }}
        _hover={{ bg: isSelected ? '#236562' : '#3A475C' }}
        title="Drag device to reorder / move slot in rack"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          e.preventDefault();
          if (onStartDragDevice) {
            onStartDragDevice(device, e);
          }
        }}>
        {/* 2x4 Gripper Dots handle: ALWAYS clearly visible on hover */}
        <Box
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

      {/* Face indicator badge (FRONT / REAR) & Ghost Pass-Through Badge */}
      <HStack
        position="absolute"
        right="22px"
        top="2px"
        spacing="4px"
        zIndex={3}>
        {/* Opposite Face Patched Ghost Badge */}
        {oppositeConnectedCables.length > 0 && (
          <Tooltip
            label={`${oppositeConnectedCables.length} connection(s) active on ${oppositeFace.toUpperCase()} face. Toggle rack view to inspect.`}
            fontSize="xs"
            hasArrow>
            <Badge
              colorScheme="coral"
              variant="solid"
              fontSize="8px"
              px="4px"
              py="1px"
              borderRadius="4px"
              cursor="help"
              display="flex"
              alignItems="center"
              gap="2px"
              onClick={(e) => e.stopPropagation()}>
              <Icon as={MdSwapHoriz} />
              {oppositeFace.toUpperCase()}: {oppositeConnectedCables.length}
            </Badge>
          </Tooltip>
        )}

        <Badge
          colorScheme={activeFace === 'front' ? 'teal' : 'orange'}
          variant="subtle"
          fontSize="8px"
          px="3px"
          py="0px"
          borderRadius="3px">
          {activeFace.toUpperCase()}
        </Badge>

        {/* Action Menu (Delete / Unmount) on hover */}
        {onDeleteDevice && (
          <Box
            opacity="0"
            _groupHover={{ opacity: 1 }}
            transition="opacity 0.2s"
            onClick={(e) => e.stopPropagation()}>
            <Menu size="xs">
              <MenuButton
                as={IconButton}
                icon={<Icon as={MdMoreVert} />}
                size="xs"
                w="16px"
                h="16px"
                minW="16px"
                variant="ghost"
                color="whiteAlpha.700"
                _hover={{ color: 'white', bg: 'whiteAlpha.200' }}
              />
              <MenuList bg="navy.800" borderColor="whiteAlpha.200" zIndex={20}>
                <MenuItem
                  icon={<Icon as={MdDelete} color="red.400" />}
                  fontSize="xs"
                  color="red.300"
                  _hover={{ bg: 'whiteAlpha.100' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDevice(device.id);
                  }}>
                  Unmount Device
                </MenuItem>
              </MenuList>
            </Menu>
          </Box>
        )}
      </HStack>

      {/* Ports Canvas Area (Device name is intentionally NOT printed on faceplate) */}
      <Box
        position="absolute"
        left="20px"
        right="20px"
        top="0"
        bottom="0"
        zIndex={4}>
        {visiblePorts.map((port) => (
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
        {oppositePorts.map((port) => (
          <Box
            key={`hidden-${port.id}`}
            id={`port-node-${port.id}`}
            data-port-id={port.id}
            data-port-face={port.face}
            data-hidden-face="true"
            data-port-pos-y={port.posY}
            position="absolute"
            left={`${(port.posX * 100).toFixed(2)}%`}
            top={`${(port.posY * 100).toFixed(2)}%`}
            w="14px"
            h="11px"
            transform="translate(-50%, -50%)"
            pointerEvents="none"
            visibility="hidden"
          />
        ))}
      </Box>
    </Box>
  );
}
