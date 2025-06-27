import React from 'react';
import { globalStyles, theme } from '../../utils/theme';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  type?: 'button' | 'submit' | 'reset';
  style?: React.CSSProperties;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  type = 'button',
  style = {}
}) => {
  const buttonStyle = {
    ...globalStyles.button,
    ...(variant === 'secondary' ? globalStyles.secondaryButton : {}),
    ...style,
  };

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      style={{
        ...buttonStyle,
        ...(disabled ? {
          background: '#cccccc',
          cursor: 'not-allowed',
          transform: 'none',
        } : {}),
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.backgroundColor = variant === 'secondary' ? '#1976D2' : '#45a049';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.backgroundColor = variant === 'secondary' ? theme.colors.secondary : theme.colors.primary;
        }
      }}
    >
      {children}
    </button>
  );
};

export default Button; 