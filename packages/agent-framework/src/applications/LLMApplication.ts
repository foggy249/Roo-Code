/**
 * Layer 4: LLM Applications
 *
 * Single-shot LLM applications without tool execution or agentic loop.
 * Use this for specialized tasks like code review, translation, etc.
 */

import { LLMOrchestrator, ConversationConfig } from "../orchestration/LLMOrchestrator"

/**
 * Prompt template with placeholders
 */
export type PromptTemplate = string

/**
 * Input for LLM application
 */
export type ApplicationInput = Record<string, unknown>

/**
 * Output from LLM application
 */
export interface ApplicationOutput {
	/** Generated content */
	content: string

	/** Raw LLM response */
	rawResponse: string

	/** Processing time in ms */
	processingTime: number

	/** Metadata */
	metadata?: Record<string, unknown>
}

/**
 * Output formatter type
 */
export type OutputFormat = "text" | "json" | "markdown" | "custom"

/**
 * Application configuration
 */
export interface ApplicationConfig {
	/** LLM orchestrator */
	orchestrator: LLMOrchestrator

	/** Prompt template */
	promptTemplate: PromptTemplate

	/** System prompt (optional) */
	systemPrompt?: string

	/** Output format */
	outputFormat?: OutputFormat

	/** Custom output parser */
	outputParser?: (response: string) => unknown

	/** Temperature */
	temperature?: number

	/** Max tokens */
	maxTokens?: number
}

/**
 * LLM Application
 *
 * Single-shot LLM applications for specific tasks.
 * No tool execution, no agentic loop, just prompt -> response.
 */
export class LLMApplication {
	private orchestrator: LLMOrchestrator
	private config: ApplicationConfig

	constructor(config: ApplicationConfig) {
		this.orchestrator = config.orchestrator
		this.config = config
	}

	/**
	 * Execute the application
	 */
	async execute(input: ApplicationInput): Promise<ApplicationOutput> {
		const startTime = Date.now()

		// Fill prompt template
		const prompt = this.fillTemplate(this.config.promptTemplate, input)

		// Create conversation
		const conversation = this.orchestrator.createConversation({
			systemPrompt: this.config.systemPrompt || "You are a helpful assistant.",
			temperature: this.config.temperature,
			maxTokens: this.config.maxTokens,
		})

		// Get response
		const response = await this.orchestrator.getResponse(conversation, prompt)

		// Format output
		const content = this.formatOutput(response)

		const processingTime = Date.now() - startTime

		return {
			content,
			rawResponse: response,
			processingTime,
		}
	}

	/**
	 * Execute in streaming mode
	 */
	async *executeStreaming(input: ApplicationInput): AsyncIterableIterator<string> {
		// Fill prompt template
		const prompt = this.fillTemplate(this.config.promptTemplate, input)

		// Create conversation
		const conversation = this.orchestrator.createConversation({
			systemPrompt: this.config.systemPrompt || "You are a helpful assistant.",
			temperature: this.config.temperature,
			maxTokens: this.config.maxTokens,
		})

		// Stream response
		for await (const chunk of this.orchestrator.streamResponse(conversation, prompt)) {
			yield chunk
		}
	}

	/**
	 * Execute batch of inputs
	 */
	async executeBatch(inputs: ApplicationInput[]): Promise<ApplicationOutput[]> {
		const results: ApplicationOutput[] = []

		for (const input of inputs) {
			const result = await this.execute(input)
			results.push(result)
		}

		return results
	}

	/**
	 * Fill template with input values
	 */
	private fillTemplate(template: PromptTemplate, input: ApplicationInput): string {
		let filled = template

		for (const [key, value] of Object.entries(input)) {
			const placeholder = `{${key}}`
			filled = filled.replace(new RegExp(placeholder, "g"), String(value))
		}

		return filled
	}

	/**
	 * Format output based on configuration
	 */
	private formatOutput(response: string): string {
		const format = this.config.outputFormat || "text"

		switch (format) {
			case "json":
				return this.extractJSON(response)

			case "markdown":
				return response // Already markdown

			case "custom":
				if (this.config.outputParser) {
					return String(this.config.outputParser(response))
				}
				return response

			case "text":
			default:
				return response
		}
	}

	/**
	 * Extract JSON from response
	 */
	private extractJSON(response: string): string {
		// Try to find JSON in the response
		const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/\{[\s\S]*\}/)

		if (jsonMatch) {
			return jsonMatch[1] || jsonMatch[0]
		}

		return response
	}
}

/**
 * Pre-built LLM Applications
 */

/**
 * Code review application
 */
export class CodeReviewApplication extends LLMApplication {
	constructor(orchestrator: LLMOrchestrator) {
		super({
			orchestrator,
			systemPrompt: "You are an expert code reviewer.",
			promptTemplate: `Review the following code and provide feedback:

Language: {language}
Code:
\`\`\`{language}
{code}
\`\`\`

Provide:
1. Issues found (bugs, security, performance)
2. Suggestions for improvement
3. Overall code quality rating (1-10)

Format your response as structured feedback.`,
			temperature: 0.3,
			outputFormat: "markdown",
		})
	}
}

/**
 * Text summarization application
 */
export class SummarizationApplication extends LLMApplication {
	constructor(orchestrator: LLMOrchestrator) {
		super({
			orchestrator,
			systemPrompt: "You are a text summarization expert.",
			promptTemplate: `Summarize the following text in {bulletPoints} concise bullet points:

{text}

Summary:`,
			temperature: 0.5,
			outputFormat: "markdown",
		})
	}
}

/**
 * Translation application
 */
export class TranslationApplication extends LLMApplication {
	constructor(orchestrator: LLMOrchestrator) {
		super({
			orchestrator,
			systemPrompt: "You are a professional translator.",
			promptTemplate: `Translate the following text from {sourceLang} to {targetLang}:

{text}

Translation:`,
			temperature: 0.3,
			outputFormat: "text",
		})
	}
}

/**
 * Question answering application
 */
export class QAApplication extends LLMApplication {
	constructor(orchestrator: LLMOrchestrator) {
		super({
			orchestrator,
			systemPrompt: "You are a knowledgeable assistant that provides accurate answers.",
			promptTemplate: `Answer the following question:

{question}

Provide a clear and concise answer.`,
			temperature: 0.7,
			outputFormat: "text",
		})
	}
}
