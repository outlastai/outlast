/**
 * Copyright (C) 2026 by Outlast.
 *
 * Node: makePhoneCall
 * Initiates a phone call via the Fonoster/Voice API.
 */
import { createNode } from "./registry.js";
import type { WorkflowStateType } from "../state.js";

// Configuration from environment
const VOICE_API_URL = process.env.VOICE_API_URL ?? "https://outlast.ngrok-free.dev/api/voice";
const VOICE_APP_REF = process.env.VOICE_APP_REF ?? "35089e52-3bf8-40dc-b54a-47169bc4e93d";

/**
 * Initiate a phone call via the voice API.
 */
export const makePhoneCall = createNode(
  "makePhoneCall",
  async (state: WorkflowStateType): Promise<Partial<WorkflowStateType>> => {
    const data = state.data ?? {};
    const phoneNumber = data.phoneNumber as string | undefined;
    const partialPrompt = (data.jobDescription as string) ?? "";

    if (!phoneNumber) {
      return {
        callStatus: "failed",
        errors: ["No phone number provided in data"]
      };
    }

    // Build the voice API request
    const payload = {
      phone: phoneNumber,
      appRef: VOICE_APP_REF,
      partialPrompt
    };

    try {
      const response = await fetch(VOICE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text();
        return {
          callStatus: "failed",
          errors: [`Voice API error (${response.status}): ${text}`]
        };
      }

      const respJson = (await response.json()) as { callRef?: string };

      if (!respJson.callRef) {
        return {
          callStatus: "failed",
          errors: [`callRef missing from voice API response: ${JSON.stringify(respJson)}`]
        };
      }

      return {
        callRef: respJson.callRef,
        callStatus: "pending",
        messages: [`Phone call initiated with callRef: ${respJson.callRef}`]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        callStatus: "failed",
        errors: [`Voice API request failed: ${message}`]
      };
    }
  }
);
