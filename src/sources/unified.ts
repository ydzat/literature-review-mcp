import { PaperMetadata, SearchFilters, SearchResult } from './base.js';
import { dblp } from './dblp.js';
import { openreview } from './openreview.js';
import { paperswithcode } from './paperswithcode.js';
import { storage } from '../storage/StorageManager.js';

/**
 * 统一搜索接口
 * 支持跨多个学术数据源搜索并合并结果
 */

export type DataSourceType = 'arxiv' | 'dblp' | 'openreview' | 'paperswithcode';

export interface UnifiedSearchFilters extends SearchFilters {
  sources?: DataSourceType[];
  minQualityScore?: number;
  peerReviewedOnly?: boolean;
  recentDaysOnly?: number;
}

/**
 * 跨多个数据源搜索论文
 */
export async function searchAcrossAllSources(filters: UnifiedSearchFilters): Promise<SearchResult> {
  const sources = filters.sources || ['dblp', 'openreview', 'paperswithcode'];
  const results: PaperMetadata[] = [];
  
  console.log(`🔍 跨 ${sources.length} 个数据源搜索: ${filters.query}`);
  
  // 并行搜索所有数据源
  const searchPromises = sources.map(async (source) => {
    try {
      switch (source) {
        case 'dblp':
          return await dblp.search(filters);
        case 'openreview':
          return await openreview.search(filters);
        case 'paperswithcode':
          return await paperswithcode.search(filters);
        default:
          return { totalResults: 0, papers: [] };
      }
    } catch (error) {
      console.error(`${source} 搜索失败:`, error);
      return { totalResults: 0, papers: [] };
    }
  });
  
  const searchResults = await Promise.all(searchPromises);
  
  // 合并结果
  for (const result of searchResults) {
    results.push(...result.papers);
  }
  
  // 去重（基于标题相似度）
  const uniquePapers = deduplicatePapers(results);
  
  // 过滤
  let filteredPapers = uniquePapers;
  
  if (filters.peerReviewedOnly) {
    filteredPapers = filteredPapers.filter(p => p.peerReviewStatus === 'accepted');
  }
  
  if (filters.recentDaysOnly) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - filters.recentDaysOnly);
    filteredPapers = filteredPapers.filter(p => {
      if (!p.publicationDate) return false;
      return new Date(p.publicationDate) >= cutoffDate;
    });
  }
  
  if (filters.yearRange) {
    filteredPapers = filteredPapers.filter(p => {
      if (!p.year) return false;
      return p.year >= filters.yearRange![0] && p.year <= filters.yearRange![1];
    });
  }
  
  // 排序（按质量评分）
  const rankedPapers = await rankPapersByQuality(filteredPapers);
  
  // 限制结果数量
  const maxResults = filters.maxResults || 50;
  const finalPapers = rankedPapers.slice(0, maxResults);
  
  console.log(`✅ 找到 ${uniquePapers.length} 篇论文（去重后），过滤后 ${filteredPapers.length} 篇，返回前 ${finalPapers.length} 篇`);
  
  return {
    totalResults: uniquePapers.length,
    papers: finalPapers
  };
}

/**
 * 去重论文（基于标题相似度）
 */
function deduplicatePapers(papers: PaperMetadata[]): PaperMetadata[] {
  const seen = new Map<string, PaperMetadata>();
  
  for (const paper of papers) {
    const normalizedTitle = normalizeTitle(paper.title);
    
    if (!seen.has(normalizedTitle)) {
      seen.set(normalizedTitle, paper);
    } else {
      // 如果已存在，选择信息更完整的
      const existing = seen.get(normalizedTitle)!;
      if (getCompletenessScore(paper) > getCompletenessScore(existing)) {
        seen.set(normalizedTitle, paper);
      }
    }
  }
  
  return Array.from(seen.values());
}

/**
 * 标准化标题（用于去重）
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 计算论文信息完整度评分
 */
function getCompletenessScore(paper: PaperMetadata): number {
  let score = 0;
  if (paper.abstract) score += 3;
  if (paper.authors && paper.authors.length > 0) score += 2;
  if (paper.year) score += 1;
  if (paper.venue) score += 1;
  if (paper.citationCount) score += 2;
  if (paper.pdfUrl) score += 1;
  return score;
}

/**
 * 按质量对论文进行排序
 */
async function rankPapersByQuality(papers: PaperMetadata[]): Promise<PaperMetadata[]> {
  // 简化版质量评分（后续会在 reputation 模块中完善）
  const scoredPapers = papers.map(paper => {
    let score = 0;
    
    // 引用数权重
    if (paper.citationCount) {
      score += Math.min(paper.citationCount / 100, 30);
    }
    
    // 会议等级权重
    if (paper.venueRank === 'A*') score += 30;
    else if (paper.venueRank === 'A') score += 20;
    else if (paper.venueRank === 'B') score += 10;
    
    // 同行评议状态
    if (paper.peerReviewStatus === 'accepted') score += 20;
    
    // 新近度加分（最近30天）
    if (paper.publicationDate) {
      const daysOld = (Date.now() - new Date(paper.publicationDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld <= 30) {
        score += Math.max(0, 20 - daysOld * 0.5);
      }
    }
    
    // 信息完整度
    score += getCompletenessScore(paper) * 0.5;
    
    return { paper, score };
  });
  
  // 按评分降序排序
  scoredPapers.sort((a, b) => b.score - a.score);
  
  return scoredPapers.map(item => item.paper);
}

/**
 * 保存论文到数据库
 */
export async function savePaperToDatabase(paper: PaperMetadata): Promise<number> {
  // 检查是否已存在
  const existing = storage.db.getPaperByArxivId(paper.id);
  if (existing) {
    console.log(`论文已存在: ${paper.title}`);
    return existing.id!;
  }
  
  // 插入论文
  const paperId = storage.db.insertPaper({
    arxiv_id: paper.id,
    title: paper.title,
    abstract: paper.abstract,
    year: paper.year,
    publication_date: paper.publicationDate,
    venue: paper.venue,
    venue_rank: paper.venueRank,
    citation_count: paper.citationCount,
    impact_factor: paper.impactFactor,
    peer_review_status: paper.peerReviewStatus,
    pdf_url: paper.pdfUrl,
    source: paper.source
  });
  
  // 插入作者
  for (let i = 0; i < paper.authors.length; i++) {
    const authorName = paper.authors[i];
    const authorId = storage.db.getOrCreateAuthor({ name: authorName });
    storage.db.linkPaperAuthor(paperId, authorId, i + 1);
  }
  
  console.log(`✅ 论文已保存到数据库: ${paper.title}`);
  return paperId;
}

/**
 * 批量保存论文到数据库
 */
export async function savePapersToDatabase(papers: PaperMetadata[]): Promise<number[]> {
  const ids: number[] = [];
  for (const paper of papers) {
    try {
      const id = await savePaperToDatabase(paper);
      ids.push(id);
    } catch (error) {
      console.error(`保存论文失败: ${paper.title}`, error);
    }
  }
  return ids;
}

/**
 * 获取最近N天的论文
 */
export async function getRecentPapers(days: number = 30, maxResults: number = 50): Promise<SearchResult> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  // 从 OpenReview 获取最新论文
  const openreviewPapers = await openreview.getRecentSubmissions(maxResults);
  
  // 过滤日期
  const recentPapers = openreviewPapers.papers.filter(p => {
    if (!p.publicationDate) return false;
    return new Date(p.publicationDate) >= cutoffDate;
  });
  
  return {
    totalResults: recentPapers.length,
    papers: recentPapers
  };
}

