# AWS Data Infrastructure Setup Guide

## Finalized Schema (with your changes)

### DynamoDB — `StoreInventory`
| Field | Type | Notes |
|---|---|---|
| `productId` | String | **Partition Key** |
| `storeId` | String | **Sort Key** |
| `sizeStock` | Map | `{ "XS": 0, "S": 3, "M": 5, "L": 2, "XL": 0 }` — exact counts |
| `aisleName` | String | Just the name e.g. `"Aisle 4"` — directions live in Stores table |
| `rack` | String | e.g. `"Rack B"` |
| `lastUpdated` | String | ISO timestamp |
| **GSI** | `storeId` (PK) + `productId` (SK) | Named `storeId-productId-index` |

### DynamoDB — `Stores`
| Field | Type | Notes |
|---|---|---|
| `storeId` | String | **Partition Key** |
| `name` | String | e.g. `"Zara - Select Citywalk"` |
| `address` | String | Full address |
| `city` | String | |
| `coordinates` | Map | `{ "lat": 28.52, "lng": 77.21 }` |
| `hours` | Map | `{ "Mon": "10:00-22:00", ... }` |
| `phone` | String | |
| `aisleMap` | Map | `{ "Aisle 1": "Turn left after main entrance, first row", "Aisle 4": "Walk straight past cashier, third section on right" }` |

### S3 — `retail-ai-product-catalog`
```
retail-ai-product-catalog/
└── catalog/
    └── products.json     ← Array of product objects
```

---

## Step 1 — Create an IAM User for Development

> **Why:** You should never use root credentials for programmatic access. This user will be used by your local machine and CDK deployments.

1. Go to **IAM Console** → **Users** → **Create user**
2. Username: `retail-ai-dev`
3. Check **"Provide user access to the AWS Management Console"** → **No** (we only need programmatic access)
4. Click **Next** → Select **"Attach policies directly"**
5. Attach these managed policies:
   - `AmazonDynamoDBFullAccess`
   - `AmazonS3FullAccess`
   - `AWSLambda_FullAccess`
   - `AmazonAPIGatewayAdministrator`
   - `AmazonCognitoPowerUser`
   - `AmazonBedrockFullAccess`
   - `IAMFullAccess` *(needed for CDK to create roles)*
   - `CloudFormationFullAccess` *(needed for CDK)*
6. Click **Create user**
7. Click into the user → **Security credentials** tab → **Create access key**
8. Use case: **Local code** → Next → Create
9. **Download the CSV immediately** — you won't see the secret again

---

## Step 2 — Create a Lambda Execution Role

> **Why:** Lambda functions need a role to assume at runtime to access DynamoDB, S3, Bedrock etc.

1. Go to **IAM Console** → **Roles** → **Create role**
2. Trusted entity: **AWS Service** → Use case: **Lambda** → Next
3. Attach these policies:
   - `AmazonDynamoDBFullAccess`
   - `AmazonS3ReadOnlyAccess`
   - `AmazonBedrockFullAccess`
   - `CloudWatchLogsFullAccess`
4. Role name: `retail-ai-lambda-execution-role`
5. Click **Create role**
6. **Copy the Role ARN** — you'll need it when creating Lambda functions

---

## Step 3 — Create DynamoDB Table: `StoreInventory`

1. Go to **DynamoDB Console** → **Tables** → **Create table**
2. Table name: `StoreInventory`
3. Partition key: `productId` → Type: **String**
4. Sort key: `storeId` → Type: **String**
5. Table settings: **Customize settings**
6. Capacity mode: **On-demand** *(stays within free tier, no capacity planning)*
7. Click **Create table** and wait for status to go **Active**

**Add the GSI:**
8. Click into the `StoreInventory` table → **Indexes** tab → **Create index**
9. Partition key: `storeId` → Type: **String**
10. Sort key: `productId` → Type: **String**
11. Index name: `storeId-productId-index`
12. Projected attributes: **All**
13. Click **Create index** and wait for status **Active**

---

## Step 4 — Create DynamoDB Table: `Stores`

1. Go to **DynamoDB Console** → **Tables** → **Create table**
2. Table name: `Stores`
3. Partition key: `storeId` → Type: **String**
4. Sort key: *(leave empty)*
5. Table settings: **Customize settings**
6. Capacity mode: **On-demand**
7. Click **Create table** and wait for **Active**

---

## Step 5 — Create S3 Bucket for Product Catalog

1. Go to **S3 Console** → **Create bucket**
2. Bucket name: `retail-ai-product-catalog-[your-initials]` *(must be globally unique)*
3. Region: **same region as your DynamoDB tables** (e.g. `ap-south-1` for Mumbai)
4. Block all public access: **ON** (default, keep it)
5. Versioning: **Enable** *(lets you roll back bad catalog updates)*
6. Click **Create bucket**
7. Inside the bucket → **Create folder** → name it `catalog`

---

## What's Next

Once all of the above is confirmed:
- Generate `products.json` (the mock product catalog)
- Seed mock data into `StoreInventory` and `Stores` tables
- Upload `products.json` to `s3://retail-ai-product-catalog-[initials]/catalog/`
