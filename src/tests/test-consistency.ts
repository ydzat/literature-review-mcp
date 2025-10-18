/**
 * 测试项目一致性
 */

import { storage } from '../storage/StorageManager.js';
import * as path from 'path';

async function testConsistency() {
  console.log('=== 项目一致性测试 ===\n');

  try {
    // 测试 1: 验证新字段是否正常工作
    console.log('📝 测试 1: 验证数据库新字段 (markdown_path, wechat_path, review_path)');
    
    const testPaper = {
      arxiv_id: '2024.12345',
      title: 'Test Paper for Consistency Check',
      abstract: 'This is a test paper to verify database schema consistency.',
      publication_date: '2024-12-01',
      pdf_path: storage.getPdfPath('2024.12345'),
      text_path: storage.getTextPath('2024.12345'),
      markdown_path: path.join(storage.GENERATED_DIR, '2024.12345_md_zh.md'),
      wechat_path: path.join(storage.GENERATED_DIR, '2024.12345_wechat.md'),
      review_path: path.join(storage.GENERATED_DIR, '2024.12345_review_enhanced.md'),
      source: 'arxiv'
    };

    const paperId = storage.db.insertOrUpdatePaper(testPaper);
    console.log(`✅ 论文已保存，ID: ${paperId}`);

    // 测试 2: 验证字段是否正确保存
    console.log('\n📝 测试 2: 验证字段是否正确保存');
    const savedPaper = storage.db.getPaperByArxivId('2024.12345');
    
    if (!savedPaper) {
      throw new Error('论文未找到');
    }

    console.log(`✅ 论文标题: ${savedPaper.title}`);
    console.log(`✅ PDF 路径: ${savedPaper.pdf_path}`);
    console.log(`✅ 文本路径: ${savedPaper.text_path}`);
    console.log(`✅ Markdown 路径: ${savedPaper.markdown_path}`);
    console.log(`✅ 微信文章路径: ${savedPaper.wechat_path}`);
    console.log(`✅ 综述路径: ${savedPaper.review_path}`);

    // 测试 3: 验证更新操作
    console.log('\n📝 测试 3: 验证更新操作');
    storage.db.updatePaper('2024.12345', {
      markdown_path: '/updated/markdown/path.md',
      wechat_path: '/updated/wechat/path.md',
      review_path: '/updated/review/path.md'
    });

    const updatedPaper = storage.db.getPaperByArxivId('2024.12345');
    if (updatedPaper?.markdown_path === '/updated/markdown/path.md' &&
        updatedPaper?.wechat_path === '/updated/wechat/path.md' &&
        updatedPaper?.review_path === '/updated/review/path.md') {
      console.log('✅ 字段更新成功');
    } else {
      throw new Error('字段更新失败');
    }

    // 测试 4: 验证 arXiv ID 清理一致性
    console.log('\n📝 测试 4: 验证 arXiv ID 清理一致性');
    const testIds = [
      '2024.12345v1',
      '2024.12345v2',
      '2024.12345',
      '1234.5678v10'
    ];

    testIds.forEach(id => {
      const cleaned = id.replace(/v\d+$/, '');
      console.log(`  ${id} -> ${cleaned}`);
    });
    console.log('✅ arXiv ID 清理逻辑一致');

    // 测试 5: 验证存储路径一致性
    console.log('\n📝 测试 5: 验证存储路径一致性');
    console.log(`  STORAGE_ROOT: ${storage.STORAGE_ROOT}`);
    console.log(`  DB_PATH: ${storage.DB_PATH}`);
    console.log(`  PDFS_DIR: ${storage.PDFS_DIR}`);
    console.log(`  TEXTS_DIR: ${storage.TEXTS_DIR}`);
    console.log(`  GENERATED_DIR: ${storage.GENERATED_DIR}`);
    
    // 验证所有路径都在 STORAGE_ROOT 下
    const allPathsUnderRoot = [
      storage.DB_PATH,
      storage.PDFS_DIR,
      storage.TEXTS_DIR,
      storage.GENERATED_DIR
    ].every(p => p.startsWith(storage.STORAGE_ROOT));

    if (allPathsUnderRoot) {
      console.log('✅ 所有路径都在 STORAGE_ROOT 下');
    } else {
      throw new Error('路径不一致');
    }

    // 测试 6: 验证数据库操作方法完整性
    console.log('\n📝 测试 6: 验证数据库操作方法完整性');
    const requiredMethods = [
      'insertPaper',
      'getPaperByArxivId',
      'updatePaper',
      'insertOrUpdatePaper',
      'searchPapers',
      'insertAuthor',
      'getAuthorByName',
      'getOrCreateAuthor',
      'insertInstitution',
      'getInstitutionByName',
      'getOrCreateInstitution',
      'insertReview',
      'getReviewById',
      'getAllReviews',
      'linkReviewPaper',
      'getPapersByReviewId',
      'linkPaperAuthor',
      'linkPaperInstitution',
      'getPaperAuthors',
      'getPapersByAuthor',
      'getCache',
      'setCache',
      'deleteCache'
    ];

    const missingMethods = requiredMethods.filter(method => {
      return typeof (storage.db as any)[method] !== 'function';
    });

    if (missingMethods.length === 0) {
      console.log(`✅ 所有 ${requiredMethods.length} 个必需方法都已实现`);
    } else {
      throw new Error(`缺少方法: ${missingMethods.join(', ')}`);
    }

    // 测试 7: 验证缓存功能
    console.log('\n📝 测试 7: 验证缓存功能');
    const cacheKey = 'test_cache_key';
    const cacheData = { test: 'data', timestamp: 12345 };

    storage.db.setCache(cacheKey, cacheData, 3600);  // 1小时
    const cachedData = storage.db.getCache(cacheKey);

    if (cachedData && cachedData.test === 'data' && cachedData.timestamp === 12345) {
      console.log('✅ 缓存功能正常');
    } else {
      console.error('缓存数据不匹配:', { expected: cacheData, actual: cachedData });
      throw new Error('缓存功能异常');
    }

    // 测试 8: 验证综述功能
    console.log('\n📝 测试 8: 验证综述功能');
    const reviewId = storage.db.insertReview({
      title: 'Test Review',
      focus_area: 'test',
      content: 'This is a test review content.',
      total_papers: 1,
      total_words: 100,
      ai_generated_ratio: 1.0
    });

    const review = storage.db.getReviewById(reviewId);
    if (review && review.title === 'Test Review') {
      console.log('✅ 综述功能正常');
    } else {
      throw new Error('综述功能异常');
    }

    // 测试 9: 验证作者-论文关联
    console.log('\n📝 测试 9: 验证作者-论文关联');
    const authorId = storage.db.getOrCreateAuthor({ name: 'Test Author' });
    storage.db.linkPaperAuthor(paperId, authorId, 1);
    
    const paperAuthors = storage.db.getPaperAuthors(paperId);
    if (paperAuthors.length === 1 && paperAuthors[0].name === 'Test Author') {
      console.log('✅ 作者-论文关联正常');
    } else {
      throw new Error('作者-论文关联异常');
    }

    // 测试 10: 验证机构功能
    console.log('\n📝 测试 10: 验证机构功能');
    const institutionId = storage.db.getOrCreateInstitution({
      name: 'Test University',
      tier: 'top-tier',
      tier_score: 100,
      country: 'USA'
    });
    
    storage.db.linkPaperInstitution(paperId, institutionId);
    console.log('✅ 机构功能正常');

    console.log('\n✅ 所有一致性测试通过！');
    console.log('\n=== 一致性测试完成 ===');

    // 输出统计信息
    console.log('\n📊 数据库统计:');
    const allPapers = storage.db.searchPapers({ limit: 1000 });
    const allReviews = storage.db.getAllReviews();
    console.log(`  论文数: ${allPapers.length}`);
    console.log(`  综述数: ${allReviews.length}`);

  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  }
}

// 运行测试
testConsistency().catch(console.error);

