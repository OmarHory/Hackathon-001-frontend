import { useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { webrtcService } from '../services/webrtcService';
import { RealtimeEvent, TranslationPair } from '../types';

// Redux actions
import {
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
  sendFunctionCall,
} from '../store/slices/voiceSlice';

import {
  setCurrentSession,
  addMessage,
  addTranslationPair,
  updateTranslationPair,
  clearCurrentSession,
  saveMessage,
  endSession,
  generateSummary,
} from '../store/slices/conversationSlice';

import {
  detectIntent,
  showIntent,
  hideIntent,
} from '../store/slices/intentSlice';

export const useVoiceConversation = () => {
  const dispatch = useAppDispatch();
  
  // Get current state
  const voiceState = useAppSelector((state) => (state.voice as any)?.voiceState);
  const connection = useAppSelector((state) => (state.voice as any)?.connection);
  const currentSession = useAppSelector((state) => (state.conversation as any)?.currentSession);
  const translationPairs = useAppSelector((state) => (state.conversation as any)?.translationPairs || []);
  const lastTranslation = useAppSelector((state) => (state.voice as any)?.lastTranslation || '');
  const pendingUserMessage = useAppSelector((state) => (state.voice as any)?.pendingUserMessage || false);
  const messageQueue = useAppSelector((state) => (state.voice as any)?.messageQueue || []);

  // Refs for managing current translation pair
  const currentPairRef = useRef<string | null>(null);
  const assistantTranscriptRef = useRef<string>('');

  // Create new translation pair
  const createTranslationPair = useCallback((originalText: string, translatedText: string, originalLang: 'English' | 'Spanish', translatedLang: 'English' | 'Spanish') => {
    const pairId = Date.now().toString();
    currentPairRef.current = pairId;
    
    dispatch(addTranslationPair({
      originalText,
      translatedText,
      originalLang,
      translatedLang,
      timestamp: new Date().toISOString(),
      isComplete: false,
    }));
  }, [dispatch]);

  // Update assistant transcript (streaming)
  const updateAssistantTranscript = useCallback((delta: string) => {
    assistantTranscriptRef.current += delta;
    
    if (currentPairRef.current) {
      dispatch(updateTranslationPair({
        id: currentPairRef.current,
        translatedText: assistantTranscriptRef.current
      }));
    }
  }, [dispatch]);

  // Finalize assistant transcript
  const finalizeAssistantTranscript = useCallback((finalText: string) => {
    if (currentPairRef.current) {
      dispatch(updateTranslationPair({
        id: currentPairRef.current,
        translatedText: finalText
      }));
    }

    // Save assistant message to database
    if (connection?.sessionId && finalText) {
      dispatch(saveMessage({
        sessionId: connection.sessionId,
        messageType: 'assistant',
        content: finalText
      }));
    }

    assistantTranscriptRef.current = '';
    currentPairRef.current = null;
  }, [dispatch, connection]);

  // Process queued messages
  const processMessageQueue = useCallback(() => {
    if (messageQueue.length === 0) return;

    console.log(`📋 Processing ${messageQueue.length} queued messages`);
    
    for (const message of messageQueue) {
      if (message.type === 'delta') {
        updateAssistantTranscript(message.content);
      } else if (message.type === 'final') {
        finalizeAssistantTranscript(message.content);
      }
    }
    
    dispatch(clearMessageQueue());
  }, [messageQueue, updateAssistantTranscript, finalizeAssistantTranscript, dispatch]);

  // Detect language (simple heuristic)
  const detectLanguage = useCallback((text: string): boolean => {
    // Simple Spanish detection based on common patterns
    const spanishIndicators = /[ñáéíóúü]|(\b(el|la|es|está|son|por|para|con|sin|muy|más|como|qué|cómo|dónde|cuándo)\b)/i;
    return spanishIndicators.test(text);
  }, []);

  // Auto-summarize and end conversation
  const summarizeAndEndConversation = useCallback(async () => {
    if (!connection?.sessionId) return;
    
    try {
      console.log('📋 Generating conversation summary...');
      dispatch(updateVoiceStatus({ status: '📋 Generating medical summary...' }));
      
      await dispatch(generateSummary(connection.sessionId)).unwrap();
      
      dispatch(updateVoiceStatus({ 
        status: '📋 Medical summary generated successfully!', 
        isError: false 
      }));
      
    } catch (error) {
      console.error('❌ Error generating summary:', error);
      dispatch(updateVoiceStatus({ 
        status: '❌ Error generating summary, ending conversation...', 
        isError: true 
      }));
    }
  }, [connection, dispatch]);

  // Handle function calls (medical actions)
  const handleFunctionCall = useCallback(async (event: any) => {
    const functionName = event.name;
    const argumentsStr = event.arguments || '{}';
    const callId = event.call_id;
    
    try {
      let argumentsObj = {};
      try {
        argumentsObj = JSON.parse(argumentsStr);
      } catch (e) {
        console.log('Failed to parse arguments, using empty object');
      }
      
      if (functionName === 'send_lab_order') {
        console.log('🧪 SENDING LAB ORDER!');
        dispatch(updateVoiceStatus({ status: '🧪 Sending lab order...' }));
      } else if (functionName === 'schedule_followup_appointment') {
        console.log('📅 SCHEDULING APPOINTMENT!');
        dispatch(updateVoiceStatus({ status: '📅 Scheduling follow-up appointment...' }));
      }
      
      // Send function call to backend
      const result = await dispatch(sendFunctionCall({
        functionName,
        args: argumentsObj,
        callId,
        sessionId: connection?.sessionId || 'frontend_session'
      })).unwrap();
      
      // Send function result back to OpenAI
      const functionOutput = {
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: JSON.stringify(result)
        }
      };
      
      webrtcService.sendMessage(functionOutput);
      
      // Request "Done" response
      const responseRequest = {
        type: "response.create",
        response: {
          modalities: ["text", "audio"],
          instructions: "Just say 'Done' - do not translate anything. The medical action has been completed successfully."
        }
      };
      
      webrtcService.sendMessage(responseRequest);
      
      // Auto-summarize and end conversation after tool use
      setTimeout(() => {
        console.log('📋 Auto-summarizing conversation after tool use...');
        summarizeAndEndConversation();
      }, 3000);
      
    } catch (error) {
      console.error('❌ Function call error:', error);
      dispatch(updateVoiceStatus({ 
        status: '❌ Function call failed: ' + (error as Error).message, 
        isError: true 
      }));
    }
  }, [dispatch, connection, summarizeAndEndConversation]);

  // Handle user transcript (speech recognition result)
  const handleUserTranscript = useCallback((transcript: string) => {
    // Detect and update intent
    dispatch(detectIntent(transcript));
    dispatch(showIntent());

    // Check for repeat requests
    const text = transcript.toLowerCase().trim();
    const repeatKeywords = ['repeat that', 'repeat', 'say again', 'repite eso', 'repite', 'otra vez', 'repítelo', 'dilo otra vez'];
    const isRepeatRequest = repeatKeywords.some(keyword => text.includes(keyword));

    if (isRepeatRequest && lastTranslation) {
      console.log('🔄 REPEAT REQUEST DETECTED! Repeating:', lastTranslation);
      dispatch(updateVoiceStatus({ status: '🔄 Repeating last translation...' }));
      
      // Create new translation pair for repeat
      createTranslationPair(transcript, '', 'English', 'Spanish');
      
      // Send repeat instruction to OpenAI
      const repeatMessage = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{
            type: "input_text", 
            text: `REPEAT_COMMAND: Please repeat exactly: "${lastTranslation}"`
          }]
        }
      };
      
      webrtcService.sendMessage(repeatMessage);
      
      const responseRequest = {
        type: "response.create",
        response: {
          modalities: ["text", "audio"],
          instructions: `Say exactly this again: "${lastTranslation}". Do not translate this instruction - just repeat the translation.`
        }
      };
      
      webrtcService.sendMessage(responseRequest);
      dispatch(setPendingUserMessage(false));
      return;
    }

    // Create new translation pair for regular speech
    const isSpanish = detectLanguage(transcript);
    const originalLang = isSpanish ? 'Spanish' : 'English';
    const translatedLang = isSpanish ? 'English' : 'Spanish';
    
    createTranslationPair(transcript, '', originalLang, translatedLang);

    // Save user message to database
    if (connection?.sessionId) {
      dispatch(saveMessage({
        sessionId: connection.sessionId,
        messageType: 'user',
        content: transcript
      }));
    }

    dispatch(setPendingUserMessage(false));
    setTimeout(() => processMessageQueue(), 100);
  }, [dispatch, lastTranslation, connection, createTranslationPair, detectLanguage, processMessageQueue]);

  // Handle real-time events from OpenAI
  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    console.log('📨 Processing event:', event.type);

    switch (event.type) {
      case 'session.created':
        console.log('✅ Session created:', event.session?.id);
        break;

      case 'session.updated':
        console.log('⚙️ Session updated');
        break;

      case 'input_audio_buffer.speech_started':
        dispatch(updateVoiceStatus({ 
          status: '🎤 Listening for interpretation...', 
          isListening: true 
        }));
        dispatch(setPendingUserMessage(true));
        break;

      case 'input_audio_buffer.speech_stopped':
        dispatch(updateVoiceStatus({ 
          status: '🔄 Processing and translating...', 
          isListening: false 
        }));
        break;

      case 'response.created':
        dispatch(updateVoiceStatus({ 
          status: '🗣️ Interpreting...', 
          isListening: false 
        }));
        break;

      case 'response.done':
        dispatch(updateVoiceStatus({ 
          status: '✅ Ready for next speaker!', 
          isListening: false 
        }));
        dispatch(setPendingUserMessage(false));
        assistantTranscriptRef.current = '';
        processMessageQueue();
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          console.log('📝 User said:', event.transcript);
          handleUserTranscript(event.transcript);
        }
        break;

      case 'response.audio_transcript.delta':
        if (event.delta && event.delta.trim()) {
          if (pendingUserMessage) {
            dispatch(addToMessageQueue({ type: 'delta', content: event.delta }));
          } else {
            updateAssistantTranscript(event.delta);
          }
        }
        break;

      case 'response.audio_transcript.done':
        if (event.transcript && event.transcript.trim()) {
          dispatch(setLastTranslation(event.transcript.trim()));
          
          if (pendingUserMessage) {
            dispatch(addToMessageQueue({ type: 'final', content: event.transcript }));
          } else {
            finalizeAssistantTranscript(event.transcript);
          }
        }
        break;

      case 'response.function_call_arguments.done':
        console.log('🎯 FUNCTION CALL DETECTED!', event);
        handleFunctionCall(event);
        break;

      case 'error':
        console.error('❌ OpenAI error:', event.error);
        dispatch(updateVoiceStatus({ 
          status: `❌ Error: ${event.error?.message || 'Unknown error'}`, 
          isError: true 
        }));
        break;

      default:
        console.log('📨 Unhandled event:', event.type, event);
    }
  }, [dispatch, pendingUserMessage, handleUserTranscript, updateAssistantTranscript, finalizeAssistantTranscript, handleFunctionCall, processMessageQueue]);

  // Stop voice chat
  const stopVoiceChat = useCallback(async () => {
    try {
      console.log('🛑 Stopping voice chat...');
      dispatch(updateVoiceStatus({ status: '💾 Saving conversation...' }));
      
      // End session in database
      if (connection?.sessionId) {
        try {
          await dispatch(endSession(connection.sessionId)).unwrap();
        } catch (error) {
          console.error('Failed to end session in database:', error);
        }
      }
      
      // Cleanup WebRTC
      webrtcService.cleanup();
      
      // Reset Redux state
      dispatch(cleanupConnection());
      dispatch(resetVoiceState());
      dispatch(clearCurrentSession());
      dispatch(hideIntent());
      
      // Reset refs
      currentPairRef.current = null;
      assistantTranscriptRef.current = '';
      
      dispatch(updateVoiceStatus({ status: 'Ready to start medical interpretation! 🏥' }));
      
      console.log('✅ Voice chat stopped successfully');
      
    } catch (error) {
      console.error('💥 Error stopping:', error);
      dispatch(updateVoiceStatus({ 
        status: `❌ Error stopping: ${(error as Error).message}`, 
        isError: true 
      }));
    }
  }, [dispatch, connection]);

  // Start voice chat
  const startVoiceChat = useCallback(async () => {
    try {
      dispatch(resetVoiceState());
      dispatch(updateVoiceStatus({ status: '🎙️ Getting microphone access...' }));
      
      // Set up event handlers
      webrtcService.onEvent(handleRealtimeEvent);
      webrtcService.onConnectionStateChange((state) => {
        dispatch(updateVoiceStatus({ status: `🔗 Connection: ${state}` }));
        if (state === 'connected') {
          dispatch(setConnected(true));
          dispatch(updateVoiceStatus({ 
            status: '✅ Connected to Medical Interpreter! Start speaking!', 
            isError: false 
          }));
          dispatch(showIntent());
        } else if (state === 'failed') {
          dispatch(updateVoiceStatus({ 
            status: '❌ Connection failed', 
            isError: true 
          }));
          dispatch(setConnected(false));
        }
      });
      
      // Start WebRTC connection
      const connectionResult = await webrtcService.startConnection();
      
      dispatch(setConnection(connectionResult));
      
      // Create session if we have a session ID
      if (connectionResult.sessionId) {
        dispatch(setCurrentSession({
          session_id: connectionResult.sessionId,
          started_at: new Date().toISOString(),
          total_messages: 0,
          is_active: true,
        }));
      }
      
    } catch (error) {
      console.error('💥 Voice chat error:', error);
      dispatch(updateVoiceStatus({ 
        status: `❌ Error: ${(error as Error).message}`, 
        isError: true 
      }));
    }
  }, [dispatch, handleRealtimeEvent]);

  return {
    startVoiceChat,
    stopVoiceChat,
    voiceState,
    connection,
    translationPairs,
    currentSession,
  };
}; 