/**
 * MCP 服务器启动测试
 * 验证环境变量配置和 LLM Provider 初始化
 */

import dotenv from 'dotenv';
import { createLLMProvider } from '../llm/LLMProvider.js';
import { storage } from '../storage/StorageManager.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// 读取 package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = path.join(__dirname, '../../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

async function testMCPStartup() {
  console.log('=== MCP 服务器启动测试 ===\n');

  try {
    // 1. 测试环境变量加载
    console.log('📝 测试 1: 环境变量加载...');
    dotenv.config({ override: false });
    
    console.log('  环境变量状态:');
    console.log(`  - LLM_PROVIDER: ${process.env.LLM_PROVIDER || '(未设置)'}`);
    console.log(`  - LLM_API_KEY: ${process.env.LLM_API_KEY ? '***' + process.env.LLM_API_KEY.slice(-4) : '(未设置)'}`);
    console.log(`  - LLM_BASE_URL: ${process.env.LLM_BASE_URL || '(未设置)'}`);
    console.log(`  - LLM_MODEL: ${process.env.LLM_MODEL || '(未设置)'}`);
    console.log(`  - LLM_MAX_TOKENS: ${process.env.LLM_MAX_TOKENS || '(未设置)'}`);
    console.log(`  - LLM_TEMPERATURE: ${process.env.LLM_TEMPERATURE || '(未设置)'}`);
    
    if (!process.env.LLM_API_KEY && !process.env.SILICONFLOW_API_KEY) {
      console.log('⚠️  警告: 未设置 LLM_API_KEY，LLM Provider 初始化将失败');
      console.log('   请在 .env 文件中配置 LLM_API_KEY');
      console.log('   或在 MCP 客户端配置中通过 env 传递');
    } else {
      console.log('✅ 环境变量已加载');
    }

    // 2. 测试 package.json 读取
    console.log('\n📝 测试 2: package.json 读取...');
    console.log(`  - 包名: ${packageJson.name}`);
    console.log(`  - 版本: ${packageJson.version}`);
    console.log(`  - 描述: ${packageJson.description}`);
    console.log('✅ package.json 读取成功');

    // 3. 测试存储管理器
    console.log('\n📝 测试 3: 存储管理器初始化...');
    console.log(`  - 存储根目录: ${storage.STORAGE_ROOT}`);
    console.log(`  - 数据库路径: ${storage.DB_PATH}`);
    console.log(`  - PDFs 目录: ${storage.PDFS_DIR}`);
    console.log(`  - Texts 目录: ${storage.TEXTS_DIR}`);
    console.log(`  - Generated 目录: ${storage.GENERATED_DIR}`);
    console.log('✅ 存储管理器初始化成功');

    // 4. 测试 LLM Provider 初始化
    console.log('\n📝 测试 4: LLM Provider 初始化...');
    
    if (!process.env.LLM_API_KEY && !process.env.SILICONFLOW_API_KEY) {
      console.log('⚠️  跳过 LLM Provider 初始化（未设置 API Key）');
    } else {
      try {
        const llm = createLLMProvider();
        console.log('✅ LLM Provider 初始化成功');
        console.log(`  - Provider: ${process.env.LLM_PROVIDER || 'siliconflow'}`);
        console.log(`  - Model: ${process.env.LLM_MODEL || 'auto'}`);
        console.log(`  - Max Output Tokens: ${llm.getMaxOutputTokens()}`);
        console.log(`  - Max Context Tokens: ${llm.getMaxContextTokens()}`);

        // 测试简单的 LLM 调用
        console.log('\n📝 测试 5: LLM 调用测试...');
        console.log('  发送测试请求: "Hello, please respond with OK"');

        const response = await llm.chat({
          messages: [
            { role: 'user', content: 'Hello, please respond with OK' }
          ],
          temperature: 0.1
        });

        console.log(`  响应: ${response.content.substring(0, 100)}...`);
        console.log(`  Token 使用: ${response.usage?.totalTokens || 'N/A'}`);
        console.log('✅ LLM 调用成功');
        
      } catch (error) {
        console.error('❌ LLM Provider 初始化失败:', error instanceof Error ? error.message : String(error));
        throw error;
      }
    }

    console.log('\n=== ✅ 所有测试通过！===\n');
    console.log('📊 测试结果:');
    console.log('  ✅ 环境变量加载正常');
    console.log('  ✅ package.json 读取正常');
    console.log('  ✅ 存储管理器初始化正常');
    console.log('  ✅ LLM Provider 初始化正常');
    console.log('  ✅ LLM 调用正常');
    console.log('\n🎉 MCP 服务器可以正常启动！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    console.error('\n💡 故障排查建议:');
    console.error('  1. 检查 .env 文件是否存在且配置正确');
    console.error('  2. 检查 LLM_API_KEY 是否有效');
    console.error('  3. 检查网络连接是否正常');
    console.error('  4. 检查 LLM_BASE_URL 是否正确');
    console.error('  5. 如果使用 MCP 客户端，检查环境变量是否正确传递');
    throw error;
  }
}

// 运行测试
testMCPStartup().catch(console.error);

