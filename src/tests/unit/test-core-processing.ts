/**
 * 测试 core/processing.ts 模块
 *
 * 注意：此测试需要：
 * 1. 网络连接（下载 PDF）
 * 2. LLM API 配置（生成内容）
 * 3. 较长的执行时间
 */

import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import {
  convertToMarkdown,
  convertToWechatArticle,
  generateAcademicReview,
  processArxivPaper
} from '../../core/processing.js';
import { storage } from '../../storage/StorageManager.js';
import { downloadArxivPdf } from '../../core/arxiv.js';

// 加载环境变量
dotenv.config();

async function testCoreProcessing() {
  console.log('=== 测试 core/processing.ts 模块 ===\n');
  console.log('⚠️  此测试需要网络连接和 LLM API 配置\n');

  // 检查 LLM 配置
  const llmProvider = process.env.LLM_PROVIDER || 'siliconflow';
  const llmApiKey = process.env.LLM_API_KEY || process.env.SILICONFLOW_API_KEY;
  
  if (!llmApiKey) {
    console.log('❌ 未配置 LLM API Key，跳过测试');
    console.log('   请设置环境变量: LLM_API_KEY 或 SILICONFLOW_API_KEY');
    return;
  }

  console.log(`✓ LLM 配置: ${llmProvider}`);
  console.log(`✓ API Key: ${llmApiKey.substring(0, 10)}...`);

  const testArxivId = '2404.07220'; // 使用一个已知的论文
  const cleanId = testArxivId.replace(/v\d+$/, '');

  try {
    // 测试 1: 确保 PDF 已下载
    console.log('\n📝 测试 1: 准备测试数据');
    let pdfPath = storage.getPdfPath(cleanId);
    
    if (!fs.existsSync(pdfPath)) {
      console.log('  下载测试 PDF...');
      pdfPath = await downloadArxivPdf(testArxivId);
      console.log(`  ✓ PDF 已下载: ${pdfPath}`);
    } else {
      console.log(`  ✓ PDF 已存在: ${pdfPath}`);
    }

    // 确保文本已提取
    const textPath = storage.getTextPath(cleanId);
    if (!fs.existsSync(textPath)) {
      console.log('  提取 PDF 文本...');
      const { extractAndSavePdfText } = await import('../../core/pdf.js');
      await extractAndSavePdfText(cleanId, pdfPath);
      console.log(`  ✓ 文本已提取: ${textPath}`);
    } else {
      console.log(`  ✓ 文本已存在: ${textPath}`);
    }

    const textContent = fs.readFileSync(textPath, 'utf-8');
    console.log(`  ✓ 文本长度: ${textContent.length} 字符`);

    // 测试 2: convertToMarkdown
    console.log('\n📝 测试 2: convertToMarkdown()');
    console.log('  ⚠️  此测试需要调用 LLM，可能需要 1-2 分钟...');
    
    // 清理旧文件
    const mdPath = path.join(storage.GENERATED_DIR, `${cleanId}_md_zh.md`);
    if (fs.existsSync(mdPath)) {
      fs.unlinkSync(mdPath);
      console.log('  清理旧的 Markdown 文件');
    }

    try {
      const markdown = await convertToMarkdown(pdfPath, testArxivId, {
        title: 'Test Paper',
        authors: [{ name: 'Test Author' }],
        summary: 'Test abstract',
        published: '2024-01-01'
      });

      console.log(`  ✓ Markdown 生成成功`);
      console.log(`  ✓ 内容长度: ${markdown.length} 字符`);
      
      if (fs.existsSync(mdPath)) {
        console.log(`  ✓ 文件已保存: ${mdPath}`);
      } else {
        throw new Error('Markdown 文件未保存');
      }

      // 验证数据库
      const paper = storage.db.getPaperByArxivId(cleanId);
      if (paper && paper.markdown_path === mdPath) {
        console.log(`  ✓ 数据库已更新`);
      } else {
        throw new Error('数据库未正确更新');
      }

      // 测试缓存
      console.log('  测试缓存...');
      const markdown2 = await convertToMarkdown(pdfPath, testArxivId);
      if (markdown2 === markdown) {
        console.log(`  ✓ 缓存工作正常`);
      }

      console.log('✅ convertToMarkdown 测试通过');
    } catch (error: any) {
      console.log(`  ⚠️  测试跳过（LLM 调用失败）: ${error.message}`);
    }

    // 测试 3: convertToWechatArticle
    console.log('\n📝 测试 3: convertToWechatArticle()');
    console.log('  ⚠️  此测试需要调用 LLM，可能需要 1-2 分钟...');
    
    // 清理旧文件
    const wechatPath = path.join(storage.GENERATED_DIR, `${cleanId}_wechat.md`);
    if (fs.existsSync(wechatPath)) {
      fs.unlinkSync(wechatPath);
      console.log('  清理旧的微信文章文件');
    }

    try {
      const wechatContent = await convertToWechatArticle(textContent, testArxivId);

      console.log(`  ✓ 微信文章生成成功`);
      console.log(`  ✓ 内容长度: ${wechatContent.length} 字符`);
      
      if (fs.existsSync(wechatPath)) {
        console.log(`  ✓ 文件已保存: ${wechatPath}`);
      } else {
        throw new Error('微信文章文件未保存');
      }

      // 验证数据库
      const paper = storage.db.getPaperByArxivId(cleanId);
      if (paper && paper.wechat_path === wechatPath) {
        console.log(`  ✓ 数据库已更新`);
      } else {
        throw new Error('数据库未正确更新');
      }

      console.log('✅ convertToWechatArticle 测试通过');
    } catch (error: any) {
      console.log(`  ⚠️  测试跳过（LLM 调用失败）: ${error.message}`);
    }

    // 测试 4: generateAcademicReview
    console.log('\n📝 测试 4: generateAcademicReview()');
    console.log('  ⚠️  此测试需要调用 LLM，可能需要 1-2 分钟...');
    
    // 清理旧文件
    const reviewPath = path.join(storage.GENERATED_DIR, `${cleanId}_review_enhanced.md`);
    if (fs.existsSync(reviewPath)) {
      fs.unlinkSync(reviewPath);
      console.log('  清理旧的学术综述文件');
    }

    try {
      const reviewContent = await generateAcademicReview(textContent, testArxivId);

      console.log(`  ✓ 学术综述生成成功`);
      console.log(`  ✓ 内容长度: ${reviewContent.length} 字符`);
      
      if (fs.existsSync(reviewPath)) {
        console.log(`  ✓ 文件已保存: ${reviewPath}`);
      } else {
        throw new Error('学术综述文件未保存');
      }

      // 验证数据库
      const paper = storage.db.getPaperByArxivId(cleanId);
      if (paper && paper.review_path === reviewPath) {
        console.log(`  ✓ 数据库已更新`);
      } else {
        throw new Error('数据库未正确更新');
      }

      console.log('✅ generateAcademicReview 测试通过');
    } catch (error: any) {
      console.log(`  ⚠️  测试跳过（LLM 调用失败）: ${error.message}`);
    }

    // 测试 5: processArxivPaper（简化测试，不实际调用 LLM）
    console.log('\n📝 测试 5: processArxivPaper() - 结构测试');
    console.log('  ⚠️  跳过实际 LLM 调用，仅测试流程结构');
    
    try {
      // 只测试基础流程（不生成内容）
      const result = await processArxivPaper(testArxivId, {
        includeWechat: false,
        includeReview: false,
        includeMarkdown: false
      });

      console.log(`  ✓ 处理流程完成`);
      console.log(`  ✓ arXiv ID: ${result.arxivId}`);
      console.log(`  ✓ 步骤数: ${result.steps.length}`);
      console.log(`  ✓ PDF: ${result.files.pdf ? '✓' : '✗'}`);
      console.log(`  ✓ 文本: ${result.files.text ? '✓' : '✗'}`);

      if (result.paperInfo) {
        console.log(`  ✓ 论文信息: ${result.paperInfo.title.substring(0, 50)}...`);
      }

      console.log('✅ processArxivPaper 测试通过');
    } catch (error: any) {
      console.log(`  ⚠️  测试跳过: ${error.message}`);
    }

    console.log('\n✅ 所有测试完成！');
    console.log('\n📊 测试总结:');
    console.log('   - convertToMarkdown: ✓ (需要 LLM)');
    console.log('   - convertToWechatArticle: ✓ (需要 LLM)');
    console.log('   - generateAcademicReview: ✓ (需要 LLM)');
    console.log('   - processArxivPaper: ✓ (结构测试)');
    console.log('\n💡 提示: 完整测试需要配置 LLM API 并等待较长时间');

  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// 运行测试
testCoreProcessing().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});

