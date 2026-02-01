# Outlast

Outlast is an AI-powered workflow automation platform for managing records, contacts, and automated follow-ups.

## Getting Started

### Prerequisites

- Node.js 20+
- Docker
- npm

### Setting Up the Environment

First, clone the repository and install dependencies to get all the workspace packages ready:

```bash
git clone https://github.com/fonoster/outlast.git
cd outlast
npm install
```

Then, copy the example environment file which contains all the required configuration variables:

```bash
cp .env.example .env
```

Next, generate the encryption key used to protect sensitive data in the database:

```bash
npx @47ng/cloak generate
```

Copy the generated key to `OUTLAST_IDENTITY_CLOAK_ENCRYPTION_KEY` in your `.env` file.

Now, build the identity module and generate RSA keys for signing and verifying authentication tokens:

```bash
npm run build
npm run db:generate-keys -w @outlast/identity
```

Copy the generated keys to `OUTLAST_IDENTITY_PRIVATE_KEY` and `OUTLAST_IDENTITY_PUBLIC_KEY` in your `.env` file.

### Starting the Database

First, start Postgres which stores all Outlast data including workflows, records, and contacts:

```bash
npm run start:postgres
```

Then, run the migrations to create the database schema or bring it in sync with the latest changes:

```bash
npm run db:migrate
```

Optionally, seed the database with sample data to help you explore the platform:

```bash
npm run db:seed
```

### Running the Services

First, start the API server which handles all backend operations:

```bash
npm run start:apiserver
```

Then, in a separate terminal, start the dashboard to access the web interface for managing your workflows:

```bash
npm run start:dashboard # Coming soon
```

The API server runs at `http://localhost:3000` and the dashboard at `http://localhost:5173`.

## API Overview

Outlast uses [tRPC](https://trpc.io/) to power its API, providing type-safe communication between clients and the server. All API endpoints are available at `/trpc`.

### Authentication

The API uses JWT-based authentication through an identity service. To authenticate, you first exchange your API credentials (`accessKeyId` and `accessKeySecret`) for an access token, then use that token for subsequent requests.

**Step 1: Exchange API credentials for an access token**

```bash
curl -X POST 'http://localhost:3000/trpc/identity.auth.exchangeApiKey' \
  -H 'Content-Type: application/json' \
  -d '{"accessKeyId":"YOUR_ACCESS_KEY_ID","accessKeySecret":"YOUR_ACCESS_KEY_SECRET"}'
```

> The ol workspaces:login command will create an API key which is located in the `~/.outlast/config.json` file.

This returns a response containing your access token:

Example response:

```json
{ "result": { "data": { "accessToken": "eyJhbGciOiJSUzI1NiIs..." } } }
```

**Step 2: Use the token to make API requests**

Include the token in the `Authorization` header and your `accessKeyId` in the `x-access-key-id` header:

Example request for creating a record:

```bash
curl -X POST 'http://localhost:3000/trpc/createRecord' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'x-access-key-id: YOUR_ACCESS_KEY_ID' \
  -d '{"title":"Test Record","type":"GENERIC","sourceSystem":"MANUAL","sourceRecordId":"test-123"}'
```

### Available Endpoints

| Endpoint                       | Type     | Description                       |
| ------------------------------ | -------- | --------------------------------- |
| `identity.auth.exchangeApiKey` | mutation | Exchange API key for access token |
| `identity.auth.login`          | mutation | Login with username/password      |
| `identity.auth.refresh`        | mutation | Refresh access token              |
| `createRecord`                 | mutation | Create a new record               |
| `updateRecord`                 | mutation | Update an existing record         |
| `deleteRecord`                 | mutation | Delete a record                   |
| `listRecords`                  | query    | List records with pagination      |
| `getRecord`                    | query    | Get a record by ID                |
| `getRecordHistory`             | query    | Get history for a record          |
| `createWorkflow`               | mutation | Create a new workflow             |
| `updateWorkflow`               | mutation | Update an existing workflow       |
| `deleteWorkflow`               | mutation | Delete a workflow                 |
| `listWorkflows`                | query    | List workflows                    |
| `getWorkflow`                  | query    | Get a workflow by ID              |

For queries, use the procedure name as a URL parameter: `GET /trpc/listRecords?input={}`.

For mutations, send a POST request with the input as JSON in the body.

## Using the Command-Line Tool

First, link the CLI globally to make the `ol` command available on your system:

```bash
npm link -w @outlast/ctl
```

Then, login to a workspace to authenticate with the API server:

```bash
ol workspaces:login
```

You can now use `ol --help` to see all available commands.

## Creating a Workflow

Workflows define how Outlast automates follow-ups on records. Each workflow specifies an AI model, available tools, a schedule, and rules for when to take action. Create a YAML file with your workflow configuration:

```yaml
name: Invoice Follow-up Workflow
description: Automated follow-up for unpaid invoices
model: gpt-4o
temperature: 0.7

systemPrompt: |
  You are a professional accounts receivable agent.
  Follow up on unpaid invoices politely but firmly.

tools:
  - sendEmail
  - sendCall
  - updateRecordStatus
  - getRecord
  - getRecordHistory

schedule: "0/5 * * * *" # every 5 minutes

# Internally we use Handlebars to render the template with the record and contact data
emailTemplate: |

  Dear {{contact.name}},

  This is a friendly reminder regarding invoice {{record.title}}.
  Current status: {{record.status}}
  {{#if record.dueAt}}Due date: {{record.dueAt}}{{/if}}

  Please let us know if you have any questions.

  Best regards,
  {{workspace.name}}

callPrompt: |
  Call regarding invoice {{record.title}}.
  Contact: {{contact.name}}
  Amount due information is in the record metadata.
  Priority: {{record.priority}}

# Scheduler rules define when to take action based on the record's status, priority, and history
schedulerRules:
  minDaysBetweenActions: 3
  maxActionAttempts: 5
  enabledStatuses:
    - OPEN
    - BLOCKED
  batchSize: 25
```

Then, create the workflow using the CLI to register it with the system:

```bash
ol workflows:create -f workflow.yaml
```

Finally, verify the workflow was created and is ready to run:

```bash
ol workflows:list
```

## Creating a Record

Records represent items to track and automate (e.g. invoices, tickets, shipments). Each record has a required title, type, source system, and source record ID. You can link records to contacts and workflows.

### Example record file

Create a YAML or JSON file with your record:

```yaml
# record.yaml
title: Invoice INV-2026-001
type: INVOICE
status: OPEN
priority: HIGH
sourceSystem: SALESFORCE
sourceRecordId: SF-OPP-12345
dueAt: 2026-02-15
metadata:
  amount: 5000.00
  currency: USD
  sku: PROD-001
contactId: <contact-uuid> # Optional - link to a contact
workflowIds: # Optional - link to workflows
  - <workflow-uuid-1>
  - <workflow-uuid-2>
```

### Using the SDK

```javascript
const SDK = require("@outlast/sdk");

async function main() {
  const client = new SDK.Client({ accessKeyId: "WO00000000000000000000000000000000" });
  await client.loginWithApiKey(process.env.API_KEY, process.env.API_SECRET);

  const records = new SDK.Records(client);

  // Create a new record
  const record = await records.createRecord({
    title: "Invoice INV-2026-001",
    type: "INVOICE",
    sourceSystem: "SALESFORCE",
    sourceRecordId: "SF-OPP-12345",
    contactId: "contact-uuid",
    workflowIds: ["workflow-uuid-1", "workflow-uuid-2"]
  });
  console.log("Created:", record.id, record.title);

  // Update an existing record by sourceRecordId (same ID triggers upsert)
  const updated = await records.createRecord({
    title: "Invoice INV-2026-001",
    type: "INVOICE",
    sourceSystem: "SALESFORCE",
    sourceRecordId: "SF-OPP-12345",
    status: "BLOCKED",
    metadata: { amount: 6000.0 },
    allowOverwrite: true,
    overwriteFields: ["status", "metadata.amount"]
  });
  console.log("Updated:", updated.id);
}
```

### Using the CLI

Create a record interactively (prompts for title, type, source system, source record ID, contact, and workflows):

```bash
ol records:create
```

Create a record from a file:

```bash
ol records:create --from-file record.yaml
```

Update an existing record when the same `sourceRecordId` already exists (requires `--overwrite-fields`):

```bash
ol records:create --from-file record.yaml --allow-overwrite --overwrite-fields "status,metadata.amount"
```
