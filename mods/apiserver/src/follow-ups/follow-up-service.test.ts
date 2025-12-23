import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { PrismaClient } from '@prisma/client';
import { getLogger } from '@outlast/logger';
import { NotFoundError, ChannelError, ValidationError } from '@outlast/common';
import { createFollowUpService } from './follow-up-service';
import type { ChannelService } from '../channels/types';
import type { createChannelJobService } from '../channels/channel-job-service';

use(chaiAsPromised);

describe('FollowUpService', () => {
  let sandbox: sinon.SinonSandbox;
  let service: ReturnType<typeof createFollowUpService>;
  let mockPrisma: sinon.SinonStubbedInstance<PrismaClient>;
  let mockChannelService: sinon.SinonStubbedInstance<ChannelService>;
  let mockChannelJobService: sinon.SinonStubbedInstance<ReturnType<typeof createChannelJobService>>;
  let logger: ReturnType<typeof getLogger>;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    logger = getLogger({ service: 'test', filePath: __filename });

    const orderStub = {
      findUnique: sandbox.stub(),
      count: sandbox.stub()
    };

    const followUpStub = {
      count: sandbox.stub(),
      update: sandbox.stub()
    };

    mockPrisma = {
      order: orderStub,
      followUp: followUpStub
    } as unknown as sinon.SinonStubbedInstance<PrismaClient>;

    mockChannelService = {
      getChannelType: sandbox.stub().returns('EMAIL'),
      sendMessage: sandbox.stub(),
      processCallback: sandbox.stub()
    } as unknown as sinon.SinonStubbedInstance<ChannelService>;

    mockChannelJobService = {
      createJob: sandbox.stub(),
      updateJobStatus: sandbox.stub(),
      processCallback: sandbox.stub(),
      getPendingJobs: sandbox.stub()
    } as unknown as sinon.SinonStubbedInstance<ReturnType<typeof createChannelJobService>>;

    service = createFollowUpService({
      prisma: mockPrisma as unknown as PrismaClient,
      channelService: mockChannelService as unknown as ChannelService,
      channelJobService: mockChannelJobService as unknown as ReturnType<typeof createChannelJobService>,
      logger
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#sendFollowUp', () => {
    it('should send follow-up when order found by UUID', async () => {
      const input = {
        orderId: 'order-123',
        channel: 'EMAIL' as const,
        message: 'Test message'
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
        updatedAt: new Date(),
        provider: {
          id: 'provider-123',
          name: 'Test Provider',
          preferredChannel: 'EMAIL',
          contactInfo: JSON.stringify({
            EMAIL: 'test@example.com',
            SMS: '+1234567890'
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

      const channelResponse = {
        messageId: 'msg-123',
        channel: 'EMAIL' as const,
        status: 'SENT' as const,
        queuedAt: new Date()
      };

      (mockPrisma.order.findUnique as sinon.SinonStub)
        .onFirstCall()
        .resolves(mockOrder);
      (mockPrisma.followUp.count as sinon.SinonStub).resolves(0);
      mockChannelJobService.createJob.resolves('follow-up-123');
      mockChannelService.sendMessage.resolves(channelResponse);
      mockChannelJobService.updateJobStatus.resolves();
      (mockPrisma.followUp.update as sinon.SinonStub).resolves({
        id: 'follow-up-123',
        orderId: 'order-123',
        channel: 'EMAIL',
        message: 'Test message',
        success: true,
        attemptNumber: 1,
        timestamp: new Date(),
        response: 'msg-123'
      });

      const result = await service.sendFollowUp(input);

      expect(result.followUpId).to.equal('follow-up-123');
      expect(result.messageId).to.equal('msg-123');
      expect(result.channel).to.equal('EMAIL');
      expect(result.status).to.equal('SENT');
      expect(mockChannelService.sendMessage.calledOnce).to.be.true;
    });

    it('should find order by external orderId when UUID not found', async () => {
      const input = {
        orderId: 'ORD-123',
        channel: 'EMAIL' as const,
        message: 'Test message'
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
        updatedAt: new Date(),
        provider: {
          id: 'provider-123',
          name: 'Test Provider',
          preferredChannel: 'EMAIL',
          contactInfo: JSON.stringify({
            EMAIL: 'test@example.com'
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

      const channelResponse = {
        messageId: 'msg-123',
        channel: 'EMAIL' as const,
        status: 'SENT' as const,
        queuedAt: new Date()
      };

      (mockPrisma.order.findUnique as sinon.SinonStub)
        .onFirstCall()
        .resolves(null)
        .onSecondCall()
        .resolves(mockOrder);
      (mockPrisma.followUp.count as sinon.SinonStub).resolves(0);
      mockChannelJobService.createJob.resolves('follow-up-123');
      mockChannelService.sendMessage.resolves(channelResponse);
      mockChannelJobService.updateJobStatus.resolves();
      (mockPrisma.followUp.update as sinon.SinonStub).resolves({
        id: 'follow-up-123',
        orderId: 'order-123',
        channel: 'EMAIL',
        message: 'Test message',
        success: true,
        attemptNumber: 1,
        timestamp: new Date(),
        response: 'msg-123'
      });

      const result = await service.sendFollowUp(input);

      expect(result.followUpId).to.equal('follow-up-123');
      expect((mockPrisma.order.findUnique as sinon.SinonStub).calledTwice).to.be.true;
    });

    it('should throw NotFoundError when order not found by UUID or orderId', async () => {
      const input = {
        orderId: 'non-existent',
        channel: 'EMAIL' as const,
        message: 'Test message'
      };

      (mockPrisma.order.findUnique as sinon.SinonStub)
        .onFirstCall()
        .resolves(null)
        .onSecondCall()
        .resolves(null);

      await expect(service.sendFollowUp(input))
        .to.be.rejectedWith(NotFoundError);
      
      expect(mockChannelService.sendMessage.called).to.be.false;
    });

    it('should throw Error when provider does not have contact info for channel', async () => {
      const input = {
        orderId: 'order-123',
        channel: 'SMS' as const,
        message: 'Test message'
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
        updatedAt: new Date(),
        provider: {
          id: 'provider-123',
          name: 'Test Provider',
          preferredChannel: 'EMAIL',
          contactInfo: JSON.stringify({
            EMAIL: 'test@example.com'
            // No SMS contact info
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);

      await expect(service.sendFollowUp(input))
        .to.be.rejectedWith(ValidationError, /does not have SMS contact information/);
      
      expect(mockChannelService.sendMessage.called).to.be.false;
    });

    it('should calculate attempt number correctly', async () => {
      const input = {
        orderId: 'order-123',
        channel: 'EMAIL' as const,
        message: 'Test message'
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
        updatedAt: new Date(),
        provider: {
          id: 'provider-123',
          name: 'Test Provider',
          preferredChannel: 'EMAIL',
          contactInfo: JSON.stringify({
            EMAIL: 'test@example.com'
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

      const channelResponse = {
        messageId: 'msg-123',
        channel: 'EMAIL' as const,
        status: 'SENT' as const,
        queuedAt: new Date()
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);
      (mockPrisma.followUp.count as sinon.SinonStub).resolves(2); // 2 existing follow-ups
      mockChannelJobService.createJob.resolves('follow-up-123');
      mockChannelService.sendMessage.resolves(channelResponse);
      mockChannelJobService.updateJobStatus.resolves();
      (mockPrisma.followUp.update as sinon.SinonStub).resolves({
        id: 'follow-up-123',
        orderId: 'order-123',
        channel: 'EMAIL',
        message: 'Test message',
        success: true,
        attemptNumber: 3,
        timestamp: new Date(),
        response: 'msg-123'
      });

      await service.sendFollowUp(input);

      expect(mockChannelJobService.createJob.calledWith(
        sinon.match({ attemptNumber: 3 })
      )).to.be.true;
    });

    it('should handle channel service errors and update job status', async () => {
      const input = {
        orderId: 'order-123',
        channel: 'EMAIL' as const,
        message: 'Test message'
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
        updatedAt: new Date(),
        provider: {
          id: 'provider-123',
          name: 'Test Provider',
          preferredChannel: 'EMAIL',
          contactInfo: JSON.stringify({
            EMAIL: 'test@example.com'
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);
      (mockPrisma.followUp.count as sinon.SinonStub).resolves(0);
      mockChannelJobService.createJob.resolves('follow-up-123');
      mockChannelService.sendMessage.rejects(new Error('Channel service error'));
      mockChannelJobService.updateJobStatus.resolves();

      await expect(service.sendFollowUp(input))
        .to.be.rejectedWith(ChannelError, /Failed to send message/);
      
      expect(mockChannelJobService.updateJobStatus.calledWith(
        'follow-up-123',
        'FAILED',
        undefined,
        'Channel service error'
      )).to.be.true;
    });

    it('should handle channel response with FAILED status', async () => {
      const input = {
        orderId: 'order-123',
        channel: 'EMAIL' as const,
        message: 'Test message'
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
        updatedAt: new Date(),
        provider: {
          id: 'provider-123',
          name: 'Test Provider',
          preferredChannel: 'EMAIL',
          contactInfo: JSON.stringify({
            EMAIL: 'test@example.com'
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

      const channelResponse = {
        messageId: 'msg-123',
        channel: 'EMAIL' as const,
        status: 'FAILED' as const,
        queuedAt: new Date(),
        error: 'Delivery failed'
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);
      (mockPrisma.followUp.count as sinon.SinonStub).resolves(0);
      mockChannelJobService.createJob.resolves('follow-up-123');
      mockChannelService.sendMessage.resolves(channelResponse);
      mockChannelJobService.updateJobStatus.resolves();

      const result = await service.sendFollowUp(input);

      expect(result.status).to.equal('FAILED');
      expect(result.error).to.equal('Delivery failed');
      expect(mockChannelJobService.updateJobStatus.calledWith(
        'follow-up-123',
        'FAILED',
        undefined,
        'Delivery failed'
      )).to.be.true;
    });

    it('should handle invalid JSON in contactInfo', async () => {
      const input = {
        orderId: 'order-123',
        channel: 'EMAIL' as const,
        message: 'Test message'
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
        updatedAt: new Date(),
        provider: {
          id: 'provider-123',
          name: 'Test Provider',
          preferredChannel: 'EMAIL',
          contactInfo: 'invalid-json{', // Invalid JSON
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);

      // JSON.parse will throw SyntaxError
      await expect(service.sendFollowUp(input))
        .to.be.rejected;
    });

    it('should store messageId in FollowUp response field', async () => {
      const input = {
        orderId: 'order-123',
        channel: 'EMAIL' as const,
        message: 'Test message'
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
        updatedAt: new Date(),
        provider: {
          id: 'provider-123',
          name: 'Test Provider',
          preferredChannel: 'EMAIL',
          contactInfo: JSON.stringify({
            EMAIL: 'test@example.com'
          }),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };

      const channelResponse = {
        messageId: 'msg-123',
        channel: 'EMAIL' as const,
        status: 'SENT' as const,
        queuedAt: new Date()
      };

      (mockPrisma.order.findUnique as sinon.SinonStub).resolves(mockOrder);
      (mockPrisma.followUp.count as sinon.SinonStub).resolves(0);
      mockChannelJobService.createJob.resolves('follow-up-123');
      mockChannelService.sendMessage.resolves(channelResponse);
      mockChannelJobService.updateJobStatus.resolves();
      (mockPrisma.followUp.update as sinon.SinonStub).resolves({
        id: 'follow-up-123',
        orderId: 'order-123',
        channel: 'EMAIL',
        message: 'Test message',
        success: true,
        attemptNumber: 1,
        timestamp: new Date(),
        response: 'msg-123'
      });

      await service.sendFollowUp(input);

      // Verify that FollowUp was updated with messageId in response field
      expect((mockPrisma.followUp.update as sinon.SinonStub).calledWith({
        where: { id: 'follow-up-123' },
        data: {
          success: true,
          response: 'msg-123'
        }
      })).to.be.true;
    });
  });
});

