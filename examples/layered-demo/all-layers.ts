#!/usr/bin/env tsx
/**
 * Comprehensive Layered Architecture Demonstration
 *
 * This example demonstrates all 5 layers of the framework and how they work together.
 */

import {
	// Layer 2: Providers
	MockProvider,

	// Layer 3: Orchestration
	LLMOrchestrator,

	// Layer 4: LLM Applications
	LLMApplication,
	CodeReviewApplication,
	SummarizationApplication,

	// Layer 5: Agent
	AgentEngine,
	TerminalRuntimeProvider,
	ReadFileTool,
	WriteFileTool,
} from "@roo-code/agent-framework"

async function main() {
	console.log("🦘 Roo-Code Layered Architecture Demonstration\n")
	console.log("=".repeat(60))
	console.log()

	// ============================================================================
	// Layer 2: Direct LLM Provider Access
	// ============================================================================

	console.log("📍 Layer 2: LLM Provider (Direct API Access)")
	console.log("-".repeat(60))

	const provider = new MockProvider({
		model: "mock-model",
		delay: 50,
	})

	console.log(`Provider: ${provider.getName()}`)
	console.log(`Capabilities:`, provider.getCapabilities())
	console.log()

	// Direct LLM call
	console.log("Making direct LLM call...")
	const directResult = await provider.complete({
		systemPrompt: "You are a helpful assistant",
		messages: [{ role: "user", content: "What is TypeScript?" }],
	})

	console.log(`Response: ${directResult.content.substring(0, 100)}...`)
	console.log(`Tokens used: ${directResult.usage?.totalTokens || 0}`)
	console.log()

	// ============================================================================
	// Layer 3: LLM Orchestration (Conversation Management)
	// ============================================================================

	console.log("📍 Layer 3: LLM Orchestration (Conversation Management)")
	console.log("-".repeat(60))

	const orchestrator = new LLMOrchestrator({
		provider,
		temperature: 0.7,
		maxTokens: 4000,
	})

	// Create a conversation
	const conversation = orchestrator.createConversation({
		systemPrompt: "You are a helpful coding assistant",
		temperature: 0.5,
	})

	console.log(`Created conversation: ${conversation.id}`)
	console.log()

	// Multi-turn conversation
	console.log("Turn 1: Asking about React...")
	const response1 = await orchestrator.getResponse(conversation, "What is React?")
	console.log(`Response: ${response1.substring(0, 80)}...`)
	console.log()

	console.log("Turn 2: Follow-up question...")
	const response2 = await orchestrator.getResponse(conversation, "How do I create a component?")
	console.log(`Response: ${response2.substring(0, 80)}...`)
	console.log(`Conversation history: ${conversation.messages.length} messages`)
	console.log()

	// ============================================================================
	// Layer 4: LLM Applications (Single-shot tasks)
	// ============================================================================

	console.log("📍 Layer 4: LLM Applications (No Agentic Loop)")
	console.log("-".repeat(60))

	// Code review application
	console.log("Example 1: Code Review Application")
	const codeReviewer = new CodeReviewApplication(orchestrator)

	const reviewResult = await codeReviewer.execute({
		language: "typescript",
		code: `function add(a, b) { return a + b }`,
	})

	console.log(`Review completed in ${reviewResult.processingTime}ms`)
	console.log(`Result: ${reviewResult.content.substring(0, 100)}...`)
	console.log()

	// Summarization application
	console.log("Example 2: Text Summarization Application")
	const summarizer = new SummarizationApplication(orchestrator)

	const summaryResult = await summarizer.execute({
		text: "The Roo-Code framework is a multi-layer architecture for building agents and LLM applications. It provides 5 layers: HTTP/Network, LLM Provider Abstraction, LLM Orchestration, LLM Applications, and Agent Applications. Each layer can be used independently.",
		bulletPoints: "3",
	})

	console.log(`Summary: ${summaryResult.content}`)
	console.log()

	// Custom LLM application
	console.log("Example 3: Custom LLM Application")
	const customApp = new LLMApplication({
		orchestrator,
		systemPrompt: "You are a technical interviewer",
		promptTemplate: `Create a technical interview question about {topic}.
	
Include:
- The question
- Key points to look for in the answer
- A sample answer`,
		temperature: 0.8,
	})

	const interviewQ = await customApp.execute({
		topic: "async/await in JavaScript",
	})

	console.log(`Interview question generated:`)
	console.log(interviewQ.content.substring(0, 150) + "...")
	console.log()

	// ============================================================================
	// Layer 5: Agent Applications (Full Agentic Loop with Tools)
	// ============================================================================

	console.log("📍 Layer 5: Agent Application (Full Agentic Loop)")
	console.log("-".repeat(60))

	// Create runtime
	const runtime = new TerminalRuntimeProvider({
		cwd: process.cwd(),
		workspacePath: process.cwd(),
	})

	// Create agent with all layers integrated
	const agent = new AgentEngine({
		runtime,
		provider, // Use our mock provider
		model: "mock-model",
		mode: "code",
		autoApprove: true,
		tools: [new ReadFileTool(), new WriteFileTool()],
	})

	console.log(`Agent created with ${agent.getTools().length} tools`)
	console.log(
		"Tools:",
		agent
			.getTools()
			.map((t) => t.name)
			.join(", "),
	)
	console.log()

	// Execute a task
	console.log("Executing agent task...")
	const agentResult = await agent.execute({
		task: 'Create a hello.txt file with "Hello from Layer 5!"',
	})

	console.log(`Task ${agentResult.status}`)
	console.log(`Iterations: ${agentResult.iterations}`)
	console.log(`Tools used: ${agentResult.toolsUsed}`)
	console.log()

	// ============================================================================
	// Layer Access Demonstration
	// ============================================================================

	console.log("📍 Layer Access from Agent")
	console.log("-".repeat(60))

	console.log("Agent provides access to lower layers:")
	console.log()

	// Access Layer 2 (Provider) from Layer 5 (Agent)
	console.log("Layer 2 access: agent.getProvider()")
	const providerFromAgent = agent.getProvider()
	console.log(`  Provider name: ${providerFromAgent.getName()}`)
	console.log()

	// Access Layer 3 (Orchestrator) from Layer 5 (Agent)
	console.log("Layer 3 access: agent.getOrchestrator()")
	const orchestratorFromAgent = agent.getOrchestrator()
	const newConv = orchestratorFromAgent.createConversation({
		systemPrompt: "You are a poet",
	})
	console.log(`  Created conversation: ${newConv.id}`)
	console.log()

	// ============================================================================
	// Summary
	// ============================================================================

	console.log("=".repeat(60))
	console.log()
	console.log("✨ Layered Architecture Benefits:")
	console.log()
	console.log("1. Use any layer independently")
	console.log("   - Layer 2: Direct LLM API calls")
	console.log("   - Layer 3: Conversation management")
	console.log("   - Layer 4: Single-shot LLM applications")
	console.log("   - Layer 5: Full agentic loops with tools")
	console.log()
	console.log("2. Access lower layers from upper layers")
	console.log("   - Agent can access provider and orchestrator")
	console.log("   - Mix and match as needed")
	console.log()
	console.log("3. Progressive enhancement")
	console.log("   - Start simple (Layer 2)")
	console.log("   - Add complexity as needed (Layers 3-5)")
	console.log()
	console.log("4. Custom implementations at any layer")
	console.log("   - Custom providers")
	console.log("   - Custom orchestrators")
	console.log("   - Custom applications")
	console.log("   - Custom agents")
	console.log()
	console.log("=".repeat(60))
	console.log()
	console.log("🎉 Demonstration complete!")
	console.log()
	console.log("Next steps:")
	console.log("- See LAYERED_ARCHITECTURE.md for complete documentation")
	console.log("- Try individual layer examples (pnpm run layer2, layer3, etc.)")
	console.log("- Build your own custom implementation at any layer")
	console.log()

	runtime.close()
}

main().catch(console.error)
