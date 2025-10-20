/**
 * arXiv 相关工具函数
 */

import { ArXivClient } from '@agentic/arxiv';
import { storage } from '../storage/StorageManager.js';
import { searchArxiv, downloadArxivPdf, cleanArxivId } from '../core/arxiv.js';

// 初始化 ArXiv 客户端
const arxivClient = new ArXivClient({});

/**
 * 搜索 arXiv 论文
 */
export async function searchArxivPapers(
  query: string,
  maxResults: number = 5
): Promise<{ totalResults: number; papers: any[] }> {
  try {
    // 使用核心模块的统一搜索函数
    const results = await searchArxiv(query, maxResults);

    // results 是一个数组
    const papers = Array.isArray(results) ? results : [];

    return {
      totalResults: papers.length,
      papers: papers.map((entry: any) => ({
        id: entry.id,
        title: entry.title,
        summary: entry.summary,
        published: entry.published,
        authors: entry.authors,
        url: entry.url,
        pdfUrl: entry.pdfUrl
      }))
    };
  } catch (error: any) {
    throw new Error(`搜索失败: ${error.message}`);
  }
}

/**
 * 下载 arXiv PDF 文件
 */
export async function downloadArxivPdfTool(input: string): Promise<string> {
  try {
    // 使用核心模块的统一下载函数
    const pdfPath = await downloadArxivPdf(input);
    return pdfPath;
  } catch (error: any) {
    throw new Error(`下载失败: ${error.message}`);
  }
}

