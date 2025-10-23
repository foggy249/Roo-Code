#!/usr/bin/env tsx
/**
 * Comprehensive test suite for the agent framework
 * Tests all components to ensure they work correctly
 */

import { AgentEngine, TerminalRuntimeProvider } from "@roo-code/agent-framework"
import * as fs from "fs/promises"
import * as path from "path"
import * as os from "os"

// Test results tracking
const results: { test: string; passed: boolean; error?: string }[] = []

function reportTest(test: string, passed: boolean, error?: string) {
	results.push({ test, passed, error })
	const status = passed ? "✓" : "✗"
	const color = passed ? "\x1b[32m" : "\x1b[31m"
	const reset = "\x1b[0m"
	console.log(`${color}${status}${reset} ${test}`)
	if (error) {
		console.log(`  Error: ${error}`)
	}
}

async function testRuntimeCapabilities() {
	try {
		const runtime = new TerminalRuntimeProvider({
			cwd: process.cwd(),
			workspacePath: process.cwd(),
		})

		const capabilities = runtime.getCapabilities()

		// Verify expected capabilities
		if (
			capabilities.canReadFiles &&
			capabilities.canWriteFiles &&
			capabilities.canListFiles &&
			capabilities.canExecuteCommands &&
			capabilities.canAskUser &&
			capabilities.canShowMessages &&
			capabilities.supportsTerminal
		) {
			reportTest("Runtime capabilities check", true)
		} else {
			reportTest("Runtime capabilities check", false, "Missing expected capabilities")
		}
	} catch (error: any) {
		reportTest("Runtime capabilities check", false, error.message)
	}
}

async function testFileOperations() {
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "roo-test-"))
	const testFile = path.join(tmpDir, "test.txt")
	const testContent = "Hello from agent framework test!"

	try {
		const runtime = new TerminalRuntimeProvider({
			cwd: tmpDir,
			workspacePath: tmpDir,
		})

		// Test write
		await runtime.writeFile(testFile, testContent)

		// Test exists
		const exists = await runtime.fileExists(testFile)
		if (!exists) {
			throw new Error("File should exist after write")
		}

		// Test read
		const content = await runtime.readFile(testFile)
		if (content !== testContent) {
			throw new Error(`Content mismatch: expected "${testContent}", got "${content}"`)
		}

		// Test list
		const files = await runtime.listFiles(tmpDir)
		if (files.length !== 1 || !files[0] || files[0].name !== "test.txt") {
			throw new Error("List files returned unexpected results")
		}

		reportTest("File operations (write, read, list, exists)", true)
	} catch (error: any) {
		reportTest("File operations (write, read, list, exists)", false, error.message)
	} finally {
		// Cleanup
		await fs.rm(tmpDir, { recursive: true, force: true })
	}
}

async function testCommandExecution() {
	try {
		const runtime = new TerminalRuntimeProvider({
			cwd: process.cwd(),
			workspacePath: process.cwd(),
		})

		// Test simple command
		const result = await runtime.executeCommand('echo "test"')

		if (result.exitCode === 0 && result.stdout.trim() === "test") {
			reportTest("Command execution", true)
		} else {
			reportTest("Command execution", false, `Unexpected result: ${JSON.stringify(result)}`)
		}
	} catch (error: any) {
		reportTest("Command execution", false, error.message)
	}
}

async function testEnvironmentDetails() {
	try {
		const runtime = new TerminalRuntimeProvider({
			cwd: process.cwd(),
			workspacePath: process.cwd(),
		})

		const env = await runtime.getEnvironmentDetails()

		if (env.os && env.osVersion && env.shell && env.homeDir && env.username) {
			reportTest("Environment details", true)
		} else {
			reportTest("Environment details", false, "Missing environment details")
		}
	} catch (error: any) {
		reportTest("Environment details", false, error.message)
	}
}

async function testAgentEngine() {
	try {
		const runtime = new TerminalRuntimeProvider({
			cwd: process.cwd(),
			workspacePath: process.cwd(),
		})

		const agent = new AgentEngine({
			runtime,
			apiProvider: "anthropic",
			apiKey: "test-key",
			model: "claude-3-5-sonnet-20241022",
			mode: "code",
		})

		// Test capabilities
		const capabilities = agent.getCapabilities()
		if (!capabilities) {
			throw new Error("Agent should return capabilities")
		}

		reportTest("Agent engine instantiation", true)
	} catch (error: any) {
		reportTest("Agent engine instantiation", false, error.message)
	}
}

async function testAgentExecution() {
	try {
		const runtime = new TerminalRuntimeProvider({
			cwd: process.cwd(),
			workspacePath: process.cwd(),
		})

		const agent = new AgentEngine({
			runtime,
			apiProvider: "anthropic",
			apiKey: "test-key",
			model: "claude-3-5-sonnet-20241022",
			mode: "code",
		})

		// Execute a simple task (demo mode)
		const result = await agent.execute({
			task: "Test task",
		})

		if (result.status === "completed") {
			reportTest("Agent execution", true)
		} else {
			reportTest("Agent execution", false, `Unexpected status: ${result.status}`)
		}
	} catch (error: any) {
		reportTest("Agent execution", false, error.message)
	}
}

async function testAbsolutePath() {
	try {
		const runtime = new TerminalRuntimeProvider({
			cwd: "/tmp",
			workspacePath: "/tmp",
		})

		// Test absolute path
		const absolutePath = runtime.getAbsolutePath("/home/test/file.txt")
		if (absolutePath !== "/home/test/file.txt") {
			throw new Error("Absolute path should remain unchanged")
		}

		// Test relative path
		const relativePath = runtime.getAbsolutePath("file.txt")
		if (!relativePath.startsWith("/tmp")) {
			throw new Error("Relative path should be resolved from cwd")
		}

		reportTest("Path resolution", true)
	} catch (error: any) {
		reportTest("Path resolution", false, error.message)
	}
}

async function runAllTests() {
	console.log("\n🧪 Running Agent Framework Test Suite\n")
	console.log("=".repeat(60))
	console.log()

	// Run all tests
	await testRuntimeCapabilities()
	await testFileOperations()
	await testCommandExecution()
	await testEnvironmentDetails()
	await testAbsolutePath()
	await testAgentEngine()
	await testAgentExecution()

	// Summary
	console.log()
	console.log("=".repeat(60))
	console.log()

	const passed = results.filter((r) => r.passed).length
	const failed = results.filter((r) => !r.passed).length
	const total = results.length

	console.log(`Test Results: ${passed}/${total} passed`)

	if (failed > 0) {
		console.log()
		console.log("Failed tests:")
		results
			.filter((r) => !r.passed)
			.forEach((r) => {
				console.log(`  ✗ ${r.test}`)
				if (r.error) {
					console.log(`    ${r.error}`)
				}
			})
		process.exit(1)
	} else {
		console.log()
		console.log("✨ All tests passed!")
		console.log()
	}
}

// Run tests
runAllTests().catch((error) => {
	console.error("Test suite failed:", error)
	process.exit(1)
})
