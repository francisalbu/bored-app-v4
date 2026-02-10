// Typography system based on Inter font (like boredtourist.com)
// Note: After loading with useFonts, font names use underscores
const typography = {
  // Font families
  fonts: {
    light: 'Inter_300Light',
    regular: 'Inter_400Regular',
    semibold: 'Inter_600SemiBold',
    extrabold: 'Inter_800ExtraBold',
    black: 'Inter_900Black',
  },
  
  // Font sizes
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },
  
  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Predefined text styles (like website)
  styles: {
    // Headlines - Bold and impactful
    h1: {
      fontFamily: 'Inter_900Black',
      fontSize: 48,
      lineHeight: 52,
      letterSpacing: -1,
    },
    h2: {
      fontFamily: 'Inter_800ExtraBold',
      fontSize: 36,
      lineHeight: 42,
      letterSpacing: -0.5,
    },
    h3: {
      fontFamily: 'Inter_800ExtraBold',
      fontSize: 24,
      lineHeight: 30,
      letterSpacing: -0.3,
    },
    
    // Body text
    body: {
      fontFamily: 'Inter_400Regular',
      fontSize: 15,
      lineHeight: 24,
    },
    bodyLarge: {
      fontFamily: 'Inter_400Regular',
      fontSize: 17,
      lineHeight: 26,
    },
    bodySmall: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 20,
    },
    
    // UI elements
    button: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: 0.3,
      textTransform: 'uppercase' as const,
    },
    buttonLarge: {
      fontFamily: 'Inter_800ExtraBold',
      fontSize: 17,
      lineHeight: 24,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
    caption: {
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      lineHeight: 16,
    },
    label: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0.2,
    },
  },
};

export default typography;
