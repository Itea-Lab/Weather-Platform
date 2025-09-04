import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { Duration } from "aws-cdk-lib";

export interface CustomGetDatasetProps {
  storageBucketArn: string;
  storageBucketName: string;
  cloudFrontDomainName: string;
  authenticatedUserIamRole: iam.IRole;
}

export class CustomGetDataset extends Construct {
  public readonly function: lambda.Function;

  constructor(scope: Construct, id: string, props: CustomGetDatasetProps) {
    super(scope, id);

    // Create the Lambda function
    this.function = new lambda.Function(this, "GetDatasetFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("amplify/functions/getDataset"),
      timeout: Duration.seconds(60),
      memorySize: 256,
      environment: {
        STORAGE_BUCKET_NAME: props.storageBucketName,
        CLOUDFRONT_DOMAIN: props.cloudFrontDomainName,
      },
    });

    // Add S3 permissions to the Lambda function
    const getDatasetS3PolicyStatement = new iam.PolicyStatement({
      sid: "AllowS3ReadDatasets",
      actions: ["s3:GetObject", "s3:ListBucket", "s3:ListObjectsV2"],
      resources: [props.storageBucketArn, `${props.storageBucketArn}/*`],
    });

    this.function.addToRolePolicy(getDatasetS3PolicyStatement);

    // Add STS permissions
    const stsPolicyStatement = new iam.PolicyStatement({
      sid: "AllowSTSAccess",
      actions: ["sts:GetCallerIdentity"],
      resources: ["*"],
    });

    this.function.addToRolePolicy(stsPolicyStatement);

    // Grant authenticated users permission to invoke this function
    props.authenticatedUserIamRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        sid: "AllowGetDatasetLambdaInvoke",
        effect: iam.Effect.ALLOW,
        actions: ["lambda:InvokeFunction"],
        resources: [this.function.functionArn],
      })
    );
  }
}
