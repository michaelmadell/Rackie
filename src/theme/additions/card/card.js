import { mode } from '@chakra-ui/theme-tools';
const Card = {
  baseStyle: (props) => ({
    p: '20px',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    position: 'relative',
    borderRadius: '20px',
    minWidth: '0px',
    wordWrap: 'break-word',
    bg: mode('#ffffff', 'navy.800')(props),
    border: mode('none', '1px solid')(props),
    borderColor: mode('transparent', 'whiteAlpha.100')(props),
    boxShadow: mode(
      '14px 17px 40px 4px rgba(112, 144, 176, 0.08)',
      '0px 4px 20px rgba(0, 0, 0, 0.35)',
    )(props),
    backgroundClip: 'border-box',
  }),
};

export const CardComponent = {
  components: {
    Card,
  },
};
