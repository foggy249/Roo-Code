# Simple Agent Example

This example demonstrates the Roo-Code agent framework running in a standalone terminal environment, independent of VSCode.

## What This Demonstrates

This proof-of-concept shows:

1. **Runtime Abstraction**: The framework uses a `RuntimeProvider` interface that can be implemented for different environments (VSCode, Terminal, Web, etc.)

2. **Hybrid Execution**: The same agent code can run in both VSCode extension and standalone terminal

3. **Clean API**: Simple, documented interface for creating and running agents

4. **Minimal Dependencies**: The framework core has minimal dependencies

## Running the Example

```bash
# From the repository root
cd examples/simple-agent

# Install dependencies (if not already done)
pnpm install

# Run the demo
pnpm start

# Run the test suite
pnpm test

# Or with a custom task
pnpm start "List all TypeScript files in the current directory"
```

## Testing

The example includes a comprehensive test suite that validates:

- ✅ Runtime capabilities
- ✅ File operations (read, write, list, exists)
- ✅ Command execution
- ✅ Environment detection
- ✅ Path resolution
- ✅ Agent engine instantiation
- ✅ Agent execution

Run tests with:

```bash
pnpm test
```

All tests should pass, demonstrating that the framework is working correctly.

## What You'll See

The example will:

1. Display runtime capabilities
2. Show agent configuration
3. Execute a simple task demonstration
4. Display results

**Note**: This is a minimal demonstration. The full agent implementation requires integration with:

- `src/api` for LLM provider handling
- `src/core/tools` for tool execution
- `src/core/prompts` for prompt generation
- `src/core/task` for full orchestration

## Code Overview

```typescript
import { AgentEngine, TerminalRuntimeProvider } from "@roo-code/agent-framework"

// Create runtime for terminal environment
const runtime = new TerminalRuntimeProvider({
	cwd: process.cwd(),
	workspacePath: process.cwd(),
})

// Create agent
const agent = new AgentEngine({
	runtime,
	apiProvider: "anthropic",
	apiKey: process.env.ANTHROPIC_API_KEY,
	model: "claude-3-5-sonnet-20241022",
	mode: "code",
})

// Execute task
const result = await agent.execute({
	task: "Your task here",
})
```

## Next Steps

To build a fully functional agent:

1. **Integrate API Layer**: Connect `@roo-code/agent-framework` with `src/api` to enable real LLM interactions

2. **Add Tool System**: Integrate with `src/core/tools` to enable file operations, command execution, etc.

3. **Add Prompt Generation**: Use `src/core/prompts` for dynamic system prompt generation based on mode and capabilities

4. **Add Streaming**: Support streaming responses for real-time feedback

5. **Add MCP Support**: Integrate Model Context Protocol servers

6. **Add Checkpoints**: Support task checkpointing and restoration

See [FRAMEWORK_ANALYSIS.md](../../FRAMEWORK_ANALYSIS.md) for the complete transformation plan.

## Framework Architecture

```
┌─────────────────────────────────────────┐
│       Application (Your Agent)          │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Agent Framework                 │
│  ┌────────────┐  ┌──────────────┐      │
│  │   Engine   │  │ Tool System  │      │
│  └────────────┘  └──────────────┘      │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│      Runtime Abstraction                │
│  ┌─────────┐  ┌──────────┐             │
│  │ VSCode  │  │ Terminal │             │
│  └─────────┘  └──────────┘             │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│          API Layer                      │
│    (LLM Provider Abstraction)           │
└─────────────────────────────────────────┘
```

## License

Apache 2.0 © 2025 Roo Code, Inc.
