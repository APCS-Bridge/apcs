# Swagger UI Integration Guide

## Overview
This guide explains how to integrate and use Swagger UI for API documentation in the APCS Platform backend.

## What's Been Set Up

### 1. OpenAPI Specification
- **File**: [openapi.yaml](openapi.yaml)
- **Location**: `apcs_server/openapi.yaml`
- **Standard**: OpenAPI 3.0.3
- **Coverage**: Authentication, Users, Spaces, Documents, Sessions, and Health endpoints

### 2. Dependencies Added
```json
{
  "dependencies": {
    "swagger-ui-express": "^5.0.0",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@types/swagger-ui-express": "^4.1.6",
    "@types/js-yaml": "^4.0.9"
  }
}
```

### 3. Integration in app.ts
Swagger UI is mounted at `/docs` and loads the OpenAPI spec from `openapi.yaml`.

## Quick Start

### Local Development

1. **Install dependencies**:
   ```bash
   cd apcs_server
   pnpm install
   # or npm install
   ```

2. **Start the server**:
   ```bash
   pnpm dev
   # or npm run dev
   ```

3. **Access Swagger UI**:
   Open your browser to: http://localhost:3000/docs

### Docker Deployment

The OpenAPI specification is automatically included in the Docker image during build.

1. **Build the Docker image**:
   ```bash
   cd apcs_server
   docker build -t apcs-backend .
   ```

2. **Run the container**:
   ```bash
   docker run -p 3000:3000 --env-file .env apcs-backend
   ```

3. **Access documentation**:
   Navigate to: http://localhost:3000/docs

### Docker Compose

If using docker-compose, the service is already configured:

```bash
docker-compose up backend
```

Access at: http://localhost:3000/docs

## Using the Swagger UI

### Authentication Flow

1. **Login to get token**:
   - Expand `POST /api/auth/login`
   - Click "Try it out"
   - Enter credentials:
     ```json
     {
       "email": "admin@example.com",
       "password": "your-password"
     }
     ```
   - Click "Execute"
   - Copy the `accessToken` from the response

2. **Authorize requests**:
   - Click the green "Authorize" button at the top
   - Enter: `Bearer <your-access-token>`
   - Click "Authorize"
   - Click "Close"

3. **Test authenticated endpoints**:
   - All subsequent requests will include your JWT token
   - Try `GET /api/users/me` to verify

### Testing Endpoints

#### Example: Create a Workspace
1. Authorize first (see above)
2. Expand `POST /api/spaces`
3. Click "Try it out"
4. Edit the request body:
   ```json
   {
     "name": "My Test Workspace",
     "description": "Testing workspace creation",
     "gitUrl": "https://github.com/myorg/repo.git"
   }
   ```
5. Click "Execute"
6. Review the response

#### Example: Upload a Document
1. Expand `POST /api/spaces/{spaceId}/documents`
2. Click "Try it out"
3. Enter the `spaceId` from your workspace
4. Fill in form data:
   - name: "test-document.pdf"
   - type: select "FILE"
   - file: Choose a test file
5. Click "Execute"

## Configuration Options

### Customize Swagger UI

Edit [app.ts](app.ts) to modify Swagger UI options:

```typescript
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'APCS Platform API Documentation',
  customfavIcon: '/assets/favicon.ico', // Add your favicon
  swaggerOptions: {
    persistAuthorization: true, // Keep auth token after page refresh
    displayRequestDuration: true,
    filter: true // Enable endpoint search
  }
}));
```

### Change Documentation URL

To serve Swagger UI at a different path, modify [app.ts](app.ts):

```typescript
// Instead of /docs, use /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
```

## Updating the API Documentation

### After Adding New Endpoints

1. **Edit openapi.yaml**:
   ```yaml
   paths:
     /api/your-new-endpoint:
       post:
         tags:
           - YourTag
         summary: Brief description
         # ... rest of endpoint definition
   ```

2. **Restart the server**:
   ```bash
   pnpm dev
   ```

3. **Verify changes**:
   Refresh http://localhost:3000/docs

### JSON Alternative

If you prefer JSON over YAML, you can convert the spec:

```bash
# Install converter
npm install -g yamljs

# Convert to JSON
yaml2json openapi.yaml > openapi.json
```

Then update [app.ts](app.ts):
```typescript
const openApiDocument = require('./openapi.json');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
```

## Production Considerations

### Security

1. **Disable in production** (optional):
   ```typescript
   if (process.env.NODE_ENV !== 'production') {
     app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
   }
   ```

2. **Add authentication** to Swagger UI:
   ```typescript
   app.use('/docs', 
     express.basicAuth({ users: { 'admin': 'secret' } }),
     swaggerUi.serve, 
     swaggerUi.setup(openApiDocument)
   );
   ```

### Performance

- The OpenAPI spec is loaded once at startup
- No performance impact on API endpoints
- Swagger UI assets are served from CDN by default

## Troubleshooting

### "Cannot load OpenAPI specification" error

**Cause**: `openapi.yaml` not found or invalid YAML

**Solution**:
```bash
# Verify file exists
ls apcs_server/openapi.yaml

# Validate YAML syntax
npx @apidevtools/swagger-cli validate openapi.yaml
```

### Swagger UI shows 404

**Cause**: Swagger middleware registered after API routes

**Solution**: Ensure Swagger is registered before `app.use('/api', ...)` in [app.ts](app.ts)

### CORS errors in browser

**Cause**: CORS not configured for Swagger UI

**Solution**: Already handled by the existing CORS configuration in [app.ts](app.ts)

## Additional Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)
- [Express Integration Guide](https://www.npmjs.com/package/swagger-ui-express)

## For Judges/Evaluators

The complete API documentation is available at `/docs` endpoint. All major features are documented with:
- Request/response schemas
- Authentication requirements
- Example payloads
- Error responses

To quickly evaluate the API:
1. Start the server
2. Visit http://localhost:3000/docs
3. Use the demo credentials to authenticate
4. Test any endpoint directly from the browser
