export interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
  webhookSecret?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  metadata?: Record<string, unknown>;
}

export interface EmailSendResponse {
  id: string;
  from: string;
  to: string;
  created_at: string;
}

export interface EmailWebhookEvent {
  type: 'email.sent' | 'email.delivered' | 'email.delivery_delayed' | 'email.complained' | 'email.bounced' | 'email.opened' | 'email.clicked';
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    [key: string]: unknown;
  };
}

