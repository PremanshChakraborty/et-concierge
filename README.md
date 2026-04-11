<div align="center">

# ET AI Concierge

*An intent-driven AI concierge for the Economic Times ecosystem. It understands who you are, learns from natural conversation, and surfaces the right ET services, news, and products at the exact moment of intent.*

<br/>

[![Live Demo](https://img.shields.io/badge/▶%20Live%20Demo-premanshchakraborty.github.io%2Fet--concierge-000000?style=for-the-badge&logoColor=white)](https://premanshchakraborty.github.io/et-concierge/)

[![Deploy](https://img.shields.io/github/actions/workflow/status/PremanshChakraborty/et-concierge/deploy.yml?label=GitHub%20Pages&style=flat-square)](https://github.com/PremanshChakraborty/et-concierge/actions)
[![React](https://img.shields.io/badge/React-TypeScript-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![AWS](https://img.shields.io/badge/AWS-Serverless-FF9900?style=flat-square&logo=amazonaws)](https://aws.amazon.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-ReAct%20Agent-1C3C3C?style=flat-square&logo=langchain)](https://langchain-ai.github.io/langgraphjs/)

</div>

---

## What It Does

| Capability | Detail |
|---|---|
| **Proactive Profiling** | Infers occupation, risk appetite, financial goals & interests from natural conversation — persists silently to DynamoDB |
| **Semantic Search** | Pinecone vector search (Bedrock Titan embeddings) surfaces contextually relevant ET services and Prime news articles |
| **Dual Mode** | Switches between **Advisory Mode** (financial services cross-sell) and **Prime News Mode** (personalised headlines) |
| **Cross-Sell Engine** | Merges live article context with user profile to craft targeted service recommendations at peak purchase intent |
| **Session Persistence** | Full chat history, mode state, and product/service cards survive refresh and cross-session switching |
| **In-Store Mode** | QR-triggered mode for physical retail — same AI agent, store-aware persona and guardrails |

---

## LangGraph Orchestration

The agent is a **ReAct (Reason + Act) loop** compiled as a LangGraph `StateGraph`. Each request traverses a graph of typed nodes, with conditional routing based on the accumulated state.

### Graph Flow

```
                    ┌─────────────────────────────────────────────────────┐
                    │                  LangGraph StateGraph                │
                    │                                                      │
START ──► input ──► ├─[isModeSwitch]──► modeSwitch ──► llm ──► persist ──► END
                    │                                    ▲                 │
                    └─[chat]──► session ──► llm ─────────┘                 │
                                            │                              │
                                            ├─[tool_call]──► tool ─────►──┘ (loop)
                                            └─[structured_response]──► persist ──► END
```

### Nodes

| Node | Role |
|---|---|
| `inputNode` | Parses request body, validates JWT via Cognito, routes mode-switch vs chat |
| `sessionNode` | Loads `ChatMessage[]` history + `UserProfile` + `currentMode` from DynamoDB |
| `modeSwitchNode` | Transitions mode, writes event marker to session, re-enters `llm` for welcome |
| `llmNode` | Runs the ReAct loop with Gemini; injects mode-aware context block; handles `structured_response` tool to emit typed output |
| `toolNode` | Executes `search_et_catalog` / `search_prime_news` (Pinecone) and `update_user_profile` (DynamoDB write) in parallel |
| `persistNode` | Writes updated history + mode + services/articles to DynamoDB with 30-day TTL; auto-generates session names on first turn |
| `errorNode` | Catches any state error and returns a graceful fallback response |

### LangGraph State

The shared state (`OrchestratorState`) carries:

```typescript
{
  userId, sessionId, userMessage,           // auth + input
  isModeSwitch, requestedMode,              // routing flags
  sessionHistory, currentMode,              // loaded from DynamoDB
  currentServices, currentArticles,         // session-level context for LLM
  userProfile,                              // persisted profile (mutable per turn)
  agentMessages, iterationCount,            // ReAct loop internals
  retrievedServices, retrievedArticles,     // RAG results (deduplicated, append-only)
  responseText, responseServices,           // structured LLM output
  responseArticles, followUpQuestions,
  error
}
```

---

## Tools Available to the LLM

| Tool | Description |
|---|---|
| `search_et_catalog` | Semantic search over Pinecone `et-services` index; returns scored service cards with price, pageUrl, target audience |
| `search_prime_news` | Semantic search over Pinecone `et-news` index; returns article stubs with summaries and source URLs |
| `update_user_profile` | Merges inferred profile fields (occupation, risk appetite, goals, interests) into DynamoDB `UserProfile` table immediately |
| `structured_response` | Signals end of ReAct loop; emits typed `{ text, services[], articles[], followUpQuestions[] }` output |

Profile completeness is scored deterministically: `occupation (15) + ageBracket (15) + location (10) + riskAppetite (20) + financialGoals (20) + topicsOfInterest (20) = 100`.

---

## Data & Persistence

### DynamoDB Tables

| Table | PK | Key Fields |
|---|---|---|
| `Session` | `sessionId` | `history[]`, `currentMode`, `currentServices`, `currentArticles`, `userProfile`, `ttl` (30d) |
| `UserProfile` | `userId` | `occupation`, `ageBracket`, `riskAppetite`, `financialGoals[]`, `topicsOfInterest[]`, `profileCompleteness` |

Session table has a GSI (`userId-lastUpdated-index-v2`) for listing a user's sessions sorted by recency, projecting only `currentMode` and `sessionName`.

### Pinecone Indexes

| Index | Content | Embedding Model |
|---|---|---|
| `et-services` | ET Prime subscriptions, masterclasses, financial tools | Bedrock Titan `v2` (1536-dim) |
| `et-news` | ET Prime article summaries with metadata | Bedrock Titan `v2` (1536-dim) |

Metadata per vector includes `category`, `subCategory`, `price`, `pageUrl`, `tags[]`, `targetAudience[]`, `imageUrl`.

---

## AWS Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          AWS (us-east-1)                        │
│                                                                 │
│  Cognito User Pool  ──JWT verify──►  OrchestratorFn (Lambda)   │
│  (email sign-up,                      Node 20 · 512MB · 120s   │
│   12h token TTL)                      esbuild single-file bundle│
│                                               │                 │
│                          ┌────────────────────┼────────────┐    │
│                          ▼                    ▼            ▼    │
│                     DynamoDB             Bedrock        Pinecone │
│                  Session + Profile    Titan embeddings  (ext.)  │
│                  PAY_PER_REQUEST                                 │
│                                                                 │
│  ProfileApiFn (Lambda) ──► Session + UserProfile tables         │
│  Node 20 · 256MB · 15s                                          │
│                                                                 │
│  Secrets Manager  ──► PINECONE_API_KEY                          │
└─────────────────────────────────────────────────────────────────┘
         │ Lambda Function URLs (CORS open, JWT in header)
         ▼
  GitHub Pages (React SPA)  ──  CI/CD via GitHub Actions
```

Deployed entirely via **AWS CDK** (TypeScript). No API Gateway — direct Lambda Function URLs keep cold starts low and remove per-request pricing.

---

## Frontend

- **React 18** + TypeScript, bundled with **Vite**
- Dual-pane layout: chat column + live product/service spotlight sidebar
- `ChatHeader` sticky mode chip with IntersectionObserver — floats over chat content
- Session sidebar with `useRef` cache for instant switching without re-fetching
- Auto-resizing `<textarea>` chat input; send button pinned to bottom-right
- Product spotlight with click-to-expand swap (MiniCard ↔ FullCard) preserving order
- Deployed to **GitHub Pages** via `actions/deploy-pages` on every push to `main`

---

## Running Locally

```bash
# Frontend
cd frontend
npm install
npm run dev          # http://localhost:5173

# Orchestrator — build then deploy infra
cd orchestrator
npm run build        # esbuild → dist/handler.js

# From root
GOOGLE_API_KEY=<key> npx cdk deploy --require-approval never
```

### Required environment variables (Lambda)

| Variable | Source |
|---|---|
| `GOOGLE_API_KEY` | Google AI Studio |
| `PINECONE_API_KEY` | Pulled from AWS Secrets Manager at deploy time |
| `SESSION_TABLE` | Injected by CDK (`Session`) |
| `PROFILES_TABLE` | Injected by CDK (`UserProfile`) |
| `COGNITO_USER_POOL_ID` | Injected by CDK |
| `BEDROCK_REGION` | Injected by CDK (`us-east-1`) |

---

*Built for the ET GEN-AI Hackathon 2026.*
