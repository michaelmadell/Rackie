import { mode } from "@chakra-ui/theme-tools";
export const badgeStyles = {
  components: {
    Badge: {
      baseStyle: {
        borderRadius: "10px",
        lineHeight: "100%",
        padding: "7px",
        paddingLeft: "12px",
        paddingRight: "12px",
      },
      variants: {
        outline: () => ({
          borderRadius: "16px",
        }),
        brand: (props) => ({
          bg: mode("brand.500", "brand.400")(props),
          color: "white",
          _focus: {
            bg: mode("brand.500", "brand.400")(props),
          },
          _active: {
            bg: mode("brand.500", "brand.400")(props),
          },
          _hover: {
            bg: mode("brand.600", "brand.400")(props),
          },
        }),
        coral: (props) => ({
          bg: mode("coral.500", "coral.400")(props),
          color: "white",
        }),
        teal: (props) => ({
          bg: mode("brand.300", "brand.300")(props),
          color: "#0b2130",
        }),
      },
    },
  },
};
