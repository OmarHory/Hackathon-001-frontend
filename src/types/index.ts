// Medical Interpreter Types

export interface Session {
  session_id: string;
  title?: string;
  started_at: string;
  ended_at?: string;
  total_messages: number;
  duration_seconds?: number;
  is_active: boolean;
}

export interface Message {
  id: number;
  message_type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  audio_duration?: number;
  confidence_score?: number;
}

export interface ConversationSummary {
  id: number;
  title: string;
  summary_text: string;
  key_points: string[];
  action_items: string[];
  topics: string[];
  sentiment: string;
  created_at: string;
  message_count: number;
}

export interface ConversationDetails {
  session: Session;
  messages: Message[];
  summary?: ConversationSummary;
}

export interface ConversationsResponse {
  conversations: Session[];
}

// WebRTC and Voice Types
export interface VoiceState {
  isConnected: boolean;
  isListening: boolean;
  currentStatus: string;
  isError: boolean;
  errorMessage?: string;
}

export interface WebRTCConnection {
  peerConnection: RTCPeerConnection | null;
  dataChannel: RTCDataChannel | null;
  localStream: MediaStream | null;
  sessionId: string | null;
}

// Medical Action Types
export interface MedicalAction {
  type: 'lab_order' | 'appointment';
  timestamp: string;
  details: any;
}

export interface LabOrder {
  tests_ordered: string[];
}

export interface Appointment {
  appointment_type: string;
  timeframe: string;
}

// Intent Detection
export type IntentType = 'translation' | 'lab-order' | 'appointment';

export interface IntentState {
  currentIntent: IntentType;
  icon: string;
  label: string;
  isVisible: boolean;
}

// OpenAI Realtime API Event Types
export interface RealtimeEvent {
  type: string;
  session?: any;
  transcript?: string;
  error?: {
    message: string;
  };
  name?: string;
  arguments?: string;
  call_id?: string;
  delta?: string;
}

// UI State Types
export interface UIState {
  activeTab: 'interpreter' | 'history';
  modalOpen: boolean;
  modalSessionId: string | null;
  loading: boolean;
}

// Function Call Types
export interface FunctionCall {
  function_name: string;
  arguments: any;
  call_id: string;
  session_id: string;
}

export interface FunctionCallResponse {
  success: boolean;
  result: any;
  call_id: string;
}

// Translation Pair for UI
export interface TranslationPair {
  id: string;
  originalText: string;
  translatedText: string;
  originalLang: 'English' | 'Spanish';
  translatedLang: 'English' | 'Spanish';
  timestamp: string;
  isComplete: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

// Theme and Styling
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    error: string;
    warning: string;
    background: string;
    surface: string;
    text: string;
  };
  gradients: {
    main: string;
    surface: string;
  };
} 