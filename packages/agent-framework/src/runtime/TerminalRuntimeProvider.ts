/**
 * Terminal/CLI runtime provider
 * Implements runtime for console-based agent execution
 */

import * as fs from "fs/promises"
import * as path from "path"
import * as os from "os"
import { exec } from "child_process"
import { promisify } from "util"
import * as readline from "readline"

import {
	BaseRuntimeProvider,
	RuntimeCapabilities,
	CommandResult,
	FileEntry,
	AskResponse,
	AgentMessage,
	ToolApprovalRequest,
} from "./RuntimeProvider"

const execAsync = promisify(exec)

/**
 * Terminal runtime provider for CLI-based agent execution
 */
export class TerminalRuntimeProvider extends BaseRuntimeProvider {
	private rl: readline.Interface

	constructor(options: { cwd?: string; workspacePath?: string } = {}) {
		super({
			cwd: options.cwd || process.cwd(),
			workspacePath: options.workspacePath || process.cwd(),
		})

		// Create readline interface for user interaction
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		})
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

	// ============================================
	// File System Operations
	// ============================================

	async readFile(filePath: string): Promise<string> {
		const absolutePath = this.getAbsolutePath(filePath)
		return await fs.readFile(absolutePath, "utf-8")
	}

	async writeFile(filePath: string, content: string): Promise<void> {
		const absolutePath = this.getAbsolutePath(filePath)

		// Ensure directory exists
		const dir = path.dirname(absolutePath)
		await fs.mkdir(dir, { recursive: true })

		await fs.writeFile(absolutePath, content, "utf-8")
	}

	async listFiles(dirPath: string, recursive = false): Promise<FileEntry[]> {
		const absolutePath = this.getAbsolutePath(dirPath)
		const entries: FileEntry[] = []

		const readDir = async (currentPath: string) => {
			const items = await fs.readdir(currentPath, { withFileTypes: true })

			for (const item of items) {
				const itemPath = path.join(currentPath, item.name)
				const relativePath = path.relative(this.workspacePath, itemPath)

				entries.push({
					name: item.name,
					path: relativePath,
					isDirectory: item.isDirectory(),
					isFile: item.isFile(),
				})

				if (recursive && item.isDirectory()) {
					await readDir(itemPath)
				}
			}
		}

		await readDir(absolutePath)
		return entries
	}

	async fileExists(filePath: string): Promise<boolean> {
		try {
			const absolutePath = this.getAbsolutePath(filePath)
			await fs.access(absolutePath)
			return true
		} catch {
			return false
		}
	}

	getAbsolutePath(relativePath: string): string {
		if (path.isAbsolute(relativePath)) {
			return relativePath
		}
		return path.resolve(this.cwd, relativePath)
	}

	// ============================================
	// Command Execution
	// ============================================

	async executeCommand(command: string, cwd?: string): Promise<CommandResult> {
		try {
			const { stdout, stderr } = await execAsync(command, {
				cwd: cwd || this.cwd,
				maxBuffer: 10 * 1024 * 1024, // 10MB buffer
			})

			return {
				stdout: stdout || "",
				stderr: stderr || "",
				exitCode: 0,
			}
		} catch (error: any) {
			return {
				stdout: error.stdout || "",
				stderr: error.stderr || error.message || "",
				exitCode: error.code || 1,
			}
		}
	}

	// ============================================
	// User Interaction
	// ============================================

	async ask(question: string, options?: { placeholder?: string; yesNo?: boolean }): Promise<AskResponse> {
		return new Promise((resolve) => {
			const prompt = options?.yesNo
				? `${question} (y/n): `
				: options?.placeholder
					? `${question} [${options.placeholder}]: `
					: `${question}: `

			this.rl.question(prompt, (answer) => {
				if (options?.yesNo) {
					const approved = answer.toLowerCase().trim() === "y" || answer.toLowerCase().trim() === "yes"
					resolve({ type: "yesno", approved })
				} else {
					resolve({ type: "text", text: answer })
				}
			})
		})
	}

	async say(message: AgentMessage): Promise<void> {
		const prefix = {
			info: "ℹ",
			success: "✓",
			error: "✗",
			warning: "⚠",
		}[message.type]

		const color = {
			info: "\x1b[36m", // cyan
			success: "\x1b[32m", // green
			error: "\x1b[31m", // red
			warning: "\x1b[33m", // yellow
		}[message.type]

		const reset = "\x1b[0m"

		console.log(`${color}${prefix} ${message.content}${reset}`)
	}

	async requestToolApproval(request: ToolApprovalRequest): Promise<boolean> {
		await this.say({
			type: "info",
			content: `Tool: ${request.toolName}`,
		})

		console.log(`Description: ${request.description}`)
		console.log(`Parameters: ${JSON.stringify(request.params, null, 2)}`)
		console.log()

		const response = await this.ask("Approve this tool execution?", { yesNo: true })

		if (response.type === "yesno") {
			return response.approved
		}

		return false
	}

	// ============================================
	// Context Information
	// ============================================

	async getEnvironmentDetails() {
		const shell = process.env.SHELL || "/bin/sh"

		return {
			os: os.platform(),
			osVersion: os.release(),
			shell,
			homeDir: os.homedir(),
			username: os.userInfo().username,
		}
	}

	// ============================================
	// Cleanup
	// ============================================

	/**
	 * Close the terminal runtime and cleanup resources
	 */
	close(): void {
		this.rl.close()
	}
}
