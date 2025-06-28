# Medical Interpreter Frontend

A real-time medical interpretation application built for a hackathon that enables seamless communication between English-speaking clinicians and Spanish-speaking patients using OpenAI's Realtime API.

## 🎯 Hackathon Project Overview

**Problem**: Non-English speaking patients struggle to communicate with clinicians who cannot speak the patients' language, requiring expensive in-person or virtual interpreters.

**Solution**: A web-based Language Interpreter agent for in-person visits that provides real-time speech-to-speech translation with medical action detection and conversation summarization.

## ✨ Features

### Core Translation Features
- 🗣️ **Real-time Speech Translation**: English ↔ Spanish interpretation using OpenAI Realtime API
- 🎤 **Voice Input/Output**: Natural speech input with text-to-speech responses
- 🔄 **Repeat Function**: Patients can say "repeat that" / "repite eso" to hear the last translation again
- 🎨 **Live Translation Display**: Visual streaming of translations as they're being generated

### Medical-Specific Features
- 🧪 **Lab Order Detection**: Automatically detects and executes lab order requests
- 📅 **Appointment Scheduling**: Identifies and processes follow-up appointment requests
- 📋 **Medical Summaries**: AI-generated conversation summaries with key points and action items
- 🎯 **Intent Recognition**: Visual indicators for detected medical actions

### Data Management
- 💾 **Conversation Storage**: Full conversation persistence in database
- 📚 **Session History**: Browse and review past interpretation sessions
- 🔍 **Detailed Conversation View**: Complete transcripts with medical summaries
- ⚡ **Real-time Updates**: Live status indicators and connection monitoring

## 🏗️ Frontend Architecture

### State Management Layer
```
Redux Store (src/store/)
├── voiceSlice.ts       # WebRTC connection, audio state, translation status
├── conversationSlice.ts # Sessions, messages, summaries, API interactions
├── intentSlice.ts      # Medical action detection, lab orders, appointments
└── uiSlice.ts         # Tab navigation, modal states, loading indicators
```

### Component Architecture
```
Pages (src/pages/)
├── InterpreterPage.tsx     # Main interpretation interface
├── HistoryPage.tsx         # Past conversation browser
└── ConversationDetailPage.tsx # Detailed conversation view

Layout Components (src/components/layout/)
├── Navigation.tsx          # Tab navigation with session status
└── PageLayout.tsx         # Responsive container wrapper

UI Components (src/components/ui/)
├── Button.tsx             # Session control buttons
├── IntentIndicator.tsx    # Medical action visual feedback
├── Status.tsx             # Connection and error status display
└── Container.tsx          # Layout containers

Conversation Components (src/components/conversation/)
└── TranslationPair.tsx    # Bilingual conversation bubbles with streaming
```

### Services Layer
```
Services (src/services/)
├── webrtcService.ts           # OpenAI Realtime API WebRTC integration
├── apiService.ts              # REST API for data persistence
└── errorHandlingService.ts    # Error recovery and user feedback
```

### Custom Hooks
```
Hooks (src/hooks/)
├── useVoiceConversation.ts    # Core translation logic and event handling
└── redux.ts                   # Typed Redux hooks
```

## 🛠️ Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **State Management**: Redux Toolkit
- **Routing**: React Router v6
- **Real-time Communication**: WebRTC + OpenAI Realtime API
- **Styling**: CSS-in-JS with styled-components
- **Build Tool**: Create React App
- **Type Safety**: TypeScript with strict mode

## 📦 Installation & Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Modern browser with WebRTC support

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd medical-interpreter-frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration:
# REACT_APP_API_URL=http://localhost:8000
```

### Development
```bash
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## 🚀 Usage Guide

### Starting an Interpretation Session
1. Click "Start Medical Interpretation" button
2. Allow microphone access when prompted
3. Wait for "Ready for medical interpretation..." status
4. Begin speaking in English or Spanish

### Available Voice Commands
- **Translation**: Speak naturally in English or Spanish
- **Repeat**: Say "repeat that" or "repite eso" to repeat last translation
- **Lab Orders**: Say "send lab order", "order tests", "blood work"
- **Appointments**: Say "schedule follow-up", "next appointment"

### Medical Actions
When medical actions are detected:
- 🧪 **Lab Order**: System automatically processes and confirms
- 📅 **Appointment**: System schedules and provides confirmation
- ✅ **Confirmation**: AI responds with simple "Done" acknowledgment

### Session Management
- **End Session**: Click "End Medical Interpretation"
- **View History**: Navigate to "History" tab
- **Review Details**: Click any past session for full transcript and summary

## 🔧 Key Components Explained

### `useVoiceConversation` Hook
The core hook managing the entire interpretation flow:
- **WebRTC Connection**: Establishes secure connection to OpenAI
- **Event Handling**: Processes real-time audio and transcript events
- **Translation Logic**: Coordinates speech recognition and translation
- **Medical Actions**: Detects and executes healthcare-specific functions
- **Error Recovery**: Multi-layer fallback system for robust operation

### `webrtcService`
Handles low-level WebRTC communication:
- **Peer Connection**: Manages RTCPeerConnection with OpenAI
- **Data Channel**: Bidirectional event communication
- **Audio Stream**: Microphone capture and speaker output
- **Session Config**: OpenAI Realtime API configuration

### `TranslationPair` Component
Displays bilingual conversation bubbles:
- **Streaming Animation**: Real-time text appearance with visual feedback
- **Language Detection**: Automatic English/Spanish identification
- **Visual States**: Loading, streaming, and completed states
- **Responsive Design**: Mobile-friendly conversation layout

### Redux State Structure
```typescript
// Voice State
{
  connection: { sessionId, isConnected, connectionState },
  voiceState: { status, isListening, isError, errorMessage },
  lastTranslation: string,
  pendingUserMessage: boolean
}

// Conversation State
{
  currentSession: Session,
  translationPairs: TranslationPair[],
  conversations: Session[],
  conversationDetails: ConversationDetails
}

// Intent State
{
  currentIntent: 'translation' | 'lab-order' | 'appointment',
  isVisible: boolean,
  icon: string,
  label: string
}
```

## 🔄 Data Flow

### Translation Flow
1. **User Speech** → Microphone capture
2. **WebRTC** → Audio stream to OpenAI
3. **OpenAI Processing** → Speech recognition + translation
4. **Event Stream** → Real-time transcript deltas
5. **Redux Update** → State management
6. **UI Render** → Visual translation display
7. **TTS Output** → Spoken response

### Medical Action Flow
1. **Intent Detection** → Speech analysis for medical keywords
2. **Function Call** → OpenAI tool execution
3. **Backend API** → Webhook to external systems
4. **Confirmation** → Simple "Done" response
5. **Database Storage** → Action logging and persistence

## 🎨 UI/UX Design

### Design Principles
- **Medical Professional**: Clean, clinical interface design
- **Accessibility**: High contrast, clear typography, screen reader support
- **Real-time Feedback**: Immediate visual feedback for all actions
- **Error Resilience**: Graceful error handling with clear user guidance

### Color Scheme
- **Primary**: Purple gradient for medical professionalism
- **Success**: Green for completed actions
- **Warning**: Yellow for attention states
- **Error**: Red for critical issues
- **Neutral**: Gray scale for content hierarchy

### Responsive Breakpoints
- **Mobile**: 320px - 768px (Touch-optimized controls)
- **Tablet**: 768px - 1024px (Medium layout)
- **Desktop**: 1024px+ (Full feature set)

## 🧪 Testing Strategy

### Unit Testing
- Component rendering tests
- Hook behavior validation
- Service function testing
- Redux state mutations

### Integration Testing
- WebRTC connection flows
- OpenAI event handling
- API service integration
- Error recovery scenarios

### Manual Testing
- Browser compatibility (Chrome, Firefox, Safari, Edge)
- Microphone permissions and audio quality
- Translation accuracy and timing
- Medical action detection reliability

## 🔒 Security Considerations

- **Microphone Privacy**: Explicit user consent for audio access
- **Session Isolation**: Unique session IDs for conversation separation
- **API Security**: Environment variable configuration for sensitive data
- **CORS Protection**: Proper cross-origin resource sharing setup

## 📈 Performance Optimizations

- **React.memo**: Optimized component re-rendering
- **useCallback**: Memoized event handlers
- **Code Splitting**: Lazy loading for route components
- **Bundle Analysis**: Webpack bundle optimization
- **Real-time Efficiency**: Minimal DOM updates during streaming

## 🐛 Troubleshooting

### Common Issues
1. **Microphone Access Denied**: Check browser permissions
2. **Connection Failed**: Verify backend API availability
3. **Translation Stuck**: Check console for OpenAI event logs
4. **Audio Not Playing**: Verify speaker/headphone connection

### Debug Features
- Comprehensive console logging for all events
- Redux DevTools integration
- Network request monitoring
- WebRTC connection state tracking

## 🚀 Deployment

### Production Build
```bash
npm run build
# Generates optimized build in /build directory
```

### Environment Configuration
```env
REACT_APP_API_URL=https://your-backend-api.com
REACT_APP_ENVIRONMENT=production
```

### Hosting Options
- **Vercel**: Automatic deployments with GitHub integration
- **Netlify**: Static site hosting with form handling
- **AWS S3**: CloudFront CDN distribution
- **Google Cloud Storage**: Global content delivery

## 📋 Hackathon Requirements Checklist

✅ **ReactJS with principled architecture**
- Component composition and reusability
- Proper separation of concerns
- TypeScript for type safety

✅ **State management solution (Redux)**
- Centralized state with Redux Toolkit
- Typed actions and selectors
- Immutable state updates

✅ **React Router navigation**
- Multiple pages with routing
- Protected routes and navigation guards
- URL-based state management

✅ **OpenAI Realtime API integration**
- WebRTC connection for low latency
- Real-time speech processing
- Event-driven architecture

✅ **Text-to-speech output**
- Natural voice synthesis
- Multi-language support (English/Spanish)
- Audio quality optimization

✅ **Bilingual conversation display**
- Real-time translation streaming
- Visual language indicators
- Conversation history preservation

✅ **Medical action detection**
- Lab order processing
- Appointment scheduling
- Intent recognition system

✅ **Tool execution via webhooks**
- External system integration
- Function call handling
- Action confirmation feedback

✅ **Database integration**
- Conversation persistence
- Session management
- Medical summary storage

---

## 👥 Contributing

This project was built for a hackathon demonstration. For production use, consider:
- Enhanced security measures
- HIPAA compliance for medical data
- Advanced error handling
- Comprehensive testing suite
- Performance monitoring
- Accessibility compliance

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ for better healthcare communication**