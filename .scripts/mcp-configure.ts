#!/usr/bin/env node

/**
 * Configure MCP client (Claude Desktop) to use OutLast MCP server
 * Based on Fonoster's MCP configuration approach
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface McpConfig {
  mcpServers: {
    [key: string]: {
      command: string;
      args: string[];
      env?: Record<string, string>;
    };
  };
}

function getMcpConfigPath(): string {
  const platform = process.platform;
  
  if (platform === 'darwin') {
    return path.join(
      os.homedir(),
      'Library/Application Support/Claude/claude_desktop_config.json'
    );
  } else if (platform === 'win32') {
    return path.join(
      os.homedir(),
      'AppData/Roaming/Claude/claude_desktop_config.json'
    );
  } else if (platform === 'linux') {
    return path.join(
      os.homedir(),
      '.config/Claude/claude_desktop_config.json'
    );
  }
  
  throw new Error(`Unsupported platform: ${platform}`);
}

function getMcpServerPath(): string {
  // Get the path to the compiled MCP server
  const projectRoot = path.resolve(__dirname, '..');
  const mcpServerPath = path.join(projectRoot, 'mods/mcp-server/dist/index.js');
  
  // Check if the file exists
  if (!fs.existsSync(mcpServerPath)) {
    throw new Error(
      `MCP server not found at ${mcpServerPath}. Please run 'npm run mcp:build' first.`
    );
  }
  
  return mcpServerPath;
}

function configureMcp(): void {
  const mcpConfigPath = getMcpConfigPath();
  const mcpServerPath = getMcpServerPath();
  
  console.log(`📝 Configuring Claude Desktop MCP...`);
  console.log(`   Config file: ${mcpConfigPath}`);
  console.log(`   MCP server: ${mcpServerPath}`);
  
  // Read existing config or create new one
  let mcpConfig: McpConfig = { mcpServers: {} };
  
  try {
    if (fs.existsSync(mcpConfigPath)) {
      const configContent = fs.readFileSync(mcpConfigPath, 'utf8');
      mcpConfig = JSON.parse(configContent);
      
      // Ensure mcpServers exists
      if (!mcpConfig.mcpServers) {
        mcpConfig.mcpServers = {};
      }
      
      console.log(`   ✓ Found existing config`);
    } else {
      console.log(`   ✓ Creating new config`);
    }
  } catch (err) {
    console.warn(`   ⚠ Could not read existing config, creating new one: ${err}`);
    mcpConfig = { mcpServers: {} };
  }
  
  // Get API base URL from environment or use default
  const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  
  // Get absolute path to node executable
  const nodePath = process.execPath; // This is the absolute path to the node executable
  
  // Configure OutLast MCP server
  mcpConfig.mcpServers.outlast = {
    command: nodePath,
    args: [mcpServerPath],
    env: {
      API_BASE_URL: apiBaseUrl
    }
  };
  
  // Create directory if it doesn't exist
  const configDir = path.dirname(mcpConfigPath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log(`   ✓ Created config directory: ${configDir}`);
  }
  
  // Write config file
  fs.writeFileSync(
    mcpConfigPath,
    JSON.stringify(mcpConfig, null, 2),
    'utf8'
  );
  
  console.log(`\n✅ MCP client configured successfully!`);
  console.log(`\n📋 Configuration:`);
  console.log(`   Server name: outlast`);
  console.log(`   MCP server: ${mcpServerPath}`);
  console.log(`   API URL: ${apiBaseUrl}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Restart Claude Desktop`);
  console.log(`   2. Test with: Ask Claude to use the 'ping' tool from 'outlast'`);
  console.log(`   3. Once working, we'll add more tools incrementally`);
  console.log(`\n🔧 To change the API URL, set API_BASE_URL environment variable:`);
  console.log(`   API_BASE_URL=http://localhost:3000 npm run mcp:configure:claude`);
}

// Run configuration
try {
  configureMcp();
} catch (error) {
  console.error(`\n❌ Error configuring MCP:`, error instanceof Error ? error.message : error);
  process.exit(1);
}

