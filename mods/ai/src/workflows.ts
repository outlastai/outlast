import { getLogger } from '@outlast/logger';
import type { AgentExecutor } from 'langchain/agents';
import type { OrderContext, OrderAnalysis, FollowUpDecision } from './types';

interface WorkflowDependencies {
  agent: AgentExecutor;
  logger: ReturnType<typeof getLogger>;
}

/**
 * Workflow orchestrator for agent tasks
 * These are high-level workflows that use the agent
 */
export function createWorkflows(dependencies: WorkflowDependencies) {
  const { agent, logger } = dependencies;

  return {
    /**
     * Analyze an order and determine if follow-up is needed
     * This is the main workflow for the agent
     */
    async analyzeOrder(orderId: string): Promise<OrderAnalysis> {
      logger.info('Starting order analysis workflow', { orderId });

      const prompt = `Analyze order ${orderId} and determine if follow-up is needed.

Steps:
1. Get the order details using get_order
2. Get the order history using get_order_history
3. Analyze:
   - How many days since the last update?
   - How many follow-up attempts have been made?
   - What was the last communication channel used?
   - What is the provider's preferred channel?
   - What is the order priority?
4. Make a decision: should we follow up? If yes, which channel and what message?
5. Record your analysis using create_order_history with:
   - type: AI_ANALYSIS
   - aiSummary: Clear summary of the situation
   - context: { daysSinceLastUpdate, followUpCount, lastChannel, etc. }
   - metadata: { shouldFollowUp, recommendedChannel, confidence, reasoning }

Return a clear analysis with your recommendation.`;

      const result = await agent.invoke({ input: prompt });

      logger.info('Order analysis completed', {
        orderId,
        resultLength: result.output.length
      });

      // Parse the result to extract structured data
      // In a real implementation, you might want the agent to return structured JSON
      return this.parseAnalysisResult(result.output, orderId);
    },

    /**
     * Get order context (order + history + follow-ups)
     * Helper workflow to gather all context for analysis
     */
    async getOrderContext(orderId: string): Promise<OrderContext> {
      logger.info('Getting order context', { orderId });

      const prompt = `Get complete context for order ${orderId}:
1. Get order details using get_order
2. Get order history using get_order_history
3. Return a summary of the order, its history, and any follow-ups

Format the response clearly showing:
- Order details (status, priority, dates)
- Provider information
- Recent history entries
- Follow-up attempts`;

      await agent.invoke({ input: prompt });

      // In a real implementation, you'd parse this into structured OrderContext
      // For now, this is a placeholder
      logger.info('Order context retrieved', { orderId });
      return {} as OrderContext; // Placeholder
    },

    /**
     * Make a follow-up decision for an order
     * Uses the agent to decide if, when, and how to follow up
     */
    async decideFollowUp(orderId: string): Promise<FollowUpDecision> {
      logger.info('Making follow-up decision', { orderId });

      const prompt = `Decide if we should follow up on order ${orderId}.

1. Get order and history
2. Analyze the situation
3. Decide:
   - Should we follow up? (consider time since last update, attempt count, etc.)
   - Which channel? (consider provider preference and previous attempts)
   - What message? (be professional, concise, and action-oriented)
   - What priority? (based on urgency)

Record your decision in order history with type AI_ANALYSIS.`;

      const result = await agent.invoke({ input: prompt });

      logger.info('Follow-up decision made', { orderId });
      return this.parseFollowUpDecision(result.output);
    },

    /**
     * Parse analysis result from agent output
     * This is a helper - in production you might want structured output
     */
    parseAnalysisResult(output: string, orderId: string): OrderAnalysis {
      // Placeholder - in real implementation, parse structured JSON from agent
      // or use Langchain's structured output features
      return {
        orderId,
        shouldFollowUp: false,
        confidence: 0.5,
        reasoning: output,
        daysSinceLastUpdate: 0,
        followUpCount: 0,
        riskLevel: 'LOW'
      };
    },

    /**
     * Parse follow-up decision from agent output
     */
    parseFollowUpDecision(output: string): FollowUpDecision {
      // Placeholder - parse structured output
      return {
        shouldFollowUp: false,
        channel: 'EMAIL',
        message: '',
        priority: 'NORMAL',
        reasoning: output
      };
    }
  };
}

