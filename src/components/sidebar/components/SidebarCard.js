import {
  Button,
  Flex,
  Image,
  Link,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import logoWhite from "assets/img/layout/logoWhite.png";
import React from "react";

export default function SidebarDocs() {
  const bgColor = "linear-gradient(135deg, #3d9e99 0%, #0b2130 100%)";
  const borderColor = useColorModeValue("white", "navy.800");

  return (
    <Flex
      justify='center'
      direction='column'
      align='center'
      bg={bgColor}
      borderRadius='30px'
      position='relative'>
      <Flex
        border='5px solid'
        borderColor={borderColor}
        bg='linear-gradient(135deg, #a3d4d1 0%, #3d9e99 100%)'
        borderRadius='50%'
        w='94px'
        h='94px'
        align='center'
        justify='center'
        mx='auto'
        position='absolute'
        left='50%'
        top='-47px'
        transform='translate(-50%, 0%)'>
        <Image src={logoWhite} w='40px' h='40px' />
      </Flex>
      <Flex
        direction='column'
        mb='12px'
        align='center'
        justify='center'
        px='15px'
        pt='55px'>
        <Text
          fontSize={{ base: "lg", xl: "18px" }}
          color='white'
          fontWeight='bold'
          lineHeight='150%'
          textAlign='center'
          px='10px'
          mt="10px"
          mb='6px'>
          Rackie Docs
        </Text>
        <Text
          fontSize='14px'
          color={"whiteAlpha.800"}
          fontWeight='500'
          px='10px'
          mb='6px'
          textAlign='center'>
          Interactive rack layout, modular blade enclosures & cable management.
        </Text>
      </Flex>
      <Link href='/#/admin/rack-room'>
        <Button
          bg='coral.500'
          _hover={{ bg: "coral.600" }}
          _active={{ bg: "coral.700" }}
          mb={{ sm: "16px", xl: "24px" }}
          color={"white"}
          fontWeight='medium'
          fontSize='sm'
          minW='185px'
          mx='auto'>
          Open Rack Canvas
        </Button>
      </Link>
    </Flex>
  );
}
