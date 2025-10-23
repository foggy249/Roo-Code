#!/usr/bin/env tsx
/**
 * Simple Agent Example
 *
 * This demonstrates the Roo-Code agent framework running in a terminal environment.
 * This is a proof-of-concept showing how the framework can be used outside VSCode.
 */

import { AgentEngine, TerminalRuntimeProvider } from "@roo-code/agent-framework"

async function main() {
	console.log("🦘 Roo-Code Agent Framework Demo\n")
	console.log("This is a minimal demonstration of the agent framework.")
	console.log("It shows how the same framework can run in both VSCode and terminal.\n")

	// Create terminal runtime provider
	const runtime = new TerminalRuntimeProvider({
		cwd: process.cwd(),
		workspacePath: process.cwd(),
	})

	// Display runtime capabilities
	const capabilities = runtime.getCapabilities()
	console.log("Runtime Capabilities:")
	console.log("  File Operations:", capabilities.canReadFiles && capabilities.canWriteFiles ? "✓" : "✗")
	console.log("  Command Execution:", capabilities.canExecuteCommands ? "✓" : "✗")
	console.log("  User Interaction:", capabilities.canAskUser ? "✓" : "✗")
	console.log("  Browser Support:", capabilities.supportsBrowser ? "✓" : "✗")
	console.log("  MCP Support:", capabilities.supportsMcp ? "✓" : "✗")
	console.log()

	// Create agent with configuration
	const agent = new AgentEngine({
		runtime,
		apiProvider: "anthropic",
		apiKey: process.env.ANTHROPIC_API_KEY || "demo-key",
		model: "claude-3-5-sonnet-20241022",
		mode: "code",
		autoApprove: false,
		maxIterations: 50,
	})

	// Example task
	const task = process.argv[2] || "Create a simple Hello World program in Python"

	console.log("=".repeat(60))
	console.log()

	// Execute task
	const result = await agent.execute({
		task,
		autoApprove: false,
	})

	console.log()
	console.log("=".repeat(60))
	console.log()

	// Show result
	if (result.status === "completed") {
		console.log("✓ Task completed successfully")
		console.log(`  Iterations: ${result.iterations}`)
		if (result.message) {
			console.log(`  Message: ${result.message}`)
		}
	} else {
		console.log(`✗ Task ${result.status}`)
		if (result.message) {
			console.log(`  Message: ${result.message}`)
		}
	}

	// Cleanup
	runtime.close()

	console.log()
	console.log("Next Steps:")
	console.log("  1. Integrate with src/api for real LLM provider support")
	console.log("  2. Integrate with src/core/tools for tool execution")
	console.log("  3. Integrate with src/core/prompts for dynamic prompts")
	console.log("  4. Add streaming support for real-time feedback")
	console.log("  5. Add MCP server integration")
	console.log()
	console.log("For full implementation, see: FRAMEWORK_ANALYSIS.md")
}

main().catch((error) => {
	console.error("Error:", error)
	process.exit(1)
})
