import React from 'react';
import PageLayout from '../components/layout/PageLayout';
import Container from '../components/ui/Container';
import Button from '../components/ui/Button';

const HistoryPage: React.FC = () => {
  return (
    <PageLayout 
      title="📜 Interpretation History"
      showNavigation={true}
    >
      <Container>
        <h2 style={{ color: '#FFD700', textAlign: 'center', marginBottom: '20px' }}>
          Recent Medical Interpretation Sessions
        </h2>
        
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Button variant="secondary">
            🔄 Refresh History
          </Button>
        </div>

        <div>
          <p style={{ textAlign: 'center', color: '#E0E0E0' }}>
            No medical interpretation sessions found yet. 
            <br />
            Start a medical interpretation session to see your history here!
          </p>
        </div>

        <div
          style={{
            marginTop: '30px',
            padding: '15px',
            background: 'rgba(255, 215, 0, 0.2)',
            borderRadius: '10px',
            border: '2px solid #FFD700',
            textAlign: 'center',
          }}
        >
          <strong>💡 Pro Tip:</strong>
          <br />
          All your medical interpretation sessions are automatically saved and can be reviewed here.
          Each session includes the full conversation transcript and medical summary.
        </div>
      </Container>
    </PageLayout>
  );
};

export default HistoryPage; 