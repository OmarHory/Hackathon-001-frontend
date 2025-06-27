import React from 'react';
import { globalStyles } from '../../utils/theme';

interface ContainerProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const Container: React.FC<ContainerProps> = ({ 
  children, 
  style = {}, 
  className = '' 
}) => {
  return (
    <div
      className={className}
      style={{
        ...globalStyles.container,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export default Container; 