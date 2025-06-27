import React from 'react';
import { useParams } from 'react-router-dom';

const ConversationDetailPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();

  return (
    <div>
      <h1>📖 Conversation Details</h1>
      <p>Session ID: {sessionId}</p>
      <p>Conversation detail page coming soon...</p>
    </div>
  );
};

export default ConversationDetailPage; 