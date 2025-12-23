import { PrismaClient } from '@prisma/client';
import { getLogger } from '@outlast/logger';
import { NotFoundError } from '@outlast/common';
import type { OrderResponse } from '../orders/types';
import type { FollowUpDecision } from '@outlast/ai';
import type { createFollowUpService } from '../follow-ups/follow-up-service';
import type { createOrderHistoryService } from '../order-history/order-history-service';
import type { OrderAnalysisContext, SchedulerResult, SchedulerOrderResult, StaticPreCheckResult } from './types';
import type { SchedulerConfig } from './types';
import type { OrderStatus, OrderPriority, OrderHistoryType, CommunicationChannel } from '../types/enums';

interface SchedulerServiceDependencies {
  prisma: PrismaClient;
  aiWorkflows: {
    analyzeOrder: (orderId: string) => Promise<{ shouldFollowUp: boolean; reasoning: string }>;
    decideFollowUp: (orderId: string) => Promise<FollowUpDecision>;
  };
  followUpService: ReturnType<typeof createFollowUpService>;
  orderHistoryService: ReturnType<typeof createOrderHistoryService>;
  config: SchedulerConfig;
  logger: ReturnType<typeof getLogger>;
}

/**
 * Scheduler service for automated follow-up processing
 * Finds orders needing analysis and executes follow-ups via AI agent
 */
export function createSchedulerService(
  dependencies: SchedulerServiceDependencies
) {
  const { prisma, aiWorkflows, followUpService, orderHistoryService, config, logger } = dependencies;

  /**
   * Static pre-check: Determine if we should call AI or can make a static decision
   * This avoids unnecessary AI calls and token usage
   */
  function staticPreCheck(context: OrderAnalysisContext): StaticPreCheckResult {
      const { order, followUpCount, daysSinceLastUpdate, daysSinceLastFollowUp } = context;
      const now = new Date();

      // Check 1: Already at max attempts - skip AI, just escalate if needed
      if (followUpCount >= config.maxFollowUpAttempts) {
        return {
          shouldProceed: false,
          shouldFollowUp: false,
          reason: 'MAX_ATTEMPTS_REACHED',
          skipAI: true
        };
      }

      // Check 2: Too soon since last follow-up - skip entirely
      if (daysSinceLastFollowUp < config.minDaysBetweenFollowUps) {
        return {
          shouldProceed: false,
          shouldFollowUp: false,
          reason: `TOO_SOON_SINCE_LAST_FOLLOWUP (${daysSinceLastFollowUp} days < ${config.minDaysBetweenFollowUps})`,
          skipAI: true
        };
      }

      // Check 3: Order just created (less than 1 day) - probably too early
      const daysSinceCreation = Math.floor(
        (now.getTime() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceCreation < 1) {
        return {
          shouldProceed: false,
          shouldFollowUp: false,
          reason: 'ORDER_TOO_RECENT',
          skipAI: true
        };
      }

      // Check 4: Order recently updated (less than 1 day) - might have new info, skip follow-up
      const daysSinceUpdate = Math.floor(
        (now.getTime() - order.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceUpdate < 1 && daysSinceLastUpdate < 1) {
        return {
          shouldProceed: false,
          shouldFollowUp: false,
          reason: 'ORDER_RECENTLY_UPDATED',
          skipAI: true
        };
      }

      // Check 5: High priority + enough time passed = likely should follow up
      // But we still want AI to craft the message, so proceed
      if (order.priority === 'URGENT' && daysSinceLastFollowUp >= config.minDaysBetweenFollowUps) {
        return {
          shouldProceed: true,
          shouldFollowUp: true, // Hint that we likely should, but AI confirms
          reason: 'URGENT_PRIORITY_CHECK',
          skipAI: false // Still use AI for message crafting
        };
      }

      // Check 6: Low priority + not much time passed = probably skip
      if (order.priority === 'LOW' && daysSinceLastFollowUp < config.minDaysBetweenFollowUps * 2) {
        return {
          shouldProceed: false,
          shouldFollowUp: false,
          reason: 'LOW_PRIORITY_TOO_SOON',
          skipAI: true
        };
      }

      // Check 7: No follow-ups yet + enough time since creation = likely should follow up
      // But use AI to determine best timing and message
      if (followUpCount === 0 && daysSinceCreation >= config.minDaysBetweenFollowUps) {
        return {
          shouldProceed: true,
          shouldFollowUp: true, // Hint
          reason: 'FIRST_FOLLOWUP_CANDIDATE',
          skipAI: false
        };
      }

      // Default: Proceed to AI for decision
      // AI will analyze context, history, and make nuanced decision
      return {
        shouldProceed: true,
        shouldFollowUp: false, // Unknown, let AI decide
        reason: 'NEEDS_AI_ANALYSIS',
        skipAI: false
      };
  }

  return {
    /**
     * Static pre-check: Determine if we should call AI or can make a static decision
     */
    staticPreCheck,

    /**
     * Find orders that need follow-up analysis
     * Returns orders that:
     * - Are in enabled statuses (PENDING, IN_TRANSIT, DELAYED)
     * - Haven't been analyzed recently
     * - Haven't exceeded max attempts
     */
    async findOrdersNeedingAnalysis(): Promise<OrderResponse[]> {
      logger.info('Finding orders needing analysis', {
        enabledStatuses: config.enabledStatuses,
        batchSize: config.batchSize
      });

      // Get orders in enabled statuses
      const orders = await prisma.order.findMany({
        where: {
          status: {
            in: config.enabledStatuses
          }
        },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              preferredChannel: true
            }
          },
          followUps: {
            orderBy: { timestamp: 'desc' },
            take: 1
          },
          history: {
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        },
        take: config.batchSize,
        orderBy: { updatedAt: 'asc' } // Process oldest first
      });

      // Filter orders that need analysis
      const now = new Date();
      const ordersNeedingAnalysis: OrderResponse[] = [];

      for (const order of orders) {
        const lastFollowUp = order.followUps[0];
        // const lastHistory = order.history[0]; // Not used currently

        // Skip if too many attempts
        if (order.followUps.length >= config.maxFollowUpAttempts) {
          logger.verbose('Skipping order - max attempts reached', {
            orderId: order.id,
            attempts: order.followUps.length
          });
          continue;
        }

        // Check if enough time has passed since last follow-up
        if (lastFollowUp) {
          const daysSinceLastFollowUp = Math.floor(
            (now.getTime() - lastFollowUp.timestamp.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysSinceLastFollowUp < config.minDaysBetweenFollowUps) {
            logger.verbose('Skipping order - too soon since last follow-up', {
              orderId: order.id,
              daysSince: daysSinceLastFollowUp
            });
            continue;
          }
        }

        // Map to OrderResponse format
        ordersNeedingAnalysis.push({
          id: order.id,
          orderId: order.orderId,
          partName: order.partName,
          componentDescription: order.componentDescription,
          subSystem: order.subSystem,
          providerId: order.providerId,
          provider: {
            id: order.provider.id,
            name: order.provider.name,
            preferredChannel: order.provider.preferredChannel
          },
          status: order.status as OrderStatus,
          orderedDate: order.orderedDate,
          expectedDeliveryDate: order.expectedDeliveryDate,
          leadTimeWeeks: order.leadTimeWeeks,
          priority: order.priority as OrderPriority | null,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        });
      }

      logger.info('Found orders needing analysis', {
        total: orders.length,
        needingAnalysis: ordersNeedingAnalysis.length
      });

      return ordersNeedingAnalysis;
    },

    /**
     * Build analysis context for an order
     */
    async buildAnalysisContext(orderId: string): Promise<OrderAnalysisContext> {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              preferredChannel: true
            }
          },
          followUps: {
            orderBy: { timestamp: 'desc' },
            take: 1
          },
          history: {
            orderBy: { timestamp: 'desc' },
            take: 10
          }
        }
      });

      if (!order) {
        throw new NotFoundError('Order', orderId);
      }

      const now = new Date();
      const lastHistory = order.history[0];
      const lastFollowUp = order.followUps[0];

      const daysSinceLastUpdate = lastHistory
        ? Math.floor((now.getTime() - lastHistory.timestamp.getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((now.getTime() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      const daysSinceLastFollowUp = lastFollowUp
        ? Math.floor((now.getTime() - lastFollowUp.timestamp.getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;

      return {
        order: {
          id: order.id,
          orderId: order.orderId,
          partName: order.partName,
          componentDescription: order.componentDescription,
          subSystem: order.subSystem,
          providerId: order.providerId,
          provider: {
            id: order.provider.id,
            name: order.provider.name,
            preferredChannel: order.provider.preferredChannel
          },
          status: order.status as OrderStatus,
          orderedDate: order.orderedDate,
          expectedDeliveryDate: order.expectedDeliveryDate,
          leadTimeWeeks: order.leadTimeWeeks,
          priority: order.priority as OrderPriority | null,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        },
        history: order.history.map(h => {
          let context: Record<string, unknown> | null = null;
          let metadata: Record<string, unknown> | null = null;
          let rawData: Record<string, unknown> | null = null;

          try {
            context = h.context ? (JSON.parse(h.context) as Record<string, unknown>) : null;
          } catch (error) {
            logger.warn('Failed to parse history context', {
              historyId: h.id,
              error: error instanceof Error ? error.message : String(error)
            });
          }

          try {
            metadata = h.metadata ? (JSON.parse(h.metadata) as Record<string, unknown>) : null;
          } catch (error) {
            logger.warn('Failed to parse history metadata', {
              historyId: h.id,
              error: error instanceof Error ? error.message : String(error)
            });
          }

          try {
            rawData = h.rawData ? (JSON.parse(h.rawData) as Record<string, unknown>) : null;
          } catch (error) {
            logger.warn('Failed to parse history rawData', {
              historyId: h.id,
              error: error instanceof Error ? error.message : String(error)
            });
          }

          return {
            id: h.id,
            orderId: h.orderId,
            type: h.type as OrderHistoryType,
            timestamp: h.timestamp,
            aiSummary: h.aiSummary,
            context,
            metadata,
            rawData,
            conversationTurn: h.conversationTurn
          };
        }),
        followUpCount: order.followUps.length,
        daysSinceLastUpdate,
        daysSinceLastFollowUp,
        lastFollowUpChannel: lastFollowUp?.channel
      };
    },

    /**
     * Process a single order through the scheduler
     */
    async processOrder(orderId: string): Promise<SchedulerOrderResult> {
      const result: SchedulerOrderResult = {
        orderId,
        orderIdExternal: '',
        processed: false,
        followUpSent: false,
        escalated: false
      };

      try {
        logger.info('Processing order', { orderId });

        // Get order context
        const context = await this.buildAnalysisContext(orderId);
        result.orderIdExternal = context.order.orderId;

        // STATIC PRE-CHECK: Avoid AI call if we can determine without it
        const preCheck = staticPreCheck(context);
        
        if (!preCheck.shouldProceed) {
          logger.info('Skipping order based on static pre-check', {
            orderId,
            reason: preCheck.reason,
            shouldFollowUp: preCheck.shouldFollowUp
          });

          // Record static decision in history (no AI needed)
          await orderHistoryService.createOrderHistory({
            orderId,
            type: 'AI_ANALYSIS',
            aiSummary: `Static pre-check: ${preCheck.reason}. No follow-up needed.`,
            context: {
              daysSinceLastUpdate: context.daysSinceLastUpdate,
              daysSinceLastFollowUp: context.daysSinceLastFollowUp,
              followUpCount: context.followUpCount,
              lastChannel: context.lastFollowUpChannel,
              staticCheck: true
            },
            metadata: {
              shouldFollowUp: false,
              reason: preCheck.reason,
              usedAI: false,
              staticDecision: true
            }
          });

          result.processed = true;
          result.skippedReason = preCheck.reason;
          result.usedAI = false;
          return result;
        }

        // If we have a static hint but still want AI for message crafting
        let decision: FollowUpDecision;
        if (preCheck.skipAI && preCheck.shouldFollowUp === false) {
          // We already determined no follow-up needed
          logger.info('Static decision: no follow-up needed', {
            orderId,
            reason: preCheck.reason
          });
          
          decision = {
            shouldFollowUp: false,
            channel: context.order.provider.preferredChannel as CommunicationChannel,
            message: '',
            priority: context.order.priority || 'NORMAL',
            reasoning: preCheck.reason
          };
          result.usedAI = false;
        } else {
          // Use AI to analyze and decide (or craft message for static decision)
          logger.info('Calling AI for analysis', {
            orderId,
            staticHint: preCheck.shouldFollowUp ? 'likely_should_followup' : 'unknown'
          });
          decision = await aiWorkflows.decideFollowUp(orderId);
          result.usedAI = true;
        }

        // Record AI analysis in history
        await orderHistoryService.createOrderHistory({
          orderId,
          type: 'AI_ANALYSIS',
          aiSummary: decision.reasoning || 'AI analyzed order for follow-up',
          context: {
            daysSinceLastUpdate: context.daysSinceLastUpdate,
            daysSinceLastFollowUp: context.daysSinceLastFollowUp,
            followUpCount: context.followUpCount,
            lastChannel: context.lastFollowUpChannel
          },
          metadata: {
            shouldFollowUp: decision.shouldFollowUp,
            recommendedChannel: decision.channel,
            priority: decision.priority,
            confidence: decision.reasoning ? 'HIGH' : 'MEDIUM',
            usedAI: result.usedAI,
            staticPreCheck: preCheck.reason
          }
        });

        result.processed = true;

        // Execute follow-up if agent decides to
        if (decision.shouldFollowUp && decision.message) {
          logger.info('Agent decided to send follow-up', {
            orderId,
            channel: decision.channel,
            priority: decision.priority
          });

          await followUpService.sendFollowUp({
            orderId,
            channel: decision.channel,
            message: decision.message,
            metadata: {
              priority: decision.priority,
              scheduled: true,
              aiGenerated: true
            }
          });

          result.followUpSent = true;

          // Check for escalation
          if (context.followUpCount + 1 >= config.escalationThreshold) {
            logger.warn('Creating escalation - threshold reached', {
              orderId,
              attempts: context.followUpCount + 1
            });

            await prisma.escalation.create({
              data: {
                orderId,
                reason: 'MAX_ATTEMPTS',
                status: 'PENDING',
                notes: `Automated escalation after ${context.followUpCount + 1} follow-up attempts`
              }
            });

            result.escalated = true;
          }
        } else {
          logger.info('Agent decided not to follow up', {
            orderId,
            reasoning: decision.reasoning
          });
        }
      } catch (error) {
        logger.error('Error processing order', { orderId, error });
        result.error = error instanceof Error ? error.message : String(error);
      }

      return result;
    },

    /**
     * Run the scheduler - process all orders needing analysis
     */
    async run(): Promise<SchedulerResult> {
      logger.info('Starting scheduler run');

      const result: SchedulerResult = {
        processed: 0,
        followUpsSent: 0,
        escalationsCreated: 0,
        errors: 0,
        details: []
      };

      try {
        // Find orders needing analysis
        const orders = await this.findOrdersNeedingAnalysis();

        logger.info('Processing orders', { count: orders.length });

        // Process each order
        for (const order of orders) {
          const orderResult = await this.processOrder(order.id);
          result.details.push(orderResult);

          if (orderResult.processed) {
            result.processed++;
          }
          if (orderResult.followUpSent) {
            result.followUpsSent++;
          }
          if (orderResult.escalated) {
            result.escalationsCreated++;
          }
          if (orderResult.error) {
            result.errors++;
          }
        }

        logger.info('Scheduler run completed', {
          processed: result.processed,
          followUpsSent: result.followUpsSent,
          escalationsCreated: result.escalationsCreated,
          errors: result.errors
        });
      } catch (error) {
        logger.error('Scheduler run failed', { error });
        result.errors++;
      }

      return result;
    }
  };
}

