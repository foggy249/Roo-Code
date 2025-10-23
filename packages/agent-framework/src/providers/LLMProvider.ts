/**
 * Layer 2: LLM Provider Abstraction
 *
 * This layer provides a unified interface for all LLM providers,
 * allowing direct LLM API calls without framework overhead.
 */

/**
 * Message role in a conversation
 */
export type MessageRole = "system" | "user" | "assistant"

/**
 * A single message in a conversation
 */
export interface Message {
	role: MessageRole
	content: string
}

/**
 * Parameters for LLM completion
 */
export interface CompletionParams {
	/** System prompt to set behavior */
	systemPrompt?: string

	/** Conversation messages */
	messages: Message[]

	/** Maximum tokens to generate */
	maxTokens?: number

	/** Temperature for randomness (0-1) */
	temperature?: number

	/** Top-p sampling */
	topP?: number

	/** Stop sequences */
	stopSequences?: string[]

	/** Provider-specific options */
	options?: Record<string, unknown>
}

/**
 * Result from LLM completion
 */
export interface CompletionResult {
	/** Generated content */
	content: string

	/** Stop reason */
	stopReason: "end_turn" | "max_tokens" | "stop_sequence" | "error"

	/** Token usage */
	usage?: {
		inputTokens: number
		outputTokens: number
		totalTokens: number
	}

	/** Provider-specific metadata */
	metadata?: Record<string, unknown>
}

/**
 * Streaming chunk from LLM
 */
export interface CompletionChunk {
	/** Content delta */
	delta: string

	/** Whether this is the final chunk */
	done: boolean

	/** Stop reason if done */
	stopReason?: CompletionResult["stopReason"]

	/** Usage info if available */
	usage?: CompletionResult["usage"]
}

/**
 * Provider capabilities
 */
export interface ProviderCapabilities {
	/** Supports streaming */
	streaming: boolean

	/** Supports function calling/tools */
	functionCalling: boolean

	/** Supports vision/images */
	vision: boolean

	/** Maximum context window */
	maxContextTokens: number

	/** Maximum output tokens */
	maxOutputTokens: number
}

/**
 * LLM Provider interface
 *
 * Implement this interface to add support for a new LLM provider.
 */
export interface LLMProvider {
	/**
	 * Get provider name
	 */
	getName(): string

	/**
	 * Get provider capabilities
	 */
	getCapabilities(): ProviderCapabilities

	/**
	 * Complete a prompt (non-streaming)
	 * @param params Completion parameters
	 * @returns Completion result
	 */
	complete(params: CompletionParams): Promise<CompletionResult>

	/**
	 * Stream a completion
	 * @param params Completion parameters
	 * @returns Async iterator of chunks
	 */
	streamComplete(params: CompletionParams): AsyncIterableIterator<CompletionChunk>

	/**
	 * Count tokens in text
	 * @param text Text to count
	 * @returns Number of tokens
	 */
	countTokens(text: string): Promise<number>
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
	/** API key */
	apiKey: string

	/** Model name */
	model: string

	/** API endpoint (optional) */
	baseURL?: string

	/** Request timeout in ms */
	timeout?: number

	/** Default parameters */
	defaultParams?: Partial<CompletionParams>
}

/**
 * Base provider class with common functionality
 */
export abstract class BaseProvider implements LLMProvider {
	protected config: ProviderConfig

	constructor(config: ProviderConfig) {
		this.config = config
	}

	abstract getName(): string
	abstract getCapabilities(): ProviderCapabilities
	abstract complete(params: CompletionParams): Promise<CompletionResult>
	abstract streamComplete(params: CompletionParams): AsyncIterableIterator<CompletionChunk>
	abstract countTokens(text: string): Promise<number>

	/**
	 * Merge default parameters with request parameters
	 */
	protected mergeParams(params: CompletionParams): CompletionParams {
		return {
			...this.config.defaultParams,
			...params,
			options: {
				...this.config.defaultParams?.options,
				...params.options,
			},
		}
	}
}
