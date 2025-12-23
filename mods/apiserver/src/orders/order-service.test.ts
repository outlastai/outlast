import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { PrismaClient } from '@prisma/client';
import { getLogger } from '@outlast/logger';
import { NotFoundError } from '@outlast/common';
import { createOrderService } from './order-service';

use(chaiAsPromised);

describe('OrderService', () => {
  let sandbox: sinon.SinonSandbox;
  let service: ReturnType<typeof createOrderService>;
  let mockPrisma: sinon.SinonStubbedInstance<PrismaClient>;
  let logger: ReturnType<typeof getLogger>;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    logger = getLogger({ service: 'test', filePath: __filename });

    const orderStub = {
      create: sandbox.stub(),
      findUnique: sandbox.stub(),
      findMany: sandbox.stub(),
      count: sandbox.stub(),
      update: sandbox.stub(),
      delete: sandbox.stub()
    };

    const providerStub = {
      findUnique: sandbox.stub()
    };

    mockPrisma = {
      order: orderStub,
      provider: providerStub
    } as unknown as sinon.SinonStubbedInstance<PrismaClient>;

    service = createOrderService({
      prisma: mockPrisma as unknown as PrismaClient,
      logger
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#createOrder', () => {
    it('should create an order with valid input', async () => {
      const input = {
        orderId: 'ORD-123',
        partName: 'Widget Assembly',
        componentDescription: 'Main widget',
        subSystem: 'Engine',
        providerId: 'provider-123',
        status: 'PENDING' as const,
        orderedDate: new Date('2024-01-01'),
        expectedDeliveryDate: new Date('2024-02-01'),
        leadTimeWeeks: 4,
        priority: 'NORMAL' as const
      };

      const mockProvider = {
        id: 'provider-123',
        name: 'Test Provider',
        preferredChannel: 'EMAIL',
        contactInfo: JSON.stringify({ EMAIL: 'test@example.com' }),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockOrder = {
        id: 'order-123',
        orderId: input.orderId,
        partName: input.partName,
        componentDescription: input.componentDescription,
        subSystem: input.subSystem,
        providerId: input.providerId,
        status: input.status,
        orderedDate: input.orderedDate,
        expectedDeliveryDate: input.expectedDeliveryDate,
        leadTimeWeeks: input.leadTimeWeeks,
        priority: input.priority,
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: {
          id: mockProvider.id,
          name: mockProvider.name,
          preferredChannel: mockProvider.preferredChannel
        }
      };

      (mockPrisma.provider.findUnique as sinon.SinonStub).resolves(mockProvider);
      (mockPrisma.order.create as sinon.SinonStub).resolves(mockOrder);

      const result = await service.createOrder(input);

      expect(result).to.have.property('id', 'order-123');
      expect(result.orderId).to.equal(input.orderId);
      expect(result.partName).to.equal(input.partName);
      expect((mockPrisma.provider.findUnique as sinon.SinonStub).calledOnce).to.be.true;
      expect((mockPrisma.order.create as sinon.SinonStub).calledOnce).to.be.true;
    });

    it('should default to PENDING status if not provided', async () => {
      const input = {
        orderId: 'ORD-123',
        partName: 'Widget Assembly',
        providerId: 'provider-123'
      };

      const mockProvider = {
        id: 'provider-123',
        name: 'Test Provider',
        preferredChannel: 'EMAIL',
        contactInfo: JSON.stringify({ EMAIL: 'test@example.com' }),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockOrder = {
        id: 'order-123',
        orderId: input.orderId,
        partName: input.partName,
        componentDescription: null,
        subSystem: null,
        providerId: input.providerId,
        status: 'PENDING',
        orderedDate: null,
        expectedDeliveryDate: null,
        leadTimeWeeks: null,
        priority: 'NORMAL',
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: {
          id: mockProvider.id,
          name: mockProvider.name,
          preferredChannel: mockProvider.preferredChannel
        }
      };

      (mockPrisma.provider.findUnique as sinon.SinonStub).resolves(mockProvider);
      (mockPrisma.order.create as sinon.SinonStub).resolves(mockOrder);

      const result = await service.createOrder(input);

      expect(result.status).to.equal('PENDING');
      expect((mockPrisma.order.create as sinon.SinonStub).calledOnce).to.be.true;
      const createCall = (mockPrisma.order.create as sinon.SinonStub).getCall(0);
      expect(createCall.args[0].data.status).to.equal('PENDING');
      expect(createCall.args[0].data.priority).to.equal('NORMAL');
    });

    it('should default to NORMAL priority if not provided', async () => {
      const input = {
        orderId: 'ORD-123',
        partName: 'Widget Assembly',
        providerId: 'provider-123'
      };

      const mockProvider = {
        id: 'provider-123',
        name: 'Test Provider',
        preferredChannel: 'EMAIL',
        contactInfo: JSON.stringify({ EMAIL: 'test@example.com' }),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockOrder = {
        id: 'order-123',
        orderId: input.orderId,
        partName: input.partName,
        componentDescription: null,
        subSystem: null,
        providerId: input.providerId,
        status: 'PENDING',
        orderedDate: null,
        expectedDeliveryDate: null,
        leadTimeWeeks: null,
        priority: 'NORMAL',
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: {
          id: mockProvider.id,
          name: mockProvider.name,
          preferredChannel: mockProvider.preferredChannel
        }
      };

      (mockPrisma.provider.findUnique as sinon.SinonStub).resolves(mockProvider);
      (mockPrisma.order.create as sinon.SinonStub).resolves(mockOrder);

      const result = await service.createOrder(input);

      expect(result.priority).to.equal('NORMAL');
    });

    it('should throw NotFoundError when provider does not exist', async () => {
      const input = {
        orderId: 'ORD-123',
        partName: 'Widget Assembly',
        providerId: 'non-existent-provider'
      };

      (mockPrisma.provider.findUnique as sinon.SinonStub).resolves(null);

      await expect(service.createOrder(input))
        .to.be.rejectedWith(NotFoundError);
      
      expect((mockPrisma.order.create as sinon.SinonStub).called).to.be.false;
    });
  });

  describe('#getOrder', () => {
    it('should return order when found by UUID', async () => {
      const mockOrder = {
        id: 'order-123',
        orderId: 'ORD-123',
        partName: 'Widget Assembly',
        componentDescription: null,
        subSystem: null,
        providerId: 'provider-123',
        status: 'PENDING',
        orderedDate: null,
        expectedDeliveryDate: null,
        leadTimeWeeks: null,
        priority: 'NORMAL',
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: {
          id: 'provider-123',
          name: 'Test Provider',
          preferredChannel: 'EMAIL'
        }
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);

      const result = await service.getOrder('order-123');

      expect(result.id).to.equal('order-123');
      expect(result.orderId).to.equal('ORD-123');
      expect((mockPrisma.order.findUnique as sinon.SinonStub).calledWith({
        where: { id: 'order-123' },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              preferredChannel: true
            }
          }
        }
      })).to.be.true;
    });

    it('should throw NotFoundError when order not found', async () => {
      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(null);

      await expect(service.getOrder('non-existent'))
        .to.be.rejectedWith(NotFoundError);
    });
  });

  describe('#getOrderByOrderId', () => {
    it('should return order when found by external orderId', async () => {
      const mockOrder = {
        id: 'order-123',
        orderId: 'ORD-123',
        partName: 'Widget Assembly',
        componentDescription: null,
        subSystem: null,
        providerId: 'provider-123',
        status: 'PENDING',
        orderedDate: null,
        expectedDeliveryDate: null,
        leadTimeWeeks: null,
        priority: 'NORMAL',
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: {
          id: 'provider-123',
          name: 'Test Provider',
          preferredChannel: 'EMAIL'
        }
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);

      const result = await service.getOrderByOrderId('ORD-123');

      expect(result.orderId).to.equal('ORD-123');
      expect((mockPrisma.order.findUnique as sinon.SinonStub).calledWith({
        where: { orderId: 'ORD-123' },
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              preferredChannel: true
            }
          }
        }
      })).to.be.true;
    });

    it('should throw NotFoundError when order not found by orderId', async () => {
      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(null);

      await expect(service.getOrderByOrderId('NON-EXISTENT'))
        .to.be.rejectedWith(NotFoundError);
    });
  });

  describe('#listOrders', () => {
    it('should return paginated list of orders', async () => {
      const mockOrders = [
        {
          id: 'order-1',
          orderId: 'ORD-1',
          partName: 'Part 1',
          componentDescription: null,
          subSystem: null,
          providerId: 'provider-123',
          status: 'PENDING',
          orderedDate: null,
          expectedDeliveryDate: null,
          leadTimeWeeks: null,
          priority: 'NORMAL',
          createdAt: new Date(),
          updatedAt: new Date(),
          provider: {
            id: 'provider-123',
            name: 'Test Provider',
            preferredChannel: 'EMAIL'
          }
        },
        {
          id: 'order-2',
          orderId: 'ORD-2',
          partName: 'Part 2',
          componentDescription: null,
          subSystem: null,
          providerId: 'provider-123',
          status: 'IN_TRANSIT',
          orderedDate: null,
          expectedDeliveryDate: null,
          leadTimeWeeks: null,
          priority: 'URGENT',
          createdAt: new Date(),
          updatedAt: new Date(),
          provider: {
            id: 'provider-123',
            name: 'Test Provider',
            preferredChannel: 'EMAIL'
          }
        }
      ];

      (mockPrisma.order.findMany as sinon.SinonStub).resolves(mockOrders);
      (mockPrisma.order.count as sinon.SinonStub).resolves(2);

      const result = await service.listOrders({ limit: 10, offset: 0 });

      expect(result.items).to.have.length(2);
      expect(result.totalCount).to.equal(2);
      expect(result.limit).to.equal(10);
      expect(result.offset).to.equal(0);
    });

    it('should use default pagination when not provided', async () => {
      (mockPrisma.order.findMany as sinon.SinonStub).resolves([]);
      (mockPrisma.order.count as sinon.SinonStub).resolves(0);

      const result = await service.listOrders();

      expect(result.limit).to.equal(50);
      expect(result.offset).to.equal(0);
    });

    it('should cap limit at 100', async () => {
      (mockPrisma.order.findMany as sinon.SinonStub).resolves([]);
      (mockPrisma.order.count as sinon.SinonStub).resolves(0);

      const result = await service.listOrders({ limit: 200, offset: 0 });

      expect(result.limit).to.equal(100);
      expect((mockPrisma.order.findMany as sinon.SinonStub).calledWith(
        sinon.match({ take: 100 })
      )).to.be.true;
    });

    it('should filter by status when provided', async () => {
      (mockPrisma.order.findMany as sinon.SinonStub).resolves([]);
      (mockPrisma.order.count as sinon.SinonStub).resolves(0);

      await service.listOrders({ status: 'PENDING' });

      expect((mockPrisma.order.findMany as sinon.SinonStub).calledWith(
        sinon.match({
          where: { status: 'PENDING' }
        })
      )).to.be.true;
    });

    it('should filter by providerId when provided', async () => {
      (mockPrisma.order.findMany as sinon.SinonStub).resolves([]);
      (mockPrisma.order.count as sinon.SinonStub).resolves(0);

      await service.listOrders({ providerId: 'provider-123' });

      expect((mockPrisma.order.findMany as sinon.SinonStub).calledWith(
        sinon.match({
          where: { providerId: 'provider-123' }
        })
      )).to.be.true;
    });

    it('should filter by both status and providerId when provided', async () => {
      (mockPrisma.order.findMany as sinon.SinonStub).resolves([]);
      (mockPrisma.order.count as sinon.SinonStub).resolves(0);

      await service.listOrders({ status: 'PENDING', providerId: 'provider-123' });

      expect((mockPrisma.order.findMany as sinon.SinonStub).calledWith(
        sinon.match({
          where: {
            status: 'PENDING',
            providerId: 'provider-123'
          }
        })
      )).to.be.true;
    });
  });

  describe('#updateOrder', () => {
    it('should update order with valid input', async () => {
      const existing = {
        id: 'order-123',
        orderId: 'ORD-123',
        partName: 'Old Part',
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

      const updated = {
        ...existing,
        partName: 'New Part',
        status: 'IN_TRANSIT',
        provider: {
          id: 'provider-123',
          name: 'Test Provider',
          preferredChannel: 'EMAIL'
        }
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(existing);
      (mockPrisma.order.update as sinon.SinonStub).resolves(updated);

      const result = await service.updateOrder('order-123', {
        partName: 'New Part',
        status: 'IN_TRANSIT'
      });

      expect(result.partName).to.equal('New Part');
      expect(result.status).to.equal('IN_TRANSIT');
      expect((mockPrisma.order.update as sinon.SinonStub).calledOnce).to.be.true;
    });

    it('should throw NotFoundError when order not found', async () => {
      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(null);

      await expect(service.updateOrder('non-existent', { partName: 'New Part' }))
        .to.be.rejectedWith(NotFoundError);
      
      expect((mockPrisma.order.update as sinon.SinonStub).called).to.be.false;
    });
  });

  describe('#deleteOrder', () => {
    it('should delete order when found', async () => {
      const existing = {
        id: 'order-123',
        orderId: 'ORD-123',
        partName: 'Widget Assembly',
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

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(existing);
      (mockPrisma.order.delete as sinon.SinonStub).resolves(existing);

      await service.deleteOrder('order-123');

      expect((mockPrisma.order.delete as sinon.SinonStub).calledOnce).to.be.true;
      expect((mockPrisma.order.delete as sinon.SinonStub).calledWith({
        where: { id: 'order-123' }
      })).to.be.true;
    });

    it('should throw NotFoundError when order not found', async () => {
      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(null);

      await expect(service.deleteOrder('non-existent'))
        .to.be.rejectedWith(NotFoundError);
      
      expect((mockPrisma.order.delete as sinon.SinonStub).called).to.be.false;
    });
  });
});

