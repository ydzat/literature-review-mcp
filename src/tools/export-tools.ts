/**
 * 导出相关工具函数
 */

import { exportToNotionFull, exportToNotionUpdate, NotionExportResult } from '../notion/export.js';

/**
 * 导出完整的 Notion 元数据
 */
export async function exportToNotionFullTool(
  paperIds: number[],
  reviewId?: number
): Promise<NotionExportResult> {
  try {
    return await exportToNotionFull(paperIds, reviewId);
  } catch (error: any) {
    throw new Error(`导出到 Notion 失败: ${error.message}`);
  }
}

/**
 * 只导出增量内容的 Notion 元数据
 */
export async function exportToNotionUpdateTool(
  paperIds: number[],
  existingArxivIds: string[],
  reviewId?: number
): Promise<NotionExportResult> {
  try {
    return await exportToNotionUpdate(paperIds, existingArxivIds, reviewId);
  } catch (error: any) {
    throw new Error(`导出增量到 Notion 失败: ${error.message}`);
  }
}

