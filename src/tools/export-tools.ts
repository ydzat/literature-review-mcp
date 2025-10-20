/**
 * 导出相关工具函数
 */

import { exportToNotionFull, exportToNotionUpdate, NotionExportResult } from '../notion/export.js';
import { storage } from '../storage/StorageManager.js';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 导出完整的 Notion 元数据
 */
export async function exportToNotionFullTool(
  arxivId: string,
  databaseId: string
): Promise<NotionExportResult> {
  try {
    // 临时实现：返回错误提示
    throw new Error('Notion 导出功能需要配置 Notion API，请参考文档配置');
  } catch (error: any) {
    throw new Error(`导出到 Notion 失败: ${error.message}`);
  }
}

/**
 * 只导出增量内容的 Notion 元数据
 */
export async function exportToNotionUpdateTool(
  arxivId: string,
  pageId: string
): Promise<NotionExportResult> {
  try {
    // 临时实现：返回错误提示
    throw new Error('Notion 导出功能需要配置 Notion API，请参考文档配置');
  } catch (error: any) {
    throw new Error(`导出增量到 Notion 失败: ${error.message}`);
  }
}

/**
 * 将数据库中的单篇文献综述导出为 Markdown 文件
 */
export async function exportIndividualReviewToMd(
  arxivId: string
): Promise<string> {
  try {
    console.log(`\n📤 导出单篇综述: ${arxivId}`);

    // 1. 从数据库获取论文信息和 individual_review
    const paper = storage.db.getPaperByArxivId(arxivId);

    if (!paper) {
      throw new Error(`论文 ${arxivId} 不存在于数据库中`);
    }

    if (!paper.individual_review) {
      throw new Error(`论文 ${arxivId} 尚未生成单篇综述。请先运行 batch_analyze_papers`);
    }

    // 2. 构造文件名：论文标题_综述.md
    const safeTitle = paper.title
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
      .substring(0, 50);
    const filename = `${safeTitle}_综述.md`;
    const outputPath = path.join(storage.GENERATED_DIR, filename);

    // 3. 构造文件内容（添加元数据）
    const fileContent = `# ${paper.title}

**arXiv ID**: ${paper.arxiv_id}
**发布日期**: ${paper.publication_date || 'N/A'}
**会议/期刊**: ${paper.venue || 'N/A'}
**引用数**: ${paper.citation_count || 0}
**导出时间**: ${new Date().toLocaleString('zh-CN')}

---

${paper.individual_review}
`;

    // 4. 写入文件
    fs.writeFileSync(outputPath, fileContent, 'utf-8');
    console.log(`✅ 单篇综述已导出: ${filename}`);

    // 5. 更新数据库的 review_path 字段
    storage.db.updatePaper(arxivId, { review_path: outputPath });

    return outputPath;
  } catch (error: any) {
    throw new Error(`导出单篇综述失败: ${error.message}`);
  }
}

/**
 * 批量导出所有有单篇综述的论文
 */
export async function batchExportIndividualReviews(): Promise<{
  success: number;
  failed: number;
  files: string[];
}> {
  try {
    console.log(`\n📤 批量导出所有单篇综述...`);

    // 1. 获取所有有 individual_review 的论文
    const allPapers = storage.db.getAllPapers();
    const papersWithReview = allPapers.filter(p => p.individual_review);

    if (papersWithReview.length === 0) {
      throw new Error('数据库中没有任何单篇综述。请先运行 batch_analyze_papers');
    }

    console.log(`✅ 找到 ${papersWithReview.length} 篇论文有单篇综述`);

    // 2. 批量导出
    const files: string[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const paper of papersWithReview) {
      try {
        const filePath = await exportIndividualReviewToMd(paper.arxiv_id);
        files.push(filePath);
        successCount++;
      } catch (error: any) {
        console.error(`❌ 导出失败: ${paper.arxiv_id} - ${error.message}`);
        failedCount++;
      }
    }

    console.log(`\n📊 批量导出完成: 成功 ${successCount}, 失败 ${failedCount}`);

    return {
      success: successCount,
      failed: failedCount,
      files
    };
  } catch (error: any) {
    throw new Error(`批量导出失败: ${error.message}`);
  }
}

