import { mode } from "@chakra-ui/theme-tools";

export const textareaStyles = {
  components: {
    Textarea: {
      defaultProps: {
        variant: "main",
      },
      baseStyle: {
        fontWeight: 400,
        borderRadius: "16px",
      },

      variants: {
        main: (props) => ({
          bg: mode("transparent", "navy.800")(props),
          border: "1px solid",
          color: mode("secondaryGray.900", "white")(props),
          borderColor: mode("secondaryGray.400", "whiteAlpha.200")(props),
          borderRadius: "16px",
          fontSize: "sm",
          p: "14px 20px",
          _placeholder: {
            color: mode("secondaryGray.500", "secondaryGray.600")(props),
          },
          _focus: {
            borderColor: mode("brand.500", "brand.300")(props),
            boxShadow: mode(
              "0 0 0 1px #3d9e99",
              "0 0 0 1px #a3d4d1"
            )(props),
          },
        }),
        outline: (props) => ({
          bg: mode("transparent", "navy.800")(props),
          border: "1px solid",
          color: mode("secondaryGray.900", "white")(props),
          borderColor: mode("secondaryGray.400", "whiteAlpha.200")(props),
          borderRadius: "16px",
          fontSize: "sm",
          p: "14px 20px",
          _placeholder: {
            color: mode("secondaryGray.500", "secondaryGray.600")(props),
          },
          _focus: {
            borderColor: mode("brand.500", "brand.300")(props),
            boxShadow: mode(
              "0 0 0 1px #3d9e99",
              "0 0 0 1px #a3d4d1"
            )(props),
          },
        }),
        auth: (props) => ({
          bg: "white",
          border: "1px solid",
          borderColor: "secondaryGray.100",
          borderRadius: "16px",
          _placeholder: { color: "secondaryGray.600" },
        }),
      },
    },
  },
};
