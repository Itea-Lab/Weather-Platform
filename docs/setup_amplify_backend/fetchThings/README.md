# IoT Device Fetching System

This documentation covers the implementation of the IoT device fetching system in the Weather Platform, which retrieves device information from AWS IoT Core Thing Groups and displays them in the web interface.

## Overview

The IoT device fetching system provides real-time visibility into registered IoT devices by:

- Fetching device lists from AWS IoT Core Thing Groups
- Retrieving detailed device information and metadata
- Providing secure, authenticated access to device data
- Displaying devices with real-time status updates via SWR
- Implementing proper security measures to protect sensitive AWS resource information

## Prerequisites

- Amplify backend already configured (see [Manual Setup Guide](../manual_setup.md))
- AWS IoT Core service access with configured Thing Groups
- IoT devices registered in Thing Groups (see [IoT Device Management](../add_device.md/README.md))
- Proper IAM permissions for IoT operations

## Required Packages

### Next.js Application Dependencies

```json
{
  "@aws-sdk/client-lambda": "^3.844.0",
  "@aws-sdk/client-iot": "^3.840.0",
  "aws-amplify": "^6.15.1",
  "swr": "^2.3.6",
  "@types/aws-lambda": "^8.10.150"
}
```

**Package Usage:**

- `@aws-sdk/client-lambda`: Used in API routes to invoke the device fetching Lambda function
- `@aws-sdk/client-iot`: Used for IoT Core operations (ListThingsInThingGroup, DescribeThing)
- `aws-amplify`: Provides authentication context and server-side utilities for protected routes
- `swr`: Enables real-time data fetching with caching, background updates, and error handling

## Architecture Overview

### System Components

1. **Lambda Function** (`fetchThings`): Server-side function that queries AWS IoT Core
2. **API Route** (`/api/iot/fetchThings`): Next.js API endpoint with authentication middleware
3. **SWR Hook** (`useDevices`): Client-side data fetching with caching and real-time updates
4. **UI Components**: Device table, status cards, and filtering components

### Data Flow

```
AWS IoT Core Thing Groups
          ↓
    fetchThings Lambda
          ↓
    /api/iot/fetchThings Route
          ↓
      useDevices Hook (SWR)
          ↓
    UI Components (DeviceTable, DeviceStatusCard)
```

## Implementation Details

### Lambda Function

**Location**: `amplify/functions/fetchThings/`

**Key Features:**

- Queries specific Thing Group (`ITeaWeatherHub`)
- Retrieves detailed device information using `DescribeThing`
- Filters out sensitive data (ARNs, security tokens)
- Handles error scenarios gracefully
- Returns structured device data

**IAM Permissions Required:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["iot:ListThingsInThingGroup", "iot:DescribeThing"],
      "Resource": "*"
    }
  ]
}
```

**Security Measures:**

- Removes `thingArn` from response to prevent AWS resource exposure
- Filters sensitive attributes (keys, secrets, ARNs)
- Implements proper error handling for failed device queries

### API Route

**Location**: `src/app/api/iot/fetchThings/route.ts`

**Authentication Flow:**

1. Middleware validates user authentication using Amplify server context
2. Route handler performs additional token validation
3. Graceful degradation for SWR timing issues while maintaining security
4. Blocks requests without valid Cognito authentication tokens

**Security Features:**

- Strict authentication requirement
- Cognito token validation
- User activity logging
- Error sanitization for production environments

### Client-Side Integration

**SWR Hook**: `src/lib/api.ts`

```typescript
export function useDevices() {
  const { data, error, isLoading, mutate } = useSWR<DeviceListResponse>(
    "/api/iot/fetchThings",
    fetcher,
    {
      refreshInterval: 30000, // Auto-refresh every 30 seconds
      fallbackData: {
        /* Default data structure */
      },
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Smart retry logic for auth and network errors
      },
    }
  );
}
```

**Key Features:**

- **Automatic Refresh**: Updates device list every 30 seconds
- **Background Updates**: Fetches fresh data when user returns to tab
- **Error Handling**: Graceful retry logic for authentication and network issues
- **Caching**: Avoids redundant API calls across components
- **Loading States**: Provides proper UX feedback during data fetching

### UI Components

#### DeviceTable Component

**Location**: `src/components/platform/devices/DeviceTable.tsx`

**Features:**

- Displays device information in a responsive table format
- Real-time filtering by group and status
- Loading states and error handling
- Responsive design for mobile and desktop

**Displayed Information:**

- Device Name
- Connection Type (MQTTS)
- Thing Group
- Online/Offline Status
- Last Active Timestamp
- Signal Strength (when available)

#### DeviceStatusCard Component

**Location**: `src/components/platform/devices/DeviceStatusCard.tsx`

**Features:**

- Real-time device counts (Total, Online, Offline)
- Visual status indicators with icons
- Auto-updating statistics via SWR data
- Responsive card layout

#### DeviceFilter Component

**Location**: `src/components/platform/devices/DeviceFilter.tsx`

**Features:**

- Filter devices by Thing Group
- Filter devices by status (Online/Offline)
- State management with callback handlers
- Integrated with DeviceTable for real-time filtering

## Security Implementation

### Authentication Requirements

**Middleware Protection**: All requests to `/api/iot/fetchThings` require valid authentication

**Token Validation Process:**

1. Check for presence of Cognito authentication tokens
2. Validate tokens using Amplify server context
3. Handle timing issues between client and server authentication state
4. Block requests without valid authentication

### Data Security

**Sensitive Data Filtering:**

- AWS resource ARNs removed from API responses
- Security-related attributes filtered from device metadata
- User activity logging for audit trails
- Error messages sanitized in production

**API Rate Limiting:**

- Authentication requirement prevents unauthorized API abuse
- SWR caching reduces unnecessary API calls
- Background refresh intervals prevent excessive requests

## Error Handling

### Authentication Errors

- **401 Unauthorized**: Returned when no valid authentication tokens found
- **Graceful Degradation**: SWR retries on authentication failures
- **User Feedback**: Clear error messages displayed in UI components

### Network Errors

- **Automatic Retry**: SWR implements smart retry logic
- **Fallback Data**: Default data structure prevents UI crashes
- **Loading States**: Proper UX feedback during network issues

### Lambda Function Errors

- **Error Logging**: Comprehensive logging for debugging
- **Graceful Degradation**: Partial device information returned on individual device query failures
- **Status Codes**: Proper HTTP status codes for different error scenarios

## Monitoring and Logging

### Application Logs

- Authentication attempts and results
- API request patterns and response times
- Error occurrences and user impact
- Device query performance metrics

### AWS CloudWatch Integration

- Lambda function execution metrics
- Error rates and performance monitoring
- IoT Core API usage tracking
- Authentication failure patterns

## Best Practices

### Performance Optimization

- **SWR Caching**: Reduces API calls and improves response times
- **Background Updates**: Keeps data fresh without user interaction
- **Efficient Filtering**: Client-side filtering for better UX
- **Responsive Design**: Optimized for all device types

### Security Best Practices

- **Principle of Least Privilege**: Lambda functions have minimal required permissions
- **Data Minimization**: Only necessary device information exposed
- **Authentication at Multiple Layers**: Middleware and route-level validation
- **Audit Logging**: Comprehensive activity tracking

### Development Best Practices

- **TypeScript Integration**: Full type safety across the application
- **Error Boundary Implementation**: Graceful error handling in UI
- **Responsive Design**: Mobile-first approach
- **Component Reusability**: Modular component architecture

## Configuration

### Environment Variables

```bash
# AWS Configuration
DEFAULT_REGION=us-east-1
AWS_IOT_THING_GROUP_NAME=ITeaWeatherHub
```

### Amplify Configuration

The system uses Amplify's automatic configuration through `amplify_outputs.json`:

- Authentication configuration
- Lambda function names and ARNs
- Regional settings
- IAM role configurations

## Troubleshooting

### Common Issues

**Authentication Failures:**

- Verify user is signed in through Cognito
- Check browser cookies for Cognito tokens
- Confirm Amplify server context configuration

**Empty Device Lists:**

- Verify devices are registered in the correct Thing Group
- Check Lambda function permissions for IoT operations
- Review CloudWatch logs for IoT API errors

**SWR Data Issues:**

- Check network connectivity
- Verify API route authentication
- Review browser developer tools for request errors

### Debug Mode

Enable additional logging by checking browser console and server logs:

- Authentication token validation steps
- SWR cache status and refresh cycles
- API response times and error details

## Related Documentation

- [IoT Device Management](../add_device.md/README.md) - Device registration and management
- [Authentication Setup](../authentication/README.md) - Cognito configuration
- [Manual Setup Guide](../manual_setup.md) - Initial Amplify configuration
