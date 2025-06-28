import { useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import { webrtcService } from '../services/webrtcService';
import { RealtimeEvent, TranslationPair } from '../types';
import { errorHandler, handleWebRTCError, handleTranslationError, handleMedicalActionError } from '../services/errorHandlingService';

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

  // Check browser compatibility on hook initialization
  const checkBrowserSupport = useCallback(() => {
    const compatibility = errorHandler.checkBrowserCompatibility();
    if (!compatibility.compatible) {
      const errorDetails = errorHandler.handleError(
        new Error(`Browser not supported: ${compatibility.issues.join(', ')}`),
        'browser'
      );
      dispatch(updateVoiceStatus({ 
        status: errorDetails.userMessage, 
        isError: true 
      }));
      return false;
    }
    return true;
  }, [dispatch]);

  // Create new translation pair
  const createTranslationPair = useCallback((originalText: string, translatedText: string, originalLang: 'English' | 'Spanish', translatedLang: 'English' | 'Spanish') => {
    try {
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
    } catch (error) {
      console.error('Failed to create translation pair:', error);
    }
  }, [dispatch]);

  // Update assistant transcript (streaming) with error handling
  const updateAssistantTranscript = useCallback((delta: string) => {
    try {
      assistantTranscriptRef.current += delta;
      
      if (currentPairRef.current) {
        dispatch(updateTranslationPair({
          id: currentPairRef.current,
          translatedText: assistantTranscriptRef.current
        }));
      }
    } catch (error) {
      handleTranslationError(error);
    }
  }, [dispatch]);

  // Finalize assistant transcript with error handling
  const finalizeAssistantTranscript = useCallback((finalText: string) => {
    try {
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
        })).catch((error) => {
          console.warn('Failed to save assistant message:', error);
          // Continue operation even if save fails
        });
      }

      assistantTranscriptRef.current = '';
      currentPairRef.current = null;
    } catch (error) {
      handleTranslationError(error);
    }
  }, [dispatch, connection]);

  // Process queued messages with error handling
  const processMessageQueue = useCallback(() => {
    try {
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
    } catch (error) {
      handleTranslationError(error);
    }
  }, [messageQueue, updateAssistantTranscript, finalizeAssistantTranscript, dispatch]);

  // Detect language (simple heuristic)
  const detectLanguage = useCallback((text: string): boolean => {
    // Simple Spanish detection based on common patterns
    const spanishIndicators = /[ñáéíóúü]|(\b(el|la|es|está|son|por|para|con|sin|muy|más|como|qué|cómo|dónde|cuándo)\b)/i;
    return spanishIndicators.test(text);
  }, []);

  // Auto-summarize and end conversation with error handling
  const summarizeAndEndConversation = useCallback(async () => {
    if (!connection?.sessionId) return;
    
    try {
      console.log('📋 Generating conversation summary...');
      dispatch(updateVoiceStatus({ status: '📋 Generating medical summary...' }));
      
      const summaryResult = await dispatch(generateSummary(connection.sessionId)).unwrap();
      
      // Also set the current session as selectedConversation so the summary shows in UI
      dispatch({
        type: 'conversation/fetchConversationDetails/fulfilled',
        payload: {
          session_id: connection.sessionId,
          summary: summaryResult.summary
        }
      });
      
      dispatch(updateVoiceStatus({ 
        status: '📋 Medical summary generated successfully!', 
        isError: false 
      }));
      
    } catch (error) {
      const errorDetails = errorHandler.handleError(error, 'summary');
      dispatch(updateVoiceStatus({ 
        status: errorDetails.userMessage, 
        isError: true 
      }));
    }
  }, [connection, dispatch]);

  // Handle function calls (medical actions) with comprehensive error handling
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
      const errorDetails = handleMedicalActionError(
        error, 
        functionName === 'send_lab_order' ? 'lab-order' : 'appointment'
      );
      
      dispatch(updateVoiceStatus({ 
        status: errorDetails.userMessage, 
        isError: true 
      }));

      // Provide recovery suggestions
      const recoveryActions = errorHandler.getRecoveryActions(errorDetails.code);
      console.log('🔧 Recovery suggestions:', recoveryActions);
    }
  }, [dispatch, connection, summarizeAndEndConversation]);

  // Handle user transcript (speech recognition result) with error handling
  const handleUserTranscript = useCallback((transcript: string) => {
    try {
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
        })).catch((error) => {
          console.warn('Failed to save user message:', error);
          // Continue operation even if save fails
        });
      }

      dispatch(setPendingUserMessage(false));
      setTimeout(() => processMessageQueue(), 100);
    } catch (error) {
      handleTranslationError(error);
    }
  }, [dispatch, lastTranslation, connection, createTranslationPair, detectLanguage, processMessageQueue]);

  // Handle real-time events from OpenAI with comprehensive error handling
  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    try {
      console.log('📨 Processing event:', event.type, event);

      switch (event.type) {
        case 'session.created':
          console.log('✅ OpenAI Session created:', event.session?.id);
          dispatch(updateVoiceStatus({ 
            status: '✅ Connected to OpenAI! Start speaking...', 
            isListening: false 
          }));
          break;

        case 'session.updated':
          console.log('⚙️ OpenAI Session updated:', event);
          dispatch(updateVoiceStatus({ 
            status: '🎤 Medical interpreter ready! Start speaking...', 
            isListening: false 
          }));
          break;

        case 'input_audio_buffer.speech_started':
          console.log('🎤 Speech started detected');
          dispatch(updateVoiceStatus({ 
            status: '🎤 Listening for interpretation...', 
            isListening: true 
          }));
          dispatch(setPendingUserMessage(true));
          break;

        case 'input_audio_buffer.speech_stopped':
          console.log('🔇 Speech stopped detected');
          dispatch(updateVoiceStatus({ 
            status: '🔄 Processing and translating...', 
            isListening: false 
          }));
          break;

        case 'input_audio_buffer.committed':
          console.log('💾 Audio buffer committed to OpenAI');
          break;

        case 'conversation.item.created':
          console.log('📝 Conversation item created:', event);
          break;

        case 'response.created':
          console.log('🔄 OpenAI response created:', event);
          dispatch(updateVoiceStatus({ 
            status: '🗣️ Generating translation...', 
            isListening: false 
          }));
          break;

        case 'response.output_item.added':
          console.log('📤 Response output item added:', event);
          break;

        case 'response.content_part.added':
          console.log('📝 Response content part added:', event);
          break;

        case 'response.audio_transcript.delta':
          console.log('🔤 Audio transcript delta:', event.delta);
          if (event.delta && event.delta.trim()) {
            if (pendingUserMessage) {
              console.log('📋 Queuing delta for pending user message');
              dispatch(addToMessageQueue({ type: 'delta', content: event.delta }));
            } else {
              console.log('📝 Updating assistant transcript with delta');
              updateAssistantTranscript(event.delta);
            }
          }
          break;

        case 'response.audio_transcript.done':
          console.log('✅ Audio transcript completed:', event.transcript);
          if (event.transcript && event.transcript.trim()) {
            dispatch(setLastTranslation(event.transcript.trim()));
            
            if (pendingUserMessage) {
              console.log('📋 Queuing final transcript for pending user message');
              dispatch(addToMessageQueue({ type: 'final', content: event.transcript }));
            } else {
              console.log('✅ Finalizing assistant transcript');
              finalizeAssistantTranscript(event.transcript);
            }
          }
          break;

        case 'response.done':
          console.log('🏁 OpenAI response completed');
          dispatch(updateVoiceStatus({ 
            status: '✅ Translation complete! Ready for next speaker...', 
            isListening: false 
          }));
          dispatch(setPendingUserMessage(false));
          assistantTranscriptRef.current = '';
          // Process any queued messages
          setTimeout(() => processMessageQueue(), 100);
          break;

        case 'conversation.item.input_audio_transcription.completed':
          console.log('📝 User speech transcription completed:', event.transcript);
          if (event.transcript) {
            console.log('🗣️ User said:', event.transcript);
            handleUserTranscript(event.transcript);
          }
          break;

        case 'conversation.item.input_audio_transcription.failed':
          console.error('❌ Speech transcription failed:', event);
          dispatch(updateVoiceStatus({ 
            status: '❌ Speech recognition failed. Please try again.', 
            isError: true 
          }));
          break;

        case 'response.function_call_arguments.delta':
          console.log('🎯 Function call arguments delta:', event);
          break;

        case 'response.function_call_arguments.done':
          console.log('🎯 FUNCTION CALL DETECTED!', event);
          handleFunctionCall(event);
          break;

        case 'rate_limits.updated':
          console.log('📊 Rate limits updated:', event);
          break;

        case 'error':
          console.error('❌ OpenAI error:', event.error);
          const errorDetails = handleTranslationError(new Error(event.error?.message || 'OpenAI API error'));
          dispatch(updateVoiceStatus({ 
            status: errorDetails.userMessage, 
            isError: true 
          }));
          break;

        default:
          console.log('📨 Unhandled OpenAI event:', event.type, event);
      }
    } catch (error) {
      console.error('💥 Error handling realtime event:', error);
      handleTranslationError(error);
    }
  }, [dispatch, pendingUserMessage, handleUserTranscript, updateAssistantTranscript, finalizeAssistantTranscript, handleFunctionCall, processMessageQueue]);

  // Stop voice chat with comprehensive cleanup
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
          // Continue cleanup even if database save fails
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
      const errorDetails = errorHandler.handleError(error, 'cleanup');
      dispatch(updateVoiceStatus({ 
        status: errorDetails.userMessage, 
        isError: true 
      }));
    }
  }, [dispatch, connection]);

  // Start voice chat with comprehensive error handling
  const startVoiceChat = useCallback(async () => {
    try {
      // Check browser compatibility first
      if (!checkBrowserSupport()) {
        return;
      }

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
          const errorDetails = handleWebRTCError(new Error('WebRTC connection failed'));
          dispatch(updateVoiceStatus({ 
            status: errorDetails.userMessage, 
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
      const errorDetails = handleWebRTCError(error);
      dispatch(updateVoiceStatus({ 
        status: errorDetails.userMessage, 
        isError: true 
      }));

      // Provide recovery suggestions for common issues
      if ((error as Error).name === 'NotAllowedError') {
        const recoveryActions = errorHandler.getRecoveryActions('MICROPHONE_ACCESS_DENIED');
        console.log('🔧 Microphone access recovery steps:', recoveryActions);
      }
    }
  }, [dispatch, handleRealtimeEvent, checkBrowserSupport]);

  return {
    startVoiceChat,
    stopVoiceChat,
    voiceState,
    connection,
    translationPairs,
    currentSession,
  };
}; 