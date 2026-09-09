import {
  Box,
  Button,
  Flex,
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
  useDisclosure,
  useToast,
  VStack,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import React, { useState } from "react";
import { MdDelete, MdEdit } from "react-icons/md";

export default function LocationList({ locations, onUpdate, onDelete }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editing, setEditing] = useState(null);
  const toast = useToast();

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
    try {
      await onUpdate(editing.id, {
        name: editing.name,
        notes: editing.notes,
        address: editing.address,
        lat: Number(editing.lat),
        lng: Number(editing.lng),
      });
      onClose();
    } catch (err) {
      toast({
        title: "Couldn't save changes",
        description: err.message,
        status: "error",
        isClosable: true,
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await onDelete(id);
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
      justifyContent='center'
      align='center'
      direction='column'
      w='100%'
      mb='0px'>
      <Text fontSize='xl' fontWeight='700' mb='16px' alignSelf='flex-start'>
        Locations
      </Text>
      <VStack w='100%' align='stretch' spacing='12px'>
        {locations.length === 0 && (
          <Text color='secondaryGray.600'>No locations saved yet.</Text>
        )}
        {locations.map((location) => (
          <Flex
            key={location.id}
            justify='space-between'
            align='center'
            w='100%'
            p='12px'
            borderRadius='12px'
            bg='secondaryGray.100'>
            <Box>
              <Text fontWeight='600'>{location.name}</Text>
              <Text fontSize='sm' color='secondaryGray.600'>
                {location.address}
              </Text>
              {location.notes && (
                <Text fontSize='sm' color='secondaryGray.600'>
                  {location.notes}
                </Text>
              )}
            </Box>
            <Flex gap='8px'>
              <IconButton
                aria-label='Edit location'
                icon={<MdEdit />}
                size='sm'
                onClick={() => startEdit(location)}
              />
              <IconButton
                aria-label='Delete location'
                icon={<MdDelete />}
                size='sm'
                onClick={() => handleDelete(location.id)}
              />
            </Flex>
          </Flex>
        ))}
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit location</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing='12px'>
              <Input
                placeholder='Name'
                value={editing?.name || ""}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
              <Input
                placeholder='Address'
                value={editing?.address || ""}
                onChange={(e) =>
                  setEditing({ ...editing, address: e.target.value })
                }
              />
              <Flex gap='8px' w='100%'>
                <Input
                  placeholder='Latitude'
                  value={editing?.lat || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, lat: e.target.value })
                  }
                />
                <Input
                  placeholder='Longitude'
                  value={editing?.lng || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, lng: e.target.value })
                  }
                />
              </Flex>
              <Textarea
                placeholder='Notes'
                value={editing?.notes || ""}
                onChange={(e) =>
                  setEditing({ ...editing, notes: e.target.value })
                }
              />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant='outline' mr='12px' onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme='brand' onClick={saveEdit}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  );
}
