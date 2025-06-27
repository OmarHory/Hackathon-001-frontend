import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IntentState, IntentType } from '../../types';

const initialState: IntentState = {
  currentIntent: 'translation',
  icon: '🌐',
  label: 'Translation',
  isVisible: false,
};

const intentSlice = createSlice({
  name: 'intent',
  initialState,
  reducers: {
    detectIntent: (state, action: PayloadAction<string>) => {
      const text = action.payload.toLowerCase().trim();
      let newIntent: IntentType = 'translation';
      let icon = '🌐';
      let label = 'Translation';

      // Lab order keywords
      const labKeywords = [
        'send lab order', 'order tests', 'get labs', 'blood work', 
        'run tests', 'lab tests', 'blood tests', 'urine test', 
        'x-ray', 'scan'
      ];
      
      // Appointment keywords
      const appointmentKeywords = [
        'schedule follow-up', 'next appointment', 'come back in', 
        'see you again', 'follow up', 'schedule appointment', 
        'book appointment'
      ];

      const hasLabIntent = labKeywords.some(keyword => text.includes(keyword));
      const hasAppointmentIntent = appointmentKeywords.some(keyword => text.includes(keyword));

      if (hasLabIntent) {
        newIntent = 'lab-order';
        icon = '🧪';
        label = 'Send Lab Order';
      } else if (hasAppointmentIntent) {
        newIntent = 'appointment';
        icon = '📅';
        label = 'Schedule Follow-up';
      }

      // Update intent if changed
      if (newIntent !== state.currentIntent) {
        state.currentIntent = newIntent;
        state.icon = icon;
        state.label = label;
      }
    },
    updateIntent: (state, action: PayloadAction<{
      intent: IntentType;
      icon: string;
      label: string;
    }>) => {
      state.currentIntent = action.payload.intent;
      state.icon = action.payload.icon;
      state.label = action.payload.label;
    },
    showIntent: (state) => {
      state.isVisible = true;
    },
    hideIntent: (state) => {
      state.isVisible = false;
    },
    resetIntent: (state) => {
      state.currentIntent = 'translation';
      state.icon = '🌐';
      state.label = 'Translation';
      state.isVisible = false;
    },
  },
});

export const {
  detectIntent,
  updateIntent,
  showIntent,
  hideIntent,
  resetIntent,
} = intentSlice.actions;

export default intentSlice.reducer; 