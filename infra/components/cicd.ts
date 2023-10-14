import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { TerraformStack } from "cdktf";
import { Construct } from "constructs";
import { APP, AWS_ACCOUNT, DEFAULT_REGION } from "./const";
import { IamOpenidConnectProvider } from "@cdktf/provider-aws/lib/iam-openid-connect-provider";
import { DataAwsIamPolicyDocument } from "@cdktf/provider-aws/lib/data-aws-iam-policy-document";
import { IamPolicy } from "@cdktf/provider-aws/lib/iam-policy";
import { IamRole } from "@cdktf/provider-aws/lib/iam-role";

export interface CicdStackProps {
  bucketName: string;
  distributionId: string;
}

export class CicdStack extends TerraformStack {
  constructor(scope: Construct, id: string, props: CicdStackProps) {
    super(scope, id);

    new AwsProvider(this, "aws", {
      region: DEFAULT_REGION,
    });

    const provider = new IamOpenidConnectProvider(this, "oidc-gh-provider", {
      url: "https://token.actions.githubusercontent.com",
      clientIdList: ["sts.amazonaws.com"],
      thumbprintList: [
        "6938fd4d98bab03faadb97b34396831e3780aea1",
        "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
      ],
    });

    const assumeRolePolicyDocument = new DataAwsIamPolicyDocument(
      this,
      "policy_cicd-deploy-assume-role",
      {
        statement: [
          {
            actions: ["sts:AssumeRoleWithWebIdentity"],
            condition: [
              {
                test: "ForAllValues:StringEquals",
                values: ["https://token.actions.githubusercontent.com"],
                variable: "token.actions.githubusercontent.com:iss",
              },
              {
                test: "ForAllValues:StringEquals",
                values: ["sts.amazonaws.com"],
                variable: "token.actions.githubusercontent.com:aud",
              },
              {
                test: "ForAllValues:StringLike",
                values: [
                  "repo:ntrp/home:ref:refs/heads/*",
                  "repo:ntrp/home:pull_request",
                ],
                variable: "token.actions.githubusercontent.com:sub",
              },
            ],
            principals: [
              {
                identifiers: [provider.arn],
                type: "Federated",
              },
            ],
          },
        ],
      },
    );

    const cicdDeployFePolicy = new IamPolicy(this, "policy_cicd-deploy", {
      description:
        "Permissions for authorized GitHub Actions running deployments",
      name: `${APP}-cicd-deploy`,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Action: ["s3:GetBucketVersioning", "s3:ListBucket"],
            Resource: [`arn:aws:s3:::${props.bucketName}`],
            Effect: "Allow",
          },
          {
            Action: ["s3:PutObject", "s3:DeleteObject"],
            Resource: [`arn:aws:s3:::${props.bucketName}/*`],
            Effect: "Allow",
          },
          {
            Action: ["cloudfront:CreateInvalidation"],
            Resource: [
              `arn:aws:cloudfront::${AWS_ACCOUNT}:distribution/${props.distributionId}`,
            ],
            Effect: "Allow",
          },
        ],
      }),
      tags: {
        Name: `${APP}-cicd-deploy`,
      },
    });

    new IamRole(this, "role_cicd-deploy", {
      assumeRolePolicy: assumeRolePolicyDocument.json,
      description: "Allows authorized Github Actions to deploy",
      managedPolicyArns: [
        "arn:aws:iam::aws:policy/ReadOnlyAccess",
        cicdDeployFePolicy.arn,
      ],
      name: `${APP}-cicd-deploy`,
      tags: {
        Name: `${APP}-cicd-deploy`,
      },
    });
  }
}
