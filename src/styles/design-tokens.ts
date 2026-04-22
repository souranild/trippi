/**
 * Tactile Maximalism Design System
 * Color palette and design tokens for Trippi
 * Reference: /stitch/neotactile_dark/DESIGN.md
 */

export const designTokens = {
  colors: {
    // Primary colors
    primary: '#8ff5ff', // Electric Blue
    secondary: '#c3f400', // Acid Green
    tertiary: '#ff51fa', // Hot Pink
    
    // Base colors
    background: '#0e0e0e', // Deep Black
    surface: '#1a1a1a',
    surfaceLight: '#2d2d2d',
    
    // Accents
    accent1: '#8ff5ff', // Electric Blue
    accent2: '#c3f400', // Acid Green
    accent3: '#ff51fa', // Hot Pink
    
    // Text
    textPrimary: '#ffffff',
    textSecondary: '#b0b0b0',
    textTertiary: '#808080',
    
    // Utility
    success: '#00ff41',
    warning: '#ffa500',
    error: '#ff3333',
  },
  
  gradients: {
    primary: 'linear-gradient(135deg, #8ff5ff 0%, #00d9ff 100%)',
    secondary: 'linear-gradient(135deg, #c3f400 0%, #a8d000 100%)',
    tertiary: 'linear-gradient(135deg, #ff51fa 0%, #ff00ff 100%)',
    mixed: 'linear-gradient(135deg, #8ff5ff 0%, #c3f400 50%, #ff51fa 100%)',
  },
  
  shadows: {
    // Glass morphism effect
    glass: '0 8px 32px rgba(139, 245, 255, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
    
    // Glow effects
    glowBlue: '0 0 20px rgba(139, 245, 255, 0.3), 0 0 40px rgba(139, 245, 255, 0.1)',
    glowGreen: '0 0 20px rgba(195, 244, 0, 0.3), 0 0 40px rgba(195, 244, 0, 0.1)',
    glowPink: '0 0 20px rgba(255, 81, 250, 0.3), 0 0 40px rgba(255, 81, 250, 0.1)',
    
    // Standard shadows
    sm: '0 1px 2px rgba(0, 0, 0, 0.5)',
    md: '0 4px 6px rgba(0, 0, 0, 0.7)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.8)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.9)',
  },
  
  backdropFilter: {
    glass: 'blur(20px)',
  },
  
  borderRadius: {
    xs: '0.375rem', // 6px
    sm: '0.5rem', // 8px
    md: '0.75rem', // 12px
    lg: '1rem', // 16px
    xl: '1.5rem', // 24px
    full: '9999px',
  },
  
  typography: {
    // Font families
    fontFamily: {
      heading: '"Space Grotesk", sans-serif',
      body: '"Manrope", sans-serif',
      label: '"Inter", sans-serif',
    },
    
    // Font sizes
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
    },
    
    // Font weights
    fontWeight: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    
    // Letter spacing (tight as per spec)
    letterSpacing: {
      tight: '-0.02em',
      normal: '0',
      wide: '0.02em',
    },
  },
  
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '2.5rem',
    '3xl': '3rem',
  },
  
  animations: {
    // Duration
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slower: '700ms',
    },
    
    // Easing
    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  
  zIndex: {
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },
}

export type DesignTokens = typeof designTokens
