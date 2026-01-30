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
