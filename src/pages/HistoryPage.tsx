import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { useNavigate } from 'react-router-dom';
import { theme } from '../utils/theme';
import { fetchConversations } from '../store/slices/conversationSlice';

// Components
import Container from '../components/ui/Container';
import Button from '../components/ui/Button';
import Status from '../components/ui/Status';
import Navigation from '../components/layout/Navigation';
import IntentIndicator from '../components/ui/IntentIndicator';

const HistoryPageContainer = styled.div`
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
`;

const SessionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 30px;
`;

const SessionCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 30px;
  backdrop-filter: blur(10px);
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 4px solid ${theme.colors.secondary};
  
  &:hover {
    transform: translateY(-2px);
    border-left-color: ${theme.colors.warning};
    background: rgba(255, 255, 255, 0.15);
  }
`;

const SessionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
`;

const SessionInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const SessionTitle = styled.h3`
  color: ${theme.colors.warning};
  margin: 0;
  font-size: 1.2rem;
`;

const SessionMeta = styled.div`
  color: ${theme.colors.text};
  opacity: 0.8;
  font-size: 0.9rem;
`;

const SessionSummary = styled.div`
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 8px;
  margin-top: 10px;
  
  h4 {
    color: ${theme.colors.secondary};
    margin: 0 0 10px 0;
    font-size: 1rem;
  }
  
  p {
    color: ${theme.colors.text};
    margin: 0;
    line-height: 1.5;
  }
`;

const SessionActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 15px;
  flex-wrap: wrap;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  
  .icon {
    font-size: 4rem;
    margin-bottom: 20px;
    display: block;
  }
  
  h3 {
    color: ${theme.colors.primary};
    margin-bottom: 15px;
  }
  
  p {
    color: ${theme.colors.text};
    opacity: 0.8;
    line-height: 1.6;
  }
`;

const HistoryPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const sessions = useAppSelector((state) => (state.conversation as any)?.conversationHistory || []);
  const loading = useAppSelector((state) => (state.conversation as any)?.loading || false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    // Fetch sessions when component mounts
    dispatch(fetchConversations(20));
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchConversations(20));
  };

  const toggleSession = (sessionId: string, event: React.MouseEvent) => {
    // Prevent navigation when clicking on toggle
    event.stopPropagation();
    setExpandedSession(expandedSession === sessionId ? null : sessionId);
  };

  const viewConversationDetails = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    navigate(`/conversation/${sessionId}`);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return 'In progress';
    
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const durationMs = end - start;
    const durationMin = Math.round(durationMs / 60000);
    
    return `${durationMin} min${durationMin !== 1 ? 's' : ''}`;
  };

  return (
    <HistoryPageContainer>
      {/* Intent Indicator - Fixed position */}
      <IntentIndicator />
      
      {/* Navigation Tabs */}
      <Navigation />
      
      <HeaderSection>
        <Title>📜 Interpretation History</Title>
      </HeaderSection>

      <Container style={{ marginBottom: '30px', textAlign: 'center' }}>
        <Button 
          variant="secondary" 
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh History'}
        </Button>
      </Container>

      {loading ? (
        <Container style={{ textAlign: 'center' }}>
          <Status message="Loading conversation history..." type="loading" />
        </Container>
      ) : sessions.length > 0 ? (
        <SessionsList>
          {sessions.map((session: any) => (
            <SessionCard key={session.session_id} onClick={() => viewConversationDetails(session.session_id, { stopPropagation: () => {} } as React.MouseEvent)}>
              <SessionHeader>
                <SessionInfo>
                  <SessionTitle>
                    Medical Interpretation Session
                  </SessionTitle>
                  <SessionMeta>
                    📅 {formatDateTime(session.started_at)} • 
                    ⏱️ {formatDuration(session.started_at, session.ended_at)} • 
                    💬 {session.total_messages} messages
                    {session.summary && ' • 📋 Summary available'}
                  </SessionMeta>
                </SessionInfo>
                <div 
                  style={{ 
                    color: theme.colors.warning, 
                    fontSize: '1.5rem',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => toggleSession(session.session_id, e)}
                >
                  {expandedSession === session.session_id ? '▼' : '▶'}
                </div>
              </SessionHeader>
              
              {expandedSession === session.session_id && (
                <>
                  {session.summary && (
                    <SessionSummary>
                      <h4>📋 Medical Summary</h4>
                      <p><strong>Patient Concerns:</strong> {session.summary.patient_concerns}</p>
                      <p><strong>Medical Actions:</strong> {session.summary.medical_actions}</p>
                      <p><strong>Follow-up Required:</strong> {session.summary.follow_up_required ? 'Yes' : 'No'}</p>
                      {session.summary.additional_notes && (
                        <p><strong>Notes:</strong> {session.summary.additional_notes}</p>
                      )}
                    </SessionSummary>
                  )}
                  
                  <SessionActions>
                    <Button 
                      variant="primary" 
                      onClick={() => navigate(`/conversation/${session.session_id}`)}
                    >
                      📋 View Full Details
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => {
                        // Could implement export functionality
                        console.log('Export session:', session.session_id);
                      }}
                    >
                      📄 Export Transcript
                    </Button>
                  </SessionActions>
                  
                  <div style={{ 
                    marginTop: '15px', 
                    textAlign: 'center',
                    color: theme.colors.text,
                    opacity: 0.7,
                    fontSize: '0.9rem'
                  }}>
                    💡 Click session card to view full conversation details
                  </div>
                </>
              )}
            </SessionCard>
          ))}
        </SessionsList>
      ) : (
        <Container>
          <EmptyState>
            <span className="icon">🎤</span>
            <h3>No Medical Interpretation Sessions Yet</h3>
            <p>
              Start a medical interpretation session to see your conversation history here!
              <br />
              All sessions include full transcripts, translations, and medical summaries.
            </p>
          </EmptyState>
        </Container>
      )}

      <Container style={{ 
        marginTop: '30px',
        background: 'rgba(255, 215, 0, 0.2)',
        border: '2px solid #FFD700'
      }}>
        <div style={{ textAlign: 'center' }}>
          <strong>💡 Medical History Features:</strong>
          <div style={{ marginTop: '10px', textAlign: 'left' }}>
            <div style={{ marginBottom: '5px' }}>📋 Automatic medical summaries after each session</div>
            <div style={{ marginBottom: '5px' }}>🔍 Full conversation transcripts with timestamps</div>
            <div style={{ marginBottom: '5px' }}>⚕️ Medical action tracking (lab orders, appointments)</div>
            <div style={{ marginBottom: '5px' }}>🔐 HIPAA-compliant data storage</div>
            <div style={{ marginBottom: '5px' }}>📄 Export capabilities for medical records</div>
          </div>
        </div>
      </Container>
    </HistoryPageContainer>
  );
};

export default HistoryPage; 