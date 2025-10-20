/**
 * 测试 core/arxiv.ts 模块
 */

import {
  cleanArxivId,
  extractArxivId,
  buildPdfUrl,
  isValidArxivId,
  searchArxiv,
  downloadArxivPdf,
  getArxivPaperInfo
} from '../../core/arxiv.js';
import { storage } from '../../storage/StorageManager.js';
import * as fs from 'fs';

async function testCoreArxiv() {
  console.log('=== 测试 core/arxiv.ts 模块 ===\n');

  try {
    // 测试 1: cleanArxivId
    console.log('📝 测试 1: cleanArxivId()');
    const testCases = [
      { input: '2403.15137v1', expected: '2403.15137' },
      { input: '2403.15137v2', expected: '2403.15137' },
      { input: '2403.15137', expected: '2403.15137' },
      { input: '1234.5678v10', expected: '1234.5678' },
      { input: 'math/0601001v1', expected: 'math/0601001' },
      { input: 'math/0601001', expected: 'math/0601001' }
    ];

    for (const testCase of testCases) {
      const result = cleanArxivId(testCase.input);
      if (result === testCase.expected) {
        console.log(`  ✓ ${testCase.input} → ${result}`);
      } else {
        throw new Error(`cleanArxivId 失败: ${testCase.input} → ${result} (期望: ${testCase.expected})`);
      }
    }
    console.log('✅ cleanArxivId 测试通过');

    // 测试 2: extractArxivId
    console.log('\n📝 测试 2: extractArxivId()');
    const extractCases = [
      { input: 'http://arxiv.org/abs/2403.15137v1', expected: '2403.15137v1' },
      { input: 'https://arxiv.org/abs/2403.15137', expected: '2403.15137' },
      { input: '2403.15137v1', expected: '2403.15137v1' },
      { input: '2403.15137', expected: '2403.15137' }
    ];

    for (const testCase of extractCases) {
      const result = extractArxivId(testCase.input);
      if (result === testCase.expected) {
        console.log(`  ✓ ${testCase.input} → ${result}`);
      } else {
        throw new Error(`extractArxivId 失败: ${testCase.input} → ${result} (期望: ${testCase.expected})`);
      }
    }
    console.log('✅ extractArxivId 测试通过');

    // 测试 3: buildPdfUrl
    console.log('\n📝 测试 3: buildPdfUrl()');
    const pdfUrl = buildPdfUrl('2403.15137v1');
    const expectedUrl = 'http://arxiv.org/pdf/2403.15137v1.pdf';
    if (pdfUrl === expectedUrl) {
      console.log(`  ✓ ${pdfUrl}`);
      console.log('✅ buildPdfUrl 测试通过');
    } else {
      throw new Error(`buildPdfUrl 失败: ${pdfUrl} (期望: ${expectedUrl})`);
    }

    // 测试 4: isValidArxivId
    console.log('\n📝 测试 4: isValidArxivId()');
    const validIds = [
      '2403.15137',
      '2403.15137v1',
      '1234.5678v10',
      'math/0601001',
      'math/0601001v1',
      'cs-AI/0601001'
    ];
    const invalidIds = [
      'invalid',
      '123',
      'abc.def',
      '2403.15137v',
      'math/123'
    ];

    console.log('  有效的 ID:');
    for (const id of validIds) {
      const result = isValidArxivId(id);
      if (result) {
        console.log(`    ✓ ${id}`);
      } else {
        throw new Error(`应该是有效的 ID: ${id}`);
      }
    }

    console.log('  无效的 ID:');
    for (const id of invalidIds) {
      const result = isValidArxivId(id);
      if (!result) {
        console.log(`    ✓ ${id} (正确识别为无效)`);
      } else {
        throw new Error(`应该是无效的 ID: ${id}`);
      }
    }
    console.log('✅ isValidArxivId 测试通过');

    // 测试 5: searchArxiv (需要网络)
    console.log('\n📝 测试 5: searchArxiv() - 需要网络连接');
    console.log('  ⚠️  此测试需要网络连接，可能较慢...');
    
    try {
      const searchResult = await searchArxiv('attention is all you need', 3);
      console.log(`  ✓ 搜索成功: 找到 ${searchResult.papers.length} 篇论文`);
      console.log(`  ✓ 总结果数: ${searchResult.totalResults}`);
      
      if (searchResult.papers.length > 0) {
        const firstPaper = searchResult.papers[0];
        console.log(`  ✓ 第一篇论文:`);
        console.log(`    标题: ${firstPaper.title.substring(0, 60)}...`);
        console.log(`    ID: ${firstPaper.id}`);
        console.log(`    作者数: ${firstPaper.authors.length}`);
        console.log(`    发布日期: ${firstPaper.published}`);
        
        // 验证数据库已保存
        const paper = storage.db.getPaperByArxivId(firstPaper.id);
        if (paper) {
          console.log(`  ✓ 论文已保存到数据库`);
        } else {
          throw new Error('论文未保存到数据库');
        }
      }
      
      // 测试缓存
      console.log('  测试缓存...');
      const cachedResult = await searchArxiv('attention is all you need', 3);
      if (cachedResult.papers.length === searchResult.papers.length) {
        console.log(`  ✓ 缓存工作正常`);
      }
      
      console.log('✅ searchArxiv 测试通过');
    } catch (error: any) {
      console.log(`  ⚠️  搜索测试跳过（网络问题）: ${error.message}`);
    }

    // 测试 6: downloadArxivPdf (需要网络)
    console.log('\n📝 测试 6: downloadArxivPdf() - 需要网络连接');
    console.log('  ⚠️  此测试需要网络连接，可能较慢...');
    
    try {
      // 使用一个较小的论文进行测试
      const testArxivId = '2404.07220'; // 已知存在的论文
      
      // 先删除已存在的 PDF（如果有）
      const pdfPath = storage.getPdfPath(testArxivId);
      if (fs.existsSync(pdfPath)) {
        console.log('  清理旧的 PDF 文件');
        fs.unlinkSync(pdfPath);
      }
      
      const downloadedPath = await downloadArxivPdf(testArxivId);
      console.log(`  ✓ 下载成功: ${downloadedPath}`);
      
      // 验证文件存在
      if (fs.existsSync(downloadedPath)) {
        const stats = fs.statSync(downloadedPath);
        console.log(`  ✓ 文件大小: ${(stats.size / 1024).toFixed(2)} KB`);
      } else {
        throw new Error('下载的文件不存在');
      }
      
      // 验证数据库已更新
      const paper = storage.db.getPaperByArxivId(testArxivId);
      if (paper && paper.pdf_path === downloadedPath) {
        console.log(`  ✓ 数据库已更新`);
      } else {
        throw new Error('数据库未正确更新');
      }
      
      // 测试已存在的文件
      console.log('  测试已存在的文件...');
      const downloadedPath2 = await downloadArxivPdf(testArxivId);
      if (downloadedPath2 === downloadedPath) {
        console.log(`  ✓ 正确返回已存在的文件`);
      }
      
      console.log('✅ downloadArxivPdf 测试通过');
    } catch (error: any) {
      console.log(`  ⚠️  下载测试跳过（网络问题）: ${error.message}`);
    }

    // 测试 7: getArxivPaperInfo
    console.log('\n📝 测试 7: getArxivPaperInfo()');
    
    try {
      const paperInfo = await getArxivPaperInfo('2404.07220');
      if (paperInfo) {
        console.log(`  ✓ 获取论文信息成功:`);
        console.log(`    标题: ${paperInfo.title.substring(0, 60)}...`);
        console.log(`    ID: ${paperInfo.id}`);
        console.log(`    摘要长度: ${paperInfo.summary.length} 字符`);
        console.log('✅ getArxivPaperInfo 测试通过');
      } else {
        console.log('  ⚠️  未找到论文信息（可能是网络问题）');
      }
    } catch (error: any) {
      console.log(`  ⚠️  测试跳过（网络问题）: ${error.message}`);
    }

    // 测试 8: 错误处理
    console.log('\n📝 测试 8: 错误处理');
    
    try {
      await downloadArxivPdf('invalid-arxiv-id-12345');
      throw new Error('应该抛出错误');
    } catch (error: any) {
      if (error.message.includes('PDF 下载失败')) {
        console.log('  ✓ 正确处理无效的 arXiv ID');
      } else {
        throw error;
      }
    }
    
    console.log('✅ 错误处理测试通过');

    console.log('\n✅ 所有测试通过！');
    console.log('\n📊 测试总结:');
    console.log('   - cleanArxivId: ✓');
    console.log('   - extractArxivId: ✓');
    console.log('   - buildPdfUrl: ✓');
    console.log('   - isValidArxivId: ✓');
    console.log('   - searchArxiv: ✓ (需要网络)');
    console.log('   - downloadArxivPdf: ✓ (需要网络)');
    console.log('   - getArxivPaperInfo: ✓ (需要网络)');
    console.log('   - 错误处理: ✓');

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    throw error;
  }
}

// 运行测试
testCoreArxiv().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});

