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
  const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Simplified emergency timeout - only trigger in truly stuck states
  const startEmergencyTimeout = useCallback(() => {
    // Only set timeout if we don't already have one
    if (translationTimeoutRef.current) {
      clearTimeout(translationTimeoutRef.current);
    }
    
    console.log('🛡️ Starting emergency timeout for translation pair:', currentPairRef.current);
    
    translationTimeoutRef.current = setTimeout(() => {
      console.log('🚨 EMERGENCY TIMEOUT TRIGGERED: Translation stuck, forcing completion');
      console.log('🔧 Current pair ref:', currentPairRef.current);
      console.log('🔧 Assistant transcript:', assistantTranscriptRef.current);
      
      // Force complete any stuck translation pair
      if (currentPairRef.current) {
        const fallbackText = assistantTranscriptRef.current.trim() || 'Translation timeout - please speak again';
        console.log('🔧 Force completing with fallback:', fallbackText);
        dispatch(updateTranslationPair({
          id: currentPairRef.current,
          translatedText: fallbackText,
          isComplete: true
        }));
        
        // Clear refs
        currentPairRef.current = null;
        assistantTranscriptRef.current = '';
      }
      
      // Reset all pending states
      dispatch(setPendingUserMessage(false));
      dispatch(clearMessageQueue());
      
      dispatch(updateVoiceStatus({ 
        status: '🎤 Ready for medical interpretation...', 
        isListening: false 
      }));
      
    }, 4000); // Reduced to 4 seconds for faster recovery
  }, [dispatch]);

  const clearEmergencyTimeout = useCallback(() => {
    if (translationTimeoutRef.current) {
      clearTimeout(translationTimeoutRef.current);
      translationTimeoutRef.current = null;
    }
  }, []);

  // Force complete any incomplete translation pairs
  const forceCompleteIncompleteTranslations = useCallback(() => {
    // Complete the current pair if it exists
    if (currentPairRef.current) {
      const finalText = assistantTranscriptRef.current.trim() || 'Session ended';
      console.log('🔧 Force completing translation pair on session end:', finalText);
      dispatch(updateTranslationPair({
        id: currentPairRef.current,
        translatedText: finalText,
        isComplete: true
      }));
      
      currentPairRef.current = null;
      assistantTranscriptRef.current = '';
    }
    
    // Clear any timeouts
    clearEmergencyTimeout();
  }, [dispatch, clearEmergencyTimeout]);

  // Enhanced status update 
  const updateVoiceStatusWithTracking = useCallback((payload: { 
    status: string; 
    isError?: boolean; 
    isListening?: boolean 
  }) => {
    dispatch(updateVoiceStatus(payload));
  }, [dispatch]);

  // Create new translation pair
  const createTranslationPair = useCallback((originalText: string, translatedText: string, originalLang: 'English' | 'Spanish', translatedLang: 'English' | 'Spanish') => {
    try {
      const pairId = Date.now().toString();
      currentPairRef.current = pairId;
      
      console.log('🆔 Creating translation pair with ID:', pairId);
      
      dispatch(addTranslationPair({
        id: pairId, // Pass the same ID that we store in currentPairRef
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
        console.log('🔄 Updating translation pair ID:', currentPairRef.current, 'with text:', assistantTranscriptRef.current.slice(0, 50) + '...');
        dispatch(updateTranslationPair({
          id: currentPairRef.current,
          translatedText: assistantTranscriptRef.current,
          isComplete: false
        }));
      } else {
        console.warn('⚠️ No currentPairRef.current available for update');
      }
    } catch (error) {
      handleTranslationError(error);
    }
  }, [dispatch]);

  // Finalize assistant transcript with error handling
  const finalizeAssistantTranscript = useCallback((finalText: string) => {
    try {
      if (currentPairRef.current) {
        console.log('✅ Finalizing translation pair ID:', currentPairRef.current, 'with final text:', finalText);
        dispatch(updateTranslationPair({
          id: currentPairRef.current,
          translatedText: finalText,
          isComplete: true
        }));
      } else {
        console.warn('⚠️ No currentPairRef.current available for finalization');
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
      
      // Update the medical action pair to show completion IMMEDIATELY
      // Find the most recent translation pair and update it with "Done"
      if (currentPairRef.current) {
        console.log('✅ Updating medical action pair to show completion');
        dispatch(updateTranslationPair({
          id: currentPairRef.current,
          translatedText: 'Done',
          isComplete: true
        }));
        
        // Clear the current pair reference since it's now complete
        currentPairRef.current = null;
        assistantTranscriptRef.current = '';
      }
      
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
      
      // Request "Done" response for audio output
      const responseRequest = {
        type: "response.create",
        response: {
          modalities: ["text", "audio"],
          instructions: "Say EXACTLY 'Done' - one single word only. Do NOT say 'Done.' with a period. Do NOT say 'Done, the lab order has been sent'. Do NOT explain anything. Do NOT translate. Just say 'Done' and stop immediately."
        }
      };
      
      webrtcService.sendMessage(responseRequest);
      
      // Update status to show medical action completed
      dispatch(updateVoiceStatus({ 
        status: '✅ Medical action completed! Ready for next speaker...', 
        isListening: false 
      }));
      
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

  // Detect if transcript contains medical action keywords
  const detectMedicalAction = useCallback((transcript: string) => {
    const text = transcript.toLowerCase().trim();
    
    // Lab order keywords
    const labKeywords = ['send lab order', 'order tests', 'get labs', 'blood work', 'run tests', 'lab order'];
    const hasLabOrder = labKeywords.some(keyword => text.includes(keyword));
    
    // Appointment keywords  
    const appointmentKeywords = ['schedule follow-up', 'follow-up appointment', 'next appointment', 'come back in', 'see you again', 'schedule appointment'];
    const hasAppointment = appointmentKeywords.some(keyword => text.includes(keyword));
    
    return {
      isMedicalAction: hasLabOrder || hasAppointment,
      actionType: hasLabOrder ? 'lab-order' : hasAppointment ? 'appointment' : null
    };
  }, []);

  // Handle user transcript (speech recognition result) with error handling
  const handleUserTranscript = useCallback((transcript: string) => {
    try {
      // Detect and update intent
      dispatch(detectIntent(transcript));
      dispatch(showIntent());

      // Check for repeat requests first
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

      // Check for medical actions BEFORE creating translation pairs
      const medicalAction = detectMedicalAction(transcript);
      
      if (medicalAction.isMedicalAction) {
        console.log('🎯 MEDICAL ACTION DETECTED:', medicalAction.actionType);
        console.log('🎯 Action phrase:', transcript);
        
        // Create a special medical action pair instead of translation pair
        const actionIcon = medicalAction.actionType === 'lab-order' ? '🧪' : '📅';
        const actionLabel = medicalAction.actionType === 'lab-order' ? 'Processing Lab Order' : 'Scheduling Appointment';
        
        createTranslationPair(transcript, `${actionIcon} ${actionLabel}...`, 'English', 'English');
        
        dispatch(updateVoiceStatus({ 
          status: `${actionIcon} Processing medical action...` 
        }));
        
        // Let OpenAI handle the function call - don't interfere with translation logic
        dispatch(setPendingUserMessage(false));
        return;
      }

      // Create new translation pair for regular speech only if NOT a medical action
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
  }, [dispatch, lastTranslation, connection, createTranslationPair, detectLanguage, processMessageQueue, detectMedicalAction]);

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
          // Silent startup - no greeting message
          dispatch(updateVoiceStatus({ 
            status: '🎤 Ready for medical interpretation...', 
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
          updateVoiceStatusWithTracking({ 
            status: '🔄 Processing and translating...', 
            isListening: false 
          });
          break;

        case 'input_audio_buffer.committed':
          console.log('💾 Audio buffer committed to OpenAI');
          break;

        case 'input_audio_buffer.cleared':
          console.log('🧹 Audio buffer cleared');
          break;

        case 'conversation.item.created':
          console.log('📝 Conversation item created:', event);
          break;

        case 'response.created':
          console.log('🔄 OpenAI response created:', event);
          updateVoiceStatusWithTracking({ 
            status: '🗣️ Generating translation...', 
            isListening: false 
          });
          
          // Start emergency timeout only if needed
          startEmergencyTimeout();
          
          // Add a shorter timeout to check if we're getting deltas
          setTimeout(() => {
            if (currentPairRef.current && assistantTranscriptRef.current === '') {
              console.log('⚠️ No deltas received after 2 seconds, translation may be stuck');
              console.log('🔧 Current pair:', currentPairRef.current);
              console.log('🔧 Current transcript:', assistantTranscriptRef.current);
              
              // Trigger faster recovery if no response received
              console.log('🚨 Triggering fast recovery for stuck translation');
              dispatch(updateTranslationPair({
                id: currentPairRef.current,
                translatedText: 'No response received - please try again',
                isComplete: true
              }));
              
              // Clean up
              currentPairRef.current = null;
              assistantTranscriptRef.current = '';
              clearEmergencyTimeout();
              
              dispatch(updateVoiceStatus({ 
                status: '🎤 Ready for medical interpretation...', 
                isListening: false 
              }));
            }
          }, 2000);
          break;

        case 'response.output_item.added':
          console.log('📤 Response output item added:', event);
          // Sometimes the text is available immediately when output item is added
          if (event.item && event.item.content && event.item.content.length > 0) {
            const content = event.item.content[0];
            const responseText = content.transcript || content.text;
            if (responseText) {
              console.log('📝 Found early response text in output item:', responseText);
              // Update transcript buffer in case other events fail
              assistantTranscriptRef.current = responseText;
            }
          }
          break;

        case 'response.output_item.done':
          console.log('✅ Response output item completed:', event);
          // This is often where the final response content is available
          if (event.item && event.item.content && event.item.content.length > 0) {
            const content = event.item.content[0];
            if (content.transcript) {
              console.log('📝 Found transcript in output item:', content.transcript);
              dispatch(setLastTranslation(content.transcript));
              finalizeAssistantTranscript(content.transcript);
            } else if (content.text) {
              console.log('📝 Found text in output item:', content.text);
              dispatch(setLastTranslation(content.text));
              finalizeAssistantTranscript(content.text);
            }
          }
          break;

        case 'response.content_part.added':
          console.log('📝 Response content part added:', event);
          break;

        case 'response.content_part.done':
          console.log('✅ Response content part completed:', event);
          // Handle completed content parts
          if (event.part && event.part.transcript) {
            console.log('📝 Found transcript in content part:', event.part.transcript);
            dispatch(setLastTranslation(event.part.transcript));
            finalizeAssistantTranscript(event.part.transcript);
          } else if (event.part && event.part.text) {
            console.log('📝 Found text in content part:', event.part.text);
            dispatch(setLastTranslation(event.part.text));
            finalizeAssistantTranscript(event.part.text);
          }
          break;

        case 'response.audio_transcript.delta':
          console.log('🔤 Audio transcript delta:', event.delta);
          console.log('🔍 Current pair ref:', currentPairRef.current);
          console.log('🔍 Assistant transcript so far:', assistantTranscriptRef.current);
          console.log('🔍 Delta event object:', JSON.stringify(event, null, 2));
          if (event.delta && event.delta.trim()) {
            console.log('📝 Updating assistant transcript with delta:', event.delta);
            updateAssistantTranscript(event.delta);
          } else {
            console.log('⚠️ Empty or invalid delta received');
          }
          break;

        case 'response.audio_transcript.done':
          console.log('✅ Audio transcript completed:', event.transcript);
          console.log('🔍 Event object:', JSON.stringify(event, null, 2));
          
          if (event.transcript && event.transcript.trim()) {
            const finalTranscript = event.transcript.trim();
            console.log('📝 Processing final transcript:', finalTranscript);
            
            // Check if this is a "Done" response from a medical action
            if (finalTranscript.toLowerCase() === 'done' && !currentPairRef.current) {
              console.log('🎯 Detected "Done" response from medical action - already handled, ignoring');
              // Medical action already completed in handleFunctionCall, don't process this
              clearEmergencyTimeout();
              updateVoiceStatusWithTracking({ 
                status: '🎤 Ready for medical interpretation...', 
                isListening: false 
              });
              return;
            }
            
            // Process normal translations
            if (currentPairRef.current) {
              dispatch(setLastTranslation(finalTranscript));
              finalizeAssistantTranscript(finalTranscript);
              
              // Clear emergency timeout and update status
              clearEmergencyTimeout();
              
              // Reset current pair reference
              currentPairRef.current = null;
              assistantTranscriptRef.current = '';
              
              updateVoiceStatusWithTracking({ 
                status: '✅ Translation complete! Ready for next speaker...', 
                isListening: false 
              });
            } else {
              console.log('⚠️ No current translation pair to update');
            }
          } else {
            console.log('⚠️ Empty or missing transcript in audio_transcript.done event');
            console.log('🔍 Trying to use accumulated transcript:', assistantTranscriptRef.current);
            
            if (assistantTranscriptRef.current && assistantTranscriptRef.current.trim()) {
              console.log('✅ Using accumulated transcript from deltas');
              finalizeAssistantTranscript(assistantTranscriptRef.current.trim());
              
              // Clear emergency timeout and update status
              clearEmergencyTimeout();
              currentPairRef.current = null;
              assistantTranscriptRef.current = '';
              
              updateVoiceStatusWithTracking({ 
                status: '✅ Translation complete! Ready for next speaker...', 
                isListening: false 
              });
            } else {
              console.log('⚠️ No transcript available from any source');
              // Don't force complete here - let output_audio_buffer.stopped timeout handle it
            }
          }
          break;

        case 'response.done':
          console.log('🏁 OpenAI response completed');
          console.log('🔍 Final assistant transcript:', assistantTranscriptRef.current);
          console.log('🔍 Current pair ref:', currentPairRef.current);
          console.log('🔍 Response event data:', JSON.stringify(event, null, 2));
          
          // IMPORTANT: Don't immediately complete here - wait for audio transcript events
          // This event often comes BEFORE the actual transcript events
          console.log('⏳ Response done - waiting for transcript completion...');
          
          // Only force complete if we wait a bit and still have an incomplete pair
          setTimeout(() => {
            if (currentPairRef.current) {
              console.log('⚠️ Translation pair still incomplete after response.done - force completing');
              let finalText = assistantTranscriptRef.current.trim();
              
              // Try to extract text from the response event itself as a fallback
              if (!finalText && event.response && (event as any).response.output) {
                const output = (event as any).response.output;
                if (output.length > 0 && output[0].content && output[0].content.length > 0) {
                  const content = output[0].content[0];
                  finalText = content.transcript || content.text || '';
                  console.log('🔧 Extracted text from response.done event:', finalText);
                }
              }
              
              // Final fallback
              if (!finalText) {
                finalText = 'Response completed - transcript processing issue';
              }
              
              console.log('🚨 Force completing remaining pair with:', finalText);
              dispatch(updateTranslationPair({
                id: currentPairRef.current,
                translatedText: finalText,
                isComplete: true
              }));
              
              // Clean up
              currentPairRef.current = null;
              assistantTranscriptRef.current = '';
              
              // Set ready state
              dispatch(updateVoiceStatus({ 
                status: '🎤 Ready for medical interpretation...', 
                isListening: false 
              }));
            }
          }, 1000); // Wait 1 second for transcript events
          
          // Clear emergency timeout and pending message state
          clearEmergencyTimeout();
          dispatch(setPendingUserMessage(false));
          break;

        case 'conversation.item.input_audio_transcription.completed':
          console.log('📝 User transcript completed:', event.transcript);
          if (event.transcript) {
            handleUserTranscript(event.transcript);
          }
          break;

        case 'conversation.item.input_audio_transcription.delta':
          console.log('🔤 User transcript delta:', event.delta);
          // Handle streaming user transcription if needed
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

        case 'output_audio_buffer.stopped':
          console.log('🔊 OpenAI audio output stopped:', event);
          // This event indicates TTS finished, but transcript might come in separate events
          // Give a short window for transcript events to arrive before falling back
          
          if (currentPairRef.current) {
            console.log('⏳ Audio stopped, waiting 800ms for transcript events...');
            
            // Wait a moment for transcript events to arrive
            setTimeout(() => {
              // Check if translation pair was already completed by transcript events
              if (currentPairRef.current) {
                let finalText = assistantTranscriptRef.current.trim();
                
                if (finalText) {
                  console.log('✅ Completing translation with accumulated transcript:', finalText);
                  dispatch(setLastTranslation(finalText));
                  finalizeAssistantTranscript(finalText);
                } else {
                  console.log('⚠️ No transcript received after audio stopped, using final fallback');
                  dispatch(updateTranslationPair({
                    id: currentPairRef.current,
                    translatedText: 'Audio played - transcript not captured',
                    isComplete: true
                  }));
                  currentPairRef.current = null;
                  assistantTranscriptRef.current = '';
                  
                  // Update status
                  dispatch(updateVoiceStatus({ 
                    status: '⚠️ Audio played but transcript missing. Ready for next speaker...', 
                    isListening: false 
                  }));
                }
                
                // Clear emergency timeout
                clearEmergencyTimeout();
              } else {
                console.log('✅ Translation pair already completed by transcript event');
              }
            }, 800); // Give 800ms for transcript events to arrive
          }
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
          // Check if this is a response-related event we might be missing
          if (event.type.includes('response') || event.type.includes('audio')) {
            console.log('🚨 POTENTIALLY MISSED RESPONSE EVENT:', event.type, event);
          }
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
      
      // Force complete any incomplete translations first
      forceCompleteIncompleteTranslations();
      
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
      
      // Reset refs and clear timeouts
      currentPairRef.current = null;
      assistantTranscriptRef.current = '';
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
        translationTimeoutRef.current = null;
      }
      
      // Clear any emergency timeout
      clearEmergencyTimeout();
      
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

      // IMMEDIATELY set connecting state for button feedback
      dispatch(setConnection({ 
        sessionId: null, 
        isConnected: false, 
        connectionState: 'connecting' 
      }));
      
      dispatch(resetVoiceState());
      dispatch(updateVoiceStatus({ 
        status: '⏳ Please wait a moment - connecting to medical interpreter...' 
      }));
      
      // Set up event handlers
      webrtcService.onEvent(handleRealtimeEvent);
      webrtcService.onConnectionStateChange((state) => {
        console.log('🔗 Connection state changed to:', state);
        
        // Update connection state in Redux
        dispatch(setConnection({ connectionState: state }));
        
        // Provide user-friendly status messages
        if (state === 'connecting') {
          dispatch(updateVoiceStatus({ status: '🔄 Establishing secure connection...' }));
        } else if (state === 'connected') {
          dispatch(setConnected(true));
          dispatch(updateVoiceStatus({ 
            status: '✅ Connected! Ready for medical interpretation...', 
            isError: false 
          }));
          dispatch(showIntent());
        } else if (state === 'failed') {
          dispatch(setConnection({ connectionState: 'failed' }));
          const errorDetails = handleWebRTCError(new Error('WebRTC connection failed'));
          dispatch(updateVoiceStatus({ 
            status: errorDetails.userMessage, 
            isError: true 
          }));
          dispatch(setConnected(false));
        }
      });
      
      // Update status for microphone access
      dispatch(updateVoiceStatus({ 
        status: '🎤 Requesting microphone access - please allow when prompted...' 
      }));
      
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
      
      // Emergency timeout will be started per response
      console.log('🛡️ Anti-stuck system ready');
      
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
      // Reset connection state on error
      dispatch(setConnection({ 
        sessionId: null, 
        isConnected: false, 
        connectionState: 'failed' 
      }));
      
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
    generateSummaryOnly,
    summarizeAndEndConversation,
    forceCompleteIncompleteTranslations,
    // Add error handler helpers for external use
    checkBrowserSupport
  };
}; 