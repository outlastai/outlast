import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { PrismaClient } from '@prisma/client';
import { getLogger } from '@outlast/logger';
import { NotFoundError, ValidationError } from '@outlast/common';
import { createProviderService } from './provider-service';

use(chaiAsPromised);

describe('ProviderService', () => {
  let sandbox: sinon.SinonSandbox;
  let service: ReturnType<typeof createProviderService>;
  let mockPrisma: sinon.SinonStubbedInstance<PrismaClient>;
  let logger: ReturnType<typeof getLogger>;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    logger = getLogger({ service: 'test', filePath: __filename });
    
    const providerStub = {
      create: sandbox.stub(),
      findUnique: sandbox.stub(),
      findMany: sandbox.stub(),
      count: sandbox.stub(),
      update: sandbox.stub(),
      delete: sandbox.stub()
    };
    
    mockPrisma = {
      provider: providerStub
    } as unknown as sinon.SinonStubbedInstance<PrismaClient>;

    service = createProviderService({
      prisma: mockPrisma as unknown as PrismaClient,
      logger
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#createProvider', () => {
    it('should create a provider with valid input', async () => {
      const input = {
        name: 'Test Provider',
        preferredChannel: 'EMAIL' as const,
        contactInfo: {
          EMAIL: 'test@example.com',
          SMS: '+1234567890'
        }
      };

      const mockProvider = {
        id: 'provider-123',
        name: input.name,
        preferredChannel: input.preferredChannel,
        contactInfo: JSON.stringify(input.contactInfo),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockPrisma.provider.create as sinon.SinonStub).resolves(mockProvider);

      const result = await service.createProvider(input);

      expect(result).to.have.property('id', 'provider-123');
      expect(result.name).to.equal(input.name);
      expect(result.preferredChannel).to.equal(input.preferredChannel);
      expect(result.contactInfo).to.deep.equal(input.contactInfo);
      expect((mockPrisma.provider.create as sinon.SinonStub).calledOnce).to.be.true;
    });

    it('should default to EMAIL channel if not provided', async () => {
      const input = {
        name: 'Test Provider',
        contactInfo: {
          EMAIL: 'test@example.com'
        }
      };

      const mockProvider = {
        id: 'provider-123',
        name: input.name,
        preferredChannel: 'EMAIL',
        contactInfo: JSON.stringify(input.contactInfo),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockPrisma.provider.create as sinon.SinonStub).resolves(mockProvider);

      const result = await service.createProvider(input);

      expect(result.preferredChannel).to.equal('EMAIL');
    });

    it('should throw ValidationError when no contact info provided', async () => {
      const input = {
        name: 'Test Provider',
        contactInfo: {}
      };

      await expect(service.createProvider(input))
        .to.be.rejectedWith(ValidationError);
    });

    it('should throw ValidationError when preferred channel has no contact value', async () => {
      const input = {
        name: 'Test Provider',
        preferredChannel: 'SMS' as const,
        contactInfo: {
          EMAIL: 'test@example.com'
        }
      };

      await expect(service.createProvider(input))
        .to.be.rejectedWith(ValidationError);
    });
  });

  describe('#getProvider', () => {
    it('should return provider when found', async () => {
      const mockProvider = {
        id: 'provider-123',
        name: 'Test Provider',
        preferredChannel: 'EMAIL',
        contactInfo: JSON.stringify({ EMAIL: 'test@example.com' }),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockPrisma.provider.findUnique as sinon.SinonStub).resolves(mockProvider);

      const result = await service.getProvider('provider-123');

      expect(result.id).to.equal('provider-123');
      expect((mockPrisma.provider.findUnique as sinon.SinonStub).calledWith({
        where: { id: 'provider-123' }
      })).to.be.true;
    });

    it('should throw NotFoundError when provider not found', async () => {
      (mockPrisma.provider.findUnique as sinon.SinonStub).resolves(null);

      await expect(service.getProvider('non-existent'))
        .to.be.rejectedWith(NotFoundError);
    });
  });

  describe('#listProviders', () => {
    it('should return paginated list of providers', async () => {
      const mockProviders = [
        {
          id: 'provider-1',
          name: 'Provider 1',
          preferredChannel: 'EMAIL',
          contactInfo: JSON.stringify({ EMAIL: 'p1@example.com' }),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'provider-2',
          name: 'Provider 2',
          preferredChannel: 'SMS',
          contactInfo: JSON.stringify({ SMS: '+1234567890' }),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      (mockPrisma.provider.findMany as sinon.SinonStub).resolves(mockProviders);
      (mockPrisma.provider.count as sinon.SinonStub).resolves(2);

      const result = await service.listProviders({ limit: 10, offset: 0 });

      expect(result.items).to.have.length(2);
      expect(result.totalCount).to.equal(2);
      expect(result.limit).to.equal(10);
      expect(result.offset).to.equal(0);
    });

    it('should use default pagination when not provided', async () => {
      (mockPrisma.provider.findMany as sinon.SinonStub).resolves([]);
      (mockPrisma.provider.count as sinon.SinonStub).resolves(0);

      const result = await service.listProviders();

      expect(result.limit).to.equal(50);
      expect(result.offset).to.equal(0);
    });
  });

  describe('#updateProvider', () => {
    it('should update provider with valid input', async () => {
      const existing = {
        id: 'provider-123',
        name: 'Old Name',
        preferredChannel: 'EMAIL',
        contactInfo: JSON.stringify({ EMAIL: 'old@example.com' }),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updated = {
        ...existing,
        name: 'New Name',
        contactInfo: JSON.stringify({ EMAIL: 'new@example.com' })
      };

      (mockPrisma.provider.findUnique as sinon.SinonStub).resolves(existing);
      (mockPrisma.provider.update as sinon.SinonStub).resolves(updated);

      const result = await service.updateProvider('provider-123', {
        name: 'New Name',
        contactInfo: { EMAIL: 'new@example.com' }
      });

      expect(result.name).to.equal('New Name');
      expect((mockPrisma.provider.update as sinon.SinonStub).calledOnce).to.be.true;
    });

    it('should throw NotFoundError when provider not found', async () => {
      (mockPrisma.provider.findUnique as sinon.SinonStub).resolves(null);

      await expect(service.updateProvider('non-existent', { name: 'New Name' }))
        .to.be.rejectedWith(NotFoundError);
    });
  });

  describe('#deleteProvider', () => {
    it('should delete provider when found', async () => {
      const existing = {
        id: 'provider-123',
        name: 'Test Provider',
        preferredChannel: 'EMAIL',
        contactInfo: JSON.stringify({ EMAIL: 'test@example.com' }),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockPrisma.provider.findUnique as sinon.SinonStub).resolves(existing);
      (mockPrisma.provider.delete as sinon.SinonStub).resolves(existing);

      await service.deleteProvider('provider-123');

      expect((mockPrisma.provider.delete as sinon.SinonStub).calledOnce).to.be.true;
    });

    it('should throw NotFoundError when provider not found', async () => {
      (mockPrisma.provider.findUnique as sinon.SinonStub).resolves(null);

      await expect(service.deleteProvider('non-existent'))
        .to.be.rejectedWith(NotFoundError);
    });
  });
});

