import { PrismaClient, Provider } from '@prisma/client';
import type { CommunicationChannel } from '../types/enums';
import { getLogger } from '@outlast/logger';
import { NotFoundError, ValidationError } from '@outlast/common';
import type {
  CreateProviderRequest,
  UpdateProviderRequest,
  ProviderResponse,
  ListProvidersQuery,
  ListProvidersResponse,
  ContactInfo
} from './types';

interface ProviderServiceDependencies {
  prisma: PrismaClient;
  logger: ReturnType<typeof getLogger>;
}

function validateContactInfo(contactInfo: ContactInfo): void {
  const hasAtLeastOne = contactInfo.SMS || contactInfo.EMAIL || contactInfo.VOICE;
  if (!hasAtLeastOne) {
    throw new ValidationError('At least one contact method (SMS, EMAIL, or VOICE) is required');
  }
}

function validatePreferredChannel(
  preferredChannel: CommunicationChannel,
  contactInfo: ContactInfo
): void {
  const hasChannel = contactInfo[preferredChannel];
  if (!hasChannel) {
    throw new ValidationError(
      `Preferred channel ${preferredChannel} must have a contact value in contactInfo`
    );
  }
}

function mapProviderToResponse(provider: Provider): ProviderResponse {
  return {
    id: provider.id,
    name: provider.name,
    country: provider.country,
    preferredChannel: provider.preferredChannel as CommunicationChannel,
    contactInfo: JSON.parse(provider.contactInfo) as ContactInfo,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt
  };
}

export function createProviderService(
  dependencies: ProviderServiceDependencies
) {
  const { prisma, logger } = dependencies;

  return {
    async createProvider(
      data: CreateProviderRequest
    ): Promise<ProviderResponse> {
      logger.info('Creating provider', { name: data.name });

      validateContactInfo(data.contactInfo);
      const preferredChannel: CommunicationChannel = (data.preferredChannel || 'EMAIL') as CommunicationChannel;
      validatePreferredChannel(preferredChannel, data.contactInfo);

      const provider = await prisma.provider.create({
        data: {
          name: data.name,
          country: data.country,
          preferredChannel,
          contactInfo: JSON.stringify(data.contactInfo)
        }
      });

      logger.info('Provider created', { providerId: provider.id });
      return mapProviderToResponse(provider);
    },

    async getProvider(id: string): Promise<ProviderResponse> {
      logger.verbose('Getting provider', { providerId: id });

      const provider = await prisma.provider.findUnique({
        where: { id }
      });

      if (!provider) {
        throw new NotFoundError('Provider', id);
      }

      return mapProviderToResponse(provider);
    },

    async listProviders(
      query: ListProvidersQuery = {}
    ): Promise<ListProvidersResponse> {
      const limit = Math.min(query.limit || 50, 100);
      const offset = query.offset || 0;

      logger.verbose('Listing providers', { limit, offset });

      const [items, totalCount] = await Promise.all([
        prisma.provider.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.provider.count()
      ]);

      return {
        items: items.map(mapProviderToResponse),
        totalCount,
        limit,
        offset
      };
    },

    async updateProvider(
      id: string,
      data: UpdateProviderRequest
    ): Promise<ProviderResponse> {
      logger.info('Updating provider', { providerId: id });

      const existing = await prisma.provider.findUnique({
        where: { id }
      });

      if (!existing) {
        throw new NotFoundError('Provider', id);
      }

      const contactInfo = data.contactInfo
        ? { ...JSON.parse(existing.contactInfo), ...data.contactInfo }
        : JSON.parse(existing.contactInfo);
      const preferredChannel: CommunicationChannel = (data.preferredChannel || existing.preferredChannel) as CommunicationChannel;

      if (data.contactInfo) {
        validateContactInfo(contactInfo);
      }
      validatePreferredChannel(preferredChannel, contactInfo);

      const provider = await prisma.provider.update({
        where: { id },
        data: {
          name: data.name,
          country: data.country,
          preferredChannel,
          contactInfo: JSON.stringify(contactInfo)
        }
      });

      logger.info('Provider updated', { providerId: id });
      return mapProviderToResponse(provider);
    },

    async deleteProvider(id: string): Promise<void> {
      logger.info('Deleting provider', { providerId: id });

      const existing = await prisma.provider.findUnique({
        where: { id }
      });

      if (!existing) {
        throw new NotFoundError('Provider', id);
      }

      await prisma.provider.delete({
        where: { id }
      });

      logger.info('Provider deleted', { providerId: id });
    }
  };
}

