# Connector Management System

Complete CRUD and advanced management interface for connector configurations. Supports filtering, pagination, bulk operations, and export functionality.

## Features

### CRUD Operations
- **Create** - Add new connectors with provider selection and JSON settings
- **Read** - List connectors with pagination (default 10 per page)
- **Update** - Edit connector name, status, and settings
- **Delete** - Remove individual or bulk delete selected connectors

### Filtering & Pagination
- **Provider Filter** - Filter by connector type (Stripe, Plaid, Xero, QuickBooks, Mock)
- **Status Filter** - Filter by active/inactive status
- **Search** - Full-text search by connector name or provider
- **Pagination** - Configurable page size, page navigation
- **Sorting** - Reverse chronological by creation date

### Advanced Features
- **Bulk Selection** - Select/deselect individual items or all on page
- **Bulk Actions** - Activate/deactivate multiple connectors at once
- **Bulk Delete** - Delete multiple connectors with confirmation
- **Test Connection** - Validate connector credentials by attempting sync
- **Export** - Download connector list as JSON or CSV

### UI Components
- Modal form for create/edit operations
- JSON settings editor for advanced configuration
- Real-time test result display with success/error feedback
- Detailed connector info panel
- Responsive table with checkbox column

## API Endpoints

### List Connectors
```bash
GET /api/integrations/connectors
  ?page=1
  &pageSize=10
  &provider=stripe
  &status=active
  &search=stripe_account
```

Response:
```json
{
  "supportedProviders": [...],
  "items": [...],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### Create Connector
```bash
POST /api/integrations/connectors
{
  "provider": "stripe",
  "name": "My Stripe Account",
  "settings": {"apiKey": "sk_test_..."}
}
```

### Update Connector
```bash
PUT /api/integrations/connectors/{id}
{
  "name": "Updated Name",
  "status": "active",
  "settings": {"apiKey": "sk_test_..."}
}
```

### Delete Connector
```bash
DELETE /api/integrations/connectors/{id}
```

### Test Connector
```bash
POST /api/integrations/connectors/{id}/test
```

Response:
```json
{
  "success": true,
  "message": "Connection successful. Mock sync completed for mock",
  "itemsProcessed": 5,
  "provider": "mock"
}
```

### Bulk Update
```bash
POST /api/integrations/connectors/bulk/update
{
  "ids": ["id1", "id2", "id3"],
  "action": "status" | "delete",
  "status": "active" | "inactive"  // required if action="status"
}
```

### Export Connectors
```bash
GET /api/integrations/connectors/export
  ?format=json|csv
  &provider=stripe
  &status=active
```

## Database Schema

```sql
connector_configs (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'inactive')),
  settings JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ,
  UNIQUE (company_id, provider, name)
)
```

## UI Usage

### Creating a Connector
1. Click "+ New Connector"
2. Select provider from dropdown
3. Enter connector name (must be unique per provider per company)
4. Enter settings as JSON (e.g., `{"apiKey": "...", "accountId": "..."}`)
5. Click "Create"

### Testing a Connector
1. Select a connector from the table
2. Click "Test" button
3. View test result in details panel
4. Green background = success, red background = failed

### Filtering Connectors
1. Use Provider dropdown to filter by type
2. Use Status dropdown to filter by active/inactive
3. Use Search box to find by name or provider
4. Click "Clear Filters" to reset all filters

### Bulk Operations
1. Use checkboxes to select one or more connectors
2. Action bar appears at top with:
   - **Activate** - Set selected to active status
   - **Deactivate** - Set selected to inactive status
   - **Delete** - Delete selected connectors (with confirmation)
   - **Export JSON** - Download selected connectors as JSON
   - **Export CSV** - Download selected connectors as CSV

### Pagination
- Navigate between pages using Previous/Next buttons
- Current page indicator shows (e.g., "Page 1 of 3 (25 total)")
- Page size is configurable per session

## Error Handling

### Validation Errors
- Duplicate connector name per provider: Returns 409 Conflict
- Missing required fields: Returns 400 Bad Request
- Invalid JSON settings: Caught on client side

### Not Found
- Connector doesn't exist: Returns 404
- Connector not owned by user's company: Returns 403

### Network Errors
- Failed fetch: Shows "Network error" in test result
- All operations degrade gracefully with user alerts

## Settings JSON Format

Each provider may require different settings. Examples:

**Stripe**:
```json
{
  "apiKey": "sk_test_...",
  "webhookSecret": "whsec_..."
}
```

**Plaid**:
```json
{
  "clientId": "...",
  "secret": "...",
  "environment": "sandbox"
}
```

**Xero**:
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "tenantId": "..."
}
```

## Performance

- Pagination limits results to 10 per page (default)
- Database indexes on (company_id, provider, status, created_at)
- Full-text search via ilike operator
- Bulk operations use single database transaction

## Security

- All operations scoped to authenticated user's company
- Row-level security (RLS) enforced in database
- Settings stored as JSONB (encrypted at rest recommended)
- Test endpoint validates provider before attempting connection
- Bulk operations verified for company ownership

## Future Enhancements

- OAuth connector setup wizard (instead of manual API keys)
- Connector credentials validation rules per provider
- Connection history and last sync timestamp
- Rate limiting per connector
- Audit log of connector changes
- Webhook management UI for providers that support it
- Connector templates with pre-configured settings
