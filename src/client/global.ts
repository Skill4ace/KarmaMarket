export const theme = {
  colors: {
    bgPrimary: '#FFFFFF',
    bgPrimaryDark: '#0B0B0B',
    bgSecondary: '#F6F7F8',
    bgSecondaryDark: '#1A1A1B',
    bgCard: '#FFFFFF',
    bgCardDark: '#1A1A1B',
    border: '#EDEFF1',
    borderDark: '#343536',
    orange: '#FF4500',
    green: '#0DD157',
    red: '#FF4500',
    blue: '#0079D3',
    textPrimary: '#1C1C1C',
    textPrimaryDark: '#D7DADC',
    textSecondary: '#7C7C7C',
    textSecondaryDark: '#818384',
  },
  typography: {
    fontFamily: `'Segoe UI', 'San Francisco', 'Roboto', 'Helvetica Neue', Arial, sans-serif`,
    weights: {
      regular: 400,
      medium: 500,
      semiBold: 600,
      bold: 700,
    },
    sizes: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '20px',
      xl: '24px',
      '2xl': '32px',
    },
  },
} as const;

export type Theme = typeof theme;
