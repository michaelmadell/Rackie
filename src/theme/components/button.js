import { mode } from "@chakra-ui/theme-tools";
export const buttonStyles = {
  components: {
    Button: {
      baseStyle: {
        borderRadius: "16px",
        boxShadow: "45px 76px 113px 7px rgba(112, 144, 176, 0.08)",
        transition: ".25s all ease",
        boxSizing: "border-box",
        _focus: {
          boxShadow: "none",
        },
        _active: {
          boxShadow: "none",
        },
      },
      variants: {
        outline: (props) => ({
          borderRadius: "16px",
          border: "1px solid",
          borderColor: mode("secondaryGray.400", "whiteAlpha.300")(props),
          color: mode("secondaryGray.900", "white")(props),
          bg: "transparent",
          _hover: {
            bg: mode("secondaryGray.100", "whiteAlpha.100")(props),
            borderColor: mode("secondaryGray.500", "whiteAlpha.400")(props),
          },
          _active: {
            bg: mode("secondaryGray.200", "whiteAlpha.200")(props),
          },
          _focus: {
            boxShadow: "none",
          },
        }),
        solid: (props) => {
          const { colorScheme: c } = props;
          if (c === "brand") {
            return {
              bg: mode("brand.500", "brand.500")(props),
              color: "white",
              _hover: {
                bg: mode("brand.600", "brand.600")(props),
              },
              _active: {
                bg: mode("brand.700", "brand.700")(props),
              },
              _disabled: {
                bg: mode("brand.300", "brand.800")(props),
                opacity: 0.6,
              },
            };
          }
          if (c === "coral" || c === "brandCoral") {
            return {
              bg: mode("coral.500", "coral.500")(props),
              color: "white",
              _hover: {
                bg: mode("coral.600", "coral.600")(props),
              },
              _active: {
                bg: mode("coral.700", "coral.700")(props),
              },
              _disabled: {
                bg: mode("coral.300", "coral.800")(props),
                opacity: 0.6,
              },
            };
          }
          return {};
        },
        brand: (props) => ({
          bg: mode("brand.500", "brand.500")(props),
          color: "white",
          _focus: {
            bg: mode("brand.500", "brand.500")(props),
          },
          _active: {
            bg: mode("brand.600", "brand.600")(props),
          },
          _hover: {
            bg: mode("brand.600", "brand.600")(props),
          },
        }),
        coral: (props) => ({
          bg: mode("coral.500", "coral.500")(props),
          color: "white",
          _focus: {
            bg: mode("coral.500", "coral.500")(props),
          },
          _active: {
            bg: mode("coral.600", "coral.600")(props),
          },
          _hover: {
            bg: mode("coral.600", "coral.600")(props),
          },
        }),
        darkBrand: (props) => ({
          bg: mode("brand.900", "brand.400")(props),
          color: "white",
          _focus: {
            bg: mode("brand.900", "brand.400")(props),
          },
          _active: {
            bg: mode("brand.900", "brand.400")(props),
          },
          _hover: {
            bg: mode("brand.800", "brand.400")(props),
          },
        }),
        lightBrand: (props) => ({
          bg: mode("brand.50", "whiteAlpha.100")(props),
          color: mode("brand.600", "brand.300")(props),
          _focus: {
            bg: mode("brand.100", "whiteAlpha.100")(props),
          },
          _active: {
            bg: mode("secondaryGray.300", "whiteAlpha.100")(props),
          },
          _hover: {
            bg: mode("brand.100", "whiteAlpha.200")(props),
          },
        }),
        lightCoral: (props) => ({
          bg: mode("coral.50", "whiteAlpha.100")(props),
          color: mode("coral.600", "coral.300")(props),
          _focus: {
            bg: mode("coral.100", "whiteAlpha.100")(props),
          },
          _active: {
            bg: mode("coral.100", "whiteAlpha.100")(props),
          },
          _hover: {
            bg: mode("coral.100", "whiteAlpha.200")(props),
          },
        }),
        light: (props) => ({
          bg: mode("secondaryGray.300", "whiteAlpha.100")(props),
          color: mode("secondaryGray.900", "white")(props),
          _focus: {
            bg: mode("secondaryGray.300", "whiteAlpha.100")(props),
          },
          _active: {
            bg: mode("secondaryGray.300", "whiteAlpha.100")(props),
          },
          _hover: {
            bg: mode("secondaryGray.400", "whiteAlpha.200")(props),
          },
        }),
        action: (props) => ({
          fontWeight: "500",
          borderRadius: "50px",
          bg: mode("secondaryGray.300", "brand.400")(props),
          color: mode("brand.500", "white")(props),
          _focus: {
            bg: mode("secondaryGray.300", "brand.400")(props),
          },
          _active: { bg: mode("secondaryGray.300", "brand.400")(props) },
          _hover: {
            bg: mode("secondaryGray.200", "brand.400")(props),
          },
        }),
        setup: (props) => ({
          fontWeight: "500",
          borderRadius: "50px",
          bg: mode("transparent", "brand.400")(props),
          border: mode("1px solid", "0px solid")(props),
          borderColor: mode("secondaryGray.400", "transparent")(props),
          color: mode("secondaryGray.900", "white")(props),
          _focus: {
            bg: mode("transparent", "brand.400")(props),
          },
          _active: { bg: mode("transparent", "brand.400")(props) },
          _hover: {
            bg: mode("secondaryGray.100", "brand.400")(props),
          },
        }),
        "no-hover": {
          bg: "transparent",
          _hover: {
            boxShadow: "none",
            bg: "transparent",
          },
          _focus: {
            boxShadow: "none",
          },
          _active: {
            boxShadow: "none",
            bg: "transparent",
          },
        },
      },
    },
  },
};
