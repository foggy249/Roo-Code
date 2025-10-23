# Roo-Code Framework - Layered Customization Architecture

## Overview

This document describes the multi-layer customization architecture that allows developers to customize at any level, from low-level LLM calls to high-level agent applications.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 5: Agent Applications                                │
│  Full agentic loop with tools, memory, planning             │
│  Customization: Agent config, tool selection, modes         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: LLM Applications (No Agentic Loop)                │
│  Single LLM call with prompts, no tool execution            │
│  Customization: Prompts, model selection, parameters        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: LLM Orchestration                                 │
│  Message management, conversation history, streaming        │
│  Customization: Message formatting, history strategies      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: LLM Provider Abstraction                          │
│  Provider-specific API calls, authentication                │
│  Customization: Provider selection, API keys, endpoints     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: HTTP/Network Layer                                │
│  Raw HTTP requests to LLM APIs                              │
│  Customization: Request interceptors, retry logic           │
└─────────────────────────────────────────────────────────────┘
```

## Layer 1: HTTP/Network Layer

**Purpose**: Raw HTTP communication with LLM APIs

**Customization Points**:

```typescript
interface HttpClient {
	request(config: RequestConfig): Promise<Response>

	// Interceptors for request/response modification
	addRequestInterceptor(interceptor: RequestInterceptor): void
	addResponseInterceptor(interceptor: ResponseInterceptor): void

	// Retry configuration
	setRetryPolicy(policy: RetryPolicy): void
}

// Usage: Custom retry logic
const client = new HttpClient()
client.setRetryPolicy({
	maxRetries: 3,
	backoff: "exponential",
	retryableStatuses: [429, 500, 502, 503, 504],
})
```

**Use Cases**:

- Custom authentication schemes
- Request/response logging
- Rate limiting
- Proxy configuration
- Custom retry strategies

## Layer 2: LLM Provider Abstraction

**Purpose**: Unified interface for all LLM providers

**Customization Points**:

```typescript
interface LLMProvider {
	// Single completion call
	complete(params: CompletionParams): Promise<CompletionResult>

	// Streaming completion
	streamComplete(params: CompletionParams): AsyncIterator<CompletionChunk>

	// Token counting
	countTokens(text: string): Promise<number>

	// Provider-specific features
	getCapabilities(): ProviderCapabilities
}

// Usage: Direct LLM calls without framework
const provider = new AnthropicProvider({
	apiKey: process.env.ANTHROPIC_API_KEY,
	model: "claude-3-5-sonnet-20241022",
})

const result = await provider.complete({
	systemPrompt: "You are a helpful assistant",
	messages: [{ role: "user", content: "Hello!" }],
	maxTokens: 1000,
	temperature: 0.7,
})
```

**Use Cases**:

- Direct LLM API access
- Custom model parameters
- Provider-specific features
- A/B testing different providers
- Fallback strategies

## Layer 3: LLM Orchestration

**Purpose**: Manage conversations, history, and message flow

**Customization Points**:

```typescript
interface LLMOrchestrator {
	// Conversation management
	createConversation(config: ConversationConfig): Conversation

	// Message handling
	addMessage(conversation: Conversation, message: Message): void
	getHistory(conversation: Conversation): Message[]

	// Context window management
	manageContext(conversation: Conversation, strategy: ContextStrategy): void

	// Streaming
	streamResponse(conversation: Conversation, onChunk: (chunk: string) => void): Promise<Message>
}

// Usage: LLM application without tools
const orchestrator = new LLMOrchestrator({
	provider,
	contextStrategy: "sliding-window",
	maxTokens: 4000,
})

const conversation = orchestrator.createConversation({
	systemPrompt: "You are a code reviewer",
	temperature: 0.3,
})

orchestrator.addMessage(conversation, {
	role: "user",
	content: "Review this code: ...",
})

const response = await orchestrator.streamResponse(conversation, (chunk) => console.log(chunk))
```

**Use Cases**:

- Multi-turn conversations
- Context window management
- Custom message formatting
- Conversation persistence
- Streaming responses

## Layer 4: LLM Applications (No Agentic Loop)

**Purpose**: Single-shot LLM applications without tool execution

**Customization Points**:

```typescript
interface LLMApplication {
	// Single request-response
	execute(input: ApplicationInput): Promise<ApplicationOutput>

	// Batch processing
	executeBatch(inputs: ApplicationInput[]): Promise<ApplicationOutput[]>

	// Custom prompt templates
	setPromptTemplate(template: PromptTemplate): void

	// Output formatting
	setOutputFormatter(formatter: OutputFormatter): void
}

// Usage: Specialized LLM applications
const codeReviewer = new LLMApplication({
	orchestrator,
	promptTemplate: `
    You are a code reviewer. Review the following code:
    
    {code}
    
    Provide:
    1. Issues found
    2. Suggestions for improvement
    3. Overall rating
  `,
	outputFormatter: "structured-json",
})

const review = await codeReviewer.execute({
	code: "function foo() { ... }",
})
```

**Use Cases**:

- Code review
- Text generation
- Translation
- Summarization
- Classification
- Question answering
- Any single-shot LLM task

## Layer 5: Agent Applications

**Purpose**: Full agentic loop with tools, planning, and execution

**Customization Points**:

```typescript
interface AgentApplication {
	// Full agent execution
	execute(task: string, config?: AgentConfig): Promise<AgentResult>

	// Tool registration
	registerTool(tool: Tool): void
	registerTools(tools: Tool[]): void

	// Mode selection
	setMode(mode: AgentMode): void

	// Execution hooks
	onToolUse(callback: ToolUseCallback): void
	onIteration(callback: IterationCallback): void

	// Execution control
	pause(): void
	resume(): void
	cancel(): void
}

// Usage: Full agent with customization
const agent = new AgentApplication({
	orchestrator,
	runtime,
	tools: [readFileTool, writeFileTool, executeCommandTool, customTool],
	mode: "code",
	maxIterations: 50,
})

// Add custom tool
agent.registerTool({
	name: "analyze_sentiment",
	description: "Analyze sentiment of text",
	parameters: { text: "string" },
	execute: async (params) => {
		// Custom implementation
		return { sentiment: "positive", confidence: 0.9 }
	},
})

// Hook into execution
agent.onToolUse((tool, params, result) => {
	console.log(`Tool ${tool} executed with result:`, result)
})

const result = await agent.execute("Build a web scraper")
```

**Use Cases**:

- Complex multi-step tasks
- File system operations
- Command execution
- Code generation
- Project scaffolding
- Automated workflows

## Customization Patterns

### Pattern 1: Layer Skipping

Use any layer directly without going through upper layers:

```typescript
// Skip to Layer 2 for direct LLM access
const provider = new AnthropicProvider(config)
const result = await provider.complete({ ... })

// Skip to Layer 3 for conversation management
const orchestrator = new LLMOrchestrator({ provider })
const conversation = orchestrator.createConversation({ ... })

// Skip to Layer 4 for single-shot applications
const app = new LLMApplication({ orchestrator })
const output = await app.execute({ ... })

// Full Layer 5 for agents
const agent = new AgentApplication({ orchestrator, runtime })
const result = await agent.execute('task')
```

### Pattern 2: Layer Composition

Build custom solutions by composing layers:

```typescript
// Custom HTTP client with logging
const httpClient = new HttpClient()
httpClient.addRequestInterceptor((req) => {
	console.log("Request:", req)
	return req
})

// Custom provider with custom client
const provider = new AnthropicProvider({
	httpClient,
	apiKey: "...",
})

// Custom orchestrator with caching
const orchestrator = new CachingOrchestrator({
	provider,
	cache: new RedisCache(),
})

// Custom agent with everything
const agent = new AgentApplication({
	orchestrator,
	runtime,
	tools: customTools,
})
```

### Pattern 3: Middleware/Interceptors

Add behavior at any layer:

```typescript
// Layer 1: HTTP interceptors
httpClient.addRequestInterceptor(authInterceptor)
httpClient.addResponseInterceptor(loggingInterceptor)

// Layer 2: Provider wrappers
const wrappedProvider = new ProviderWrapper(provider)
wrappedProvider.beforeComplete((params) => {
	// Modify params
	return params
})

// Layer 3: Orchestrator hooks
orchestrator.onMessageAdded((msg) => {
	// Track messages
})

// Layer 4: Application middleware
app.use(validationMiddleware)
app.use(cachingMiddleware)

// Layer 5: Agent hooks
agent.onToolUse(toolUseLogger)
agent.onIteration(iterationCounter)
```

### Pattern 4: Custom Implementations

Replace any layer with custom implementation:

```typescript
// Custom provider for proprietary LLM
class MyLLMProvider implements LLMProvider {
	async complete(params: CompletionParams): Promise<CompletionResult> {
		// Custom implementation
	}
}

// Custom orchestrator with special logic
class SmartOrchestrator implements LLMOrchestrator {
	createConversation(config: ConversationConfig): Conversation {
		// Custom conversation management
	}
}

// Custom runtime for special environment
class KubernetesRuntime implements RuntimeProvider {
	async executeCommand(cmd: string): Promise<CommandResult> {
		// Execute in K8s pod
	}
}
```

## Configuration Inheritance

Each layer can inherit and override configuration:

```typescript
// Base configuration
const baseConfig = {
	temperature: 0.7,
	maxTokens: 2000,
}

// Layer 2: Provider-specific overrides
const provider = new AnthropicProvider({
	...baseConfig,
	model: "claude-3-5-sonnet-20241022",
})

// Layer 3: Orchestrator overrides
const orchestrator = new LLMOrchestrator({
	provider,
	...baseConfig,
	temperature: 0.5, // Override
})

// Layer 4: Application overrides
const app = new LLMApplication({
	orchestrator,
	...baseConfig,
	maxTokens: 4000, // Override
})

// Layer 5: Agent overrides
const agent = new AgentApplication({
	orchestrator,
	runtime,
	...baseConfig,
	temperature: 0.3, // Override
	maxIterations: 50, // Agent-specific
})
```

## Benefits

### 1. **Flexibility**

- Use any layer independently
- Mix and match components
- Custom implementations at any level

### 2. **Progressive Enhancement**

- Start simple (Layer 2 direct LLM calls)
- Add complexity as needed (Layer 3 orchestration)
- Full agent capabilities when required (Layer 5)

### 3. **Testability**

- Mock/stub any layer for testing
- Test components in isolation
- Integration testing at any level

### 4. **Maintainability**

- Clear separation of concerns
- Each layer has specific responsibility
- Easy to understand and modify

### 5. **Extensibility**

- Add new providers at Layer 2
- Add new tools at Layer 5
- Add middleware at any layer
- Custom implementations anywhere

## Examples

### Example 1: Simple LLM Call (Layer 2)

```typescript
import { AnthropicProvider } from "@roo-code/framework"

const provider = new AnthropicProvider({
	apiKey: process.env.ANTHROPIC_API_KEY,
	model: "claude-3-5-sonnet-20241022",
})

const result = await provider.complete({
	systemPrompt: "You are a helpful assistant",
	messages: [{ role: "user", content: "What is TypeScript?" }],
})

console.log(result.content)
```

### Example 2: Conversation (Layer 3)

```typescript
import { LLMOrchestrator, AnthropicProvider } from "@roo-code/framework"

const provider = new AnthropicProvider(config)
const orchestrator = new LLMOrchestrator({ provider })

const conversation = orchestrator.createConversation({
	systemPrompt: "You are a code assistant",
})

// Multi-turn conversation
orchestrator.addMessage(conversation, {
	role: "user",
	content: "How do I create a React component?",
})

const response1 = await orchestrator.getResponse(conversation)
console.log(response1)

orchestrator.addMessage(conversation, {
	role: "user",
	content: "Can you show an example?",
})

const response2 = await orchestrator.getResponse(conversation)
console.log(response2)
```

### Example 3: LLM Application (Layer 4)

```typescript
import { LLMApplication } from "@roo-code/framework"

const summarizer = new LLMApplication({
	orchestrator,
	promptTemplate: `
    Summarize the following text in 3 bullet points:
    
    {text}
  `,
})

const summary = await summarizer.execute({
	text: longArticle,
})
```

### Example 4: Full Agent (Layer 5)

```typescript
import { AgentApplication, TerminalRuntime } from "@roo-code/framework"

const agent = new AgentApplication({
	orchestrator,
	runtime: new TerminalRuntime(),
	tools: [readFile, writeFile, executeCommand],
	mode: "code",
})

const result = await agent.execute("Create a REST API for a todo list application")
```

### Example 5: Custom Stack

```typescript
// Build completely custom stack
const httpClient = new CustomHttpClient()
const provider = new MyLLMProvider({ httpClient })
const orchestrator = new SmartOrchestrator({ provider })
const runtime = new DockerRuntime()
const agent = new AgentApplication({
	orchestrator,
	runtime,
	tools: myCustomTools,
})
```

## Migration Path

### From Current Framework

The current framework operates at Layer 5 (Agent). To use lower layers:

```typescript
// Current (Layer 5)
const agent = new AgentEngine({ runtime, ... })

// New - Layer 2 (Direct LLM)
const provider = agent.getProvider()
const result = await provider.complete({ ... })

// New - Layer 3 (Orchestration)
const orchestrator = agent.getOrchestrator()
const conversation = orchestrator.createConversation({ ... })

// New - Layer 4 (LLM App)
const app = new LLMApplication({ orchestrator: agent.getOrchestrator() })
```

### Adding to Existing Code

The layered architecture is additive:

```typescript
// Existing agent code still works
const agent = new AgentEngine({ runtime, ... })
await agent.execute({ task: '...' })

// New capabilities available
agent.getProvider().complete({ ... })  // Layer 2
agent.getOrchestrator()...             // Layer 3
agent.asLLMApplication()...            // Layer 4
```

## Conclusion

This layered architecture provides:

- **Flexibility**: Use any layer independently
- **Customization**: Customize at any level
- **Progressive complexity**: Start simple, add complexity as needed
- **Separation of concerns**: Each layer has clear responsibility
- **Extensibility**: Easy to add new capabilities
- **Testability**: Test at any layer
- **Maintainability**: Clear structure and interfaces

Developers can choose the appropriate layer for their use case, from simple LLM calls to full agentic applications.

---

**Version**: 2.0  
**Last Updated**: 2025-10-23  
**Status**: Architecture Design
