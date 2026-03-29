/**
 * graph.ts — ET Concierge LangGraph StateGraph
 *
 * Regular chat flow:
 *   START → input → session → llm ──[search_et_catalog / search_prime_news]──→ tool → llm (loop)
 *                              └──[structured_response]──→ persist → END
 *                              └──[error]────────────────→ errorHandler → END
 *
 * Mode switch flow:
 *   START → input → modeSwitch → llm → persist → END
 */

import { StateGraph, END } from "@langchain/langgraph";
import { StateAnnotation } from "./state";
import { inputNode }      from "./nodes/inputNode";
import { sessionNode }    from "./nodes/sessionNode";
import { modeSwitchNode } from "./nodes/modeSwitchNode";
import { llmNode }        from "./nodes/llmNode";
import { toolNode }       from "./nodes/toolNode";
import { persistNode }    from "./nodes/persistNode";

// ── Routing functions ──────────────────────────────────────────────────────

type AfterInput   = "session" | "modeSwitch" | "errorHandler";
type AfterLlm     = "tool" | "persist" | "errorHandler";

function routeAfterInput(state: typeof StateAnnotation.State): AfterInput {
  if (state.error)        return "errorHandler";
  if (state.isModeSwitch) return "modeSwitch";
  return "session";
}

function routeAfterLlm(state: typeof StateAnnotation.State): AfterLlm {
  if (state.error)       return "errorHandler";
  if (state.responseText) return "persist";
  return "tool";
}

// ── Error node ─────────────────────────────────────────────────────────────

async function errorNode(
  state: typeof StateAnnotation.State
): Promise<Partial<typeof StateAnnotation.State>> {
  console.error("[errorNode]", state.error);
  return {
    responseText:      "I'm sorry, something went wrong. Please try again.",
    responseServices:  [],
    responseArticles:  [],
    followUpQuestions: ["What would you like to explore?", "Can you rephrase your question?"],
  };
}

// ── Build and compile ──────────────────────────────────────────────────────

const builder = new StateGraph(StateAnnotation)
  .addNode("input",        inputNode)
  .addNode("session",      sessionNode)
  .addNode("modeSwitch",   modeSwitchNode)
  .addNode("llm",          llmNode)
  .addNode("tool",         toolNode)
  .addNode("persist",      persistNode)
  .addNode("errorHandler", errorNode)

  .addEdge("__start__", "input")

  .addConditionalEdges("input", routeAfterInput, {
    session:      "session",
    modeSwitch:   "modeSwitch",
    errorHandler: "errorHandler",
  })

  // Regular chat: session → llm
  .addEdge("session", "llm")

  // Mode switch: modeSwitch → llm (generates the welcome)
  .addEdge("modeSwitch", "llm")

  .addConditionalEdges("llm", routeAfterLlm, {
    tool:         "tool",
    persist:      "persist",
    errorHandler: "errorHandler",
  })

  .addEdge("tool", "llm")

  .addEdge("persist",      END)
  .addEdge("errorHandler", END);

export const graph = builder.compile();
