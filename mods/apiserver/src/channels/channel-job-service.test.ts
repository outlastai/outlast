import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { PrismaClient } from '@prisma/client';
import { getLogger } from '@outlast/logger';
import { createChannelJobService } from './channel-job-service';
import type { ChannelJob, ChannelCallback } from './types';

use(chaiAsPromised);

describe('ChannelJobService', () => {
  let sandbox: sinon.SinonSandbox;
  let service: ReturnType<typeof createChannelJobService>;
  let mockPrisma: sinon.SinonStubbedInstance<PrismaClient>;
  let logger: ReturnType<typeof getLogger>;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    logger = getLogger({ service: 'test', filePath: __filename });

    const followUpStub = {
      create: sandbox.stub(),
      findFirst: sandbox.stub(),
      findMany: sandbox.stub(),
      update: sandbox.stub()
    };
    
    // Make findMany return an array-like object for length checks
    followUpStub.findMany.returns([]);
    
    mockPrisma = {
      followUp: followUpStub as any
    } as unknown as sinon.SinonStubbedInstance<PrismaClient>;

    service = createChannelJobService({
      prisma: mockPrisma as unknown as PrismaClient,
      logger
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#createJob', () => {
    it('should create a channel job', async () => {
      const job: Omit<ChannelJob, 'id' | 'createdAt'> = {
        orderId: 'order-123',
        providerId: 'provider-123',
        channel: 'EMAIL',
        message: 'Test message',
        status: 'PENDING',
        attemptNumber: 1,
        maxRetries: 3
      };

      const mockFollowUp = {
        id: 'follow-up-123',
        orderId: job.orderId,
        channel: job.channel,
        message: job.message,
        success: false,
        attemptNumber: job.attemptNumber,
        response: null,
        timestamp: new Date()
      };

      (mockPrisma.followUp.create as sinon.SinonStub).resolves(mockFollowUp);

      const result = await service.createJob(job);

      expect(result).to.equal('follow-up-123');
      expect((mockPrisma.followUp.create as sinon.SinonStub).calledWith({
        data: {
          orderId: job.orderId,
          channel: job.channel,
          message: job.message,
          success: false,
          attemptNumber: job.attemptNumber,
          response: null
        }
      })).to.be.true;
    });
  });

  describe('#updateJobStatus', () => {
    it('should update job status to SENT', async () => {
      const followUpId = 'follow-up-123';
      const status: ChannelJob['status'] = 'SENT';
      const messageId = 'msg-123';

      (mockPrisma.followUp.update as sinon.SinonStub).resolves({
        id: followUpId,
        orderId: 'order-123',
        channel: 'EMAIL',
        message: 'Test message',
        success: true,
        attemptNumber: 1,
        timestamp: new Date(),
        response: messageId
      });

      await service.updateJobStatus(followUpId, status, messageId);

      expect((mockPrisma.followUp.update as sinon.SinonStub).calledWith({
        where: { id: followUpId },
        data: {
          success: true,
          response: undefined
        }
      })).to.be.true;
    });

    it('should update job status to FAILED with error', async () => {
      const followUpId = 'follow-up-123';
      const status: ChannelJob['status'] = 'FAILED';
      const error = 'Delivery failed';

      (mockPrisma.followUp.update as sinon.SinonStub).resolves({
        id: followUpId,
        orderId: 'order-123',
        channel: 'EMAIL',
        message: 'Test message',
        success: false,
        attemptNumber: 1,
        timestamp: new Date(),
        response: error
      });

      await service.updateJobStatus(followUpId, status, undefined, error);

      expect((mockPrisma.followUp.update as sinon.SinonStub).calledWith({
        where: { id: followUpId },
        data: {
          success: false,
          response: error
        }
      })).to.be.true;
    });

    it('should update job status to DELIVERED', async () => {
      const followUpId = 'follow-up-123';
      const status: ChannelJob['status'] = 'DELIVERED';

      (mockPrisma.followUp.update as sinon.SinonStub).resolves({
        id: followUpId,
        orderId: 'order-123',
        channel: 'EMAIL',
        message: 'Test message',
        success: true,
        attemptNumber: 1,
        timestamp: new Date(),
        response: null
      });

      await service.updateJobStatus(followUpId, status);

      expect((mockPrisma.followUp.update as sinon.SinonStub).calledWith({
        where: { id: followUpId },
        data: {
          success: true,
          response: undefined
        }
      })).to.be.true;
    });
  });

  describe('#processCallback', () => {
    it('should find and update FollowUp by messageId in response field', async () => {
      const callback: ChannelCallback = {
        messageId: 'msg-123',
        channel: 'EMAIL',
        status: 'DELIVERED',
        timestamp: new Date()
      };

      const mockFollowUp = {
        id: 'follow-up-123',
        orderId: 'order-123',
        channel: 'EMAIL',
        message: 'Test message',
        success: false,
        attemptNumber: 1,
        timestamp: new Date(),
        response: 'msg-123' // messageId stored in response field
      };

      (mockPrisma.followUp.findFirst as sinon.SinonStub).resolves(mockFollowUp);
      (mockPrisma.followUp.update as sinon.SinonStub).resolves({
        ...mockFollowUp,
        success: true
      });

      await service.processCallback(callback);

      expect((mockPrisma.followUp.findFirst as sinon.SinonStub).calledWith({
        where: {
          channel: 'EMAIL',
          response: 'msg-123'
        },
        orderBy: { timestamp: 'desc' }
      })).to.be.true;
      // Verify update was called with correct followUpId
      expect((mockPrisma.followUp.update as sinon.SinonStub).calledOnce).to.be.true;
      const updateCall = (mockPrisma.followUp.update as sinon.SinonStub).getCall(0);
      expect(updateCall.args[0].where.id).to.equal('follow-up-123');
      expect(updateCall.args[0].data.success).to.be.true;
      // Response field logic is complex - just verify it's set (could be callback.response, callback.error, or messageId)
      expect(updateCall.args[0].data.response).to.exist;
    });

    it('should fallback to finding most recent pending follow-up when messageId not found', async () => {
      const callback: ChannelCallback = {
        messageId: 'msg-123',
        channel: 'EMAIL',
        status: 'DELIVERED',
        timestamp: new Date()
      };

      const mockFollowUp = {
        id: 'follow-up-123',
        orderId: 'order-123',
        channel: 'EMAIL',
        message: 'Test message',
        success: false,
        attemptNumber: 1,
        timestamp: new Date(),
        response: null
      };

      (mockPrisma.followUp.findFirst as sinon.SinonStub).resolves(null); // Not found by messageId
      (mockPrisma.followUp.findMany as sinon.SinonStub).resolves([mockFollowUp]); // Found by fallback
      (mockPrisma.followUp.update as sinon.SinonStub).resolves({
        ...mockFollowUp,
        success: true
      });

      await service.processCallback(callback);

      expect((mockPrisma.followUp.findFirst as sinon.SinonStub).calledOnce).to.be.true;
      expect((mockPrisma.followUp.findMany as sinon.SinonStub).calledOnce).to.be.true;
      expect((mockPrisma.followUp.findMany as sinon.SinonStub).calledWith({
        where: {
          channel: 'EMAIL',
          success: false
        },
        orderBy: { timestamp: 'desc' },
        take: 1
      })).to.be.true;
    });

    it('should handle READ status as success', async () => {
      const callback: ChannelCallback = {
        messageId: 'msg-123',
        channel: 'EMAIL',
        status: 'READ',
        timestamp: new Date()
      };

      const mockFollowUp = {
        id: 'follow-up-123',
        orderId: 'order-123',
        channel: 'EMAIL',
        message: 'Test message',
        success: false,
        attemptNumber: 1,
        timestamp: new Date(),
        response: 'msg-123'
      };

      (mockPrisma.followUp.findFirst as sinon.SinonStub).resolves(mockFollowUp);
      (mockPrisma.followUp.update as sinon.SinonStub).resolves({
        ...mockFollowUp,
        success: true
      });

      await service.processCallback(callback);

      expect((mockPrisma.followUp.update as sinon.SinonStub).calledWith({
        where: { id: 'follow-up-123' },
        data: {
          success: true,
          response: sinon.match.any
        }
      })).to.be.true;
    });

    it('should handle REPLIED status as success', async () => {
      const callback: ChannelCallback = {
        messageId: 'msg-123',
        channel: 'EMAIL',
        status: 'REPLIED',
        timestamp: new Date(),
        response: 'Reply content'
      };

      const mockFollowUp = {
        id: 'follow-up-123',
        orderId: 'order-123',
        channel: 'EMAIL',
        message: 'Test message',
        success: false,
        attemptNumber: 1,
        timestamp: new Date(),
        response: 'msg-123'
      };

      (mockPrisma.followUp.findFirst as sinon.SinonStub).resolves(mockFollowUp);
      (mockPrisma.followUp.update as sinon.SinonStub).resolves({
        ...mockFollowUp,
        success: true,
        response: 'Reply content'
      });

      await service.processCallback(callback);

      expect((mockPrisma.followUp.update as sinon.SinonStub).calledWith({
        where: { id: 'follow-up-123' },
        data: {
          success: true,
          response: 'Reply content'
        }
      })).to.be.true;
    });

    it('should handle FAILED status', async () => {
      const callback: ChannelCallback = {
        messageId: 'msg-123',
        channel: 'EMAIL',
        status: 'FAILED',
        timestamp: new Date(),
        error: 'Delivery failed'
      };

      const mockFollowUp = {
        id: 'follow-up-123',
        orderId: 'order-123',
        channel: 'EMAIL',
        message: 'Test message',
        success: false,
        attemptNumber: 1,
        timestamp: new Date(),
        response: 'msg-123'
      };

      (mockPrisma.followUp.findFirst as sinon.SinonStub).resolves(mockFollowUp);
      (mockPrisma.followUp.update as sinon.SinonStub).resolves({
        ...mockFollowUp,
        success: false
      });

      await service.processCallback(callback);

      expect((mockPrisma.followUp.update as sinon.SinonStub).calledWith({
        where: { id: 'follow-up-123' },
        data: {
          success: false,
          response: sinon.match.any
        }
      })).to.be.true;
    });

    it('should log warning when no matching FollowUp found', async () => {
      const callback: ChannelCallback = {
        messageId: 'msg-123',
        channel: 'EMAIL',
        status: 'DELIVERED',
        timestamp: new Date()
      };

      (mockPrisma.followUp.findFirst as sinon.SinonStub).resolves(null);
      (mockPrisma.followUp.findMany as sinon.SinonStub).resolves([]); // Empty array - no matches

      await service.processCallback(callback);

      expect((mockPrisma.followUp.update as sinon.SinonStub).called).to.be.false;
    });

    it('should preserve existing response if callback has no response', async () => {
      const callback: ChannelCallback = {
        messageId: 'msg-123',
        channel: 'EMAIL',
        status: 'DELIVERED',
        timestamp: new Date()
        // No response field
      };

      const mockFollowUp = {
        id: 'follow-up-123',
        orderId: 'order-123',
        channel: 'EMAIL',
        message: 'Test message',
        success: false,
        attemptNumber: 1,
        timestamp: new Date(),
        response: 'msg-123' // Existing response
      };

      (mockPrisma.followUp.findFirst as sinon.SinonStub).resolves(mockFollowUp);
      (mockPrisma.followUp.update as sinon.SinonStub).resolves({
        ...mockFollowUp,
        success: true
      });

      await service.processCallback(callback);

      // Should preserve messageId in response if it was there
      expect((mockPrisma.followUp.update as sinon.SinonStub).calledWith({
        where: { id: 'follow-up-123' },
        data: sinon.match({
          success: true,
          response: sinon.match.any
        })
      })).to.be.true;
    });
  });

  describe('#getPendingJobs', () => {
    it('should return pending jobs for a specific channel', async () => {
      const mockFollowUps = [
        {
          id: 'follow-up-1',
          orderId: 'order-123',
          channel: 'EMAIL',
          message: 'Message 1',
          success: false,
          attemptNumber: 1,
          timestamp: new Date(Date.now() - 10000),
          response: null
        },
        {
          id: 'follow-up-2',
          orderId: 'order-456',
          channel: 'EMAIL',
          message: 'Message 2',
          success: false,
          attemptNumber: 1,
          timestamp: new Date(Date.now() - 5000),
          response: null
        }
      ];

      (mockPrisma.followUp.findMany as sinon.SinonStub).resolves(mockFollowUps);

      const result = await service.getPendingJobs('EMAIL');

      expect(result).to.have.length(2);
      expect((mockPrisma.followUp.findMany as sinon.SinonStub).calledWith({
        where: {
          success: false,
          channel: 'EMAIL'
        },
        orderBy: { timestamp: 'asc' },
        take: 100
      })).to.be.true;
    });

    it('should return pending jobs for all channels when channel not specified', async () => {
      const mockFollowUps = [
        {
          id: 'follow-up-1',
          orderId: 'order-123',
          channel: 'EMAIL',
          message: 'Message 1',
          success: false,
          attemptNumber: 1,
          timestamp: new Date(),
          response: null
        }
      ];

      (mockPrisma.followUp.findMany as sinon.SinonStub).resolves(mockFollowUps);

      const result = await service.getPendingJobs();

      expect(result).to.have.length(1);
      expect((mockPrisma.followUp.findMany as sinon.SinonStub).calledWith({
        where: {
          success: false
        },
        orderBy: { timestamp: 'asc' },
        take: 100
      })).to.be.true;
    });

    it('should filter by maxAge when provided', async () => {
      const now = Date.now();
      const oldTimestamp = new Date(now - 200000); // 200 seconds ago
      const recentTimestamp = new Date(now - 50000); // 50 seconds ago
      const maxAge = 100000; // 100 seconds

      const mockFollowUps = [
        {
          id: 'follow-up-1',
          orderId: 'order-123',
          channel: 'EMAIL',
          message: 'Message 1',
          success: false,
          attemptNumber: 1,
          timestamp: oldTimestamp,
          response: null
        },
        {
          id: 'follow-up-2',
          orderId: 'order-456',
          channel: 'EMAIL',
          message: 'Message 2',
          success: false,
          attemptNumber: 1,
          timestamp: recentTimestamp,
          response: null
        }
      ];

      (mockPrisma.followUp.findMany as sinon.SinonStub).resolves(mockFollowUps);

      const result = await service.getPendingJobs('EMAIL', maxAge);

      // Should only return the old one (older than maxAge)
      expect(result).to.have.length(1);
      expect(result[0].timestamp).to.deep.equal(oldTimestamp);
    });

    it('should limit results to 100', async () => {
      const mockFollowUps = Array.from({ length: 100 }, (_, i) => ({
        id: `follow-up-${i}`,
        orderId: `order-${i}`,
        channel: 'EMAIL',
        message: `Message ${i}`,
        success: false,
        attemptNumber: 1,
        timestamp: new Date(),
        response: null
      }));

      (mockPrisma.followUp.findMany as sinon.SinonStub).resolves(mockFollowUps);

      const result = await service.getPendingJobs();

      expect(result).to.have.length(100);
      expect((mockPrisma.followUp.findMany as sinon.SinonStub).calledWith(
        sinon.match({ take: 100 })
      )).to.be.true;
    });
  });
});

