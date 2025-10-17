/**
 * 批量并发下载 PDF 文件
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { storage } from '../storage/StorageManager.js';

export interface DownloadResult {
  arxivId: string;
  success: boolean;
  pdfPath?: string;
  error?: string;
}

export interface DownloadOptions {
  maxConcurrent?: number;  // 最大并发数，默认 5
  maxRetries?: number;     // 最大重试次数，默认 3
  retryDelay?: number;     // 重试延迟（毫秒），默认 1000
}

/**
 * 下载单个 PDF 文件（带重试）
 */
async function downloadSinglePDF(
  arxivId: string,
  pdfUrl: string,
  options: Required<DownloadOptions>
): Promise<DownloadResult> {
  const cleanArxivId = arxivId.replace(/v\d+$/, '');
  const pdfPath = storage.getPdfPath(cleanArxivId);

  // 如果已存在，直接返回
  if (storage.pdfExists(cleanArxivId)) {
    console.log(`✅ PDF 已存在: ${cleanArxivId}`);
    return { arxivId: cleanArxivId, success: true, pdfPath };
  }

  // 转换为真正的 PDF 下载链接
  let actualPdfUrl = pdfUrl;

  // 处理 DOI 链接 (doi.org/10.48550/arXiv.XXXX.XXXXX)
  if (pdfUrl.includes('doi.org') && pdfUrl.includes('arXiv')) {
    const arxivMatch = pdfUrl.match(/arXiv\.(\d+\.\d+)/);
    if (arxivMatch) {
      actualPdfUrl = `https://arxiv.org/pdf/${arxivMatch[1]}.pdf`;
    }
  }
  // 处理 arXiv 摘要页面链接
  else if (pdfUrl.includes('arxiv.org/abs/')) {
    actualPdfUrl = pdfUrl.replace('/abs/', '/pdf/');
    if (!actualPdfUrl.endsWith('.pdf')) {
      actualPdfUrl += '.pdf';
    }
  }

  // 重试逻辑
  for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
    try {
      console.log(`📥 下载 PDF (尝试 ${attempt}/${options.maxRetries}): ${cleanArxivId}`);

      const response = await axios.get(actualPdfUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,  // 30 秒超时
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ArXiv-MCP-Server/1.2.0)'
        }
      });

      // 确保目录存在
      const pdfDir = path.dirname(pdfPath);
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      // 保存文件
      fs.writeFileSync(pdfPath, response.data);
      
      // 更新数据库
      const paper = storage.db.getPaperByArxivId(cleanArxivId);
      if (paper) {
        storage.db.updatePaper(cleanArxivId, { pdf_path: pdfPath });
      }

      console.log(`✅ PDF 下载成功: ${cleanArxivId}`);
      return { arxivId: cleanArxivId, success: true, pdfPath };

    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.error(`❌ PDF 下载失败 (尝试 ${attempt}/${options.maxRetries}): ${cleanArxivId} - ${errorMsg}`);

      // 如果不是最后一次尝试，等待后重试
      if (attempt < options.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, options.retryDelay));
      } else {
        return { arxivId: cleanArxivId, success: false, error: errorMsg };
      }
    }
  }

  return { arxivId: cleanArxivId, success: false, error: 'Max retries exceeded' };
}

/**
 * 批量并发下载 PDF 文件
 */
export async function batchDownloadPDFs(
  papers: Array<{ arxivId: string; pdfUrl: string }>,
  options: DownloadOptions = {}
): Promise<DownloadResult[]> {
  const opts: Required<DownloadOptions> = {
    maxConcurrent: options.maxConcurrent || 5,
    maxRetries: options.maxRetries || 3,
    retryDelay: options.retryDelay || 1000
  };

  console.log(`\n🚀 开始批量下载 ${papers.length} 篇论文的 PDF...`);
  console.log(`   并发数: ${opts.maxConcurrent}, 重试次数: ${opts.maxRetries}`);

  const results: DownloadResult[] = [];
  const queue = [...papers];

  // 并发控制
  const workers: Promise<void>[] = [];
  for (let i = 0; i < opts.maxConcurrent; i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const paper = queue.shift();
          if (!paper) break;

          const result = await downloadSinglePDF(paper.arxivId, paper.pdfUrl, opts);
          results.push(result);
        }
      })()
    );
  }

  await Promise.all(workers);

  // 统计结果
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`\n📊 下载完成: 成功 ${successCount}/${papers.length}, 失败 ${failCount}`);

  if (failCount > 0) {
    console.log('\n❌ 失败的论文:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.arxivId}: ${r.error}`);
    });
  }

  return results;
}

/**
 * 从数据库中获取论文列表并批量下载
 */
export async function batchDownloadFromDatabase(
  paperIds: number[],
  options: DownloadOptions = {}
): Promise<DownloadResult[]> {
  const papers: Array<{ arxivId: string; pdfUrl: string }> = [];

  for (const id of paperIds) {
    const paper = storage.db.getPaperById(id);
    if (paper && paper.pdf_url) {
      papers.push({
        arxivId: paper.arxiv_id,
        pdfUrl: paper.pdf_url
      });
    } else {
      console.warn(`⚠️  论文 ID ${id} 没有 PDF URL`);
    }
  }

  return batchDownloadPDFs(papers, options);
}

