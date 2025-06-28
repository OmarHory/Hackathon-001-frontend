import React from 'react';
import styled from '@emotion/styled';
import { useAppSelector } from '../hooks/redux';
import { useVoiceConversation } from '../hooks/useVoiceConversation';
import { theme } from '../utils/theme';

// Components
import Status from '../components/ui/Status';
import Container from '../components/ui/Container';
import Button from '../components/ui/Button';
import TranslationPair from '../components/conversation/TranslationPair';
import Navigation from '../components/layout/Navigation';
import IntentIndicator from '../components/ui/IntentIndicator';

const InterpreterPageContainer = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background: ${theme.gradients.main};
`;

const HeaderSection = styled.div`
  text-align: center;
  margin-bottom: 30px;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  color: ${theme.colors.primary};
  margin-bottom: 10px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  background: linear-gradient(45deg, ${theme.colors.primary}, ${theme.colors.secondary});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: ${theme.colors.text};
  margin-bottom: 30px;
  opacity: 0.8;
`;

const ControlsSection = styled(Container)`
  margin-bottom: 30px;
  padding: 30px;
  text-align: center;
`;

const StatusSection = styled.div`
  margin-bottom: 20px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    
    > * {
      width: 100%;
      max-width: 300px;
    }
  }
`;



const TranslationsSection = styled(Container)`
  margin-bottom: 30px;
  min-height: 400px;
`;

const TranslationsTitle = styled.h3`
  color: ${theme.colors.primary};
  margin-bottom: 20px;
  font-size: 1.4rem;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TranslationsList = styled.div`
  max-height: 500px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.secondary};
    border-radius: 3px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  color: ${theme.colors.text};
  opacity: 0.6;
  font-size: 1.1rem;
  padding: 40px 20px;
  
  .icon {
    font-size: 3rem;
    margin-bottom: 15px;
    display: block;
  }
`;



const InterpreterPage: React.FC = () => {
  // Use the real voice conversation hook
  const { 
    startVoiceChat, 
    stopVoiceChat, 
    voiceState, 
    connection, 
    translationPairs,
    currentSession 
  } = useVoiceConversation();

  // Get UI state for loading indicators
  const uiState = useAppSelector((state) => (state.ui as any)?.loading || false);
  const isConnected = useAppSelector((state) => (state.voice as any)?.voiceState?.isConnected || false);
  
  // Get current session summary
  const sessionSummary = useAppSelector((state) => (state.conversation as any)?.selectedConversation?.summary);



  return (
    <InterpreterPageContainer>
      {/* Intent Indicator - Fixed position */}
      <IntentIndicator />
      
      {/* Navigation Tabs */}
      <Navigation />
      
      <HeaderSection>
        <Title>Medical Interpreter</Title>
        <Subtitle>Real-time English ↔ Spanish interpretation for medical consultations</Subtitle>
      </HeaderSection>



      <ControlsSection>
        <StatusSection>
          <Status 
            message={voiceState?.status || 'Ready to start medical interpretation! 🏥'} 
            type={voiceState?.isError ? 'error' : voiceState?.isListening || uiState ? 'loading' : 'normal'}
          />
        </StatusSection>

        <ButtonGroup>
          <Button
            variant="primary"
            onClick={startVoiceChat}
            disabled={isConnected || uiState}
            style={{ minWidth: '200px' }}
          >
            {uiState ? '🔄 Connecting...' : '🎙️ Start Medical Interpretation'}
          </Button>
          
          <Button
            variant="secondary"
            onClick={stopVoiceChat}
            disabled={!isConnected}
            style={{ minWidth: '200px' }}
          >
            🛑 Stop & Save Session
          </Button>
        </ButtonGroup>
      </ControlsSection>

      {/* Medical Summary Display */}
      {sessionSummary && (
        <Container style={{ 
          marginBottom: '30px',
          background: 'rgba(255, 215, 0, 0.2)',
          border: '2px solid #FFD700'
        }}>
          <h3 style={{ 
            color: '#FFD700', 
            marginBottom: '15px',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}>
            📋 Medical Summary Generated
          </h3>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '15px'
          }}>
            <div style={{ marginBottom: '15px' }}>
              <strong style={{ color: '#87CEEB' }}>📋 Summary:</strong>
              <br />
              <p style={{ marginTop: '5px', lineHeight: '1.4' }}>{sessionSummary.summary_text}</p>
            </div>
            
            {sessionSummary.key_points && sessionSummary.key_points.length > 0 && (
              <div style={{ marginBottom: '15px' }}>
                <strong style={{ color: '#87CEEB' }}>🔍 Key Points:</strong>
                <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
                  {sessionSummary.key_points.map((point: string, index: number) => (
                    <li key={index} style={{ marginBottom: '3px' }}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {sessionSummary.action_items && sessionSummary.action_items.length > 0 && (
              <div style={{ marginBottom: '15px' }}>
                <strong style={{ color: '#87CEEB' }}>✅ Action Items:</strong>
                <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
                  {sessionSummary.action_items.map((item: string, index: number) => (
                    <li key={index} style={{ marginBottom: '3px' }}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {sessionSummary.topics && sessionSummary.topics.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <strong style={{ color: '#87CEEB' }}>🏷️ Topics:</strong>
                <br />
                <span style={{ marginTop: '5px', display: 'inline-block' }}>
                  {sessionSummary.topics.join(' • ')}
                </span>
              </div>
            )}
          </div>
          <div style={{ 
            textAlign: 'center', 
            color: '#FFD700',
            fontSize: '0.9rem'
          }}>
            💡 Summary automatically saved to conversation history
          </div>
        </Container>
      )}



      <TranslationsSection>
        <TranslationsTitle>
          🌐 Live Translation Feed
        </TranslationsTitle>
        
        {translationPairs && translationPairs.length > 0 ? (
          <TranslationsList>
            {translationPairs.map((pair: any, index: number) => (
              <TranslationPair
                key={pair.id || index}
                pair={pair}
              />
            ))}
          </TranslationsList>
        ) : (
          <EmptyState>
            <span className="icon">🎤</span>
            {isConnected 
              ? "✅ Connected! Speak in English or Spanish to see translations here..." 
              : "❌ Click 'Start Medical Interpretation' to begin"
            }
          </EmptyState>
        )}
      </TranslationsSection>
    </InterpreterPageContainer>
  );
};

export default InterpreterPage; 