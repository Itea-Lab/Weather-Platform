# AWS IoT Endpoint and Credentials Fetching

This documentation covers the implementation of dynamic AWS IoT endpoint and credentials fetching in the Weather Platform, which uses AWS Security Token Service (STS) to securely retrieve IoT endpoints and temporary credentials for IoT Core connectivity.

## Overview

The AWS IoT endpoint and credentials fetching system provides secure, dynamic configuration for IoT Core connectivity:

- **STS-based credential generation** for secure IoT Core access
- **Dynamic IoT endpoint discovery** based on AWS region and account
- **Temporary credential management** with automatic refresh
- **Seamless multi-region deployment support**
- **Secure credential isolation** between client and server
- **Automatic region detection** from AWS environment variables

## Prerequisites

- Amplify backend already configured (see [Manual Setup Guide](../manual_setup.md))
- AWS Lambda functions deployed with proper environment variables
- Next.js application with AWS SDK integration
- Amplify CLI configured with appropriate AWS profile
- IoT Core service configured in target AWS region

## Required Packages

### Next.js Application Dependencies

```json
{
  "@aws-sdk/client-sts": "^3.845.0",
  "@aws-sdk/client-iot": "^3.840.0",
  "aws-amplify": "^6.15.1"
}
```

**Package Usage:**

- `@aws-sdk/client-sts`: Used for generating temporary AWS credentials and getting account identity
- `@aws-sdk/client-iot`: Used for IoT Core operations and endpoint discovery
- `aws-amplify`: Provides authentication context and PubSub configuration

## Architecture Overview

### System Components

1. **Lambda Functions**: Server-side functions that use STS to generate credentials and fetch IoT endpoints
2. **API Routes**: Next.js endpoints that securely proxy STS operations
3. **Client-Side Configuration**: IoT configuration that receives credentials and endpoints from API
4. **STS Service**: AWS service that generates temporary, scoped credentials
5. **IoT Core**: AWS IoT service that provides regional endpoints

### Data Flow

```
Client Request
          ↓
    API Route (Authentication)
          ↓
    Lambda Function (STS Call)
          ↓
    AWS STS (Credential Generation)
          ↓
    AWS IoT Core (Endpoint Discovery)
          ↓
    API Response (Credentials + Endpoint)
          ↓
    Client IoT Configuration
          ↓
    IoT Core Connection (Authenticated)
```

## Implementation Details

### Lambda Functions

**Location**: `amplify/functions/getIoTEndpoint/handler.ts`

**Key Features:**

- Uses AWS STS to generate temporary credentials for IoT access
- Discovers IoT endpoint based on AWS region and account
- Implements secure credential generation with proper scoping
- Handles credential refresh and endpoint caching

**STS Credential Generation:**

```typescript
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

// Get AWS account identity
const sts = new STSClient({ region });
const identity = await sts.send(new GetCallerIdentityCommand({}));

// Generate temporary credentials for IoT access
const credentials = {
  accessKeyId: sessionCredentials.accessKeyId,
  secretAccessKey: sessionCredentials.secretAccessKey,
  sessionToken: sessionCredentials.sessionToken,
  region: region,
  accountId: identity.Account
};
```

**IoT Endpoint Discovery:**

```typescript
import { IoTClient, DescribeEndpointCommand } from "@aws-sdk/client-iot";

// Discover IoT endpoint for the region
const iot = new IoTClient({ region });
const endpoint = await iot.send(
  new DescribeEndpointCommand({
    endpointType: "iot:Data-ATS"
  })
);
```

### API Routes

**Location**: `src/app/api/iot/endpoint/route.ts`

**Key Features:**

- Authenticates user requests before credential generation
- Proxies STS operations securely on the server-side
- Returns credentials and endpoint information to authenticated clients
- Implements proper error handling and credential isolation

**Secure Credential Proxy:**

```typescript
// Server-side only - credentials never exposed to client directly
const stsCredentials = await generateSTSCredentials();

// Return endpoint and credential metadata to client
return NextResponse.json({
  success: true,
  endpoint: iotEndpoint,
  region: region,
  accountId: accountId,
  websocketUrl: `wss://${iotEndpoint}/mqtt`,
  credentials: {
    // Credential metadata, not actual credentials
    expiration: stsCredentials.expiration,
    region: region
  }
});
```

### Client-Side Configuration

**Location**: `src/lib/iotConfig.ts`

**Key Features:**

- Receives endpoint and credential information from API
- Configures Amplify PubSub with fetched credentials
- Manages credential lifecycle and refresh
- Handles connection establishment to IoT Core

**IoT Configuration Setup:**

```typescript
// Fetch endpoint and credentials from API
const config = await fetchIoTEndpoint();

// Configure Amplify PubSub with credentials
Amplify.configure({
  ...existingConfig,
  aws_pubsub_region: config.region,
  aws_pubsub_endpoint: config.websocketUrl
});

// Establish IoT connection
const iotClient = new AWSIotProvider({
  aws_pubsub_region: config.region,
  aws_pubsub_endpoint: config.endpoint,
  credentials: config.credentials
});
```

**Credential Lifecycle Management:**

- Automatic credential refresh before expiration
- Connection retry logic for credential issues
- Secure credential cleanup on logout
- Error handling for expired credentials
- Region information included in API responses
- Backward compatibility with existing client code

**Region Detection Implementation:**

```typescript
// Get region from environment variable, fallback to us-east-1 if not set
const region =
  process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";

// Create AWS service client with dynamic region
const client = new SomeAWSClient({ region });
```

**API Response Enhancement:**

```json
{
  "success": true,
  "endpoint": "xxxxx-ats.iot.us-east-1.amazonaws.com",
  "region": "us-east-1",
  "accountId": "123456789012",
  "websocketUrl": "wss://xxxxx-ats.iot.us-east-1.amazonaws.com/mqtt",
  "credentials": {
    "expiration": "2025-09-10T15:30:00Z",
    "region": "us-east-1"
  },
  "message": "IoT endpoint and credentials retrieved successfully"
}
```

### Client-Side Configuration

**Location**: `src/lib/iotConfig.ts`

**Key Features:**

- Dynamic endpoint and credential fetching from API responses
- Automatic IoT configuration based on fetched credentials
- Cached configuration to reduce API calls
- Seamless integration with Amplify authentication

**Credential Fetching Logic:**

```typescript
// Fetch endpoint and credentials from API
const config = await fetch('/api/iot/endpoint');

// Configure IoT client with fetched credentials
const iotConfig = {
  endpoint: config.endpoint,
  region: config.region,
  credentials: await getAuthenticatedCredentials(), // STS-generated
  websocketUrl: config.websocketUrl
};
```

**Caching Strategy:**

- Configuration cached for 5 minutes
- Prevents unnecessary API calls
- Automatic cache invalidation on credential expiration

## Security Implementation

### Authentication Requirements

**STS Credential Security:**

- Temporary credentials generated server-side using STS
- Credentials never exposed directly to client applications
- Secure credential scoping with minimal required permissions
- Automatic credential expiration and refresh

**Data Security:**

- Sensitive AWS credentials handled only on server-side
- IoT endpoint information safely transmitted via HTTPS
- Proper authentication required for all credential requests
- Credential metadata isolated from actual credential values

### Access Control

**IAM Permissions for STS:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sts:GetCallerIdentity",
        "sts:AssumeRole",
        "iot:DescribeEndpoint",
        "iot:Connect",
        "iot:Subscribe",
        "iot:Publish",
        "iot:Receive"
      ],
      "Resource": "*"
    }
  ]
}
```

**STS Policy for IoT Access:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iot:Connect",
        "iot:Subscribe",
        "iot:Publish",
        "iot:Receive"
      ],
      "Resource": [
        "arn:aws:iot:*:*:client/*",
        "arn:aws:iot:*:*:topic/*",
        "arn:aws:iot:*:*:topicfilter/*"
      ]
    }
  ]
}
```

**Permission Scope:**

- Minimal permissions required for IoT operations
- Principle of least privilege applied to STS credentials
- Time-bound credentials with automatic expiration
- Scoped access to specific IoT resources

## Error Handling

### STS Credential Errors

- **STS Access Denied**: Automatic fallback and retry with different permissions
- **Credential Expiration**: Proactive refresh before expiration
- **Invalid STS Token**: Re-authentication and new credential generation
- **STS Service Unavailable**: Graceful degradation with cached credentials

### IoT Endpoint Errors

- **Endpoint Discovery Failed**: Retry with different region or cached endpoint
- **Invalid Region**: Automatic region detection and correction
- **IoT Service Unavailable**: Connection retry with exponential backoff

### Network Errors

- **API Connection Issues**: Retry logic with exponential backoff
- **Credential Fetch Failures**: Cached credentials used as fallback
- **Service Unavailable**: Graceful degradation with error messages

### Lambda Function Errors

- **STS Call Failures**: Comprehensive error logging and retry logic
- **IoT Endpoint Errors**: Proper error propagation to client
- **Configuration Errors**: Clear error messages for debugging

## Monitoring and Logging

### Application Logs

- STS credential generation attempts and results
- IoT endpoint discovery and validation
- Credential expiration and refresh events
- API response times and success rates
- Authentication failures and recovery actions

### AWS CloudWatch Integration

- Lambda function execution metrics for STS operations
- IoT endpoint discovery performance monitoring
- Credential usage patterns and expiration tracking
- Error rates and troubleshooting data
- Multi-region deployment analytics

### STS Monitoring

- Credential generation success/failure rates
- Average time for STS operations
- Credential expiration patterns
- Failed authentication attempts
- Cross-region credential usage

## Best Practices

### Performance Optimization

- **Credential Caching**: STS credentials cached to reduce API calls
- **Lazy Loading**: Endpoint discovery only when needed
- **Connection Pooling**: Efficient AWS service client reuse
- **Proactive Refresh**: Credentials refreshed before expiration

### Security Best Practices

- **STS Credential Usage**: Always use temporary credentials over long-term keys
- **Minimal Credential Scope**: Grant only necessary IoT permissions
- **Secure Credential Handling**: Never expose credentials to client-side code
- **Regular Credential Rotation**: Implement automatic credential refresh
- **Audit Logging**: Comprehensive tracking of credential usage

### Development Best Practices

- **TypeScript Integration**: Full type safety for credential configuration
- **Error Boundary Implementation**: Graceful handling of credential errors
- **Testing Strategy**: Comprehensive testing of STS operations
- **Documentation Updates**: Keep credential configuration documented

## Configuration

### Environment Variables

#### AWS Lambda

Lambda functions automatically receive:

- `AWS_REGION`: Current region (e.g., "us-east-1")
- `AWS_DEFAULT_REGION`: Default region if AWS_REGION is not set

#### Next.js Runtime

For local development, set environment variables:

```bash
AWS_REGION=us-east-1
AWS_DEFAULT_REGION=us-east-1
```

#### Amplify Configuration

Amplify automatically configures the region from `amplify_outputs.json`:

```json
{
  "auth": {
    "aws_region": "us-east-1"
  }
}
```

## Migration Guide

### From Hard-Coded Credentials to STS

#### Files to Update

- `amplify/functions/getIoTEndpoint/handler.ts`: Implement STS credential generation
- `src/app/api/iot/endpoint/route.ts`: Add secure credential proxy
- `src/lib/iotConfig.ts`: Update to fetch credentials from API
- `src/lib/awsConfig.ts`: Remove hard-coded credential references

#### Migration Steps

1. **Update Lambda Functions:**

   ```typescript
   // Before - Hard-coded credentials
   const credentials = {
     accessKeyId: "AKIA...",
     secretAccessKey: "..."
   };

   // After - STS-generated credentials
   const sts = new STSClient({ region });
   const stsCredentials = await sts.send(new AssumeRoleCommand({
     RoleArn: process.env.IOT_ROLE_ARN,
     RoleSessionName: 'iot-session'
   }));
   ```

2. **Update API Routes:**

   ```typescript
   // Add secure STS proxy
   const config = await generateIoTConfig();
   return NextResponse.json({
     endpoint: config.endpoint,
     credentials: config.credentials, // Never expose actual credentials
     region: config.region
   });
   ```

3. **Update Client Configuration:**

   ```typescript
   // Fetch credentials dynamically
   const config = await fetch('/api/iot/endpoint');
   const credentials = await getAuthenticatedCredentials(); // STS-generated
   ```

4. **Test Migration:**
   - Deploy to test environment
   - Verify STS credential generation works
   - Test IoT connections with new credentials

### Backward Compatibility

- Existing hard-coded configurations continue to work during migration
- Gradual rollout prevents service disruption
- Fallback mechanisms for credential failures

## Testing

### Verify STS Credential Generation

1. **Check Lambda Function Logs:**

   - Verify STS credential generation from environment variables
   - Confirm correct permissions applied to generated credentials
   - Validate credential expiration times

2. **Test API Endpoint Response:**

   - Ensure endpoint and credential metadata included in API responses
   - Verify correct region and account information returned
   - Confirm WebSocket URL generation

3. **Validate IoT Connections:**
   - Test IoT Core connections with STS-generated credentials
   - Verify real-time data flow with authenticated connections
   - Confirm proper credential refresh on expiration

### Multi-Region Testing

1. **Deploy to Different Regions:**

   - Test deployment to multiple AWS regions
   - Verify STS credential generation in each region
   - Confirm IoT endpoint discovery works across regions

2. **Cross-Region Functionality:**

   - Test IoT Core connections in different regions
   - Validate credential portability across regions
   - Ensure consistent endpoint discovery

3. **Performance Testing:**
   - Measure STS operation performance
   - Test credential caching effectiveness
   - Validate connection establishment times

## Troubleshooting

### Common Issues

**STS Access Denied:**

- **Symptom**: Credential generation fails with access denied
- **Solution**: Check IAM permissions for STS operations
- **Verification**: Review CloudWatch logs for STS error details

**IoT Endpoint Discovery Failed:**

- **Symptom**: Unable to discover IoT endpoint for region
- **Solution**: Verify IoT Core is enabled in target region
- **Verification**: Check AWS Console for IoT service availability

**Credential Expiration Issues:**

- **Symptom**: IoT connections fail after credential expiration
- **Solution**: Implement proactive credential refresh
- **Verification**: Check credential expiration times in logs

**WebSocket Connection Failed:**

- **Symptom**: Unable to establish IoT WebSocket connection
- **Solution**: Verify endpoint URL and credential permissions
- **Verification**: Test connection with AWS CLI IoT commands

### Debug Steps

1. **Check STS Operations:**

   ```bash
   # In Lambda function logs
   console.log('STS Response:', stsResponse);
   console.log('Generated Credentials:', credentials);
   ```

2. **Verify IoT Endpoint:**

   ```json
   {
     "success": true,
     "endpoint": "xxxxx-ats.iot.us-east-1.amazonaws.com",
     "region": "us-east-1",
     "credentials": {
       "expiration": "2025-09-10T15:30:00Z"
     }
   }
   ```

3. **Test Credential Permissions:**

   - Use AWS CLI to test generated credentials
   - Verify IoT permissions with `aws iot list-things`
   - Check CloudWatch logs for permission errors

4. **Clear Cache and Test:**
   - Clear browser cache
   - Clear IoT configuration cache
   - Test credential generation again

### Advanced Debugging

**STS Troubleshooting:**

```bash
# Test STS assume role
aws sts assume-role --role-arn arn:aws:iam::123456789012:role/IoTRole --role-session-name test

# Check IoT endpoint discovery
aws iot describe-endpoint --endpoint-type iot:Data-ATS
```

**Network Debugging:**

- Check VPC configuration for Lambda functions
- Verify security group rules for IoT connectivity
- Test DNS resolution for IoT endpoints

## Related Documentation

- [Manual Setup Guide](../manual_setup.md) - Initial Amplify configuration
- [Authentication Setup](../authentication/README.md) - Cognito configuration
- [IoT Device Fetching](../fetchThings/README.md) - Device management system
- [API Gateway Setup](../create_api_gateway.md) - API endpoint configuration
