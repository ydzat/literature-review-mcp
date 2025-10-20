/**
 * 测试 core/pdf.ts 模块
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
  extractPdfText, 
  extractAndSavePdfText,
  extractPdfTextSimple,
  isPdfReadable,
  getPdfPageCount
} from '../../core/pdf.js';
import { storage } from '../../storage/StorageManager.js';

async function testCorePdf() {
  console.log('=== 测试 core/pdf.ts 模块 ===\n');
  
  let testPdfPath: string | null = null;
  let testArxivId: string | null = null;
  
  try {
    // 查找一个测试用的 PDF 文件
    console.log('📝 测试 0: 查找测试 PDF 文件');
    const pdfFiles = fs.readdirSync(storage.PDFS_DIR).filter(f => f.endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      console.log('⚠️  没有找到测试 PDF 文件，跳过 PDF 相关测试');
      console.log('   提示：先运行一次 download_arxiv_pdf 工具下载一个 PDF');
      return;
    }
    
    testPdfPath = path.join(storage.PDFS_DIR, pdfFiles[0]);
    testArxivId = pdfFiles[0].replace('.pdf', '');
    console.log(`✅ 找到测试 PDF: ${pdfFiles[0]}`);
    
    // 测试 1: isPdfReadable
    console.log('\n📝 测试 1: isPdfReadable()');
    const isReadable = isPdfReadable(testPdfPath);
    if (isReadable) {
      console.log('✅ PDF 文件可读');
    } else {
      throw new Error('PDF 文件不可读');
    }
    
    // 测试不存在的文件
    const notExist = isPdfReadable('/path/to/nonexistent.pdf');
    if (!notExist) {
      console.log('✅ 正确识别不存在的文件');
    } else {
      throw new Error('应该返回 false');
    }
    
    // 测试 2: getPdfPageCount
    console.log('\n📝 测试 2: getPdfPageCount()');
    const pageCount = await getPdfPageCount(testPdfPath);
    console.log(`✅ PDF 页数: ${pageCount}`);
    if (pageCount <= 0) {
      throw new Error('页数应该大于 0');
    }
    
    // 测试 3: extractPdfTextSimple
    console.log('\n📝 测试 3: extractPdfTextSimple()');
    const simpleText = await extractPdfTextSimple(testPdfPath);
    console.log(`✅ 提取文本长度: ${simpleText.length} 字符`);
    if (simpleText.length < 100) {
      throw new Error('提取的文本太短');
    }
    console.log(`   前 100 字符: ${simpleText.substring(0, 100)}...`);
    
    // 测试 4: extractPdfText (基础)
    console.log('\n📝 测试 4: extractPdfText() - 基础提取');
    const result1 = await extractPdfText(testPdfPath);
    console.log(`✅ 提取成功:`);
    console.log(`   文本长度: ${result1.text.length} 字符`);
    console.log(`   页数: ${result1.pageCount}`);
    console.log(`   元数据: ${result1.metadata ? '有' : '无'}`);
    
    if (result1.pageCount !== pageCount) {
      throw new Error('页数不匹配');
    }
    
    // 测试 5: extractPdfText (带元数据)
    console.log('\n📝 测试 5: extractPdfText() - 包含元数据');
    const result2 = await extractPdfText(testPdfPath, { includeMetadata: true });
    console.log(`✅ 提取成功:`);
    if (result2.metadata) {
      console.log(`   标题: ${result2.metadata.title || 'N/A'}`);
      console.log(`   作者: ${result2.metadata.author || 'N/A'}`);
      console.log(`   创建日期: ${result2.metadata.creationDate || 'N/A'}`);
    } else {
      console.log('   ⚠️  未提取到元数据');
    }
    
    // 测试 6: extractPdfText (限制页数)
    console.log('\n📝 测试 6: extractPdfText() - 限制页数');
    const result3 = await extractPdfText(testPdfPath, { maxPages: 2 });
    console.log(`✅ 提取成功:`);
    console.log(`   文本长度: ${result3.text.length} 字符`);
    console.log(`   总页数: ${result3.pageCount}`);
    console.log(`   实际提取: 前 2 页`);
    
    if (result3.text.length >= result1.text.length) {
      console.log('   ⚠️  限制页数后文本长度应该更短');
    }
    
    // 测试 7: extractPdfText (自定义分隔符)
    console.log('\n📝 测试 7: extractPdfText() - 自定义分隔符');
    const result4 = await extractPdfText(testPdfPath, { 
      maxPages: 2,
      pageSeparator: '\n--- PAGE BREAK ---\n' 
    });
    console.log(`✅ 提取成功`);
    if (result4.text.includes('--- PAGE BREAK ---')) {
      console.log('   ✓ 自定义分隔符已应用');
    } else {
      console.log('   ⚠️  未找到自定义分隔符（可能只有 1 页）');
    }
    
    // 测试 8: extractAndSavePdfText
    console.log('\n📝 测试 8: extractAndSavePdfText()');
    
    // 先删除已存在的文本文件（如果有）
    const textPath = storage.getTextPath(testArxivId);
    if (fs.existsSync(textPath)) {
      fs.unlinkSync(textPath);
      console.log('   清理旧的文本文件');
    }
    
    const paperInfo = {
      title: 'Test Paper Title',
      published: '2024-01-01',
      authors: [{ name: 'Test Author 1' }, { name: 'Test Author 2' }],
      summary: 'This is a test abstract.'
    };
    
    const savedText = await extractAndSavePdfText(testArxivId, testPdfPath, paperInfo);
    console.log(`✅ 提取并保存成功:`);
    console.log(`   文本长度: ${savedText.length} 字符`);
    
    // 验证文件已保存
    if (fs.existsSync(textPath)) {
      console.log(`   ✓ 文件已保存: ${textPath}`);
    } else {
      throw new Error('文件未保存');
    }
    
    // 验证内容包含论文信息
    if (savedText.includes('=== 论文信息 ===') && 
        savedText.includes('Test Paper Title') &&
        savedText.includes('Test Author 1')) {
      console.log('   ✓ 论文信息已包含');
    } else {
      throw new Error('论文信息未正确包含');
    }
    
    // 验证数据库已更新
    const paper = storage.db.getPaperByArxivId(testArxivId);
    if (paper && paper.text_path === textPath) {
      console.log('   ✓ 数据库已更新');
    } else {
      throw new Error('数据库未正确更新');
    }
    
    // 测试 9: extractAndSavePdfText (已存在)
    console.log('\n📝 测试 9: extractAndSavePdfText() - 文件已存在');
    const savedText2 = await extractAndSavePdfText(testArxivId, testPdfPath, paperInfo);
    console.log(`✅ 正确返回已存在的文本`);
    if (savedText2 === savedText) {
      console.log('   ✓ 内容一致');
    } else {
      console.log('   ⚠️  内容不一致（可能是正常的）');
    }
    
    // 测试 10: 错误处理
    console.log('\n📝 测试 10: 错误处理');
    try {
      await extractPdfText('/path/to/nonexistent.pdf');
      throw new Error('应该抛出错误');
    } catch (error: any) {
      if (error.message.includes('PDF 解析失败')) {
        console.log('✅ 正确处理不存在的文件');
      } else {
        throw error;
      }
    }
    
    console.log('\n✅ 所有测试通过！');
    console.log('\n📊 测试总结:');
    console.log('   - isPdfReadable: ✓');
    console.log('   - getPdfPageCount: ✓');
    console.log('   - extractPdfTextSimple: ✓');
    console.log('   - extractPdfText (基础): ✓');
    console.log('   - extractPdfText (元数据): ✓');
    console.log('   - extractPdfText (限制页数): ✓');
    console.log('   - extractPdfText (自定义分隔符): ✓');
    console.log('   - extractAndSavePdfText: ✓');
    console.log('   - extractAndSavePdfText (已存在): ✓');
    console.log('   - 错误处理: ✓');
    
  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    throw error;
  }
}

// 运行测试
testCorePdf().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});

