interface ErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  timestamp: string;
}

export class ErrorHandlingService {
  private errorLog: ErrorDetails[] = [];
  private maxLogSize = 100;

  // Map of error types to user-friendly messages
  private errorMessages: Record<string, Partial<ErrorDetails>> = {
    // Network Errors
    NETWORK_ERROR: {
      code: 'NETWORK_ERROR',
      userMessage: '🌐 Connection problem. Please check your internet and try again.',
      severity: 'medium',
      retryable: true
    },
    API_TIMEOUT: {
      code: 'API_TIMEOUT',
      userMessage: '⏱️ Request timed out. The server might be busy, please try again.',
      severity: 'medium',
      retryable: true
    },
    API_SERVER_ERROR: {
      code: 'API_SERVER_ERROR',
      userMessage: '🔧 Server issue detected. Our team has been notified.',
      severity: 'high',
      retryable: true
    },
    API_RATE_LIMIT: {
      code: 'API_RATE_LIMIT',
      userMessage: '🚦 Too many requests. Please wait a moment and try again.',
      severity: 'medium',
      retryable: true
    },

    // WebRTC Errors
    MICROPHONE_ACCESS_DENIED: {
      code: 'MICROPHONE_ACCESS_DENIED',
      userMessage: '🎤 Microphone access is required for voice interpretation. Please allow microphone access and refresh the page.',
      severity: 'critical',
      retryable: false
    },
    WEBRTC_CONNECTION_FAILED: {
      code: 'WEBRTC_CONNECTION_FAILED',
      userMessage: '📡 Voice connection failed. Please check your internet connection and try again.',
      severity: 'high',
      retryable: true
    },
    WEBRTC_ICE_FAILED: {
      code: 'WEBRTC_ICE_FAILED',
      userMessage: '🧊 Network connectivity issue. Please check firewall settings or try a different network.',
      severity: 'high',
      retryable: true
    },
    HTTPS_REQUIRED: {
      code: 'HTTPS_REQUIRED',
      userMessage: '🔒 HTTPS is required for microphone access. Please use https:// instead of http://',
      severity: 'critical',
      retryable: false
    },
    MOBILE_AUTOPLAY_BLOCKED: {
      code: 'MOBILE_AUTOPLAY_BLOCKED',
      userMessage: '📱 Audio autoplay is blocked on mobile. Please tap the screen to enable audio.',
      severity: 'medium',
      retryable: true
    },
    MOBILE_MICROPHONE_BUSY: {
      code: 'MOBILE_MICROPHONE_BUSY',
      userMessage: '📱 Microphone is being used by another app. Please close other apps and try again.',
      severity: 'medium',
      retryable: true
    },

    // OpenAI/Session Errors
    OPENAI_API_ERROR: {
      code: 'OPENAI_API_ERROR',
      userMessage: '🤖 AI service temporarily unavailable. Please try again in a few moments.',
      severity: 'high',
      retryable: true
    },
    SESSION_EXPIRED: {
      code: 'SESSION_EXPIRED',
      userMessage: '⏰ Session expired. Please start a new medical interpretation session.',
      severity: 'medium',
      retryable: false
    },
    TRANSLATION_FAILED: {
      code: 'TRANSLATION_FAILED',
      userMessage: '🌐 Translation service error. Please speak again or restart the session.',
      severity: 'medium',
      retryable: true
    },

    // Medical Action Errors
    LAB_ORDER_FAILED: {
      code: 'LAB_ORDER_FAILED',
      userMessage: '🧪 Lab order submission failed. Please try again or contact IT support.',
      severity: 'high',
      retryable: true
    },
    APPOINTMENT_FAILED: {
      code: 'APPOINTMENT_FAILED',
      userMessage: '📅 Appointment scheduling failed. Please try again or use the manual booking system.',
      severity: 'high',
      retryable: true
    },

    // Database/Storage Errors
    DATABASE_ERROR: {
      code: 'DATABASE_ERROR',
      userMessage: '💾 Data storage issue. Your conversation is temporarily saved in memory.',
      severity: 'medium',
      retryable: true
    },
    SUMMARY_GENERATION_FAILED: {
      code: 'SUMMARY_GENERATION_FAILED',
      userMessage: '📋 Medical summary generation failed. Your conversation is still saved.',
      severity: 'medium',
      retryable: true
    },

    // Browser/Environment Errors
    BROWSER_NOT_SUPPORTED: {
      code: 'BROWSER_NOT_SUPPORTED',
      userMessage: '🌐 Please use Chrome, Firefox, Safari, or Edge for the best experience.',
      severity: 'critical',
      retryable: false
    },
    AUDIO_DEVICE_ERROR: {
      code: 'AUDIO_DEVICE_ERROR',
      userMessage: '🔊 Audio device issue. Please check your microphone/speakers and try again.',
      severity: 'medium',
      retryable: true
    },

    // Generic
    UNKNOWN_ERROR: {
      code: 'UNKNOWN_ERROR',
      userMessage: '❓ Something unexpected happened. Please refresh the page and try again.',
      severity: 'medium',
      retryable: true
    }
  };

  // Handle different types of errors
  handleError(error: any, context?: string): ErrorDetails {
    console.error(`💥 Error in ${context || 'application'}:`, error);

    const errorDetails = this.classifyError(error, context);
    this.logError(errorDetails);

    // Report critical errors
    if (errorDetails.severity === 'critical') {
      this.reportCriticalError(errorDetails);
    }

    return errorDetails;
  }

  // Classify error based on type and context
  private classifyError(error: any, context?: string): ErrorDetails {
    const timestamp = new Date().toISOString();
    
    // Network-related errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        ...this.errorMessages.NETWORK_ERROR,
        message: error.message,
        timestamp
      } as ErrorDetails;
    }

    // WebRTC errors
    if (context === 'webrtc') {
      // Check for HTTPS requirement
      if (error.message.includes('HTTPS') || error.message.includes('https://')) {
        return {
          ...this.errorMessages.HTTPS_REQUIRED,
          message: error.message,
          timestamp
        } as ErrorDetails;
      }

      if (error.name === 'NotAllowedError' || error.message.includes('microphone')) {
        // Check if mobile and provide mobile-specific guidance
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile && error.message.includes('used by another')) {
          return {
            ...this.errorMessages.MOBILE_MICROPHONE_BUSY,
            message: error.message,
            timestamp
          } as ErrorDetails;
        }
        
        return {
          ...this.errorMessages.MICROPHONE_ACCESS_DENIED,
          message: error.message,
          timestamp
        } as ErrorDetails;
      }
      
      if (error.message.includes('ICE') || error.message.includes('ice')) {
        return {
          ...this.errorMessages.WEBRTC_ICE_FAILED,
          message: error.message,
          timestamp
        } as ErrorDetails;
      }

      if (error.message.includes('autoplay')) {
        return {
          ...this.errorMessages.MOBILE_AUTOPLAY_BLOCKED,
          message: error.message,
          timestamp
        } as ErrorDetails;
      }

      return {
        ...this.errorMessages.WEBRTC_CONNECTION_FAILED,
        message: error.message,
        timestamp
      } as ErrorDetails;
    }

    // API errors
    if (error.message.includes('API Error')) {
      const statusCode = error.message.match(/(\d{3})/)?.[1];
      
      if (statusCode === '429') {
        return {
          ...this.errorMessages.API_RATE_LIMIT,
          message: error.message,
          timestamp
        } as ErrorDetails;
      }
      
      if (statusCode && parseInt(statusCode) >= 500) {
        return {
          ...this.errorMessages.API_SERVER_ERROR,
          message: error.message,
          timestamp
        } as ErrorDetails;
      }
    }

    // Medical action errors
    if (context === 'lab-order') {
      return {
        ...this.errorMessages.LAB_ORDER_FAILED,
        message: error.message,
        timestamp
      } as ErrorDetails;
    }

    if (context === 'appointment') {
      return {
        ...this.errorMessages.APPOINTMENT_FAILED,
        message: error.message,
        timestamp
      } as ErrorDetails;
    }

    // OpenAI/Translation errors
    if (context === 'translation' || error.message.includes('OpenAI')) {
      return {
        ...this.errorMessages.TRANSLATION_FAILED,
        message: error.message,
        timestamp
      } as ErrorDetails;
    }

    // Browser support check
    if (!window.RTCPeerConnection) {
      return {
        ...this.errorMessages.BROWSER_NOT_SUPPORTED,
        message: 'WebRTC not supported',
        timestamp
      } as ErrorDetails;
    }

    // Default unknown error
    return {
      ...this.errorMessages.UNKNOWN_ERROR,
      message: error.message || 'Unknown error occurred',
      timestamp
    } as ErrorDetails;
  }

  // Log error for debugging
  private logError(errorDetails: ErrorDetails): void {
    this.errorLog.unshift(errorDetails);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Console logging based on severity
    switch (errorDetails.severity) {
      case 'critical':
        console.error('🚨 CRITICAL ERROR:', errorDetails);
        break;
      case 'high':
        console.error('🔥 HIGH SEVERITY ERROR:', errorDetails);
        break;
      case 'medium':
        console.warn('⚠️ MEDIUM SEVERITY ERROR:', errorDetails);
        break;
      case 'low':
        console.log('ℹ️ LOW SEVERITY ERROR:', errorDetails);
        break;
    }
  }

  // Report critical errors (could integrate with error tracking service)
  private reportCriticalError(errorDetails: ErrorDetails): void {
    try {
      // In production, this could send to Sentry, LogRocket, etc.
      const errorReport = {
        ...errorDetails,
        userAgent: navigator.userAgent,
        url: window.location.href,
        stackTrace: new Error().stack
      };

      // For now, just enhanced console logging
      console.error('🚨 CRITICAL ERROR REPORT:', errorReport);
      
      // Could implement actual reporting here:
      // await fetch('/api/error-report', { method: 'POST', body: JSON.stringify(errorReport) });
    } catch (reportingError) {
      console.error('Failed to report critical error:', reportingError);
    }
  }

  // Get recovery suggestions based on error
  getRecoveryActions(errorCode: string): string[] {
    const actions: Record<string, string[]> = {
      MICROPHONE_ACCESS_DENIED: [
        'Click the microphone icon in your browser address bar',
        'Select "Allow" for microphone access',
        'Refresh the page and try again',
        'On mobile: Check Settings > Privacy > Microphone'
      ],
      HTTPS_REQUIRED: [
        'Use https:// instead of http:// in the URL',
        'Contact your administrator to enable HTTPS',
        'Try accessing from a secure connection'
      ],
      MOBILE_AUTOPLAY_BLOCKED: [
        'Tap anywhere on the screen to enable audio',
        'Check your browser autoplay settings',
        'Enable "Allow audio and video" in browser settings'
      ],
      MOBILE_MICROPHONE_BUSY: [
        'Close other apps that might be using the microphone',
        'End any active phone calls',
        'Check for voice recorder or camera apps running in background',
        'Restart your browser and try again'
      ],
      WEBRTC_CONNECTION_FAILED: [
        'Check your internet connection',
        'Try refreshing the page',
        'If on corporate network, contact IT about WebRTC/firewall settings',
        'Try switching to a different network (mobile hotspot)'
      ],
      WEBRTC_ICE_FAILED: [
        'Check your firewall settings',
        'Try connecting from a different network',
        'Contact IT support about opening ports 3478-3479',
        'If on VPN, try disconnecting temporarily'
      ],
      NETWORK_ERROR: [
        'Check your internet connection',
        'Try again in a few moments',
        'Contact your network administrator if issues continue'
      ],
      LAB_ORDER_FAILED: [
        'Try submitting the lab order again',
        'Use the manual lab ordering system as backup',
        'Contact IT support for assistance'
      ],
      APPOINTMENT_FAILED: [
        'Try scheduling the appointment again',
        'Use the manual appointment booking system',
        'Contact scheduling department directly'
      ]
    };

    return actions[errorCode] || [
      'Try refreshing the page',
      'Clear your browser cache',
      'Try using a different browser (Chrome, Firefox, Safari, or Edge)',
      'Contact technical support if the problem continues'
    ];
  }

  // Check if error is retryable
  isRetryable(errorCode: string): boolean {
    return this.errorMessages[errorCode]?.retryable || false;
  }

  // Get error log for debugging
  getErrorLog(): ErrorDetails[] {
    return [...this.errorLog];
  }

  // Clear error log
  clearErrorLog(): void {
    this.errorLog = [];
  }

  // Browser compatibility check
  checkBrowserCompatibility(): { compatible: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!window.RTCPeerConnection) {
      issues.push('WebRTC not supported');
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      issues.push('Media devices API not supported');
    }

    if (!window.AudioContext && !(window as any).webkitAudioContext) {
      issues.push('Web Audio API not supported');
    }

    if (!window.fetch) {
      issues.push('Fetch API not supported');
    }

    return {
      compatible: issues.length === 0,
      issues
    };
  }
}

// Singleton instance
export const errorHandler = new ErrorHandlingService();

// Helper functions for common error scenarios
export const handleNetworkError = (error: any) => 
  errorHandler.handleError(error, 'network');

export const handleWebRTCError = (error: any) => 
  errorHandler.handleError(error, 'webrtc');

export const handleTranslationError = (error: any) => 
  errorHandler.handleError(error, 'translation');

export const handleMedicalActionError = (error: any, actionType: 'lab-order' | 'appointment') => 
  errorHandler.handleError(error, actionType);

export default errorHandler; 