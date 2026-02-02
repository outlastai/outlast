/**
 * Copyright (C) 2026 by Outlast.
 *
 * Service for initiating voice calls via the voice API.
 */

export interface MakePhoneCallParams {
  phoneNumber: string;
  partialPrompt: string;
  appRef?: string;
}

export interface MakePhoneCallResponse {
  callRef: string;
  voiceResponse: Record<string, unknown>;
}

const DEFAULT_APP_REF = "35089e52-3bf8-40dc-b54a-47169bc4e93d";
const VOICE_API_URL = "https://outlast.ngrok-free.dev/api/voice";

/**
 * Initiates a voice call via the voice API.
 *
 * @param params - Call parameters including phone number and prompt
 * @returns The call reference ID and full API response
 * @throws Error if the API request fails or response is invalid
 */
export async function makePhoneCall(params: MakePhoneCallParams): Promise<MakePhoneCallResponse> {
  const { phoneNumber, partialPrompt, appRef = DEFAULT_APP_REF } = params;

  const payload = {
    phone: phoneNumber,
    appRef,
    partialPrompt
  };

  const response = await fetch(VOICE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Voice API request failed: ${response.status} ${response.statusText}`);
  }

  let respJson: Record<string, unknown>;
  try {
    respJson = (await response.json()) as Record<string, unknown>;
  } catch {
    const text = await response.text();
    throw new Error(`Invalid JSON response from voice API: ${text}`);
  }

  if (!("callRef" in respJson) || typeof respJson.callRef !== "string") {
    throw new Error(`callRef missing from response: ${JSON.stringify(respJson)}`);
  }

  return {
    callRef: respJson.callRef,
    voiceResponse: respJson
  };
}
