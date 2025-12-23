/**
 * Example usage of the OutLast AI Agent
 * 
 * This demonstrates how to set up and use the agent for order analysis
 */

// Load environment variables from root .env file
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

const rootEnvPath = resolve(__dirname, '../../../.env');
if (existsSync(rootEnvPath)) {
  config({ path: rootEnvPath });
} else {
  // Fallback to local .env if root doesn't exist
  config();
}

import { createApiClient, createTools, createAgent, createWorkflows } from './index';
import { getLogger } from '@outlast/logger';

async function main() {
  const logger = getLogger({ service: 'ai-example', filePath: __filename });

  // Configuration
  const config = {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4',
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000'
  };

  if (!config.apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  logger.info('Initializing OutLast AI Agent', { model: config.model });

  // 1. Create API client
  const apiClient = createApiClient(config.apiBaseUrl);
  logger.info('API client created', { baseUrl: config.apiBaseUrl });

  // 2. Create tools
  const tools = createTools({ apiClient });
  logger.info('Tools created', { toolCount: tools.length });

  // 3. Create agent
  const agent = await createAgent({
    config,
    tools,
    logger
  });
  logger.info('Agent created successfully');

  // 4. Create workflows
  const workflows = createWorkflows({ agent, logger });

  // Example: Analyze an order
  const orderId = process.argv[2];
  
  if (!orderId) {
    console.error('\n❌ Error: Order ID required');
    console.error('Usage: npm run ai:example <order-id>');
    console.error('   or: ts-node mods/ai/src/example.ts <order-id>\n');
    process.exit(1);
  }
  
  logger.info('Starting order analysis', { orderId });
  
  try {
    console.log(`\n🔍 Analyzing order: ${orderId}\n`);
    console.log('This may take a moment as the agent analyzes the order...\n');
    
    const analysis = await workflows.analyzeOrder(orderId);
    logger.info('Analysis complete', {
      orderId: analysis.orderId,
      shouldFollowUp: analysis.shouldFollowUp,
      riskLevel: analysis.riskLevel
    });
    
    console.log('\n✅ === Order Analysis Complete ===\n');
    console.log(JSON.stringify(analysis, null, 2));
    console.log('\n💡 Check the order history to see the detailed analysis entry.\n');
  } catch (error) {
    logger.error('Analysis failed', { error, orderId });
    console.error('\n❌ Analysis failed:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}

