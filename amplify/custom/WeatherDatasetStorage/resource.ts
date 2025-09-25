import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface WeatherDatasetStorageProps {
  bucketName?: string;
  enableVersioning?: boolean;
  enablePublicAccess?: boolean;
}

export class WeatherDatasetStorage extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(
    scope: Construct,
    id: string,
    props: WeatherDatasetStorageProps = {}
  ) {
    super(scope, id);

    const {
      bucketName,
      enableVersioning = false,
      enablePublicAccess = false,
    } = props;

    const uniqueBucketName =
      bucketName ||
      `weather-dataset-${cdk.Aws.STACK_NAME.toLowerCase()}-${
        cdk.Aws.ACCOUNT_ID
      }`;
    // Create CDK bucket for weather dataset storage
    this.bucket = new s3.Bucket(this, "WeatherDatasetBucket", {
      bucketName: uniqueBucketName,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: enableVersioning,
      publicReadAccess: enablePublicAccess,
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [
        {
          allowedHeaders: ["*"],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ["*"],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          id: "DeleteIncompleteMultipartUploads",
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
          enabled: true,
        },
        {
          id: "TempDataCleanup",
          prefix: "temp/",
          expiration: cdk.Duration.days(30),
          enabled: true,
        },
      ],
    });

    // Add tags for better resource management
    cdk.Tags.of(this.bucket).add("Purpose", "WeatherDatasetStorage");
    cdk.Tags.of(this.bucket).add("Environment", "Development");
    cdk.Tags.of(this.bucket).add("Project", "WeatherPlatform");
  }
}
