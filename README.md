<div align="center">

# ET AI Concierge

*An intent-driven AI concierge for the Economic Times ecosystem. It understands who you are, learns from natural conversation, and surfaces the right ET services, news, and products at the exact moment of intent.*

<br/>

[![Live Demo](https://img.shields.io/badge/▶%20Live%20Demo-premanshchakraborty.github.io%2Fet--concierge-000000?style=for-the-badge&logoColor=white)](https://premanshchakraborty.github.io/et-concierge/)

[![Deploy](https://img.shields.io/github/actions/workflow/status/PremanshChakraborty/et-concierge/deploy.yml?label=GitHub%20Pages&style=flat-square)](https://github.com/PremanshChakraborty/et-concierge/actions)
[![React](https://img.shields.io/badge/React-TypeScript-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![AWS](https://img.shields.io/badge/AWS-Serverless-FF9900?style=flat-square&logo=amazonaws)](https://aws.amazon.com)

</div>

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

*Built for the ET GEN-AI Hackathon 2026.*
