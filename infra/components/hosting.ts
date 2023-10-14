import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { AssetType, Fn, TerraformAsset, TerraformStack } from "cdktf";
import { Construct } from "constructs";
import { APP, AWS_ACCOUNT, DEFAULT_REGION, PREFIX } from "./const";
import { SecureBucket } from "../utils/secure-bucket";
import path = require("path");
import { CloudfrontFunction } from "@cdktf/provider-aws/lib/cloudfront-function";
import { CloudfrontDistribution } from "@cdktf/provider-aws/lib/cloudfront-distribution";
import { frontendCacheBehaviour, frontendOrigin } from "./configs/web";
import { S3BucketPolicy } from "@cdktf/provider-aws/lib/s3-bucket-policy";

export interface HostingStackProps {
  env: string;
}

export class HostingStack extends TerraformStack {
  bucketName: string;
  distributionId: string;

  constructor(scope: Construct, id: string, props: HostingStackProps) {
    super(scope, id);

    new AwsProvider(this, "aws", {
      region: DEFAULT_REGION,
      allowedAccountIds: [AWS_ACCOUNT],
    });

    const awsUsEast = new AwsProvider(this, "AWS", {
      region: "us-east-1",
      alias: "us-east-1",
      allowedAccountIds: [AWS_ACCOUNT],
    });

    const bucket = new SecureBucket(this, "origin", {
      bucketName: `${PREFIX}-${APP}-${props.env}-origin`,
    });

    const authAssett = new TerraformAsset(this, "function-path-rewrite-asset", {
      path: path.resolve(__dirname, "cf-function/path.js"),
      type: AssetType.FILE,
    });

    const authFunction = new CloudfrontFunction(this, "path-rewrite", {
      provider: awsUsEast,
      name: `${APP}-${props.env}-path-rewrite`,
      runtime: "cloudfront-js-1.0",
      code: Fn.file(authAssett.path),
      publish: true,
    });

    const cf = new CloudfrontDistribution(this, "home", {
      enabled: true,
      isIpv6Enabled: true,
      httpVersion: "http2and3",
      comment: "Home Portal",
      defaultRootObject: "index.html",
      // aliases: [
      //   `${env.portal.domain}.${env.portal.zone.name}`,
      //   ...env.portal.aliases,
      // ],
      // priceClass: 'PriceClass_100',
      // viewerCertificate: {
      //   acmCertificateArn: cert.arnOutput,
      //   minimumProtocolVersion: 'TLSv1.2_2021',
      //   sslSupportMethod: 'sni-only',
      // },
      viewerCertificate: {
        cloudfrontDefaultCertificate: true,
      },
      restrictions: {
        geoRestriction: {
          restrictionType: "none",
        },
      },
      origin: [frontendOrigin(this, props.env, bucket.domainName)],
      defaultCacheBehavior: {
        ...frontendCacheBehaviour(this, props.env),
        functionAssociation: [
          {
            eventType: "viewer-request",
            functionArn: authFunction.arn,
          },
        ],
      },
    });

    new S3BucketPolicy(this, "cf-access", {
      bucket: bucket.name,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: {
          Sid: "AllowCloudFrontServicePrincipalReadOnly",
          Effect: "Allow",
          Principal: {
            Service: "cloudfront.amazonaws.com",
          },
          Action: "s3:GetObject",
          Resource: `arn:aws:s3:::${bucket.name}/*`,
          Condition: {
            StringEquals: {
              "AWS:SourceArn": cf.arn,
            },
          },
        },
      }),
    });

    this.bucketName = bucket.name;
    this.distributionId = cf.id;
  }
}
