/**
 * 集成测试：测试所有工具的端到端流程
 * 
 * 测试流程：
 * 1. 搜索论文
 * 2. 下载 PDF
 * 3. 解析 PDF 到文本
 * 4. 解析 PDF 到 Markdown
 * 5. 转换为微信文章
 * 6. 生成学术综述
 * 7. 完整流程处理
 */

import { storage } from '../../storage/StorageManager.js';
import * as arxivTools from '../../tools/arxiv-tools.js';
import * as processingTools from '../../tools/processing-tools.js';

const TEST_ARXIV_ID = '2404.07220';

async function testToolsIntegration() {
  console.log('=== 工具集成测试 ===\n');

  try {
    // 测试 1: 搜索论文
    console.log('📝 测试 1: 搜索论文');
    const searchResult = await arxivTools.searchArxivPapers('attention', 3);
    console.log(`✅ 搜索成功: 找到 ${searchResult.papers.length} 篇论文`);
    if (searchResult.papers.length > 0) {
      console.log(`   第一篇: ${searchResult.papers[0].title.substring(0, 50)}...`);
    }
    console.log();

    // 测试 2: 下载 PDF
    console.log('📝 测试 2: 下载 PDF');
    const pdfPath = await arxivTools.downloadArxivPdfTool(TEST_ARXIV_ID);
    console.log(`✅ PDF 下载成功: ${pdfPath}`);
    console.log();

    // 测试 3: 解析 PDF 到文本
    console.log('📝 测试 3: 解析 PDF 到文本');
    const textResult = await processingTools.parsePdfToText(TEST_ARXIV_ID);
    console.log(`✅ 文本提取成功: ${textResult.length} 字符`);
    console.log(`   前 100 字符: ${textResult.substring(0, 100)}...`);
    console.log();

    // 测试 4: 解析 PDF 到 Markdown
    console.log('📝 测试 4: 解析 PDF 到 Markdown');
    const mdResult = await processingTools.parsePdfToMarkdown(TEST_ARXIV_ID);
    console.log(`✅ Markdown 生成成功: ${mdResult.length} 字符`);
    console.log(`   前 100 字符: ${mdResult.substring(0, 100)}...`);
    console.log();

    // 测试 5: 转换为微信文章
    console.log('📝 测试 5: 转换为微信文章');
    const wechatResult = await processingTools.convertToWechatArticle(TEST_ARXIV_ID);
    console.log(`✅ 微信文章生成成功: ${wechatResult.length} 字符`);
    console.log(`   前 100 字符: ${wechatResult.substring(0, 100)}...`);
    console.log();

    // 测试 6: 生成学术综述
    console.log('📝 测试 6: 生成学术综述');
    const reviewResult = await processingTools.convertToAcademicReviewEnhanced(TEST_ARXIV_ID);
    console.log(`✅ 学术综述生成成功: ${reviewResult.length} 字符`);
    console.log(`   前 100 字符: ${reviewResult.substring(0, 100)}...`);
    console.log();

    // 测试 7: 完整流程处理
    console.log('📝 测试 7: 完整流程处理');
    const processResult = await processingTools.processArxivPaper(TEST_ARXIV_ID, true);
    console.log(`✅ 完整流程处理成功`);
    console.log(`   文本路径: ${processResult.files.text}`);
    console.log(`   Markdown 路径: ${processResult.files.markdown}`);
    console.log(`   微信文章路径: ${processResult.files.wechat}`);
    console.log(`   步骤数: ${processResult.steps.length}`);
    console.log();

    console.log('✅ 所有集成测试通过！\n');

    // 测试总结
    console.log('📊 测试总结:');
    console.log('   - 搜索论文: ✓');
    console.log('   - 下载 PDF: ✓');
    console.log('   - 解析 PDF 到文本: ✓');
    console.log('   - 解析 PDF 到 Markdown: ✓');
    console.log('   - 转换为微信文章: ✓');
    console.log('   - 生成学术综述: ✓');
    console.log('   - 完整流程处理: ✓');

  } catch (error) {
    console.error('❌ 集成测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
testToolsIntegration();

