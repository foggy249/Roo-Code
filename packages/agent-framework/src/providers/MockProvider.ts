/**
 * Mock LLM Provider for testing and demonstration
 *
 * This provider simulates LLM responses without making actual API calls.
 * Useful for testing and development.
 */

import {
	BaseProvider,
	CompletionParams,
	CompletionResult,
	CompletionChunk,
	ProviderCapabilities,
	ProviderConfig,
} from "./LLMProvider"

export interface MockProviderConfig extends Omit<ProviderConfig, "apiKey"> {
	/** Simulated response delay in ms */
	delay?: number

	/** Custom response generator */
	responseGenerator?: (params: CompletionParams) => string
}

/**
 * Mock provider for testing
 */
export class MockProvider extends BaseProvider {
	private delay: number
	private responseGenerator?: (params: CompletionParams) => string

	constructor(config: MockProviderConfig) {
		super({ ...config, apiKey: "mock-key" })
		this.delay = config.delay || 100
		this.responseGenerator = config.responseGenerator
	}

	getName(): string {
		return "mock"
	}

	getCapabilities(): ProviderCapabilities {
		return {
			streaming: true,
			functionCalling: true,
			vision: true,
			maxContextTokens: 100000,
			maxOutputTokens: 4096,
		}
	}

	async complete(params: CompletionParams): Promise<CompletionResult> {
		const merged = this.mergeParams(params)

		// Simulate delay
		await new Promise((resolve) => setTimeout(resolve, this.delay))

		// Generate response
		const content = this.generateResponse(merged)

		return {
			content,
			stopReason: "end_turn",
			usage: {
				inputTokens: this.estimateTokens(params.messages),
				outputTokens: this.estimateTokens([{ role: "assistant", content }]),
				totalTokens: 0,
			},
		}
	}

	async *streamComplete(params: CompletionParams): AsyncIterableIterator<CompletionChunk> {
		const merged = this.mergeParams(params)
		const content = this.generateResponse(merged)

		// Stream word by word
		const words = content.split(" ")

		for (let i = 0; i < words.length; i++) {
			await new Promise((resolve) => setTimeout(resolve, this.delay / words.length))

			const delta = (i === 0 ? "" : " ") + words[i]
			const done = i === words.length - 1

			yield {
				delta,
				done,
				stopReason: done ? "end_turn" : undefined,
			}
		}
	}

	async countTokens(text: string): Promise<number> {
		// Rough approximation: ~4 chars per token
		return Math.ceil(text.length / 4)
	}

	private generateResponse(params: CompletionParams): string {
		if (this.responseGenerator) {
			return this.responseGenerator(params)
		}

		const lastMessage = params.messages[params.messages.length - 1]
		const userContent = lastMessage?.content || ""

		// Generate a mock response based on the user's question
		if (userContent.toLowerCase().includes("hello")) {
			return "Hello! I am a mock LLM provider. How can I help you today?"
		} else if (userContent.toLowerCase().includes("code")) {
			return 'Here is a simple code example:\n\n```python\ndef hello():\n    print("Hello, World!")\n```'
		} else if (userContent.toLowerCase().includes("help")) {
			return "I can help you with:\n1. Writing code\n2. Answering questions\n3. Providing explanations\n\nWhat would you like to do?"
		} else {
			return `I received your message: "${userContent}". This is a mock response from the test provider. In a real implementation, this would be replaced with actual LLM-generated content.`
		}
	}

	private estimateTokens(messages: Array<{ role: string; content: string }>): number {
		const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0)
		return Math.ceil(totalLength / 4)
	}
}
