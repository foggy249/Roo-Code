/**
 * Tool System for Agent Applications (Layer 5)
 *
 * Defines interfaces and base classes for tools that agents can use.
 */

import { RuntimeProvider } from "../runtime/RuntimeProvider"

/**
 * Tool parameter definition
 */
export interface ToolParameter {
	/** Parameter name */
	name: string

	/** Parameter type */
	type: "string" | "number" | "boolean" | "object" | "array"

	/** Parameter description */
	description: string

	/** Whether the parameter is required */
	required: boolean

	/** Default value */
	default?: unknown
}

/**
 * Tool result
 */
export interface ToolResult {
	/** Whether the tool succeeded */
	success: boolean

	/** Result content */
	content: string

	/** Error message if failed */
	error?: string

	/** Metadata */
	metadata?: Record<string, unknown>
}

/**
 * Tool interface
 */
export interface Tool {
	/** Tool name (must be unique) */
	name: string

	/** Tool description for LLM */
	description: string

	/** Tool parameters */
	parameters: ToolParameter[]

	/**
	 * Execute the tool
	 * @param params Tool parameters
	 * @param runtime Runtime provider for environment operations
	 * @returns Tool result
	 */
	execute(params: Record<string, unknown>, runtime: RuntimeProvider): Promise<ToolResult>
}

/**
 * Base tool class with common functionality
 */
export abstract class BaseTool implements Tool {
	abstract name: string
	abstract description: string
	abstract parameters: ToolParameter[]

	abstract execute(params: Record<string, unknown>, runtime: RuntimeProvider): Promise<ToolResult>

	/**
	 * Validate parameters
	 */
	protected validateParams(params: Record<string, unknown>): void {
		for (const param of this.parameters) {
			if (param.required && !(param.name in params)) {
				throw new Error(`Missing required parameter: ${param.name}`)
			}

			if (param.name in params) {
				const value = params[param.name]
				const actualType = Array.isArray(value) ? "array" : typeof value

				if (actualType !== param.type && value !== null && value !== undefined) {
					throw new Error(
						`Invalid type for parameter ${param.name}: expected ${param.type}, got ${actualType}`,
					)
				}
			}
		}
	}

	/**
	 * Create success result
	 */
	protected success(content: string, metadata?: Record<string, unknown>): ToolResult {
		return {
			success: true,
			content,
			metadata,
		}
	}

	/**
	 * Create error result
	 */
	protected error(error: string): ToolResult {
		return {
			success: false,
			content: "",
			error,
		}
	}
}

/**
 * Read file tool
 */
export class ReadFileTool extends BaseTool {
	name = "read_file"
	description = "Read the contents of a file"
	parameters: ToolParameter[] = [
		{
			name: "path",
			type: "string",
			description: "Path to the file to read",
			required: true,
		},
	]

	async execute(params: Record<string, unknown>, runtime: RuntimeProvider): Promise<ToolResult> {
		try {
			this.validateParams(params)

			const path = params.path as string
			const content = await runtime.readFile(path)

			return this.success(content, { path, size: content.length })
		} catch (error) {
			return this.error(error instanceof Error ? error.message : "Failed to read file")
		}
	}
}

/**
 * Write file tool
 */
export class WriteFileTool extends BaseTool {
	name = "write_file"
	description = "Write content to a file"
	parameters: ToolParameter[] = [
		{
			name: "path",
			type: "string",
			description: "Path to the file to write",
			required: true,
		},
		{
			name: "content",
			type: "string",
			description: "Content to write to the file",
			required: true,
		},
	]

	async execute(params: Record<string, unknown>, runtime: RuntimeProvider): Promise<ToolResult> {
		try {
			this.validateParams(params)

			const path = params.path as string
			const content = params.content as string

			await runtime.writeFile(path, content)

			return this.success(`File written successfully: ${path}`, {
				path,
				size: content.length,
			})
		} catch (error) {
			return this.error(error instanceof Error ? error.message : "Failed to write file")
		}
	}
}

/**
 * List files tool
 */
export class ListFilesTool extends BaseTool {
	name = "list_files"
	description = "List files in a directory"
	parameters: ToolParameter[] = [
		{
			name: "path",
			type: "string",
			description: "Path to the directory",
			required: true,
		},
		{
			name: "recursive",
			type: "boolean",
			description: "Whether to list recursively",
			required: false,
			default: false,
		},
	]

	async execute(params: Record<string, unknown>, runtime: RuntimeProvider): Promise<ToolResult> {
		try {
			this.validateParams(params)

			const path = params.path as string
			const recursive = (params.recursive as boolean) || false

			const files = await runtime.listFiles(path, recursive)

			const fileList = files.map((f) => `${f.isDirectory ? "[DIR]" : "[FILE]"} ${f.name}`).join("\n")

			return this.success(fileList, { path, count: files.length })
		} catch (error) {
			return this.error(error instanceof Error ? error.message : "Failed to list files")
		}
	}
}

/**
 * Execute command tool
 */
export class ExecuteCommandTool extends BaseTool {
	name = "execute_command"
	description = "Execute a shell command"
	parameters: ToolParameter[] = [
		{
			name: "command",
			type: "string",
			description: "Command to execute",
			required: true,
		},
		{
			name: "cwd",
			type: "string",
			description: "Working directory (optional)",
			required: false,
		},
	]

	async execute(params: Record<string, unknown>, runtime: RuntimeProvider): Promise<ToolResult> {
		try {
			this.validateParams(params)

			const command = params.command as string
			const cwd = params.cwd as string | undefined

			const result = await runtime.executeCommand(command, cwd)

			if (result.exitCode === 0) {
				return this.success(result.stdout, {
					exitCode: result.exitCode,
					command,
				})
			} else {
				return this.error(`Command failed with exit code ${result.exitCode}: ${result.stderr}`)
			}
		} catch (error) {
			return this.error(error instanceof Error ? error.message : "Failed to execute command")
		}
	}
}

/**
 * Default tool set for agents
 */
export const defaultTools: Tool[] = [
	new ReadFileTool(),
	new WriteFileTool(),
	new ListFilesTool(),
	new ExecuteCommandTool(),
]
