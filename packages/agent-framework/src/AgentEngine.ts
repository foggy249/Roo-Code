/**
 * Layer 5: Agent Application with full agentic loop
 *
 * This is the highest level of the framework, providing a complete
 * agent with tools, planning, and execution capabilities.
 */

import type { RuntimeProvider, AgentMessage } from "./runtime/RuntimeProvider"
import { LLMProvider } from "./providers/LLMProvider"
import { MockProvider } from "./providers/MockProvider"
import { LLMOrchestrator } from "./orchestration/LLMOrchestrator"
import { Tool, defaultTools } from "./tools/Tool"

export interface AgentConfig {
	/** Runtime provider for environment operations */
	runtime: RuntimeProvider

	/** LLM provider (optional - will create mock if not provided) */
	provider?: LLMProvider

	/** API provider name (for legacy compatibility) */
	apiProvider?: string

	/** API key (for legacy compatibility) */
	apiKey?: string

	/** Model name */
	model: string

	/** Operating mode */
	mode?: string

	/** Auto-approve tool executions */
	autoApprove?: boolean

	/** Maximum iterations */
	maxIterations?: number

	/** Custom tools */
	tools?: Tool[]

	/** Temperature */
	temperature?: number

	/** Max tokens */
	maxTokens?: number
}

export interface TaskResult {
	status: "completed" | "failed" | "cancelled"
	message?: string
	iterations?: number
	toolsUsed?: number
}

/**
 * Agent Engine with full integration
 *
 * This provides Layer 5 functionality with tool execution and agentic loop.
 * Also provides access to lower layers for customization.
 */
export class AgentEngine {
	private runtime: RuntimeProvider
	private provider: LLMProvider
	private orchestrator: LLMOrchestrator
	private config: AgentConfig
	private tools: Map<string, Tool>

	constructor(config: AgentConfig) {
		this.config = config
		this.runtime = config.runtime

		// Create provider (use mock if not provided)
		this.provider =
			config.provider ||
			new MockProvider({
				model: config.model,
				delay: 50,
			})

		// Create orchestrator
		this.orchestrator = new LLMOrchestrator({
			provider: this.provider,
			temperature: config.temperature || 0.7,
			maxTokens: config.maxTokens || 4000,
		})

		// Register tools
		this.tools = new Map()
		const toolsToRegister = config.tools || defaultTools
		for (const tool of toolsToRegister) {
			this.tools.set(tool.name, tool)
		}
	}

	/**
	 * Execute a task with the full agentic loop
	 */
	async execute(options: { task: string; autoApprove?: boolean }): Promise<TaskResult> {
		const autoApprove = options.autoApprove ?? this.config.autoApprove ?? false
		const maxIterations = this.config.maxIterations || 50

		await this.runtime.say({
			type: "info",
			content: `Starting task: ${options.task}`,
		})

		await this.runtime.say({
			type: "info",
			content: `Mode: ${this.config.mode || "code"}`,
		})

		await this.runtime.say({
			type: "info",
			content: `Model: ${this.config.model}`,
		})

		await this.runtime.say({
			type: "info",
			content: `Provider: ${this.provider.getName()}`,
		})

		// Get environment details
		const env = await this.runtime.getEnvironmentDetails()
		await this.runtime.say({
			type: "info",
			content: `Environment: ${env.os} (${env.osVersion}), Shell: ${env.shell}`,
		})

		// Create conversation for this task
		const conversation = this.orchestrator.createConversation({
			systemPrompt: this.buildSystemPrompt(),
			temperature: this.config.temperature,
			maxTokens: this.config.maxTokens,
		})

		let iterations = 0
		let toolsUsed = 0

		try {
			// Simple agentic loop (demonstration)
			while (iterations < maxIterations) {
				iterations++

				// Get LLM response
				const response = await this.orchestrator.getResponse(
					conversation,
					iterations === 1 ? options.task : undefined,
				)

				// Check if task is complete
				if (this.isTaskComplete(response)) {
					await this.runtime.say({
						type: "success",
						content: "Task completed successfully.",
					})

					return {
						status: "completed",
						message: "Task completed successfully",
						iterations,
						toolsUsed,
					}
				}

				// Parse and execute tools (simplified)
				const toolUses = this.parseToolUses(response)

				if (toolUses.length === 0) {
					// No more tools to execute, task complete
					await this.runtime.say({
						type: "success",
						content: "Task completed.",
					})

					return {
						status: "completed",
						message: "No more actions needed",
						iterations,
						toolsUsed,
					}
				}

				// Execute tools
				for (const toolUse of toolUses) {
					toolsUsed++
					const result = await this.executeTool(toolUse, autoApprove)

					// Add tool result to conversation
					this.orchestrator.addMessage(conversation, {
						role: "user",
						content: `Tool ${toolUse.name} result: ${result.content}`,
					})
				}
			}

			// Max iterations reached
			await this.runtime.say({
				type: "warning",
				content: `Maximum iterations (${maxIterations}) reached.`,
			})

			return {
				status: "completed",
				message: "Maximum iterations reached",
				iterations,
				toolsUsed,
			}
		} catch (error) {
			await this.runtime.say({
				type: "error",
				content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
			})

			return {
				status: "failed",
				message: error instanceof Error ? error.message : "Unknown error",
				iterations,
				toolsUsed,
			}
		}
	}

	/**
	 * Build system prompt based on mode and tools
	 */
	private buildSystemPrompt(): string {
		const mode = this.config.mode || "code"

		let prompt = `You are a helpful AI assistant in ${mode} mode.\n\n`

		if (this.tools.size > 0) {
			prompt += "Available tools:\n"
			for (const tool of this.tools.values()) {
				prompt += `- ${tool.name}: ${tool.description}\n`
			}
			prompt += "\n"
		}

		prompt += "Complete the user's task to the best of your ability."

		return prompt
	}

	/**
	 * Check if task is complete based on response
	 */
	private isTaskComplete(response: string): boolean {
		const lowerResponse = response.toLowerCase()
		return (
			lowerResponse.includes("task complete") ||
			lowerResponse.includes("task completed") ||
			lowerResponse.includes("finished") ||
			lowerResponse.includes("done")
		)
	}

	/**
	 * Parse tool uses from response (simplified)
	 */
	private parseToolUses(response: string): Array<{ name: string; params: Record<string, unknown> }> {
		// This is a simplified parser - real implementation would be more robust
		const toolUses: Array<{ name: string; params: Record<string, unknown> }> = []

		// Look for tool mentions (very basic)
		for (const tool of this.tools.values()) {
			if (response.toLowerCase().includes(tool.name)) {
				toolUses.push({
					name: tool.name,
					params: {}, // Would parse actual params in real implementation
				})
			}
		}

		return toolUses
	}

	/**
	 * Execute a tool
	 */
	private async executeTool(toolUse: { name: string; params: Record<string, unknown> }, autoApprove: boolean) {
		const tool = this.tools.get(toolUse.name)

		if (!tool) {
			return {
				success: false,
				content: "",
				error: `Tool not found: ${toolUse.name}`,
			}
		}

		// Request approval if needed
		if (!autoApprove) {
			const approved = await this.runtime.requestToolApproval({
				toolName: tool.name,
				params: toolUse.params,
				description: tool.description,
			})

			if (!approved) {
				return {
					success: false,
					content: "",
					error: "Tool execution denied by user",
				}
			}
		}

		// Execute tool
		return await tool.execute(toolUse.params, this.runtime)
	}

	/**
	 * Get runtime capabilities
	 */
	getCapabilities() {
		return this.runtime.getCapabilities()
	}

	/**
	 * Get the LLM provider (Layer 2 access)
	 */
	getProvider(): LLMProvider {
		return this.provider
	}

	/**
	 * Get the orchestrator (Layer 3 access)
	 */
	getOrchestrator(): LLMOrchestrator {
		return this.orchestrator
	}

	/**
	 * Register a custom tool
	 */
	registerTool(tool: Tool): void {
		this.tools.set(tool.name, tool)
	}

	/**
	 * Register multiple tools
	 */
	registerTools(tools: Tool[]): void {
		for (const tool of tools) {
			this.registerTool(tool)
		}
	}

	/**
	 * Get registered tools
	 */
	getTools(): Tool[] {
		return Array.from(this.tools.values())
	}
}
