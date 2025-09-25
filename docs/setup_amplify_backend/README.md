# AWS Amplify Gen 2 Setup Documentation

This directory contains comprehensive setup guides for AWS Amplify Generation 2 backend components with CDK-based custom constructs.

## Architecture Overview

Our Weather Platform uses a hybrid approach:

- **Amplify Gen 2**: For authentication, Lambda functions, and deployment management
- **CDK Custom Constructs**: For advanced infrastructure like S3 storage, Glue data pipeline, CloudFront CDN, and EventBridge scheduling
- **No Circular Dependencies**: Clean separation eliminates CloudFormation conflicts

## Setup Guides

### Core Components

- [Manual Amplify Setup](./manual_setup.md) - Complete guide for manual Amplify Gen 2 setup, especially for pnpm on Windows
- [Lambda Functions Setup](./create_function.md) - Complete guide for creating and deploying Lambda functions
- [Authentication Setup](./authentication/README.md) - AWS Cognito authentication configuration
- [API Gateway Setup](./create_api_gateway.md) - RESTful API and GraphQL setup
- [CDK Storage Setup](./create_storage.md) - S3 bucket configuration using CDK constructs

### Data Processing Pipeline

- [AWS Glue Setup](./setup_glue/README.md) - CDK-based Glue data cataloging and ETL operations
- [CloudFront Distribution](./setup_cloudfront/README.md) - CDK-based CDN setup for global dataset distribution

### Advanced Infrastructure

- [EventBridge Scheduling](./setup_eventbridge/README.md) - Weekly data processing automation
- [Custom CDK Constructs](./custom_constructs/README.md) - Weather-specific infrastructure components

### Configuration

- [IoT Endpoint and Credentials Fetching](./fetchEndpoint/README.md) - AWS STS-based IoT endpoint discovery and credential generation
- [Environment Configuration](./.env.local) - Local development environment setup with AWS credentials

### IoT Integration

- [IoT Device Management](./add_device.md/README.md) - IoT Core integration and device registration
- [IoT Device Fetching](./fetchThings/README.md) - Device data retrieval

## Quick Start

1. **Manual Amplify setup** (required for pnpm on Windows):

   - Follow the [Manual Setup Guide](./manual_setup.md)
   - Install required packages and create project structure

2. **Set up Lambda functions**:

   - Follow the [Lambda Functions Guide](./create_function.md)
   - Create your function handlers and resources

3. **Configure authentication**:

   - Set up AWS Cognito using the [Authentication Guide](./authentication/README.md)

4. **Configure environment variables**:

   - Copy `.env.local.example` to `.env.local`
   - Set your AWS profile and region for local development

5. **Deploy to sandbox**:
   ```bash
   npx ampx sandbox
   ```

## Documentation Structure

Each guide includes:

- Prerequisites and dependencies
- Step-by-step instructions
- Code examples and best practices
- Common issues and troubleshooting
- Integration patterns

## Related Resources

- [AWS Amplify Gen 2 Official Documentation](https://docs.amplify.aws/gen2/)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [TypeScript AWS Lambda Types](https://www.npmjs.com/package/@types/aws-lambda)

## Best Practices

1. **Implement proper error handling**
2. **Set up appropriate IAM permissions**
3. **Use environment variables for configuration**
4. **Test in sandbox before production deployment**
