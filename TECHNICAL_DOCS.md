# Azure Key Vault Advanced Editor - Technical Documentation

## Project Overview

The Azure Key Vault Advanced Editor is a sophisticated web application built with Next.js and TypeScript that provides advanced management capabilities for Azure Key Vault secrets. This application follows Azure security best practices and provides a modern, intuitive interface for secret management operations.

## Architecture

### Technology Stack

- **Frontend Framework**: Next.js 15+ with App Router
- **Language**: TypeScript with strict mode enabled
- **Styling**: Tailwind CSS for responsive, utility-first styling
- **Azure Integration**: 
  - `@azure/keyvault-secrets` for Key Vault operations
  - `@azure/identity` for authentication
  - `@azure/core-auth` for authentication interfaces
- **UI Components**: Custom components with Headless UI primitives
- **Icons**: Lucide React for consistent iconography

### Component Architecture

```
src/
├── app/
│   ├── page.tsx              # Main application page
│   ├── demo/page.tsx         # Demo/overview page
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── KeyVaultEditor.tsx    # Main container component
│   ├── SecretCard.tsx        # Individual secret display
│   ├── ConnectionModal.tsx   # Azure connection setup
│   ├── AddSecretModal.tsx    # New secret creation
│   └── DeleteConfirmModal.tsx # Deletion confirmation
└── types/                    # TypeScript type definitions
```

## Key Features

### 1. Secure Authentication

#### Azure AD OAuth (Recommended)
- Uses user-delegated permissions with Azure AD authentication
- Each user authenticates with their own Azure credentials
- Multi-tenant support through `/common` endpoint
- No app registration required (uses Azure CLI public client)
- Users can only access Key Vaults they have permissions to

#### Service Principal (Alternative)
- Uses `ClientSecretCredential` for service-based scenarios
- Requires Tenant ID, Client ID, and Client Secret
- Should only be used in specific automation scenarios
- Credentials must be stored securely

### 2. Secret Management Operations

#### List Secrets
- Efficiently loads secret metadata using `listPropertiesOfSecrets()`
- Displays creation dates, update times, expiration dates
- Shows enabled/disabled status and tags
- Pagination and filtering support

#### Add New Secrets
- Comprehensive form validation
- Support for content types (text, JSON, PEM, PKCS#12, XML)
- Tag management for organization
- Input validation and error handling

#### Edit Secrets
- In-place editing with save/cancel options
- Value loading on-demand for security
- Real-time validation
- Optimistic UI updates

#### Delete Secrets
- Batch selection and deletion
- Confirmation dialogs with warnings
- Information about recovery options
- Dependency impact warnings

### 3. Advanced Features

#### Search and Filtering
- Real-time search across secret names
- Case-insensitive filtering
- Instant results without API calls

#### Export Capabilities
- Export secret metadata to JSON
- Excludes sensitive values for security
- Includes timestamps and tags
- Downloadable file generation

#### Visibility Controls
- Click-to-reveal secret values
- Lazy loading of sensitive data
- Clear visual indicators
- Toggle visibility per secret

## Security Implementation

### Authentication Flow

1. **Connection Setup**: User provides Key Vault URL and authentication method
2. **Credential Creation**: Application creates appropriate Azure credential
3. **Client Initialization**: SecretClient is initialized with credentials
4. **Token Management**: Azure SDK handles token refresh automatically

### Data Protection

- **No Local Storage**: Secret values are never persisted locally
- **Memory Management**: Values are cleared when components unmount
- **Lazy Loading**: Secret values are only loaded when requested
- **Error Handling**: Comprehensive error boundaries prevent information leakage

### Input Validation

- **Secret Names**: Alphanumeric and hyphens only, max 127 characters
- **URLs**: Proper Key Vault URL format validation
- **Credentials**: Required field validation for Service Principal
- **Tags**: Duplicate key prevention and format validation

## Development Guidelines

### Code Style

- **TypeScript Strict Mode**: All files use strict TypeScript
- **ESLint Configuration**: Next.js recommended rules with custom additions
- **Component Patterns**: Functional components with hooks
- **Error Boundaries**: Comprehensive error handling
- **Loading States**: Clear feedback for all async operations

### Security Best Practices

1. **Never Commit Credentials**: Use environment variables and .env files
2. **Use Managed Identity**: Prefer managed identity in production
3. **Validate All Inputs**: Client and server-side validation
4. **Handle Errors Gracefully**: User-friendly error messages
5. **Monitor Access**: Encourage Azure Monitor integration

### Performance Optimizations

- **Lazy Loading**: Secret values loaded on demand
- **Memoization**: React.memo for expensive components
- **Efficient Rendering**: Virtualization for large secret lists
- **Bundle Optimization**: Tree shaking and code splitting
- **Caching**: Intelligent caching of metadata

## Deployment Options

### Azure App Service

1. **Advantages**:
   - Built-in Managed Identity support
   - Easy deployment with GitHub Actions
   - Automatic HTTPS and custom domains
   - Built-in logging and monitoring

2. **Configuration**:
   ```bash
   # App Settings
   AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net
   USE_MANAGED_IDENTITY=true
   ```

### Azure Container Instances

1. **Advantages**:
   - Container-based deployment
   - Managed Identity support
   - Cost-effective for low-traffic scenarios

2. **Docker Configuration**:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

### Azure Static Web Apps

1. **Advantages**:
   - Global CDN distribution
   - Built-in authentication
   - Serverless backend integration

2. **Limitations**:
   - Requires API backend for Key Vault operations
   - No direct Managed Identity support

## Environment Configuration

### Required Environment Variables

```env
# Optional: Custom Azure configuration (normally not needed)
# NEXT_PUBLIC_AZURE_CLIENT_ID=your-custom-client-id
# NEXT_PUBLIC_AZURE_TENANT_ID=your-specific-tenant-id

# Application Configuration
APP_NAME="Griphook"
NODE_ENV=production
```

### Azure Permissions

Required Key Vault permissions for the application identity:

- **Secret Permissions**:
  - `get` - Read secret values
  - `list` - List secret names and metadata
  - `set` - Create and update secrets
  - `delete` - Delete secrets

- **Optional Permissions**:
  - `backup` - Backup secrets
  - `restore` - Restore secrets
  - `recover` - Recover deleted secrets
  - `purge` - Permanently delete secrets

## Monitoring and Logging

### Application Logging

The application includes comprehensive logging for:
- Authentication attempts and failures
- Secret access operations
- Error conditions and recoveries
- Performance metrics

### Azure Monitor Integration

Recommended Azure Monitor setup:
- **Application Insights**: For application performance monitoring
- **Key Vault Logging**: For audit trails and access monitoring
- **Azure Security Center**: For security recommendations

### Alerting

Set up alerts for:
- Failed authentication attempts
- Unusual access patterns
- High error rates
- Performance degradation

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify Key Vault URL format
   - Check permission assignments
   - Validate Service Principal credentials
   - Ensure Managed Identity is enabled

2. **Permission Errors**
   - Verify RBAC assignments
   - Check Key Vault access policies
   - Validate scope assignments

3. **Network Issues**
   - Check firewall rules
   - Verify private endpoint configuration
   - Test network connectivity

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
DEBUG=azure:*
```

## Contributing

### Development Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd azure-keyvault-advanced-editor
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

### Coding Standards

- Follow TypeScript strict mode
- Use ESLint and Prettier
- Write comprehensive tests
- Document complex functions
- Follow React best practices

### Pull Request Process

1. Create feature branch from main
2. Implement changes with tests
3. Update documentation
4. Submit pull request with description
5. Address review feedback

## Security Considerations

### Threat Model

- **Credential Exposure**: Mitigated by environment variables and Managed Identity
- **Session Hijacking**: Mitigated by HTTPS and secure authentication
- **Data Leakage**: Mitigated by lazy loading and memory management
- **Injection Attacks**: Mitigated by input validation and parameterized queries

### Security Checklist

- [ ] Use HTTPS in production
- [ ] Enable Managed Identity
- [ ] Validate all user inputs
- [ ] Implement proper error handling
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Follow least privilege principle

## Future Enhancements

### Planned Features

1. **Audit Logging**: Comprehensive operation logging
2. **Backup/Restore**: Secret backup and restore capabilities
3. **Templates**: Secret templates for common patterns
4. **Bulk Import**: CSV/JSON import functionality
5. **Role-Based Access**: Fine-grained permission management

### Technical Improvements

1. **Performance**: Virtual scrolling for large secret lists
2. **Offline Support**: Service worker for offline access
3. **Real-time Updates**: WebSocket integration for live updates
4. **Advanced Search**: Regex and tag-based searching
5. **Mobile App**: React Native mobile application

## References

- [Azure Key Vault Documentation](https://docs.microsoft.com/en-us/azure/key-vault/)
- [Azure SDK for JavaScript](https://docs.microsoft.com/en-us/azure/developer/javascript/)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
