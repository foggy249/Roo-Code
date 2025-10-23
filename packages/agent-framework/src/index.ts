/**
 * Roo-Code Agent Framework
 *
 * Multi-layer architecture for building agents and LLM applications:
 *
 * Layer 1: HTTP/Network (future)
 * Layer 2: LLM Provider Abstraction
 * Layer 3: LLM Orchestration
 * Layer 4: LLM Applications
 * Layer 5: Agent Applications
 */

// Runtime providers (foundation)
export * from "./runtime/RuntimeProvider"
export * from "./runtime/TerminalRuntimeProvider"

// Layer 2: LLM Providers
export * from "./providers/LLMProvider"
export * from "./providers/MockProvider"

// Layer 3: Orchestration
export * from "./orchestration/LLMOrchestrator"

// Layer 4: LLM Applications
export * from "./applications/LLMApplication"

// Layer 5: Agent Engine
export * from "./AgentEngine"

// Tools
export * from "./tools/Tool"

// Version
export const VERSION = "0.2.0"
