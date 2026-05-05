# Connector Sync Workers

Durable background job system for syncing external integrations (Stripe, Plaid, Xero, QuickBooks, etc.) into the accountant system.

## Architecture

### Components

1. **connectorProviders.ts** - Pluggable sync adapter
   - Supports multiple providers (Stripe, Plaid, Xero, QuickBooks, mock)
   - Extensible for custom providers
   - Returns sync result with items processed and next sync time

2. **Database Schema** (`connector_sync_jobs` table)
   - `id` (UUID) - Primary key
   - `company_id` (UUID) - Company scope
   - `connector_config_id` (UUID) - Reference to connector configuration
   - `job_name` - Human readable name
   - `payload` (JSONB) - Job data and result metadata
   - `status` - 'queued' | 'running' | 'succeeded' | 'failed'
   - `attempts` - Retry counter
   - `last_error` - Error message if failed
   - `created_by` - User who created job
   - `created_at` - Timestamp

3. **API Endpoints**
   - `GET /api/integrations/connectors/sync/jobs` - List all jobs
   - `POST /api/integrations/connectors/sync/jobs` - Create new job
   - `GET /api/integrations/connectors/sync/jobs/[id]` - Get job details
   - `POST /api/integrations/connectors/sync/jobs/[id]` - Re-run failed job
   - `POST /api/integrations/connectors/sync/process` - Process next queued job (internal worker endpoint)

4. **Background Worker** (`scripts/connector-sync-worker.js`)
   - Polls process endpoint with exponential backoff
   - Starts with 5s interval, backs off to max 30s
   - Resets interval on successful job processing

5. **UI Page** (`app/(pillars)/integrations/connector-sync-jobs/page.tsx`)
   - List all sync jobs in table
   - View job details, error messages, payload
   - Re-run failed jobs
   - Shows linked connector config info

## Usage

### Starting the Worker

```bash
# Set required environment variables
export SYNC_PROCESS_URL=http://localhost:3000/api/integrations/connectors/sync/process
export AUTH_TOKEN=your_bearer_token_here

# Start worker
node scripts/connector-sync-worker.js
```

The worker will:
1. Poll the process endpoint every 5 seconds (initially)
2. If jobs are processed, reset backoff to 5s
3. If no jobs, increase backoff exponentially (max 30s)
4. Log all activity with timestamps

### Creating a Sync Job

Via API:
```bash
curl -X POST http://localhost:3000/api/integrations/connectors/sync/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "connectorConfigId": "uuid-of-connector",
    "jobName": "Sync Stripe Charges",
    "payload": {
      "lastSyncTime": "2024-01-15T10:30:00Z"
    }
  }'
```

### Job Lifecycle

1. **Queued** - Job created, waiting to be processed
2. **Running** - Worker picked up the job, processing started
3. **Succeeded** - Job completed, result stored in payload
4. **Failed** - Job errored, error message in `last_error`

Failed jobs can be re-run via the API or UI.

## Provider Implementations

### Mock Provider (Default)
- Used for testing and development
- Returns random items processed count
- Succeeds 100% of the time

### Stripe
- Would fetch recent charges and transactions
- Currently mock implementation (ready for real implementation)

### Plaid
- Would fetch bank transactions
- Currently mock implementation (ready for real implementation)

### Xero
- Would sync invoices and expenses
- Currently mock implementation (ready for real implementation)

### QuickBooks
- Would sync transactions
- Currently mock implementation (ready for real implementation)

## Production Considerations

### Durability
Currently uses simple polling. For production reliability, consider:
- **Trigger.dev** - Fully managed serverless job queue with built-in retries
- **Inngest** - Durable background job framework
- **AWS SQS + Lambda** - AWS-native queue and compute

### Idempotency
- Implement idempotency keys in payload to prevent duplicate syncs
- Use database constraints (unique on company_id + connector_id + job_name + sync_time)

### Monitoring
- Add metrics: jobs processed/hour, failure rates per provider
- Alert on repeated failures for a single connector
- Track sync lag: time between queued and completed

### Retry Strategy
Current: Simple attempts counter
Consider: Exponential backoff with max retries (3-5), dead-letter queue for permanent failures

## Testing

Tests confirm:
- Parser format detection works correctly
- Bank transaction matching engine functions properly
- Integration pattern follows auth and company scoping correctly
