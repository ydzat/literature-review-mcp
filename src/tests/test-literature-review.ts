/**
 * 完整文献综述功能测试
 * 真实运行：搜索 -> 下载 -> 分析 -> 综述生成 -> Notion 导出
 */

import dotenv from 'dotenv';
import { storage } from '../storage/StorageManager.js';
import { searchAcrossAllSources } from '../sources/unified.js';
import { batchDownloadPDFs } from '../batch/download.js';
import { batchAnalyzePapers } from '../batch/analyze.js';
import { generateUnifiedLiteratureReview } from '../batch/unified-review.js';
import { exportToNotionFull } from '../notion/export.js';

// 加载 .env 文件
dotenv.config();

async function testLiteratureReviewWorkflow() {
  console.log('=== 完整文献综述功能测试（真实运行）===\n');
  console.log('⚠️  注意：此测试将真实调用 AI API，会消耗 API 额度\n');

  try {
    // 步骤 1: 真实搜索论文
    console.log('📝 步骤 1: 搜索学术论文（关键词: "chain of thought reasoning"）...');
    const searchResult = await searchAcrossAllSources({
      query: 'chain of thought reasoning',
      maxResults: 5,
      sources: ['dblp', 'openreview', 'paperswithcode']
    });

    console.log(`\n✅ 搜索完成: 找到 ${searchResult.papers.length} 篇论文`);

    if (searchResult.papers.length === 0) {
      console.log('⚠️  未找到论文，测试结束');
      return;
    }

    // 显示搜索到的论文
    console.log('\n📚 搜索到的论文:');
    searchResult.papers.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.title.slice(0, 60)}...`);
      console.log(`     来源: ${p.source}, 年份: ${p.year || 'N/A'}`);
    });

    // 保存到数据库并获取 ID
    const paperIds: number[] = [];
    const arxivIds: string[] = [];

    console.log('\n📝 保存论文到数据库...');
    for (const paper of searchResult.papers) {
      const id = storage.db.insertOrUpdatePaper({
        arxiv_id: paper.id,
        title: paper.title,
        abstract: paper.abstract,
        year: paper.year,
        publication_date: paper.publicationDate,
        venue: paper.venue,
        venue_rank: paper.venueRank as any,
        citation_count: paper.citationCount,
        peer_review_status: paper.peerReviewStatus as any,
        pdf_url: paper.pdfUrl,
        source: paper.source
      });
      paperIds.push(id);
      arxivIds.push(paper.id);
    }
    console.log(`✅ 已保存 ${paperIds.length} 篇论文到数据库`);

    // 步骤 2: 批量下载 PDF
    console.log(`\n📥 步骤 2: 批量并发下载 PDF（${searchResult.papers.length} 篇论文，并发数=3）...`);

    const papersToDownload = searchResult.papers
      .filter(p => p.pdfUrl)
      .map(p => ({ arxivId: p.id, pdfUrl: p.pdfUrl! }));

    if (papersToDownload.length === 0) {
      console.log('⚠️  没有可下载的 PDF URL，跳过下载步骤');
    } else {
      const downloadResults = await batchDownloadPDFs(papersToDownload, {
        maxConcurrent: 3,
        maxRetries: 2
      });

      const downloadSuccess = downloadResults.filter(r => r.success).length;
      const downloadFailed = downloadResults.filter(r => !r.success).length;
      console.log(`\n📊 下载统计: 成功 ${downloadSuccess}/${downloadResults.length}, 失败 ${downloadFailed}`);

      // 验证 PDF 是否保存到数据库
      console.log('\n📝 验证 PDF 路径是否保存到数据库...');
      let pdfSavedCount = 0;
      for (const id of paperIds) {
        const paper = storage.db.getPaperById(id);
        if (paper?.pdf_path) {
          pdfSavedCount++;
        }
      }
      console.log(`  ✓ ${pdfSavedCount}/${paperIds.length} 篇论文的 PDF 路径已保存到数据库`);
    }

    // 步骤 3: 批量分析论文
    console.log(`\n🔍 步骤 3: 批量并发分析论文（${arxivIds.length} 篇，并发数=2）...`);
    console.log('⚠️  这将调用 AI API 进行深度分析，可能需要几分钟...\n');

    const analyzeResults = await batchAnalyzePapers(arxivIds, {
      maxConcurrent: 2,
      temperature: 0.3,
      skipExisting: false
    });

    const analyzeSuccess = analyzeResults.filter(r => r.success).length;
    const analyzeFailed = analyzeResults.filter(r => !r.success).length;
    console.log(`\n📊 分析统计: 成功 ${analyzeSuccess}/${analyzeResults.length}, 失败 ${analyzeFailed}`);

    if (analyzeSuccess === 0) {
      console.log('⚠️  没有成功分析的论文，跳过综述生成');
      return;
    }

    // 步骤 4: 验证单篇分析是否保存到数据库
    console.log('\n📊 步骤 4: 验证单篇分析是否保存到数据库...');
    let reviewSavedCount = 0;
    for (const id of paperIds) {
      const paper = storage.db.getPaperById(id);
      if (paper?.individual_review) {
        reviewSavedCount++;
        console.log(`  ✓ ${paper.arxiv_id}: ${paper.individual_review.length} 字符`);
      } else {
        console.log(`  ✗ ${paper?.arxiv_id || id}: 缺少单篇分析`);
      }
    }
    console.log(`\n✅ ${reviewSavedCount}/${paperIds.length} 篇论文的单篇分析已保存到数据库`);

    // 步骤 5: 生成统一文献综述
    console.log(`\n📚 步骤 5: 生成统一文献综述（基于 ${reviewSavedCount} 篇单篇分析）...`);
    console.log('⚠️  这将调用 AI API 进行综合分析，可能需要 1-2 分钟...\n');

    const reviewResult = await generateUnifiedLiteratureReview(paperIds, {
      temperature: 0.4,
      focusArea: 'Chain-of-Thought Reasoning in Large Language Models'
    });

    if (reviewResult.success) {
      console.log(`\n✅ 统一综述生成成功！`);
      console.log(`   综述 ID: ${reviewResult.reviewId}`);
      console.log(`   字数: ${reviewResult.reviewContent?.length}`);
      console.log(`\n--- 综述内容预览（前 800 字符）---`);
      console.log(reviewResult.reviewContent?.slice(0, 800) + '...\n');

      // 验证综述是否保存到数据库
      if (reviewResult.reviewId) {
        const review = storage.db.getReviewById(reviewResult.reviewId);
        if (review) {
          console.log(`✅ 综述已保存到数据库:`);
          console.log(`   标题: ${review.title}`);
          console.log(`   焦点领域: ${review.focus_area}`);
          console.log(`   包含论文数: ${review.total_papers}`);
          console.log(`   总字数: ${review.total_words}`);
        }

        // 验证 review_papers 关联是否创建
        const linkedPapers = storage.db.getPapersByReviewId(reviewResult.reviewId);
        console.log(`✅ 综述-论文关联已创建: ${linkedPapers.length} 篇论文`);
        if (linkedPapers.length !== reviewSavedCount) {
          console.warn(`⚠️  警告: 关联的论文数 (${linkedPapers.length}) 与预期 (${reviewSavedCount}) 不符`);
        }
      }

      // 步骤 6: 导出到 Notion
      console.log(`\n📤 步骤 6: 导出到 Notion (Full 模式)...`);
      const exportResult = await exportToNotionFull(paperIds, reviewResult.reviewId);

      if (exportResult.success && exportResult.notion_metadata) {
        console.log(`\n✅ Notion 导出成功！`);
        console.log(`   数据库条目: ${exportResult.notion_metadata.database_entries.length} 篇论文`);
        console.log(`   页面数: ${exportResult.notion_metadata.pages?.length || 0} 个`);
        console.log(`   - 单篇综述页面: ${(exportResult.notion_metadata.pages?.length || 0) - 1} 个`);
        console.log(`   - 统一综述页面: 1 个`);
      } else {
        console.log(`\n❌ Notion 导出失败: ${exportResult.error}`);
      }
    } else {
      console.log(`\n❌ 综述生成失败: ${reviewResult.error}`);
    }

    console.log('\n=== ✅ 完整文献综述流程测试完成！===');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    throw error;
  }
}

// 运行测试
testLiteratureReviewWorkflow().catch(console.error);

