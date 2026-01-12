import { Client, Calls } from '@fonoster/sdk';
import { getLogger } from '@outlast/logger';
import type { VoiceCallRequest, VoiceCallResponse } from './types';

interface VoiceServiceDependencies {
  config: {
    workspaceAccessKeyId: string;
    accessKeyId: string;
    accessKeySecret: string;
    fromNumber?: string;
  };
  logger: ReturnType<typeof getLogger>;
}

/**
 * Creates a voice service following the closure pattern
 * Handles Fonoster authentication and call creation
 */
export function createVoiceService(
  dependencies: VoiceServiceDependencies
) {
  const { config, logger } = dependencies;
  let client: Client | null = null;
  let calls: Calls | null = null;
  let isAuthenticated = false;

  /**
   * Initialize and authenticate the Fonoster client
   */
  async function initialize(): Promise<void> {
    if (isAuthenticated && client && calls) {
      return;
    }

    try {
      logger.info('Initializing Fonoster client', {
        workspaceAccessKeyId: config.workspaceAccessKeyId.substring(0, 8) + '...'
      });

      client = new Client({ accessKeyId: config.workspaceAccessKeyId });
      await client.loginWithApiKey(config.accessKeyId, config.accessKeySecret);
      calls = new Calls(client);
      isAuthenticated = true;

      logger.info('Fonoster client authenticated successfully');
    } catch (error) {
      logger.error('Failed to authenticate Fonoster client', { error });
      isAuthenticated = false;
      client = null;
      calls = null;
      throw error;
    }
  }

  /**
   * Create a voice call using the Fonoster Calls API
   */
  async function createCall(
    request: VoiceCallRequest
  ): Promise<VoiceCallResponse> {
    if (!isAuthenticated || !calls) {
      await initialize();
    }

    if (!calls) {
      throw new Error('Fonoster client not initialized');
    }

    const fromNumber = request.fromNumber || config.fromNumber;
    if (!fromNumber) {
      throw new Error('FONOSTER_FROM_NUMBER must be set in environment variables or provided in request');
    }

    try {
      logger.info('Creating Fonoster call', {
        from: fromNumber,
        to: request.phone,
        appRef: request.appRef
      });

      // Build metadata object with only defined values
      const metadata: Record<string, string> = {};
      if (request.partialPrompt) {
        metadata.partialPrompt = request.partialPrompt;
      }
      if (request.webhook) {
        metadata.webhook = request.webhook;
      }

      const callOptions: {
        from: string;
        to: string;
        appRef: string;
        metadata?: Record<string, string>;
      } = {
        from: fromNumber,
        to: request.phone,
        appRef: request.appRef
      };

      // Only include metadata if it has values
      if (Object.keys(metadata).length > 0) {
        callOptions.metadata = metadata;
      }

      const response = await calls.createCall(callOptions);

      logger.info('Fonoster call created successfully', {
        callRef: response.ref
      });

      return {
        callRef: response.ref,
        status: 'INITIATED'
      };
    } catch (error) {
      logger.error('Failed to create Fonoster call', {
        error,
        from: fromNumber,
        to: request.phone,
        appRef: request.appRef
      });

      let errorMessage: string;
      if (error instanceof Error) {
        errorMessage = error.message;
        // Provide more helpful error messages for common issues
        if (errorMessage.includes('NOT_FOUND') || errorMessage.includes('not found')) {
          errorMessage = `Fonoster Voice Application not found. The appRef "${request.appRef}" does not exist in your Fonoster workspace. Please verify that the Voice Application exists and that you're using the correct application reference ID.`;
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = JSON.stringify(error);
      }

      return {
        callRef: '',
        status: 'FAILED',
        error: errorMessage
      };
    }
  }

  return {
    createCall
  };
}
