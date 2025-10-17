import { PaperMetadata } from '../sources/base.js';
import { findInstitution, getInstitutionScore, isTopTierInstitution } from './topInstitutions.js';
import { findTopAuthor, isTopAuthor } from './topAuthors.js';

/**
 * 论文质量评分系统
 */

export interface QualityScore {
  totalScore: number;
  citationScore: number;
  venueScore: number;
  authorReputationScore: number;
  institutionScore: number;
  recencyBonus: number;
  breakdown: string[];
}

/**
 * 计算论文的综合质量评分
 */
export function calculatePaperQualityScore(paper: PaperMetadata): QualityScore {
  const breakdown: string[] = [];
  
  // 1. 引用数评分（0-30分）
  const citationScore = calculateCitationScore(paper.citationCount || 0);
  breakdown.push(`引用数: ${citationScore.toFixed(1)}分 (${paper.citationCount || 0} 次引用)`);
  
  // 2. 会议/期刊评分（0-30分）
  const venueScore = calculateVenueScore(paper.venueRank, paper.peerReviewStatus);
  breakdown.push(`会议等级: ${venueScore.toFixed(1)}分 (${paper.venueRank || '未知'})`);
  
  // 3. 作者声誉评分（0-20分）
  const authorReputationScore = calculatePaperAuthorScore(paper.authors);
  breakdown.push(`作者声誉: ${authorReputationScore.toFixed(1)}分`);
  
  // 4. 机构评分（0-15分）
  const institutionScore = 0; // 需要从论文中提取机构信息
  
  // 5. 新近度加分（0-10分）
  const recencyBonus = calculateRecencyBonus(paper.publicationDate);
  breakdown.push(`新近度: ${recencyBonus.toFixed(1)}分`);
  
  const totalScore = citationScore + venueScore + authorReputationScore + institutionScore + recencyBonus;
  
  return {
    totalScore,
    citationScore,
    venueScore,
    authorReputationScore,
    institutionScore,
    recencyBonus,
    breakdown
  };
}

/**
 * 计算引用数评分
 * 使用对数缩放，避免极端值
 */
function calculateCitationScore(citations: number): number {
  if (citations === 0) return 0;
  
  // 对数缩放: score = 30 * log(citations + 1) / log(10000)
  // 10000 次引用 = 30 分
  const maxCitations = 10000;
  const score = 30 * Math.log(citations + 1) / Math.log(maxCitations + 1);
  return Math.min(score, 30);
}

/**
 * 计算会议/期刊评分
 */
function calculateVenueScore(venueRank?: string, peerReviewStatus?: string): number {
  let score = 0;
  
  // 会议等级评分
  if (venueRank === 'A*') score += 25;
  else if (venueRank === 'A') score += 20;
  else if (venueRank === 'B') score += 15;
  else if (venueRank === 'C') score += 10;
  
  // 同行评议状态
  if (peerReviewStatus === 'accepted') score += 5;
  else if (peerReviewStatus === 'preprint') score += 2;
  
  return Math.min(score, 30);
}

/**
 * 计算论文作者的声誉评分
 */
function calculatePaperAuthorScore(authors: string[]): number {
  if (!authors || authors.length === 0) return 0;

  let score = 0;
  let topAuthorCount = 0;

  for (const authorName of authors) {
    const topAuthor = findTopAuthor(authorName);
    if (topAuthor) {
      topAuthorCount++;
      // 顶级学者每人贡献 8 分
      score += 8;
    }
  }

  // 最多 20 分
  return Math.min(score, 20);
}

/**
 * 计算新近度加分
 * 最近 30 天的论文有额外加分
 */
function calculateRecencyBonus(publicationDate?: string): number {
  if (!publicationDate) return 0;
  
  const pubDate = new Date(publicationDate);
  const now = new Date();
  const daysOld = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysOld <= 30) {
    // 最近 30 天: 10 分递减
    return Math.max(0, 10 - daysOld * 0.3);
  } else if (daysOld <= 90) {
    // 最近 90 天: 5 分递减
    return Math.max(0, 5 - (daysOld - 30) * 0.08);
  }
  
  return 0;
}

/**
 * 计算作者的声誉评分（用于作者表）
 */
export function calculateAuthorReputationScore(author: {
  name: string;
  h_index?: number;
  total_citations?: number;
  current_affiliation?: string;
}): number {
  let score = 0;
  
  // 1. h-index 评分（0-40分）
  if (author.h_index) {
    score += Math.min(author.h_index / 100 * 40, 40);
  }
  
  // 2. 总引用数评分（0-30分）
  if (author.total_citations) {
    score += Math.min(author.total_citations / 10000 * 30, 30);
  }
  
  // 3. 机构评分（0-20分）
  if (author.current_affiliation) {
    const instScore = getInstitutionScore(author.current_affiliation);
    score += instScore / 100 * 20;
  }
  
  // 4. 是否为顶级学者（0-10分）
  if (isTopAuthor(author.name)) {
    score += 10;
  }
  
  return Math.round(score);
}

/**
 * 判断论文是否为最近的突破性工作
 * 标准：最近 30 天 + 顶级机构/学者 + 高质量会议
 */
export function isRecentBreakthrough(paper: PaperMetadata): boolean {
  // 检查发布时间
  if (!paper.publicationDate) return false;
  
  const daysOld = (Date.now() - new Date(paper.publicationDate).getTime()) / (1000 * 60 * 60 * 24);
  if (daysOld > 30) return false;
  
  // 检查会议等级
  if (paper.venueRank !== 'A*' && paper.venueRank !== 'A') return false;
  
  // 检查是否有顶级学者
  const hasTopAuthor = paper.authors.some(author => isTopAuthor(author));
  if (!hasTopAuthor) return false;
  
  return true;
}

/**
 * 获取论文的动态权重（根据发布时间调整）
 */
export function getDynamicWeights(daysFromPublication: number): {
  citationCount: number;
  impactFactor: number;
  venueRank: number;
  authorReputation: number;
  affiliationTier: number;
  hasTopAuthor: number;
  recencyBonus: number;
} {
  if (daysFromPublication <= 30) {
    // 最近 30 天：降低引用数权重，提高作者/机构权重
    return {
      citationCount: 0.10,
      impactFactor: 0.10,
      venueRank: 0.10,
      authorReputation: 0.30,
      affiliationTier: 0.20,
      hasTopAuthor: 0.10,
      recencyBonus: 0.10
    };
  } else if (daysFromPublication <= 180) {
    // 最近 6 个月
    return {
      citationCount: 0.15,
      impactFactor: 0.15,
      venueRank: 0.15,
      authorReputation: 0.25,
      affiliationTier: 0.15,
      hasTopAuthor: 0.10,
      recencyBonus: 0.05
    };
  } else {
    // 6 个月以上：正常权重
    return {
      citationCount: 0.25,
      impactFactor: 0.20,
      venueRank: 0.20,
      authorReputation: 0.15,
      affiliationTier: 0.10,
      hasTopAuthor: 0.10,
      recencyBonus: 0.00
    };
  }
}

/**
 * 批量计算论文质量评分并排序
 */
export function rankPapersByQuality(papers: PaperMetadata[]): Array<PaperMetadata & { qualityScore: QualityScore }> {
  const scoredPapers = papers.map(paper => ({
    ...paper,
    qualityScore: calculatePaperQualityScore(paper)
  }));
  
  // 按总分降序排序
  scoredPapers.sort((a, b) => b.qualityScore.totalScore - a.qualityScore.totalScore);
  
  return scoredPapers;
}

