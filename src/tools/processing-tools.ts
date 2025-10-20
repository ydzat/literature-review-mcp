/**
 * 论文处理相关工具函数
 */

import {
  convertToMarkdown,
  convertToWechatArticle as coreConvertToWechat,
  generateAcademicReview,
  processArxivPaper as coreProcessArxivPaper,
  ProcessingResult
} from '../core/processing.js';
import { extractPdfText } from '../core/pdf.js';
import { downloadArxivPdf, getArxivPaperInfo } from '../core/arxiv.js';
import { storage } from '../storage/StorageManager.js';
import * as path from 'path';

/**
 * 解析 PDF 并返回原始文本内容
 */
export async function parsePdfToText(
  arxivId: string,
  paperInfo?: any
): Promise<string> {
  try {
    // 1. 下载 PDF
    const pdfPath = await downloadArxivPdf(arxivId);

    // 2. 提取文本
    const result = await extractPdfText(pdfPath);

    // 3. 保存文本文件
    const textPath = path.join(storage.TEXTS_DIR, `${arxivId}.txt`);
    const fs = await import('fs');
    fs.writeFileSync(textPath, result.text, 'utf-8');

    return textPath;
  } catch (error: any) {
    throw new Error(`解析 PDF 失败: ${error.message}`);
  }
}

/**
 * 解析 PDF 并返回 LLM 翻译后的中文 Markdown 文件
 */
export async function parsePdfToMarkdown(
  arxivId: string,
  paperInfo?: any
): Promise<string> {
  try {
    // 1. 下载 PDF
    const pdfPath = await downloadArxivPdf(arxivId);

    // 2. 获取论文信息
    const info = paperInfo || await getArxivPaperInfo(arxivId);

    // 3. 转换为 Markdown
    const markdownPath = await convertToMarkdown(pdfPath, arxivId, info);

    return markdownPath;
  } catch (error: any) {
    throw new Error(`PDF 转 Markdown 失败: ${error.message}`);
  }
}

/**
 * 转换为微信文章格式
 */
export async function convertToWechatArticle(arxivId: string): Promise<string> {
  try {
    // 1. 获取文本内容
    const textPath = path.join(storage.TEXTS_DIR, `${arxivId}.txt`);
    const fs = await import('fs');

    if (!fs.existsSync(textPath)) {
      throw new Error(`文本文件不存在，请先运行 parse_pdf_to_text`);
    }

    const textContent = fs.readFileSync(textPath, 'utf-8');

    // 2. 转换为微信文章
    const wechatPath = await coreConvertToWechat(textContent, arxivId);

    return wechatPath;
  } catch (error: any) {
    throw new Error(`转换为微信文章失败: ${error.message}`);
  }
}

/**
 * 转换为增强版学术文献综述
 */
export async function convertToAcademicReviewEnhanced(arxivId: string): Promise<string> {
  try {
    // 1. 获取文本内容
    const textPath = path.join(storage.TEXTS_DIR, `${arxivId}.txt`);
    const fs = await import('fs');

    if (!fs.existsSync(textPath)) {
      throw new Error(`文本文件不存在，请先运行 parse_pdf_to_text`);
    }

    const textContent = fs.readFileSync(textPath, 'utf-8');

    // 2. 生成学术综述
    const reviewPath = await generateAcademicReview(textContent, arxivId);

    return reviewPath;
  } catch (error: any) {
    throw new Error(`转换为学术综述失败: ${error.message}`);
  }
}

/**
 * 完整流程处理 arXiv 论文
 */
export async function processArxivPaper(
  arxivId: string,
  includeWechat: boolean = true
): Promise<ProcessingResult> {
  try {
    return await coreProcessArxivPaper(arxivId, {
      includeWechat,
      includeReview: true,
      includeMarkdown: true
    });
  } catch (error: any) {
    throw new Error(`处理论文失败: ${error.message}`);
  }
}

