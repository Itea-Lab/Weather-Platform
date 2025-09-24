# Dataset Transformation Pipeline

## Overview

The Weather Platform uses AWS Step Functions to orchestrate an automated data processing pipeline that runs daily at midnight UTC+7 (17:00 UTC). The pipeline performs data crawling, cataloging, and ETL operations using AWS Glue services.

## Architecture Components

### 1. EventBridge Schedule Rule

- **Name**: WeatherDataProcessingRule
- **Schedule**: Daily at 17:00 UTC (midnight UTC+7)
- **Purpose**: Triggers the Step Functions state machine automatically

### 2. Step Functions State Machine

- **Name**: WeatherDataProcessingStateMachine
- **Timeout**: 2 hours
- **Purpose**: Orchestrates the data processing workflow

### 3. AWS Glue Components

- **Database**: `weather_data_catalog_<random_id>`
- **Crawler**: WeatherPlatformCrawler
- **ETL Job**: WeatherDataTransformJob

## Data Processing Workflow

### Step 1: Start Glue Crawler

The Step Functions workflow begins by starting the Glue Crawler:

- **Action**: `glue:StartCrawler`
- **Target**: WeatherPlatformCrawler
- **Source Path**: `s3://<source-bucket>/raw-data/weatherPlatform/telemetry/`

### Step 2: Wait and Monitor Crawler

The workflow waits for the crawler to complete:

- **Wait Time**: 2 minutes between status checks
- **Monitor**: Crawler state (RUNNING, READY, STOPPING)
- **Retry Logic**: Continues checking until crawler completes

### Step 3: Start ETL Job

Once the crawler completes, the Glue ETL job starts:

- **Job Name**: WeatherDataTransformJob
- **Worker Type**: G.1X (2 workers)
- **Timeout**: 60 minutes
- **Integration Pattern**: RUN_JOB (synchronous execution)

## Glue Crawler Configuration

### Data Source

- **S3 Path**: `s3://<source-bucket>/raw-data/weatherPlatform/telemetry/`
- **Exclusions**: `**/*.tmp`, `**/*.gz`, `**/_SUCCESS`
- **Recrawl Policy**: CRAWL_NEW_FOLDERS_ONLY

### Schema Detection

- **Update Behavior**: LOG (logs schema changes)
- **Delete Behavior**: LOG (logs deletions)
- **Table Creation**: Creates 'telemetry' table without prefix

### Output

- **Database**: weather_data_catalog
- **Table**: telemetry
- **Schema**: Auto-detected from JSON files

## ETL Transformation Process

### Input Data Structure

The crawler processes IoT telemetry data with this structure:

```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "location": "district_name",
  "data": {
    "temperature": 25.5,
    "humidity": 65.2,
    "pressure": 1013.25,
    "winddirection": 180,
    "avgwindspeed": 5.2,
    "maxwindspeed": 8.1,
    "rainfall1hr": 0.5,
    "rainfall24hr": 2.3
  }
}
```

### Transformation Logic

The ETL job (`weather-transform.py`) performs:

1. **Data Flattening**: Extracts nested fields from `data` object
2. **Column Renaming**: Maps to standardized column names
3. **Data Filtering**: Removes records with null timestamps or locations
4. **Location Grouping**: Processes each district separately
5. **Chronological Sorting**: Orders records by timestamp

### Output Data Structure

```csv
timestamp,location,temperature,humidity,pressure,wind_direction,avg_wind_speed,max_wind_speed,rainfall_1hr,rainfall_24hr
2024-01-01T00:00:00Z,district_name,25.5,65.2,1013.25,180,5.2,8.1,0.5,2.3
```

### Output Files

- **Path Pattern**: `s3://<target-bucket>/dataset/{location}/all_data_{timestamp}.csv`
- **Format**: Single CSV file per location containing all historical data
- **Filename**: Includes current datetime for uniqueness
- **Partitioning**: By location (district)

## IAM Permissions

### Glue Service Role Permissions

The Glue service role requires:

**S3 Access**:

- `s3:GetObject`, `s3:ListBucket`, `s3:GetBucketLocation` (source bucket)
- `s3:PutObject`, `s3:PutObjectAcl`, `s3:DeleteObject` (target bucket)

**Glue Operations**:

- Database and table management
- Crawler operations
- Partition management
- Job execution

**CloudWatch**:

- Logs creation and writing
- Metrics publishing

### Step Functions Role Permissions

- `glue:StartCrawler`, `glue:GetCrawler`
- `glue:StartJobRun`, `glue:GetJobRun`, `glue:BatchStopJobRun`

## Configuration Parameters

### Environment Variables

- `source-bucket`: S3 bucket containing raw telemetry data
- `target-bucket`: S3 bucket for processed datasets
- `database-name`: Glue catalog database name

### Job Arguments

- `--job-bookmark-option`: job-bookmark-enable (prevents reprocessing)
- `--enable-metrics`: true
- `--enable-continuous-cloudwatch-log`: true
- `--TempDir`: S3 temporary directory path

## Monitoring and Logging

### CloudWatch Logs

- **Crawler Logs**: `/aws-glue/crawlers`
- **Job Logs**: `/aws-glue/jobs`
- **Step Functions**: State machine execution logs

### Metrics

- Crawler run duration and success rate
- ETL job duration and record counts
- Step Functions execution status

## Error Handling

### Crawler Failures

- State machine fails if crawler enters unexpected state
- Logs provide detailed error information

### ETL Job Failures

- Maximum 1 retry attempt
- Job bookmark prevents data reprocessing
- Detailed error logging to CloudWatch

### State Machine Failures

- 2-hour timeout for complete workflow
- Individual step timeouts and retries
- Execution history for debugging

## Data Access

Processed datasets are available through:

1. **S3 Direct Access**: Via bucket policies for authenticated users
2. **CloudFront CDN**: For public dataset distribution
3. **Lambda Functions**: Via getDataset API endpoint
