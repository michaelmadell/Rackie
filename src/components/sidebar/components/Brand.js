import React from "react";

// Chakra imports
import { Badge, Box, Flex, HStack, Icon, Text, useColorModeValue } from "@chakra-ui/react";
import { MdDns } from "react-icons/md";

// Custom components
import { HSeparator } from "components/separator/Separator";

export function SidebarBrand() {
  const brandTitleColor = useColorModeValue("navy.900", "white");

  return (
    <Flex align='center' direction='column' my='24px'>
      <HStack spacing='10px' align='center'>
        <Flex
          align='center'
          justify='center'
          w='36px'
          h='36px'
          borderRadius='10px'
          bg='brand.500'
          boxShadow='0 2px 10px rgba(61, 158, 153, 0.35)'
          color='white'>
          <Icon as={MdDns} boxSize='20px' />
        </Flex>
        <Box>
          <HStack spacing='4px' align='center'>
            <Text
              fontSize='20px'
              fontWeight='800'
              letterSpacing='0.5px'
              lineHeight='1.1'
              color={brandTitleColor}>
              RACK
              <Text as='span' color='brand.500'>
                IE
              </Text>
            </Text>
            <Box
              w='8px'
              h='8px'
              borderRadius='full'
              bg='coral.500'
              boxShadow='0 0 8px #ff745b'
              title='Amulet Hotkey Coral Accent'
            />
          </HStack>
          <HStack spacing='4px' mt='2px'>
            <Badge
              bg='brand.300'
              color='navy.900'
              fontSize='8px'
              fontWeight='700'
              px='5px'
              py='1px'
              borderRadius='4px'>
              AMULET HOTKEY
            </Badge>
          </HStack>
        </Box>
      </HStack>
      <HSeparator mt='20px' mb='10px' />
    </Flex>
  );
}

export default SidebarBrand;
