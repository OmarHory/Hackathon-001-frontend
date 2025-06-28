import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { theme } from '../utils/theme';
import { fetchConversationDetails } from '../store/slices/conversationSlice';

// Components
import Container from '../components/ui/Container';
import Button from '../components/ui/Button';
import Status from '../components/ui/Status';
import Navigation from '../components/layout/Navigation';
import IntentIndicator from '../components/ui/IntentIndicator';
import TranslationPair from '../components/conversation/TranslationPair';

const DetailPageContainer = styled.div`
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
  font-size: 2rem;
  color: ${theme.colors.primary};
  margin-bottom: 10px;
`;

const SessionMeta = styled.div`
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 15px;
  margin-bottom: 30px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  border-left: 4px solid ${theme.colors.secondary};
`;

const MetaItem = styled.div`
  h4 {
    color: ${theme.colors.warning};
    margin: 0 0 5px 0;
    font-size: 0.9rem;
  }
  p {
    color: ${theme.colors.text};
    margin: 0;
    font-size: 1rem;
  }
`;

const SummarySection = styled(Container)`
  margin-bottom: 30px;
  background: rgba(255, 215, 0, 0.2);
  border: 2px solid #FFD700;
`;

const SummaryTitle = styled.h3`
  color: #FFD700;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
  
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const SummaryItem = styled.div`
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 10px;
  
  h4 {
    color: ${theme.colors.secondary};
    margin: 0 0 8px 0;
    font-size: 1rem;
  }
  
  p {
    color: ${theme.colors.text};
    margin: 0;
    line-height: 1.5;
  }
`;

const TranscriptSection = styled(Container)`
  margin-bottom: 30px;
`;

const TranscriptTitle = styled.h3`
  color: ${theme.colors.primary};
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TranscriptList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  max-height: 600px;
  overflow-y: auto;
  
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

const ActionButtons = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
`;

const ConversationDetailPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const conversationDetails = useAppSelector((state) => (state.conversation as any)?.selectedConversation);
  const loading = useAppSelector((state) => (state.conversation as any)?.loading || false);
  const error = useAppSelector((state) => (state.conversation as any)?.error);

  useEffect(() => {
    if (sessionId) {
      dispatch(fetchConversationDetails(sessionId));
    }
  }, [sessionId, dispatch]);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return 'Session in progress';
    
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const durationMs = end - start;
    const durationMin = Math.round(durationMs / 60000);
    
    if (durationMin < 60) {
      return `${durationMin} minute${durationMin !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(durationMin / 60);
      const minutes = durationMin % 60;
      return `${hours}h ${minutes}m`;
    }
  };

  if (loading) {
    return (
      <DetailPageContainer>
        <IntentIndicator />
        <Navigation />
        <Container style={{ textAlign: 'center' }}>
          <Status message="Loading conversation details..." type="loading" />
        </Container>
      </DetailPageContainer>
    );
  }

  if (error || !conversationDetails) {
    return (
      <DetailPageContainer>
        <IntentIndicator />
        <Navigation />
        <Container style={{ textAlign: 'center' }}>
          <Status message={error || "Conversation not found"} type="error" />
          <div style={{ marginTop: '20px' }}>
            <Button variant="secondary" onClick={() => navigate('/history')}>
              ← Back to History
            </Button>
          </div>
        </Container>
      </DetailPageContainer>
    );
  }

  return (
    <DetailPageContainer>
      <IntentIndicator />
      <Navigation />
      
      <HeaderSection>
        <Title>📋 Medical Interpretation Session</Title>
      </HeaderSection>

      <ActionButtons>
        <Button variant="secondary" onClick={() => navigate('/history')}>
          ← Back to History
        </Button>
        <Button variant="primary" onClick={() => navigate('/')}>
          🎙️ Start New Session
        </Button>
      </ActionButtons>

      <SessionMeta>
        <MetaItem>
          <h4>📅 Session Date</h4>
          <p>{formatDateTime(conversationDetails.started_at)}</p>
        </MetaItem>
        
        <MetaItem>
          <h4>⏱️ Duration</h4>
          <p>{formatDuration(conversationDetails.started_at, conversationDetails.ended_at)}</p>
        </MetaItem>
        
        <MetaItem>
          <h4>💬 Total Messages</h4>
          <p>{conversationDetails.total_messages} exchanges</p>
        </MetaItem>
        
        <MetaItem>
          <h4>🔑 Session ID</h4>
          <p style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {conversationDetails.session_id}
          </p>
        </MetaItem>
      </SessionMeta>

      {conversationDetails.summary && (
        <SummarySection>
          <SummaryTitle>
            📋 Medical Summary
          </SummaryTitle>
          <SummaryGrid>
            <SummaryItem>
              <h4>🩺 Patient Concerns</h4>
              <p>{conversationDetails.summary.patient_concerns}</p>
            </SummaryItem>
            
            <SummaryItem>
              <h4>⚕️ Medical Actions</h4>
              <p>{conversationDetails.summary.medical_actions}</p>
            </SummaryItem>
            
            <SummaryItem>
              <h4>📅 Follow-up Required</h4>
              <p>{conversationDetails.summary.follow_up_required ? 'Yes' : 'No'}</p>
            </SummaryItem>
            
            {conversationDetails.summary.additional_notes && (
              <SummaryItem>
                <h4>📝 Additional Notes</h4>
                <p>{conversationDetails.summary.additional_notes}</p>
              </SummaryItem>
            )}
          </SummaryGrid>
        </SummarySection>
      )}

      <TranscriptSection>
        <TranscriptTitle>
          🗣️ Full Conversation Transcript
        </TranscriptTitle>
        
        {conversationDetails.messages && conversationDetails.messages.length > 0 ? (
          <TranscriptList>
            {conversationDetails.messages.map((message: any, index: number) => (
              <div key={index} style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '15px',
                borderRadius: '10px',
                borderLeft: `4px solid ${
                  message.message_type === 'user' ? theme.colors.warning : theme.colors.secondary
                }`
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{
                    color: message.message_type === 'user' ? theme.colors.warning : theme.colors.secondary,
                    fontWeight: 'bold',
                    fontSize: '0.9rem'
                  }}>
                    {message.message_type === 'user' ? '🗣️ Speaker' : '🔄 Translation'}
                  </span>
                  <span style={{
                    color: theme.colors.text,
                    opacity: 0.7,
                    fontSize: '0.8rem'
                  }}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p style={{
                  color: theme.colors.text,
                  margin: 0,
                  lineHeight: 1.5
                }}>
                  {message.content}
                </p>
              </div>
            ))}
          </TranscriptList>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: theme.colors.text,
            opacity: 0.7
          }}>
            No transcript available for this session
          </div>
        )}
      </TranscriptSection>

      <Container style={{
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h4 style={{ color: theme.colors.primary, marginBottom: '15px' }}>
          💡 Medical Interpretation Features
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          textAlign: 'left'
        }}>
          <div>
            <strong style={{ color: theme.colors.secondary }}>🌐 Real-time Translation</strong>
            <br />
            <small style={{ color: theme.colors.text, opacity: 0.8 }}>
              Instant English ↔ Spanish interpretation
            </small>
          </div>
          <div>
            <strong style={{ color: theme.colors.secondary }}>🧪 Medical Actions</strong>
            <br />
            <small style={{ color: theme.colors.text, opacity: 0.8 }}>
              Lab orders and appointment scheduling
            </small>
          </div>
          <div>
            <strong style={{ color: theme.colors.secondary }}>📋 Auto-Summary</strong>
            <br />
            <small style={{ color: theme.colors.text, opacity: 0.8 }}>
              AI-generated medical summaries
            </small>
          </div>
          <div>
            <strong style={{ color: theme.colors.secondary }}>🔐 HIPAA Compliant</strong>
            <br />
            <small style={{ color: theme.colors.text, opacity: 0.8 }}>
              Secure medical data storage
            </small>
          </div>
        </div>
      </Container>
    </DetailPageContainer>
  );
};

export default ConversationDetailPage; 