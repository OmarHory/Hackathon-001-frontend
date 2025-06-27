import React from 'react';
import Navigation from './Navigation';
import IntentIndicator from '../ui/IntentIndicator';

interface PageLayoutProps {
  children: React.ReactNode;
  showNavigation?: boolean;
  title?: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({ 
  children, 
  showNavigation = true,
  title 
}) => {
  return (
    <div>
      {/* Intent Indicator - Fixed position */}
      <IntentIndicator />
      
      {/* Page Title */}
      {title && (
        <h1
          style={{
            textAlign: 'center',
            fontSize: '2.5em',
            marginBottom: '30px',
            color: 'white',
          }}
        >
          {title}
        </h1>
      )}
      
      {/* Navigation */}
      {showNavigation && <Navigation />}
      
      {/* Page Content */}
      {children}
    </div>
  );
};

export default PageLayout; 