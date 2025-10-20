/**
 * 测试综述导出功能
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载 .env 文件
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { exportIndividualReviewToMd, batchExportIndividualReviews } from '../tools/export-tools.js';
import { generateUnifiedLiteratureReview } from '../tools/batch-tools.js';
import { storage } from '../storage/StorageManager.js';
import * as fs from 'fs';

async function testExportIndividualReview() {
  console.log('\n=== 测试 1: 导出单篇综述 ===\n');

  try {
    // 获取第一篇有综述的论文
    const papers = storage.db.getAllPapers().filter(p => p.individual_review);
    
    if (papers.length === 0) {
      console.log('❌ 没有找到有单篇综述的论文');
      return;
    }

    const testPaper = papers[0];
    console.log(`📄 测试论文: ${testPaper.title}`);
    console.log(`   arXiv ID: ${testPaper.arxiv_id}`);

    // 导出单篇综述
    const filePath = await exportIndividualReviewToMd(testPaper.arxiv_id);
    
    console.log(`✅ 导出成功: ${filePath}`);
    
    // 验证文件存在
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      console.log(`   文件大小: ${content.length} 字符`);
      console.log(`   前 200 字符:\n${content.substring(0, 200)}...`);
    } else {
      console.log('❌ 文件不存在');
    }

  } catch (error: any) {
    console.error(`❌ 测试失败: ${error.message}`);
  }
}

async function testBatchExportReviews() {
  console.log('\n=== 测试 2: 批量导出单篇综述 ===\n');

  try {
    const result = await batchExportIndividualReviews();
    
    console.log(`✅ 批量导出完成`);
    console.log(`   成功: ${result.success}`);
    console.log(`   失败: ${result.failed}`);
    console.log(`   文件列表 (前 5 个):`);
    result.files.slice(0, 5).forEach(f => {
      console.log(`   - ${f}`);
    });

  } catch (error: any) {
    console.error(`❌ 测试失败: ${error.message}`);
  }
}

async function testGenerateCrossLiteratureReview() {
  console.log('\n=== 测试 3: 生成跨文献综述 ===\n');

  try {
    // 获取前 3 篇有综述的论文
    const papers = storage.db.getAllPapers().filter(p => p.individual_review).slice(0, 3);
    
    if (papers.length < 2) {
      console.log('❌ 至少需要 2 篇有单篇综述的论文');
      return;
    }

    const arxivIds = papers.map(p => p.arxiv_id);
    console.log(`📚 测试论文 (${arxivIds.length} 篇):`);
    papers.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.title}`);
    });

    // 生成跨文献综述
    console.log('\n🤖 开始生成跨文献综述...');
    const result = await generateUnifiedLiteratureReview(
      arxivIds,
      0.4,
      'Chain-of-Thought Reasoning'
    );
    
    console.log(`\n✅ 跨文献综述生成成功`);
    console.log(`   综述 ID: ${result.reviewId}`);
    console.log(`   文件路径: ${result.reviewPath}`);
    console.log(`   论文数量: ${result.paperCount}`);
    
    // 验证文件存在
    if (fs.existsSync(result.reviewPath)) {
      const content = fs.readFileSync(result.reviewPath, 'utf-8');
      console.log(`   文件大小: ${content.length} 字符`);
      console.log(`   前 300 字符:\n${content.substring(0, 300)}...`);
    } else {
      console.log('❌ 文件不存在');
    }

    // 验证数据库记录
    const review = storage.db.getReviewById(result.reviewId);
    if (review) {
      console.log(`\n✅ 数据库记录验证成功`);
      console.log(`   标题: ${review.title}`);
      console.log(`   聚焦领域: ${review.focus_area}`);
      console.log(`   论文数量: ${review.total_papers}`);
      console.log(`   内容长度: ${review.content?.length || 0} 字符`);
    } else {
      console.log('❌ 数据库记录不存在');
    }

  } catch (error: any) {
    console.error(`❌ 测试失败: ${error.message}`);
    console.error(error.stack);
  }
}

async function main() {
  console.log('🧪 开始测试综述导出功能...\n');

  // 测试 1: 导出单篇综述
  await testExportIndividualReview();

  // 测试 2: 批量导出（可选，如果论文较多可以跳过）
  // await testBatchExportReviews();

  // 测试 3: 生成跨文献综述
  await testGenerateCrossLiteratureReview();

  console.log('\n✅ 所有测试完成！');
}

main().catch(console.error);

