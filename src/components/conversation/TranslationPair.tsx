import React from 'react';
import { TranslationPair as TranslationPairType } from '../../types';
import { globalStyles } from '../../utils/theme';

interface TranslationPairProps {
  pair: TranslationPairType;
  style?: React.CSSProperties;
}

const TranslationPair: React.FC<TranslationPairProps> = ({ pair, style = {} }) => {
  const isSpanish = pair.originalLang === 'Spanish';
  const originalSide = isSpanish ? 'left' : 'right';
  const translatedSide = isSpanish ? 'right' : 'left';

  return (
    <div
      style={{
        ...globalStyles.translationPair,
        opacity: 1,
        transform: 'translateY(0)',
        ...style,
      }}
    >
      <div
        style={{
          fontSize: '0.9em',
          color: '#E0E0E0',
          marginBottom: '10px',
          textAlign: 'center',
        }}
      >
        Medical Interpretation • {new Date(pair.timestamp).toLocaleTimeString()}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '15px',
          alignItems: 'flex-start',
        }}
        className="flex-container"
      >
        {/* Original Text */}
        <div
          style={{
            ...globalStyles.translationBox,
            order: originalSide === 'left' ? 1 : 2,
          }}
        >
          <div
            style={{
              fontWeight: 'bold',
              color: '#FFD700',
              marginBottom: '5px',
              fontSize: '0.9em',
            }}
          >
            🗣️ Original ({pair.originalLang})
          </div>
          <div
            style={{
              background: 'rgba(255, 215, 0, 0.2)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 215, 0, 0.3)',
            }}
          >
            {pair.originalText}
          </div>
        </div>

        {/* Divider */}
        <div
          className="divider"
          style={{
            width: '2px',
            background: 'linear-gradient(to bottom, #FFD700, #87CEEB)',
            borderRadius: '1px',
            minHeight: '60px',
            order: 2,
            alignSelf: 'stretch',
            marginTop: '25px',
          }}
        />

        {/* Translated Text */}
        <div
          style={{
            ...globalStyles.translationBox,
            order: translatedSide === 'left' ? 1 : 3,
          }}
        >
          <div
            style={{
              fontWeight: 'bold',
              color: '#87CEEB',
              marginBottom: '5px',
              fontSize: '0.9em',
            }}
          >
            🔄 Translation ({pair.translatedLang})
          </div>
          <div
            style={{
              background: 'rgba(135, 206, 235, 0.2)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(135, 206, 235, 0.3)',
              color: pair.translatedText && pair.translatedText.trim() ? (pair.isComplete ? 'white' : '#E0E0E0') : '#B0B0B0',
              fontStyle: pair.isComplete ? 'normal' : 'italic',
            }}
          >
            {pair.translatedText && pair.translatedText.trim() ? pair.translatedText : 'Translating...'}
            {pair.translatedText && pair.translatedText.trim() && !pair.isComplete && (
              <span style={{ 
                marginLeft: '5px', 
                animation: 'blink 1s infinite',
                color: '#87CEEB'
              }}>●</span>
            )}
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0.3; }
          }
          
          @media (max-width: 768px) {
            .flex-container {
              flex-direction: column !important;
              gap: 10px !important;
            }
            .divider {
              display: none !important;
            }
            .translation-box {
              width: 100% !important;
              flex: none !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default TranslationPair; 