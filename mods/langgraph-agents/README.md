# @outlast/langgraph-agents

Config-driven LangGraph workflow system with async interrupt support for external webhooks (Fonoster).

## Overview

This module provides a flexible workflow system using LangGraph that:

- Defines workflows in YAML configuration files
- Executes workflows with state persistence (PostgreSQL checkpointer)
- Supports async interrupts for external operations (e.g., phone calls)
- Resumes workflows via webhooks when external operations complete

## Installation

```bash
npm install
npm run build
```

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/outlast

# Voice API (Fonoster)
VOICE_API_URL=https://outlast.ngrok-free.dev/api/voice
VOICE_APP_REF=35089e52-3bf8-40dc-b54a-47169bc4e93d

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Outlast API
OUTLAST_API_URL=http://localhost:3000
OUTLAST_ACCESS_KEY=your-access-key

# Runner settings
RUNNER_POLL_INTERVAL=5
RUNNER_BATCH_SIZE=10

# Webhook settings
WEBHOOK_PORT=8001
```

## Running

### Start the Workflow Runner

```bash
npm run start:runner
```

### Start the Webhook Handler

```bash
npm run start:webhook
```

## Workflow Configs

Configs live in `src/configs/`. Example:

```yaml
# src/configs/emailRouter.yaml
name: emailRouter
description: Route based on call outcome

nodes:
  - name: call
    type: makePhoneCall
  - name: wait
    type: waitFonoster
  - name: email
    type: sendEmail
  - name: escalate
    type: escalate

edges:
  - from: call
    to: wait
  - from: wait
    type: conditional
    router: callStatusRouter
    routes:
      completed: email
      failed: escalate
      noAnswer: escalate
  - from: email
    to: END
  - from: escalate
    to: END

entryPoint: call

interruptBefore:
  - wait
```

## Adding Nodes

Create a new file in `src/nodes/`:

```typescript
import { createNode } from "./registry.js";
import type { WorkflowStateType } from "../state.js";

export const myNode = createNode("myNode", async (state: WorkflowStateType) => {
  // Your logic here
  return {
    someField: "value",
    messages: ["Node executed"]
  };
});
```

Then import it in `src/nodes/index.ts`.

## Adding Routers

Create a new file in `src/routers/`:

```typescript
import { createRouter } from "./registry.js";
import type { WorkflowStateType } from "../state.js";

export const myRouter = createRouter("myRouter", (state: WorkflowStateType) => {
  if (state.someCondition) {
    return "pathA";
  }
  return "pathB";
});
```

Then import it in `src/routers/index.ts`.

## Architecture

```
Email arrives (Pub/Sub)
        ↓
emailreaderv03: createRecord() + scheduleWorkflowRun()
        ↓
Outlast DB: INSERT workflow_runs (status=PENDING)
        ↓
runner.ts: Polls for pending workflows
        ↓
runner.ts: Loads config, builds graph, invokes
        ↓
LangGraph: Runs nodes until interrupt (waitFonoster)
        ↓
Outlast DB: status=INTERRUPTED, callRef mapping stored
        ↓
... Fonoster call happens ...
        ↓
webhook.ts: Receives callback, resumes workflow
        ↓
LangGraph: Continues from waitFonoster
        ↓
Outlast DB: status=COMPLETED
```
