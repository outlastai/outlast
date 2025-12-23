import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { PrismaClient } from '@prisma/client';
import type { CommunicationChannel } from '../types/enums';
import { getLogger } from '@outlast/logger';
import { NotFoundError, ValidationError } from '@outlast/common';
import { createProviderService } from './provider-service';

use(chaiAsPromised);

describe('ProviderService Integration', () => {
  let prisma: PrismaClient;
  let service: ReturnType<typeof createProviderService>;
  let logger: ReturnType<typeof getLogger>;

  before(async () => {
    prisma = new PrismaClient();
    logger = getLogger({ service: 'test', filePath: __filename });
    service = createProviderService({ prisma, logger });

    // Clean up before tests - delete in order to respect foreign key constraints
    await prisma.followUp.deleteMany({});
    await prisma.orderHistory.deleteMany({});
    await prisma.escalation.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.provider.deleteMany({});
  });

  after(async () => {
    // Clean up after tests - delete in order to respect foreign key constraints
    await prisma.followUp.deleteMany({});
    await prisma.orderHistory.deleteMany({});
    await prisma.escalation.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.provider.deleteMany({});
    await prisma.$disconnect();
  });

  describe('Provider CRUD operations', () => {
    let createdProviderId: string;

    it('should create a provider', async () => {
      const input = {
        name: 'Integration Test Provider',
        preferredChannel: 'EMAIL' as CommunicationChannel,
        contactInfo: {
          EMAIL: 'integration@test.com',
          SMS: '+1234567890'
        }
      };

      const result = await service.createProvider(input);

      expect(result).to.have.property('id');
      expect(result.name).to.equal(input.name);
      expect(result.preferredChannel).to.equal(input.preferredChannel);
      expect(result.contactInfo.EMAIL).to.equal(input.contactInfo.EMAIL);
      
      createdProviderId = result.id;
    });

    it('should get the created provider', async () => {
      const result = await service.getProvider(createdProviderId);

      expect(result.id).to.equal(createdProviderId);
      expect(result.name).to.equal('Integration Test Provider');
    });

    it('should list providers', async () => {
      const result = await service.listProviders();

      expect(result.items.length).to.be.greaterThan(0);
      expect(result.totalCount).to.be.greaterThan(0);
      const found = result.items.find(p => p.id === createdProviderId);
      expect(found).to.not.be.undefined;
    });

    it('should update the provider', async () => {
      const result = await service.updateProvider(createdProviderId, {
        name: 'Updated Provider Name',
        contactInfo: {
          EMAIL: 'updated@test.com'
        }
      });

      expect(result.name).to.equal('Updated Provider Name');
      expect(result.contactInfo.EMAIL).to.equal('updated@test.com');
    });

    it('should delete the provider', async () => {
      await service.deleteProvider(createdProviderId);

      await expect(service.getProvider(createdProviderId))
        .to.be.rejectedWith(NotFoundError);
    });
  });

  describe('Validation', () => {
    it('should reject provider without contact info', async () => {
      await expect(
        service.createProvider({
          name: 'Invalid Provider',
          contactInfo: {}
        })
      ).to.be.rejectedWith(ValidationError);
    });

    it('should reject provider with preferred channel missing contact', async () => {
      await expect(
        service.createProvider({
          name: 'Invalid Provider',
          preferredChannel: 'SMS' as CommunicationChannel,
          contactInfo: {
            EMAIL: 'test@example.com'
          }
        })
      ).to.be.rejectedWith(ValidationError);
    });
  });
});

