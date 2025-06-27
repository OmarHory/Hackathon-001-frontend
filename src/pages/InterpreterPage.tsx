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

const InstructionsSection = styled(Container)`
  margin-bottom: 30px;
  padding: 25px;
`;

const InstructionsTitle = styled.h3`
  color: ${theme.colors.primary};
  margin-bottom: 15px;
  font-size: 1.4rem;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const InstructionsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  
  li {
    padding: 8px 0;
    color: ${theme.colors.text};
    display: flex;
    align-items: center;
    gap: 10px;
    
    &:before {
      content: '▶';
      color: ${theme.colors.secondary};
      font-size: 0.8rem;
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
  const isConnected = useAppSelector((state) => (state.voice as any)?.isConnected || false);

  return (
    <InterpreterPageContainer>
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

      <InstructionsSection>
        <InstructionsTitle>
          📋 Instructions
        </InstructionsTitle>
        <InstructionsList>
          <li>Click "Start Medical Interpretation" to begin</li>
          <li>Speak naturally in English or Spanish</li>
          <li>The AI will automatically detect the language and translate</li>
          <li>Say "repeat that" or "repite eso" to repeat the last translation</li>
          <li>Say "send lab order" to trigger lab ordering system</li>
          <li>Say "schedule follow-up" to schedule appointments</li>
          <li>All conversations are automatically saved for your records</li>
        </InstructionsList>
      </InstructionsSection>

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
              ? "Listening for speech... Start speaking in English or Spanish!" 
              : "Start medical interpretation to see translations appear here"
            }
          </EmptyState>
        )}
      </TranslationsSection>
    </InterpreterPageContainer>
  );
};

export default InterpreterPage; 