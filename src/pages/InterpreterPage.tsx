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

const DebugSection = styled(Container)`
  margin-bottom: 20px;
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  font-family: monospace;
  font-size: 0.8rem;
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

  // Audio test functionality
  const testMicrophone = async () => {
    try {
      console.log('🎤 Testing microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create audio context and analyser
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      microphone.connect(analyser);
      
      let testCount = 0;
      const maxTests = 20; // Test for 10 seconds
      
      const testAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        
        console.log(`🎤 Audio test ${testCount + 1}/${maxTests}: Level = ${Math.round(average)}`);
        
        if (average > 20) {
          console.log('✅ Audio input detected! Microphone is working.');
        }
        
        testCount++;
        if (testCount < maxTests) {
          setTimeout(testAudioLevel, 500);
        } else {
          console.log('🎤 Audio test completed. Check console for results.');
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
        }
      };
      
      console.log('🎤 Audio test started. Speak into your microphone...');
      testAudioLevel();
      
    } catch (error) {
      console.error('❌ Microphone test failed:', error);
      alert('Microphone test failed. Please check permissions and try again.');
    }
  };

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

      {/* Debug Information */}
      <DebugSection>
        <h4 style={{ color: '#ff6b6b', marginBottom: '10px' }}>🐛 Debug Information</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <strong>Connection Status:</strong><br />
            {isConnected ? '✅ Connected' : '❌ Not Connected'}<br />
            <strong>Session ID:</strong><br />
            {connection?.sessionId || 'None'}<br />
            <strong>Voice State:</strong><br />
            {JSON.stringify(voiceState, null, 2)}
          </div>
          <div>
            <strong>Translation Pairs:</strong><br />
            {translationPairs.length} pairs<br />
            <strong>Latest Translation:</strong><br />
            {translationPairs[0]?.translatedText || 'None'}<br />
            <strong>Data Channel:</strong><br />
            {connection?.dataChannel ? '✅ Open' : '❌ Closed'}
          </div>
        </div>
        <div style={{ marginTop: '10px', fontSize: '0.7rem', opacity: 0.7 }}>
          💡 Open browser console (F12) to see detailed WebRTC and OpenAI events
        </div>
      </DebugSection>

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

          <Button
            variant="secondary"
            onClick={testMicrophone}
            disabled={isConnected}
            style={{ minWidth: '200px' }}
          >
            🧪 Test Microphone
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

      <InstructionsSection>
        <InstructionsTitle>
          📋 Testing Instructions
        </InstructionsTitle>
        <InstructionsList>
          <li><strong>Step 1:</strong> Click "Test Microphone" first to verify audio is working</li>
          <li><strong>Step 2:</strong> Click "Start Medical Interpretation" and allow microphone access</li>
          <li><strong>Step 3:</strong> Wait for "Medical interpreter ready" confirmation message</li>
          <li><strong>Step 4:</strong> Say "Hello" or "Hola" clearly into your microphone</li>
          <li><strong>Step 5:</strong> Check debug info and browser console for events</li>
          <li><strong>Step 6:</strong> Look for speech detection and translation events</li>
          <li><strong>Testing:</strong> Say "send lab order" to test function calls</li>
          <li><strong>Troubleshoot:</strong> If no translation, check network and backend connection</li>
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
              ? "✅ Connected! Speak in English or Spanish to see translations here..." 
              : "❌ Click 'Start Medical Interpretation' to begin"
            }
            <div style={{ marginTop: '15px', fontSize: '0.9rem', opacity: 0.8 }}>
              💡 If connected but no translations appear, check the debug section above and browser console
            </div>
          </EmptyState>
        )}
      </TranslationsSection>
    </InterpreterPageContainer>
  );
};

export default InterpreterPage; 