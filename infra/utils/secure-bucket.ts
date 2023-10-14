import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";
import { S3BucketCorsConfiguration, S3BucketCorsConfigurationCorsRule } from "@cdktf/provider-aws/lib/s3-bucket-cors-configuration";
import { S3BucketLifecycleConfiguration } from "@cdktf/provider-aws/lib/s3-bucket-lifecycle-configuration";
import { S3BucketOwnershipControls } from "@cdktf/provider-aws/lib/s3-bucket-ownership-controls";
import { S3BucketPublicAccessBlock } from "@cdktf/provider-aws/lib/s3-bucket-public-access-block";
import { S3BucketServerSideEncryptionConfigurationA } from "@cdktf/provider-aws/lib/s3-bucket-server-side-encryption-configuration";
import { S3BucketVersioningA } from "@cdktf/provider-aws/lib/s3-bucket-versioning";
import { Construct } from "constructs";

export interface SecureBucketProps {
  bucketName: string;
  corsConfig?: S3BucketCorsConfigurationCorsRule;
  objectOwnership?: "BucketOwnerEnforced" | "BucketOwnerPreferred";
}

export class SecureBucket extends Construct {
  public id: string;
  public arn: string;
  public name: string;
  public domainName: string;

  constructor(scope: Construct, id: string, props: SecureBucketProps) {
    super(scope, id);

    const secureBucket = new S3Bucket(this, props.bucketName, {
      bucket: props.bucketName,
    });

    new S3BucketPublicAccessBlock(this, "bucket-public-access-lock", {
      bucket: secureBucket.id,
      blockPublicAcls: true,
      blockPublicPolicy: true,
      ignorePublicAcls: true,
      restrictPublicBuckets: true,
    });

    if (props.corsConfig) {
      new S3BucketCorsConfiguration(this, "bucket-cors-config", {
        bucket: secureBucket.bucket,
        corsRule: [props.corsConfig],
      });
    }

    new S3BucketOwnershipControls(this, "bucket-disable-acl", {
      bucket: secureBucket.id,
      rule: {
        objectOwnership: props.objectOwnership ?? "BucketOwnerEnforced",
      },
    });

    new S3BucketServerSideEncryptionConfigurationA(this, "bucket-encryption", {
      bucket: secureBucket.id,
      rule: [
        {
          applyServerSideEncryptionByDefault: {
            sseAlgorithm: "AES256",
          },
        },
      ],
    });

    new S3BucketVersioningA(this, "bucket-versioning", {
      bucket: secureBucket.id,
      versioningConfiguration: {
        status: "Enabled",
      },
    });

    new S3BucketLifecycleConfiguration(this, "remove-old-states", {
      bucket: secureBucket.id,
      rule: [
        {
          id: "remove-old",
          status: "Enabled",
          noncurrentVersionExpiration: {
            noncurrentDays: 10,
          },
        },
      ],
    });

    this.id = secureBucket.id;
    this.arn = secureBucket.arn;
    this.name = secureBucket.bucket;
    this.domainName = secureBucket.bucketRegionalDomainName;
  }
}
