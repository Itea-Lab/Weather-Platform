import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { CfnOutput, Stack } from "aws-cdk-lib";

export interface CustomCloudFrontProps {
  storageBucketName: string;
  storageBucketDomainName: string;
}

export class CustomCloudFront extends Construct {
  public readonly distribution: cloudfront.CfnDistribution;
  public readonly domainName: string;
  public readonly distributionId: string;

  constructor(scope: Construct, id: string, props: CustomCloudFrontProps) {
    super(scope, id);

    const stack = Stack.of(this);

    // Create Origin Access Control
    const originAccessControl = new cloudfront.CfnOriginAccessControl(
      this,
      "OriginAccessControl",
      {
        originAccessControlConfig: {
          name: `${id}-weather-dataset-oac`,
          originAccessControlOriginType: "s3",
          signingBehavior: "always",
          signingProtocol: "sigv4",
          description: "Origin Access Control for Weather Dataset S3 Bucket",
        },
      }
    );

    // Create Cache Policy
    const cachePolicy = new cloudfront.CfnCachePolicy(
      this,
      "WeatherDatasetCachePolicy",
      {
        cachePolicyConfig: {
          name: `${id}-weather-dataset-cache`,
          comment: "Optimized cache policy for weather dataset files",
          defaultTtl: 86400, // 1 day
          maxTtl: 2592000, // 30 days
          minTtl: 3600, // 1 hour
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

    // Create CloudFront Distribution
    this.distribution = new cloudfront.CfnDistribution(
      this,
      "WeatherDatasetCDNDistribution",
      {
        distributionConfig: {
          comment:
            "Weather Dataset CDN Distribution - Supports dynamic district paths",
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
            value: "weather-dataset-cdn",
          },
          {
            key: "fcj_workshop1",
            value: "FCJ Workshop 1",
          },
        ],
      }
    );

    // Create S3 Bucket Policy (mirrors cloudformation-template.json)
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
            Resource: `arn:aws:s3:::${props.storageBucketName}/*`,
            Condition: {
              StringEquals: {
                "AWS:SourceArn": `arn:aws:cloudfront::${stack.account}:distribution/${this.distribution.ref}`,
              },
            },
          },
          {
            Sid: "AllowAccountListBucketForPrefixes",
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:ListBucket"],
            Resource: `arn:aws:s3:::${props.storageBucketName}`,
            Condition: {
              StringLike: {
                "aws:PrincipalArn": `arn:aws:iam::${stack.account}:*`,
                "s3:prefix": ["dataset/*", "glue-scripts/*"],
              },
            },
          },
          {
            Sid: "AllowAccountGetObjectForDatasetAndGlueScripts",
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject"],
            Resource: [
              `arn:aws:s3:::${props.storageBucketName}/dataset/*`,
              `arn:aws:s3:::${props.storageBucketName}/glue-scripts/*`,
            ],
            Condition: {
              StringLike: {
                "aws:PrincipalArn": `arn:aws:iam::${stack.account}:*`,
              },
            },
          },
          {
            Sid: "DenyExternalGetObjectExceptCloudFront",
            Effect: "Deny",
            Principal: "*",
            Action: "s3:GetObject",
            Resource: `arn:aws:s3:::${props.storageBucketName}/*`,
            Condition: {
              StringNotEquals: {
                "AWS:SourceArn": `arn:aws:cloudfront::${stack.account}:distribution/${this.distribution.ref}`,
              },
              StringNotLike: {
                "aws:PrincipalArn": `arn:aws:iam::${stack.account}:*`,
              },
            },
          },
        ],
      },
    });

    // Set the public properties
    this.domainName = this.distribution.attrDomainName;
    this.distributionId = this.distribution.ref;

    // Create outputs
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
