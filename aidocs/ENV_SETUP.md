# Environment Variables Setup

All environment variables are now centralized at the project root.

## Setup

1. **Create `.env` file at project root:**

```bash
cp env.example .env
# Or create manually
```

2. **Fill in your values:**

```bash
# Application
NODE_ENV=development
PORT=3000
LOGS_LEVEL=info

# Database
DATABASE_URL="file:./mods/apiserver/dev.db"

# AI Agent (OpenAI)
OPENAI_API_KEY=your-openai-api-key-here
AI_MODEL=gpt-4
AI_TEMPERATURE=0.7
API_BASE_URL=http://localhost:3000

# Email Channel (Resend)
RESEND_API_KEY=re_your_resend_api_key_here
EMAIL_FROM=noreply@outlast.com
EMAIL_FROM_NAME=OutLast
EMAIL_REPLY_TO=support@outlast.com

# Follow-up Configuration
MIN_DAYS_BETWEEN_FOLLOW_UPS=7
MAX_FOLLOW_UP_ATTEMPTS=5
ESCALATION_THRESHOLD=3
```

## Environment Variables Reference

### Required

- `DATABASE_URL` - SQLite database path (relative to project root)
- `OPENAI_API_KEY` - OpenAI API key for the agent
- `RESEND_API_KEY` - Resend API key for email channel

### Optional (with defaults)

- `NODE_ENV` - development | production | test (default: development)
- `PORT` - API server port (default: 3000)
- `LOGS_LEVEL` - verbose | info | warn | error (default: info)
- `AI_MODEL` - OpenAI model (default: gpt-4)
- `AI_TEMPERATURE` - Agent temperature (default: 0.7)
- `API_BASE_URL` - API server URL (default: http://localhost:3000)
- `EMAIL_FROM` - Default from email (default: noreply@outlast.com)
- `EMAIL_FROM_NAME` - From name (default: OutLast)
- `EMAIL_REPLY_TO` - Reply-to email (optional)
- `MIN_DAYS_BETWEEN_FOLLOW_UPS` - Minimum days (default: 7)
- `MAX_FOLLOW_UP_ATTEMPTS` - Max attempts (default: 5)
- `ESCALATION_THRESHOLD` - Escalation threshold (default: 3)

## Usage

The environment variables are automatically loaded from the root `.env` file when:
- Starting the API server (`npm run dev`)
- Running the AI agent (`npm run ai:example`)
- Running Prisma commands

No need to manually load them - it's handled automatically!

## Database Path

The `DATABASE_URL` should be relative to the project root:

```bash
# Correct (relative to root)
DATABASE_URL="file:./mods/apiserver/dev.db"

# Also works (absolute)
DATABASE_URL="file:/absolute/path/to/dev.db"
```

## Security

⚠️ **Never commit `.env` to git!**

The `.env` file is already in `.gitignore`. Only commit `.env.example` as a template.

