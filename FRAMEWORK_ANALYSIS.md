# Roo-Code Framework Analysis and Transformation Plan

## Executive Summary

This document provides a comprehensive analysis of the Roo-Code codebase to extract a reusable agent framework that can execute in hybrid environments (both VSCode extension runtime and lean terminal console). The goal is to create building blocks for custom agents and LLM applications while minimizing complexity.

## 1. Codebase Architecture Overview

### 1.1 Project Structure

```
Roo-Code/
├── src/                          # Main VSCode extension source
│   ├── core/                     # Core agent functionality ⭐
│   │   ├── task/                 # Task orchestration engine
│   │   ├── tools/                # Tool implementations
│   │   ├── prompts/              # System prompt generation
│   │   ├── assistant-message/    # Message parsing
│   │   ├── context/              # Context management
│   │   ├── diff/                 # Diff strategies
│   │   └── ...
│   ├── api/                      # LLM provider abstraction ⭐
│   ├── services/                 # High-level services
│   │   ├── mcp/                  # Model Context Protocol
│   │   ├── browser/              # Browser automation
│   │   └── code-index/           # Code indexing
│   ├── integrations/             # VSCode-specific integrations
│   │   ├── terminal/             # Terminal integration
│   │   └── editor/               # Editor integration
│   ├── extension.ts              # VSCode extension entry point
│   └── ...
├── packages/                     # Shared packages
│   ├── types/                    # Type definitions ⭐
│   ├── ipc/                      # IPC communication ⭐
│   ├── cloud/                    # Cloud services
│   ├── telemetry/                # Analytics
│   └── evals/                    # Evaluation framework (includes CLI) ⭐
├── webview-ui/                   # React UI for VSCode
└── ...

⭐ = Critical for framework extraction
```

### 1.2 Major Components

#### 1.2.1 Task Engine (`src/core/task/Task.ts`)

- **Purpose**: Orchestrates the entire agent execution lifecycle
- **Responsibilities**:
    - LLM conversation management
    - Tool execution coordination
    - Context window management
    - Streaming response handling
    - Checkpoint/restore functionality
- **Key Features**:
    - Event-driven architecture (extends EventEmitter)
    - Conversation history management (apiConversationHistory, clineMessages)
    - Tool usage tracking and repetition detection
    - Mode switching (Code, Architect, Ask, Debug modes)
    - Checkpoint system for state management
- **Dependencies**: Heavy VSCode coupling through ClineProvider

#### 1.2.2 Tool System (`src/core/tools/`)

- **Architecture**: Modular, function-based tools
- **Key Tools**:
    - `readFileTool.ts` - File reading
    - `writeToFileTool.ts` - File writing
    - `executeCommandTool.ts` - Command execution
    - `applyDiffTool.ts` - Code modifications
    - `searchFilesTool.ts` - File search
    - `codebaseSearchTool.ts` - Semantic search
    - `useMcpToolTool.ts` - MCP tool integration
    - `browserActionTool.ts` - Browser automation
- **Pattern**: Each tool is a TypeScript function that:
    1. Receives tool parameters
    2. Validates input
    3. Executes action
    4. Returns result to LLM

#### 1.2.3 API Layer (`src/api/`)

- **Purpose**: Abstract LLM provider interactions
- **Structure**:
    ```typescript
    interface ApiHandler {
    	createMessage(systemPrompt, messages, metadata): ApiStream
    	getModel(): { id; info }
    	countTokens(content): Promise<number>
    }
    ```
- **Providers Supported**: 40+ providers including:
    - Anthropic, OpenAI, Azure, AWS Bedrock
    - Google Gemini, Vertex AI
    - Open source: Ollama, LM Studio
    - Aggregators: OpenRouter, Unbound, etc.
- **Key Feature**: Unified interface for all providers with streaming support

#### 1.2.4 System Prompt Generation (`src/core/prompts/`)

- **Purpose**: Dynamically generate system prompts based on mode and capabilities
- **Components**:
    - Mode-specific instructions (Code, Architect, Ask, Debug)
    - Tool descriptions
    - MCP server integration
    - Custom instructions
- **Flexibility**: Supports custom modes and prompt components

#### 1.2.5 Types Package (`packages/types/`)

- **Purpose**: Shared TypeScript type definitions
- **Key Exports**:
    - Message types (ClineMessage, ClineSay, ClineAsk)
    - Task types (TaskStatus, TaskMetadata)
    - Tool types (ToolName, ToolUsage)
    - Provider settings
    - Event types
- **Benefit**: Strong typing for all framework components

#### 1.2.6 IPC Package (`packages/ipc/`)

- **Purpose**: Inter-process communication
- **Use Case**: Enables communication between VSCode extension and external processes
- **Architecture**: Client-server model using node-ipc
- **Relevance**: Could enable hybrid execution model

#### 1.2.7 Evals Package (`packages/evals/`)

- **Purpose**: Evaluation framework for testing agent performance
- **CLI Entry**: `packages/evals/src/cli/index.ts`
- **Key Insight**: Demonstrates standalone agent execution
- **Structure**:
    - Task runner that executes agent tasks
    - Uses IPC to communicate with VSCode
    - Runs in Docker containers for isolation

## 2. Agent Execution Flow

### 2.1 High-Level Flow

```
User Input → Task Creation → LLM Request → Response Parsing → Tool Execution → Loop
     ↓                                                               ↓
  Context                                                        Result
  Building                                                     Feedback
```

### 2.2 Detailed Flow

#### Step 1: Task Initialization

1. User provides task description and/or images
2. `Task` instance created with:
    - API configuration (model, provider)
    - Mode selection (Code, Architect, etc.)
    - Workspace path
    - Feature flags (diff, checkpoints, bridge)

#### Step 2: Context Building

1. Load system prompt based on mode
2. Add environment details (OS, shell, cwd)
3. Include tool descriptions
4. Add MCP server information (if available)
5. Process user mentions (@file, @folder, @url)
6. Add conversation history (if continuing)

#### Step 3: LLM Request

1. Build API message format:
    ```typescript
    {
      systemPrompt: string,
      messages: MessageParam[], // User + Assistant history
      metadata: { taskId, mode, previousResponseId }
    }
    ```
2. Send to API handler
3. Receive streaming response

#### Step 4: Response Processing

1. Parse streaming response chunks
2. Extract:
    - Thinking/reasoning content
    - Tool use requests
    - Text responses
3. Present to user via provider

#### Step 5: Tool Execution

1. Validate tool request
2. Check permissions (auto-approve or ask user)
3. Execute tool function
4. Capture result
5. Add tool result to conversation history

#### Step 6: Loop

1. If tool was executed, return to Step 3
2. If completion attempted, evaluate:
    - Are there open TODOs?
    - Was task successful?
3. Either continue or mark task complete

### 2.3 Standalone CLI Execution Path

The evals package demonstrates standalone execution:

```
CLI Entry (evals/cli/index.ts)
    ↓
Task Runner (evals/cli/runTask.ts)
    ↓
IPC Client Connection
    ↓
VSCode Extension (via IPC)
    ↓
Task Execution
    ↓
Results back via IPC
```

**Key Limitations**:

- Still requires VSCode extension running
- IPC dependency creates coupling
- Not truly standalone

## 3. Dependencies Analysis

### 3.1 Core Dependencies (Essential for Framework)

#### LLM Libraries

- `@anthropic-ai/sdk` - Anthropic API
- `openai` - OpenAI API
- `ollama` - Ollama API
- `@google/genai` - Google Gemini
- Various provider SDKs

#### Utilities

- `axios` - HTTP requests
- `zod` - Schema validation
- `tiktoken` - Token counting
- `diff` - Text diffing
- `ignore` - .gitignore parsing

#### MCP

- `@modelcontextprotocol/sdk` - MCP support

### 3.2 VSCode Dependencies (Need Abstraction)

- `vscode` - VSCode API (heavily coupled)
- VSCode-specific services:
    - Window management
    - Workspace management
    - File system
    - Terminal integration
    - WebView UI

### 3.3 Heavy Dependencies (Optional/Removable)

- `puppeteer-core` + `puppeteer-chromium-resolver` - Browser automation (55MB+)
- `@qdrant/js-client-rest` - Vector database
- `tree-sitter-wasms` - Code parsing
- `web-tree-sitter` - AST analysis
- Cloud services
- Telemetry

## 4. Extractable Components

### 4.1 Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                       │
│              (Custom Agents, Applications)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Framework Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Task Engine  │  │  Tool System │  │ Prompt Gen   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Runtime Layer                           │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ VSCode       │  │  Terminal    │                        │
│  │ Runtime      │  │  Runtime     │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                              │
│         (Unified LLM Provider Interface)                    │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Core Framework Components

#### Component 1: Agent Engine

**What to Extract**:

- Task orchestration logic (minus VSCode coupling)
- Message/conversation management
- Streaming response handling
- Tool execution coordination
- Context window management

**Dependencies**:

- Types package (full)
- API layer (full)
- Runtime abstraction layer (new)

#### Component 2: Tool System

**What to Extract**:

- All tool implementations
- Tool validation logic
- Permission system (simplified)
- Tool result formatting

**Adaptations Needed**:

- Abstract file system operations
- Abstract command execution
- Abstract terminal operations
- Remove VSCode UI dependencies

#### Component 3: API Layer

**What to Extract**:

- Complete API abstraction (already well-designed)
- All provider handlers
- Streaming support
- Token counting

**Minimal Changes**:

- Remove VSCode-specific logging
- Make telemetry optional

#### Component 4: Prompt System

**What to Extract**:

- System prompt generation
- Mode definitions
- Tool descriptions
- Custom instructions support

**Simplifications**:

- Remove VSCode context dependencies
- Make some sections optional

### 4.3 New Components Needed

#### Component 5: Runtime Abstraction

**Purpose**: Decouple from VSCode
**Interface**:

```typescript
interface RuntimeProvider {
	// File operations
	readFile(path: string): Promise<string>
	writeFile(path: string, content: string): Promise<void>
	listFiles(path: string): Promise<string[]>

	// Terminal operations
	executeCommand(cmd: string): Promise<{ stdout; stderr; exitCode }>

	// User interaction
	ask(question: string): Promise<string>
	say(message: string): Promise<void>

	// Context
	getWorkspacePath(): string
	getCwd(): string
}
```

**Implementations**:

- `VSCodeRuntimeProvider` - For VSCode extension
- `TerminalRuntimeProvider` - For CLI/terminal use
- `TestRuntimeProvider` - For testing

## 5. Transformation Strategy

### 5.1 Principles

1. **Minimal Changes**: Keep modifications surgical to prevent bugs
2. **Backward Compatibility**: Original codebase should still work
3. **Layered Approach**: Extract in layers, not all at once
4. **Test as We Go**: Create tests for extracted components
5. **Progressive Enhancement**: Start simple, add features incrementally

### 5.2 Phased Approach

#### Phase 1: Foundation (This PR)

1. Create analysis document ✓
2. Create runtime abstraction layer
3. Extract types and API layer (already mostly independent)
4. Create simple PoC with terminal runtime

#### Phase 2: Core Engine (Future)

1. Extract task engine with runtime abstraction
2. Extract tool system with runtime adapters
3. Create VSCode runtime provider
4. Ensure original extension still works

#### Phase 3: Advanced Features (Future)

1. Add MCP support to framework
2. Add checkpoint/restore capability
3. Add browser automation (optional)
4. Add code indexing (optional)

### 5.3 File Organization

```
roo-code/
├── packages/
│   ├── agent-framework/          # NEW: Core framework
│   │   ├── src/
│   │   │   ├── engine/           # Task engine
│   │   │   ├── tools/            # Tool system
│   │   │   ├── prompts/          # Prompt generation
│   │   │   ├── runtime/          # Runtime abstraction
│   │   │   └── index.ts
│   │   └── package.json
│   ├── runtime-terminal/         # NEW: Terminal runtime
│   │   └── src/
│   │       └── TerminalRuntimeProvider.ts
│   ├── runtime-vscode/           # NEW: VSCode runtime
│   │   └── src/
│   │       └── VSCodeRuntimeProvider.ts
│   └── ...
├── examples/                     # NEW: Example agents
│   └── simple-agent/
│       └── index.ts
└── ...
```

## 6. Challenges and Solutions

### 6.1 Challenge: Heavy VSCode Coupling

**Problem**: Task engine extensively uses VSCode API
**Solution**: Runtime abstraction layer
**Impact**: Medium effort, high value

### 6.2 Challenge: WebView UI

**Problem**: UI is tightly coupled to VSCode WebView
**Solution**: Make UI optional, provide minimal terminal UI
**Impact**: Low effort for framework (skip complex UI)

### 6.3 Challenge: File System Operations

**Problem**: Uses VSCode file system API
**Solution**: Runtime abstraction with Node.js fs for terminal
**Impact**: Low effort

### 6.4 Challenge: Command Execution

**Problem**: Uses VSCode terminal API
**Solution**: Runtime abstraction with child_process for terminal
**Impact**: Low effort

### 6.5 Challenge: MCP Servers

**Problem**: MCP server management is VSCode-centric
**Solution**: Extract MCP client logic, make server management pluggable
**Impact**: Medium effort

### 6.6 Challenge: Large Dependencies

**Problem**: Browser automation, vector DB, tree-sitter add ~100MB
**Solution**: Make these optional plugins
**Impact**: Low effort (already somewhat modular)

## 7. Proposed Framework API

### 7.1 Simple Usage Example

```typescript
import { AgentEngine, TerminalRuntime } from "@roo-code/agent-framework"
import { TerminalRuntimeProvider } from "@roo-code/runtime-terminal"

// Create runtime
const runtime = new TerminalRuntimeProvider({
	cwd: process.cwd(),
	workspace: process.cwd(),
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
	autoApprove: false, // Require user confirmation for actions
})

console.log("Task completed:", result.status)
```

### 7.2 Advanced Usage

```typescript
import { AgentEngine, TerminalRuntimeProvider, tools, modes } from "@roo-code/agent-framework"

// Custom runtime with overrides
const runtime = new TerminalRuntimeProvider({
	cwd: "/custom/workspace",

	// Override specific operations
	async executeCommand(cmd: string) {
		console.log(`Executing: ${cmd}`)
		// Custom execution logic
		return { stdout: "", stderr: "", exitCode: 0 }
	},
})

// Custom tool set
const customTools = [
	tools.readFile,
	tools.writeFile,
	tools.executeCommand,
	// Skip search tools, browser, etc.
]

// Create agent with custom config
const agent = new AgentEngine({
	runtime,
	apiProvider: "openai",
	apiKey: process.env.OPENAI_API_KEY,
	model: "gpt-4",
	mode: modes.architect,
	tools: customTools,

	// Callbacks
	onToolUse: (tool, params) => {
		console.log(`Tool used: ${tool}`, params)
	},

	onMessage: (message) => {
		console.log("Agent:", message)
	},

	// Options
	maxIterations: 50,
	autoApprove: false,
	enableMcp: false,
})

// Execute with streaming
const stream = agent.executeStream({
	task: "Design a REST API for a blog platform",
})

for await (const chunk of stream) {
	if (chunk.type === "thinking") {
		console.log("Thinking:", chunk.content)
	} else if (chunk.type === "tool_use") {
		console.log("Using tool:", chunk.tool)
	}
}
```

## 8. Next Steps

### Immediate (This PR)

1. ✅ Create this analysis document
2. Create runtime abstraction interface
3. Extract minimal core engine
4. Create terminal runtime provider
5. Build simple PoC agent
6. Document framework usage

### Short Term (Next PRs)

1. Extract full tool system
2. Add more runtime providers
3. Create comprehensive examples
4. Add framework tests
5. Write migration guide

### Long Term (Future)

1. Extract MCP support
2. Add plugin system
3. Create marketplace for tools
4. Build web-based runtime
5. Create framework documentation site

## 9. Success Criteria

### For Framework

- [ ] Can run agent in terminal without VSCode
- [ ] Can use same agent code in VSCode and terminal
- [ ] < 50MB dependencies for minimal setup
- [ ] Clean, documented API
- [ ] Works with major LLM providers
- [ ] Includes 5+ example agents

### For Original Codebase

- [ ] No breaking changes to extension
- [ ] All existing tests pass
- [ ] Performance unchanged
- [ ] Feature parity maintained

## 10. Conclusion

The Roo-Code codebase is well-structured with clear separation between concerns. The main challenge is VSCode coupling, which can be addressed through a runtime abstraction layer. The API layer is already excellent and can be extracted with minimal changes. The tool system is modular and can be adapted with focused modifications.

The proposed framework will enable:

1. **Hybrid Execution**: Same agent code in VSCode and terminal
2. **Clean API**: Simple, well-documented interface
3. **Minimal Complexity**: Remove unnecessary dependencies
4. **Extensibility**: Easy to add custom tools and runtimes
5. **Maintainability**: Changes to framework don't break extension

This transformation is achievable through a phased approach with surgical changes, maintaining the quality and capability of the original codebase while unlocking new use cases.
