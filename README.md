MEDICAL INTERPRETER FRONTEND ARCHITECTURE
==========================================

┌─────────────────────────────────────────────────────────────────┐
│                         REACT APP ENTRY                        │
│                      (src/index.tsx)                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                    MAIN APP COMPONENT                          │
│                     (src/App.tsx)                              │
│                                                                 │
│  • Global routing setup                                        │
│  • Redux Provider wrapper                                      │
│  • Global CSS themes                                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                  REDUX STORE LAYER                             │
│                  (src/store/)                                  │
│                                                                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ voiceSlice.ts   │ │conversationSlice│ │ intentSlice.ts  │   │
│  │                 │ │     .ts         │ │                 │   │
│  │ • Connection    │ │ • Sessions      │ │ • Lab Orders    │   │
│  │ • Audio State   │ │ • Messages      │ │ • Appointments  │   │
│  │ • Translation   │ │ • Summaries     │ │ • Intent Det.   │   │
│  │ • Status        │ │ • API calls     │ │ • Actions       │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
│                                                                 │
│  ┌─────────────────┐                                           │
│  │   uiSlice.ts    │                                           │
│  │                 │                                           │
│  │ • Active tabs   │                                           │
│  │ • Modal state   │                                           │
│  │ • Loading state │                                           │
│  └─────────────────┘                                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                   ROUTING LAYER                                │
│                 (React Router)                                 │
│                                                                 │
│  /interpreter  ────┐  /history  ──────┐  /conversation/:id ─┐  │
│                    │                  │                     │  │
└────────────────────┼──────────────────┼─────────────────────┼──┘
                     │                  │                     │
         ┌───────────▼──────────┐ ┌─────▼────────┐ ┌─────────▼──────────┐
         │                      │ │              │ │                    │
         │  INTERPRETER PAGE    │ │ HISTORY PAGE │ │ CONVERSATION       │
         │ (InterpreterPage.tsx)│ │(HistoryPage. │ │ DETAIL PAGE        │
         │                      │ │     tsx)     │ │(ConversationDetail │
         │ • Start/Stop Session │ │              │ │      Page.tsx)     │
         │ • Live Translation   │ │ • Past       │ │                    │
         │ • Available Actions  │ │   Sessions   │ │ • Full transcript  │
         │ • Medical Functions  │ │ • Summaries  │ │ • Medical summary  │
         │                      │ │ • Navigation │ │ • Action history   │
         └──────────┬───────────┘ └──────────────┘ └────────────────────┘
                    │
     ┌──────────────▼──────────────┐
     │                             │
     │       LAYOUT COMPONENTS     │
     │      (src/components/       │
     │         layout/)            │
     │                             │
     │ ┌─────────────────────────┐ │
     │ │   Navigation.tsx        │ │
     │ │                         │ │
     │ │ • Tab switching         │ │
     │ │ • Session status        │ │
     │ │ • Connection indicator  │ │
     │ └─────────────────────────┘ │
     │                             │
     │ ┌─────────────────────────┐ │
     │ │   PageLayout.tsx        │ │
     │ │                         │ │
     │ │ • Container wrapper     │ │
     │ │ • Responsive design     │ │
     │ │ • Theme application     │ │
     │ └─────────────────────────┘ │
     └─────────────┬───────────────┘
                   │
     ┌─────────────▼───────────────┐
     │                             │
     │       UI COMPONENTS         │
     │      (src/components/ui/)   │
     │                             │
     │ ┌─────────────────────────┐ │
     │ │     Button.tsx          │ │
     │ │ • Start/Stop sessions   │ │
     │ │ • Action triggers       │ │
     │ └─────────────────────────┘ │
     │                             │
     │ ┌─────────────────────────┐ │
     │ │  IntentIndicator.tsx    │ │
     │ │ • Lab order detection   │ │
     │ │ • Appointment scheduling│ │
     │ │ • Visual feedback       │ │
     │ └─────────────────────────┘ │
     │                             │
     │ ┌─────────────────────────┐ │
     │ │    Status.tsx           │ │
     │ │ • Connection status     │ │
     │ │ • Error messages        │ │
     │ │ • Loading indicators    │ │
     │ └─────────────────────────┘ │
     │                             │
     │ ┌─────────────────────────┐ │
     │ │   Container.tsx         │ │
     │ │ • Layout containers     │ │
     │ │ • Spacing/positioning   │ │
     │ └─────────────────────────┘ │
     └─────────────┬───────────────┘
                   │
     ┌─────────────▼───────────────┐
     │                             │
     │    CONVERSATION COMPONENTS  │
     │   (src/components/          │
     │    conversation/)           │
     │                             │
     │ ┌─────────────────────────┐ │
     │ │  TranslationPair.tsx    │ │
     │ │                         │ │
     │ │ • Original text bubble  │ │
     │ │ • Translated text       │ │
     │ │ • Language indicators   │ │
     │ │ • Streaming animation   │ │
     │ │ • Completion states     │ │
     │ └─────────────────────────┘ │
     └─────────────┬───────────────┘
                   │
     ┌─────────────▼───────────────┐
     │                             │
     │     CUSTOM HOOKS LAYER      │
     │      (src/hooks/)           │
     │                             │
     │ ┌─────────────────────────┐ │
     │ │useVoiceConversation.ts  │ │
     │ │                         │ │
     │ │ • WebRTC management     │ │
     │ │ • OpenAI event handling │ │
     │ │ • Translation logic     │ │
     │ │ • Medical action detect │ │
     │ │ • Emergency timeouts    │ │
     │ │ • State coordination    │ │
     │ └─────────────────────────┘ │
     │                             │
     │ ┌─────────────────────────┐ │
     │ │      redux.ts           │ │
     │ │                         │ │
     │ │ • Typed useSelector     │ │
     │ │ • Typed useDispatch     │ │
     │ └─────────────────────────┘ │
     └─────────────┬───────────────┘
                   │
     ┌─────────────▼───────────────┐
     │                             │
     │      SERVICES LAYER         │
     │      (src/services/)        │
     │                             │
     │ ┌─────────────────────────┐ │
     │ │   webrtcService.ts      │ │
     │ │                         │ │
     │ │ • WebRTC connection     │ │
     │ │ • OpenAI Realtime API   │ │
     │ │ • Data channel mgmt     │ │
     │ │ • Audio stream handling │ │
     │ │ • Session configuration │ │
     │ └─────────────────────────┘ │
     │                             │
     │ ┌─────────────────────────┐ │
     │ │    apiService.ts        │ │
     │ │                         │ │
     │ │ • REST API calls        │ │
     │ │ • Conversation storage  │ │
     │ │ • Medical summaries     │ │
     │ │ • Function execution    │ │
     │ └─────────────────────────┘ │
     │                             │
     │ ┌─────────────────────────┐ │
     │ │errorHandlingService.ts  │ │
     │ │                         │ │
     │ │ • Error recovery        │ │
     │ │ • User feedback         │ │
     │ │ • Browser compatibility │ │
     │ └─────────────────────────┘ │
     └─────────────┬───────────────┘
                   │
     ┌─────────────▼───────────────┐
     │                             │
     │   TYPES & UTILITIES         │
     │                             │
     │ ┌─────────────────────────┐ │
     │ │     types/index.ts      │ │
     │ │                         │ │
     │ │ • TypeScript interfaces │ │
     │ │ • OpenAI event types    │ │
     │ │ • API response types    │ │
     │ │ • Medical action types  │ │
     │ └─────────────────────────┘ │
     │                             │
     │ ┌─────────────────────────┐ │
     │ │    utils/theme.ts       │ │
     │ │                         │ │
     │ │ • Color schemes         │ │
     │ │ • CSS-in-JS theming     │ │
     │ │ • Responsive breakpts   │ │
     │ └─────────────────────────┘ │
     └─────────────────────────────┘

DATA FLOW PATTERNS:
==================

1. USER INTERACTION FLOW:
   User speaks → WebRTC → OpenAI → Event handling → Redux update → UI re-render

2. MEDICAL ACTION FLOW:
   Speech → Intent detection → Function call → Backend webhook → Success feedback

3. CONVERSATION PERSISTENCE:
   Translation pair → Redux → API service → Database storage

4. REAL-TIME UPDATES:
   OpenAI events → useVoiceConversation hook → Redux dispatch → Component updates

HACKATHON REQUIREMENTS COVERAGE:
================================
✓ ReactJS with principled architecture
✓ Redux state management 
✓ React Router navigation
✓ Reusable components (UI, Layout, Conversation)
✓ OpenAI Realtime API integration (WebRTC)
✓ Text-to-speech output
✓ Bilingual conversation display
✓ Medical action detection (lab orders, appointments)
✓ Tool execution via webhooks
✓ Conversation summaries
✓ Database storage integration