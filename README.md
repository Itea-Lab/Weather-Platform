# ITea Edge Hub for Weather Stations
A modern IoT sensor data visualization dashboard built with Next.js, featuring real-time data monitoring, integration with InfluxDB for time-series data storage.
  
## Technologies Used
- **pnpm**: A fast, disk space-efficient package manager.
- **Next.js**: A React framework for building server-rendered applications.
- **TypeScript**: A superset of JavaScript that adds static types.
- **Tailwind CSS**: For styling the application.
- **Shadcn**: A component library for building user interfaces
- **InfluxDB**: A time-series database for storing sensor data.
- **Docker**: For containerizing the application.

## Quick Start
### Prerequisites

- Node.js 18 or higher  
- pnpm package manager  
- InfluxDB instance (local hosting)

### Setup Application
Clone this repository:
```bash
git clone https://github.com/Itea-Lab/Weather-Dashboard.git
cd Weather-Dashboard
```

Create .env.local file in the root of the project and add your environment variables:

```env
# JWT Configuration
JWT_SECRET=<secret-jwt-key>
JWT_EXPIRES_IN=<duration>
# Admin User
ADMIN_USERNAME=<username>
ADMIN_NAME=<name>
ADMIN_PASSWORD_HASH=<password$Hash>
ADMIN_EMAIL=<email>
ADMIN_ROLE="admin"
# Test User
TEST_USERNAME="testuser"
TEST_NAME=Test User
TEST_PASSWORD_HASH=<password$Hash>
TEST_EMAIL=<email>
TEST_ROLE="user"
# InfluxDB configuration
# If you are running InfluxDB in a different container, use the service name as the route
INFLUXDB_ROUTE=http://<service_name>:8086
INFLUXDB_ORG=<your-influxdb-org>
INFLUXDB_BUCKET=<your-influxdb-bucket>
```
Install dependencies
```bash
pnpm install
```

### Set up InfluxDB

Before running the application, you need to configure InfluxDB:
1. Create an InfluxDB account or set up a local instance
2. Create an organization and bucket for your data
3. Generate an authentication token (you can find it on the InfluxDB UI)
4. Update the InfluxDB configuration in your .env.local file

## Generate password hash
create a file `gen_hash.ts` in the root of the project with the following content:
```typescript
const bcrypt = require("bcryptjs");

async function generateHash() {
  const password = "password"; 
  // Change this to your desired password
  const hash = await bcrypt.hash(password, 12);
  console.log("Password hash:", hash);
  console.log("Copy this hash to your .env.local file");
}

generateHash();
```
Then run the script:
```bash
pnpm node gen_hash.ts
```

## Folder structure
```
.next/                  # Next.js build output directory
node_modules/           # Node.js modules directory
src/                        # Source code for the application
├── app/                    # App directory for Next.js
│   ├── api/                # API routes
│   ├───|── auth/           # Authentication route
│   ├───|───|── route.ts    
│   ├───|── <otherAPI>/     # Other API routes
│   ├───|───|── route.ts    
│   ├── components/         # Reusable components
│   ├───|── ui/             # UI components (Shadcn)
│   ├── context/            # Context providers for state management
│   ├── lib/                # Utility functions and libraries
│   ├───|── auth.ts         # Authentication utilities
│   ├───|── api.ts          # API utilities
│   ├───|── influxdb.ts     # InfluxDB utilities
│   ├───|── utils.ts        # General utility functions
│   ├── types/              # TypeScript type definitions
│   ├── dashboard/          # Dashboard main page
│   ├───|───|── page.tsx
│   ├───|───|── layout.tsx
│   ├───|── subpage/        # Subpage of the dashboard
│   ├───|───|── page.tsx
│   ├── globals.css         # Global CSS styles
│   ├── layout.tsx
│   ├── page.tsx            # Main entry point for the app
├── middleware.ts           # Middleware for handling requests
public/                 # Static assets (images, fonts, etc.)
.env.local              # Environment variables for local development
.env.production         # Environment variables for production
.gitignore              # Files & directories to ignore in Git
.dockerignore           # Files & directories to ignore in Docker builds
Dockerfile              # Dockerfile for building the application
component.json          # Shadcn component configuration
next.config.ts          # Next.js configuration file
package.json            # Project metadata and dependencies
pnpm-lock.yaml          # Lockfile for package versions
tsconfig.json           # TypeScript configuration file
```

### Run the Application
#### Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

#### Run the Production Build
For production deployment, create a `.env.production` file with production-specific values.  

To create a production build of your Next.js app, run the following command:

```bash
pnpm build
```
This will generate an optimized version of your application in the `.next` directory.
## Running in Production
To run your Next.js app in production mode, you can use the following command:

```bash
pnpm start
```
This will start the Next.js server in production mode, serving the optimized build created by the `pnpm build` command.

### Running with Docker
#### Build the Docker image
```
docker build -t itea-edge-hub .
```
#### Run the Docker container
```bash
docker run -d -p 3000:3000 --env-file .env.local itea-edge-hub
```
### Or you can pull the pre-built image from Docker Hub:
```bash
docker pull pancakeslmao/itea-edge-hub:latest
```
Then run the container:
```bash
docker run -d -p 3000:3000 --env-file .env.local pancakeslmao/itea-edge-hub:latest
```

## Adding New Components
To add new Shadcn/UI components to your project:
```bash
pnpm dlx shadcn@latest add <component-name>
```
Examples:
```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add chart
```
Components will be automatically installed with their dependencies and added to the `src/app/components/ui/` directory.
