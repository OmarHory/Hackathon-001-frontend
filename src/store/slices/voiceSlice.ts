import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { VoiceState, RealtimeEvent } from '../../types';

// Serializable connection info for Redux (no RTCPeerConnection objects)
interface SerializableConnection {
  sessionId: string | null;
  isConnected: boolean;
  connectionState: string;
}

interface VoiceSliceState {
  voiceState: VoiceState;
  connection: SerializableConnection;
  lastTranslation: string;
  conversationEnded: boolean;
  pendingUserMessage: boolean;
  messageQueue: Array<{ type: 'delta' | 'final'; content: string }>;
}

const initialState: VoiceSliceState = {
  voiceState: {
    isConnected: false,
    isListening: false,
    currentStatus: 'Ready to start medical interpretation! 🏥',
    isError: false,
    errorMessage: undefined,
  },
  connection: {
    sessionId: null,
    isConnected: false,
    connectionState: 'new',
  },
  lastTranslation: '',
  conversationEnded: false,
  pendingUserMessage: false,
  messageQueue: [],
};

// Async thunk for establishing WebRTC connection
export const startVoiceSession = createAsyncThunk(
  'voice/startVoiceSession',
  async (_, { rejectWithValue }) => {
    try {
      // Get microphone access
      const localStream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });

      // Create WebRTC connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Add microphone track
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        peerConnection.addTrack(audioTracks[0], localStream);
      }

      // Create data channel
      const dataChannel = peerConnection.createDataChannel('oai-events');

      // Set local description
      await peerConnection.setLocalDescription();

      // Wait for ICE gathering
      if (peerConnection.iceGatheringState !== 'complete') {
        await new Promise<void>((resolve) => {
          const checkState = () => {
            if (peerConnection.iceGatheringState === 'complete') {
              resolve();
            } else {
              setTimeout(checkState, 100);
            }
          };
          checkState();
        });
      }

      // Send offer to backend
      const response = await fetch(`${process.env.REACT_APP_API_URL}/rtc-connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: peerConnection.localDescription!.sdp
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      // Get session ID and SDP answer
      const sessionId = response.headers.get('X-Session-ID');
      const answerSdp = await response.text();

      if (!answerSdp || answerSdp.length < 50) {
        throw new Error('Invalid SDP answer received from server');
      }

      // Set remote description
      await peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp
      });

      return {
        sessionId: sessionId || null,
        isConnected: true,
        connectionState: 'connected',
      };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Async thunk for sending function call
export const sendFunctionCall = createAsyncThunk(
  'voice/sendFunctionCall',
  async ({ functionName, args, callId, sessionId }: {
    functionName: string;
    args: any;
    callId: string;
    sessionId: string;
  }) => {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/webhook/function-call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        function_name: functionName,
        arguments: args,
        call_id: callId,
        session_id: sessionId
      })
    });

    if (!response.ok) {
      throw new Error(`Function call failed: ${response.status}`);
    }

    return await response.json();
  }
);

const voiceSlice = createSlice({
  name: 'voice',
  initialState,
  reducers: {
    updateVoiceStatus: (state, action: PayloadAction<{ 
      status: string; 
      isError?: boolean; 
      isListening?: boolean 
    }>) => {
      state.voiceState.currentStatus = action.payload.status;
      state.voiceState.isError = action.payload.isError || false;
      state.voiceState.isListening = action.payload.isListening || false;
      if (action.payload.isError) {
        state.voiceState.errorMessage = action.payload.status;
      } else {
        state.voiceState.errorMessage = undefined;
      }
    },
    setConnection: (state, action: PayloadAction<Partial<SerializableConnection>>) => {
      state.connection = { ...state.connection, ...action.payload };
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.voiceState.isConnected = action.payload;
    },
    setLastTranslation: (state, action: PayloadAction<string>) => {
      state.lastTranslation = action.payload;
    },
    setPendingUserMessage: (state, action: PayloadAction<boolean>) => {
      state.pendingUserMessage = action.payload;
    },
    addToMessageQueue: (state, action: PayloadAction<{ type: 'delta' | 'final'; content: string }>) => {
      state.messageQueue.push(action.payload);
    },
    clearMessageQueue: (state) => {
      state.messageQueue = [];
    },
    setConversationEnded: (state, action: PayloadAction<boolean>) => {
      state.conversationEnded = action.payload;
    },
    resetVoiceState: (state) => {
      // Keep connection objects for cleanup, but reset state
      state.voiceState = {
        isConnected: false,
        isListening: false,
        currentStatus: 'Ready to start medical interpretation! 🏥',
        isError: false,
        errorMessage: undefined,
      };
      state.lastTranslation = '';
      state.conversationEnded = false;
      state.pendingUserMessage = false;
      state.messageQueue = [];
    },
    cleanupConnection: (state) => {
      // Reset connection info (actual WebRTC cleanup handled in service)
      state.connection = {
        sessionId: null,
        isConnected: false,
        connectionState: 'new',
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startVoiceSession.pending, (state) => {
        state.connection.connectionState = 'connecting';
        state.voiceState.currentStatus = '🎙️ Getting microphone access...';
        state.voiceState.isError = false;
      })
      .addCase(startVoiceSession.fulfilled, (state, action) => {
        state.connection = action.payload;
        state.voiceState.currentStatus = '✅ Connected to Medical Interpreter! Start speaking!';
        state.voiceState.isConnected = true;
        state.voiceState.isError = false;
        state.conversationEnded = false;
      })
      .addCase(startVoiceSession.rejected, (state, action) => {
        state.connection.connectionState = 'failed';
        state.voiceState.currentStatus = `❌ Error: ${action.payload}`;
        state.voiceState.isError = true;
        state.voiceState.isConnected = false;
      })
      .addCase(sendFunctionCall.fulfilled, (state, action) => {
        console.log('Function call successful:', action.payload);
      })
      .addCase(sendFunctionCall.rejected, (state, action) => {
        console.error('Function call failed:', action.error.message);
        state.voiceState.currentStatus = `❌ Function call failed: ${action.error.message}`;
        state.voiceState.isError = true;
      });
  },
});

export const {
  updateVoiceStatus,
  setConnection,
  setConnected,
  setLastTranslation,
  setPendingUserMessage,
  addToMessageQueue,
  clearMessageQueue,
  setConversationEnded,
  resetVoiceState,
  cleanupConnection,
} = voiceSlice.actions;

export default voiceSlice.reducer; 