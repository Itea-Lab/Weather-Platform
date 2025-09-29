# IoT Device Registration Setup

This guide covers setting up IoT device registration functionality in your Weather Platform, including Lambda functions, AWS IoT Core integration, and the complete registration flow.

## Overview

The IoT device registration system allows users to register weather sensors that can securely connect to AWS IoT Core and send telemetry data to your platform. The system creates:

- IoT Things (device identities)
- X.509 certificates for secure communication
- Proper policy attachments for device permissions
- Thing Group assignments for organization

## Prerequisites

- Amplify backend already configured (see [Manual Setup Guide](../manual_setup.md))
- AWS IoT Core service access
- Proper IAM permissions configured

## Required Packages

### Next.js Application Dependencies

```json
{
  "@aws-sdk/client-lambda": "^3.844.0",
  "@aws-sdk/client-sts": "^3.844.0",
  "@aws-sdk/client-iot": "^3.840.0",
  "aws-amplify": "^6.15.1",
  "@types/aws-lambda": "^8.10.150"
}
```

**Package Usage:**

- `@aws-sdk/client-lambda`: Used in API routes to invoke the device registration Lambda function
- `@aws-sdk/client-sts`: Used for AWS region detection and account information
- `@aws-sdk/client-iot`: Used for IoT client configuration utilities
- `aws-amplify`: Provides authentication context and server-side utilities for protected routes

### AWS Configuration Utilities

The application uses a centralized AWS configuration system (`src/lib/awsConfig.ts`) that provides:

- **Region Detection**: Automatically detects AWS region using STS client configuration
- **Client Factories**: Pre-configured AWS service clients (Lambda, IoT, STS)
- **Caching**: Caches region detection to avoid repeated STS calls
- **Error Handling**: Graceful fallbacks when region detection fails

**Package Usage:**

- `@aws-sdk/client-iot`: Core IoT operations (create things, certificates, attach policies)
- `@aws-sdk/client-sts`: Get AWS account information for resource ARN construction
- `@types/aws-lambda`: TypeScript definitions for Lambda handler functions

## Architecture Overview

### Flow Diagram

```
User Interface (addDeviceButton.tsx)
    ↓
Next.js API Route (/api/iot/register)
    ↓
AWS Lambda Function (addThing)
    ↓
AWS IoT Core Services
    ↓
Device Registration Response
```

### Components Involved

1. **Frontend Component**: `src/components/platform/devices/addDeviceButton.tsx`
2. **API Route**: `src/app/api/iot/register/route.ts`
3. **Lambda Function**: `amplify/functions/addThing/handler.ts`
4. **Types**: `src/types/device.ts`
5. **API Client**: `src/lib/api.ts`
6. **Lambda Invoker**: `src/lib/lambdaInvoker.ts`
7. **AWS Configuration**: `src/lib/awsConfig.ts` - Centralized AWS region detection and client creation

## Backend Configuration

### Lambda Function Setup

The Lambda function (`addThing`) needs to be configured in your Amplify backend:

**IAM Permissions:**

- IoT Thing creation and management
- Certificate generation and attachment
- Policy attachment
- Thing Group management
- STS access for account identification

### IoT Resources Required

Before device registration works, you need these AWS IoT Core resources:

1. **Thing Group**: `ITeaWeatherHub`
2. **IoT Policy**: `WeatherStationPolicies`

## AWS IoT Core Setup

### 1. Create Thing Group

Via AWS Console:

1. Go to AWS IoT Core Console
2. Navigate to **Manage** > **Thing groups**
3. Click **Create thing group**
4. Name: `ITeaWeatherHub`
5. Description: "Weather platform device group"

### 2. Create IoT Policy

Create a policy named `WeatherStationPolicies` with the following JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iot:Publish",
      "Resource": "arn:aws:iot:us-east-1:<ACCOUNT_ID>:topic/weatherPlatform/telemetry"
    },
    {
      "Effect": "Allow",
      "Action": "iot:Connect",
      "Resource": "arn:aws:iot:us-east-1:<ACCOUNT_ID>:client/*"
    }
  ]
}
```

### Via AWS Console:

1. Go to AWS IoT Core Console
2. Navigate to **Secure** > **Policies**
3. Click **Create policy**
4. Name: `WeatherStationPolicies`
5. Add the JSON policy above

## Registration Flow

### 1. User Interface

The registration process starts with the device registration dialog:

- **Device Name**: Unique identifier for the device
- **Thing Group**: Pre-selected as "ITeaWeatherHub"
- **Connection Type**: MQTTS (secure MQTT over TLS)

### 2. API Processing

When a user submits the form:

1. **Authentication Check**: Middleware validates user session
2. **Input Validation**: Required fields are verified
3. **Lambda Invocation**: Calls the `addThing` Lambda function
4. **Response Processing**: Handles success/error cases

### 3. Lambda Function Operations

The Lambda function performs these operations:

1. **Validate Environment**: Checks Thing Group and Policy names
2. **Get Account Info**: Uses STS to get AWS account ID
3. **Get IoT Endpoint**: Retrieves the device connection endpoint
4. **Create Certificate**: Generates X.509 certificate and keys
5. **Create Thing**: Creates IoT Thing with the device name
6. **Attach Certificate**: Links certificate to the Thing
7. **Add to Group**: Adds Thing to the specified Thing Group
8. **Attach Policy**: Applies the device policy to the certificate

### 4. Response Generation

Successful registration returns:

- **Device Connection Info**: MQTT endpoint, port, protocol
- **Certificates**: Certificate PEM, private key, public key
- **Topics**: MQTT topics for telemetry publishing
- **Metadata**: Registration timestamp and user info

## Device Registration Response

### Success Response Structure

```typescript
{
  success: true,
  message: "Weather sensor device-name registered successfully",
  thingName: "device-name",
  thingGroup: "ITeaWeatherHub",
  policy: "WeatherStationPolicies",
  deviceConnectionInfo: {
    endpoint: "your-iot-endpoint.iot.region.amazonaws.com",
    port: 8883,
    protocol: "MQTTS",
    topics: {
      publish: "weatherPlatform/telemetry"
    }
  },
  certificates: {
    certificateArn: "arn:aws:iot:region:account:cert/cert-id",
    certificatePem: "-----BEGIN CERTIFICATE-----\n...",
    privateKey: "-----BEGIN RSA PRIVATE KEY-----\n...",
    publicKey: "-----BEGIN PUBLIC KEY-----\n..."
  },
  accountId: "123456789012",
  registeredAt: "2024-01-01T00:00:00.000Z",
  registeredBy: "user@example.com"
}
```

## Device Credentials Management

### Understanding Device Credentials

When a device is successfully registered, the system generates several credential files that are essential for secure MQTT communication with AWS IoT Core.

### Download Options

The UI provides these download options for device credentials:

#### 1. Certificate PEM - **Required for Device Authentication**

Downloads the X.509 certificate file (`certificate.pem.crt`):

- **Use Case**: Device identity verification
- **Functionality**: Proves device identity to AWS IoT Core
- **Security**: Public certificate, safe to share within your organization
- **Required**: Yes, every device needs this

#### 2. Private Key - **Critical Security Component**

Downloads the private key file (`private.pem.key`):

- **Use Case**: Cryptographic signing and TLS handshake
- **Functionality**: Enables secure communication encryption
- **Security**: **HIGHLY SENSITIVE** - Never share, store securely
- **Required**: Yes, but handle with extreme care

#### 3. Public Key - **Optional for Most Use Cases**

Downloads the public key file (`public.pem.key`):

- **Use Case**: Advanced cryptographic operations, key verification
- **Functionality**: Public component of the key pair
- **Security**: Public information, safe to share
- **Required**: No, most MQTT clients don't need this

#### 4. Connection Config - **Device Configuration Reference**

Downloads connection parameters as JSON (`connection-config.json`):

- **Use Case**: Device configuration, application settings
- **Functionality**: Contains endpoint URLs, topics, ports
- **Security**: Non-sensitive configuration data
- **Required**: Yes, devices need this to know where to connect

### File Structure and Functionality

Downloaded credentials include:

```
device-credentials/
├── certificate.pem.crt      # Device identity certificate (REQUIRED)
├── private.pem.key          # Private key for encryption (REQUIRED - SENSITIVE)
├── public.pem.key           # Public key component (OPTIONAL)
└── connection-config.json   # Connection parameters (REQUIRED)
```

#### Certificate File (`certificate.pem.crt`)

```
-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKZ... (X.509 certificate data)
-----END CERTIFICATE-----
```

- **Purpose**: Identifies the device to AWS IoT Core
- **Format**: PEM-encoded X.509 certificate
- **Usage**: Loaded by MQTT client for authentication

#### Private Key File (`private.pem.key`)

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA2Xy... (Private key data)
-----END RSA PRIVATE KEY-----
```

- **Purpose**: Enables secure TLS communication
- **Format**: PEM-encoded RSA private key
- **Security**: **NEVER EXPOSE** - Store in secure device storage

#### Connection Config (`connection-config.json`)

```json
{
  "endpoint": "your gateway endpoint",
  "port": 8883,
  "protocol": "MQTTS",
  "topics": {
    "publish": "weatherPlatform/telemetry"
  },
  "clientId": "device-name",
  "region": "REGION"
}
```

- **Purpose**: Provides all connection parameters
- **Usage**: Configure MQTT client connection settings

## Error Handling

### Common Registration Errors

1. **Device Already Exists**

   - Status: 409 Conflict
   - Message: "Device 'name' already exists. Please use a different name."

2. **Authentication Failed**

   - Status: 401 Unauthorized
   - Message: "Authentication required"

3. **Permission Denied**

   - Status: 403 Forbidden
   - Message: "Not authorized to register devices"

4. **Missing IoT Resources**

   - Status: 404 Not Found
   - Message: "Thing Group or Policy not found"

5. **Validation Errors**
   - Status: 400 Bad Request
   - Message: Specific validation failure details

## Testing the Registration

### 1. Deploy Backend

```bash
npx ampx sandbox
```

### 2. Create Required IoT Resources

Ensure Thing Group and Policy exist in AWS IoT Core.

### 3. Test Registration

1. Navigate to Platform > Devices
2. Click "Add Device"
3. Fill in device details
4. Submit registration
5. Verify successful response and credential download

### 4. Verify in AWS Console

Check AWS IoT Core Console:

- **Things**: New device should appear
- **Thing Groups**: Device should be in ITeaWeatherHub
- **Certificates**: New certificate should be created and active

## Device Integration

### MQTT Connection Implementation

Using the downloaded credentials, devices can establish secure connections to AWS IoT Core. Here's how to implement this:

#### Python Implementation (Recommended for IoT Devices)

```python
import ssl
import json
import paho.mqtt.client as mqtt
from datetime import datetime

class WeatherStationClient:
    def __init__(self, config_file, cert_file, key_file):
        # Load connection configuration
        with open(config_file, 'r') as f:
            self.config = json.load(f)

        self.cert_file = cert_file
        self.key_file = key_file
        self.client = None

    def setup_ssl_context(self):
        """
        Configure SSL/TLS context for secure MQTT connection
        - Creates SSL context for server authentication
        - Loads device certificate and private key
        - Enables mutual authentication (device + server)
        """
        context = ssl.create_default_context(ssl.Purpose.SERVER_AUTH)
        context.load_cert_chain(self.cert_file, self.key_file)
        context.check_hostname = False  # AWS IoT uses wildcard certificates
        return context

    def on_connect(self, client, userdata, flags, rc):
        """
        Callback when MQTT connection is established
        - rc=0: Successful connection
        - rc>0: Connection failed (check certificate/policy)
        """
        if rc == 0:
            print(f"Connected to AWS IoT Core: {self.config['endpoint']}")
        else:
            print(f"Connection failed with code {rc}")

    def on_publish(self, client, userdata, mid):
        """
        Callback when message is successfully published
        - mid: Message ID for tracking
        """
        print(f"Message published successfully (ID: {mid})")

    def connect(self):
        """
        Establish connection to AWS IoT Core
        - Uses MQTTS (secure MQTT) on port 8883
        - Applies SSL context for encryption
        """
        self.client = mqtt.Client(client_id=self.config.get('clientId', 'weather-device'))

        # Set callbacks
        self.client.on_connect = self.on_connect
        self.client.on_publish = self.on_publish

        # Configure SSL/TLS
        ssl_context = self.setup_ssl_context()
        self.client.tls_set_context(ssl_context)

        # Connect to AWS IoT Core
        self.client.connect(
            self.config['endpoint'],
            self.config['port'],
            keepalive=60
        )

        # Start network loop
        self.client.loop_start()

    def publish_sensor_data(self, temperature, humidity, pressure):
        """
        Publish weather sensor data to AWS IoT Core
        - Topic: weatherPlatform/telemetry (defined in IoT policy)
        - Format: JSON with timestamp and sensor readings
        """
        payload = {
            "deviceId": self.config.get('clientId'),
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "data": {
                "temperature": temperature,    # Celsius
                "humidity": humidity,          # Percentage
                "pressure": pressure           # hPa
            },
            "location": {
                "latitude": None,              # Add GPS coordinates if available
                "longitude": None
            }
        }

        topic = self.config['topics']['publish']
        result = self.client.publish(topic, json.dumps(payload), qos=1)

        if result.rc != mqtt.MQTT_ERR_SUCCESS:
            print(f"Failed to publish message: {result.rc}")

        return result

# Usage Example
if __name__ == "__main__":
    # Initialize client with downloaded credentials
    weather_client = WeatherStationClient(
        config_file="connection-config.json",
        cert_file="certificate.pem.crt",
        key_file="private.pem.key"
    )

    # Connect to AWS IoT Core
    weather_client.connect()

    # Simulate sensor readings and publish
    import time
    while True:
        # Replace with actual sensor readings
        temp = 25.5      # From temperature sensor
        humidity = 60.0  # From humidity sensor
        pressure = 1013.25  # From pressure sensor

        weather_client.publish_sensor_data(temp, humidity, pressure)
        time.sleep(30)  # Send data every 30 seconds
```

#### Arduino/ESP32 Implementation

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

class WeatherStationESP32 {
private:
    WiFiClientSecure wifiClient;
    PubSubClient mqttClient;

    // Connection parameters (from connection-config.json)
    const char* iot_endpoint = "your-endpoint.iot.region.amazonaws.com";
    const int iot_port = 8883;
    const char* publish_topic = "weatherPlatform/telemetry";
    const char* client_id = "esp32-weather-station";

    // Certificate strings (from downloaded files)
    const char* device_certificate = R"(
-----BEGIN CERTIFICATE-----
[Your certificate content here]
-----END CERTIFICATE-----
)";

    const char* device_private_key = R"(
-----BEGIN RSA PRIVATE KEY-----
[Your private key content here]
-----END RSA PRIVATE KEY-----
)";

    // Amazon Root CA (for server verification)
    const char* root_ca = R"(
-----BEGIN CERTIFICATE-----
[Amazon Root CA certificate]
-----END CERTIFICATE-----
)";

public:
    WeatherStationESP32() : mqttClient(wifiClient) {
        mqttClient.setServer(iot_endpoint, iot_port);
    }

    void setupWiFi(const char* ssid, const char* password) {
        WiFi.begin(ssid, password);
        while (WiFi.status() != WL_CONNECTED) {
            delay(1000);
            Serial.println("Connecting to WiFi...");
        }
        Serial.println("WiFi connected");
    }

    void setupTLS() {
        /*
         * Configure TLS certificates for secure connection
         * - Root CA: Verifies AWS server authenticity
         * - Device cert: Proves device identity
         * - Private key: Enables encryption
         */
        wifiClient.setCACert(root_ca);
        wifiClient.setCertificate(device_certificate);
        wifiClient.setPrivateKey(device_private_key);
    }

    bool connectToAWS() {
        setupTLS();

        Serial.print("Connecting to AWS IoT Core...");
        if (mqttClient.connect(client_id)) {
            Serial.println("Connected!");
            return true;
        } else {
            Serial.print("Connection failed, rc=");
            Serial.println(mqttClient.state());
            return false;
        }
    }

    void publishSensorData(float temperature, float humidity, float pressure) {
        /*
         * Create and publish sensor data payload
         * - JSON format matching Python implementation
         * - Includes timestamp and device identification
         */
        StaticJsonDocument<300> payload;
        payload["deviceId"] = client_id;
        payload["timestamp"] = getTimestamp();

        JsonObject data = payload.createNestedObject("data");
        data["temperature"] = temperature;
        data["humidity"] = humidity;
        data["pressure"] = pressure;

        String message;
        serializeJson(payload, message);

        if (mqttClient.publish(publish_topic, message.c_str())) {
            Serial.println("Data published successfully");
        } else {
            Serial.println("Publish failed");
        }
    }

    String getTimestamp() {
        // Implement NTP time synchronization for accurate timestamps
        return "2024-01-01T00:00:00Z";  // Placeholder
    }
};
```

### Implementation Notes

#### Security Best Practices

1. **Private Key Storage**: Store private keys in secure hardware modules (HSM) or encrypted storage
2. **Certificate Rotation**: Implement certificate renewal before expiration
3. **Network Security**: Use VPN or private networks where possible
4. **Device Authentication**: Validate device identity before data processing

#### Connection Optimization

1. **Keep-Alive**: Use appropriate keep-alive intervals (60-300 seconds)
2. **QoS Levels**: Use QoS 1 for important telemetry data
3. **Retry Logic**: Implement exponential backoff for reconnections
4. **Batch Processing**: Group multiple sensor readings when possible

#### Data Format Standards

- **Timestamps**: Use ISO 8601 format with UTC timezone
- **Units**: Use standard SI units (Celsius, Pascal, etc.)
- **Validation**: Validate sensor ranges before publishing
- **Metadata**: Include device version, firmware info when relevant

## Security Considerations

1. **Certificate Security**: Private keys should be stored securely on devices
2. **Policy Restrictions**: IoT policies follow least-privilege principle
3. **Topic Isolation**: Devices can only publish to designated topics
4. **Authentication**: Only authenticated users can register devices
5. **Unique Naming**: Device names must be unique to prevent conflicts

## Troubleshooting

### Lambda Function Issues

#### CloudWatch Logs Analysis

Check CloudWatch logs for the `add-thing` Lambda function:

```bash
# View recent logs
aws logs describe-log-streams \
  --log-group-name "/aws/lambda/amplify-weatherdashboard-sandbox-addthing"

# Get specific log events
aws logs get-log-events \
  --log-group-name "/aws/lambda/amplify-weatherdashboard-sandbox-addthing" \
  --log-stream-name "LATEST"
```

#### Common Lambda Errors

1. **Permission Denied**

   ```
   Error: AccessDeniedException: User is not authorized to perform iot:CreateThing
   ```

   - **Cause**: Lambda execution role lacks IoT permissions
   - **Solution**: Verify IAM policy includes all required IoT actions
   - **Check**: Review `amplify/backend.ts` IAM policy statements

2. **Resource Not Found**

   ```
   Error: ResourceNotFoundException: Thing Group 'ITeaWeatherHub' not found
   ```

   - **Cause**: Thing Group not created in AWS IoT Core
   - **Solution**: Create the Thing Group manually or via CLI
   - **Prevention**: Include Thing Group creation in deployment scripts

3. **Timeout Errors**
   ```
   Task timed out after 30.00 seconds
   ```
   - **Cause**: Lambda function timeout too short for IoT operations
   - **Solution**: Increase timeout in `resource.ts` (currently 30s)
   - **Optimization**: Batch operations where possible

### IoT Core Issues

#### Device Registration Failures

1. **Certificate Generation Failed**

   ```bash
   # Check IoT Core certificate limits
   aws iot describe-account-attributes
   ```

   - **Limit**: 2000 certificates per account by default
   - **Solution**: Request limit increase or implement certificate recycling

2. **Policy Attachment Failed**

   ```
   Error: InvalidRequestException: Policy 'WeatherStationPolicies' not found
   ```

   - **Verification**: Check if policy exists

   ```bash
   aws iot get-policy --policy-name WeatherStationPolicies
   ```

   - **Solution**: Create the policy using provided JSON

3. **Thing Group Assignment Failed**

   ```bash
   # Verify Thing Group exists
   aws iot describe-thing-group --thing-group-name ITeaWeatherHub

   # List all Thing Groups
   aws iot list-thing-groups
   ```

#### Device Connection Issues

1. **TLS Handshake Failures**

   - **Symptoms**: Connection refused, SSL errors
   - **Causes**:
     - Invalid certificate format
     - Certificate not activated
     - Wrong endpoint URL

   **Debugging Steps:**

   ```bash
   # Test certificate validity
   openssl x509 -in certificate.pem.crt -text -noout

   # Verify certificate dates
   openssl x509 -in certificate.pem.crt -dates -noout

   # Test TLS connection
   openssl s_client -connect your-endpoint.iot.region.amazonaws.com:8883 \
     -cert certificate.pem.crt -key private.pem.key
   ```

2. **Authentication Failures**

   - **Error**: `MQTT_CONNECTION_REFUSED`
   - **Check**: Certificate attached to Thing

   ```bash
   aws iot list-thing-principals --thing-name your-device-name
   ```

   - **Check**: Policy attached to certificate

   ```bash
   aws iot list-attached-policies --target your-certificate-arn
   ```

3. **Authorization Failures**

   - **Error**: `MQTT_NOT_AUTHORIZED`
   - **Cause**: IoT policy doesn't allow required actions
   - **Solution**: Review and update policy permissions

   **Policy Debug:**

   ```bash
   # Get policy document
   aws iot get-policy --policy-name WeatherStationPolicies

   # Check policy versions
   aws iot list-policy-versions --policy-name WeatherStationPolicies
   ```

### Frontend Issues

#### Authentication Problems

1. **User Not Authenticated**

   ```javascript
   // Debug authentication in browser console
   console.log("Auth status:", await getCurrentUser());
   ```

   - **Check**: User session in cookies
   - **Solution**: Re-login or refresh session

2. **API Route Access Denied**
   ```
   Error 401: Authentication required
   ```
   - **Check**: Middleware authentication
   - **Debug**: Review `src/middleware.ts` logs
   - **Solution**: Verify cookie-based session

#### Network Request Failures

1. **Lambda Invocation Failed**

   ```javascript
   // Check network tab in browser DevTools
   // Look for 500 errors on /api/iot/register
   ```

   - **Debug**: Check browser network tab
   - **Logs**: Review Next.js server logs
   - **Solution**: Verify Lambda function name and region

2. **Response Processing Errors**
   ```
   TypeError: Cannot read property 'certificates' of undefined
   ```
   - **Cause**: Unexpected Lambda response format
   - **Debug**: Log full Lambda response
   - **Solution**: Add response validation

### Development Environment Issues

#### Amplify Sandbox Problems

1. **Function Not Found**

   ```bash
   # Verify function deployment
   npx ampx sandbox status

   # Check function logs
   npx ampx sandbox logs --function addThing
   ```

2. **Environment Variables Missing**

   ```typescript
   // Add to Lambda handler for debugging
   console.log("Environment:", {
     THING_GROUP: env.AWS_IOT_THING_GROUP_NAME,
     POLICY: env.AWS_IOT_POLICY_NAME,
   });
   ```

3. **Permission Sync Issues**

   ```bash
   # Force deployment refresh
   npx ampx sandbox --force

   # Clean and redeploy
   rm -rf .amplify
   npx ampx sandbox
   ```

### Monitoring and Diagnostics

#### Enable CloudWatch Metrics

```bash
# Enable IoT Core metrics
aws iot put-logging-options \
  --logging-options-payload '{"roleArn":"arn:aws:iam::ACCOUNT:role/service-role/IoTLogsRole","logLevel":"INFO"}'
```

#### Device Connection Monitoring

```bash
# Monitor device connections
aws logs filter-log-events \
  --log-group-name AWSIoTLogsV2 \
  --filter-pattern "{ $.eventType = \"connection\" }"
```

#### Lambda Performance Monitoring

```bash
# View Lambda metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=amplify-sandbox-addthing \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Average,Maximum
```

### Recovery Procedures

#### Clean Device Registration

If a device registration is corrupted:

```bash
# Remove thing from group
aws iot remove-thing-from-thing-group \
  --thing-name device-name \
  --thing-group-name ITeaWeatherHub

# Detach certificate
aws iot detach-thing-principal \
  --thing-name device-name \
  --principal certificate-arn

# Delete thing
aws iot delete-thing --thing-name device-name

# Deactivate and delete certificate
aws iot update-certificate \
  --certificate-id certificate-id \
  --new-status INACTIVE

aws iot delete-certificate \
  --certificate-id certificate-id \
  --force-delete
```

#### Reset Lambda Environment

```bash
# Redeploy with clean state
npx ampx sandbox delete
npx ampx sandbox
```

## Related Documentation

- [AWS IoT Core Developer Guide](https://docs.aws.amazon.com/iot/latest/developerguide/)
- [AWS Lambda with IoT](https://docs.aws.amazon.com/lambda/latest/dg/services-iot.html)
- [Amplify Lambda Functions](https://docs.amplify.aws/gen2/build-a-backend/functions/)
- [MQTT Protocol Documentation](https://mqtt.org/)
