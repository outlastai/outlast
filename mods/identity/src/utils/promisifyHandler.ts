/**
 * Copyright (C) 2026 by Outlast.
 */
import { Metadata } from "@grpc/grpc-js";

type GrpcError = {
  code: number;
  message: string;
};

type GrpcHandler<TReq, TRes> = (
  call: { request: TReq; metadata?: Metadata },
  callback: (error?: GrpcError | null, response?: TRes) => void
) => void | Promise<void>;

export function promisifyHandler<TReq, TRes>(handler: GrpcHandler<TReq, TRes>) {
  return (request: TReq, options?: { token?: string; accessKeyId?: string }): Promise<TRes> =>
    new Promise((resolve, reject) => {
      const metadata = new Metadata();
      if (options?.token) {
        metadata.set("token", options.token);
      }
      if (options?.accessKeyId) {
        metadata.set("accessKeyId", options.accessKeyId);
      }

      handler({ request, metadata }, (error, response) => {
        if (error) {
          reject(new Error(error.message));
          return;
        }
        resolve(response as TRes);
      });
    });
}
