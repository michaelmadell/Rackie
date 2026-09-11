import React, { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Flex,
  HStack,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import DeviceFaceplate from './DeviceFaceplate';
import { MdAdd, MdDelete, MdMoreVert } from 'react-icons/md';

const U_SLOT_HEIGHT_PX = 28; // Standard vertical height in px per 1U
const RACK_CHASSIS_WIDTH = 340; // Width of 19" equipment bay in px
const RAIL_WIDTH = 22; // Width of EIA-310 rail
const DUCT_WIDTH = 20; // Width of vertical cable finger duct channel

export default function RackElevation({
  rack,
  devices = [],
  cables = [],
  highlightedPortIds,
  draftSourcePort = null,
  activeFace = 'front',
  onToggleFace,
  onPortClick,
  onPortHover,
  onMountDeviceClick,
  onDeleteDevice,
  onUpdateDevice,
  onDeleteRack,
  onUpdateRack,
  selectedDeviceId = null,
  onSelectDevice,
  draggingDeviceState = null,
  onStartDragDevice = null,
}) {
  // Independent Front vs Back view state for THIS individual rack (supports controlled and uncontrolled modes)
  const [localActiveFace, setLocalActiveFace] = useState('front');
  const currentFace = onToggleFace ? activeFace : localActiveFace;
  const handleToggle = (face) => {
    if (onToggleFace) {
      onToggleFace(face);
    } else {
      setLocalActiveFace(face);
    }
  };

  const uHeight = rack.uHeight || 42;
  const rackBodyHeight = uHeight * U_SLOT_HEIGHT_PX;

  // Theming colors
  const rackOuterBg = useColorModeValue('#2D3748', '#141A28');
  const rackInnerBg = useColorModeValue('#1A202C', '#0B0F19');
  const railBg = useColorModeValue('#4A5568', '#1F293D');
  const railBorder = useColorModeValue('#718096', '#2D3748');
  const ductBg = useColorModeValue('#283141', '#0E131F');
  const ductFinger = useColorModeValue('#3A4556', '#1A2234');
  const textColor = useColorModeValue('white', 'white');
  const slotLineColor = useColorModeValue('rgba(255,255,255,0.06)', 'rgba(255,255,255,0.04)');

  // Build slot map for quick lookup: map uPosition -> device
  const slotMap = {};
  devices.forEach((dev) => {
    slotMap[dev.uPosition] = dev;
  });

  // Track slots covered by multi-U devices so we don't render duplicate slots
  const coveredSlots = new Set();
  devices.forEach((dev) => {
    for (let u = dev.uPosition; u < dev.uPosition + (dev.uHeight || 1); u++) {
      if (u !== dev.uPosition) {
        coveredSlots.add(u);
      }
    }
  });

  // Generate array of U numbers from uHeight down to 1 (U1 is at bottom)
  const uSlots = [];
  for (let u = uHeight; u >= 1; u--) {
    uSlots.push(u);
  }

  return (
    <Box
      id={`rack-container-${rack.id}`}
      data-rack-id={rack.id}
      data-rack-container="true"
      position="relative"
      display="inline-flex"
      flexDirection="column"
      borderRadius="12px"
      bg={rackOuterBg}
      border="2px solid"
      borderColor={useColorModeValue('secondaryGray.400', 'whiteAlpha.200')}
      boxShadow="0 8px 24px rgba(0,0,0,0.25)"
      m="10px"
      userSelect="none"
      transition="all 0.2s ease">
      {/* Top Rack Header: Name, U-height, and INDEPENDENT [Front | Back] Toggle */}
      <Flex
        px="12px"
        py="8px"
        align="center"
        justify="space-between"
        borderBottom="1px solid"
        borderColor="whiteAlpha.100"
        bg={useColorModeValue('secondaryGray.200', 'navy.900')}
        borderTopRadius="10px">
        <HStack spacing="8px">
          <Text fontSize="sm" fontWeight="700" color={textColor}>
            {rack.name}
          </Text>
          <Badge colorScheme="brand" variant="solid" fontSize="10px" borderRadius="4px">
            {uHeight}U
          </Badge>
        </HStack>

        <HStack spacing="6px">
          {/* Independent Front / Back Toggle Switch */}
          <ButtonGroup size="xs" isAttached variant="outline">
            <Button
              colorScheme={currentFace === 'front' ? 'brand' : 'gray'}
              variant={currentFace === 'front' ? 'solid' : 'ghost'}
              fontSize="10px"
              h="22px"
              px="8px"
              onClick={() => handleToggle('front')}>
              FRONT
            </Button>
            <Button
              colorScheme={currentFace === 'rear' ? 'orange' : 'gray'}
              variant={currentFace === 'rear' ? 'solid' : 'ghost'}
              fontSize="10px"
              h="22px"
              px="8px"
              onClick={() => handleToggle('rear')}>
              REAR
            </Button>
          </ButtonGroup>

          {/* Rack Menu */}
          <Menu size="xs">
            <MenuButton
              as={IconButton}
              icon={<Icon as={MdMoreVert} />}
              size="xs"
              variant="ghost"
              color="whiteAlpha.700"
              _hover={{ color: 'white', bg: 'whiteAlpha.200' }}
            />
            <MenuList bg="navy.800" borderColor="whiteAlpha.200" zIndex={20}>
              <MenuItem
                icon={<Icon as={MdAdd} />}
                fontSize="xs"
                onClick={() => onMountDeviceClick && onMountDeviceClick(rack, 1)}>
                Mount Device
              </MenuItem>
              {onDeleteRack && (
                <MenuItem
                  icon={<Icon as={MdDelete} color="red.400" />}
                  fontSize="xs"
                  color="red.300"
                  onClick={() => onDeleteRack(rack.id)}>
                  Delete Rack
                </MenuItem>
              )}
            </MenuList>
          </Menu>
        </HStack>
      </Flex>

      {/* Main Rack Frame with Rails, Equipment Bay, and Cable Channels */}
      <Flex
        position="relative"
        h={`${rackBodyHeight}px`}
        bg={rackInnerBg}
        overflow="hidden"
        borderBottomRadius="10px">
        {/* Left Cable Finger Duct Channel (Auto Routing Guide) */}
        <Box
          id={`rack-channel-left-${rack.id}`}
          w={`${DUCT_WIDTH}px`}
          h="100%"
          bg={ductBg}
          borderRight="1px solid"
          borderColor="whiteAlpha.100"
          position="relative">
          {uSlots.map((u) => (
            <Box
              key={`duct-l-${u}`}
              h={`${U_SLOT_HEIGHT_PX}px`}
              borderBottom="1px solid"
              borderColor="whiteAlpha.100"
              display="flex"
              alignItems="center"
              justifyContent="center">
              <Box w="8px" h="2px" bg={ductFinger} borderRadius="full" />
            </Box>
          ))}
        </Box>

        {/* Left EIA-310-D Mounting Rail with Numbered U Labels & Cage Nut Holes */}
        <Box
          w={`${RAIL_WIDTH}px`}
          h="100%"
          bg={railBg}
          borderRight="1px solid"
          borderColor={railBorder}
          position="relative">
          {uSlots.map((u) => (
            <Flex
              key={`rail-l-${u}`}
              h={`${U_SLOT_HEIGHT_PX}px`}
              direction="column"
              justify="space-between"
              align="center"
              py="3px"
              borderBottom="1px solid"
              borderColor={slotLineColor}>
              {/* Square Cage Nut Holes (3 per U) */}
              <Box w="4px" h="4px" bg="#0B0F19" border="0.5px solid #4A5568" />
              <Text fontSize="8px" fontWeight="700" color="whiteAlpha.600" lineHeight="1">
                {u}
              </Text>
              <Box w="4px" h="4px" bg="#0B0F19" border="0.5px solid #4A5568" />
            </Flex>
          ))}
        </Box>

        {/* 19" Equipment Bay Canvas (Slot Rows) */}
        <Box
          id={`rack-equipment-bay-${rack.id}`}
          data-equipment-bay="true"
          data-rack-id={rack.id}
          w={`${RACK_CHASSIS_WIDTH}px`}
          h="100%"
          position="relative">
          {uSlots.map((u) => {
            if (coveredSlots.has(u)) {
              // Occupied by multi-U device starting lower down
              return null;
            }

            const device = slotMap[u];

            if (device) {
              const devUHeight = device.uHeight || 1;
              const topPx = (uHeight - (u + devUHeight - 1)) * U_SLOT_HEIGHT_PX;

              return (
                <Box
                  key={`dev-slot-${device.id}`}
                  id={`dev-slot-${device.id}`}
                  data-device-slot="true"
                  data-device-id={device.id}
                  data-rack-id={rack.id}
                  position="absolute"
                  top={`${topPx}px`}
                  left="0"
                  w="100%"
                  h={`${devUHeight * U_SLOT_HEIGHT_PX}px`}
                  px="2px"
                  py="1px"
                  zIndex={5}>
                  <DeviceFaceplate
                    device={device}
                    activeFace={currentFace}
                    cables={cables}
                    highlightedPortIds={highlightedPortIds}
                    draftSourcePort={draftSourcePort}
                    isSelected={device.id === selectedDeviceId}
                    isDragging={
                      draggingDeviceState?.isDragging &&
                      draggingDeviceState.draggingDevice?.id === device.id
                    }
                    onStartDragDevice={(dev, e) =>
                      onStartDragDevice && onStartDragDevice(dev, rack, e)
                    }
                    onSelectDevice={onSelectDevice}
                    onPortClick={onPortClick}
                    onPortHover={onPortHover}
                    onDeleteDevice={onDeleteDevice}
                    onUpdateDevice={onUpdateDevice}
                  />
                </Box>
              );
            }

            // Empty 1U Slot
            const topPx = (uHeight - u) * U_SLOT_HEIGHT_PX;
            return (
              <Box
                key={`empty-slot-${u}`}
                position="absolute"
                top={`${topPx}px`}
                left="0"
                w="100%"
                h={`${U_SLOT_HEIGHT_PX}px`}
                borderBottom="1px dashed"
                borderColor={slotLineColor}
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                role="group"
                _hover={{
                  bg: 'whiteAlpha.100',
                  borderColor: 'brand.400',
                }}
                onClick={() => onMountDeviceClick && onMountDeviceClick(rack, u)}>
                <HStack
                  spacing="4px"
                  opacity="0"
                  _groupHover={{ opacity: 1 }}
                  transition="opacity 0.15s ease">
                  <Icon as={MdAdd} w="12px" h="12px" color="brand.300" />
                  <Text fontSize="9px" fontWeight="600" color="brand.300">
                    Mount at U{u}
                  </Text>
                </HStack>
              </Box>
            );
          })}

          {/* Ghost Drop Target Indicator when dragging a device over this rack */}
          {draggingDeviceState?.isDragging &&
            draggingDeviceState.dragTargetRackId === rack.id &&
            draggingDeviceState.dragTargetU != null && (
              (() => {
                const targetU = draggingDeviceState.dragTargetU;
                const devUHeight = draggingDeviceState.draggingDevice?.uHeight || 1;
                const topPx = (uHeight - (targetU + devUHeight - 1)) * U_SLOT_HEIGHT_PX;
                const hasCollision = Boolean(draggingDeviceState.dragCollision);
                const isSameSlot =
                  draggingDeviceState.draggingDevice?.rackId === rack.id &&
                  draggingDeviceState.draggingDevice?.uPosition === targetU;

                return (
                  <Box
                    data-drag-ghost="true"
                    data-target-u={targetU}
                    data-has-collision={hasCollision ? 'true' : 'false'}
                    position="absolute"
                    top={`${topPx}px`}
                    left="2px"
                    right="2px"
                    h={`${devUHeight * U_SLOT_HEIGHT_PX - 2}px`}
                    bg={
                      hasCollision
                        ? 'rgba(255, 116, 91, 0.28)'
                        : isSameSlot
                        ? 'rgba(61, 158, 153, 0.15)'
                        : 'rgba(61, 158, 153, 0.32)'
                    }
                    border="2px dashed"
                    borderColor={hasCollision ? '#ff745b' : '#3d9e99'}
                    borderRadius="4px"
                    zIndex={30}
                    pointerEvents="none"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    boxShadow={
                      hasCollision
                        ? '0 0 12px rgba(255, 116, 91, 0.5)'
                        : '0 0 12px rgba(61, 158, 153, 0.5)'
                    }
                    transition="top 0.08s ease-out">
                    <HStack
                      bg={hasCollision ? '#9B2C2C' : '#1D4044'}
                      color={hasCollision ? '#FED7D7' : '#E6FFFA'}
                      px="8px"
                      py="2px"
                      borderRadius="md"
                      fontSize="10px"
                      fontWeight="700"
                      boxShadow="0 2px 6px rgba(0,0,0,0.4)"
                      spacing="6px">
                      <Text>
                        {hasCollision
                          ? `⚠️ Blocked by ${draggingDeviceState.dragCollision.name} at U${draggingDeviceState.dragCollision.uPosition}`
                          : isSameSlot
                          ? `Current Slot U${targetU}`
                          : `✓ Move to U${targetU}${devUHeight > 1 ? ` - U${targetU + devUHeight - 1}` : ''}`}
                      </Text>
                    </HStack>
                  </Box>
                );
              })()
            )}
        </Box>

        {/* Right EIA-310-D Mounting Rail with Numbered U Labels & Cage Nut Holes */}
        <Box
          w={`${RAIL_WIDTH}px`}
          h="100%"
          bg={railBg}
          borderLeft="1px solid"
          borderColor={railBorder}
          position="relative">
          {uSlots.map((u) => (
            <Flex
              key={`rail-r-${u}`}
              h={`${U_SLOT_HEIGHT_PX}px`}
              direction="column"
              justify="space-between"
              align="center"
              py="3px"
              borderBottom="1px solid"
              borderColor={slotLineColor}>
              <Box w="4px" h="4px" bg="#0B0F19" border="0.5px solid #4A5568" />
              <Text fontSize="8px" fontWeight="700" color="whiteAlpha.600" lineHeight="1">
                {u}
              </Text>
              <Box w="4px" h="4px" bg="#0B0F19" border="0.5px solid #4A5568" />
            </Flex>
          ))}
        </Box>

        {/* Right Cable Finger Duct Channel (Auto Routing Guide) */}
        <Box
          id={`rack-channel-right-${rack.id}`}
          w={`${DUCT_WIDTH}px`}
          h="100%"
          bg={ductBg}
          borderLeft="1px solid"
          borderColor="whiteAlpha.100"
          position="relative">
          {uSlots.map((u) => (
            <Box
              key={`duct-r-${u}`}
              h={`${U_SLOT_HEIGHT_PX}px`}
              borderBottom="1px solid"
              borderColor="whiteAlpha.100"
              display="flex"
              alignItems="center"
              justifyContent="center">
              <Box w="8px" h="2px" bg={ductFinger} borderRadius="full" />
            </Box>
          ))}
        </Box>
      </Flex>
    </Box>
  );
}
