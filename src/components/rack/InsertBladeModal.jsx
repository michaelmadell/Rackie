import React, { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react';
import { MdCheck, MdDeveloperBoard } from 'react-icons/md';

export const BLADE_PRESETS = [
  {
    model: 'PowerEdge M640',
    manufacturer: 'Dell',
    specs: '2x Xeon Gold 6140 / 384GB DDR4 / 2x 960GB NVMe',
    description: 'High-density 2-socket compute blade with Xeon Scalable processors',
    defaultTag: 'ESXi-Node',
    type: 'half',
  },
  {
    model: 'PowerEdge M630',
    manufacturer: 'Dell',
    specs: '2x Xeon E5-2680 v4 / 256GB DDR4 / 2x 480GB SSD',
    description: 'Versatile 2-socket blade server for enterprise workloads',
    defaultTag: 'Kube-Worker',
    type: 'half',
  },
  {
    model: 'ProLiant BL460c Gen10',
    manufacturer: 'HPE',
    specs: '2x Xeon Silver 4214 / 256GB DDR4 / 2x 480GB SAS SSD',
    description: 'HPE BladeSystem 2-socket server blade for virtualization and cloud',
    defaultTag: 'HPE-Blade',
    type: 'half',
  },
  {
    model: 'UCS B200 M5',
    manufacturer: 'Cisco',
    specs: '2x Xeon Gold 6230 / 384GB DDR4 / 2x 1TB M.2 SSD',
    description: 'Cisco UCS half-width enterprise blade server',
    defaultTag: 'UCS-Blade',
    type: 'half',
  },
  {
    model: 'BigTwin SYS-2029BT Node',
    manufacturer: 'Supermicro',
    specs: '2x Xeon Gold 6248R / 512GB DDR4 / 6x 1.92TB NVMe',
    description: 'High-performance multi-node modular sled for 2U Twin architecture',
    defaultTag: 'Twin-Node',
    type: 'sled',
  },
  {
    model: 'PowerEdge C6420 Sled',
    manufacturer: 'Dell',
    specs: '2x Xeon Platinum 8268 / 384GB DDR4 / 4x 960GB SAS',
    description: 'Modular high-density server sled for hyperscale and HPC',
    defaultTag: 'C6420-Sled',
    type: 'sled',
  },
  {
    model: 'PowerEdge M830',
    manufacturer: 'Dell',
    specs: '4x Xeon E5-4650 v4 / 1TB DDR4 / 4x 1.92TB NVMe',
    description: 'Full-height 4-socket blade for massive in-memory databases & analytics',
    defaultTag: 'DB-Node',
    type: 'full',
  },
  {
    model: 'Custom Blade / Sled Server',
    manufacturer: 'Generic / OEM',
    specs: 'Custom hardware configuration',
    description: 'User-specified modular compute unit',
    defaultTag: 'Node',
    type: 'custom',
  },
];

export default function InsertBladeModal({
  isOpen,
  onClose,
  targetBay = 1,
  onInsertBlade,
}) {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [bladeName, setBladeName] = useState(`ESXi-Node-${String(targetBay).padStart(2, '0')}`);
  const [manufacturer, setManufacturer] = useState('Dell');
  const [model, setModel] = useState('PowerEdge M640');
  const [specs, setSpecs] = useState('2x Xeon Gold 6140 / 384GB DDR4 / 2x 960GB NVMe');
  const [serialNumber, setSerialNumber] = useState(`CN-08T72K-${1000 + targetBay}`);
  const [powerState, setPowerState] = useState('on');
  const [status, setStatus] = useState('online');

  const bgModal = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('secondaryGray.300', 'whiteAlpha.200');
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const cardBg = useColorModeValue('gray.50', 'navy.900');

  // Handle Preset selection
  const handleSelectPreset = (idx) => {
    setSelectedPresetIndex(idx);
    const p = BLADE_PRESETS[idx];
    setManufacturer(p.manufacturer);
    setModel(p.model);
    setSpecs(p.specs);
    setBladeName(`${p.defaultTag}-${String(targetBay).padStart(2, '0')}`);
  };

  const handleConfirm = () => {
    const bladeData = {
      id: `blade-${Date.now()}`,
      name: bladeName.trim() || `Blade-${targetBay}`,
      manufacturer,
      model,
      specs,
      serialNumber,
      powerState,
      status: powerState === 'off' ? 'offline' : status,
      installedAt: new Date().toISOString(),
    };
    onInsertBlade(targetBay, bladeData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent bg={bgModal} color={textColor} borderRadius="14px">
        <ModalHeader borderBottom="1px solid" borderColor={borderColor} py="12px">
          <HStack spacing="10px">
            <Icon as={MdDeveloperBoard} w="22px" h="22px" color="brand.500" />
            <Text fontSize="md" fontWeight="700">
              Insert Blade / Sled into Bay {targetBay}
            </Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody py="16px">
          <VStack spacing="14px" align="stretch">
            {/* Blade Template Selector */}
            <Box>
              <FormLabel fontSize="xs" fontWeight="700" textTransform="uppercase" color="gray.400" mb="6px">
                Choose Blade Model Preset
              </FormLabel>
              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing="8px">
                {BLADE_PRESETS.map((preset, idx) => (
                  <Box
                    key={preset.model}
                    p="8px 10px"
                    borderRadius="8px"
                    bg={cardBg}
                    border="1.5px solid"
                    borderColor={selectedPresetIndex === idx ? 'brand.400' : borderColor}
                    cursor="pointer"
                    transition="all 0.15s ease"
                    _hover={{ borderColor: 'brand.300', transform: 'translateY(-1px)' }}
                    onClick={() => handleSelectPreset(idx)}>
                    <Flex justify="space-between" align="center" mb="2px">
                      <Text fontSize="xs" fontWeight="700" isTruncated>
                        {preset.model}
                      </Text>
                      <Badge
                        fontSize="9px"
                        colorScheme={preset.type === 'full' ? 'coral' : 'brand'}>
                        {preset.type === 'full' ? 'Full-Height' : 'Half-Height'}
                      </Badge>
                    </Flex>
                    <Text fontSize="10px" color="gray.500" noOfLines={1}>
                      {preset.specs}
                    </Text>
                  </Box>
                ))}
              </SimpleGrid>
            </Box>

            {/* Custom Blade Details */}
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing="12px">
              <FormControl isRequired>
                <FormLabel fontSize="xs" fontWeight="700">
                  Blade Name / Hostname
                </FormLabel>
                <Input
                  size="sm"
                  borderRadius="8px"
                  value={bladeName}
                  onChange={(e) => setBladeName(e.target.value)}
                  placeholder="e.g. ESXi-Node-05"
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs" fontWeight="700">
                  Serial / Asset Number
                </FormLabel>
                <Input
                  size="sm"
                  borderRadius="8px"
                  fontFamily="mono"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="e.g. CN-08T72K-7425"
                />
              </FormControl>
            </SimpleGrid>

            <FormControl>
              <FormLabel fontSize="xs" fontWeight="700">
                Hardware Specifications (CPU / RAM / Storage)
              </FormLabel>
              <Input
                size="sm"
                borderRadius="8px"
                value={specs}
                onChange={(e) => setSpecs(e.target.value)}
                placeholder="2x Xeon Gold 6140 / 384GB DDR4 / 2x 960GB NVMe"
              />
            </FormControl>

            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing="12px">
              <FormControl>
                <FormLabel fontSize="xs" fontWeight="700">
                  Power State
                </FormLabel>
                <Select
                  size="sm"
                  borderRadius="8px"
                  value={powerState}
                  onChange={(e) => setPowerState(e.target.value)}>
                  <option value="on">Powered On (Active)</option>
                  <option value="standby">Standby (iDRAC Only)</option>
                  <option value="off">Powered Off</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs" fontWeight="700">
                  Operational Health Status
                </FormLabel>
                <Select
                  size="sm"
                  borderRadius="8px"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}>
                  <option value="online">Healthy / Online (Green)</option>
                  <option value="warning">Warning / Degraded (Amber)</option>
                  <option value="offline">Offline / Fault (Red)</option>
                </Select>
              </FormControl>
            </SimpleGrid>
          </VStack>
        </ModalBody>

        <ModalFooter borderTop="1px solid" borderColor={borderColor} py="10px">
          <Button size="sm" variant="ghost" mr="10px" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            colorScheme="brand"
            leftIcon={<Icon as={MdCheck} />}
            onClick={handleConfirm}>
            Insert Blade/Sled into Bay {targetBay}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
