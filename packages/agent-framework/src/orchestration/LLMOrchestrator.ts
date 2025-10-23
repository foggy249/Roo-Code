/**
 * Layer 3: LLM Orchestration
 *
 * Manages conversations, message history, and context windows.
 * Provides conversation management without tool execution.
 */

import { LLMProvider, Message, CompletionParams, CompletionResult, CompletionChunk } from "../providers/LLMProvider"

/**
 * Conversation context
 */
export interface Conversation {
	/** Unique conversation ID */
	id: string

	/** System prompt */
	systemPrompt: string

	/** Message history */
	messages: Message[]

	/** Conversation metadata */
	metadata: Record<string, unknown>

	/** Created timestamp */
	createdAt: Date

	/** Last updated timestamp */
	updatedAt: Date
}

/**
 * Context management strategy
 */
export type ContextStrategy =
	| "sliding-window" // Keep recent messages within limit
	| "summarize" // Summarize old messages
	| "truncate" // Simply truncate old messages

/**
 * Conversation configuration
 */
export interface ConversationConfig {
	/** System prompt */
	systemPrompt: string

	/** Context strategy */
	contextStrategy?: ContextStrategy

	/** Maximum tokens for context */
	maxTokens?: number

	/** Temperature */
	temperature?: number

	/** Other parameters */
	params?: Partial<CompletionParams>
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
	/** LLM provider */
	provider: LLMProvider

	/** Default context strategy */
	contextStrategy?: ContextStrategy

	/** Default max tokens */
	maxTokens?: number

	/** Default temperature */
	temperature?: number
}

/**
 * LLM Orchestrator
 *
 * Manages conversations and message flow without tool execution.
 * Use this for multi-turn conversations or LLM applications.
 */
export class LLMOrchestrator {
	private provider: LLMProvider
	private config: OrchestratorConfig
	private conversations: Map<string, Conversation>

	constructor(config: OrchestratorConfig) {
		this.provider = config.provider
		this.config = config
		this.conversations = new Map()
	}

	/**
	 * Create a new conversation
	 */
	createConversation(config: ConversationConfig): Conversation {
		const id = this.generateId()

		const conversation: Conversation = {
			id,
			systemPrompt: config.systemPrompt,
			messages: [],
			metadata: {},
			createdAt: new Date(),
			updatedAt: new Date(),
		}

		this.conversations.set(id, conversation)
		return conversation
	}

	/**
	 * Get a conversation by ID
	 */
	getConversation(id: string): Conversation | undefined {
		return this.conversations.get(id)
	}

	/**
	 * Add a message to the conversation
	 */
	addMessage(conversation: Conversation, message: Message): void {
		conversation.messages.push(message)
		conversation.updatedAt = new Date()
	}

	/**
	 * Get conversation history
	 */
	getHistory(conversation: Conversation): Message[] {
		return [...conversation.messages]
	}

	/**
	 * Clear conversation history
	 */
	clearHistory(conversation: Conversation): void {
		conversation.messages = []
		conversation.updatedAt = new Date()
	}

	/**
	 * Get a response from the LLM (non-streaming)
	 */
	async getResponse(
		conversation: Conversation,
		userMessage?: string,
		config?: Partial<ConversationConfig>,
	): Promise<string> {
		// Add user message if provided
		if (userMessage) {
			this.addMessage(conversation, {
				role: "user",
				content: userMessage,
			})
		}

		// Manage context window
		const managedMessages = await this.manageContext(conversation)

		// Call LLM
		const result = await this.provider.complete({
			systemPrompt: conversation.systemPrompt,
			messages: managedMessages,
			temperature: config?.temperature ?? this.config.temperature,
			maxTokens: config?.maxTokens ?? this.config.maxTokens,
			...config?.params,
		})

		// Add assistant response to history
		this.addMessage(conversation, {
			role: "assistant",
			content: result.content,
		})

		return result.content
	}

	/**
	 * Stream a response from the LLM
	 */
	async *streamResponse(
		conversation: Conversation,
		userMessage?: string,
		config?: Partial<ConversationConfig>,
	): AsyncIterableIterator<string> {
		// Add user message if provided
		if (userMessage) {
			this.addMessage(conversation, {
				role: "user",
				content: userMessage,
			})
		}

		// Manage context window
		const managedMessages = await this.manageContext(conversation)

		// Stream from LLM
		let fullResponse = ""

		for await (const chunk of this.provider.streamComplete({
			systemPrompt: conversation.systemPrompt,
			messages: managedMessages,
			temperature: config?.temperature ?? this.config.temperature,
			maxTokens: config?.maxTokens ?? this.config.maxTokens,
			...config?.params,
		})) {
			fullResponse += chunk.delta
			yield chunk.delta
		}

		// Add complete response to history
		this.addMessage(conversation, {
			role: "assistant",
			content: fullResponse,
		})
	}

	/**
	 * Manage context window
	 */
	private async manageContext(conversation: Conversation): Promise<Message[]> {
		const strategy = this.config.contextStrategy || "sliding-window"
		const maxTokens = this.config.maxTokens || 4000

		switch (strategy) {
			case "sliding-window":
				return this.slidingWindow(conversation.messages, maxTokens)

			case "truncate":
				return this.truncate(conversation.messages, maxTokens)

			case "summarize":
				// TODO: Implement summarization
				return this.slidingWindow(conversation.messages, maxTokens)

			default:
				return conversation.messages
		}
	}

	/**
	 * Sliding window context management
	 */
	private async slidingWindow(messages: Message[], maxTokens: number): Promise<Message[]> {
		// Keep most recent messages that fit in window
		const result: Message[] = []
		let tokenCount = 0

		for (let i = messages.length - 1; i >= 0; i--) {
			const message = messages[i]
			if (!message) continue

			const messageTokens = await this.provider.countTokens(message.content)

			if (tokenCount + messageTokens <= maxTokens) {
				result.unshift(message)
				tokenCount += messageTokens
			} else {
				break
			}
		}

		return result
	}

	/**
	 * Truncate context management
	 */
	private async truncate(messages: Message[], maxTokens: number): Promise<Message[]> {
		// Simply truncate to maxTokens
		let tokenCount = 0
		const result: Message[] = []

		for (const message of messages) {
			const messageTokens = await this.provider.countTokens(message.content)

			if (tokenCount + messageTokens <= maxTokens) {
				result.push(message)
				tokenCount += messageTokens
			} else {
				break
			}
		}

		return result
	}

	/**
	 * Generate unique ID
	 */
	private generateId(): string {
		return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	}

	/**
	 * Get the underlying provider
	 */
	getProvider(): LLMProvider {
		return this.provider
	}
}
