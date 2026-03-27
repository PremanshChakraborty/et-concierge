#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { RetailAiStack } from "../lib/retail-ai-stack";

const app = new cdk.App();

new RetailAiStack(app, "RetailAiStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region:  process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
});
