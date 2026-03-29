import * as cdk        from "aws-cdk-lib";
import * as cognito    from "aws-cdk-lib/aws-cognito";
import * as dynamodb   from "aws-cdk-lib/aws-dynamodb";
import * as iam        from "aws-cdk-lib/aws-iam";
import * as lambda     from "aws-cdk-lib/aws-lambda";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct }   from "constructs";
import * as path       from "path";

export class RetailAiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── 1. Cognito User Pool ───────────────────────────────────────────────
    const userPool = new cognito.UserPool(this, "RetailAiUserPool", {
      userPoolName:           "et-concierge-user-pool",
      selfSignUpEnabled:      true,
      signInAliases:          { email: true },
      autoVerify:             { email: true },
      passwordPolicy: {
        minLength:        8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits:    true,
        requireSymbols:   false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy:   cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = new cognito.UserPoolClient(this, "RetailAiWebClient", {
      userPool,
      userPoolClientName:    "et-concierge-web-client",
      authFlows: {
        userSrp:             true,
        userPassword:        false,
      },
      generateSecret:        false,
      accessTokenValidity:   cdk.Duration.hours(12),
      refreshTokenValidity:  cdk.Duration.days(30),
      idTokenValidity:       cdk.Duration.hours(12),
    });

    // ── 2. DynamoDB Session table ──────────────────────────────────────────
    const sessionTable = new dynamodb.Table(this, "SessionTable", {
      tableName:    "Session",
      partitionKey: { name: "sessionId", type: dynamodb.AttributeType.STRING },
      billingMode:  dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI: query sessions by userId
    sessionTable.addGlobalSecondaryIndex({
      indexName:        "userId-lastUpdated-index-v2",
      partitionKey:     { name: "userId",      type: dynamodb.AttributeType.STRING },
      sortKey:          { name: "lastUpdated", type: dynamodb.AttributeType.STRING },
      projectionType:   dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ["currentMode", "sessionName"],
    });

    // ── 3. DynamoDB UserProfile table ─────────────────────────────────────
    const userProfileTable = new dynamodb.Table(this, "UserProfileTable", {
      tableName:    "UserProfile",
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      billingMode:  dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ── 4. Pinecone API key from Secrets Manager ──────────────────────────
    const pineconeSecret = secretsmanager.Secret.fromSecretNameV2(
      this, "PineconeSecret", "retail-ai/pinecone-api-key"
    );

    // ── 5. Orchestrator Lambda ────────────────────────────────────────────
    const orchestratorFn = new lambda.Function(this, "OrchestratorFn", {
      functionName: "et-concierge-orchestrator",
      runtime:      lambda.Runtime.NODEJS_20_X,
      handler:      "handler.handler",
      code:         lambda.Code.fromAsset(
        path.join(__dirname, "../../orchestrator/dist")
      ),
      timeout:       cdk.Duration.seconds(120),
      memorySize:    512,
      environment: {
        BEDROCK_REGION:          this.region,
        SESSION_TABLE:           sessionTable.tableName,
        PINECONE_SERVICES_INDEX: "et-services",
        PINECONE_NEWS_INDEX:     "et-news",
        COGNITO_USER_POOL_ID:    userPool.userPoolId,
        COGNITO_CLIENT_ID:       userPoolClient.userPoolClientId,
        PINECONE_API_KEY:        pineconeSecret.secretValue.unsafeUnwrap(),
        GOOGLE_API_KEY:          process.env.GOOGLE_API_KEY ?? "",
        PROFILES_TABLE:          userProfileTable.tableName,
      },
    });

    // ── 6. Profile API Lambda ─────────────────────────────────────────────
    const profileApiFn = new lambda.Function(this, "ProfileApiFn", {
      functionName: "et-concierge-profile-api",
      runtime:      lambda.Runtime.NODEJS_20_X,
      handler:      "handler.handler",
      code:         lambda.Code.fromAsset(
        path.join(__dirname, "../../profile-api/dist")
      ),
      timeout:       cdk.Duration.seconds(15),
      memorySize:    256,
      environment: {
        SESSION_TABLE:        sessionTable.tableName,
        USER_PROFILE_TABLE:   userProfileTable.tableName,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID:    userPoolClient.userPoolClientId,
      },
    });

    // ── 7. IAM permissions ────────────────────────────────────────────────

    // Orchestrator
    sessionTable.grantReadWriteData(orchestratorFn);
    userProfileTable.grantReadWriteData(orchestratorFn);
    orchestratorFn.addToRolePolicy(new iam.PolicyStatement({
      actions:   ["bedrock:InvokeModel"],
      resources: [
        `arn:aws:bedrock:*::foundation-model/*`,
        `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/*`,
      ],
    }));

    // Profile API
    sessionTable.grantReadData(profileApiFn);
    userProfileTable.grantReadWriteData(profileApiFn);

    // ── 8. Lambda Function URLs ───────────────────────────────────────────
    const fnUrl = orchestratorFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ["*"],
        allowedMethods: [lambda.HttpMethod.POST],
        allowedHeaders: ["Content-Type", "Authorization"],
        maxAge:         cdk.Duration.minutes(5),
      },
    });

    const profileApiUrl = profileApiFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ["*"],
        allowedMethods: [
          lambda.HttpMethod.GET,
          lambda.HttpMethod.POST,
          lambda.HttpMethod.DELETE,
          lambda.HttpMethod.PUT,
        ],
        allowedHeaders: ["Content-Type", "Authorization"],
        maxAge:         cdk.Duration.minutes(5),
      },
    });

    // ── 9. Stack Outputs ─────────────────────────────────────────────────
    new cdk.CfnOutput(this, "OrchestratorUrl", {
      value:       fnUrl.url,
      description: "ET Concierge Orchestrator Lambda Function URL",
    });
    new cdk.CfnOutput(this, "ProfileApiUrl", {
      value:       profileApiUrl.url,
      description: "ET Concierge Profile API Function URL",
    });
    new cdk.CfnOutput(this, "UserPoolId", {
      value:       userPool.userPoolId,
      description: "Cognito User Pool ID",
    });
    new cdk.CfnOutput(this, "UserPoolClientId", {
      value:       userPoolClient.userPoolClientId,
      description: "Cognito App Client ID",
    });
  }
}
