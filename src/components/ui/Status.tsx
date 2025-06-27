import React from 'react';
import { globalStyles } from '../../utils/theme';

interface StatusProps {
  message: string;
  type?: 'normal' | 'error' | 'success' | 'loading';
  style?: React.CSSProperties;
}

const Status: React.FC<StatusProps> = ({ 
  message, 
  type = 'normal', 
  style = {} 
}) => {
  const getStatusStyle = () => {
    const baseStyle = { ...globalStyles.status };
    
    switch (type) {
      case 'error':
        return { ...baseStyle, ...globalStyles.error };
      case 'success':
        return { ...baseStyle, ...globalStyles.success };
      case 'loading':
        return { 
          ...baseStyle, 
          background: 'rgba(255, 215, 0, 0.3)',
          border: '1px solid #FFD700'
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div
      style={{
        ...getStatusStyle(),
        ...style,
      }}
    >
      {message}
    </div>
  );
};

export default Status; 