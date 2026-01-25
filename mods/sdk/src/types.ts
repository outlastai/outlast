/**
 * Copyright (C) 2026 by Outlast. MIT License.
 */
export type ClientConfig = {
  endpoint?: string;
  accessKeyId?: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  accessKeyId?: string;
};

export type Workspace = {
  ref: string;
  name: string;
  accessKeyId: string;
  ownerRef?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type ListWorkspacesResponse = {
  items: Workspace[];
  nextPageToken?: string;
};

export type CreateWorkspaceRequest = {
  name: string;
};

export type UpdateWorkspaceRequest = {
  ref: string;
  name: string;
};

export type DeleteWorkspaceResponse = {
  ref: string;
};

export type CreateApiKeyRequest = {
  role: "WORKSPACE_OWNER" | "WORKSPACE_ADMIN" | "WORKSPACE_MEMBER";
  expiresAt?: number;
};

export type CreateApiKeyResponse = {
  ref: string;
  accessKeyId: string;
  accessKeySecret: string;
};

export type ApiKey = {
  ref: string;
  accessKeyId: string;
  role: string;
  expiresAt?: string | Date | number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type ListApiKeysRequest = {
  pageSize?: number;
  pageToken?: string;
};

export type ListApiKeysResponse = {
  items: ApiKey[];
  nextPageToken?: string;
};

export type RegenerateApiKeyResponse = {
  ref: string;
  accessKeyId: string;
  accessKeySecret: string;
};

export type Record = {
  id: string;
  title: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type CreateRecordRequest = {
  title: string;
};
