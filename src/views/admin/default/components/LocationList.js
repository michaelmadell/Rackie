import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdCable,
  MdDelete,
  MdEdit,
  MdLocationOn,
  MdNotes,
  MdPinDrop,
} from "react-icons/md";

export default function LocationList({ locations, onUpdate, onDelete }) {
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editing, setEditing] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();

  // Chakra theme color modes
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = useColorModeValue(
    "secondaryGray.600",
    "secondaryGray.400"
  );
  const itemBg = useColorModeValue("secondaryGray.300", "navy.700");
  const itemHoverBg = useColorModeValue("secondaryGray.400", "navy.600");
  const itemBorder = useColorModeValue(
    "secondaryGray.400",
    "rgba(255, 255, 255, 0.08)"
  );
  const modalBg = useColorModeValue("white", "navy.800");
  const modalBorder = useColorModeValue(
    "secondaryGray.300",
    "rgba(255, 255, 255, 0.12)"
  );
  const iconBoxBg = useColorModeValue("brand.100", "whiteAlpha.200");
  const brandColor = useColorModeValue("brand.500", "brand.400");
  const badgeBg = useColorModeValue("whiteAlpha.900", "navy.800");

  const startEdit = (location) => {
    setEditing({
      id: location.id,
      name: location.name,
      notes: location.notes || "",
      address: location.address,
      lat: String(location.lat),
      lng: String(location.lng),
    });
    onOpen();
  };

  const saveEdit = async () => {
    setIsSaving(true);
    try {
      await onUpdate(editing.id, {
        name: editing.name.trim(),
        notes: editing.notes.trim(),
        address: editing.address.trim(),
        lat: Number(editing.lat),
        lng: Number(editing.lng),
      });
      toast({
        title: "Location updated",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      onClose();
    } catch (err) {
      toast({
        title: "Couldn't save changes",
        description: err.message,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    try {
      await onDelete(id);
      toast({
        title: `Deleted "${name || "Location"}"`,
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: "Couldn't delete location",
        description: err.message,
        status: "error",
        isClosable: true,
      });
    }
  };

  return (
    <Card
      justifyContent='flex-start'
      align='stretch'
      direction='column'
      w='100%'
      p='24px'
      mb='0px'>
      <Flex justify='space-between' align='center' mb='20px'>
        <HStack spacing='10px'>
          <Text fontSize='xl' fontWeight='700' color={textColor}>
            Saved Locations
          </Text>
          <Badge
            colorScheme='brand'
            borderRadius='12px'
            px='8px'
            py='2px'
            fontSize='sm'>
            {locations.length}
          </Badge>
        </HStack>
      </Flex>

      <VStack
        w='100%'
        align='stretch'
        spacing='12px'
        maxH='460px'
        overflowY='auto'
        pr={locations.length > 3 ? "6px" : "0px"}>
        {locations.length === 0 && (
          <Flex
            direction='column'
            align='center'
            justify='center'
            p='40px 20px'
            borderRadius='16px'
            border='2px dashed'
            borderColor={itemBorder}
            textAlign='center'>
            <Icon as={MdPinDrop} w='40px' h='40px' color={brandColor} mb='12px' />
            <Text fontWeight='600' color={textColor} mb='4px'>
              No locations saved yet
            </Text>
            <Text fontSize='sm' color={textColorSecondary} maxW='280px'>
              Search for an address on the map to add your first device location.
            </Text>
          </Flex>
        )}

        {locations.map((location) => (
          <Flex
            key={location.id}
            justify='space-between'
            align='center'
            w='100%'
            p='16px'
            mt='1px'
            borderRadius='16px'
            bg={itemBg}
            border='1px solid'
            borderColor={itemBorder}
            transition='all 0.2s ease-in-out'
            _hover={{
              bg: itemHoverBg,
              borderColor: brandColor,
              transform: "translateY(-1px)",
            }}>
            <HStack spacing='14px' align='flex-start' flex='1' minW='0'>
              <Flex
                w='38px'
                h='38px'
                borderRadius='12px'
                bg={iconBoxBg}
                color={brandColor}
                align='center'
                justify='center'
                flexShrink='0'
                mt='2px'>
                <Icon as={MdLocationOn} w='20px' h='20px' />
              </Flex>
              <Box minW='0' flex='1'>
                <Flex align='center' gap='8px' flexWrap='wrap' mb='2px'>
                  <Text
                    fontWeight='700'
                    fontSize='md'
                    color={textColor}
                    noOfLines={1}>
                    {location.name}
                  </Text>
                  {location.lat && location.lng && (
                    <Badge
                      fontSize='xs'
                      borderRadius='6px'
                      px='6px'
                      py='1px'
                      bg={badgeBg}
                      color={textColorSecondary}
                      variant='subtle'>
                      {Number(location.lat).toFixed(4)},{" "}
                      {Number(location.lng).toFixed(4)}
                    </Badge>
                  )}
                </Flex>
                <Text
                  fontSize='sm'
                  color={textColorSecondary}
                  noOfLines={2}
                  mb='4px'>
                  {location.address}
                </Text>
                {location.notes && (
                  <Flex align='center' gap='4px' mt='2px'>
                    <Icon
                      as={MdNotes}
                      w='14px'
                      h='14px'
                      color={textColorSecondary}
                      flexShrink='0'
                    />
                    <Text
                      fontSize='xs'
                      color={textColorSecondary}
                      fontStyle='italic'
                      noOfLines={1}>
                      {location.notes}
                    </Text>
                  </Flex>
                )}
              </Box>
            </HStack>

            <HStack spacing='6px' ms='12px' flexShrink='0'>
              <Button
                size='sm'
                variant='solid'
                colorScheme='brand'
                borderRadius='10px'
                fontSize='xs'
                leftIcon={<Icon as={MdCable} />}
                onClick={() => navigate('/admin/rack-room')}>
                Racks & Cabling
              </Button>
              <IconButton
                aria-label='Edit location'
                icon={<MdEdit />}
                size='sm'
                variant='outline'
                borderRadius='10px'
                onClick={() => startEdit(location)}
              />
              <IconButton
                aria-label='Delete location'
                icon={<MdDelete />}
                size='sm'
                variant='outline'
                colorScheme='red'
                borderRadius='10px'
                onClick={() => handleDelete(location.id, location.name)}
              />
            </HStack>
          </Flex>
        ))}
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} isCentered size='lg'>
        <ModalOverlay backdropFilter='blur(4px)' />
        <ModalContent
          bg={modalBg}
          color={textColor}
          borderRadius='20px'
          border='1px solid'
          borderColor={modalBorder}
          boxShadow='2xl'
          p='12px'>
          <ModalHeader fontSize='xl' fontWeight='700' color={textColor}>
            Edit Location
          </ModalHeader>
          <ModalCloseButton mt='10px' mr='10px' />
          <ModalBody>
            <VStack spacing='16px'>
              <FormControl isRequired>
                <FormLabel
                  fontSize='sm'
                  fontWeight='600'
                  color={textColor}
                  mb='6px'>
                  Location Name
                </FormLabel>
                <Input
                  placeholder='e.g. Headquarters, Devon Data Center'
                  value={editing?.name || ""}
                  color={textColor}
                  _placeholder={{ color: textColorSecondary }}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel
                  fontSize='sm'
                  fontWeight='600'
                  color={textColor}
                  mb='6px'>
                  Address
                </FormLabel>
                <Input
                  placeholder='Full address'
                  value={editing?.address || ""}
                  color={textColor}
                  _placeholder={{ color: textColorSecondary }}
                  onChange={(e) =>
                    setEditing({ ...editing, address: e.target.value })
                  }
                />
              </FormControl>

              <HStack spacing='12px' w='100%'>
                <FormControl>
                  <FormLabel
                    fontSize='sm'
                    fontWeight='600'
                    color={textColor}
                    mb='6px'>
                    Latitude
                  </FormLabel>
                  <Input
                    placeholder='Latitude'
                    value={editing?.lat || ""}
                    color={textColor}
                    _placeholder={{ color: textColorSecondary }}
                    onChange={(e) =>
                      setEditing({ ...editing, lat: e.target.value })
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel
                    fontSize='sm'
                    fontWeight='600'
                    color={textColor}
                    mb='6px'>
                    Longitude
                  </FormLabel>
                  <Input
                    placeholder='Longitude'
                    value={editing?.lng || ""}
                    color={textColor}
                    _placeholder={{ color: textColorSecondary }}
                    onChange={(e) =>
                      setEditing({ ...editing, lng: e.target.value })
                    }
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel
                  fontSize='sm'
                  fontWeight='600'
                  color={textColor}
                  mb='6px'>
                  Notes (Optional)
                </FormLabel>
                <Textarea
                  placeholder='Add any site notes, access details, or device info...'
                  value={editing?.notes || ""}
                  color={textColor}
                  _placeholder={{ color: textColorSecondary }}
                  rows={3}
                  onChange={(e) =>
                    setEditing({ ...editing, notes: e.target.value })
                  }
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter mt='8px'>
            <Button variant='outline' mr='12px' onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme='brand'
              onClick={saveEdit}
              isLoading={isSaving}
              isDisabled={!editing?.name?.trim() || !editing?.address?.trim()}>
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  );
}
