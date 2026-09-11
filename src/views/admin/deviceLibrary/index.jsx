import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Spinner,
  Text,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import DeviceLibraryModal from 'components/deviceLibrary/DeviceLibraryModal';
import { PortSvg } from 'components/rack/PortGlyph';
import { createDeviceTemplate, deleteDeviceTemplate, getDeviceTemplates } from 'services/digitalTwinApi';
import { MdAdd, MdDelete, MdDevices, MdSearch, MdVerified } from 'react-icons/md';

const CATEGORIES = [
  'All',
  'Switch',
  'Server',
  'Router',
  'Enclosure',
  'Patch Panel',
  'Cable Management',
  'Power / UPS',
  'Workstation',
  'Accessory',
];

export default function DeviceLibraryView() {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const { isOpen, onOpen, onClose } = useDisclosure();

  const cardBg = useColorModeValue('white', 'navy.800');
  const cardBorder = useColorModeValue('secondaryGray.300', 'whiteAlpha.100');
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const textMuted = useColorModeValue('secondaryGray.600', 'whiteAlpha.600');

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDeviceTemplates();
      setTemplates(data || []);
    } catch (err) {
      toast({
        title: 'Error loading device templates',
        description: err.message,
        status: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleDeleteTemplate = async (id, name) => {
    if (!window.confirm(`Delete custom device "${name}"?`)) return;
    try {
      await deleteDeviceTemplate(id);
      toast({ title: 'Device template deleted', status: 'info' });
      loadTemplates();
    } catch (err) {
      toast({ title: 'Could not delete template', description: err.message, status: 'error' });
    }
  };

  const filtered = templates.filter((t) => {
    const matchCat = selectedCategory === 'All' || t.category === selectedCategory;
    const matchSearch =
      !searchQuery ||
      t.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.model.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      {/* Header & Actions */}
      <Flex justify="space-between" align="center" mb="20px" wrap="wrap" gap="14px">
        <Box>
          <HStack spacing="10px">
            <Icon as={MdDevices} w="28px" h="28px" color="brand.500" />
            <Text fontSize="2xl" fontWeight="800" color={textColor}>
              Device Library
            </Text>
          </HStack>
          <Text fontSize="sm" color={textMuted} mt="2px">
            Standard enterprise equipment catalog and custom faceplate models (Patchdocs inspired).
          </Text>
        </Box>

        <Button colorScheme="brand" leftIcon={<Icon as={MdAdd} />} onClick={onOpen}>
          + Create Custom Device
        </Button>
      </Flex>

      {/* Filter Toolbar */}
      <Flex direction={{ base: 'column', md: 'row' }} gap="14px" mb="20px">
        <InputGroup maxW={{ base: '100%', md: '360px' }}>
          <InputLeftElement pointerEvents="none">
            <Icon as={MdSearch} color="gray.400" />
          </InputLeftElement>
          <Input
            pl="40px"
            placeholder="Search manufacturer or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            borderRadius="12px"
            bg={cardBg}
          />
        </InputGroup>

        <HStack overflowX="scroll" width="100%" spacing="8px" flex="1" pb="4px">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              size="sm"
              width="fit-content"
              whiteSpace="nowrap"
              flexShrink={0}
              borderRadius="20px"
              variant={selectedCategory === cat ? 'solid' : 'outline'}
              bg={selectedCategory === cat ? 'brand.500' : cardBg}
              borderColor={selectedCategory === cat ? 'brand.500' : cardBorder}
              color={selectedCategory === cat ? 'white' : textColor}
              _hover={{
                bg: selectedCategory === cat ? 'brand.600' : 'whiteAlpha.100',
              }}
              onClick={() => setSelectedCategory(cat)}>
              {cat}
            </Button>
          ))}
        </HStack>
      </Flex>

      {/* Templates Grid or Loading */}
      {loading ? (
        <Flex justify="center" align="center" h="250px">
          <Spinner size="xl" color="brand.500" />
        </Flex>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing="20px">
        {filtered.map((t) => (
          <Box
            key={t.id}
            p="18px"
            borderRadius="16px"
            bg={cardBg}
            border="1px solid"
            borderColor={cardBorder}
            boxShadow="0 4px 12px rgba(0,0,0,0.04)"
            transition="all 0.2s"
            _hover={{ transform: 'translateY(-3px)', borderColor: 'brand.400' }}>
            <Flex justify="space-between" align="start" mb="8px">
              <Box>
                <HStack spacing="6px">
                  <Text fontSize="xs" fontWeight="800" color="brand.400" textTransform="uppercase">
                    {t.manufacturer}
                  </Text>
                  {t.isPreset && (
                    <Badge colorScheme="teal" variant="solid" fontSize="9px" display="flex" alignItems="center" gap="2px">
                      <Icon as={MdVerified} />
                      PRESET
                    </Badge>
                  )}
                </HStack>
                <Text fontSize="md" fontWeight="700" color={textColor}>
                  {t.model}
                </Text>
              </Box>
              <Badge colorScheme="brand" variant="solid" fontSize="xs" px="6px" py="2px" borderRadius="6px">
                {t.uHeight}U
              </Badge>
            </Flex>

            {/* Visual Chassis Bar */}
            <Box
              w="100%"
              h="40px"
              borderRadius="6px"
              bg={t.color || '#1A202C'}
              border="1px solid rgba(255,255,255,0.15)"
              my="12px"
              px="10px"
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              overflow="hidden">
              <HStack spacing="4px">
                {Array.isArray(t.frontLayout) &&
                  t.frontLayout.slice(0, 3).map((grp, gIdx) => (
                    <HStack key={gIdx} spacing="2px">
                      {Array.from({ length: Math.min(grp.count || 1, 6) }).map((_, pIdx) => (
                        <PortSvg key={pIdx} type={grp.type || 'rj45'} />
                      ))}
                    </HStack>
                  ))}
              </HStack>
              <Text fontSize="9px" fontWeight="700" color="whiteAlpha.700">
                19" RACK
              </Text>
            </Box>

            <Flex justify="space-between" align="center" mt="8px">
              <Badge variant="subtle" colorScheme="gray" fontSize="xs">
                {t.category}
              </Badge>

              {!t.isPreset && (
                <Button
                  size="xs"
                  colorScheme="red"
                  variant="ghost"
                  leftIcon={<Icon as={MdDelete} />}
                  onClick={() => handleDeleteTemplate(t.id, t.model)}>
                  Delete
                </Button>
              )}
            </Flex>
          </Box>
        ))}
      </SimpleGrid>
      )}

      {/* CREATE MODAL */}
      <DeviceLibraryModal
        isOpen={isOpen}
        onClose={onClose}
        templates={templates}
        onCreateTemplate={async (data) => {
          const created = await createDeviceTemplate(data);
          loadTemplates();
          return created;
        }}
      />
    </Box>
  );
}
