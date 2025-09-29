# Setup Amplify Sandbox Backend (Manual Installation)

This guide covers how to manually set up AWS Amplify Gen 2 backend using sandbox environment, specifically for projects that cannot use create-amplify.

## What is Cloud Sandbox Environment

Sandboxes are identical in fidelity to your production environments. Code changes are continuously deployed to your sandbox on every save for fast iteration capabilities.

## Prerequisites

- Node.js 18+ installed
- AWS CLI configured
- Valid AWS account with appropriate permissions
- pnpm package manager (if using pnpm)

## Special Case for Next.js Apps Using pnpm

### Amplify Gen 2 vs Gen 1 CLI Tools

**Important Distinction:**

- `amplify` CLI = **Amplify Gen 1** (legacy, not supported for new projects)
- `ampx` CLI = **Amplify Gen 2** (current, what we use)

### pnpm Not Supported on Windows for Amplify

Both `create-amplify` and the legacy `amplify` CLI throw this error on Windows:

```
"Amplify does not support PNPM on Windows."
```

Because Amplify tooling uses nested node_modules, which conflicts with pnpm's flat symlink architecture on Windows.

**Important:** You cannot use:

- `create-amplify` (Gen 2 scaffolding tool)
- `amplify init` (Gen 1 legacy command)
- Any `amplify` commands (these are Gen 1 only)

**However:** `npx ampx` commands (Gen 2) work fine for deployment and management - only the initial scaffolding tools have this limitation.

**Current Solution:** Use manual setup with `npx ampx` commands for deployment and management, while keeping pnpm for dependency management.

## Step 1: Install Amplify Packages

Add amplify packages to your current project:

````bash
pnpm add -D @aws-amplify/backend @aws-amplify/backend-cli typescript aws-cdk-lib constructs @aws-amplify/adapter-nextjs

**Note**: Install the Amplify Gen 2 CLI globally using npm (works on all platforms):

```bash
# Install Amplify Gen 2 CLI (ampx)
npm install -g @aws-amplify/backend-cli

# DO NOT install the legacy Gen 1 CLI:
# npm install -g @aws-amplify/cli  ❌ (This is Gen 1, deprecated)
````

**Important:** Always use `ampx` commands, never `amplify` commands (Gen 1).

## Step 2: Create Amplify Working Directory

### Create amplify folder structure

Create an `amplify/` folder at the root of your project:

```bash
mkdir amplify
mkdir amplify/auth
```

### Create backend.ts

Inside `amplify/backend.ts`, add this configuration:

```typescript
import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";

export const backend = defineBackend({
  auth,
});
```

### Create authentication resource

Create `amplify/auth/resource.ts` and add the following code:

```typescript
import { defineAuth } from "@aws-amplify/backend";

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});
```

### Final Project Structure

The final structure should look like this:

```
Weather-Platform/
├── amplify/
│   ├── backend.ts          # Define your backend here
│   └── auth/
│       └── resource.ts     # Define authentication settings
├── public/
├── src/
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

## Step 3: Configure AWS Profile

### Initial Profile Setup

If you haven't configured your AWS profile, run:

```bash
npx ampx configure profile
```

This will prompt you to enter:

- AWS Access Key ID
- AWS Secret Access Key
- Default region
- Output format

You can find your access keys in the Users section of Identity and Access Management (IAM).

**Reference:** [AWS Account Setup Guide](https://docs.amplify.aws/nextjs/start/account-setup/)

### Remove Existing Profile (if needed)

If you need to remove your current profile (for example, if you accidentally used a super admin IAM account with full administration policies), follow these steps:

#### Step 1: Remove the existing default profile manually

Edit these two files:

- Windows: `C:\Users\<your-user>\.aws\credentials`
- Windows: `C:\Users\<your-user>\.aws\config`

**Important:** If you have multiple profiles, do not delete the entire file—only remove the `[default]` section.

Example credentials file:

```ini
[default]
aws_access_key_id = AKIA...
aws_secret_access_key = xxxx...

[other-profile]
aws_access_key_id = AKIA...
aws_secret_access_key = yyyy...
```

Remove only the `[default]` section.

#### Step 2: Confirm removal

Run:

```bash
aws configure list-profiles
```

You should no longer see `default` listed.

#### Step 3: Reconfigure

Run the configure command again to set up a new profile:

```bash
npx ampx configure profile
```

**Reference:** [Manual Installation Guide](https://docs.amplify.aws/nextjs/start/manual-installation/)

## Step 4: Deploy Amplify Backend (Sandbox Environment)

### First Time Deployment

Run the following command to start your sandbox:

```bash
npx ampx sandbox
```

### Bootstrap Process

For the first time you run this command, it will display:

```
The region <your selected region> has not been bootstrapped. Sign in to the AWS console as a Root user or Admin to complete the bootstrap process, then restart the sandbox.
If this is not the region you are expecting to bootstrap, check for any AWS environment variables that may be set in your shell or use --profile <profile-name> to specify a profile with the correct region.
```

**Bootstrap Steps:**

1. Sign in to the AWS Management Console
2. You must sign in as the account root user or as a user that has AdministratorAccess permissions
3. You will be redirected to the Amplify console
4. A browser window will open asking you to initialize bootstrap
5. This process takes 3-5 minutes to complete
6. Once completed, you can close the tab

### Restart Sandbox

After bootstrap completion, run the command again to initialize sandbox:

```bash
npx ampx sandbox --once
```

### Terminate Sandbox

To terminate the sandbox environment, run:

```bash
npx ampx sandbox delete
```

## Important Billing Warning

**WARNING:** From this moment on, any resource you define in Amplify backend will be deployed in sandbox. Running resources in sandbox still affects your billing. **RUNNING RESOURCES IN SANDBOX ENVIRONMENT STILL AFFECTS YOUR BILLING!**

Monitor your AWS costs regularly when using sandbox environments.

**Reference:** [Sandbox Environments Setup](https://docs.amplify.aws/nextjs/deploy-and-host/sandbox-environments/setup/)

## Next Steps

After successful sandbox setup:

1. [Set up Lambda Functions](./create_function.md)
2. [Set up Custom Services (CDK Constructs)](./custom_services.md)
3. [Set up Storage](./create_storage.md)
4. [Configure IoT Device Management](./add_device.md/README.md)

## Troubleshooting

### Common Issues

**Issue:** Bootstrap fails with permission errors
**Solution:** Ensure you're signed in as root user or have AdministratorAccess permissions

**Issue:** Sandbox deployment fails
**Solution:** Check your AWS credentials and region configuration

**Issue:** pnpm conflicts on Windows
**Solution:** Use this manual installation method instead of create-amplify

### Useful Commands

```bash
# Check current profile
aws configure list

# List all profiles
aws configure list-profiles

# Check sandbox status (Gen 2)
npx ampx sandbox

# View sandbox logs (Gen 2)
npx ampx sandbox --debug

# Check Amplify Gen 2 CLI version
npx ampx --version

# ❌ DO NOT USE Gen 1 commands:
# amplify status     ❌ (Gen 1 legacy)
# amplify push       ❌ (Gen 1 legacy)
# amplify init       ❌ (Gen 1 legacy)
```

**Remember:** Always use `ampx` (Gen 2) commands, never `amplify` (Gen 1) commands.
