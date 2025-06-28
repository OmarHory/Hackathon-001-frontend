import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { theme } from '../../utils/theme';

interface MobileAudioHandlerProps {
  onUserInteraction?: () => void;
}

const MobilePrompt = styled.div<{ show: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: ${props => props.show ? 'flex' : 'none'};
  justify-content: center;
  align-items: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
`;

const PromptCard = styled.div`
  background: ${theme.colors.surface};
  border-radius: 20px;
  padding: 30px;
  margin: 20px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const PromptIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 20px;
`;

const PromptTitle = styled.h2`
  color: ${theme.colors.primary};
  margin-bottom: 15px;
  font-size: 1.5rem;
`;

const PromptText = styled.p`
  color: ${theme.colors.text};
  margin-bottom: 25px;
  line-height: 1.5;
  font-size: 1rem;
`;

const EnableButton = styled.button`
  background: ${theme.colors.primary};
  color: white;
  border: none;
  border-radius: 12px;
  padding: 15px 30px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  
  &:hover {
    background: ${theme.colors.secondary};
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const MobileAudioHandler: React.FC<MobileAudioHandlerProps> = ({ onUserInteraction }) => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if we're on mobile and need user interaction
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isMobile || isIOS) {
      // Check if AudioContext is suspended (requires user interaction)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const testContext = new AudioContextClass();
        if (testContext.state === 'suspended') {
          setShowPrompt(true);
        }
        testContext.close();
      }
    }
  }, []);

  const handleEnableAudio = async () => {
    try {
      // Create AudioContext and resume it
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioContext = new AudioContextClass();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        audioContext.close();
      }

      // Create a dummy audio element to unlock autoplay
      const audio = document.createElement('audio');
      audio.muted = true;
      audio.autoplay = true;
      audio.preload = 'metadata';
      
      // Set a simple data URL for silence
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAAABAAAEAAAAAEAAQAAgD0AAIA9AAABAAgAZGF0YQQAAAA=';
      
      try {
        await audio.play();
        audio.remove();
      } catch (error) {
        // Ignore autoplay errors
      }

      setShowPrompt(false);
      onUserInteraction?.();
    } catch (error) {
      console.warn('Failed to enable audio:', error);
      setShowPrompt(false);
    }
  };

  return (
    <MobilePrompt show={showPrompt}>
      <PromptCard>
        <PromptIcon>🎵</PromptIcon>
        <PromptTitle>Enable Audio</PromptTitle>
        <PromptText>
          To use voice interpretation on mobile devices, we need to enable audio playback. 
          This is required for the medical interpreter to speak translations.
        </PromptText>
        <EnableButton onClick={handleEnableAudio}>
          Enable Audio & Continue
        </EnableButton>
      </PromptCard>
    </MobilePrompt>
  );
};

export default MobileAudioHandler; 