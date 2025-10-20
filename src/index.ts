#!/usr/bin/env node
/*
 * @Author: @ydzat
 * @Date: 2025-10-18 02:57:05
 * @LastEditors: @ydzat
 * @LastEditTime: 2025-10-20 09:07:26
 * @Description:
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";
import { storage } from './storage/StorageManager.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { getAllToolsMetadata, getToolHandler } from './tools/index.js';

// 加载环境变量（不覆盖已存在的环境变量，优先使用 MCP 客户端传入的）
dotenv.config({ override: false });

// 读取 package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const SERVER_NAME = packageJson.name;
const SERVER_VERSION = packageJson.version;

// 创建 MCP 服务器
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 注册工具列表处理器
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: getAllToolsMetadata()
  };
});

// 注册工具调用处理器
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // 使用工具注册表路由
    const handler = getToolHandler(name);

    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // 调用处理函数
    const result = await handler(args);

    // 返回结果
    return {
      content: [{
        type: "text",
        text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
      }]
    };
  } catch (error: any) {
    return {
      content: [{
        type: "text",
        text: `❌ 错误: ${error.message}`
      }],
      isError: true
    };
  }
});

// 启动服务器
console.log(`启动 ${SERVER_NAME} v${SERVER_VERSION}...`);
console.log(`✅ 存储目录: ${storage.STORAGE_ROOT}`);

const transport = new StdioServerTransport();
await server.connect(transport);

console.log(`🚀 ${SERVER_NAME} v${SERVER_VERSION} 已启动，等待连接...`);
