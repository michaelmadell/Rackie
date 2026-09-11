// Chakra imports
import {
  Box,
  Button,
  HStack,
  Icon,
  SimpleGrid,
  Text,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
// Custom components
import MiniStatistics from "components/card/MiniStatistics";
import IconBox from "components/icons/IconBox";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createLocation,
  deleteLocation,
  getLocations,
  updateLocation,
} from "services/locationsApi";
import LocationList from "views/admin/default/components/LocationList";
import Locations from "views/admin/default/components/Locations";
import { MdCable, MdComputer, MdPinDrop } from "react-icons/md";

export default function UserReports() {
  const navigate = useNavigate();
  // Chakra Color Mode
  const brandColor = useColorModeValue("brand.500", "white");
  const boxBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");
  const dashedBorder = useColorModeValue("secondaryGray.400", "whiteAlpha.300");
  const dashedHoverBg = useColorModeValue("secondaryGray.100", "whiteAlpha.100");
  const devices = 42;
  const [locations, setLocations] = useState([]);
  const toast = useToast();

  const refreshLocations = useCallback(async () => {
    try {
      const data = await getLocations();
      setLocations(data || []);
    } catch (err) {
      toast({
        title: "Couldn't load locations",
        description: err.message,
        status: "error",
        isClosable: true,
      });
    }
  }, [toast]);

  useEffect(() => {
    refreshLocations();
  }, [refreshLocations]);

  const handleCreateLocation = async (fields) => {
    await createLocation(fields);
    await refreshLocations();
  };

  const handleUpdateLocation = async (id, fields) => {
    await updateLocation(id, fields);
    await refreshLocations();
  };

  const handleDeleteLocation = async (id) => {
    await deleteLocation(id);
    await refreshLocations();
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <SimpleGrid
        columns={{ base: 1, md: 2, lg: 3, "2xl": 6 }}
        gap='20px'
        mb='20px'>
        <MiniStatistics
          startContent={
            <IconBox
              w='56px'
              h='56px'
              bg={boxBg}
              icon={
                <Icon w='32px' h='32px' as={MdComputer} color={brandColor} />
              }
            />
          }
          name='Devices'
          value={devices}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w='56px'
              h='56px'
              bg={boxBg}
              icon={
                <Icon w='32px' h='32px' as={MdPinDrop} color={brandColor} />
              }
            />
          }
          name='Locations'
          value={locations.length}
        />
        <Button
          variant='outline'
          w='100%'
          h='100%'
          minH='80px'
          width='fit-content'
          borderRadius='20px'
          border='1px solid'
          borderColor={dashedBorder}
          _hover={{
            bg: dashedHoverBg,
            borderColor: brandColor,
          }}
          onClick={() => navigate('/admin/rack-room')}>
          <HStack spacing='8px'>
            <Icon w='24px' h='24px' as={MdCable} color={brandColor} />
            <Text fontWeight='700' fontSize='sm'>
              Open Rack & Cable Canvas
            </Text>
          </HStack>
        </Button>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 1, xl: 2 }} gap='20px' mb='20px'>
        <Locations locations={locations} onCreate={handleCreateLocation} />
        <LocationList
          locations={locations}
          onUpdate={handleUpdateLocation}
          onDelete={handleDeleteLocation}
        />
      </SimpleGrid>
    </Box>
  );
}
