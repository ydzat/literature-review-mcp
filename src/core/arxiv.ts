/**
 * 统一的 arXiv 操作模块
 * 包含搜索、下载、ID 清理等功能
 */

import { ArXivClient } from '@agentic/arxiv';
import axios from 'axios';
import * as fs from 'fs';
import { storage } from '../storage/StorageManager.js';

// 读取 package.json 获取版本信息
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = path.join(__dirname, '../../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const SERVER_NAME = packageJson.name;
const SERVER_VERSION = packageJson.version;

// 初始化 ArXiv 客户端
const arxivClient = new ArXivClient({});

/**
 * 论文信息接口
 */
export interface PaperInfo {
  id: string;
  title: string;
  summary: string;
  published: string;
  updated?: string;
  authors: Array<{ name: string }>;
  url: string;
  pdfUrl: string;
  categories?: string[];
  comment?: string;
}

/**
 * 搜索结果接口
 */
export interface SearchResult {
  totalResults: number;
  papers: PaperInfo[];
}

/**
 * 下载选项
 */
export interface DownloadOptions {
  /** 是否强制重新下载 */
  forceDownload?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 清理 arXiv ID（移除版本号）
 * 
 * @param arxivId 原始 arXiv ID（可能包含版本号，如 2403.15137v1）
 * @returns 清理后的 ID（如 2403.15137）
 */
export function cleanArxivId(arxivId: string): string {
  return arxivId.replace(/v\d+$/, '');
}

/**
 * 从 URL 或 ID 提取 arXiv ID
 * 
 * @param input URL 或 ID
 * @returns 提取的 arXiv ID
 */
export function extractArxivId(input: string): string {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    const urlParts = input.split('/');
    return urlParts[urlParts.length - 1];
  }
  return input;
}

/**
 * 构建 PDF URL
 * 
 * @param arxivId arXiv ID
 * @returns PDF URL
 */
export function buildPdfUrl(arxivId: string): string {
  return `http://arxiv.org/pdf/${arxivId}.pdf`;
}

/**
 * 搜索 arXiv 论文
 * 
 * @param query 搜索关键词
 * @param maxResults 最大结果数（默认 5）
 * @returns 搜索结果
 */
export async function searchArxiv(
  query: string,
  maxResults: number = 5
): Promise<SearchResult> {
  try {
    // 1. 检查缓存
    const cacheKey = `arxiv_search:${query}:${maxResults}`;
    const cached = storage.db.getCache(cacheKey);
    if (cached) {
      console.log('✓ 使用缓存的搜索结果');
      return cached;
    }

    // 2. 调用 arXiv API
    console.log(`🔍 搜索 arXiv: "${query}" (最多 ${maxResults} 篇)`);
    const results = await arxivClient.search({
      start: 0,
      searchQuery: {
        include: [
          { field: "all", value: query }
        ]
      },
      maxResults: maxResults
    });

    // 3. 处理结果并保存到数据库
    const papers: PaperInfo[] = results.entries.map(entry => {
      const arxivId = extractArxivId(entry.url);
      const cleanId = cleanArxivId(arxivId);

      // 保存到数据库
      const paperData = {
        arxiv_id: cleanId,
        title: entry.title.replace(/\s+/g, ' ').trim(),
        abstract: entry.summary.replace(/\s+/g, ' ').trim(),
        publication_date: entry.published,
        pdf_url: entry.url.replace('/abs/', '/pdf/') + '.pdf',
        source: 'arxiv'
      };

      const paperId = storage.db.insertOrUpdatePaper(paperData);

      // 保存作者并建立关联
      if (entry.authors && entry.authors.length > 0) {
        entry.authors.forEach((author: any, index: number) => {
          const authorName = author.name || author;
          const authorId = storage.db.getOrCreateAuthor({ name: authorName });
          storage.db.linkPaperAuthor(paperId, authorId, index + 1);
        });
      }

      // 返回论文信息
      return {
        id: cleanId,
        title: entry.title.replace(/\s+/g, ' ').trim(),
        summary: entry.summary.replace(/\s+/g, ' ').trim(),
        published: entry.published,
        updated: entry.updated,
        authors: (entry.authors || []).map((a: any) => ({ name: a.name || a })),
        url: entry.url,
        pdfUrl: entry.url.replace('/abs/', '/pdf/') + '.pdf',
        categories: entry.categories,
        comment: entry.comment
      };
    });

    const result: SearchResult = {
      totalResults: results.totalResults || papers.length,
      papers
    };

    // 4. 缓存结果（24 小时）
    storage.db.setCache(cacheKey, result, 24 * 60 * 60);
    console.log(`✓ 找到 ${papers.length} 篇论文`);

    return result;

  } catch (error) {
    console.error('arXiv 搜索失败:', error);
    throw new Error(`arXiv 搜索失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 下载 arXiv PDF
 * 
 * @param input arXiv URL 或 ID
 * @param options 下载选项
 * @returns PDF 文件路径
 */
export async function downloadArxivPdf(
  input: string,
  options: DownloadOptions = {}
): Promise<string> {
  try {
    // 1. 解析输入
    const arxivId = extractArxivId(input);
    const cleanId = cleanArxivId(arxivId);
    const pdfUrl = input.startsWith('http') 
      ? input.replace('/abs/', '/pdf/') + '.pdf'
      : buildPdfUrl(arxivId);

    // 2. 检查文件是否已存在
    const pdfPath = storage.getPdfPath(cleanId);
    if (!options.forceDownload && storage.pdfExists(cleanId)) {
      console.log(`✓ PDF 文件已存在: ${pdfPath}`);
      return pdfPath;
    }

    // 3. 下载 PDF
    console.log(`📥 下载 PDF: ${pdfUrl}`);
    const response = await axios({
      method: 'GET',
      url: pdfUrl,
      responseType: 'arraybuffer',
      timeout: options.timeout || 30000,
      headers: {
        'User-Agent': `Mozilla/5.0 (compatible; ${SERVER_NAME}/${SERVER_VERSION})`
      }
    });

    // 4. 保存文件
    fs.writeFileSync(pdfPath, response.data);
    console.log(`✓ PDF 已保存: ${pdfPath}`);

    // 5. 更新数据库
    const paper = storage.db.getPaperByArxivId(cleanId);
    if (paper) {
      storage.db.updatePaper(cleanId, { pdf_path: pdfPath });
      console.log(`✓ 数据库已更新`);
    } else {
      // 如果论文不存在，创建基础记录
      storage.db.insertOrUpdatePaper({
        arxiv_id: cleanId,
        title: `arXiv:${cleanId}`,
        pdf_url: pdfUrl,
        pdf_path: pdfPath,
        source: 'arxiv'
      });
      console.log(`✓ 论文记录已创建`);
    }

    return pdfPath;

  } catch (error) {
    console.error('PDF 下载失败:', error);
    throw new Error(`PDF 下载失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 获取论文信息（通过搜索）
 * 
 * @param arxivId arXiv ID
 * @returns 论文信息（如果找到）
 */
export async function getArxivPaperInfo(arxivId: string): Promise<PaperInfo | null> {
  try {
    const cleanId = cleanArxivId(arxivId);
    
    // 先检查数据库
    const paper = storage.db.getPaperByArxivId(cleanId);
    if (paper && paper.id && paper.title && paper.abstract) {
      console.log(`✓ 从数据库获取论文信息: ${paper.title}`);

      // 获取作者信息
      const authors = storage.db.getPaperAuthors(paper.id);

      return {
        id: paper.arxiv_id,
        title: paper.title,
        summary: paper.abstract || '',
        published: paper.publication_date || '',
        authors: authors.map(a => ({ name: a.name })),
        url: `http://arxiv.org/abs/${paper.arxiv_id}`,
        pdfUrl: paper.pdf_url || buildPdfUrl(paper.arxiv_id)
      };
    }

    // 通过搜索获取
    console.log(`🔍 搜索论文信息: ${cleanId}`);
    const result = await searchArxiv(cleanId, 1);
    
    if (result.papers.length > 0) {
      return result.papers[0];
    }

    return null;

  } catch (error) {
    console.error('获取论文信息失败:', error);
    return null;
  }
}

/**
 * 验证 arXiv ID 格式
 * 
 * @param arxivId arXiv ID
 * @returns 是否有效
 */
export function isValidArxivId(arxivId: string): boolean {
  // 支持新旧两种格式
  // 旧格式: math/0601001
  // 新格式: 2403.15137 或 2403.15137v1
  const oldFormat = /^[a-z-]+\/\d{7}(v\d+)?$/i;
  const newFormat = /^\d{4}\.\d{4,5}(v\d+)?$/;
  
  return oldFormat.test(arxivId) || newFormat.test(arxivId);
}

