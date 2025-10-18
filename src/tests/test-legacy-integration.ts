/**
 * 测试旧功能与数据库集成
 */

import { storage } from '../storage/StorageManager.js';

async function testLegacyIntegration() {
  console.log('=== 测试旧功能数据库集成 ===\n');

  try {
    // 测试 1: 模拟 searchArxivPapers 保存论文到数据库
    console.log('📝 测试 1: 保存论文元数据到数据库');
    const testPaper = {
      arxiv_id: '2403.15137',
      title: 'Test Paper: Attention Is All You Need',
      abstract: 'This is a test abstract about transformers and attention mechanisms.',
      publication_date: '2024-03-15',
      pdf_url: 'http://arxiv.org/pdf/2403.15137.pdf',
      source: 'arxiv'
    };

    const paperId = storage.db.insertOrUpdatePaper(testPaper);
    console.log(`✅ 论文已保存，ID: ${paperId}`);

    // 测试 2: 保存作者并建立关联
    console.log('\n📝 测试 2: 保存作者并建立关联');
    const authors = [
      { name: 'Ashish Vaswani' },
      { name: 'Noam Shazeer' },
      { name: 'Niki Parmar' }
    ];

    authors.forEach((author, index) => {
      const authorId = storage.db.getOrCreateAuthor(author);
      storage.db.linkPaperAuthor(paperId, authorId, index + 1);
      console.log(`✅ 作者已保存并关联: ${author.name}`);
    });

    // 测试 3: 模拟 downloadArxivPdf 更新 pdf_path
    console.log('\n📝 测试 3: 更新 PDF 路径');
    const pdfPath = storage.getPdfPath('2403.15137');
    storage.db.updatePaper('2403.15137', { pdf_path: pdfPath });
    console.log(`✅ PDF 路径已更新: ${pdfPath}`);

    // 测试 4: 模拟 parsePdfToText 更新 text_path
    console.log('\n📝 测试 4: 更新文本路径');
    const textPath = storage.getTextPath('2403.15137');
    storage.db.updatePaper('2403.15137', { text_path: textPath });
    console.log(`✅ 文本路径已更新: ${textPath}`);

    // 测试 5: 模拟 convertToAcademicReviewEnhanced 保存综述
    console.log('\n📝 测试 5: 保存学术综述到数据库');
    const paper = storage.db.getPaperByArxivId('2403.15137');
    if (paper) {
      const reviewId = storage.db.insertReview({
        title: `${paper.title} - 学术综述`,
        focus_area: 'single-paper-review',
        content: '这是一篇关于 Transformer 架构的详细学术综述...',
        total_papers: 1,
        total_words: 5000,
        ai_generated_ratio: 1.0
      });
      console.log(`✅ 综述已保存，ID: ${reviewId}`);
    }

    // 测试 6: 查询论文及其作者
    console.log('\n📝 测试 6: 查询论文及其作者');
    const savedPaper = storage.db.getPaperByArxivId('2403.15137');
    if (savedPaper) {
      console.log(`✅ 论文: ${savedPaper.title}`);
      console.log(`   PDF: ${savedPaper.pdf_path}`);
      console.log(`   文本: ${savedPaper.text_path}`);

      const paperAuthors = storage.db.getPaperAuthors(savedPaper.id!);
      console.log(`   作者 (${paperAuthors.length}):`);
      paperAuthors.forEach(author => {
        console.log(`     - ${author.name}`);
      });
    }

    // 测试 7: 查询所有综述
    console.log('\n📝 测试 7: 查询所有综述');
    const reviews = storage.db.getAllReviews();
    console.log(`✅ 找到 ${reviews.length} 篇综述`);
    reviews.forEach(review => {
      console.log(`   - ${review.title} (${review.total_words} 字)`);
    });

    // 测试 8: 测试缓存功能
    console.log('\n📝 测试 8: 测试缓存功能');
    const cacheKey = 'arxiv_search:transformer:5';
    const cacheData = {
      totalResults: 100,
      papers: [testPaper]
    };
    storage.db.setCache(cacheKey, cacheData, 24 * 60 * 60);
    console.log('✅ 缓存已保存');

    const cachedData = storage.db.getCache(cacheKey);
    if (cachedData) {
      console.log(`✅ 缓存读取成功，包含 ${cachedData.papers.length} 篇论文`);
    }

    // 测试 9: 查询作者的所有论文
    console.log('\n📝 测试 9: 查询作者的所有论文');
    const authorPapers = storage.db.getPapersByAuthor('Ashish Vaswani');
    console.log(`✅ 作者 "Ashish Vaswani" 有 ${authorPapers.length} 篇论文`);

    console.log('\n✅ 所有测试通过！');
    console.log('\n=== 数据库集成测试完成 ===');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  }
}

// 运行测试
testLegacyIntegration().catch(console.error);

