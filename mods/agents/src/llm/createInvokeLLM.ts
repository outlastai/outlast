/**
 * Copyright (C) 2026 by Outlast.
 *
 * Create LLM invocation function with tool calling support.
 */
import type { Agent, Message, InvokeLLMFn } from "./types.js";
import type { ToolFunction, ToolExecutor } from "../tools/types.js";
import { getOpenAIClient } from "./createOpenAIClient.js";
import { filterTools } from "./filterTools.js";
import { buildMessages, addAssistantToolCalls, addToolResult } from "./buildMessages.js";

const MAX_TOOL_ITERATIONS = 15;

interface CreateInvokeLLMOptions {
  apiKey: string;
  agent: Agent;
  allTools: ToolFunction[];
  toolExecutor: ToolExecutor;
}

/**
 * Create an LLM invocation function for a specific agent.
 */
export function createInvokeLLM(options: CreateInvokeLLMOptions): InvokeLLMFn {
  const { apiKey, agent, allTools, toolExecutor } = options;
  const client = getOpenAIClient(apiKey);
  const agentTools = filterTools(allTools, agent.allowedTools);

  return async function invokeLLM(
    history: Message[],
    userMessage: string,
    context?: Record<string, unknown>
  ): Promise<string> {
    let messages = buildMessages(agent.systemPrompt, history, userMessage);

    // Initial LLM call
    let response = await client.chat.completions.create({
      model: agent.model || "gpt-4o",
      messages: messages as Parameters<typeof client.chat.completions.create>[0]["messages"],
      tools:
        agentTools.length > 0
          ? (agentTools as Parameters<typeof client.chat.completions.create>[0]["tools"])
          : undefined,
      tool_choice: agentTools.length > 0 ? "auto" : undefined,
      temperature: agent.temperature ?? 0.7
    });

    let assistantMessage = response.choices[0].message;
    let iterations = 0;

    // Tool calling loop
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      iterations++;
      if (iterations > MAX_TOOL_ITERATIONS) {
        throw new Error(`Tool call loop exceeded ${MAX_TOOL_ITERATIONS} iterations`);
      }

      // Filter to function calls
      type FunctionToolCall = {
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      };
      const functionCalls = assistantMessage.tool_calls.filter(
        (tc): tc is FunctionToolCall => tc.type === "function"
      );

      // Add assistant message with tool calls
      messages = addAssistantToolCalls(
        messages,
        assistantMessage.content,
        functionCalls.map((tc: FunctionToolCall) => ({
          id: tc.id,
          type: tc.type,
          function: tc.function
        }))
      );

      // Execute each tool call
      for (const toolCall of functionCalls) {
        const toolArgs = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
        const result = await toolExecutor(toolCall.function.name, toolArgs, context);
        messages = addToolResult(
          messages,
          toolCall.function.name,
          toolCall.id,
          JSON.stringify(result)
        );
      }

      // Get next response
      response = await client.chat.completions.create({
        model: agent.model || "gpt-4o",
        messages: messages as Parameters<typeof client.chat.completions.create>[0]["messages"],
        tools:
          agentTools.length > 0
            ? (agentTools as Parameters<typeof client.chat.completions.create>[0]["tools"])
            : undefined,
        tool_choice: agentTools.length > 0 ? "auto" : undefined,
        temperature: agent.temperature ?? 0.7
      });

      assistantMessage = response.choices[0].message;
    }

    return assistantMessage.content || "";
  };
}
