# Agent Framework

Reusable agent framework extracted from Roo-Code, enabling agent development in hybrid environments (VSCode extension and standalone terminal/console).

## Overview

This framework provides:

- **Runtime Abstraction**: Write once, run anywhere (VSCode, Terminal, Web)
- **Clean API**: Simple, well-documented interface for agent development
- **Minimal Dependencies**: Core framework has minimal dependencies
- **Extensible**: Easy to add custom tools and capabilities
- **Type-Safe**: Full TypeScript support

## Status: Proof of Concept

This is currently a **proof-of-concept** demonstrating the architecture and abstraction layer. Full implementation requires integrating:

- `src/api` - LLM provider abstraction (40+ providers)
- `src/core/tools` - Tool system (file ops, commands, search, etc.)
- `src/core/prompts` - Dynamic prompt generation
- `src/core/task` - Full task orchestration engine

See [FRAMEWORK_ANALYSIS.md](../../FRAMEWORK_ANALYSIS.md) for the complete analysis and transformation plan.

## Architecture

```typescript
interface RuntimeProvider {
	// File operations
	readFile(path: string): Promise<string>
	writeFile(path: string, content: string): Promise<void>
	listFiles(path: string): Promise<FileEntry[]>

	// Command execution
	executeCommand(cmd: string): Promise<CommandResult>

	// User interaction
	ask(question: string): Promise<AskResponse>
	say(message: AgentMessage): Promise<void>
	requestToolApproval(request: ToolApprovalRequest): Promise<boolean>

	// Context
	getWorkspacePath(): string
	getCwd(): string
	getEnvironmentDetails(): Promise<EnvironmentDetails>
}
```

## Quick Start

```typescript
import { AgentEngine, TerminalRuntimeProvider } from "@roo-code/agent-framework"

// Create runtime
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
	task: "Create a simple Hello World app in Python",
})
```

## Runtime Providers

### Terminal Runtime Provider

For CLI/console applications:

```typescript
import { TerminalRuntimeProvider } from "@roo-code/agent-framework"

const runtime = new TerminalRuntimeProvider({
	cwd: process.cwd(),
	workspacePath: process.cwd(),
})
```

**Capabilities**:

- ✓ File operations (read, write, list)
- ✓ Command execution
- ✓ User interaction (readline)
- ✗ Browser automation
- ✗ MCP servers
- ✗ Code indexing

### VSCode Runtime Provider

For VSCode extension (planned):

```typescript
import { VSCodeRuntimeProvider } from "@roo-code/runtime-vscode"

const runtime = new VSCodeRuntimeProvider({
	context: vscode.ExtensionContext,
	workspaceFolder: vscode.WorkspaceFolder,
})
```

**Capabilities**:

- ✓ File operations (VSCode FS API)
- ✓ Command execution (VSCode Terminal API)
- ✓ User interaction (VSCode UI)
- ✓ Browser automation
- ✓ MCP servers
- ✓ Code indexing

## Custom Runtime Providers

Create your own runtime provider:

```typescript
import { BaseRuntimeProvider } from "@roo-code/agent-framework"

class MyCustomRuntime extends BaseRuntimeProvider {
	getCapabilities() {
		return {
			canReadFiles: true,
			canWriteFiles: true,
			// ... other capabilities
		}
	}

	async readFile(path: string): Promise<string> {
		// Your implementation
	}

	// ... implement other methods
}
```

## API

### AgentEngine

Main agent orchestration class.

```typescript
class AgentEngine {
	constructor(config: AgentConfig)
	execute(options: { task: string; autoApprove?: boolean }): Promise<TaskResult>
	getCapabilities(): RuntimeCapabilities
}
```

### AgentConfig

```typescript
interface AgentConfig {
	runtime: RuntimeProvider
	apiProvider: string
	apiKey: string
	model: string
	mode?: string
	autoApprove?: boolean
	maxIterations?: number
}
```

### TaskResult

```typescript
interface TaskResult {
	status: "completed" | "failed" | "cancelled"
	message?: string
	iterations?: number
}
```

## Examples

See the [examples](../../examples/) directory for:

- `simple-agent` - Basic terminal agent
- More examples coming soon...

## Development

```bash
# Build the framework
pnpm build

# Clean build artifacts
pnpm clean
```

## Roadmap

### Phase 1 (Current - PoC)

- [x] Runtime abstraction layer
- [x] Terminal runtime provider
- [x] Simple agent engine
- [x] Basic example

### Phase 2 (Next)

- [ ] Integrate with src/api for real LLM support
- [ ] Integrate with src/core/tools for tool system
- [ ] Add streaming support
- [ ] Create VSCode runtime provider
- [ ] Add more examples

### Phase 3 (Future)

- [ ] MCP server support
- [ ] Browser automation
- [ ] Code indexing
- [ ] Checkpoint/restore
- [ ] Plugin system

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

Apache 2.0 © 2025 Roo Code, Inc.

## Related Documentation

- [Framework Analysis](../../FRAMEWORK_ANALYSIS.md) - Detailed analysis and transformation plan
- [Main README](../../README.md) - Roo-Code project overview
- [Examples](../../examples/) - Example agents using the framework
