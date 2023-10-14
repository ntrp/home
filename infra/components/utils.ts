import { Construct } from "constructs";
import { APP, STATE_BUCKET, STATE_BUCKET_REGION, STATE_TABLE } from "./const";
import { S3Backend } from "cdktf";

export const initBackend = (scope: Construct, env: string) =>
  new S3Backend(scope, {
    bucket: STATE_BUCKET,
    dynamodbTable: STATE_TABLE,
    region: STATE_BUCKET_REGION,
    key: `${APP}/${env}`,
    encrypt: true
  })
