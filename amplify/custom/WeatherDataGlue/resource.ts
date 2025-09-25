import * as iam from "aws-cdk-lib/aws-iam";
import * as glue from "aws-cdk-lib/aws-glue";
import { Construct } from "constructs";

export interface CustomWeatherDataGlueProps {
  accountId: string;
  region: string;
  // S3 bucket name for the crawler's data source (input)
  sourceBucketName: string;
  // S3 bucket name for processed data output
  targetBucketName: string;
  // Optional database name - if not provided, will generate unique name
  databaseName?: string;
}

export class CustomWeatherDataGlue extends Construct {
  public readonly database: glue.CfnDatabase;
  public readonly crawler: glue.CfnCrawler;
  public readonly job: glue.CfnJob;

  constructor(scope: Construct, id: string, props: CustomWeatherDataGlueProps) {
    super(scope, id);

    const {
      accountId,
      region,
      sourceBucketName,
      targetBucketName,
      databaseName,
    } = props;

    // Create Glue Database with configurable name
    const uniqueSuffix = this.node.addr.substring(0, 8);
    const dbName = databaseName || `weather_data_catalog_${uniqueSuffix}`;

    // Generate unique names for Glue resources
    const crawlerName = `WeatherPlatformCrawler-${uniqueSuffix}`;
    const jobName = `WeatherDataTransformJob-${uniqueSuffix}`;

    this.database = new glue.CfnDatabase(this, "WeatherDataCatalog", {
      catalogId: accountId,
      databaseInput: {
        name: dbName,
        description: "Database for weather platform telemetry data",
      },
    });

    // Create IAM Role for Glue Crawler
    const glueRole = new iam.Role(this, "GlueServiceRole", {
      assumedBy: new iam.ServicePrincipal("glue.amazonaws.com"),
      description: "Role for AWS Glue Crawler and Jobs",
    });

    // Attach permissions for Glue Crawler and Job (S3 access)
    glueRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowS3ReadAccess",
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject", "s3:ListBucket", "s3:GetBucketLocation"],
        resources: [
          `arn:aws:s3:::${sourceBucketName}`,
          `arn:aws:s3:::${sourceBucketName}/*`,
          `arn:aws:s3:::${targetBucketName}`,
          `arn:aws:s3:::${targetBucketName}/*`,
          `arn:aws:s3:::itea-weather-data-lake-storage`, // Access to hardcoded script bucket
          `arn:aws:s3:::itea-weather-data-lake-storage/glue-scripts/*`, // Specific access to glue-scripts folder
        ],
      })
    );

    // Add write permissions for target bucket (processed data output)
    glueRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowS3WriteAccess",
        effect: iam.Effect.ALLOW,
        actions: ["s3:PutObject", "s3:PutObjectAcl", "s3:DeleteObject"],
        resources: [`arn:aws:s3:::${targetBucketName}/*`],
      })
    );

    // Attach comprehensive Glue permissions
    glueRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowGlueOperations",
        effect: iam.Effect.ALLOW,
        actions: [
          "glue:CreateTable",
          "glue:UpdateTable",
          "glue:GetDatabase",
          "glue:GetDatabases",
          "glue:CreateDatabase",
          "glue:GetTables",
          "glue:GetTable",
          "glue:GetCrawler",
          "glue:GetCrawlers",
          "glue:StartCrawler",
          "glue:StopCrawler",
          "glue:GetPartition",
          "glue:GetPartitions",
          "glue:BatchGetPartition",
          "glue:CreatePartition",
          "glue:UpdatePartition",
          "glue:BatchCreatePartition",
          "glue:BatchUpdatePartition",
          "glue:DeletePartition",
          "glue:BatchDeletePartition",
        ],
        resources: [
          `arn:aws:glue:${region}:${accountId}:catalog`,
          `arn:aws:glue:${region}:${accountId}:database/${dbName}`,
          `arn:aws:glue:${region}:${accountId}:table/${dbName}/*`,
          `arn:aws:glue:${region}:${accountId}:crawler/${crawlerName}`,
          `arn:aws:glue:${region}:${accountId}:partition/${dbName}/*/*`,
        ],
      })
    );

    // CloudWatch Logs permissions
    glueRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowCloudWatchLogs",
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [
          `arn:aws:logs:${region}:${accountId}:log-group:/aws-glue/*`,
        ],
      })
    );

    // CloudWatch metrics permissions
    glueRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowCloudWatchMetrics",
        effect: iam.Effect.ALLOW,
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
      })
    );

    // Add permissions for Glue job operations
    glueRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AllowGlueJobOperations",
        effect: iam.Effect.ALLOW,
        actions: [
          "glue:StartJobRun",
          "glue:GetJobRun",
          "glue:GetJobRuns",
          "glue:BatchStopJobRun",
        ],
        resources: [`arn:aws:glue:${region}:${accountId}:job/${jobName}`],
      })
    );

    // Create Glue Crawler
    this.crawler = new glue.CfnCrawler(this, "WeatherPlatformCrawler", {
      name: crawlerName,
      role: glueRole.roleArn,
      databaseName: this.database.ref,
      targets: {
        s3Targets: [
          {
            path: `s3://${sourceBucketName}/raw-data/weatherPlatform/telemetry/`,
            exclusions: ["**/*.tmp", "**/*.gz", "**/_SUCCESS"],
          },
        ],
      },
      schemaChangePolicy: {
        updateBehavior: "LOG",
        deleteBehavior: "LOG",
      },
      configuration: JSON.stringify({
        Version: 1.0,
        CrawlerOutput: {
          Partitions: { AddOrUpdateBehavior: "InheritFromTable" },
          Tables: { AddOrUpdateBehavior: "MergeNewColumns" },
        },
      }),
      recrawlPolicy: {
        recrawlBehavior: "CRAWL_NEW_FOLDERS_ONLY",
      },
      tablePrefix: "", // Creates table named 'telemetry'
    });

    // Create Glue Job for data transformation
    this.job = new glue.CfnJob(this, "WeatherDataTransformJob", {
      name: jobName,
      role: glueRole.roleArn,
      command: {
        name: "glueetl",
        scriptLocation: `s3://itea-weather-data-lake-storage/glue-scripts/weather-transform.py`,
        pythonVersion: "3",
      },
      defaultArguments: {
        "--job-language": "python",
        "--job-bookmark-option": "job-bookmark-enable",
        "--enable-metrics": "true",
        "--enable-continuous-cloudwatch-log": "true",
        "--TempDir": `s3://${targetBucketName}/temp/`,
        "--source-bucket": sourceBucketName,
        "--target-bucket": targetBucketName,
        "--database-name": dbName,
      },
      executionProperty: {
        maxConcurrentRuns: 1,
      },
      maxRetries: 1,
      timeout: 60, // 60 minutes
      glueVersion: "4.0",
      numberOfWorkers: 2,
      workerType: "G.1X",
    });
  }
}
