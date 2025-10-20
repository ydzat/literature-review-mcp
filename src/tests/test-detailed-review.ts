/**
 * 测试详细的跨文献综述生成
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载 .env 文件
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { generateUnifiedLiteratureReview } from '../tools/batch-tools.js';
import { storage } from '../storage/StorageManager.js';
import * as fs from 'fs';

async function testDetailedCrossLiteratureReview() {
  console.log('\n=== 测试详细的跨文献综述生成 ===\n');

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
      console.log(`      - 单篇综述长度: ${p.individual_review?.length || 0} 字符`);
    });

    // 生成详细的跨文献综述
    console.log('\n🤖 开始生成详细的跨文献综述...');
    console.log('⏱️  预计需要 2-5 分钟，请耐心等待...\n');
    
    const startTime = Date.now();
    
    const result = await generateUnifiedLiteratureReview(
      arxivIds,
      0.3,  // 使用更低的温度以确保学术严谨性
      'Chain-of-Thought Reasoning'
    );
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ 详细跨文献综述生成成功 (耗时: ${duration}秒)`);
    console.log(`   综述 ID: ${result.reviewId}`);
    console.log(`   文件路径: ${result.reviewPath}`);
    console.log(`   论文数量: ${result.paperCount}`);
    
    // 验证文件存在
    if (fs.existsSync(result.reviewPath)) {
      const content = fs.readFileSync(result.reviewPath, 'utf-8');
      const lines = content.split('\n').length;
      const words = content.length;
      
      console.log(`\n📊 综述统计:`);
      console.log(`   总字符数: ${words.toLocaleString()}`);
      console.log(`   总行数: ${lines.toLocaleString()}`);
      console.log(`   预估字数: ${Math.round(words * 0.4).toLocaleString()} (中文)`);
      
      // 显示前 500 字符
      console.log(`\n📄 综述预览 (前 500 字符):`);
      console.log('─'.repeat(80));
      console.log(content.substring(0, 500));
      console.log('...');
      console.log('─'.repeat(80));
      
      // 分析章节结构
      const sections = content.match(/^##\s+.+$/gm) || [];
      console.log(`\n📑 章节结构 (${sections.length} 个主要章节):`);
      sections.forEach((section, idx) => {
        console.log(`   ${idx + 1}. ${section.replace('## ', '')}`);
      });
      
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
      console.log(`   内容长度: ${review.content?.length.toLocaleString() || 0} 字符`);
      console.log(`   预估字数: ${Math.round((review.content?.length || 0) * 0.4).toLocaleString()} (中文)`);
    } else {
      console.log('❌ 数据库记录不存在');
    }

    console.log(`\n💡 提示: 完整综述已保存到:`);
    console.log(`   ${result.reviewPath}`);

  } catch (error: any) {
    console.error(`❌ 测试失败: ${error.message}`);
    console.error(error.stack);
  }
}

async function main() {
  console.log('🧪 开始测试详细的跨文献综述生成...\n');
  
  await testDetailedCrossLiteratureReview();
  
  console.log('\n✅ 测试完成！');
}

main().catch(console.error);

