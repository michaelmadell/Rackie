import { mode } from "@chakra-ui/theme-tools";
export const globalStyles = {
  colors: {
    // Amulet Hotkey Brand Palette: Light Teal (#a3d4d1), Coral (#ff745b), Dark Blue (#0b2130)
    brand: {
      50: "#edf7f6",
      100: "#d4ecea",
      200: "#bce2df",
      300: "#a3d4d1", // Amulet Hotkey signature Light Teal
      400: "#7ec1bd",
      500: "#3d9e99", // Primary interactive teal
      600: "#2e817d",
      700: "#226562",
      800: "#174947",
      900: "#0b2130", // Amulet Hotkey Dark Blue
    },
    brandScheme: {
      50: "#edf7f6",
      100: "#d4ecea",
      200: "#bce2df",
      300: "#a3d4d1",
      400: "#7ec1bd",
      500: "#3d9e99",
      600: "#2e817d",
      700: "#226562",
      800: "#174947",
      900: "#0b2130",
    },
    brandTabs: {
      50: "#edf7f6",
      100: "#d4ecea",
      200: "#bce2df",
      300: "#a3d4d1",
      400: "#7ec1bd",
      500: "#3d9e99",
      600: "#2e817d",
      700: "#226562",
      800: "#174947",
      900: "#0b2130",
    },
    coral: {
      50: "#fff2ef",
      100: "#ffe0db",
      200: "#ffc4b9",
      300: "#ffa493",
      400: "#ff8972",
      500: "#ff745b", // Amulet Hotkey signature Coral
      600: "#e6583e",
      700: "#cc4128",
      800: "#992a16",
      900: "#66180a",
    },
    brandCoral: {
      50: "#fff2ef",
      100: "#ffe0db",
      200: "#ffc4b9",
      300: "#ffa493",
      400: "#ff8972",
      500: "#ff745b",
      600: "#e6583e",
      700: "#cc4128",
      800: "#992a16",
      900: "#66180a",
    },
    peach: {
      50: "#fff2ef",
      100: "#ffe0db",
      200: "#ffc4b9",
      300: "#ffa493",
      400: "#ff8972",
      500: "#ff745b",
      600: "#e6583e",
      700: "#cc4128",
      800: "#992a16",
      900: "#66180a",
    },
    teal: {
      50: "#edf7f6",
      100: "#d4ecea",
      200: "#bce2df",
      300: "#a3d4d1", // Amulet Hotkey Light Teal
      400: "#7ec1bd",
      500: "#3d9e99",
      600: "#2e817d",
      700: "#226562",
      800: "#174947",
      900: "#0b2130",
    },
    secondaryGray: {
      100: "#E0E5F2",
      200: "#E1E9F8",
      300: "#F4F7FE",
      400: "#E9EDF7",
      500: "#8F9BBA",
      600: "#A3AED0",
      700: "#707EAE",
      800: "#707EAE",
      900: "#1B2559",
    },
    red: {
      100: "#ffdfdd",
      500: "#ff7e72",
      600: "#ff0000",
    },
    blue: {
      50: "#d7e5f7",
      500: "#0037fe",
    },
    orange: {
      100: "#ffe0db",
      500: "#ff745b", // Aligned with Amulet Hotkey coral
      600: "#e6583e",
    },
    green: {
      100: "#d7ffe2",
      500: "#01b52b",
    },
    navy: {
      50: "#e2e8ed",
      100: "#b8c7d3",
      200: "#8da5b8",
      300: "#61839e",
      400: "#3d6484",
      500: "#254868",
      600: "#1c3852",
      700: "#142d41",
      800: "#102334",
      900: "#0b2130", // Amulet Hotkey Dark Blue
    },
    gray: {
      100: "#e8e8e9",
    },
  },
  styles: {
    global: (props) => ({
      body: {
        overflowX: "hidden",
        bg: mode("secondaryGray.300", "navy.900")(props),
        color: mode("secondaryGray.900", "white")(props),
        fontFamily: "DM Sans",
        letterSpacing: "-0.5px",
      },
      input: {
        color: "inherit",
      },
      textarea: {
        color: "inherit",
      },
      select: {
        color: "inherit",
      },
      "&[data-theme=dark] input, &[data-theme=dark] textarea, &[data-theme=dark] select": {
        color: "#ffffff !important",
      },
      "&[data-theme=light] input, &[data-theme=light] textarea, &[data-theme=light] select": {
        color: "#1B2559",
      },
      html: {
        fontFamily: "DM Sans",
      },
      "::-webkit-scrollbar": {
        width: "8px",
        height: "8px",
      },
      "::-webkit-scrollbar-track": {
        background: mode("transparent", "navy.900")(props),
      },
      "::-webkit-scrollbar-thumb": {
        background: mode("secondaryGray.400", "navy.600")(props),
        borderRadius: "8px",
      },
      "::-webkit-scrollbar-thumb:hover": {
        background: mode("secondaryGray.500", "navy.500")(props),
      },
    }),
  },
};
