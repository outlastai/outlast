export interface VoiceCallRequest {
  phone: string; // E.164 formatted number
  appRef: string; // Fonoster Voice Application reference ID
  partialPrompt?: string; // Partial prompt to complement system prompt
  webhook?: string; // Webhook URL for callbacks (coming soon)
  fromNumber?: string; // E.164 formatted number to call from (optional, uses FONOSTER_FROM_NUMBER if not provided)
}

export interface VoiceCallResponse {
  callRef: string; // Call reference ID
  status: 'INITIATED' | 'FAILED';
  error?: string;
}
