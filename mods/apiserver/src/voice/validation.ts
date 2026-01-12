import { z } from 'zod';

// E.164 phone number regex: starts with +, followed by 1-15 digits
const e164PhoneRegex = /^\+[1-9]\d{1,14}$/;

export const createVoiceCallSchema = z.object({
  phone: z.string().regex(e164PhoneRegex, 'Phone number must be in E.164 format (e.g., +17853178070)'),
  appRef: z.string().min(1, 'appRef must be a valid Fonoster Voice Application reference ID'),
  partialPrompt: z.string().optional(),
  webhook: z.string().url('webhook must be a valid URL').optional(),
  fromNumber: z.string().regex(e164PhoneRegex, 'fromNumber must be in E.164 format').optional()
});
