import React from "react";
import {
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  useColorModeValue,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
export function SearchBar(props) {
  // Pass the computed styles into the `__css` prop
  const { variant, background, children, placeholder, borderRadius, ...rest } =
    props;
  // Chakra Color Mode
  const searchIconColor = useColorModeValue("secondaryGray.600", "whiteAlpha.700");
  const inputBg = useColorModeValue("secondaryGray.300", "navy.900");
  const inputText = useColorModeValue("navy.700", "white");
  const inputBorder = useColorModeValue("transparent", "whiteAlpha.150");
  const placeholderColor = useColorModeValue("secondaryGray.500", "whiteAlpha.500");
  return (
    <InputGroup w={{ base: "100%", md: "200px" }} {...rest}>
      <InputLeftElement
        children={
          <IconButton
            bg='inherit'
            borderRadius='inherit'
            _hover={{ bg: "none" }}
            _active={{
              bg: "inherit",
              transform: "none",
              borderColor: "transparent",
            }}
            _focus={{
              boxShadow: "none",
            }}
            icon={
              <SearchIcon color={searchIconColor} w='15px' h='15px' />
            }></IconButton>
        }
      />
      <Input
        variant='search'
        fontSize='sm'
        bg={background ? background : inputBg}
        color={inputText}
        border="1px solid"
        borderColor={inputBorder}
        fontWeight='500'
        _placeholder={{ color: placeholderColor, fontSize: "14px" }}
        borderRadius={borderRadius ? borderRadius : "30px"}
        placeholder={placeholder ? placeholder : "Search..."}
      />
    </InputGroup>
  );
}
