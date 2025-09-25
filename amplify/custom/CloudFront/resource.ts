import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { CfnOutput, Stack, Aws } from "aws-cdk-lib";

export interface CustomCloudFrontProps {
  storageBucketName: string;
  storageBucketDomainName: string;
  // Optional: Pass the bucket reference for direct access
  storageBucket?: s3.IBucket;
}

export class CustomCloudFront extends Construct {
  public readonly distribution: cloudfront.CfnDistribution;
  public readonly domainName: string;
  public readonly distributionId: string;

  constructor(scope: Construct, id: string, props: CustomCloudFrontProps) {
    super(scope, id);

    const stack = Stack.of(this);
    const stackName = stack.stackName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const accountId = Aws.ACCOUNT_ID;

    // Create CloudFront-safe unique suffix (only alphanumeric, dashes, underscores)
    const timestamp = Date.now().toString();
    const uniqueSuffix = `${stackName}-${accountId.slice(
      -8
    )}-${timestamp}`.replace(/[^a-zA-Z0-9-_]/g, "-");

    // Create Origin Access Control with unique name
    const originAccessControl = new cloudfront.CfnOriginAccessControl(
      this,
      "OriginAccessControl",
      {
        originAccessControlConfig: {
          name: `weather-oac-${uniqueSuffix}`.slice(0, 64), // CloudFront OAC names have 64 char limit
          originAccessControlOriginType: "s3",
          signingBehavior: "always",
          signingProtocol: "sigv4",
          description: "Origin Access Control for Weather Dataset S3 Bucket",
        },
      }
    );

    // Create Cache Policy with unique name
    const cachePolicy = new cloudfront.CfnCachePolicy(
      this,
      "WeatherDatasetCachePolicy",
      {
        cachePolicyConfig: {
          name: `weather-cache-${uniqueSuffix}`.slice(0, 128), // CloudFront cache policy names have 128 char limit
          comment: "Optimized cache policy for weather dataset files",
          defaultTtl: 86400,
          maxTtl: 2592000,
          minTtl: 3600,
          parametersInCacheKeyAndForwardedToOrigin: {
            enableAcceptEncodingGzip: true,
            enableAcceptEncodingBrotli: true,
            queryStringsConfig: {
              queryStringBehavior: "all",
            },
            headersConfig: {
              headerBehavior: "whitelist",
              headers: [
                "Access-Control-Request-Headers",
                "Access-Control-Request-Method",
                "Origin",
              ],
            },
            cookiesConfig: {
              cookieBehavior: "none",
            },
          },
        },
      }
    );

    // Create CloudFront Distribution with unique comment
    this.distribution = new cloudfront.CfnDistribution(
      this,
      "WeatherDatasetCDNDistribution",
      {
        distributionConfig: {
          comment: `Weather Dataset CDN Distribution - ${uniqueSuffix}`, // ✅ Template literal (this is OK for comment)
          enabled: true,
          httpVersion: "http2and3",
          priceClass: "PriceClass_200",
          defaultCacheBehavior: {
            targetOriginId: "weather-dataset-s3-origin",
            viewerProtocolPolicy: "https-only",
            allowedMethods: ["GET", "HEAD", "OPTIONS"],
            cachedMethods: ["GET", "HEAD", "OPTIONS"],
            compress: true,
            cachePolicyId: cachePolicy.ref,
            originRequestPolicyId: "88a5eaf4-2fd4-4709-b370-b4c650ea3fcf",
            responseHeadersPolicyId: "5cc3b908-e619-4b99-88e5-2cf7f45965bd",
          },
          origins: [
            {
              id: "weather-dataset-s3-origin",
              domainName: props.storageBucketDomainName,
              s3OriginConfig: {
                originAccessIdentity: "",
              },
              originAccessControlId: originAccessControl.ref,
            },
          ],
          viewerCertificate: {
            cloudFrontDefaultCertificate: true,
          },
        },
        tags: [
          {
            key: "Name",
            value: `weather-dataset-cdn-${uniqueSuffix}`,
          },
          {
            key: "Environment",
            value: stackName.includes("sandbox") ? "Sandbox" : "Production",
          },
          {
            key: "Project",
            value: "WeatherPlatform",
          },
        ],
      }
    );

    // Grant CloudFront access to the bucket using Origin Access Control
    if (props.storageBucket) {
      // Use CDK bucket methods to grant access
      props.storageBucket.grantRead(
        new iam.ServicePrincipal("cloudfront.amazonaws.com"),
        "dataset/*"
      );

      // Add additional statement for CloudFront distribution specific access
      props.storageBucket.addToResourcePolicy(
        new iam.PolicyStatement({
          sid: "AllowCloudFrontOAC",
          effect: iam.Effect.ALLOW,
          principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
          actions: ["s3:GetObject"],
          resources: [`${props.storageBucket.bucketArn}/dataset/*`],
          conditions: {
            StringEquals: {
              "AWS:SourceArn": `arn:aws:cloudfront::${stack.account}:distribution/${this.distribution.ref}`,
            },
          },
        })
      );
    } else {
      // Fallback: Create bucket policy for cases where bucket reference is not available
      const bucketPolicy = new s3.CfnBucketPolicy(this, "S3BucketPolicy", {
        bucket: props.storageBucketName,
        policyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Sid: "AllowCloudFrontGetObject",
              Effect: "Allow",
              Principal: { Service: "cloudfront.amazonaws.com" },
              Action: "s3:GetObject",
              Resource: `arn:aws:s3:::${props.storageBucketName}/dataset/*`,
              Condition: {
                StringEquals: {
                  "AWS:SourceArn": `arn:aws:cloudfront::${stack.account}:distribution/${this.distribution.ref}`,
                },
              },
            },
          ],
        },
      });
    }

    // Set the public properties
    this.domainName = this.distribution.attrDomainName;
    this.distributionId = this.distribution.ref;

    new CfnOutput(this, "CloudFrontDistributionId", {
      description: "Weather Dataset CloudFront Distribution ID",
      value: this.distribution.ref,
    });

    new CfnOutput(this, "CloudFrontDomainName", {
      description: "Weather Dataset CloudFront Distribution Domain Name",
      value: this.distribution.attrDomainName,
    });
  }
}
