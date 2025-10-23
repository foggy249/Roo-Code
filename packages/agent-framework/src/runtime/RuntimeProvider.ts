/**
 * Runtime abstraction layer for agent framework
 * Decouples agent logic from specific runtime environments (VSCode, Terminal, Web, etc.)
 */

/**
 * Result of a command execution
 */
export interface CommandResult {
	stdout: string
	stderr: string
	exitCode: number
}

/**
 * File system entry information
 */
export interface FileEntry {
	name: string
	path: string
	isDirectory: boolean
	isFile: boolean
}

/**
 * User interaction response types
 */
export type AskResponse =
	| { type: "text"; text: string }
	| { type: "image"; images: string[] }
	| { type: "text_and_image"; text: string; images: string[] }
	| { type: "yesno"; approved: boolean }

/**
 * Message types for agent communication
 */
export interface AgentMessage {
	type: "info" | "success" | "error" | "warning"
	content: string
}

/**
 * Tool execution request for user approval
 */
export interface ToolApprovalRequest {
	toolName: string
	params: Record<string, unknown>
	description: string
}

/**
 * Runtime capabilities flags
 */
export interface RuntimeCapabilities {
	// File system operations
	canReadFiles: boolean
	canWriteFiles: boolean
	canListFiles: boolean

	// Command execution
	canExecuteCommands: boolean

	// User interaction
	canAskUser: boolean
	canShowMessages: boolean

	// Advanced features
	supportsBrowser: boolean
	supportsMcp: boolean
	supportsTerminal: boolean
	supportsCodeIndex: boolean
}

/**
 * Abstract runtime provider interface
 * Implementations provide environment-specific behavior (VSCode, Terminal, Web, etc.)
 */
export interface RuntimeProvider {
	/**
	 * Get runtime capabilities
	 */
	getCapabilities(): RuntimeCapabilities

	// ============================================
	// File System Operations
	// ============================================

	/**
	 * Read a file's contents
	 * @param path Absolute or relative path to file
	 * @returns File contents as string
	 */
	readFile(path: string): Promise<string>

	/**
	 * Write content to a file
	 * @param path Absolute or relative path to file
	 * @param content Content to write
	 */
	writeFile(path: string, content: string): Promise<void>

	/**
	 * List files and directories at a path
	 * @param path Directory path
	 * @param recursive Whether to list recursively
	 * @returns Array of file entries
	 */
	listFiles(path: string, recursive?: boolean): Promise<FileEntry[]>

	/**
	 * Check if a file or directory exists
	 * @param path Path to check
	 */
	fileExists(path: string): Promise<boolean>

	/**
	 * Get absolute path
	 * @param relativePath Relative path
	 * @returns Absolute path
	 */
	getAbsolutePath(relativePath: string): string

	// ============================================
	// Command Execution
	// ============================================

	/**
	 * Execute a shell command
	 * @param command Command to execute
	 * @param cwd Working directory (optional)
	 * @returns Command result with stdout, stderr, exitCode
	 */
	executeCommand(command: string, cwd?: string): Promise<CommandResult>

	// ============================================
	// User Interaction
	// ============================================

	/**
	 * Ask user a question and get response
	 * @param question Question to ask
	 * @param options Optional configuration for the question
	 */
	ask(
		question: string,
		options?: {
			/** Placeholder text for input */
			placeholder?: string
			/** Whether this is a yes/no question */
			yesNo?: boolean
		},
	): Promise<AskResponse>

	/**
	 * Show a message to the user
	 * @param message Message to display
	 */
	say(message: AgentMessage): Promise<void>

	/**
	 * Request approval for a tool execution
	 * @param request Tool approval request
	 * @returns Whether the tool was approved
	 */
	requestToolApproval(request: ToolApprovalRequest): Promise<boolean>

	// ============================================
	// Context Information
	// ============================================

	/**
	 * Get current workspace path
	 */
	getWorkspacePath(): string

	/**
	 * Get current working directory
	 */
	getCwd(): string

	/**
	 * Get environment details (OS, shell, etc.)
	 */
	getEnvironmentDetails(): Promise<{
		os: string
		osVersion: string
		shell: string
		homeDir: string
		username: string
	}>

	// ============================================
	// Advanced Features (Optional)
	// ============================================

	/**
	 * Open a browser and navigate to URL (if supported)
	 * @param url URL to navigate to
	 */
	openBrowser?(url: string): Promise<void>

	/**
	 * Get terminal instance (if supported)
	 */
	getTerminal?(): unknown

	/**
	 * Search codebase (if code indexing is supported)
	 * @param query Search query
	 */
	searchCodebase?(query: string): Promise<string[]>
}

/**
 * Base runtime provider with common functionality
 * Implementations can extend this and override specific methods
 */
export abstract class BaseRuntimeProvider implements RuntimeProvider {
	protected cwd: string
	protected workspacePath: string

	constructor(options: { cwd: string; workspacePath: string }) {
		this.cwd = options.cwd
		this.workspacePath = options.workspacePath
	}

	abstract getCapabilities(): RuntimeCapabilities

	abstract readFile(path: string): Promise<string>
	abstract writeFile(path: string, content: string): Promise<void>
	abstract listFiles(path: string, recursive?: boolean): Promise<FileEntry[]>
	abstract fileExists(path: string): Promise<boolean>
	abstract getAbsolutePath(relativePath: string): string

	abstract executeCommand(command: string, cwd?: string): Promise<CommandResult>

	abstract ask(question: string, options?: { placeholder?: string; yesNo?: boolean }): Promise<AskResponse>
	abstract say(message: AgentMessage): Promise<void>
	abstract requestToolApproval(request: ToolApprovalRequest): Promise<boolean>

	getWorkspacePath(): string {
		return this.workspacePath
	}

	getCwd(): string {
		return this.cwd
	}

	abstract getEnvironmentDetails(): Promise<{
		os: string
		osVersion: string
		shell: string
		homeDir: string
		username: string
	}>
}
