/**
 * 导出相关工具函数
 */

import { exportToNotionFull, exportToNotionUpdate, NotionExportResult } from '../notion/export.js';

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

