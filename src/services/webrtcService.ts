import { WebRTCConnection, RealtimeEvent } from '../types';
import { webrtcAPI } from './apiService';

// Mobile and browser detection utilities
const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

const isSafari = (): boolean => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

// Check if HTTPS is required and available
const checkHTTPS = (): { isSecure: boolean; requiresHTTPS: boolean } => {
  const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const requiresHTTPS = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  return { isSecure, requiresHTTPS };
};

export class WebRTCService {
  private connection: WebRTCConnection = {
    peerConnection: null,
    dataChannel: null,
    localStream: null,
    sessionId: null,
  };

  private onEventCallback?: (event: RealtimeEvent) => void;
  private onConnectionStateChangeCallback?: (state: RTCPeerConnectionState) => void;
  private audioContext?: AudioContext;
  private permissionState: 'prompt' | 'granted' | 'denied' = 'prompt';

  async startConnection(): Promise<WebRTCConnection> {
    try {
      console.log('🚀 Starting WebRTC connection...');
      console.log('📱 Mobile device:', isMobile());
      console.log('🍎 iOS device:', isIOS());
      console.log('🌐 Safari browser:', isSafari());

      // Step 0: Check HTTPS requirements
      const httpsCheck = checkHTTPS();
      if (httpsCheck.requiresHTTPS && !httpsCheck.isSecure) {
        throw new Error('HTTPS is required for microphone access. Please use https:// instead of http://');
      }
      console.log('🔒 HTTPS check passed');

      // Step 1: Check browser compatibility
      await this.checkBrowserCompatibility();
      console.log('✅ Browser compatibility check passed');

      // Step 2: Check/request permissions proactively
      await this.checkMicrophonePermissions();
      console.log('✅ Microphone permissions check passed');

      // Step 3: Get microphone access with mobile-specific handling
      console.log('🎤 Requesting microphone access...');
      this.connection.localStream = await this.getMicrophoneStream();
      console.log('✅ Got microphone access');

      // Step 4: Create WebRTC peer connection with multiple ICE servers
      this.connection.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' },
          // Add TURN servers for corporate networks (you'll need to configure these)
          // { urls: 'turn:your-turn-server.com:3478', username: 'user', credential: 'pass' },
        ]
      });
      console.log('✅ Created peer connection with multiple ICE servers');

      // Step 5: Add microphone track
      const audioTracks = this.connection.localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        this.connection.peerConnection.addTrack(audioTracks[0], this.connection.localStream);
        console.log('✅ Added audio track');
      }

      // Step 6: Create data channel for events
      this.connection.dataChannel = this.connection.peerConnection.createDataChannel('oai-events');
      this.setupDataChannel();
      console.log('✅ Created data channel');

      // Step 7: Handle connection state changes
      this.connection.peerConnection.onconnectionstatechange = () => {
        const state = this.connection.peerConnection!.connectionState;
        console.log('🔗 Connection state:', state);
        if (this.onConnectionStateChangeCallback) {
          this.onConnectionStateChangeCallback(state);
        }
      };

      // Step 8: Handle incoming audio tracks (for OpenAI voice response)
      this.connection.peerConnection.ontrack = (event) => {
        console.log('🔊 Received audio track from OpenAI');
        this.createAudioElement(event.streams[0]);
      };

      // Step 9: Set local description (create offer)
      await this.connection.peerConnection.setLocalDescription();
      console.log('✅ Set local description');

      // Step 10: Wait for ICE gathering to complete
      await this.waitForICEGathering();
      console.log('✅ ICE gathering complete');

      // Step 11: Send offer to backend using API service
      const rtcResult = await webrtcAPI.connect(this.connection.peerConnection.localDescription!.sdp);
      
      this.connection.sessionId = rtcResult.sessionId;
      const answerSdp = rtcResult.sdpAnswer;

      if (!answerSdp || answerSdp.length < 50) {
        throw new Error('Invalid SDP answer received from server');
      }

      // Step 12: Set remote description
      await this.connection.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp
      });
      console.log('✅ Set remote description');

      // Step 13: Wait for connection to be established
      await this.waitForConnectionState('connected');
      console.log('✅ WebRTC connection established!');

      return this.connection;
    } catch (error) {
      console.error('❌ WebRTC connection failed:', error);
      this.cleanup();
      throw error;
    }
  }

  private setupDataChannel(): void {
    if (!this.connection.dataChannel) return;

    this.connection.dataChannel.addEventListener('open', () => {
      console.log('🔗 Data channel opened - configuring session...');
      this.configureSession();
    });

    this.connection.dataChannel.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 Received OpenAI event:', message.type, message);
        if (this.onEventCallback) {
          this.onEventCallback(message);
        }
      } catch (error) {
        console.error('❌ Error parsing OpenAI message:', error);
      }
    });

    this.connection.dataChannel.addEventListener('close', () => {
      console.log('🔒 Data channel closed');
    });

    this.connection.dataChannel.addEventListener('error', (error) => {
      console.error('❌ Data channel error:', error);
    });
  }

  private configureSession(): void {
    if (!this.connection.dataChannel || this.connection.dataChannel.readyState !== 'open') {
      console.log('⚠️ Data channel not ready for session configuration');
      return;
    }

    console.log('⚙️ Configuring OpenAI Realtime session...');

    const sessionConfig = {
      type: "session.update",
      session: {
        instructions: `STARTUP BEHAVIOR:
- DO NOT provide any initial greeting or introduction
- START SILENT and wait for someone to speak first
- Only respond when someone actually says something

PRIORITY 1 - MEDICAL ACTIONS (CHECK FIRST):
If you hear ANY of these phrases, STOP and call the function immediately:
- "send lab order", "order tests", "get labs", "blood work", "run tests" → call send_lab_order with tests_ordered: ["general lab work"]
- "schedule follow-up", "next appointment", "come back in", "see you again" → call schedule_followup_appointment

DO NOT TRANSLATE THESE - EXECUTE THE FUNCTION IMMEDIATELY!

AFTER FUNCTION EXECUTION - CRITICAL INSTRUCTIONS:
- Say EXACTLY the word "Done" - NOTHING ELSE
- Do NOT say "Done. The lab order has been sent successfully"
- Do NOT say "Terminado" or any Spanish
- Do NOT provide explanations, confirmations, or details
- Just the single English word "Done" and then STOP talking
- NEVER translate or explain medical actions

PRIORITY 2 - SPECIAL COMMANDS:
- "repeat that", "repeat", "say again" or "repite eso", "repite", "otra vez" → repeat the last translation exactly

PRIORITY 3 - TRANSLATION (only if no medical action detected):
- If someone speaks in English → translate to Spanish
- If someone speaks in Spanish → translate to English
- Use accurate medical terminology

You are a medical assistant that executes actions first, then translates. NEVER speak first - always wait for input.`,
        voice: "alloy",
        input_audio_transcription: {
          model: "whisper-1"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true
        },
        temperature: 0.8,
        tools: [
          {
            type: "function",
            name: "schedule_followup_appointment",
            description: "CALL THIS when anyone mentions scheduling, follow-up, next appointment, or coming back.",
            parameters: {
              type: "object",
              properties: {
                appointment_type: { 
                  type: "string", 
                  description: "Type of appointment needed" 
                },
                timeframe: { 
                  type: "string", 
                  description: "When should the appointment be scheduled" 
                }
              },
              required: ["appointment_type", "timeframe"]
            }
          },
          {
            type: "function",
            name: "send_lab_order",
            description: "CALL THIS immediately when anyone says 'send lab order', 'order tests', 'get labs', 'blood work', 'run tests'.",
            parameters: {
              type: "object",
              properties: {
                tests_ordered: { 
                  type: "array", 
                  items: { type: "string" }, 
                  description: "List of tests to order" 
                }
              },
              required: ["tests_ordered"]
            }
          }
        ],
        tool_choice: "auto"
      }
    };

    console.log('📤 Sending session configuration with function priority:');
    console.log('   Tools configured:', sessionConfig.session.tools.map(t => t.name));
    console.log('   Tool choice:', sessionConfig.session.tool_choice);
    console.log('   Functions:', sessionConfig.session.tools.map(t => `${t.name}: ${t.description}`));
    
    this.connection.dataChannel.send(JSON.stringify(sessionConfig));
    console.log('✅ Session configuration sent to OpenAI');
    
    // Monitor audio input levels
    this.setupAudioMonitoring();
    
    // Send a test message to ensure connection is working
    setTimeout(() => {
      console.log('🧪 Testing connection with greeting...');
      const greetingMessage = {
        type: "response.create",
        response: {
          modalities: ["text", "audio"],
          instructions: "Say 'Medical interpreter ready. Please start speaking.' to confirm the connection is working."
        }
      };
      this.connection.dataChannel?.send(JSON.stringify(greetingMessage));
    }, 2000);
  }

  private setupAudioMonitoring(): void {
    if (!this.connection.localStream) return;
    
    try {
      // Handle AudioContext creation with mobile considerations
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      // iOS/Mobile AudioContext requires user interaction before starting
      if (this.audioContext.state === 'suspended') {
        console.log('🎵 AudioContext suspended - will resume on user interaction');
        
        // Resume AudioContext on user interaction
        const resumeAudio = () => {
          if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
              console.log('🎵 AudioContext resumed after user interaction');
            });
          }
          // Remove listeners after first use
          document.removeEventListener('touchstart', resumeAudio);
          document.removeEventListener('click', resumeAudio);
        };
        
        document.addEventListener('touchstart', resumeAudio, { once: true });
        document.addEventListener('click', resumeAudio, { once: true });
      }
      
      const analyser = this.audioContext.createAnalyser();
      const microphone = this.audioContext.createMediaStreamSource(this.connection.localStream);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      microphone.connect(analyser);
      
      const checkAudioLevel = () => {
        if (this.audioContext?.state === 'running') {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          
          if (average > 10) { // Threshold for audio detection
            console.log('🎤 Audio input detected, level:', Math.round(average));
          }
        }
        
        setTimeout(checkAudioLevel, 1000); // Check every second
      };
      
      checkAudioLevel();
      console.log('🎤 Audio monitoring setup complete');
    } catch (error) {
      console.warn('⚠️ Could not setup audio monitoring:', error);
    }
  }

  private createAudioElement(stream: MediaStream): void {
    // Remove any existing audio element
    const existingAudio = document.getElementById('openai-audio');
    if (existingAudio) {
      existingAudio.remove();
    }

    const audio = document.createElement('audio');
    audio.id = 'openai-audio';
    audio.autoplay = true;
    audio.controls = false;
    audio.style.display = 'none';
    audio.srcObject = stream;
    
    // Mobile-specific audio handling
    if (isMobile()) {
      // Set additional properties for mobile
      audio.muted = false;
      audio.volume = 1.0;
      
      // Handle autoplay policy on mobile
      audio.oncanplay = () => {
        if (audio.paused) {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.warn('⚠️ Audio autoplay failed (mobile policy):', error);
              // Audio will play when user interacts with page
            });
          }
        }
      };
      
      // iOS Safari specific handling
      if (isIOS()) {
        (audio as any).playsInline = true;
        audio.setAttribute('webkit-playsinline', 'true');
        audio.setAttribute('playsinline', 'true');
      }
    }
    
    document.body.appendChild(audio);
    console.log('🔊 Audio element created for OpenAI responses (mobile-optimized)');
    
    // Attempt to play immediately (will be blocked by autoplay policy until user interaction)
    audio.play().catch((error) => {
      console.log('🔇 Audio autoplay blocked - will play after user interaction');
    });
  }

  private async waitForICEGathering(): Promise<void> {
    if (!this.connection.peerConnection) return;

    if (this.connection.peerConnection.iceGatheringState === 'complete') {
      return;
    }

    return new Promise((resolve, reject) => {
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.warn('⚠️ ICE gathering timeout - proceeding with current candidates');
        resolve(); // Don't reject, just proceed with what we have
      }, 5000); // 5 second timeout

      // Also listen for the event-based completion
      const handleICEGatheringChange = () => {
        if (this.connection.peerConnection?.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          this.connection.peerConnection.removeEventListener('icegatheringstatechange', handleICEGatheringChange);
          console.log('✅ ICE gathering completed via event');
          resolve();
        }
      };

      this.connection.peerConnection?.addEventListener('icegatheringstatechange', handleICEGatheringChange);

      // Fallback polling method
      const checkState = () => {
        if (this.connection.peerConnection?.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          this.connection.peerConnection.removeEventListener('icegatheringstatechange', handleICEGatheringChange);
          console.log('✅ ICE gathering completed via polling');
          resolve();
        } else {
          setTimeout(checkState, 100);
        }
      };
      checkState();
    });
  }

  private async waitForConnectionState(targetState: RTCPeerConnectionState): Promise<void> {
    if (!this.connection.peerConnection) return;

    if (this.connection.peerConnection.connectionState === targetState) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Connection timeout. Current state: ${this.connection.peerConnection?.connectionState}`));
      }, 15000); // 15 second timeout

      const handler = () => {
        if (this.connection.peerConnection?.connectionState === targetState) {
          clearTimeout(timeout);
          this.connection.peerConnection.removeEventListener('connectionstatechange', handler);
          resolve();
        }
      };

      this.connection.peerConnection?.addEventListener('connectionstatechange', handler);
    });
  }

  sendMessage(message: any): void {
    if (this.connection.dataChannel && this.connection.dataChannel.readyState === 'open') {
      this.connection.dataChannel.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ Data channel not ready for sending messages');
    }
  }

  onEvent(callback: (event: RealtimeEvent) => void): void {
    this.onEventCallback = callback;
  }

  onConnectionStateChange(callback: (state: RTCPeerConnectionState) => void): void {
    this.onConnectionStateChangeCallback = callback;
  }

  getConnection(): WebRTCConnection {
    return { ...this.connection };
  }

  cleanup(): void {
    console.log('🧹 Cleaning up WebRTC connection...');

    // Close AudioContext
    if (this.audioContext) {
      this.audioContext.close().catch(() => {
        // Ignore close errors
      });
      this.audioContext = undefined;
    }

    // Close data channel
    if (this.connection.dataChannel) {
      this.connection.dataChannel.close();
      this.connection.dataChannel = null;
    }

    // Close peer connection
    if (this.connection.peerConnection) {
      this.connection.peerConnection.close();
      this.connection.peerConnection = null;
    }

    // Stop local stream
    if (this.connection.localStream) {
      this.connection.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.connection.localStream = null;
    }

    // Remove audio element
    const audioElement = document.getElementById('openai-audio');
    if (audioElement) {
      audioElement.remove();
    }

    // Reset permission state
    this.permissionState = 'prompt';

    this.connection.sessionId = null;
    console.log('✅ WebRTC cleanup complete');
  }

  private async checkBrowserCompatibility(): Promise<void> {
    const issues: string[] = [];

    // Check WebRTC support
    if (!window.RTCPeerConnection) {
      issues.push('WebRTC not supported');
    }

    // Check getUserMedia support
    if (!navigator.mediaDevices?.getUserMedia) {
      issues.push('Microphone access not supported');
    }

    // Check AudioContext support (with vendor prefixes)
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      issues.push('Audio processing not supported');
    }

    if (issues.length > 0) {
      throw new Error(`Browser compatibility issues: ${issues.join(', ')}. Please use Chrome, Firefox, Safari, or Edge.`);
    }
  }

  private async checkMicrophonePermissions(): Promise<void> {
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        this.permissionState = permission.state;
        
        console.log('🎤 Microphone permission state:', permission.state);
        
        if (permission.state === 'denied') {
          throw new Error('Microphone access is denied. Please enable microphone permissions in your browser settings and refresh the page.');
        }
        
        // Listen for permission changes
        permission.onchange = () => {
          this.permissionState = permission.state;
          console.log('🎤 Microphone permission changed to:', permission.state);
        };
      } catch (error) {
        console.warn('⚠️ Could not check microphone permissions:', error);
        // Continue anyway - some browsers don't support permission API
      }
    }
  }

  private async getMicrophoneStream(): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        // Enhanced settings for mobile
        ...(isMobile() && {
          sampleRate: 16000, // Lower sample rate for mobile
          channelCount: 1,   // Mono for mobile
        })
      },
      video: false
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Verify we got audio tracks
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks received from microphone');
      }
      
      console.log('🎤 Audio track settings:', audioTracks[0].getSettings());
      return stream;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Microphone access denied. Please click the microphone icon in your browser and select "Allow", then refresh the page.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Microphone is being used by another application. Please close other apps using the microphone and try again.');
        }
      }
      throw error;
    }
  }
}

// Singleton instance
export const webrtcService = new WebRTCService(); 