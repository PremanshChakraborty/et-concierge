/**
 * scripts/seed-stores.ts
 *
 * Populates the DynamoDB Stores table with sample store records.
 * Run after deploying the CDK stack:
 *   npx ts-node scripts/seed-stores.ts
 *
 * Uses credentials from your AWS CLI profile.
 */

import { DynamoDBClient }             from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const db     = DynamoDBDocumentClient.from(client);

const STORES = [
  {
    storeId:  "STR-001",
    name:     "Retail AI — Royal Citywalk",
    address:  "District Centre, Saket, New Delhi 110017",
    phone:    "+91 11 4055 0000",
    hours: {
      Mon: "10:00 AM – 10:00 PM",
      Tue: "10:00 AM – 10:00 PM",
      Wed: "10:00 AM – 10:00 PM",
      Thu: "10:00 AM – 10:00 PM",
      Fri: "10:00 AM – 11:00 PM",
      Sat: "10:00 AM – 11:00 PM",
      Sun: "11:00 AM – 9:00 PM",
    },
    aisleMap: {
      "A1": "Tops & T-Shirts",
      "A2": "Dresses & Skirts",
      "B1": "Denim & Trousers",
      "B2": "Outerwear & Jackets",
      "C1": "Footwear",
      "C2": "Accessories & Bags",
      "D1": "Ethnic & Occasion Wear",
      "D2": "Innerwear & Loungewear",
      "E1": "Kids Fashion",
      "E2": "Customer Service & Fitting Rooms",
    },
  },
  {
    storeId:  "STR-002",
    name:     "Retail AI — Phoenix Marketcity",
    address:  "Nagar Road, Viman Nagar, Pune 411014",
    phone:    "+91 20 6700 0000",
    hours: {
      Mon: "11:00 AM – 9:30 PM",
      Tue: "11:00 AM – 9:30 PM",
      Wed: "11:00 AM – 9:30 PM",
      Thu: "11:00 AM – 9:30 PM",
      Fri: "11:00 AM – 10:00 PM",
      Sat: "10:00 AM – 10:00 PM",
      Sun: "10:00 AM – 9:30 PM",
    },
    aisleMap: {
      "A1": "Tops & Casual Wear",
      "A2": "Formal & Business Attire",
      "B1": "Denim & Athleisure",
      "B2": "Seasonal Collections",
      "C1": "Footwear",
      "C2": "Bags & Accessories",
      "D1": "Ethnic Wear",
      "D2": "Customer Service",
    },
  },
  {
    storeId:  "STR-003",
    name:     "Retail AI — Nexus Koramangala",
    address:  "80 Feet Road, Koramangala, Bengaluru 560034",
    phone:    "+91 80 4900 0000",
    hours: {
      Mon: "10:00 AM – 10:00 PM",
      Tue: "10:00 AM – 10:00 PM",
      Wed: "10:00 AM – 10:00 PM",
      Thu: "10:00 AM – 10:00 PM",
      Fri: "10:00 AM – 11:00 PM",
      Sat: "10:00 AM – 11:00 PM",
      Sun: "10:00 AM – 10:00 PM",
    },
    aisleMap: {
      "A1": "Trendy & Street Style",
      "A2": "Dresses & Co-ords",
      "B1": "Basics & Essentials",
      "B2": "Active & Sports Wear",
      "C1": "Footwear",
      "C2": "Jewellery & Accessories",
      "D1": "Fitting Rooms & Customer Service",
    },
  },
];

async function seed() {
  for (const store of STORES) {
    await db.send(new PutCommand({ TableName: "Stores", Item: store }));
    console.log(`✓ Seeded ${store.storeId}: ${store.name}`);
  }
  console.log("\nDone! All stores seeded.");
}

seed().catch((err) => {
  console.error("Error seeding stores:", err);
  process.exit(1);
});
