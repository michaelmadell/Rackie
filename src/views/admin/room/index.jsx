import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Text,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import RoomCanvas from 'components/rack/RoomCanvas';
import { getLocations } from 'services/locationsApi';
import { createRoom, getRooms } from 'services/digitalTwinApi';
import { MdAdd, MdMeetingRoom, MdPinDrop } from 'react-icons/md';

export default function RoomVisualizerView() {
  const toast = useToast();
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [loading, setLoading] = useState(true);

  // New Room Modal
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newRoomName, setNewRoomName] = useState('Main Server Room (MDF)');
  const [newRoomFloor, setNewRoomFloor] = useState('Floor 1');

  // Theming
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const barBg = useColorModeValue('white', 'navy.800');
  const barBorder = useColorModeValue('secondaryGray.300', 'whiteAlpha.150');
  const barShadow = useColorModeValue('0 4px 12px rgba(0,0,0,0.05)', '0 4px 20px rgba(0,0,0,0.3)');

  // Load locations
  const loadLocations = useCallback(async () => {
    try {
      setLoading(true);
      const locs = await getLocations();
      setLocations(locs || []);
      if (locs && locs.length > 0) {
        setSelectedLocationId(locs[0].id);
      }
    } catch (err) {
      toast({
        title: 'Failed to load locations',
        description: err.message,
        status: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load rooms for selected location
  const loadRooms = useCallback(
    async (locId) => {
      if (!locId) return;
      try {
        const roomList = await getRooms(locId);
        setRooms(roomList || []);
        if (roomList && roomList.length > 0) {
          setSelectedRoomId(roomList[0].id);
        } else {
          setSelectedRoomId(null);
        }
      } catch (err) {
        console.error('Failed to load rooms for location', err);
      }
    },
    []
  );

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    if (selectedLocationId) {
      loadRooms(selectedLocationId);
    }
  }, [selectedLocationId, loadRooms]);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !selectedLocationId) return;
    try {
      const created = await createRoom({
        locationId: selectedLocationId,
        name: newRoomName.trim(),
        floor: newRoomFloor.trim(),
      });
      toast({
        title: 'Server Room Created',
        status: 'success',
      });
      onClose();
      await loadRooms(selectedLocationId);
      setSelectedRoomId(created.id);
    } catch (err) {
      toast({
        title: 'Failed to create room',
        description: err.message,
        status: 'error',
      });
    }
  };

  if (loading && locations.length === 0) {
    return (
      <Flex w="100%" h="600px" justify="center" align="center" direction="column">
        <Spinner size="xl" color="brand.500" />
        <Text mt="10px" color="gray.500">
          Loading Infrastructure...
        </Text>
      </Flex>
    );
  }

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      {/* Location & Room Selector Header Bar */}
      <Flex
        p="14px 20px"
        mb="20px"
        borderRadius="16px"
        bg={barBg}
        border="1px solid"
        borderColor={barBorder}
        justify="space-between"
        align="center"
        wrap="wrap"
        gap="14px"
        boxShadow={barShadow}>
        <HStack spacing="16px" wrap="wrap">
          {/* Location Picker */}
          <HStack spacing="8px">
            <Icon as={MdPinDrop} color="brand.500" w="20px" h="20px" />
            <Text fontSize="xs" fontWeight="700" color="gray.400" textTransform="uppercase">
              Location:
            </Text>
            <Select
              size="sm"
              w={{ base: '100%', md: '200px' }}
              borderRadius="8px"
              fontWeight="600"
              value={selectedLocationId || ''}
              onChange={(e) => setSelectedLocationId(Number(e.target.value))}>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </Select>
          </HStack>

          {/* Room Picker */}
          <HStack spacing="8px">
            <Icon as={MdMeetingRoom} color="brand.500" w="20px" h="20px" />
            <Text fontSize="xs" fontWeight="700" color="gray.400" textTransform="uppercase">
              Room:
            </Text>
            {rooms.length > 0 ? (
              <Select
                size="sm"
                minW="260px"
                w={{ base: '100%', md: 'auto' }}
                borderRadius="8px"
                fontWeight="600"
                value={selectedRoomId || ''}
                onChange={(e) => setSelectedRoomId(Number(e.target.value))}>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.floor ? `(${r.floor})` : ''}
                  </option>
                ))}
              </Select>
            ) : (
              <Badge colorScheme="orange" variant="subtle" py="4px" px="8px" borderRadius="6px">
                No rooms yet
              </Badge>
            )}
          </HStack>
        </HStack>

        <Button
          size="sm"
          colorScheme="brand"
          leftIcon={<Icon as={MdAdd} />}
          onClick={onOpen}
          isDisabled={!selectedLocationId}>
          New Server Room
        </Button>
      </Flex>

      {/* Main Room Canvas Display */}
      {selectedRoomId ? (
        <RoomCanvas key={selectedRoomId} roomId={selectedRoomId} />
      ) : (
        <Flex
          direction="column"
          align="center"
          justify="center"
          p="60px"
          borderRadius="16px"
          bg={barBg}
          border="1px dashed"
          borderColor={barBorder}>
          <Icon as={MdMeetingRoom} w="48px" h="48px" color="gray.400" mb="12px" />
          <Text fontSize="lg" fontWeight="700" color={textColor} mb="6px">
            No Server Room Selected
          </Text>
          <Text fontSize="sm" color="gray.500" mb="20px">
            Create a room (e.g. MDF, IDF, Data Hall) at this location to start mounting racks.
          </Text>
          <Button colorScheme="brand" leftIcon={<Icon as={MdAdd} />} onClick={onOpen}>
            Create Server Room
          </Button>
        </Flex>
      )}

      {/* CREATE ROOM MODAL */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent bg={barBg}>
          <ModalHeader fontSize="md" fontWeight="700">
            Create New Server Room
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isRequired mb="14px">
              <FormLabel fontSize="xs">Room Name</FormLabel>
              <Select
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                mb="8px">
                <option value="Main Server Room (MDF)">Main Server Room (MDF)</option>
                <option value="IDF-1 (Floor 1 Comms)">IDF-1 (Floor 1 Comms)</option>
                <option value="IDF-2 (Floor 2 Comms)">IDF-2 (Floor 2 Comms)</option>
                <option value="Data Center Hall A">Data Center Hall A</option>
                <option value="Hardware Lab">Hardware Lab</option>
              </Select>
            </FormControl>

            <FormControl mb="14px">
              <FormLabel fontSize="xs">Floor / Level</FormLabel>
              <Select
                value={newRoomFloor}
                onChange={(e) => setNewRoomFloor(e.target.value)}>
                <option value="Basement">Basement</option>
                <option value="Ground Floor">Ground Floor</option>
                <option value="Floor 1">Floor 1</option>
                <option value="Floor 2">Floor 2</option>
                <option value="Floor 3">Floor 3</option>
              </Select>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr="10px" onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="brand" onClick={handleCreateRoom}>
              Create Room
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
