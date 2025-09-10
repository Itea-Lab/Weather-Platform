# AWS Glue Setup for Weather Data Processing

## Overview

AWS Glue provides the data cataloging and ETL capabilities for the Weather Platform. It consists of a Glue Database, Crawler, and ETL Job that work together to process raw IoT telemetry data into structured datasets.

## Components

### 1. Glue Database

- **Name**: `weather_data_catalog_{random_id}`
- **Purpose**: Central catalog for weather telemetry schemas
- **Description**: Database for weather platform telemetry data

### 2. Glue Crawler

- **Name**: WeatherPlatformCrawler
- **Purpose**: Discovers and catalogs raw telemetry data schema
- **Target**: S3 raw telemetry data

### 3. Glue ETL Job

- **Name**: WeatherDataTransformJob
- **Purpose**: Transforms raw data into structured CSV datasets
- **Runtime**: Python 3 with Spark

## Glue Database Configuration

### Database Properties

- **Catalog ID**: AWS Account ID
- **Name**: Generated with random suffix for uniqueness
- **Description**: Database for weather platform telemetry data

### Tables

The crawler automatically creates the `telemetry` table with schema detected from JSON files.

## Glue Crawler Configuration

### Data Source

- **S3 Path**: `s3://{source-bucket}/raw-data/weatherPlatform/telemetry/`
- **Include Patterns**: All files in the telemetry directory
- **Exclude Patterns**:
  - `**/*.tmp` (temporary files)
  - `**/*.gz` (compressed files)
  - `**/_SUCCESS` (Spark success markers)

### Crawler Behavior

- **Recrawl Policy**: CRAWL_NEW_FOLDERS_ONLY
- **Update Behavior**: LOG (logs schema changes)
- **Delete Behavior**: LOG (logs table deletions)
- **Table Prefix**: None (creates table named 'telemetry')

### Schema Detection

The crawler automatically detects schema from JSON files with structure:

```json
{
  "timestamp": "string",
  "location": "string",
  "data": {
    "temperature": "double",
    "humidity": "double",
    "pressure": "double",
    "winddirection": "bigint",
    "avgwindspeed": "double",
    "maxwindspeed": "double",
    "rainfall1hr": "double",
    "rainfall24hr": "double"
  }
}
```

### Output Configuration

- **Database**: References the created Glue database
- **Table Creation**: Merges new columns when schema changes
- **Partitioning**: Inherits from existing table partitions

## Glue ETL Job Configuration

### Job Properties

- **Name**: WeatherDataTransformJob
- **Type**: ETL Job (glueetl)
- **Glue Version**: 4.0
- **Python Version**: 3
- **Worker Type**: G.1X
- **Number of Workers**: 2
- **Max Concurrent Runs**: 1
- **Max Retries**: 1
- **Timeout**: 60 minutes

### Script Location

- **S3 Path**: `s3://{target-bucket}/glue-scripts/weather-transform.py`
- **Language**: Python
- **Framework**: PySpark with AWS Glue libraries

### Job Arguments

- `--job-language`: python
- `--job-bookmark-option`: job-bookmark-enable
- `--enable-metrics`: true
- `--enable-continuous-cloudwatch-log`: true
- `--TempDir`: `s3://{target-bucket}/temp/`
- `--source-bucket`: Source S3 bucket name
- `--target-bucket`: Target S3 bucket name
- `--database-name`: Glue database name

## ETL Transformation Logic

### Data Processing Steps

1. **Read from Catalog**

   ```python
   datasource = glueContext.create_dynamic_frame.from_catalog(
       database=database_name,
       table_name="telemetry"
   )
   ```

2. **Data Flattening**

   ```python
   transformed_df = df.select(
       col("timestamp"),
       col("location"),
       col("data.temperature").alias("temperature"),
       col("data.humidity").alias("humidity"),
       # ... other nested fields
   )
   ```

3. **Data Filtering**

   ```python
   .filter(
       col("timestamp").isNotNull() &
       col("location").isNotNull()
   )
   ```

4. **Location-based Processing**

   ```python
   locations = transformed_df.select("location").distinct().collect()
   for location_row in locations:
       location = location_row["location"]
       location_df = transformed_df.filter(col("location") == location)
   ```

5. **Data Sorting**

   ```python
   location_df = location_df.orderBy("timestamp")
   ```

6. **Output Generation**
   ```python
   output_path = f"s3://{target_bucket}/dataset/{location}/all_data_{current_time}.csv"
   final_df.coalesce(1).write.mode("overwrite").option("header", "true").csv(output_path)
   ```

### Output Schema

```csv
timestamp,location,temperature,humidity,pressure,wind_direction,avg_wind_speed,max_wind_speed,rainfall_1hr,rainfall_24hr
```

### File Organization

- **Path Pattern**: `dataset/{location}/all_data_{YYYYMMDD_HHMMSS}.csv`
- **Single File**: One CSV per location containing all historical data
- **Headers**: Included in each CSV file
- **Partitioning**: By location (district/city)

## IAM Permissions

### Glue Service Role

The ETL job requires comprehensive permissions:

#### S3 Access

```json
{
  "Sid": "AllowS3ReadAccess",
  "Effect": "Allow",
  "Actions": ["s3:GetObject", "s3:ListBucket", "s3:GetBucketLocation"],
  "Resources": [
    "arn:aws:s3:::source-bucket",
    "arn:aws:s3:::source-bucket/*",
    "arn:aws:s3:::target-bucket",
    "arn:aws:s3:::target-bucket/*"
  ]
}
```

#### S3 Write Access

```json
{
  "Sid": "AllowS3WriteAccess",
  "Effect": "Allow",
  "Actions": ["s3:PutObject", "s3:PutObjectAcl", "s3:DeleteObject"],
  "Resources": ["arn:aws:s3:::target-bucket/*"]
}
```

#### Glue Operations

```json
{
  "Sid": "AllowGlueOperations",
  "Effect": "Allow",
  "Actions": [
    "glue:CreateTable",
    "glue:UpdateTable",
    "glue:GetDatabase",
    "glue:GetDatabases",
    "glue:GetTables",
    "glue:GetTable",
    "glue:GetCrawler",
    "glue:StartCrawler",
    "glue:StopCrawler",
    "glue:GetPartition",
    "glue:GetPartitions",
    "glue:CreatePartition",
    "glue:UpdatePartition",
    "glue:DeletePartition"
  ],
  "Resources": [
    "arn:aws:glue:region:account:catalog",
    "arn:aws:glue:region:account:database/database-name",
    "arn:aws:glue:region:account:table/database-name/*",
    "arn:aws:glue:region:account:crawler/WeatherPlatformCrawler"
  ]
}
```

#### CloudWatch Permissions

```json
{
  "Sid": "AllowCloudWatchLogs",
  "Effect": "Allow",
  "Actions": [
    "logs:CreateLogGroup",
    "logs:CreateLogStream",
    "logs:PutLogEvents"
  ],
  "Resources": ["arn:aws:logs:region:account:log-group:/aws-glue/*"]
}
```

## Resource Creation Order

1. **IAM Role**: Created first for Glue services
2. **Database**: Created with unique name
3. **Crawler**: References database and IAM role
4. **ETL Job**: References database, role, and script location

## Monitoring and Logging

### CloudWatch Logs

- **Crawler Logs**: `/aws-glue/crawlers/WeatherPlatformCrawler`
- **Job Logs**: `/aws-glue/jobs/WeatherDataTransformJob`
- **Continuous Logging**: Enabled for real-time monitoring

### CloudWatch Metrics

- **Job Success/Failure Rates**: Track ETL job reliability
- **Data Processing Metrics**: Record counts and processing time
- **Resource Utilization**: Worker usage and performance

### Job Bookmarks

- **Purpose**: Prevents reprocessing of already processed data
- **Configuration**: `job-bookmark-enable`
- **Benefit**: Incremental processing and cost optimization

## Error Handling

### Crawler Errors

- Schema change conflicts logged but don't stop processing
- Missing or corrupted files are skipped
- Detailed error logging to CloudWatch

### ETL Job Errors

- **Max Retries**: 1 automatic retry on failure
- **Error Logging**: Full stack traces to CloudWatch
- **Data Validation**: Null checks prevent corrupt output
- **Exception Handling**: Graceful failure with detailed error messages

### Recovery Procedures

1. Check CloudWatch logs for specific error details
2. Verify S3 source data integrity and accessibility
3. Validate IAM permissions for required services
4. Review Glue job configuration and script logic
5. Test with smaller data subsets if needed

## Performance Optimization

### Crawler Optimization

- **Recrawl Policy**: Only new folders to reduce processing time
- **Exclusion Patterns**: Skip temporary and compressed files
- **Schema Evolution**: Handles new columns gracefully

### ETL Job Optimization

- **Coalesce(1)**: Reduces output to single file per location
- **Worker Configuration**: G.1X workers for memory-intensive operations
- **Partitioning**: Process each location separately for parallel execution
- **Caching**: Reuse dataframes where possible

### Cost Optimization

- **Job Bookmarks**: Prevent duplicate processing
- **Worker Right-sizing**: Balanced memory and compute resources
- **Timeout Settings**: Prevent runaway jobs
- **Schedule Optimization**: Run during off-peak hours

## Integration with Step Functions

The Glue components integrate with Step Functions for orchestrated execution:

1. **EventBridge Trigger**: Starts the workflow daily
2. **Start Crawler**: Step Functions starts the crawler
3. **Monitor Crawler**: Polls crawler status until complete
4. **Start ETL Job**: Launches job once crawler finishes
5. **Monitor Job**: Waits for job completion

This orchestration ensures proper sequencing and error handling across the entire data processing pipeline.
