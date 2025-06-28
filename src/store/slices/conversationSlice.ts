import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Session, Message, ConversationDetails, ConversationSummary, TranslationPair } from '../../types';

interface ConversationState {
  currentSession: Session | null;
  sessions: Session[];
  currentMessages: Message[];
  translationPairs: TranslationPair[];
  conversationHistory: Session[];
  selectedConversation: ConversationDetails | null;
  loading: boolean;
  error: string | null;
}

const initialState: ConversationState = {
  currentSession: null,
  sessions: [],
  currentMessages: [],
  translationPairs: [],
  conversationHistory: [],
  selectedConversation: null,
  loading: false,
  error: null,
};

// Async thunks for API calls
export const fetchConversations = createAsyncThunk(
  'conversation/fetchConversations',
  async (limit: number = 10) => {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/conversations?limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch conversations');
    }
    return await response.json();
  }
);

export const fetchConversationDetails = createAsyncThunk(
  'conversation/fetchConversationDetails',
  async (sessionId: string) => {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/conversations/${sessionId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch conversation details');
    }
    return await response.json();
  }
);

export const saveMessage = createAsyncThunk(
  'conversation/saveMessage',
  async ({ 
    sessionId, 
    messageType, 
    content, 
    audioDuration, 
    confidenceScore 
  }: { 
    sessionId: string; 
    messageType: 'user' | 'assistant' | 'system'; 
    content: string;
    audioDuration?: number;
    confidenceScore?: number;
  }) => {
    const requestBody: any = {
      message_type: messageType,
      content: content
    };
    
    // Add optional fields if provided (as per API doc)
    if (audioDuration !== undefined) {
      requestBody.audio_duration = audioDuration;
    }
    if (confidenceScore !== undefined) {
      requestBody.confidence_score = confidenceScore;
    }
    
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const fullUrl = `${apiUrl}/conversations/${sessionId}/messages`;
    
    console.log('🌐 Making API request to save message:', {
      url: fullUrl,
      method: 'POST',
      body: requestBody
    });
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📡 Save message API response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Save message API error:', errorText);
      throw new Error(`Failed to save message: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Message saved successfully to database:', result);
    return result;
  }
);

export const endSession = createAsyncThunk(
  'conversation/endSession',
  async (sessionId: string) => {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/conversations/${sessionId}/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error('Failed to end session');
    }
    return await response.json();
  }
);

export const generateSummary = createAsyncThunk(
  'conversation/generateSummary',
  async (sessionId: string) => {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/conversations/${sessionId}/medical-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error('Failed to generate summary');
    }
    return await response.json();
  }
);

const conversationSlice = createSlice({
  name: 'conversation',
  initialState,
  reducers: {
    setCurrentSession: (state, action: PayloadAction<Session>) => {
      state.currentSession = action.payload;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.currentMessages.push(action.payload);
    },
    addTranslationPair: (state, action: PayloadAction<TranslationPair>) => {
      state.translationPairs.unshift(action.payload); // Add to beginning for latest first
    },
    updateTranslationPair: (state, action: PayloadAction<{ id: string; translatedText: string; isComplete?: boolean }>) => {
      const pair = state.translationPairs.find(p => p.id === action.payload.id);
      if (pair) {
        pair.translatedText = action.payload.translatedText;
        if (action.payload.isComplete !== undefined) {
          pair.isComplete = action.payload.isComplete;
        }
        console.log('📝 Updated translation pair:', pair.id, 'complete:', pair.isComplete, 'text:', pair.translatedText.slice(0, 30) + '...');
      } else {
        console.warn('⚠️ Translation pair not found for ID:', action.payload.id);
      }
    },
    clearCurrentSession: (state) => {
      state.currentSession = null;
      state.currentMessages = [];
      state.translationPairs = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch conversations
      .addCase(fetchConversations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading = false;
        state.conversationHistory = action.payload.conversations;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch conversations';
      })
      // Fetch conversation details
      .addCase(fetchConversationDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConversationDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedConversation = action.payload;
      })
      .addCase(fetchConversationDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch conversation details';
      })
      // Save message
      .addCase(saveMessage.fulfilled, (state, action) => {
        // Message saved successfully, could update state if needed
      })
      .addCase(saveMessage.rejected, (state, action) => {
        console.error('Failed to save message:', action.error.message);
      })
      // End session
      .addCase(endSession.fulfilled, (state, action) => {
        if (state.currentSession?.session_id === action.payload.session.session_id) {
          state.currentSession = { ...action.payload.session };
        }
      })
      .addCase(endSession.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to end session';
      })
      // Generate summary
      .addCase(generateSummary.fulfilled, (state, action) => {
        if (state.selectedConversation) {
          state.selectedConversation.summary = action.payload.summary;
        }
      })
      .addCase(generateSummary.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to generate summary';
      });
  },
});

export const {
  setCurrentSession,
  addMessage,
  addTranslationPair,
  updateTranslationPair,
  clearCurrentSession,
  clearError,
} = conversationSlice.actions;

export default conversationSlice.reducer; 