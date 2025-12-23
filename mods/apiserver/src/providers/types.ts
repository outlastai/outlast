import type { CommunicationChannel } from '../types/enums';

export interface ContactInfo {
  SMS?: string;
  EMAIL?: string;
  VOICE?: string;
}

export interface CreateProviderRequest {
  name: string;
  country?: string;
  preferredChannel?: CommunicationChannel;
  contactInfo: ContactInfo;
}

export interface UpdateProviderRequest {
  name?: string;
  country?: string | null;
  preferredChannel?: CommunicationChannel;
  contactInfo?: ContactInfo;
}

export interface ProviderResponse {
  id: string;
  name: string;
  country: string | null;
  preferredChannel: CommunicationChannel;
  contactInfo: ContactInfo;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListProvidersQuery {
  limit?: number;
  offset?: number;
}

export interface ListProvidersResponse {
  items: ProviderResponse[];
  totalCount: number;
  limit: number;
  offset: number;
}

