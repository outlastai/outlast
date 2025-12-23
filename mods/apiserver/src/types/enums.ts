// Type definitions for enums (stored as strings in SQLite)

export type CommunicationChannel = 'SMS' | 'EMAIL' | 'VOICE';

export type OrderStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'DELAYED' | 'CANCELLED';

export type OrderPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type OrderHistoryType =
  | 'AI_ANALYSIS'
  | 'FOLLOW_UP_SENT'
  | 'RESPONSE_RECEIVED'
  | 'STATUS_UPDATE'
  | 'MANUAL_ENTRY'
  | 'SYSTEM_EVENT';

export type EscalationReason =
  | 'MAX_ATTEMPTS'
  | 'MANUAL'
  | 'URGENT'
  | 'NO_RESPONSE'
  | 'SYSTEM_ERROR';

export type EscalationStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';

