// Chakra Imports
import {
  Avatar,
  Button,
  Flex,
  Icon,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
  useColorMode,
} from '@chakra-ui/react';
// Custom Components
import { SidebarResponsive } from 'components/sidebar/Sidebar';
import PropTypes from 'prop-types';
import React from 'react';
// Assets
import { MdInfoOutline } from 'react-icons/md';
import { IoMdMoon, IoMdSunny } from 'react-icons/io';
import routes from 'routes';
export default function HeaderLinks(props) {
  const { secondary } = props;
  const { colorMode, toggleColorMode } = useColorMode();
  // Chakra Color Mode
  const navbarIcon = useColorModeValue('gray.500', 'whiteAlpha.800');
  let menuBg = useColorModeValue('white', 'navy.800');
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.500', 'whiteAlpha.800');
  const shadow = useColorModeValue(
    '14px 17px 40px 4px rgba(112, 144, 176, 0.18)',
    '0px 4px 20px 0px rgba(0, 0, 0, 0.5)',
  );
  const borderButton = useColorModeValue('secondaryGray.400', 'whiteAlpha.200');
  return (
    <Flex
      w={{ sm: '100%', md: 'auto' }}
      alignItems="center"
      flexDirection="row"
      bg={menuBg}
      border="1px solid"
      borderColor={borderColor}
      flexWrap={secondary ? { base: 'wrap', md: 'nowrap' } : 'unset'}
      p="10px"
      borderRadius="30px"
      boxShadow={shadow}
    >
      <SidebarResponsive routes={routes} />

      <Menu>
        <MenuButton p="0px">
          <Icon
            mt="6px"
            as={MdInfoOutline}
            color={navbarIcon}
            w="18px"
            h="18px"
            me="10px"
          />
        </MenuButton>
        <MenuList
          boxShadow={shadow}
          p="20px"
          me={{ base: '30px', md: 'unset' }}
          borderRadius="20px"
          bg={menuBg}
          border="1px solid"
          borderColor={borderColor}
          mt="22px"
          minW={{ base: 'unset' }}
          maxW={{ base: '360px', md: 'unset' }}
        >
          <Flex flexDirection="column">
            <Link w="100%" href="/#/admin/rack-room">
              <Button w="100%" h="44px" mb="10px" variant="brand">
                Rack & Cable Canvas
              </Button>
            </Link>
            <Link
              w="100%"
              href="/#/admin/device-library"
            >
              <Button
                w="100%"
                h="44px"
                mb="10px"
                border="1px solid"
                bg="transparent"
                borderColor={borderButton}
              >
                Device Library
              </Button>
            </Link>
            <Link
              w="100%"
              href="https://amulethotkey.com"
              isExternal
            >
              <Button
                w="100%"
                h="44px"
                variant="no-hover"
                color={textColor}
                bg="transparent"
              >
                Amulet Hotkey Solutions ↗
              </Button>
            </Link>
          </Flex>
        </MenuList>
      </Menu>

      <Button
        variant="no-hover"
        bg="transparent"
        p="0px"
        minW="unset"
        minH="unset"
        h="18px"
        w="max-content"
        onClick={toggleColorMode}
      >
        <Icon
          me="10px"
          h="18px"
          w="18px"
          color={navbarIcon}
          as={colorMode === 'light' ? IoMdMoon : IoMdSunny}
        />
      </Button>
      <Menu>
        <MenuButton p="0px">
          <Avatar
            _hover={{ cursor: 'pointer', transform: 'scale(1.05)' }}
            color="white"
            name="Amulet Hotkey"
            bg="brand.500"
            border="2px solid"
            borderColor="brand.300"
            size="sm"
            w="38px"
            h="38px"
          />
        </MenuButton>
        <MenuList
          boxShadow={shadow}
          p="0px"
          mt="10px"
          borderRadius="20px"
          bg={menuBg}
          border="1px solid"
          borderColor={borderColor}
        >
          <Flex w="100%" mb="0px">
            <Text
              ps="20px"
              pt="16px"
              pb="10px"
              w="100%"
              borderBottom="1px solid"
              borderColor={borderColor}
              fontSize="sm"
              fontWeight="700"
              color={textColor}
            >
              👋&nbsp; Hey, Admin
            </Text>
          </Flex>
          <Flex flexDirection="column" p="10px">
            <Link href="/#/admin/rack-room">
              <MenuItem
                _hover={{ bg: useColorModeValue('secondaryGray.100', 'whiteAlpha.100') }}
                _focus={{ bg: 'none' }}
                borderRadius="8px"
                px="14px"
              >
                <Text fontSize="sm">Rack Management</Text>
              </MenuItem>
            </Link>
            <Link href="/#/admin/device-library">
              <MenuItem
                _hover={{ bg: useColorModeValue('secondaryGray.100', 'whiteAlpha.100') }}
                _focus={{ bg: 'none' }}
                borderRadius="8px"
                px="14px"
              >
                <Text fontSize="sm">Device Library Presets</Text>
              </MenuItem>
            </Link>
            <Link href="https://amulethotkey.com" isExternal>
              <MenuItem
                _hover={{ bg: useColorModeValue('secondaryGray.100', 'whiteAlpha.100') }}
                _focus={{ bg: 'none' }}
                color="brand.400"
                borderRadius="8px"
                px="14px"
              >
                <Text fontSize="sm">Amulet Hotkey Portal ↗</Text>
              </MenuItem>
            </Link>
          </Flex>
        </MenuList>
      </Menu>
    </Flex>
  );
}

HeaderLinks.propTypes = {
  variant: PropTypes.string,
  fixed: PropTypes.bool,
  secondary: PropTypes.bool,
  onOpen: PropTypes.func,
};
