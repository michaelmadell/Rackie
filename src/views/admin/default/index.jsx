/*!
  _   _  ___  ____  ___ ________  _   _   _   _ ___   
 | | | |/ _ \|  _ \|_ _|__  / _ \| \ | | | | | |_ _| 
 | |_| | | | | |_) || |  / / | | |  \| | | | | || | 
 |  _  | |_| |  _ < | | / /| |_| | |\  | | |_| || |
 |_| |_|\___/|_| \_\___/____\___/|_| \_|  \___/|___|
                                                                                                                                                                                                                                                                                                                                       
=========================================================
* Horizon UI - v1.1.0
=========================================================

* Product Page: https://www.horizon-ui.com/
* Copyright 2023 Horizon UI (https://www.horizon-ui.com/)

* Designed and Coded by Simmmple

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

// Chakra imports
import {
  Avatar,
  Box,
  Button,
  Flex,
  FormLabel,
  Icon,
  Select,
  SimpleGrid,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
// Assets
import Usa from "assets/img/dashboards/usa.png";
// Custom components
import MiniCalendar from "components/calendar/MiniCalendar";
import MiniStatistics from "components/card/MiniStatistics";
import IconBox from "components/icons/IconBox";
import React, { useCallback, useEffect, useState } from "react";
import {
  createLocation,
  deleteLocation,
  getLocations,
  updateLocation,
} from "services/locationsApi";
import LocationList from "views/admin/default/components/LocationList";
import {
  MdAdd,
  MdAddTask,
  MdAttachMoney,
  MdBarChart,
  MdComputer,
  MdFileCopy,
  MdPinDrop,
} from "react-icons/md";
import CheckTable from "views/admin/default/components/CheckTable";
import ComplexTable from "views/admin/default/components/ComplexTable";
import DailyTraffic from "views/admin/default/components/DailyTraffic";
import PieCard from "views/admin/default/components/PieCard";
import Tasks from "views/admin/default/components/Tasks";
import TotalSpent from "views/admin/default/components/TotalSpent";
import WeeklyRevenue from "views/admin/default/components/WeeklyRevenue";
import Locations from "views/admin/default/components/Locations";
import {
  columnsDataCheck,
  columnsDataComplex,
} from "views/admin/default/variables/columnsData";
import tableDataCheck from "views/admin/default/variables/tableDataCheck.json";
import tableDataComplex from "views/admin/default/variables/tableDataComplex.json";

export default function UserReports() {
  // Chakra Color Mode
  const brandColor = useColorModeValue("brand.500", "white");
  const boxBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");
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
          h='100%'>
            <Icon w='32px' h='32px' as={MdAdd} color={brandColor} />
          Add Device
        </Button>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 2 }} gap='20px' mb='20px'>
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
