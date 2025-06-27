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
  async ({ sessionId, messageType, content }: { 
    sessionId: string; 
    messageType: 'user' | 'assistant' | 'system'; 
    content: string 
  }) => {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/conversations/${sessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_type: messageType,
        content: content
      })
    });
    if (!response.ok) {
      throw new Error('Failed to save message');
    }
    return await response.json();
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
    addTranslationPair: (state, action: PayloadAction<Omit<TranslationPair, 'id'>>) => {
      const newPair: TranslationPair = {
        ...action.payload,
        id: Date.now().toString(),
      };
      state.translationPairs.unshift(newPair); // Add to beginning for latest first
    },
    updateTranslationPair: (state, action: PayloadAction<{ id: string; translatedText: string }>) => {
      const pair = state.translationPairs.find(p => p.id === action.payload.id);
      if (pair) {
        pair.translatedText = action.payload.translatedText;
        pair.isComplete = true;
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