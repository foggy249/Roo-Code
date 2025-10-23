# Roo-Code Agent Framework - Comprehensive Usage Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Runtime Providers](#runtime-providers)
6. [Agent Engine](#agent-engine)
7. [Common Patterns](#common-patterns)
8. [Advanced Usage](#advanced-usage)
9. [Troubleshooting](#troubleshooting)
10. [API Reference](#api-reference)
11. [Examples](#examples)

## Introduction

The Roo-Code Agent Framework is a reusable agent framework extracted from Roo-Code that enables agent development in hybrid environments - VSCode extension, terminal/CLI, web browsers, and custom environments.

### Key Features

- **Runtime Abstraction**: Write agent code once, run anywhere
- **Clean API**: Simple, intuitive interface
- **Type Safe**: Full TypeScript support
- **Minimal Dependencies**: Core framework < 5MB
- **Extensible**: Easy to add custom capabilities

### What You'll Learn

This guide will teach you how to:

- Set up and configure the framework
- Create runtime providers for different environments
- Build and execute agents
- Handle user interactions
- Implement custom tools and capabilities
- Debug and troubleshoot issues

## Installation

### Prerequisites

- Node.js 20.x or higher
- pnpm 10.x (recommended) or npm
- TypeScript 5.x

### Install from Workspace

```bash
# From the Roo-Code repository root
cd packages/agent-framework
pnpm build

# In your project
pnpm add @roo-code/agent-framework
```

### Verify Installation

```bash
# Check the framework builds
cd packages/agent-framework && pnpm build

# Run tests
cd ../../examples/simple-agent && pnpm test
```

## Quick Start

### Your First Agent

Create a file `my-agent.ts`:

```typescript
import { AgentEngine, TerminalRuntimeProvider } from "@roo-code/agent-framework"

async function main() {
	// 1. Create a runtime provider
	const runtime = new TerminalRuntimeProvider({
		cwd: process.cwd(),
		workspacePath: process.cwd(),
	})

	// 2. Create the agent
	const agent = new AgentEngine({
		runtime,
		apiProvider: "anthropic",
		apiKey: process.env.ANTHROPIC_API_KEY,
		model: "claude-3-5-sonnet-20241022",
		mode: "code",
	})

	// 3. Execute a task
	const result = await agent.execute({
		task: "Create a Hello World program in Python",
	})

	// 4. Check the result
	console.log("Status:", result.status)
	console.log("Message:", result.message)
}

main().catch(console.error)
```

Run it:

```bash
tsx my-agent.ts
```

## Core Concepts

### 1. Runtime Provider

A **Runtime Provider** abstracts environment-specific operations (file I/O, command execution, user interaction). This enables the same agent code to run in different environments.

```typescript
interface RuntimeProvider {
	// File operations
	readFile(path: string): Promise<string>
	writeFile(path: string, content: string): Promise<void>
	listFiles(path: string, recursive?: boolean): Promise<FileEntry[]>
	fileExists(path: string): Promise<boolean>

	// Command execution
	executeCommand(command: string, cwd?: string): Promise<CommandResult>

	// User interaction
	ask(question: string, options?: AskOptions): Promise<AskResponse>
	say(message: AgentMessage): Promise<void>
	requestToolApproval(request: ToolApprovalRequest): Promise<boolean>

	// Context
	getWorkspacePath(): string
	getCwd(): string
	getEnvironmentDetails(): Promise<EnvironmentDetails>
}
```

### 2. Agent Engine

The **Agent Engine** orchestrates task execution:

- Takes user task input
- Manages LLM interactions
- Coordinates tool execution
- Returns results

```typescript
const agent = new AgentEngine({
	runtime, // Environment adapter
	apiProvider, // LLM provider (anthropic, openai, etc.)
	apiKey, // API key for the provider
	model, // Model name
	mode, // Operating mode (code, architect, ask, debug)
	autoApprove, // Auto-approve tool executions (optional)
	maxIterations, // Max loops (optional)
})
```

### 3. Task Execution

Tasks are executed with the `execute()` method:

```typescript
const result = await agent.execute({
	task: "Your task description",
	autoApprove: false, // Override agent's default
})

// Result contains:
// - status: 'completed' | 'failed' | 'cancelled'
// - message: Optional status message
// - iterations: Number of execution loops
```

## Runtime Providers

### Terminal Runtime Provider

For CLI and console applications.

```typescript
import { TerminalRuntimeProvider } from "@roo-code/agent-framework"

const runtime = new TerminalRuntimeProvider({
	cwd: "/path/to/working/directory",
	workspacePath: "/path/to/workspace",
})

// Capabilities
const capabilities = runtime.getCapabilities()
console.log(capabilities.canReadFiles) // true
console.log(capabilities.canExecuteCommands) // true
console.log(capabilities.supportsBrowser) // false
```

**Capabilities**:

- ✅ File operations (fs/promises)
- ✅ Command execution (child_process)
- ✅ User interaction (readline)
- ✅ Path resolution
- ❌ Browser automation
- ❌ MCP servers
- ❌ Code indexing

### Custom Runtime Provider

Create your own for custom environments:

```typescript
import { BaseRuntimeProvider, RuntimeCapabilities } from "@roo-code/agent-framework"

class MyCustomRuntime extends BaseRuntimeProvider {
	constructor(options: { cwd: string; workspacePath: string }) {
		super(options)
	}

	getCapabilities(): RuntimeCapabilities {
		return {
			canReadFiles: true,
			canWriteFiles: true,
			canListFiles: true,
			canExecuteCommands: true,
			canAskUser: true,
			canShowMessages: true,
			supportsBrowser: false,
			supportsMcp: false,
			supportsTerminal: true,
			supportsCodeIndex: false,
		}
	}

	async readFile(path: string): Promise<string> {
		// Your implementation
		const absolutePath = this.getAbsolutePath(path)
		// Read file using your method
		return content
	}

	async writeFile(path: string, content: string): Promise<void> {
		// Your implementation
	}

	// Implement other required methods...
}
```

### Runtime Provider Best Practices

1. **Always use absolute paths internally**

    ```typescript
    async readFile(path: string): Promise<string> {
      const absolutePath = this.getAbsolutePath(path)
      // Use absolutePath for operations
    }
    ```

2. **Handle errors gracefully**

    ```typescript
    async fileExists(path: string): Promise<boolean> {
      try {
        await fs.access(this.getAbsolutePath(path))
        return true
      } catch {
        return false  // Don't throw, return false
      }
    }
    ```

3. **Respect user permissions**
    ```typescript
    async requestToolApproval(request: ToolApprovalRequest): Promise<boolean> {
      // Always ask user unless autoApprove is set
      const response = await this.ask(
        `Approve ${request.toolName}?`,
        { yesNo: true }
      )
      return response.type === 'yesno' && response.approved
    }
    ```

## Agent Engine

### Configuration

```typescript
interface AgentConfig {
	runtime: RuntimeProvider // Required
	apiProvider: string // Required (e.g., 'anthropic')
	apiKey: string // Required
	model: string // Required
	mode?: string // Optional, default: 'code'
	autoApprove?: boolean // Optional, default: false
	maxIterations?: number // Optional, default: 50
}
```

### Modes

The framework supports different operating modes:

- **code**: Everyday coding, edits, file operations
- **architect**: System planning, specs, migrations
- **ask**: Fast answers, explanations
- **debug**: Issue tracing, logging, root cause analysis

```typescript
const agent = new AgentEngine({
	runtime,
	apiProvider: "anthropic",
	apiKey: process.env.ANTHROPIC_API_KEY,
	model: "claude-3-5-sonnet-20241022",
	mode: "architect", // Use architect mode
})
```

### API Providers

Currently in demo mode. Full integration coming in Phase 1.

Planned support:

- Anthropic (Claude)
- OpenAI (GPT-4, GPT-3.5)
- Google (Gemini)
- Open source (Ollama, LM Studio)
- And 40+ more providers

## Common Patterns

### Pattern 1: Simple Task Execution

```typescript
import { AgentEngine, TerminalRuntimeProvider } from "@roo-code/agent-framework"

async function executeTask(task: string) {
	const runtime = new TerminalRuntimeProvider({
		cwd: process.cwd(),
		workspacePath: process.cwd(),
	})

	const agent = new AgentEngine({
		runtime,
		apiProvider: "anthropic",
		apiKey: process.env.ANTHROPIC_API_KEY!,
		model: "claude-3-5-sonnet-20241022",
	})

	return await agent.execute({ task })
}

// Usage
const result = await executeTask("Create a README.md file")
console.log(result.status) // 'completed'
```

### Pattern 2: Interactive Agent

```typescript
async function interactiveAgent() {
	const runtime = new TerminalRuntimeProvider({
		cwd: process.cwd(),
		workspacePath: process.cwd(),
	})

	const agent = new AgentEngine({
		runtime,
		apiProvider: "anthropic",
		apiKey: process.env.ANTHROPIC_API_KEY!,
		model: "claude-3-5-sonnet-20241022",
		autoApprove: false, // User must approve each action
	})

	while (true) {
		const response = await runtime.ask('Enter task (or "quit" to exit):')

		if (response.type === "text" && response.text.toLowerCase() === "quit") {
			break
		}

		if (response.type === "text") {
			const result = await agent.execute({ task: response.text })
			await runtime.say({
				type: result.status === "completed" ? "success" : "error",
				content: result.message || `Task ${result.status}`,
			})
		}
	}

	runtime.close()
}
```

### Pattern 3: Batch Processing

```typescript
async function batchProcess(tasks: string[]) {
	const runtime = new TerminalRuntimeProvider({
		cwd: process.cwd(),
		workspacePath: process.cwd(),
	})

	const agent = new AgentEngine({
		runtime,
		apiProvider: "anthropic",
		apiKey: process.env.ANTHROPIC_API_KEY!,
		model: "claude-3-5-sonnet-20241022",
		autoApprove: true, // Auto-approve for batch
	})

	const results = []

	for (const task of tasks) {
		await runtime.say({
			type: "info",
			content: `Processing: ${task}`,
		})

		const result = await agent.execute({ task })
		results.push({ task, result })
	}

	return results
}

// Usage
const tasks = ["Create package.json", "Initialize git repository", "Create .gitignore"]

const results = await batchProcess(tasks)
```

### Pattern 4: Custom Runtime with Logging

```typescript
class LoggingRuntimeProvider extends TerminalRuntimeProvider {
	private log(operation: string, details: any) {
		console.log(`[${new Date().toISOString()}] ${operation}:`, details)
	}

	async readFile(path: string): Promise<string> {
		this.log("READ_FILE", { path })
		return await super.readFile(path)
	}

	async writeFile(path: string, content: string): Promise<void> {
		this.log("WRITE_FILE", { path, size: content.length })
		return await super.writeFile(path, content)
	}

	async executeCommand(command: string, cwd?: string): Promise<CommandResult> {
		this.log("EXECUTE_COMMAND", { command, cwd })
		const result = await super.executeCommand(command, cwd)
		this.log("COMMAND_RESULT", { exitCode: result.exitCode })
		return result
	}
}

// Use it
const runtime = new LoggingRuntimeProvider({
	cwd: process.cwd(),
	workspacePath: process.cwd(),
})
```

### Pattern 5: Error Handling

```typescript
async function robustExecution(task: string) {
	const runtime = new TerminalRuntimeProvider({
		cwd: process.cwd(),
		workspacePath: process.cwd(),
	})

	const agent = new AgentEngine({
		runtime,
		apiProvider: "anthropic",
		apiKey: process.env.ANTHROPIC_API_KEY!,
		model: "claude-3-5-sonnet-20241022",
	})

	try {
		const result = await agent.execute({ task })

		if (result.status === "completed") {
			await runtime.say({
				type: "success",
				content: `Task completed: ${result.message}`,
			})
			return result
		} else {
			await runtime.say({
				type: "error",
				content: `Task failed: ${result.message}`,
			})
			throw new Error(`Task ${result.status}`)
		}
	} catch (error) {
		await runtime.say({
			type: "error",
			content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
		})
		throw error
	} finally {
		runtime.close()
	}
}
```

## Advanced Usage

### Creating a CLI Tool

```typescript
#!/usr/bin/env node
import { AgentEngine, TerminalRuntimeProvider } from "@roo-code/agent-framework"
import { Command } from "commander"

const program = new Command()

program.name("my-agent").description("AI agent powered by Roo-Code framework").version("1.0.0")

program
	.command("run")
	.description("Execute a task")
	.argument("<task>", "Task to execute")
	.option("-a, --auto-approve", "Auto-approve all actions")
	.option("-m, --mode <mode>", "Operating mode", "code")
	.action(async (task, options) => {
		const runtime = new TerminalRuntimeProvider({
			cwd: process.cwd(),
			workspacePath: process.cwd(),
		})

		const agent = new AgentEngine({
			runtime,
			apiProvider: "anthropic",
			apiKey: process.env.ANTHROPIC_API_KEY!,
			model: "claude-3-5-sonnet-20241022",
			mode: options.mode,
			autoApprove: options.autoApprove,
		})

		const result = await agent.execute({ task })

		process.exit(result.status === "completed" ? 0 : 1)
	})

program.parse()
```

### Testing Your Agent

```typescript
import { describe, it, expect } from "vitest"
import { AgentEngine, TerminalRuntimeProvider } from "@roo-code/agent-framework"

describe("My Agent", () => {
	it("should execute simple tasks", async () => {
		const runtime = new TerminalRuntimeProvider({
			cwd: "/tmp",
			workspacePath: "/tmp",
		})

		const agent = new AgentEngine({
			runtime,
			apiProvider: "anthropic",
			apiKey: "test-key",
			model: "claude-3-5-sonnet-20241022",
		})

		const result = await agent.execute({
			task: "Test task",
		})

		expect(result.status).toBe("completed")
	})
})
```

## Troubleshooting

### Common Issues

#### 1. "Cannot find module '@roo-code/agent-framework'"

**Cause**: Package not installed or built

**Solution**:

```bash
cd packages/agent-framework
pnpm build
cd ../../your-project
pnpm install
```

#### 2. "API key not provided"

**Cause**: Missing API key configuration

**Solution**:

```bash
export ANTHROPIC_API_KEY=your_key_here
# Or in .env file
echo "ANTHROPIC_API_KEY=your_key_here" >> .env
```

#### 3. "Permission denied" when executing commands

**Cause**: Runtime provider doesn't have necessary permissions

**Solution**:

```typescript
// Make sure commands are in allowed list
const result = await runtime.executeCommand("ls") // Should work
// Avoid dangerous commands without approval
```

#### 4. Type errors with TypeScript

**Cause**: TypeScript definitions not found

**Solution**:

```bash
# Rebuild the framework with declarations
cd packages/agent-framework
pnpm build

# Check dist/ has .d.ts files
ls dist/*.d.ts
```

### Debug Mode

Enable verbose logging:

```typescript
class DebugRuntimeProvider extends TerminalRuntimeProvider {
	async readFile(path: string): Promise<string> {
		console.log(`[DEBUG] Reading file: ${path}`)
		const content = await super.readFile(path)
		console.log(`[DEBUG] File size: ${content.length} bytes`)
		return content
	}

	// Override other methods similarly
}
```

### Getting Help

1. Check the [TESTING_VALIDATION.md](../TESTING_VALIDATION.md) for test results
2. Review [GAPS_AND_NEXT_STEPS.md](../GAPS_AND_NEXT_STEPS.md) for known limitations
3. See [FRAMEWORK_ANALYSIS.md](../FRAMEWORK_ANALYSIS.md) for architecture details
4. Open an issue on GitHub with:
    - Framework version
    - Runtime provider used
    - Minimal reproduction code
    - Error messages and stack traces

## API Reference

### RuntimeProvider Interface

See [RuntimeProvider.ts](../packages/agent-framework/src/runtime/RuntimeProvider.ts) for complete interface.

Key methods:

```typescript
// File operations
readFile(path: string): Promise<string>
writeFile(path: string, content: string): Promise<void>
listFiles(path: string, recursive?: boolean): Promise<FileEntry[]>
fileExists(path: string): Promise<boolean>
getAbsolutePath(relativePath: string): string

// Command execution
executeCommand(command: string, cwd?: string): Promise<CommandResult>

// User interaction
ask(question: string, options?: AskOptions): Promise<AskResponse>
say(message: AgentMessage): Promise<void>
requestToolApproval(request: ToolApprovalRequest): Promise<boolean>

// Context
getWorkspacePath(): string
getCwd(): string
getEnvironmentDetails(): Promise<EnvironmentDetails>
getCapabilities(): RuntimeCapabilities
```

### AgentEngine Class

```typescript
class AgentEngine {
	constructor(config: AgentConfig)

	execute(options: { task: string; autoApprove?: boolean }): Promise<TaskResult>

	getCapabilities(): RuntimeCapabilities
}
```

### Types

```typescript
interface TaskResult {
	status: "completed" | "failed" | "cancelled"
	message?: string
	iterations?: number
}

interface CommandResult {
	stdout: string
	stderr: string
	exitCode: number
}

interface FileEntry {
	name: string
	path: string
	isDirectory: boolean
	isFile: boolean
}

type AskResponse =
	| { type: "text"; text: string }
	| { type: "image"; images: string[] }
	| { type: "text_and_image"; text: string; images: string[] }
	| { type: "yesno"; approved: boolean }

interface AgentMessage {
	type: "info" | "success" | "error" | "warning"
	content: string
}
```

## Examples

See [examples/simple-agent/](../examples/simple-agent/) for:

- `index.ts` - Basic agent execution
- `test.ts` - Comprehensive test suite
- `README.md` - Quick start guide

### Running Examples

```bash
# Basic demo
cd examples/simple-agent
pnpm start

# Run tests
pnpm test

# Custom task
pnpm start "Your custom task here"
```

## Next Steps

1. **Read**: [GAPS_AND_NEXT_STEPS.md](../GAPS_AND_NEXT_STEPS.md) for roadmap
2. **Try**: Run the examples and experiments
3. **Extend**: Create your own runtime provider
4. **Contribute**: See [CONTRIBUTING.md](../CONTRIBUTING.md)

## FAQ

**Q: Is this production-ready?**  
A: Currently it's a proof-of-concept. LLM provider and tool integration needed for production use.

**Q: Which LLM providers are supported?**  
A: Demo mode currently. Full provider support (Anthropic, OpenAI, etc.) coming in Phase 1.

**Q: Can I use this in my VSCode extension?**  
A: Yes, once VSCodeRuntimeProvider is implemented (planned for Phase 2).

**Q: How do I add custom tools?**  
A: Tool system integration is coming in Phase 1. For now, use executeCommand().

**Q: Is there a web version?**  
A: WebRuntimeProvider is planned for Phase 4.

**Q: How do I contribute?**  
A: See the roadmap in GAPS_AND_NEXT_STEPS.md and pick a P0 or P1 item!

---

**Last Updated**: 2025-10-23  
**Framework Version**: 0.1.0 (Proof of Concept)  
**Status**: Documentation Complete

For more information, see:

- [Framework Analysis](../FRAMEWORK_ANALYSIS.md)
- [Transformation Summary](../TRANSFORMATION_SUMMARY.md)
- [Quick Start Guide](../FRAMEWORK_QUICKSTART.md)
- [Testing Report](../TESTING_VALIDATION.md)
