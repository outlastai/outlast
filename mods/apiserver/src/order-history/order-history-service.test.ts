import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { PrismaClient } from '@prisma/client';
import { getLogger } from '@outlast/logger';
import { NotFoundError } from '@outlast/common';
import { createOrderHistoryService } from './order-history-service';

use(chaiAsPromised);

describe('OrderHistoryService', () => {
  let sandbox: sinon.SinonSandbox;
  let service: ReturnType<typeof createOrderHistoryService>;
  let mockPrisma: sinon.SinonStubbedInstance<PrismaClient>;
  let logger: ReturnType<typeof getLogger>;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    logger = getLogger({ service: 'test', filePath: __filename });

    const orderHistoryStub = {
      create: sandbox.stub(),
      findUnique: sandbox.stub(),
      findFirst: sandbox.stub(),
      findMany: sandbox.stub(),
      count: sandbox.stub()
    };

    const orderStub = {
      findUnique: sandbox.stub()
    };

    mockPrisma = {
      orderHistory: orderHistoryStub,
      order: orderStub
    } as unknown as sinon.SinonStubbedInstance<PrismaClient>;

    service = createOrderHistoryService({
      prisma: mockPrisma as unknown as PrismaClient,
      logger
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#createOrderHistory', () => {
    it('should create order history with valid input', async () => {
      const input = {
        orderId: 'order-123',
        type: 'AI_ANALYSIS' as const,
        aiSummary: 'Test summary',
        context: { key: 'value' },
        metadata: { source: 'test' },
        rawData: { raw: 'data' },
        conversationTurn: 1
      };

      const mockOrder = {
        id: 'order-123',
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
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockHistory = {
        id: 'history-123',
        orderId: input.orderId,
        type: input.type,
        timestamp: new Date(),
        aiSummary: input.aiSummary,
        context: JSON.stringify(input.context),
        metadata: JSON.stringify(input.metadata),
        rawData: JSON.stringify(input.rawData),
        conversationTurn: input.conversationTurn
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);
      (mockPrisma.orderHistory.create as sinon.SinonStub).resolves(mockHistory);

      const result = await service.createOrderHistory(input);

      expect(result.id).to.equal('history-123');
      expect(result.orderId).to.equal(input.orderId);
      expect(result.conversationTurn).to.equal(input.conversationTurn);
      expect((mockPrisma.order.findUnique as sinon.SinonStub).calledOnce).to.be.true;
      expect((mockPrisma.orderHistory.create as sinon.SinonStub).calledOnce).to.be.true;
    });

    it('should auto-increment conversationTurn when not provided', async () => {
      const input = {
        orderId: 'order-123',
        type: 'AI_ANALYSIS' as const,
        aiSummary: 'Test summary'
      };

      const mockOrder = {
        id: 'order-123',
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
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const lastHistory = {
        id: 'history-1',
        orderId: 'order-123',
        type: 'AI_ANALYSIS',
        timestamp: new Date(),
        aiSummary: 'Previous summary',
        context: null,
        metadata: null,
        rawData: null,
        conversationTurn: 3
      };

      const mockHistory = {
        id: 'history-123',
        orderId: input.orderId,
        type: input.type,
        timestamp: new Date(),
        aiSummary: input.aiSummary,
        context: null,
        metadata: null,
        rawData: null,
        conversationTurn: 4
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);
      (mockPrisma.orderHistory.findFirst as sinon.SinonStub).resolves(lastHistory);
      (mockPrisma.orderHistory.create as sinon.SinonStub).resolves(mockHistory);

      const result = await service.createOrderHistory(input);

      expect(result.conversationTurn).to.equal(4);
      expect((mockPrisma.orderHistory.findFirst as sinon.SinonStub).calledWith({
        where: { orderId: input.orderId },
        orderBy: { conversationTurn: 'desc' }
      })).to.be.true;
      expect((mockPrisma.orderHistory.create as sinon.SinonStub).calledWith({
        data: sinon.match({ conversationTurn: 4 })
      })).to.be.true;
    });

    it('should set conversationTurn to 1 when no previous history exists', async () => {
      const input = {
        orderId: 'order-123',
        type: 'AI_ANALYSIS' as const,
        aiSummary: 'Test summary'
      };

      const mockOrder = {
        id: 'order-123',
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
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockHistory = {
        id: 'history-123',
        orderId: input.orderId,
        type: input.type,
        timestamp: new Date(),
        aiSummary: input.aiSummary,
        context: null,
        metadata: null,
        rawData: null,
        conversationTurn: 1
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);
      (mockPrisma.orderHistory.findFirst as sinon.SinonStub).resolves(null);
      (mockPrisma.orderHistory.create as sinon.SinonStub).resolves(mockHistory);

      const result = await service.createOrderHistory(input);

      expect(result.conversationTurn).to.equal(1);
      expect((mockPrisma.orderHistory.create as sinon.SinonStub).calledWith({
        data: sinon.match({ conversationTurn: 1 })
      })).to.be.true;
    });

    it('should throw NotFoundError when order does not exist', async () => {
      const input = {
        orderId: 'non-existent',
        type: 'AI_ANALYSIS' as const,
        aiSummary: 'Test summary'
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(null);

      await expect(service.createOrderHistory(input))
        .to.be.rejectedWith(NotFoundError);
      
      expect((mockPrisma.orderHistory.create as sinon.SinonStub).called).to.be.false;
    });

    it('should handle null JSON fields correctly', async () => {
      const input = {
        orderId: 'order-123',
        type: 'AI_ANALYSIS' as const,
        aiSummary: 'Test summary'
      };

      const mockOrder = {
        id: 'order-123',
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
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockHistory = {
        id: 'history-123',
        orderId: input.orderId,
        type: input.type,
        timestamp: new Date(),
        aiSummary: input.aiSummary,
        context: null,
        metadata: null,
        rawData: null,
        conversationTurn: 1
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);
      (mockPrisma.orderHistory.findFirst as sinon.SinonStub).resolves(null);
      (mockPrisma.orderHistory.create as sinon.SinonStub).resolves(mockHistory);

      const result = await service.createOrderHistory(input);

      expect(result.context).to.be.null;
      expect(result.metadata).to.be.null;
      expect(result.rawData).to.be.null;
    });
  });

  describe('#getOrderHistory', () => {
    it('should return order history when found', async () => {
      const mockHistory = {
        id: 'history-123',
        orderId: 'order-123',
        type: 'AI_ANALYSIS',
        timestamp: new Date(),
        aiSummary: 'Test summary',
        context: JSON.stringify({ key: 'value' }),
        metadata: JSON.stringify({ source: 'test' }),
        rawData: JSON.stringify({ raw: 'data' }),
        conversationTurn: 1
      };

      (mockPrisma.orderHistory.findUnique as sinon.SinonStub).resolves(mockHistory);

      const result = await service.getOrderHistory('history-123');

      expect(result.id).to.equal('history-123');
      expect(result.orderId).to.equal('order-123');
      expect((mockPrisma.orderHistory.findUnique as sinon.SinonStub).calledWith({
        where: { id: 'history-123' }
      })).to.be.true;
    });

    it('should parse JSON fields correctly', async () => {
      const mockHistory = {
        id: 'history-123',
        orderId: 'order-123',
        type: 'AI_ANALYSIS',
        timestamp: new Date(),
        aiSummary: 'Test summary',
        context: JSON.stringify({ key: 'value' }),
        metadata: JSON.stringify({ source: 'test' }),
        rawData: JSON.stringify({ raw: 'data' }),
        conversationTurn: 1
      };

      (mockPrisma.orderHistory.findUnique as sinon.SinonStub).resolves(mockHistory);

      const result = await service.getOrderHistory('history-123');

      expect(result.context).to.deep.equal({ key: 'value' });
      expect(result.metadata).to.deep.equal({ source: 'test' });
      expect(result.rawData).to.deep.equal({ raw: 'data' });
    });

    it('should throw NotFoundError when order history not found', async () => {
      (mockPrisma.orderHistory.findUnique as sinon.SinonStub).resolves(null);

      await expect(service.getOrderHistory('non-existent'))
        .to.be.rejectedWith(NotFoundError);
    });
  });

  describe('#listOrderHistory', () => {
    it('should return paginated list of order history', async () => {
      const query = {
        orderId: 'order-123',
        limit: 10,
        offset: 0
      };

      const mockOrder = {
        id: 'order-123',
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
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockHistories = [
        {
          id: 'history-1',
          orderId: 'order-123',
          type: 'AI_ANALYSIS',
          timestamp: new Date(),
          aiSummary: 'Summary 1',
          context: null,
          metadata: null,
          rawData: null,
          conversationTurn: 1
        },
        {
          id: 'history-2',
          orderId: 'order-123',
          type: 'RESPONSE_RECEIVED',
          timestamp: new Date(),
          aiSummary: 'Summary 2',
          context: null,
          metadata: null,
          rawData: null,
          conversationTurn: 2
        }
      ];

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);
      (mockPrisma.orderHistory.findMany as sinon.SinonStub).resolves(mockHistories);
      (mockPrisma.orderHistory.count as sinon.SinonStub).resolves(2);

      const result = await service.listOrderHistory(query);

      expect(result.items).to.have.length(2);
      expect(result.totalCount).to.equal(2);
      expect(result.limit).to.equal(10);
      expect(result.offset).to.equal(0);
    });

    it('should use default pagination when not provided', async () => {
      const query = {
        orderId: 'order-123'
      };

      const mockOrder = {
        id: 'order-123',
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
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);
      (mockPrisma.orderHistory.findMany as sinon.SinonStub).resolves([]);
      (mockPrisma.orderHistory.count as sinon.SinonStub).resolves(0);

      const result = await service.listOrderHistory(query);

      expect(result.limit).to.equal(50);
      expect(result.offset).to.equal(0);
    });

    it('should cap limit at 100', async () => {
      const query = {
        orderId: 'order-123',
        limit: 200
      };

      const mockOrder = {
        id: 'order-123',
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
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);
      (mockPrisma.orderHistory.findMany as sinon.SinonStub).resolves([]);
      (mockPrisma.orderHistory.count as sinon.SinonStub).resolves(0);

      const result = await service.listOrderHistory(query);

      expect(result.limit).to.equal(100);
      expect((mockPrisma.orderHistory.findMany as sinon.SinonStub).calledWith(
        sinon.match({ take: 100 })
      )).to.be.true;
    });

    it('should filter by type when provided', async () => {
      const query = {
        orderId: 'order-123',
        type: 'AI_ANALYSIS' as const
      };

      const mockOrder = {
        id: 'order-123',
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
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);
      (mockPrisma.orderHistory.findMany as sinon.SinonStub).resolves([]);
      (mockPrisma.orderHistory.count as sinon.SinonStub).resolves(0);

      await service.listOrderHistory(query);

      expect((mockPrisma.orderHistory.findMany as sinon.SinonStub).calledWith(
        sinon.match({
          where: {
            orderId: 'order-123',
            type: 'AI_ANALYSIS'
          }
        })
      )).to.be.true;
    });

    it('should filter by conversationTurn when provided', async () => {
      const query = {
        orderId: 'order-123',
        conversationTurn: 2
      };

      const mockOrder = {
        id: 'order-123',
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
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);
      (mockPrisma.orderHistory.findMany as sinon.SinonStub).resolves([]);
      (mockPrisma.orderHistory.count as sinon.SinonStub).resolves(0);

      await service.listOrderHistory(query);

      expect((mockPrisma.orderHistory.findMany as sinon.SinonStub).calledWith(
        sinon.match({
          where: {
            orderId: 'order-123',
            conversationTurn: 2
          }
        })
      )).to.be.true;
    });

    it('should throw NotFoundError when order does not exist', async () => {
      const query = {
        orderId: 'non-existent'
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(null);

      await expect(service.listOrderHistory(query))
        .to.be.rejectedWith(NotFoundError);
      
      expect((mockPrisma.orderHistory.findMany as sinon.SinonStub).called).to.be.false;
    });
  });
});

