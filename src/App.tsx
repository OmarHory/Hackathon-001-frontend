import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { store } from './store/store';
import { theme } from './utils/theme';
import './App.css';

// Import pages (we'll create these next)
import InterpreterPage from './pages/InterpreterPage';
import HistoryPage from './pages/HistoryPage';
import ConversationDetailPage from './pages/ConversationDetailPage';

// Main layout wrapper
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div 
      style={{
        minHeight: '100vh',
        background: theme.gradients.main,
        fontFamily: 'Arial, sans-serif',
        color: theme.colors.text,
      }}
    >
      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '20px',
        }}
      >
        {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <Provider store={store}>
      <Router>
        <AppLayout>
          <Routes>
            <Route path="/" element={<InterpreterPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/conversation/:sessionId" element={<ConversationDetailPage />} />
          </Routes>
        </AppLayout>
      </Router>
    </Provider>
  );
}

export default App;
