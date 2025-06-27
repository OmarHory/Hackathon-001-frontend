import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../ui/Button';

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isInterpreterPage = location.pathname === '/';
  const isHistoryPage = location.pathname === '/history';

  return (
    <div
      style={{
        marginBottom: '20px',
        display: 'flex',
        gap: '10px',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}
    >
      <Button
        variant={isInterpreterPage ? 'primary' : 'secondary'}
        onClick={() => navigate('/')}
        style={{
          ...(isInterpreterPage ? {
            border: '2px solid #FFD700',
            background: 'rgba(255, 215, 0, 0.3)',
          } : {}),
        }}
      >
        🏥 Medical Interpreter
      </Button>
      
      <Button
        variant={isHistoryPage ? 'primary' : 'secondary'}
        onClick={() => navigate('/history')}
        style={{
          ...(isHistoryPage ? {
            border: '2px solid #FFD700',
            background: 'rgba(255, 215, 0, 0.3)',
          } : {}),
        }}
      >
        📜 Interpretation History
      </Button>
    </div>
  );
};

export default Navigation; 