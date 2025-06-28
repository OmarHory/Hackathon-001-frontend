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
import MobileAudioHandler from '../components/ui/MobileAudioHandler';

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

const AvailableActionsSection = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
  margin-bottom: 30px;
  border-left: 4px solid ${theme.colors.secondary};
`;

const ActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
  margin-top: 15px;
`;

const ActionCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 15px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }
`;

const ActionTitle = styled.h4`
  color: ${theme.colors.warning};
  margin: 0 0 8px 0;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ActionDescription = styled.p`
  color: ${theme.colors.text};
  margin: 0 0 8px 0;
  font-size: 0.9rem;
  line-height: 1.4;
`;

const ActionCommands = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 5px;
  padding: 8px;
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  color: ${theme.colors.secondary};
`;

const Title = styled.h1`
  font-size: 2rem;
  color: ${theme.colors.primary};
  margin-bottom: 10px;
`;

const Subtitle = styled.p`
  color: ${theme.colors.text};
  font-size: 1.1rem;
  margin: 0;
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

  // Get states for better UX indicators
  const isConnected = useAppSelector((state) => (state.voice as any)?.voiceState?.isConnected || false);
  const connectionState = useAppSelector((state) => (state.voice as any)?.connection?.connectionState || 'new');
  const summaryGenerating = useAppSelector((state) => (state.conversation as any)?.summaryGenerating || false);
  
  // Get current session summary
  const sessionSummary = useAppSelector((state) => (state.conversation as any)?.selectedConversation?.summary);

  // Determine button state more accurately
  const isConnecting = connectionState === 'connecting' || (connectionState !== 'new' && connectionState !== 'failed' && !isConnected);
  const buttonDisabled = isConnected || isConnecting;

  return (
    <InterpreterPageContainer>
      {/* Mobile Audio Handler - Handles mobile-specific audio initialization */}
      <MobileAudioHandler onUserInteraction={() => {
        console.log('Mobile audio interaction completed');
      }} />
      
      {/* Intent Indicator - Fixed position */}
      <IntentIndicator />
      
      {/* Navigation Tabs */}
      <Navigation />
      
      <HeaderSection>
        <Title>Medical Interpreter</Title>
        <Subtitle>Real-time English ↔ Spanish interpretation for medical consultations</Subtitle>
      </HeaderSection>

      <AvailableActionsSection>
        <h3 style={{ 
          color: theme.colors.primary, 
          margin: '0 0 10px 0', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '10px' 
        }}>
          🎯 Available Actions
        </h3>
        <p style={{ 
          color: theme.colors.text, 
          margin: '0 0 15px 0', 
          textAlign: 'center',
          opacity: 0.8 
        }}>
          Speak naturally - the system will automatically handle these actions
        </p>
        <ActionsGrid>
          <ActionCard>
            <ActionTitle>
              🌐 Translate
            </ActionTitle>
            <ActionDescription>
              Automatic English ↔ Spanish medical interpretation
            </ActionDescription>
          </ActionCard>
          
          <ActionCard>
            <ActionTitle>
              🧪 Send Lab Order
            </ActionTitle>
            <ActionDescription>
              Order laboratory tests for the patient
            </ActionDescription>
          </ActionCard>
          
          <ActionCard>
            <ActionTitle>
              📅 Schedule Follow Up Appointment
            </ActionTitle>
            <ActionDescription>
              Schedule a follow-up appointment for the patient
            </ActionDescription>
          </ActionCard>
        </ActionsGrid>
      </AvailableActionsSection>

      <ControlsSection>
        <StatusSection>
          <Status 
            message={voiceState?.status || 'Ready to start medical interpretation! 🏥'} 
            type={voiceState?.isError ? 'error' : voiceState?.isListening || isConnecting ? 'loading' : 'normal'}
          />
        </StatusSection>

        <ButtonGroup>
          <Button
            variant="primary"
            onClick={startVoiceChat}
            disabled={buttonDisabled}
            style={{ minWidth: '200px' }}
          >
            {isConnecting ? '⏳ Please wait a moment...' : '🎙️ Start Medical Interpretation'}
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
      {summaryGenerating && (
        <Container style={{ 
          marginBottom: '30px',
          background: 'rgba(255, 215, 0, 0.15)',
          border: '2px dashed #FFD700'
        }}>
          <div style={{ 
            textAlign: 'center',
            padding: '20px',
            color: '#FFD700'
          }}>
            <div style={{ 
              fontSize: '2rem',
              marginBottom: '10px',
              animation: 'spin 2s linear infinite'
            }}>
              ⚙️
            </div>
            <h3 style={{ margin: '0 0 5px 0' }}>
              📋 Generating Medical Summary...
            </h3>
            <p style={{ margin: 0, opacity: 0.8 }}>
              Please wait while we analyze the conversation and create your medical summary
            </p>
          </div>
          <style>
            {`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}
          </style>
        </Container>
      )}
      
      {sessionSummary && !summaryGenerating && (
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