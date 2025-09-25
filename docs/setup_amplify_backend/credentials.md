# AWS Credentials Configuration

This document explains how AWS credentials are handled in different environments for the Weather Platform.

## Environment Detection

The application automatically detects the environment and uses appropriate credential providers:

### Production (AWS Amplify / Lambda)

- **Detection**: `AWS_EXECUTION_ENV` or `AWS_LAMBDA_FUNCTION_NAME` environment variables present
- **Credentials**: Uses IAM roles automatically (no configuration needed)
- **Region**: Determined from runtime environment

### Local Development

- **Detection**: Neither `AWS_EXECUTION_ENV` nor `AWS_LAMBDA_FUNCTION_NAME` present
- **Credentials**: Uses AWS CLI profile via credential provider chain
- **Region**: Uses `DEFAULT_REGION` environment variable
- **Profile**: Uses `DEFAULT_PROFILE` environment variable

## Local Development Setup

1. **Configure AWS CLI**:

   ```bash
   aws configure --profile your-profile-name
   ```

2. **Copy environment template**:

   ```bash
   cp .env.local.example .env.local
   ```

3. **Set environment variables** in `.env.local`:
   ```env
   DEFAULT_PROFILE=your-profile-name
   DEFAULT_REGION=us-east-1
   ```

## Environment Variable Names

We use `DEFAULT_PROFILE` and `DEFAULT_REGION` instead of `AWS_PROFILE` and `AWS_REGION` because:

- AWS restricts environment variables starting with "AWS\_" in certain contexts
- This approach ensures compatibility across all deployment scenarios
- Follows AWS best practices for custom application configuration

## Credential Provider Chain

The application uses the AWS SDK's credential provider chain in the following order:

1. **Environment variables** (if any AWS\_\* variables are set)
2. **AWS CLI profile** (specified by `DEFAULT_PROFILE`)
3. **Instance metadata** (EC2 IAM roles)
4. **Container credentials** (ECS/EKS IAM roles)

## Security Notes

- Never commit `.env.local` to version control
- Use IAM roles in production instead of access keys
- Follow the principle of least privilege for IAM permissions
- Rotate access keys periodically for local development

## Implementation Details

The credential configuration is implemented in:

- `src/lib/awsConfig.ts` - Main credential provider logic
- `src/lib/lambdaInvoker.ts` - Lambda invocation with proper credentials
- Dynamic imports are used to avoid bundling credential providers in production
