/**
 * 测试 Markdown 生成修复
 */

import dotenv from 'dotenv';
import { convertToMarkdown } from '../core/processing.js';
import { storage } from '../storage/StorageManager.js';
import { getArxivPaperInfo } from '../core/arxiv.js';

dotenv.config();

async function testMarkdownFix() {
  console.log('=== 测试 Markdown 生成修复 ===\n');

  const testArxivId = '2404.07220';
  const cleanId = testArxivId.replace(/v\d+$/, '');
  const pdfPath = storage.getPdfPath(cleanId);

  try {
    // 获取真实的论文信息
    console.log('📝 获取论文信息...');
    const paperInfo = await getArxivPaperInfo(testArxivId);
    
    if (!paperInfo) {
      console.log('❌ 无法获取论文信息');
      return;
    }

    console.log(`✓ 论文标题: ${paperInfo.title}`);
    console.log(`✓ 作者数: ${paperInfo.authors.length}`);
    console.log(`✓ 作者列表: ${paperInfo.authors.map(a => a.name).join(', ')}`);

    // 生成 Markdown（强制重新生成）
    console.log('\n📝 生成 Markdown...');
    const markdown = await convertToMarkdown(pdfPath, testArxivId, paperInfo, {
      forceRegenerate: true
    });

    console.log(`\n✅ Markdown 生成成功！`);
    console.log(`✓ 内容长度: ${markdown.length} 字符`);
    console.log(`\n--- 前 500 字符预览 ---`);
    console.log(markdown.substring(0, 500));
    console.log(`\n--- 预览结束 ---`);

    // 检查是否包含 [object Object]
    if (markdown.includes('[object Object]')) {
      console.log('\n❌ 警告: 内容中仍包含 [object Object]');
    } else {
      console.log('\n✅ 内容正常，无 [object Object]');
    }

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    throw error;
  }
}

testMarkdownFix().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});

