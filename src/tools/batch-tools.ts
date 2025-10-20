/**
 * 批量处理相关工具函数
 */

import { batchAnalyzePapers, batchAnalyzeFromDatabase, AnalyzeResult } from '../batch/analyze.js';
import { downloadArxivPdf } from '../core/arxiv.js';
import { storage } from '../storage/StorageManager.js';

/**
 * 批量并发下载多篇论文的 PDF 文件
 */
export async function batchDownloadPdfsTool(
  paperIds: number[],
  maxConcurrent: number = 5,
  maxRetries: number = 3
): Promise<{
  success: number;
  failed: number;
  results: Array<{ paperId: number; success: boolean; pdfPath?: string; error?: string }>;
}> {
  try {
    const results: Array<{ paperId: number; success: boolean; pdfPath?: string; error?: string }> = [];
    let successCount = 0;
    let failedCount = 0;

    // 使用简单的并发控制
    for (let i = 0; i < paperIds.length; i += maxConcurrent) {
      const batch = paperIds.slice(i, i + maxConcurrent);
      const promises = batch.map(async (paperId) => {
        try {
          const paper = storage.db.getPaperById(paperId);
          if (!paper) {
            throw new Error(`论文 ID ${paperId} 不存在`);
          }

          const pdfPath = await downloadArxivPdf(paper.arxiv_id);
          successCount++;
          return { paperId, success: true, pdfPath };
        } catch (error: any) {
          failedCount++;
          return { paperId, success: false, error: error.message };
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }

    return { success: successCount, failed: failedCount, results };
  } catch (error: any) {
    throw new Error(`批量下载失败: ${error.message}`);
  }
}

/**
 * 批量并发分析多篇论文
 */
export async function batchAnalyzePapersTool(
  arxivIds: string[],
  maxConcurrent: number = 3,
  temperature: number = 0.3,
  skipExisting: boolean = true
): Promise<{
  success: number;
  skipped: number;
  failed: number;
  results: AnalyzeResult[];
}> {
  try {
    const results = await batchAnalyzePapers(arxivIds, {
      maxConcurrent,
      temperature,
      skipExisting
    });

    // 统计结果
    const success = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const skipped = arxivIds.length - results.length;

    return {
      success,
      skipped,
      failed,
      results
    };
  } catch (error: any) {
    throw new Error(`批量分析失败: ${error.message}`);
  }
}

/**
 * 生成统一文献综述
 * TODO: 此功能尚未实现，需要在 batch/analyze.ts 中添加
 */
export async function generateUnifiedLiteratureReview(
  paperIds: number[],
  temperature: number = 0.4,
  focusArea?: string
): Promise<{
  reviewId: number;
  reviewPath: string;
  paperCount: number;
}> {
  try {
    // 临时实现：返回错误提示
    throw new Error('统一文献综述功能尚未实现，请等待后续版本');
  } catch (error: any) {
    throw new Error(`生成综述失败: ${error.message}`);
  }
}

