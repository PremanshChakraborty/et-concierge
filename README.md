# ET AI Concierge

> **Live Demo → [https://premanshchakraborty.github.io/et-concierge/](https://premanshchakraborty.github.io/et-concierge/)**

An intent-driven AI concierge for the Economic Times ecosystem. It understands who you are, learns from natural conversation, and surfaces the right ET services, news, and products at the exact moment of intent — without a single form field.

---

## What It Does

| Capability | Detail |
|---|---|
| **Proactive Profiling** | Infers occupation, interests & financial goals from natural conversation and persists them silently to DynamoDB |
| **Semantic Search** | Pinecone vector search surfaces contextually relevant ET services and products |
| **Dual Mode** | Switches seamlessly between **Advisory Mode** (financial services) and **Prime News Mode** (personalized headlines) |
| **Cross-Sell Engine** | Merges live news context with user profile to recommend monetisable ET offerings at peak purchase intent |
| **Session Persistence** | Full chat history, mode state, and product cards survive refresh and session switching |
| **In-Store Mode** | QR-triggered mode for physical retail — same AI, store-aware context |

---

## Tech Stack

**Frontend** — React + TypeScript + Vite, deployed to GitHub Pages via CI/CD

**Orchestrator** — LangGraph agent on AWS Lambda (Node 20), esbuild-bundled, exposed via Lambda Function URL

**AI** — Google Gemini (LLM), Amazon Bedrock Titan (embeddings)

**Data** — Pinecone (vector search) · DynamoDB (sessions + user profiles) · AWS Secrets Manager

**Auth** — Amazon Cognito (JWT, email sign-up/in, 12h token validity)

**Infra** — Fully serverless, deployed with AWS CDK

---

## Architecture

```
Browser (React)
    │  JWT in Authorization header
    ▼
Lambda Function URL — Orchestrator
    ├── Cognito JWT verification
    ├── LangGraph graph (RAG → LLM → Persist nodes)
    │       ├── Pinecone semantic search
    │       ├── Bedrock Titan embeddings
    │       └── Google Gemini (chat + tool calls)
    └── DynamoDB  ┬── Session table (history + products)
                  └── UserProfile table (inferred profile)
```

---

## Running Locally

```bash
# Frontend
cd frontend
npm install
npm run dev

# Orchestrator (build + deploy via CDK)
cd orchestrator && npm run build
GOOGLE_API_KEY=... npx cdk deploy --require-approval never
```

---

*Built for the ET Hackathon 2025.*
