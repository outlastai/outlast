import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { getLogger } from '@outlast/logger';
import type { AgentConfig } from './types';
import type { createTools } from './tools';

interface AgentDependencies {
  config: AgentConfig;
  tools: ReturnType<typeof createTools>;
  logger: ReturnType<typeof getLogger>;
}

/**
 * System prompt for the OutLast agent
 * This defines the agent's role and capabilities
 */
const SYSTEM_PROMPT = `You are an AI agent for OutLast, a logistics follow-up automation system.

Your role is to:
1. Analyze orders and their history to determine if follow-up is needed
2. Make intelligent decisions about when and how to follow up with providers
3. Record your analysis and decisions in order history for future reference
4. Recommend appropriate communication channels and messages

Key principles:
- Always check order history before making decisions
- Consider the time since last update, follow-up count, and provider preferences
- Escalate to human agents when appropriate (e.g., after multiple failed attempts)
- Be concise but thorough in your analysis
- Store your reasoning in order history for transparency

Available tools:
- get_order: Get order details by UUID
- get_order_by_external_id: Get order by business order ID (e.g., ORD-123)
- list_orders: List orders with filters
- get_order_history: Get conversation history for an order
- create_order_history: Record your analysis and decisions
- update_order_status: Update order status when it changes

When analyzing an order:
1. First, get the order details
2. Get the order history to understand context
3. Analyze the situation (days since update, follow-up attempts, etc.)
4. Make a decision about follow-up
5. Record your analysis in order history with:
   - aiSummary: A clear summary of the situation
   - context: Structured data (days since update, follow-up count, etc.)
   - metadata: Your decision, confidence level, tools used, etc.

Be proactive but not annoying. Consider provider preferences and communication history.`;

/**
 * Create the Langchain agent with tools
 */
export async function createAgent(
  dependencies: AgentDependencies
): Promise<AgentExecutor> {
  const { config, tools, logger } = dependencies;

  logger.info('Creating Langchain agent', {
    model: config.model || 'gpt-4',
    temperature: config.temperature || 0.7
  });

  // Initialize the LLM
  const llm = new ChatOpenAI({
    modelName: config.model || 'gpt-4',
    temperature: config.temperature || 0.7,
    openAIApiKey: config.apiKey
  });

  // Create the prompt template
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', SYSTEM_PROMPT],
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad')
  ]);

  // Create the agent
  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools,
    prompt
  });

  // Create the executor
  const executor = new AgentExecutor({
    agent,
    tools,
    verbose: true,
    maxIterations: 15
  });

  logger.info('Agent created successfully');
  return executor;
}

