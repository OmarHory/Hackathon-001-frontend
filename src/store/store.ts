import { configureStore } from '@reduxjs/toolkit';
import conversationReducer from './slices/conversationSlice';
import voiceReducer from './slices/voiceSlice';
import uiReducer from './slices/uiSlice';
import intentReducer from './slices/intentSlice';

export const store = configureStore({
  reducer: {
    conversation: conversationReducer,
    voice: voiceReducer,
    ui: uiReducer,
    intent: intentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['payload.peerConnection', 'payload.dataChannel', 'payload.localStream'],
        // Ignore these paths in the state
        ignoredPaths: ['voice.connection.peerConnection', 'voice.connection.dataChannel', 'voice.connection.localStream'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 