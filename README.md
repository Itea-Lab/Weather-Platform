# <h1 align="center">Weather Platform - IoT Dashboard</h1>

<p align="center">A modern, real-time IoT weather monitoring dashboard built with Next.js and AWS Amplify</p>

<div align="center">
    <img src="https://cdn.jsdelivr.net/gh/tandpfun/skill-icons/icons/NextJS-Dark.svg" height="45" alt="nextjs logo" />
    <img width="12" />
    <img src="https://cdn.jsdelivr.net/gh/tandpfun/skill-icons/icons/TypeScript.svg" height="45" alt="typescript logo" />
    <img width="12" />
    <img src="https://cdn.jsdelivr.net/gh/tandpfun/skill-icons/icons/TailwindCSS-Dark.svg" height="45" alt="tailwind logo" />
    <img width="12" />
    <img src="https://cdn.jsdelivr.net/gh/tandpfun/skill-icons/icons/AWS-Dark.svg" height="45" alt="aws logo" />
</div>

## Getting Started

### Step 1: Prerequisites

- [Node.js](https://nodejs.org/) 18 or higher
- [pnpm](https://pnpm.io/) package manager
- AWS Account with appropriate permissions

### Step 2: Install AWS CLI

Download and install the AWS CLI:

```bash
# Windows (using MSI installer)
# Download from: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

# macOS (using Homebrew)
brew install awscli

# Linux (using curl)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

Verify installation:

```bash
aws --version
```

### Step 3: Create IAM User

1. **Go to AWS Console** → IAM → Users → "Create user"

2. **User details:**

   - Username: `your_iam_name`
   - Select "Provide user access to the AWS Management Console" if needed

3. **Set permissions:**

   - Choose "Attach policies directly"
   - Add these managed policies:
     - `AmplifyBackendDeployFullAccess`
     - `AWSCloudFormationReadOnlyAccess` (for debugging purpose)

4. **Create Access Keys:**
   - Go to user → Security credentials → "Create access key"
   - Choose "Command Line Interface (CLI)"
   - Save the **Access Key ID** and **Secret Access Key**

### Step 4: Configure AWS CLI Profile

Set up a named profile for this project:

```bash
# Configure AWS CLI with your profile
aws configure --profile <profile_name>

# Enter when prompted:
# AWS Access Key ID: [your-access-key-id]
# AWS Secret Access Key: [your-secret-access-key]
# Default region name: enter region you want to deploy (by default: us-east-1)
# Default output format: json
```

Verify the profile:

```bash
aws sts get-caller-identity --profile <profile_name>
```

### Step 5: Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/Itea-Lab/Weather-Platform.git
cd Weather-Platform

# Install dependencies
pnpm install
```

### Step 6: Environment Configuration (Optional)

Create a `.env.local` file in the root directory:

```env
# AWS Configuration (Optional - auto-detected from AWS CLI)
AWS_REGION=us-east-1
```

> **Note:** Most configuration is automatically handled by Amplify. The `.env.local` file is mainly for development overrides.

## Deployment

### Development Deployment (Recommended for Testing)

Use Amplify Sandbox - creates isolated AWS resources:

```bash
# Start sandbox environment
npx ampx sandbox --profile weather-platform
```

This will:

- Deploy backend infrastructure (Lambda, IoT, S3, Cognito)
- Create development AWS resources
- Generate `amplify_outputs.json` with configuration
- Provide real-time AWS resource updates

### Local Development

Once sandbox is running, start the frontend:

```bash
# Start development server
pnpm dev
```

**Frontend URLs:**

- Root: http://localhost:3000
- Dashboard: http://localhost:3000/dashboard
- Devices: http://localhost:3000/devices
- Dataset: http://localhost:3000/dataset

### Production Deployment

For production deployment with manual setup:

1. **Deploy Backend to Production:**

   ```bash
   npx ampx pipeline-deploy --branch prod --outputs-format json --profile <profile_name>
   ```

2. **Set Up Hosting via Amplify Console:**

   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Click **"Create app"** → **"Host web app"**
   - Choose **GitHub** (or your Git provider)
   - Select your repository: `Itea-Lab/Weather-Platform`
   - Select branch: `prod`
   - Configure build settings:
     - **App name**: `weather-platform-prod`
     - **Build command**: `npm run build`
     - **Build output directory**: `.next`
     - **Node.js version**: `18` or higher

3. **Environment Variables (Optional):**

   Add these if needed:

   - `AWS_REGION`: `us-east-1` (or your region)

4. **Deploy:**

   - Click **"Save and deploy"**
   - Wait for deployment to complete (5-10 minutes)

5. **Access Production App:**
   - URL: `https://prod.[app-id].amplifyapp.com`
   - Custom domain: Configure in Amplify Console if needed

## Features

- **Real-time Dashboard**: Live weather data visualization with interactive charts
- **IoT Device Management**: Register, monitor, and manage weather stations
- **Device Status Monitoring**: Automated offline detection with notifications (30s threshold)
- **Data Analytics**: Historical weather data with filtering and export capabilities
- **User Authentication**: Secure Cognito-based authentication with role-based access
- **Responsive Design**: Mobile-friendly interface with adaptive layouts
- **Serverless Architecture**: AWS Lambda, IoT Core, S3, and Glue ETL integration

## Technologies Used

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Shadcn/ui components
- **Backend**: AWS Amplify Gen 2, Lambda functions
- **IoT**: AWS IoT Core with PubSub messaging
- **Storage**: Amazon S3 with CloudFront CDN
- **Database**: AWS Glue for data transformation
- **Authentication**: Amazon Cognito
- **Package Manager**: pnpm (local), npm (Amplify builds)
- **Charts**: Recharts for data visualization

## ⚠️ Important Notes

### AWS Resources Created

When you deploy this platform, it creates the following AWS resources:

- **Lambda Functions**: addThing, fetchThings, deleteThing, getIoTEndpoint, getDataset, getTotalReadings
- **IoT Core**: Device registry, certificates, policies, and PubSub topics
- **S3 Bucket**: Weather data storage with CloudFront CDN
- **Cognito**: User pools and identity pools for authentication
- **Glue ETL**: Data transformation pipeline
- **EventBridge**: Scheduled data processing events
- **CloudFront**: CDN for global dataset distribution
- **Step Functions**: Orchestrated workflows for data processing
- **Amplify App**: Backend and hosting configuration
- **Other Resources**: CloudWatch logs, IAM roles, policies, and more

### Cost Considerations

- **Sandbox**: Development resources - minimal cost
- **Production**: Usage-based pricing for AWS services
- **Free Tier**: Many services are included in AWS Free Tier

## Project Structure

```
Weather-Platform/
├── amplify/                    # AWS Amplify backend configuration
│   ├── backend.ts             # Main backend definition
│   ├── auth/                  # Cognito authentication
│   ├── functions/             # Lambda functions
│   │   ├── addThing/          # Device registration
│   │   ├── fetchThings/       # Device listing
│   │   ├── getDataset/        # Weather data retrieval
│   │   └── ...
│   └── custom/                # Custom AWS resources
│       ├── CloudFront/        # CDN configuration
│       ├── EventBridge/       # Scheduled events
│       └── WeatherDataGlue/   # ETL pipeline
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Main dashboard
│   │   ├── devices/           # Device management
│   │   ├── notification/      # Notification center
│   │   └── dataset/           # Data visualization
│   ├── components/            # Reusable React components
│   │   ├── auth/              # Authentication components
│   │   ├── platform/          # Dashboard components
│   │   └── ui/                # Shadcn/ui components
│   ├── hooks/                 # Custom React hooks
│   │   ├── AuthContext.tsx    # Authentication state
│   │   ├── TelemetryContext.tsx # Real-time data
│   │   └── NotificationContext.tsx # IoT notifications
│   ├── lib/                   # Utility libraries
│   │   ├── api.ts             # API client
│   │   ├── iotConfig.ts       # IoT configuration
│   │   ├── deviceStatusMonitor.ts # Device monitoring
│   │   └── sharedPubSubManager.ts # PubSub management
│   ├── types/                 # TypeScript definitions
│   │   ├── device.ts          # Device types
│   │   ├── sensorData.ts      # Sensor data types
│   │   └── telemetry.ts       # Telemetry types
│   └── config/                # Configuration files
│       ├── iotTopics.ts       # IoT topic definitions
│       └── PubSubInitializer.tsx # PubSub setup
├── public/                    # Static assets
├── amplify.yml               # Amplify build configuration
├── package.json              # Project dependencies
├── pnpm-lock.yaml           # pnpm lockfile
├── tsconfig.json            # TypeScript configuration
└── tailwind.config.ts       # Tailwind CSS configuration
```

## Available Scripts

```bash
# Development
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint

# AWS Amplify Gen 2 (use npm for these commands)
npx ampx login                    # Login to Amplify
npx ampx sandbox                  # Deploy to sandbox (development)
npx ampx pipeline-deploy          # Deploy backend to production
npx ampx info                     # Get troubleshooting information
```
