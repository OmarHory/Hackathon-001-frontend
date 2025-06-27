import { Theme } from '../types';

export const theme: Theme = {
  colors: {
    primary: '#4CAF50',
    secondary: '#2196F3',
    success: '#4CAF50',
    error: '#FF6464',
    warning: '#FFD700',
    background: '#667eea',
    surface: 'rgba(255, 255, 255, 0.1)',
    text: '#FFFFFF',
  },
  gradients: {
    main: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    surface: 'rgba(255, 255, 255, 0.1)',
  },
};

// CSS-in-JS styles that match the original HTML
export const globalStyles = {
  container: {
    background: theme.gradients.surface,
    borderRadius: '20px',
    padding: '30px',
    backdropFilter: 'blur(10px)',
    marginBottom: '20px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  
  button: {
    background: theme.colors.primary,
    border: 'none',
    color: 'white',
    padding: '15px 32px',
    textAlign: 'center' as const,
    fontSize: '16px',
    margin: '10px',
    cursor: 'pointer',
    borderRadius: '25px',
    transition: 'all 0.3s',
    fontWeight: 'bold',
    
    '&:hover': {
      transform: 'scale(1.05)',
    },
    
    '&:disabled': {
      background: '#cccccc',
      cursor: 'not-allowed',
      transform: 'none',
    },
  },
  
  secondaryButton: {
    background: theme.colors.secondary,
    '&:hover': {
      background: '#1976D2',
    },
  },
  
  status: {
    margin: '20px 0',
    padding: '15px',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.2)',
    color: theme.colors.text,
  },
  
  error: {
    background: 'rgba(255, 0, 0, 0.3)',
  },
  
  success: {
    background: 'rgba(0, 255, 0, 0.3)',
  },
  
  translationPair: {
    marginBottom: '20px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '15px',
    padding: '15px',
    borderLeft: '4px solid #FFD700',
    transition: 'opacity 0.3s, transform 0.3s',
  },
  
  translationBox: {
    flex: 1,
    transition: 'all 0.3s ease',
    
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    },
  },
  
  modal: {
    position: 'fixed' as const,
    zIndex: 2000,
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(5px)',
  },
  
  modalContent: {
    background: theme.gradients.main,
    margin: '2% auto',
    padding: 0,
    borderRadius: '20px',
    width: '90%',
    maxWidth: '900px',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
  },
  
  intentIndicator: {
    position: 'fixed' as const,
    top: '20px',
    right: '20px',
    zIndex: 1000,
    background: 'rgba(0, 0, 0, 0.8)',
    borderRadius: '25px',
    padding: '15px 25px',
    border: '2px solid #FFD700',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
  },
};

// Intent-specific styles
export const intentStyles = {
  translation: {
    borderColor: '#0096FF',
    background: 'rgba(0, 150, 255, 0.2)',
  },
  'lab-order': {
    borderColor: '#FF6464',
    background: 'rgba(255, 100, 100, 0.2)',
  },
  appointment: {
    borderColor: '#64FF64',
    background: 'rgba(100, 255, 100, 0.2)',
  },
};

// Animations
export const animations = {
  intentPulse: `
    @keyframes intentPulse {
      0%, 100% { transform: scale(1); opacity: 0.9; }
      50% { transform: scale(1.05); opacity: 1; }
    }
  `,
  modalSlideIn: `
    @keyframes modalSlideIn {
      from { opacity: 0; transform: translateY(-50px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
};

// Media queries
export const breakpoints = {
  mobile: '768px',
  tablet: '1024px',
  desktop: '1200px',
}; 