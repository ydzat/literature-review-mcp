/**
 * 统一的 PDF 解析模块
 * 使用 pdfjs-dist，替代所有 pdfreader 实现
 */

import * as fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { storage } from '../storage/StorageManager.js';

/**
 * PDF 提取选项
 */
export interface PdfExtractionOptions {
  /** 是否包含元数据 */
  includeMetadata?: boolean;
  /** 最大页数限制（0 表示无限制） */
  maxPages?: number;
  /** 是否在页面之间添加分隔符 */
  pageSeparator?: string;
}

/**
 * PDF 提取结果
 */
export interface PdfExtractionResult {
  /** 提取的文本内容 */
  text: string;
  /** 总页数 */
  pageCount: number;
  /** PDF 元数据（如果请求） */
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
  };
}

/**
 * 提取 PDF 文本（核心实现）
 * 
 * @param pdfPath PDF 文件路径
 * @param options 提取选项
 * @returns 提取结果
 */
export async function extractPdfText(
  pdfPath: string,
  options: PdfExtractionOptions = {}
): Promise<PdfExtractionResult> {
  try {
    // 读取 PDF 文件
    const dataBuffer = fs.readFileSync(pdfPath);
    const uint8Array = new Uint8Array(dataBuffer);
    
    // 加载 PDF 文档
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    
    const pageCount = pdf.numPages;
    const maxPages = options.maxPages && options.maxPages > 0 
      ? Math.min(options.maxPages, pageCount) 
      : pageCount;
    const pageSeparator = options.pageSeparator || '\n\n';
    
    // 提取文本
    const textParts: string[] = [];
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();
      
      if (pageText) {
        textParts.push(pageText);
      }
    }
    
    const text = textParts.join(pageSeparator);
    
    // 验证提取的文本
    if (text.length < 100) {
      throw new Error('PDF 文本提取失败或内容过少（少于 100 字符）');
    }
    
    // 提取元数据（如果请求）
    let metadata: any = undefined;
    if (options.includeMetadata) {
      const pdfMetadata = await pdf.getMetadata();
      const info = pdfMetadata.info as any;
      metadata = {
        title: info?.Title,
        author: info?.Author,
        subject: info?.Subject,
        creator: info?.Creator,
        producer: info?.Producer,
        creationDate: info?.CreationDate
      };
    }
    
    return {
      text,
      pageCount,
      metadata
    };
    
  } catch (error) {
    console.error('PDF 解析失败:', error);
    throw new Error(`PDF 解析失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 提取 PDF 文本并保存到存储系统
 * 
 * @param arxivId arXiv ID（已清理版本号）
 * @param pdfPath PDF 文件路径
 * @param paperInfo 论文信息（可选）
 * @returns 保存的文本内容
 */
export async function extractAndSavePdfText(
  arxivId: string,
  pdfPath: string,
  paperInfo?: any
): Promise<string> {
  try {
    // 检查是否已存在
    const textPath = storage.getTextPath(arxivId);
    const existingText = storage.readText(arxivId);
    if (existingText) {
      console.log(`✓ 文本文件已存在: ${textPath}`);
      return existingText;
    }
    
    // 提取 PDF 文本
    console.log(`📄 提取 PDF 文本: ${arxivId}`);
    const result = await extractPdfText(pdfPath);
    
    // 构建输出内容
    let outputContent = '';
    
    // 添加论文信息头部
    if (paperInfo) {
      outputContent += `=== 论文信息 ===\n`;
      outputContent += `标题: ${paperInfo.title}\n`;
      outputContent += `arXiv ID: ${arxivId}\n`;
      outputContent += `发布日期: ${paperInfo.published || 'N/A'}\n`;
      
      if (paperInfo.authors && paperInfo.authors.length > 0) {
        const authorNames = paperInfo.authors.map((author: any) => 
          author.name || author
        ).join(', ');
        outputContent += `作者: ${authorNames}\n`;
      }
      
      if (paperInfo.summary) {
        outputContent += `摘要: ${paperInfo.summary}\n`;
      }
      
      outputContent += `\n=== PDF 解析文本 ===\n\n`;
    }
    
    // 添加提取的文本
    outputContent += result.text;
    
    // 保存到存储系统
    const savedTextPath = storage.saveText(arxivId, outputContent);
    console.log(`✓ 文本已保存: ${savedTextPath}`);
    
    // 更新数据库
    const paper = storage.db.getPaperByArxivId(arxivId);
    if (paper) {
      storage.db.updatePaper(arxivId, { text_path: savedTextPath });
      console.log(`✓ 数据库已更新`);
    } else {
      // 如果论文不存在，创建基础记录
      storage.db.insertOrUpdatePaper({
        arxiv_id: arxivId,
        title: paperInfo?.title || `arXiv:${arxivId}`,
        abstract: paperInfo?.summary,
        publication_date: paperInfo?.published,
        text_path: savedTextPath,
        source: 'arxiv'
      });
      console.log(`✓ 论文记录已创建`);
    }
    
    return outputContent;
    
  } catch (error) {
    console.error('提取并保存 PDF 文本失败:', error);
    throw new Error(`提取并保存 PDF 文本失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 简单提取 PDF 文本（仅返回文本字符串）
 * 
 * @param pdfPath PDF 文件路径
 * @returns 提取的文本
 */
export async function extractPdfTextSimple(pdfPath: string): Promise<string> {
  const result = await extractPdfText(pdfPath);
  return result.text;
}

/**
 * 检查 PDF 文件是否存在且可读
 * 
 * @param pdfPath PDF 文件路径
 * @returns 是否存在且可读
 */
export function isPdfReadable(pdfPath: string): boolean {
  try {
    return fs.existsSync(pdfPath) && fs.statSync(pdfPath).isFile();
  } catch {
    return false;
  }
}

/**
 * 获取 PDF 页数（不提取文本）
 * 
 * @param pdfPath PDF 文件路径
 * @returns 页数
 */
export async function getPdfPageCount(pdfPath: string): Promise<number> {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const uint8Array = new Uint8Array(dataBuffer);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    return pdf.numPages;
  } catch (error) {
    throw new Error(`获取 PDF 页数失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

