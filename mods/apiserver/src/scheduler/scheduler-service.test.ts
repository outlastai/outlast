import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { PrismaClient } from '@prisma/client';
import { getLogger } from '@outlast/logger';
import { createSchedulerService } from './scheduler-service';
import type { SchedulerConfig, OrderAnalysisContext } from './types';
import type { createFollowUpService } from '../follow-ups/follow-up-service';
import type { createOrderHistoryService } from '../order-history/order-history-service';

use(chaiAsPromised);

describe('SchedulerService', () => {
  let sandbox: sinon.SinonSandbox;
  let service: ReturnType<typeof createSchedulerService>;
  let mockPrisma: sinon.SinonStubbedInstance<PrismaClient>;
  let mockAiWorkflows: {
    analyzeOrder: sinon.SinonStub;
    decideFollowUp: sinon.SinonStub;
  };
  let mockFollowUpService: sinon.SinonStubbedInstance<ReturnType<typeof createFollowUpService>>;
  let mockOrderHistoryService: sinon.SinonStubbedInstance<ReturnType<typeof createOrderHistoryService>>;
  let logger: ReturnType<typeof getLogger>;
  let config: SchedulerConfig;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    logger = getLogger({ service: 'test', filePath: __filename });

    config = {
      minDaysBetweenFollowUps: 7,
      maxFollowUpAttempts: 5,
      escalationThreshold: 3,
      batchSize: 50,
      enabledStatuses: ['PENDING', 'IN_TRANSIT', 'DELAYED']
    };

    const orderStub = {
      findMany: sandbox.stub(),
      findUnique: sandbox.stub()
    };

    const escalationStub = {
      create: sandbox.stub()
    };

    mockPrisma = {
      order: orderStub,
      escalation: escalationStub
    } as unknown as sinon.SinonStubbedInstance<PrismaClient>;

    mockAiWorkflows = {
      analyzeOrder: sandbox.stub(),
      decideFollowUp: sandbox.stub()
    };

    mockFollowUpService = {
      sendFollowUp: sandbox.stub()
    } as unknown as sinon.SinonStubbedInstance<ReturnType<typeof createFollowUpService>>;

    mockOrderHistoryService = {
      createOrderHistory: sandbox.stub()
    } as unknown as sinon.SinonStubbedInstance<ReturnType<typeof createOrderHistoryService>>;

    service = createSchedulerService({
      prisma: mockPrisma as unknown as PrismaClient,
      aiWorkflows: mockAiWorkflows as any,
      followUpService: mockFollowUpService as unknown as ReturnType<typeof createFollowUpService>,
      orderHistoryService: mockOrderHistoryService as unknown as ReturnType<typeof createOrderHistoryService>,
      config,
      logger
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#staticPreCheck', () => {
    const createContext = (overrides: Partial<OrderAnalysisContext> = {}): OrderAnalysisContext => {
      const now = new Date();
      const baseContext: OrderAnalysisContext = {
        order: {
          id: 'order-123',
          orderId: 'ORD-123',
          partName: 'Test Part',
          componentDescription: null,
          subSystem: null,
          providerId: 'provider-123',
          provider: {
            id: 'provider-123',
            name: 'Test Provider',
            preferredChannel: 'EMAIL'
          },
          status: 'PENDING',
          orderedDate: null,
          expectedDeliveryDate: null,
          leadTimeWeeks: null,
          priority: 'NORMAL',
          createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        },
        history: [],
        followUpCount: 0,
        daysSinceLastUpdate: 5,
        daysSinceLastFollowUp: Infinity,
        ...overrides
      };
      return baseContext;
    };

    it('should return MAX_ATTEMPTS_REACHED when followUpCount >= maxFollowUpAttempts', () => {
      const context = createContext({
        followUpCount: 5,
        daysSinceLastFollowUp: 10
      });

      const result = service.staticPreCheck(context);

      expect(result.shouldProceed).to.be.false;
      expect(result.shouldFollowUp).to.be.false;
      expect(result.reason).to.equal('MAX_ATTEMPTS_REACHED');
      expect(result.skipAI).to.be.true;
    });

    it('should return TOO_SOON_SINCE_LAST_FOLLOWUP when daysSinceLastFollowUp < minDaysBetweenFollowUps', () => {
      const context = createContext({
        followUpCount: 1,
        daysSinceLastFollowUp: 3 // Less than 7
      });

      const result = service.staticPreCheck(context);

      expect(result.shouldProceed).to.be.false;
      expect(result.shouldFollowUp).to.be.false;
      expect(result.reason).to.include('TOO_SOON_SINCE_LAST_FOLLOWUP');
      expect(result.skipAI).to.be.true;
    });

    it('should return ORDER_TOO_RECENT when order created less than 1 day ago', () => {
      const now = new Date();
      const context = createContext({
        order: {
          id: 'order-123',
          orderId: 'ORD-123',
          partName: 'Test Part',
          componentDescription: null,
          subSystem: null,
          providerId: 'provider-123',
          provider: {
            id: 'provider-123',
            name: 'Test Provider',
            preferredChannel: 'EMAIL'
          },
          status: 'PENDING',
          orderedDate: null,
          expectedDeliveryDate: null,
          leadTimeWeeks: null,
          priority: 'NORMAL',
          createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
          updatedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000)
        },
        followUpCount: 0,
        daysSinceLastFollowUp: Infinity
      });

      const result = service.staticPreCheck(context);

      expect(result.shouldProceed).to.be.false;
      expect(result.shouldFollowUp).to.be.false;
      expect(result.reason).to.equal('ORDER_TOO_RECENT');
      expect(result.skipAI).to.be.true;
    });

    it('should return ORDER_RECENTLY_UPDATED when updated less than 1 day ago', () => {
      const now = new Date();
      const context = createContext({
        order: {
          id: 'order-123',
          orderId: 'ORD-123',
          partName: 'Test Part',
          componentDescription: null,
          subSystem: null,
          providerId: 'provider-123',
          provider: {
            id: 'provider-123',
            name: 'Test Provider',
            preferredChannel: 'EMAIL'
          },
          status: 'PENDING',
          orderedDate: null,
          expectedDeliveryDate: null,
          leadTimeWeeks: null,
          priority: 'NORMAL',
          createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000) // 12 hours ago
        },
        followUpCount: 1,
        daysSinceLastUpdate: 0.5, // Less than 1 day
        daysSinceLastFollowUp: 10
      });

      const result = service.staticPreCheck(context);

      expect(result.shouldProceed).to.be.false;
      expect(result.shouldFollowUp).to.be.false;
      expect(result.reason).to.equal('ORDER_RECENTLY_UPDATED');
      expect(result.skipAI).to.be.true;
    });

    it('should return URGENT_PRIORITY_CHECK for urgent orders with enough time passed', () => {
      const context = createContext({
        order: {
          id: 'order-123',
          orderId: 'ORD-123',
          partName: 'Test Part',
          componentDescription: null,
          subSystem: null,
          providerId: 'provider-123',
          provider: {
            id: 'provider-123',
            name: 'Test Provider',
            preferredChannel: 'EMAIL'
          },
          status: 'PENDING',
          orderedDate: null,
          expectedDeliveryDate: null,
          leadTimeWeeks: null,
          priority: 'URGENT',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        },
        followUpCount: 1,
        daysSinceLastFollowUp: 8 // More than 7
      });

      const result = service.staticPreCheck(context);

      expect(result.shouldProceed).to.be.true;
      expect(result.shouldFollowUp).to.be.true;
      expect(result.reason).to.equal('URGENT_PRIORITY_CHECK');
      expect(result.skipAI).to.be.false; // Still use AI for message crafting
    });

    it('should return LOW_PRIORITY_TOO_SOON for low priority orders', () => {
      const context = createContext({
        order: {
          id: 'order-123',
          orderId: 'ORD-123',
          partName: 'Test Part',
          componentDescription: null,
          subSystem: null,
          providerId: 'provider-123',
          provider: {
            id: 'provider-123',
            name: 'Test Provider',
            preferredChannel: 'EMAIL'
          },
          status: 'PENDING',
          orderedDate: null,
          expectedDeliveryDate: null,
          leadTimeWeeks: null,
          priority: 'LOW',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        },
        followUpCount: 1,
        daysSinceLastFollowUp: 10 // Less than 14 (2 * 7)
      });

      const result = service.staticPreCheck(context);

      expect(result.shouldProceed).to.be.false;
      expect(result.shouldFollowUp).to.be.false;
      expect(result.reason).to.equal('LOW_PRIORITY_TOO_SOON');
      expect(result.skipAI).to.be.true;
    });

    it('should return FIRST_FOLLOWUP_CANDIDATE for orders with no follow-ups and enough time', () => {
      const context = createContext({
        followUpCount: 0,
        daysSinceLastFollowUp: Infinity
      });

      const result = service.staticPreCheck(context);

      expect(result.shouldProceed).to.be.true;
      expect(result.shouldFollowUp).to.be.true;
      expect(result.reason).to.equal('FIRST_FOLLOWUP_CANDIDATE');
      expect(result.skipAI).to.be.false;
    });

    it('should return NEEDS_AI_ANALYSIS as default', () => {
      const context = createContext({
        followUpCount: 2,
        daysSinceLastFollowUp: 8
      });

      const result = service.staticPreCheck(context);

      expect(result.shouldProceed).to.be.true;
      expect(result.shouldFollowUp).to.be.false; // Unknown, let AI decide
      expect(result.reason).to.equal('NEEDS_AI_ANALYSIS');
      expect(result.skipAI).to.be.false;
    });
  });

  describe('#processOrder', () => {
    it('should skip order when static pre-check returns shouldProceed=false', async () => {
      const orderId = 'order-123';
      const now = new Date();

      const mockOrder = {
        id: orderId,
        orderId: 'ORD-123',
        partName: 'Test Part',
        componentDescription: null,
        subSystem: null,
        providerId: 'provider-123',
        status: 'PENDING',
        orderedDate: null,
        expectedDeliveryDate: null,
        leadTimeWeeks: null,
        priority: 'NORMAL',
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
        updatedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        provider: {
          id: 'provider-123',
          name: 'Test Provider',
          preferredChannel: 'EMAIL'
        },
        followUps: [],
        history: []
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);
      mockOrderHistoryService.createOrderHistory.resolves({
        id: 'history-123',
        orderId,
        type: 'AI_ANALYSIS',
        timestamp: new Date(),
        aiSummary: 'Static pre-check: ORDER_TOO_RECENT. No follow-up needed.',
        context: null,
        metadata: null,
        rawData: null,
        conversationTurn: 1
      });

      const result = await service.processOrder(orderId);

      expect(result.processed).to.be.true;
      expect(result.followUpSent).to.be.false;
      expect(result.skippedReason).to.equal('ORDER_TOO_RECENT');
      expect(result.usedAI).to.be.false;
      expect(mockAiWorkflows.decideFollowUp.called).to.be.false;
      expect(mockFollowUpService.sendFollowUp.called).to.be.false;
    });

    it('should call AI and send follow-up when agent decides to', async () => {
      const orderId = 'order-123';
      const now = new Date();

      const mockOrder = {
        id: orderId,
        orderId: 'ORD-123',
        partName: 'Test Part',
        componentDescription: null,
        subSystem: null,
        providerId: 'provider-123',
        status: 'PENDING',
        orderedDate: null,
        expectedDeliveryDate: null,
        leadTimeWeeks: null,
        priority: 'NORMAL',
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        provider: {
          id: 'provider-123',
          name: 'Test Provider',
          preferredChannel: 'EMAIL'
        },
        followUps: [],
        history: []
      };

      const aiDecision = {
        shouldFollowUp: true,
        channel: 'EMAIL' as const,
        message: 'Please provide an update on order ORD-123',
        priority: 'NORMAL' as const,
        reasoning: 'Order is overdue and needs follow-up'
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);
      mockAiWorkflows.decideFollowUp.resolves(aiDecision);
      mockOrderHistoryService.createOrderHistory.resolves({
        id: 'history-123',
        orderId,
        type: 'AI_ANALYSIS',
        timestamp: new Date(),
        aiSummary: aiDecision.reasoning,
        context: null,
        metadata: null,
        rawData: null,
        conversationTurn: 1
      });
      mockFollowUpService.sendFollowUp.resolves({
        followUpId: 'follow-up-123',
        messageId: 'msg-123',
        channel: 'EMAIL',
        status: 'SENT',
        queuedAt: new Date()
      });

      const result = await service.processOrder(orderId);

      expect(result.processed).to.be.true;
      expect(result.followUpSent).to.be.true;
      expect(result.usedAI).to.be.true;
      expect(mockAiWorkflows.decideFollowUp.calledOnce).to.be.true;
      expect(mockFollowUpService.sendFollowUp.calledWith({
        orderId,
        channel: 'EMAIL',
        message: aiDecision.message,
        metadata: {
          priority: 'NORMAL',
          scheduled: true,
          aiGenerated: true
        }
      })).to.be.true;
    });

    it('should create escalation when threshold reached', async () => {
      const orderId = 'order-123';
      const now = new Date();

      const mockOrder = {
        id: orderId,
        orderId: 'ORD-123',
        partName: 'Test Part',
        componentDescription: null,
        subSystem: null,
        providerId: 'provider-123',
        status: 'PENDING',
        orderedDate: null,
        expectedDeliveryDate: null,
        leadTimeWeeks: null,
        priority: 'NORMAL',
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        provider: {
          id: 'provider-123',
          name: 'Test Provider',
          preferredChannel: 'EMAIL'
        },
        followUps: [
          { 
            id: 'fu-1', 
            orderId: orderId,
            channel: 'EMAIL',
            message: 'Message 1',
            success: true,
            attemptNumber: 1,
            timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
            response: null
          },
          { 
            id: 'fu-2', 
            orderId: orderId,
            channel: 'EMAIL',
            message: 'Message 2',
            success: true,
            attemptNumber: 2,
            timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
            response: null
          }
        ],
        history: []
      };

      const aiDecision = {
        shouldFollowUp: true,
        channel: 'EMAIL' as const,
        message: 'Please provide an update',
        priority: 'NORMAL' as const,
        reasoning: 'Order needs follow-up'
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);
      mockAiWorkflows.decideFollowUp.resolves(aiDecision);
      mockOrderHistoryService.createOrderHistory.resolves({
        id: 'history-123',
        orderId,
        type: 'AI_ANALYSIS',
        timestamp: new Date(),
        aiSummary: aiDecision.reasoning,
        context: null,
        metadata: null,
        rawData: null,
        conversationTurn: 1
      });
      mockFollowUpService.sendFollowUp.resolves({
        followUpId: 'follow-up-123',
        messageId: 'msg-123',
        channel: 'EMAIL',
        status: 'SENT',
        queuedAt: new Date()
      });
      (mockPrisma.escalation.create as sinon.SinonStub).resolves({
        id: 'escalation-123',
        orderId,
        reason: 'MAX_ATTEMPTS',
        status: 'PENDING',
        notes: 'Automated escalation after 3 follow-up attempts',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await service.processOrder(orderId);

      expect(result.escalated).to.be.true;
      expect((mockPrisma.escalation.create as sinon.SinonStub).calledOnce).to.be.true;
      const createCall = (mockPrisma.escalation.create as sinon.SinonStub).getCall(0);
      expect(createCall.args[0].data.orderId).to.equal(orderId);
      expect(createCall.args[0].data.reason).to.equal('MAX_ATTEMPTS');
      expect(createCall.args[0].data.status).to.equal('PENDING');
      expect(createCall.args[0].data.notes).to.include('Automated escalation after 3 follow-up attempts');
    });

    it('should handle errors gracefully', async () => {
      const orderId = 'order-123';

      (mockPrisma.order.findUnique as sinon.SinonStub).rejects(new Error('Database error'));

      const result = await service.processOrder(orderId);

      expect(result.processed).to.be.false;
      expect(result.error).to.include('Database error');
    });

    it('should not send follow-up when AI decides not to', async () => {
      const orderId = 'order-123';
      const now = new Date();

      const mockOrder = {
        id: orderId,
        orderId: 'ORD-123',
        partName: 'Test Part',
        componentDescription: null,
        subSystem: null,
        providerId: 'provider-123',
        status: 'PENDING',
        orderedDate: null,
        expectedDeliveryDate: null,
        leadTimeWeeks: null,
        priority: 'NORMAL',
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        provider: {
          id: 'provider-123',
          name: 'Test Provider',
          preferredChannel: 'EMAIL'
        },
        followUps: [],
        history: []
      };

      const aiDecision = {
        shouldFollowUp: false,
        channel: 'EMAIL' as const,
        message: '',
        priority: 'NORMAL' as const,
        reasoning: 'Order is on track, no follow-up needed'
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);
      mockAiWorkflows.decideFollowUp.resolves(aiDecision);
      mockOrderHistoryService.createOrderHistory.resolves({
        id: 'history-123',
        orderId,
        type: 'AI_ANALYSIS',
        timestamp: new Date(),
        aiSummary: aiDecision.reasoning,
        context: null,
        metadata: null,
        rawData: null,
        conversationTurn: 1
      });

      const result = await service.processOrder(orderId);

      expect(result.processed).to.be.true;
      expect(result.followUpSent).to.be.false;
      expect(mockFollowUpService.sendFollowUp.called).to.be.false;
    });
  });
});

