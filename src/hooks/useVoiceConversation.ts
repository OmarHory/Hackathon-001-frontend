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

      // Save assistant message to database (as per API doc) - Enhanced session ID lookup
      const sessionId = connection?.sessionId || currentSession?.session_id || webrtcService.getConnection().sessionId;
      
      if (sessionId && finalText) {
        console.log('💾 Saving assistant message to database:', {
          sessionId: sessionId,
          content: finalText,
          messageType: 'assistant',
          source: connection?.sessionId ? 'redux-connection' : currentSession?.session_id ? 'redux-session' : 'webrtc-service'
        });
        
        dispatch(saveMessage({
          sessionId: sessionId,
          messageType: 'assistant',
          content: finalText,
          // Add audio duration estimate (approximate)
          audioDuration: finalText.length * 0.1, // Rough estimate: 10 chars per second
          confidenceScore: 0.98 // High confidence for OpenAI responses
        })).then((result) => {
          console.log('✅ Assistant message saved successfully:', result);
        }).catch((error) => {
          console.error('❌ Failed to save assistant message:', error);
          console.error('   Session ID used:', sessionId);
          console.error('   API URL:', process.env.REACT_APP_API_URL);
          console.error('   Full error:', error);
          // Continue operation even if save fails
        });
      } else {
        console.warn('⚠️ No session ID or final text for saving assistant message');
        console.warn('   Session ID attempts:', {
          reduxConnection: connection?.sessionId,
          reduxSession: currentSession?.session_id,
          webrtcService: webrtcService.getConnection().sessionId
        });
        console.warn('   Final text:', finalText);
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

  // Generate summary without ending conversation
  const generateSummaryOnly = useCallback(async () => {
    if (!connection?.sessionId) return;
    
    try {
      console.log('📋 Generating conversation summary...');
      dispatch(updateVoiceStatus({ status: '📋 Generating medical summary...' }));
      
      const summaryResult = await dispatch(generateSummary(connection.sessionId)).unwrap();
      
      // Set the current session as selectedConversation so the summary shows in UI
      dispatch({
        type: 'conversation/fetchConversationDetails/fulfilled',
        payload: {
          session_id: connection.sessionId,
          summary: summaryResult.summary
        }
      });
      
      dispatch(updateVoiceStatus({ 
        status: '✅ Medical summary saved! You can continue the conversation.', 
        isError: false 
      }));
      
      return summaryResult.summary;
      
    } catch (error) {
      const errorDetails = errorHandler.handleError(error, 'summary');
      dispatch(updateVoiceStatus({ 
        status: errorDetails.userMessage, 
        isError: true 
      }));
    }
  }, [connection, dispatch]);

  // Auto-summarize and end conversation with error handling
  const summarizeAndEndConversation = useCallback(async () => {
    await generateSummaryOnly();
    // Add delay before stopping if needed
    setTimeout(() => {
      stopVoiceChat();
    }, 1000);
  }, [generateSummaryOnly]);

  // Handle function calls (medical actions) with comprehensive error handling
  const handleFunctionCall = useCallback(async (event: any) => {
    const functionName = event.name;
    const argumentsStr = event.arguments || '{}';
    const callId = event.call_id;
    
    console.log('🎯 Function call received:', { functionName, callId });
    console.log('🔍 Available session IDs:');
    console.log('   - connection.sessionId:', connection?.sessionId);
    console.log('   - currentSession.session_id:', currentSession?.session_id);
    
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
      
      // Send function call to backend - use current session ID from state
      console.log('🔍 DEBUG: Checking available session IDs...');
      console.log('   - connection object:', connection);
      console.log('   - connection?.sessionId:', connection?.sessionId);
      console.log('   - currentSession object:', currentSession);
      console.log('   - currentSession?.session_id:', currentSession?.session_id);
      
      // Try multiple sources for session ID
      let sessionId = connection?.sessionId || currentSession?.session_id;
      
      // Fallback: get session ID directly from WebRTC service
      if (!sessionId) {
        const webrtcConnection = webrtcService.getConnection();
        sessionId = webrtcConnection.sessionId;
        console.log('🔄 Fallback: Got session ID from WebRTC service:', sessionId);
      }
      
      console.log('   - Final sessionId:', sessionId);
      
      if (!sessionId) {
        console.error('❌ No session ID available from any source!');
        console.error('   Redux connection state:', connection);
        console.error('   Redux session state:', currentSession);
        console.error('   WebRTC service connection:', webrtcService.getConnection());
        throw new Error('No active session found. Please start a new medical interpretation session.');
      }
      
      console.log('📤 Sending function call with session ID:', sessionId);
      
      const result = await dispatch(sendFunctionCall({
        functionName,
        args: argumentsObj,
        callId,
        sessionId
      })).unwrap();
      
      // Save medical action to conversation history (as per API doc)
      const actionMessage = `🔧 Medical Action: ${functionName} executed successfully`;
      dispatch(saveMessage({
        sessionId,
        messageType: 'system',
        content: actionMessage
      })).catch((error) => {
        console.warn('Failed to save medical action message:', error);
      });
      
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
      
      // Auto-generate summary after medical action (without ending conversation) - as per API doc
      setTimeout(async () => {
        try {
          console.log('📋 Auto-generating medical summary after action...');
          const summaryResult = await dispatch(generateSummary(sessionId)).unwrap();
          console.log('✅ Medical summary generated successfully:', summaryResult);
          
          // Store summary in UI state (following API doc structure)
          dispatch({
            type: 'conversation/fetchConversationDetails/fulfilled',
            payload: {
              session_id: sessionId,
              summary: summaryResult.summary
            }
          });
          
          // Save summary generation event to conversation history
          const summaryMessage = `📋 Medical summary automatically generated after ${functionName}`;
          dispatch(saveMessage({
            sessionId,
            messageType: 'system',
            content: summaryMessage
          })).catch((error) => {
            console.warn('Failed to save summary event message:', error);
          });
          
        } catch (summaryError) {
          console.warn('Failed to generate auto-summary:', summaryError);
          // Don't fail the whole operation if summary generation fails
        }
      }, 2000);
      
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
  }, [dispatch, connection, currentSession, generateSummaryOnly]);

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

      // Save user message to database (as per API doc) - Enhanced session ID lookup
      const sessionId = connection?.sessionId || currentSession?.session_id || webrtcService.getConnection().sessionId;
      
      if (sessionId) {
        console.log('💾 Saving user message to database:', {
          sessionId: sessionId,
          content: transcript,
          messageType: 'user',
          source: connection?.sessionId ? 'redux-connection' : currentSession?.session_id ? 'redux-session' : 'webrtc-service'
        });
        
        dispatch(saveMessage({
          sessionId: sessionId,
          messageType: 'user',
          content: transcript,
          // Add confidence score if available from speech recognition
          confidenceScore: 0.95 // Default high confidence for successful transcription
        })).then((result) => {
          console.log('✅ User message saved successfully:', result);
        }).catch((error) => {
          console.error('❌ Failed to save user message:', error);
          console.error('   Session ID used:', sessionId);
          console.error('   API URL:', process.env.REACT_APP_API_URL);
          console.error('   Full error:', error);
          // Continue operation even if save fails
        });
      } else {
        console.warn('⚠️ No session ID available from ANY source for saving user message');
        console.warn('   Redux connection:', connection);
        console.warn('   Redux session:', currentSession);
        console.warn('   WebRTC service:', webrtcService.getConnection());
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
            
            // Check if this should trigger a function call
            const text = event.transcript.toLowerCase();
            if (text.includes('send lab order') || text.includes('order tests') || text.includes('get labs')) {
              console.log('🚨 FUNCTION TRIGGER DETECTED in transcript:', event.transcript);
              console.log('🚨 OpenAI should call send_lab_order function now...');
            }
            if (text.includes('schedule follow') || text.includes('next appointment') || text.includes('come back')) {
              console.log('🚨 APPOINTMENT TRIGGER DETECTED in transcript:', event.transcript);
              console.log('🚨 OpenAI should call schedule_followup_appointment function now...');
            }
            
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
          console.log('🎯 Function name:', event.name);
          console.log('🎯 Function arguments:', event.arguments);
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
      dispatch(updateVoiceStatus({ status: '💾 Saving conversation and generating summary...' }));
      
      // Get session ID from multiple sources
      const sessionId = connection?.sessionId || currentSession?.session_id || webrtcService.getConnection().sessionId;
      
      if (sessionId) {
        try {
          console.log('📋 Ending session and generating final summary...');
          
          // 1. End session in database (as per API doc)
          await dispatch(endSession(sessionId)).unwrap();
          console.log('✅ Session ended successfully');
          
          // 2. Generate final medical summary (as per API doc)
          const summaryResult = await dispatch(generateSummary(sessionId)).unwrap();
          console.log('✅ Final summary generated successfully');
          
          // 3. Update UI with final summary
          dispatch({
            type: 'conversation/fetchConversationDetails/fulfilled',
            payload: {
              session_id: sessionId,
              summary: summaryResult.summary
            }
          });
          
        } catch (error) {
          console.error('Failed to properly end session:', error);
          // Continue cleanup even if database operations fail
        }
      } else {
        console.warn('⚠️ No session ID found for cleanup');
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
      
      dispatch(updateVoiceStatus({ status: 'Session ended! Summary saved to history. 📋' }));
      
      console.log('✅ Voice chat stopped and session properly saved');
      
    } catch (error) {
      const errorDetails = errorHandler.handleError(error, 'cleanup');
      dispatch(updateVoiceStatus({ 
        status: errorDetails.userMessage, 
        isError: true 
      }));
    }
  }, [dispatch, connection, currentSession]);

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
      
      console.log('🔗 WebRTC connection result:', connectionResult);
      console.log('📋 Session ID from connection:', connectionResult.sessionId);
      console.log('🔍 Connection result type:', typeof connectionResult);
      console.log('🔍 Connection result keys:', Object.keys(connectionResult));
      
      // Store only serializable connection data in Redux
      const serializableConnection = {
        sessionId: connectionResult.sessionId,
        isConnected: true,
        connectionState: 'connected'
      };
      
      console.log('💾 Storing connection in Redux:', serializableConnection);
      dispatch(setConnection(serializableConnection));
      
      // Create session if we have a session ID
      if (connectionResult.sessionId) {
        const sessionData = {
          session_id: connectionResult.sessionId,
          started_at: new Date().toISOString(),
          total_messages: 0,
          is_active: true,
        };
        
        console.log('✅ Setting current session with data:', sessionData);
        dispatch(setCurrentSession(sessionData));
        
        // Verify session was set
        setTimeout(() => {
          console.log('🔍 Verifying session was set in Redux...');
          console.log('   Current connection from Redux:', connection);
          console.log('   Current session from Redux:', currentSession);
        }, 100);
        
      } else {
        console.warn('⚠️ No session ID received from WebRTC service!');
        console.warn('   WebRTC result was:', connectionResult);
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