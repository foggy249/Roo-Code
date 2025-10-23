# Layered Architecture Demonstration

This example demonstrates the multi-layer architecture of the Roo-Code framework, showing how each layer can be used independently or in combination.

## Layers

### Layer 1: HTTP/Network (Future)

Low-level HTTP requests to LLM APIs. Not yet implemented.

### Layer 2: LLM Provider Abstraction

Direct access to LLM APIs without framework overhead.

```typescript
const provider = new MockProvider({ model: "mock-model" })
const result = await provider.complete({
	systemPrompt: "You are helpful",
	messages: [{ role: "user", content: "Hello!" }],
})
```

### Layer 3: LLM Orchestration

Conversation management and message history.

```typescript
const orchestrator = new LLMOrchestrator({ provider })
const conversation = orchestrator.createConversation({
	systemPrompt: "You are a coding assistant",
})
const response = await orchestrator.getResponse(conversation, "What is React?")
```

### Layer 4: LLM Applications

Single-shot LLM applications without tools or agentic loop.

```typescript
const codeReviewer = new CodeReviewApplication(orchestrator)
const review = await codeReviewer.execute({
	language: "typescript",
	code: "function add(a, b) { return a + b }",
})
```

### Layer 5: Agent Applications

Full agentic loop with tools and planning.

```typescript
const agent = new AgentEngine({
	runtime,
	provider,
	tools: [readFileTool, writeFileTool],
})
const result = await agent.execute({ task: "Create a hello.txt file" })
```

## Running Examples

```bash
# Install dependencies
cd examples/layered-demo
pnpm install

# Run comprehensive demo showing all layers
pnpm run all

# Run individual layer examples (when available)
pnpm run layer2  # Direct provider access
pnpm run layer3  # Orchestration
pnpm run layer4  # LLM applications
pnpm run layer5  # Full agent
```

## Key Benefits

1. **Use any layer independently** - Don't need the full framework for simple tasks
2. **Access lower layers from upper layers** - Agent can access provider and orchestrator
3. **Progressive enhancement** - Start simple, add complexity as needed
4. **Custom implementations** - Replace any layer with your own

## Documentation

See [LAYERED_ARCHITECTURE.md](../../LAYERED_ARCHITECTURE.md) for complete documentation of the layered architecture design.
