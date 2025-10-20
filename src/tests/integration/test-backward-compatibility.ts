/**
 * 向后兼容性测试：验证所有工具名称和参数保持不变
 * 
 * 测试所有 14 个 MCP 工具：
 * 1. search_arxiv_papers
 * 2. download_arxiv_pdf
 * 3. parse_pdf_to_text
 * 4. parse_pdf_to_markdown
 * 5. convert_to_wechat_article
 * 6. convert_to_academic_review_enhanced
 * 7. process_arxiv_paper
 * 8. batch_download_pdfs
 * 9. batch_analyze_papers
 * 10. generate_unified_literature_review
 * 11. search_academic_papers
 * 12. export_to_notion_full
 * 13. export_to_notion_update
 * 14. clear_workdir
 */

import { getAllToolsMetadata, getToolHandler } from '../../tools/index.js';

// 预期的工具列表（按字母顺序）
const EXPECTED_TOOLS = [
  'batch_analyze_papers',
  'batch_download_pdfs',
  'clear_workdir',
  'convert_to_academic_review_enhanced',
  'convert_to_wechat_article',
  'download_arxiv_pdf',
  'export_to_notion_full',
  'export_to_notion_update',
  'generate_unified_literature_review',
  'parse_pdf_to_markdown',
  'parse_pdf_to_text',
  'process_arxiv_paper',
  'search_academic_papers',
  'search_arxiv_papers',
];

// 预期的工具参数
const EXPECTED_TOOL_PARAMS: Record<string, string[]> = {
  'search_arxiv_papers': ['query', 'max_results'],
  'download_arxiv_pdf': ['arxiv_id'],
  'parse_pdf_to_text': ['arxiv_id'],
  'parse_pdf_to_markdown': ['arxiv_id'],
  'convert_to_wechat_article': ['arxiv_id'],
  'convert_to_academic_review_enhanced': ['arxiv_id'],
  'process_arxiv_paper': ['arxiv_id', 'include_wechat'],
  'batch_download_pdfs': ['arxiv_ids'],
  'batch_analyze_papers': ['arxiv_ids', 'include_wechat'],
  'generate_unified_literature_review': ['arxiv_ids', 'topic'],
  'search_academic_papers': ['query', 'sources', 'max_results', 'export_to_notion'],
  'export_to_notion_full': ['arxiv_id', 'database_id'],
  'export_to_notion_update': ['arxiv_id', 'page_id'],
  'clear_workdir': [],
};

async function testBackwardCompatibility() {
  console.log('=== 向后兼容性测试 ===\n');

  let passedTests = 0;
  let failedTests = 0;

  try {
    // 测试 1: 验证所有工具名称存在
    console.log('📝 测试 1: 验证所有工具名称存在');
    const allTools = getAllToolsMetadata();
    const toolNames = allTools.map((t: any) => t.name).sort();
    
    console.log(`   注册的工具数: ${toolNames.length}`);
    console.log(`   预期的工具数: ${EXPECTED_TOOLS.length}`);
    
    const missingTools = EXPECTED_TOOLS.filter(name => !toolNames.includes(name));
    const extraTools = toolNames.filter((name: string) => !EXPECTED_TOOLS.includes(name));
    
    if (missingTools.length > 0) {
      console.log(`   ❌ 缺少的工具: ${missingTools.join(', ')}`);
      failedTests++;
    } else if (extraTools.length > 0) {
      console.log(`   ⚠️  额外的工具: ${extraTools.join(', ')}`);
    } else {
      console.log(`   ✅ 所有工具名称正确`);
      passedTests++;
    }
    console.log();

    // 测试 2: 验证每个工具的参数
    console.log('📝 测试 2: 验证每个工具的参数');
    for (const toolName of EXPECTED_TOOLS) {
      const tool = allTools.find((t: any) => t.name === toolName);
      
      if (!tool) {
        console.log(`   ❌ ${toolName}: 工具不存在`);
        failedTests++;
        continue;
      }

      const expectedParams = EXPECTED_TOOL_PARAMS[toolName] || [];
      const actualParams = Object.keys(tool.inputSchema?.properties || {});
      
      const missingParams = expectedParams.filter(p => !actualParams.includes(p));
      
      if (missingParams.length > 0) {
        console.log(`   ❌ ${toolName}: 缺少参数 ${missingParams.join(', ')}`);
        failedTests++;
      } else {
        console.log(`   ✅ ${toolName}: 参数正确 (${expectedParams.length} 个)`);
        passedTests++;
      }
    }
    console.log();

    // 测试 3: 验证每个工具都有处理器
    console.log('📝 测试 3: 验证每个工具都有处理器');
    for (const toolName of EXPECTED_TOOLS) {
      const handler = getToolHandler(toolName);
      
      if (!handler) {
        console.log(`   ❌ ${toolName}: 没有处理器`);
        failedTests++;
      } else if (typeof handler !== 'function') {
        console.log(`   ❌ ${toolName}: 处理器不是函数`);
        failedTests++;
      } else {
        console.log(`   ✅ ${toolName}: 处理器存在`);
        passedTests++;
      }
    }
    console.log();

    // 测试 4: 验证工具描述存在
    console.log('📝 测试 4: 验证工具描述存在');
    for (const toolName of EXPECTED_TOOLS) {
      const tool = allTools.find((t: any) => t.name === toolName);
      
      if (!tool) {
        console.log(`   ❌ ${toolName}: 工具不存在`);
        failedTests++;
        continue;
      }

      if (!tool.description || tool.description.trim() === '') {
        console.log(`   ❌ ${toolName}: 缺少描述`);
        failedTests++;
      } else {
        console.log(`   ✅ ${toolName}: 描述存在 (${tool.description.length} 字符)`);
        passedTests++;
      }
    }
    console.log();

    // 测试 5: 验证工具输入模式
    console.log('📝 测试 5: 验证工具输入模式');
    for (const toolName of EXPECTED_TOOLS) {
      const tool = allTools.find((t: any) => t.name === toolName);
      
      if (!tool) {
        console.log(`   ❌ ${toolName}: 工具不存在`);
        failedTests++;
        continue;
      }

      if (!tool.inputSchema) {
        console.log(`   ❌ ${toolName}: 缺少输入模式`);
        failedTests++;
      } else if (tool.inputSchema.type !== 'object') {
        console.log(`   ❌ ${toolName}: 输入模式类型不是 object`);
        failedTests++;
      } else if (!tool.inputSchema.properties) {
        console.log(`   ❌ ${toolName}: 输入模式缺少 properties`);
        failedTests++;
      } else {
        console.log(`   ✅ ${toolName}: 输入模式正确`);
        passedTests++;
      }
    }
    console.log();

    // 测试总结
    console.log('📊 测试总结:');
    console.log(`   ✅ 通过: ${passedTests}`);
    console.log(`   ❌ 失败: ${failedTests}`);
    console.log();

    if (failedTests === 0) {
      console.log('✅ 所有向后兼容性测试通过！');
      console.log('   所有工具名称、参数和处理器都保持不变。');
    } else {
      console.log('❌ 部分向后兼容性测试失败！');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ 向后兼容性测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testBackwardCompatibility();

