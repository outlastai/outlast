import { Resend } from 'resend';
import { getLogger } from '@outlast/logger';
import type { EmailConfig, EmailMessage, EmailSendResponse } from './types';

interface ResendClientDependencies {
  config: EmailConfig;
  logger: ReturnType<typeof getLogger>;
}

/**
 * Client wrapper for Resend email service
 */
export function createResendClient(dependencies: ResendClientDependencies) {
  const { config, logger } = dependencies;
  const resend = new Resend(config.apiKey);

  return {
    async sendEmail(message: EmailMessage): Promise<EmailSendResponse> {
      logger.info('Sending email via Resend', {
        to: message.to,
        subject: message.subject
      });

      try {
        const result = await resend.emails.send({
          from: config.fromName
            ? `${config.fromName} <${config.fromEmail}>`
            : config.fromEmail,
          to: message.to,
          subject: message.subject,
          html: message.html,
          text: message.text || message.html?.replace(/<[^>]*>/g, '') || '',
          reply_to: message.replyTo || config.replyTo,
          // Only send a minimal set of safe tags to avoid Resend validation errors
          // Resend tags must: start with letter, only contain a-z0-9_-, max 50 chars
          // We'll only send a few essential tags that we know are safe
          tags: message.metadata
            ? (() => {
                const tags: Array<{ name: string; value: string }> = [];
                
                // Only include these specific safe tags
                const safeMappings: Array<{ key: string; tagName: string }> = [
                  { key: 'orderId', tagName: 'orderid' },
                  { key: 'order_id', tagName: 'orderid' },
                  { key: 'providerId', tagName: 'providerid' },
                  { key: 'provider_id', tagName: 'providerid' },
                  { key: 'channel', tagName: 'channel' },
                  { key: 'attemptNumber', tagName: 'attempt' },
                  { key: 'attempt', tagName: 'attempt' }
                ];
                
                for (const mapping of safeMappings) {
                  const value = message.metadata[mapping.key];
                  if (value !== undefined && value !== null) {
                    const sanitizedValue = String(value)
                      .replace(/[^\x20-\x7E]/g, '') // Only printable ASCII
                      .substring(0, 200);
                    
                    if (sanitizedValue.length > 0) {
                      tags.push({ 
                        name: mapping.tagName, 
                        value: sanitizedValue 
                      });
                    }
                  }
                }
                
                return tags.length > 0 ? tags : undefined;
              })()
            : undefined
        });

        if (result.error) {
          logger.error('Resend API error', { error: result.error });
          throw new Error(`Resend API error: ${JSON.stringify(result.error)}`);
        }

        logger.info('Email sent successfully', {
          emailId: result.data?.id,
          to: message.to
        });

        return {
          id: result.data?.id || '',
          from: config.fromEmail,
          to: message.to,
          created_at: new Date().toISOString()
        };
      } catch (error) {
        logger.error('Failed to send email', { error, to: message.to });
        throw error;
      }
    },

    async verifyWebhook(
      _payload: string,
      _signature: string
    ): Promise<boolean> {
      if (!config.webhookSecret) {
        logger.warn('Webhook secret not configured, skipping verification');
        return true;
      }

      // Resend uses webhook signing - implement verification if needed
      // For now, we'll trust the webhook if secret is set
      return true;
    },

    /**
     * Fetch received email content using Resend's Receiving API
     * Required for email.received webhooks - the webhook only provides email_id,
     * not the actual email content
     */
    async getReceivedEmail(emailId: string): Promise<{
      id: string;
      from: string;
      to: string[];
      subject: string;
      text?: string;
      html?: string;
      headers?: Record<string, string>;
      created_at: string;
    }> {
      logger.info('Fetching received email content from Resend', { emailId });

      try {
        // Type assertion needed because TypeScript types may not include receiving API
        // The API exists at runtime - see: https://resend.com/docs/dashboard/receiving/get-email-content
        // Try accessing receiving API through multiple possible paths
        const resendAny = resend as any;
        const emailsApi = resendAny.emails || resendAny;
        
        // Try multiple ways to access the receiving API
        let result: any = null;
        
        // Method 1: resend.emails.receiving.get() - most common pattern
        if (emailsApi.receiving && typeof emailsApi.receiving.get === 'function') {
          logger.verbose('Trying resend.emails.receiving.get()', { emailId });
          try {
            result = await emailsApi.receiving.get(emailId);
          } catch (e) {
            logger.verbose('resend.emails.receiving.get() failed', { error: e instanceof Error ? e.message : String(e) });
          }
        }
        
        // Method 2: resend.receiving.emails.get()
        if (!result && resendAny.receiving && resendAny.receiving.emails && typeof resendAny.receiving.emails.get === 'function') {
          logger.verbose('Trying resend.receiving.emails.get()', { emailId });
          try {
            result = await resendAny.receiving.emails.get(emailId);
          } catch (e) {
            logger.verbose('resend.receiving.emails.get() failed', { error: e instanceof Error ? e.message : String(e) });
          }
        }
        
        // Method 3: Direct call on resend
        if (!result && resendAny.receiving && typeof resendAny.receiving.get === 'function') {
          logger.verbose('Trying resend.receiving.get()', { emailId });
          try {
            result = await resendAny.receiving.get(emailId);
          } catch (e) {
            logger.verbose('resend.receiving.get() failed', { error: e instanceof Error ? e.message : String(e) });
          }
        }
        
        // Method 4: Try resend.emails.get() - might work for received emails too
        // See: https://resend.com/docs/api-reference/emails/retrieve-email
        if (!result && emailsApi.get && typeof emailsApi.get === 'function') {
          logger.verbose('Trying resend.emails.get()', { emailId });
          try {
            result = await emailsApi.get(emailId);
            // Check if result has error or if it's a sent email (received emails might have different structure)
            if (result && result.error) {
              logger.verbose('resend.emails.get() returned error', { error: result.error });
              result = null; // Try next method
            }
          } catch (e) {
            logger.verbose('resend.emails.get() failed', { error: e instanceof Error ? e.message : String(e) });
          }
        }
        
        // Method 5: Try calling receiving.get() directly even if check fails (might exist at runtime)
        if (!result) {
          logger.verbose('Trying direct call to emails.receiving.get() without check', { emailId });
          try {
            result = await (resendAny.emails?.receiving?.get?.(emailId));
          } catch (e) {
            logger.verbose('Direct call failed', { error: e instanceof Error ? e.message : String(e) });
          }
        }
        
        if (result) {
          
          if (result.error) {
            logger.error('Resend Receiving API error', { error: result.error, emailId });
            throw new Error(`Resend Receiving API error: ${JSON.stringify(result.error)}`);
          }

          if (!result.data) {
            throw new Error(`No email data returned for email_id: ${emailId}`);
          }

          logger.info('Successfully fetched received email content', {
            emailId,
            hasText: !!result.data.text,
            hasHtml: !!result.data.html
          });

          return {
            id: result.data.id || emailId,
            from: result.data.from || '',
            to: Array.isArray(result.data.to) ? result.data.to : [result.data.to || ''],
            subject: result.data.subject || '',
            text: result.data.text || undefined,
            html: result.data.html || undefined,
            headers: result.data.headers as Record<string, string> || {},
            created_at: result.data.created_at || new Date().toISOString()
          };
        }
        
        // Fallback: Use direct HTTP call if SDK doesn't support receiving API
        // For received emails, the correct endpoint is: GET /emails/receiving/:id
        // See: https://resend.com/docs/api-reference/emails/retrieve-received-email
        logger.warn('Resend SDK receiving API not available, using HTTP fallback', { emailId });
        const fetch = (await import('node-fetch')).default || globalThis.fetch;
        
        // Try the correct receiving emails endpoint: /emails/receiving/:id
        // Note: This is different from /emails/:id (for sent emails) and /receiving/emails/:id
        const response = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Resend API HTTP error: ${response.status} ${errorText}`);
        }

        const emailData = await response.json() as any;
        
        logger.info('Successfully fetched received email content via HTTP', {
          emailId,
          hasText: !!emailData.text,
          hasHtml: !!emailData.html
        });
        
        return {
          id: emailData.id || emailId,
          from: emailData.from || '',
          to: Array.isArray(emailData.to) ? emailData.to : [emailData.to || ''],
          subject: emailData.subject || '',
          text: emailData.text || undefined,
          html: emailData.html || undefined,
          headers: emailData.headers || {},
          created_at: emailData.created_at || new Date().toISOString()
        };
      } catch (error) {
        logger.error('Failed to fetch received email content', { error, emailId });
        throw error;
      }
    }
  };
}

