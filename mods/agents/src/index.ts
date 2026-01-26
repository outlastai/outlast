/**
 * Copyright (C) 2026 by Outlast.
 *
 * @outlast/agents - AI Agents module
 */

// Static check exports
export {
  staticPreCheck,
  buildAnalysisContext,
  calculateDaysSince,
  ACTION_CHANNELS,
  type ActionChannel,
  type RecordStatus,
  type PriorityLevel,
  type RecordAnalysisContext,
  type StaticRules,
  type StaticPreCheckResult,
  type CheckResult,
  // Individual checks (for testing)
  checkMaxAttempts,
  checkTooSoon,
  checkRecordTooRecent,
  checkRecentlyUpdated,
  checkHighPriority,
  checkLowPriority,
  checkFirstAction
} from "./staticCheck/index.js";

// Tool exports
export {
  type ToolFunction,
  type ToolResult,
  type ToolExecutor,
  allTools,
  getToolByName,
  sendEmailTool,
  sendCallTool,
  getRecordTool,
  getRecordHistoryTool,
  updateRecordStatusTool,
  createToolExecutor,
  type ToolExecutorDependencies,
  type ToolHandler
} from "./tools/index.js";

// LLM exports
export {
  createInvokeLLM,
  getOpenAIClient,
  resetOpenAIClient,
  filterTools,
  buildMessages,
  addAssistantToolCalls,
  addToolResult,
  type Agent,
  type Message,
  type MessageContentItem,
  type ToolCall,
  type InvokeLLMFn
} from "./llm/index.js";

// Runner exports
export {
  createWorkflowRunner,
  createCronScheduler,
  processRecord,
  listRecordsForWorkflow,
  type WorkflowWithRules,
  type RecordWithHistory,
  type RecordRunResult,
  type WorkflowRunResult,
  type WorkflowRunnerDependencies,
  type CronSchedulerDependencies
} from "./runner/index.js";
