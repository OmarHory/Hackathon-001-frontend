import React from 'react';
import { useAppSelector } from '../../hooks/redux';
import { globalStyles, intentStyles } from '../../utils/theme';

const IntentIndicator: React.FC = () => {
  const intentState = useAppSelector((state) => state.intent);

  // Type guard to ensure we have the right state shape
  if (!intentState || typeof intentState !== 'object') {
    return null;
  }

  const state = intentState as any; // Temporary type assertion
  
  if (!state.isVisible) {
    return null;
  }

  const intentStyle = intentStyles[state.currentIntent as keyof typeof intentStyles] || intentStyles.translation;

  return (
    <div
      style={{
        ...globalStyles.intentIndicator,
        ...intentStyle,
        animation: 'intentPulse 2s infinite',
        display: state.isVisible ? 'block' : 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px',
        }}
      >
        <span style={{ fontSize: '20px' }}>{state.icon}</span>
        <span>{state.label}</span>
      </div>
      <style>
        {`
          @keyframes intentPulse {
            0%, 100% { transform: scale(1); opacity: 0.9; }
            50% { transform: scale(1.05); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default IntentIndicator; 