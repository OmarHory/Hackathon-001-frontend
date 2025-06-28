import { Session, Message, ConversationSummary } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Helper method for making HTTP requests
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);
      
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error: ${response.status} - ${errorText}`);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ API Response: ${url}`, data);
      return data;
    } catch (error) {
      console.error(`💥 API Request Failed: ${url}`, error);
      throw error;
    }
  }

  // Session Management
  async createSession(): Promise<Session> {
    return this.request<Session>('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        started_at: new Date().toISOString(),
        is_active: true
      })
    });
  }

  async getSession(sessionId: string): Promise<Session> {
    return this.request<Session>(`/sessions/${sessionId}`);
  }

  async endSession(sessionId: string): Promise<Session> {
    return this.request<Session>(`/sessions/${sessionId}/end`, {
      method: 'POST'
    });
  }

  async getSessions(limit: number = 10): Promise<{ sessions: Session[] }> {
    return this.request<{ sessions: Session[] }>(`/sessions?limit=${limit}`);
  }

  // Message Management
  async saveMessage(sessionId: string, message: {
    messageType: 'user' | 'assistant' | 'system';
    content: string;
    originalLang?: 'English' | 'Spanish';
    translatedLang?: 'English' | 'Spanish';
  }): Promise<Message> {
    return this.request<Message>(`/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        message_type: message.messageType,
        content: message.content,
        original_lang: message.originalLang,
        translated_lang: message.translatedLang,
        timestamp: new Date().toISOString()
      })
    });
  }

  async getMessages(sessionId: string): Promise<{ messages: Message[] }> {
    return this.request<{ messages: Message[] }>(`/sessions/${sessionId}/messages`);
  }

  // Medical Summary
  async generateSummary(sessionId: string): Promise<{ summary: ConversationSummary }> {
    return this.request<{ summary: ConversationSummary }>(`/sessions/${sessionId}/medical-summary`, {
      method: 'POST'
    });
  }

  async getSummary(sessionId: string): Promise<{ summary: ConversationSummary }> {
    return this.request<{ summary: ConversationSummary }>(`/sessions/${sessionId}/summary`);
  }

  // Medical Actions (Function Calls)
  async sendLabOrder(sessionId: string, data: {
    testsOrdered: string[];
    patientId?: string;
    clinicianId?: string;
  }): Promise<{ success: boolean; orderId: string }> {
    return this.request<{ success: boolean; orderId: string }>('/medical/lab-orders', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        tests_ordered: data.testsOrdered,
        patient_id: data.patientId,
        clinician_id: data.clinicianId,
        timestamp: new Date().toISOString()
      })
    });
  }

  async scheduleAppointment(sessionId: string, data: {
    appointmentType: string;
    timeframe: string;
    patientId?: string;
    clinicianId?: string;
  }): Promise<{ success: boolean; appointmentId: string }> {
    return this.request<{ success: boolean; appointmentId: string }>('/medical/appointments', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        appointment_type: data.appointmentType,
        timeframe: data.timeframe,
        patient_id: data.patientId,
        clinician_id: data.clinicianId,
        timestamp: new Date().toISOString()
      })
    });
  }

  // Function Call Webhook (for OpenAI Realtime API)
  async handleFunctionCall(data: {
    functionName: string;
    arguments: any;
    callId: string;
    sessionId: string;
  }): Promise<any> {
    return this.request('/webhook/function-call', {
      method: 'POST',
      body: JSON.stringify({
        function_name: data.functionName,
        arguments: data.arguments,
        call_id: data.callId,
        session_id: data.sessionId
      })
    });
  }

  // WebRTC Connection
  async createRTCConnection(sdpOffer: string): Promise<{
    sdpAnswer: string;
    sessionId: string;
  }> {
    const response = await fetch(`${this.baseUrl}/rtc-connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
      },
      body: sdpOffer
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WebRTC connection failed: ${response.status} - ${errorText}`);
    }

    const sessionId = response.headers.get('X-Session-ID');
    const sdpAnswer = await response.text();

    if (!sessionId) {
      throw new Error('No session ID received from server');
    }

    return {
      sdpAnswer,
      sessionId
    };
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }

  // Analytics & Metrics
  async getSessionMetrics(sessionId: string): Promise<{
    totalMessages: number;
    averageResponseTime: number;
    languageDistribution: { English: number; Spanish: number };
    medicalActionsCount: number;
  }> {
    return this.request(`/sessions/${sessionId}/metrics`);
  }

  async getSystemMetrics(): Promise<{
    totalSessions: number;
    activeSessions: number;
    averageSessionDuration: number;
    totalTranslations: number;
  }> {
    return this.request('/metrics/system');
  }
}

// Singleton instance
export const apiService = new ApiService();

// Helper functions for common operations
export const sessionAPI = {
  create: () => apiService.createSession(),
  get: (id: string) => apiService.getSession(id),
  end: (id: string) => apiService.endSession(id),
  list: (limit?: number) => apiService.getSessions(limit),
};

export const messageAPI = {
  save: (sessionId: string, message: any) => apiService.saveMessage(sessionId, message),
  list: (sessionId: string) => apiService.getMessages(sessionId),
};

export const medicalAPI = {
  generateSummary: (sessionId: string) => apiService.generateSummary(sessionId),
  getSummary: (sessionId: string) => apiService.getSummary(sessionId),
  sendLabOrder: (sessionId: string, data: any) => apiService.sendLabOrder(sessionId, data),
  scheduleAppointment: (sessionId: string, data: any) => apiService.scheduleAppointment(sessionId, data),
};

export const webrtcAPI = {
  connect: (sdpOffer: string) => apiService.createRTCConnection(sdpOffer),
  functionCall: (data: any) => apiService.handleFunctionCall(data),
};

export default apiService; 