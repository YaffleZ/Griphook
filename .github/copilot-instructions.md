# Copilot Instructions for Azure Key Vault Advanced Editor

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is an Azure Key Vault Advanced Editor built with Next.js and TypeScript. The application provides advanced management capabilities for Azure Key Vault secrets including batch editing, adding new secrets, and deletion operations.

## Key Technologies
- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Azure Integration**: Azure SDK for JavaScript
- **Authentication**: Azure Managed Identity (preferred) or Azure Active Directory

## Azure Best Practices
- Always use managed identity authentication when possible
- Never hardcode credentials or connection strings
- Implement proper error handling with retry logic for Azure SDK operations
- Follow Azure SDK patterns for async operations
- Use Azure Key Vault client libraries for secure secret management
- Implement proper logging and monitoring

## Code Style Guidelines
- Use TypeScript strict mode
- Follow React best practices with hooks
- Use server components where appropriate in Next.js App Router
- Implement proper error boundaries
- Use Tailwind CSS for styling with consistent design patterns
- Write clean, self-documenting code with proper JSDoc comments

## Security Considerations
- Implement proper authentication and authorization
- Use HTTPS for all communications
- Validate all inputs
- Sanitize data before display
- Follow principle of least privilege for Azure permissions
- Implement proper session management

## Features to Implement
- Batch secret editing capabilities
- Add new secrets with validation
- Secure secret deletion with confirmation
- Search and filter functionality
- Audit logging
- Export/import capabilities
- Real-time updates

## Performance Optimizations
- **Fast Secret Loading**: Optimized API calls without expensive version history lookups
- **Batch Operations**: Parallel loading of secret values in batches of 10
- **On-Demand Loading**: Secret values loaded only when needed (lazy loading)
- **Progress Indicators**: Real-time feedback during loading operations
- **Caching**: Local state caching to avoid repeated API calls
- **Load Time Tracking**: Performance monitoring and display

## API Endpoints
- `GET /api/keyvault/secrets` - List secret metadata (optimized, no version history)
- `GET /api/keyvault/secrets/[secretName]` - Get individual secret value
- `POST /api/keyvault/secrets/batch` - Batch load multiple secret values in parallel
- `POST /api/keyvault/secrets` - Create new secret
- `PUT /api/keyvault/secrets/[secretName]` - Update secret value
- `DELETE /api/keyvault/secrets` - Delete secret
