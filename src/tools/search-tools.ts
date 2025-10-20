/**
 * 多源学术搜索相关工具函数
 */

import { searchWithNotionOutput } from '../sources/unified.js';

/**
 * 跨多个学术数据源搜索论文
 */
export async function searchAcademicPapers(
  query: string,
  maxResults: number = 10,
  sources: string[] = ['dblp', 'openreview', 'paperswithcode'],
  minQualityScore: number = 0
): Promise<{
  totalResults: number;
  papers: any[];
  notionMetadata: any;
}> {
  try {
    const result = await searchWithNotionOutput({
      query,
      maxResults,
      sources: sources as any,
      minQualityScore
    });

    return {
      totalResults: result.data.totalResults,
      papers: result.data.papers,
      notionMetadata: result.notion_metadata
    };
  } catch (error: any) {
    throw new Error(`学术搜索失败: ${error.message}`);
  }
}

