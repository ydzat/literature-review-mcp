/**
 * Notion 导出功能
 * 支持 Full 模式和 Update 模式
 */

import { storage } from '../storage/StorageManager.js';
import { Paper } from '../database/DatabaseManager.js';
import {
  NotionMetadata,
  NotionBlock,
  NotionDatabaseEntry,
  NotionPageProperties
} from './types.js';
import {
  PAPER_DATABASE_SCHEMA,
  AUTHOR_DATABASE_SCHEMA,
  INSTITUTION_DATABASE_SCHEMA,
  paperToNotionEntry
} from './formatters.js';
import { calculatePaperQualityScore } from '../reputation/scoring.js';

export interface NotionExportResult {
  success: boolean;
  notion_metadata?: NotionMetadata;
  summary?: string;
  error?: string;
}

/**
 * 将论文转换为 Notion 页面内容块
 */
function paperToNotionBlocks(paper: Paper): NotionBlock[] {
  const blocks: NotionBlock[] = [];

  // 标题
  blocks.push({
    type: 'heading_1',
    content: paper.title
  });

  // 元信息
  blocks.push({
    type: 'paragraph',
    content: `**arXiv ID**: ${paper.arxiv_id} | **年份**: ${paper.year || 'N/A'} | **来源**: ${paper.source}`
  });

  if (paper.venue) {
    blocks.push({
      type: 'paragraph',
      content: `**会议/期刊**: ${paper.venue}${paper.venue_rank ? ` (${paper.venue_rank})` : ''}`
    });
  }

  // 摘要
  if (paper.abstract) {
    blocks.push({
      type: 'heading_2',
      content: '摘要'
    });
    blocks.push({
      type: 'paragraph',
      content: paper.abstract
    });
  }

  // 单篇深度分析
  if (paper.individual_review) {
    blocks.push({
      type: 'heading_2',
      content: '深度分析'
    });
    blocks.push({
      type: 'paragraph',
      content: paper.individual_review
    });
  }

  // 链接
  blocks.push({
    type: 'heading_2',
    content: '链接'
  });
  if (paper.pdf_url) {
    blocks.push({
      type: 'paragraph',
      content: `📄 [PDF 链接](${paper.pdf_url})`
    });
  }

  return blocks;
}

/**
 * 将综述转换为 Notion 页面内容块
 */
function reviewToNotionBlocks(reviewContent: string, title: string): NotionBlock[] {
  const blocks: NotionBlock[] = [];

  blocks.push({
    type: 'heading_1',
    content: title
  });

  // 将 Markdown 内容转换为 Notion blocks
  // 简单实现：按段落分割
  const lines = reviewContent.split('\n');
  let currentParagraph = '';

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('# ')) {
      if (currentParagraph) {
        blocks.push({ type: 'paragraph', content: currentParagraph });
        currentParagraph = '';
      }
      blocks.push({ type: 'heading_1', content: trimmed.slice(2) });
    } else if (trimmed.startsWith('## ')) {
      if (currentParagraph) {
        blocks.push({ type: 'paragraph', content: currentParagraph });
        currentParagraph = '';
      }
      blocks.push({ type: 'heading_2', content: trimmed.slice(3) });
    } else if (trimmed.startsWith('### ')) {
      if (currentParagraph) {
        blocks.push({ type: 'paragraph', content: currentParagraph });
        currentParagraph = '';
      }
      blocks.push({ type: 'heading_3', content: trimmed.slice(4) });
    } else if (trimmed.startsWith('```mermaid')) {
      if (currentParagraph) {
        blocks.push({ type: 'paragraph', content: currentParagraph });
        currentParagraph = '';
      }
      // 收集 Mermaid 代码
      let mermaidCode = '';
      let i = lines.indexOf(line) + 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        mermaidCode += lines[i] + '\n';
        i++;
      }
      blocks.push({ type: 'code', content: mermaidCode, language: 'mermaid' });
    } else if (trimmed) {
      currentParagraph += (currentParagraph ? '\n' : '') + trimmed;
    } else if (currentParagraph) {
      blocks.push({ type: 'paragraph', content: currentParagraph });
      currentParagraph = '';
    }
  }

  if (currentParagraph) {
    blocks.push({ type: 'paragraph', content: currentParagraph });
  }

  return blocks;
}

/**
 * Full 模式：导出完整的 Notion 元数据
 */
export async function exportToNotionFull(
  paperIds: number[],
  reviewId?: number
): Promise<NotionExportResult> {
  try {
    console.log(`\n📤 导出到 Notion (Full 模式)...`);
    console.log(`   论文数量: ${paperIds.length}`);
    if (reviewId) {
      console.log(`   综述 ID: ${reviewId}`);
    }

    const notionMetadata: NotionMetadata = {
      database_schemas: [
        PAPER_DATABASE_SCHEMA,
        AUTHOR_DATABASE_SCHEMA,
        INSTITUTION_DATABASE_SCHEMA
      ],
      database_entries: [],
      content_blocks: [],
      pages: []
    };

    // 1. 处理论文数据库条目
    for (const id of paperIds) {
      const paper = storage.db.getPaperById(id);
      if (!paper) {
        console.warn(`⚠️  论文 ID ${id} 不存在`);
        continue;
      }

      // 计算质量评分
      const qualityScore = calculatePaperQualityScore({
        id: paper.arxiv_id,
        title: paper.title,
        abstract: paper.abstract,
        authors: [],
        year: paper.year,
        venue: paper.venue,
        venueRank: paper.venue_rank as any,
        citationCount: paper.citation_count,
        peerReviewStatus: paper.peer_review_status as any,
        publicationDate: paper.publication_date,
        source: paper.source as any,
        pdfUrl: paper.pdf_url,
        sourceUrl: paper.pdf_url
      });

      // 添加到数据库条目
      notionMetadata.database_entries.push(paperToNotionEntry({
        id: paper.arxiv_id,
        title: paper.title,
        abstract: paper.abstract,
        authors: [],  // TODO: 从数据库获取作者
        year: paper.year,
        venue: paper.venue,
        venueRank: paper.venue_rank as any,
        citationCount: paper.citation_count,
        peerReviewStatus: paper.peer_review_status as any,
        publicationDate: paper.publication_date,
        source: paper.source as any,
        pdfUrl: paper.pdf_url,
        sourceUrl: paper.pdf_url
      }, qualityScore));

      // 2. 如果有单篇分析，创建独立页面
      if (paper.individual_review) {
        notionMetadata.pages!.push({
          title: `${paper.title} - 深度分析`,
          blocks: paperToNotionBlocks(paper)
        });
      }
    }

    // 3. 如果有统一综述，创建综述页面
    if (reviewId) {
      const review = storage.db.getReviewById(reviewId);
      if (review && review.content && review.title) {
        notionMetadata.pages!.push({
          title: review.title,
          blocks: reviewToNotionBlocks(review.content, review.title)
        });
      }
    }

    const summary = `导出完成: ${notionMetadata.database_entries.length} 篇论文, ${notionMetadata.pages?.length || 0} 个页面`;
    console.log(`\n✅ ${summary}`);

    return {
      success: true,
      notion_metadata: notionMetadata,
      summary
    };

  } catch (error: any) {
    const errorMsg = error.message || String(error);
    console.error(`❌ 导出失败: ${errorMsg}`);
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Update 模式：只导出增量内容
 */
export async function exportToNotionUpdate(
  paperIds: number[],
  existingArxivIds: string[],
  reviewId?: number
): Promise<NotionExportResult> {
  try {
    console.log(`\n📤 导出到 Notion (Update 模式)...`);
    console.log(`   总论文数: ${paperIds.length}`);
    console.log(`   已存在论文数: ${existingArxivIds.length}`);

    // 过滤出新论文
    const newPaperIds: number[] = [];
    for (const id of paperIds) {
      const paper = storage.db.getPaperById(id);
      if (paper && !existingArxivIds.includes(paper.arxiv_id)) {
        newPaperIds.push(id);
      }
    }

    console.log(`   新论文数: ${newPaperIds.length}`);

    if (newPaperIds.length === 0 && !reviewId) {
      return {
        success: true,
        notion_metadata: {
          database_schemas: [],
          database_entries: [],
          content_blocks: [],
          pages: []
        },
        summary: '没有新内容需要导出'
      };
    }

    // 使用 Full 模式导出新论文
    return exportToNotionFull(newPaperIds, reviewId);

  } catch (error: any) {
    const errorMsg = error.message || String(error);
    console.error(`❌ 导出失败: ${errorMsg}`);
    return {
      success: false,
      error: errorMsg
    };
  }
}

