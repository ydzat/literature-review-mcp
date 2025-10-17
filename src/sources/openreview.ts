import axios from 'axios';
import { AcademicDataSource, PaperMetadata, SearchFilters, SearchResult } from './base.js';
import { storage } from '../storage/StorageManager.js';

/**
 * OpenReview 数据源
 * OpenReview 是顶级 AI 会议的预审平台（ICLR, NeurIPS, ICML 等）
 * API 文档: https://docs.openreview.net/reference/api-v2
 */
export class OpenReviewDataSource extends AcademicDataSource {
  readonly name = 'OpenReview';
  private readonly baseUrl = 'https://api2.openreview.net';
  private readonly cacheTTL = 7 * 24 * 60 * 60; // 7 天

  async search(filters: SearchFilters): Promise<SearchResult> {
    try {
      const cacheKey = `openreview_search_${JSON.stringify(filters)}`;
      const cached = storage.db.getCache(cacheKey);
      if (cached) {
        console.log('✅ OpenReview 搜索结果已缓存');
        return cached;
      }

      const limit = filters.maxResults || 30;

      console.log(`🔍 搜索 OpenReview: ${filters.query}`);

      // OpenReview API 需要至少一个必需参数
      // 使用 invitation 参数搜索顶级会议
      const topConferences = [
        'ICLR.cc/2024/Conference/-/Submission',
        'NeurIPS.cc/2023/Conference/-/Submission',
        'ICML.cc/2024/Conference/-/Submission'
      ];

      const allPapers: PaperMetadata[] = [];

      // 并行搜索多个会议
      for (const invitation of topConferences.slice(0, 1)) { // 先只搜索一个会议避免太慢
        try {
          const response = await axios.get(`${this.baseUrl}/notes`, {
            params: {
              invitation,
              limit: Math.min(limit * 2, 100),
              details: 'replyCount,invitation'
            },
            timeout: 15000,
            headers: {
              'User-Agent': 'ArXiv-MCP-Server/1.0'
            }
          });

          const notes = response.data.notes || [];
          const papers = notes.map((note: any) => {
            const content = note.content || {};
            return {
              id: note.id,
              title: content.title?.value || content.title || '',
              abstract: content.abstract?.value || content.abstract || '',
              authors: content.authors?.value || content.authors || [],
              year: note.cdate ? new Date(note.cdate).getFullYear() : undefined,
              publicationDate: note.cdate ? new Date(note.cdate).toISOString() : undefined,
              venue: note.invitation?.split('/-/')[0] || 'OpenReview',
              venueRank: this.getVenueRank(note.invitation),
              pdfUrl: content.pdf?.value || undefined,
              sourceUrl: `https://openreview.net/forum?id=${note.id}`,
              source: 'openreview',
              peerReviewStatus: 'preprint'
            };
          });

          allPapers.push(...papers);
        } catch (err) {
          console.error(`搜索 ${invitation} 失败:`, err instanceof Error ? err.message : String(err));
        }
      }

      // 本地过滤：标题或摘要包含查询关键词
      const query = filters.query.toLowerCase();
      const filteredPapers = allPapers.filter(paper => {
        const titleMatch = paper.title.toLowerCase().includes(query);
        const abstractMatch = paper.abstract?.toLowerCase().includes(query);
        return titleMatch || abstractMatch;
      }).slice(0, limit);

      const result: SearchResult = {
        totalResults: filteredPapers.length,
        papers: filteredPapers
      };

      storage.db.setCache(cacheKey, result, this.cacheTTL);
      console.log(`✅ 找到 ${filteredPapers.length} 篇论文`);

      return result;
    } catch (error) {
      console.error('OpenReview 搜索失败:', error);
      // 返回空结果而不是抛出错误，避免影响其他数据源
      return { totalResults: 0, papers: [] };
    }
  }

  async getPaperDetails(id: string): Promise<PaperMetadata | null> {
    try {
      const cacheKey = `openreview_paper_${id}`;
      const cached = storage.db.getCache(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await axios.get(`${this.baseUrl}/notes`, {
        params: { id },
        timeout: 10000
      });

      const notes = response.data.notes || [];
      if (notes.length === 0) {
        return null;
      }

      const note = notes[0];
      const content = note.content || {};

      const paper: PaperMetadata = {
        id: note.id,
        title: content.title?.value || content.title || '',
        abstract: content.abstract?.value || content.abstract || '',
        authors: content.authors?.value || content.authors || [],
        year: note.cdate ? new Date(note.cdate).getFullYear() : undefined,
        venue: note.invitation?.split('/-/')[0] || 'OpenReview',
        venueRank: this.getVenueRank(note.invitation),
        pdfUrl: content.pdf?.value || undefined,
        sourceUrl: `https://openreview.net/forum?id=${note.id}`,
        source: 'openreview',
        peerReviewStatus: 'preprint'
      };

      storage.db.setCache(cacheKey, paper, this.cacheTTL);
      return paper;
    } catch (error) {
      console.error('获取 OpenReview 论文详情失败:', error);
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/notes`, {
        params: { limit: 1 },
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * 根据会议搜索论文
   */
  async searchByConference(conference: string, year?: number, maxResults: number = 30): Promise<SearchResult> {
    const query = year ? `${conference} ${year}` : conference;
    return this.search({ query, maxResults });
  }

  /**
   * 获取最新提交的论文
   */
  async getRecentSubmissions(maxResults: number = 30): Promise<SearchResult> {
    try {
      const response = await axios.get(`${this.baseUrl}/notes`, {
        params: {
          limit: maxResults,
          sort: 'cdate:desc'
        },
        timeout: 10000
      });

      const notes = response.data.notes || [];
      const papers: PaperMetadata[] = notes.map((note: any) => {
        const content = note.content || {};
        return {
          id: note.id,
          title: content.title?.value || content.title || '',
          abstract: content.abstract?.value || content.abstract || '',
          authors: content.authors?.value || content.authors || [],
          year: note.cdate ? new Date(note.cdate).getFullYear() : undefined,
          publicationDate: note.cdate ? new Date(note.cdate).toISOString() : undefined,
          venue: note.invitation?.split('/-/')[0] || 'OpenReview',
          sourceUrl: `https://openreview.net/forum?id=${note.id}`,
          source: 'openreview'
        };
      });

      return {
        totalResults: papers.length,
        papers
      };
    } catch (error) {
      console.error('获取 OpenReview 最新论文失败:', error);
      return { totalResults: 0, papers: [] };
    }
  }

  /**
   * 判断会议等级
   */
  private getVenueRank(invitation?: string): 'A*' | 'A' | 'B' | 'C' | undefined {
    if (!invitation) return undefined;
    
    const topConferences = ['ICLR', 'NeurIPS', 'ICML', 'CVPR', 'ICCV'];
    const aConferences = ['AAAI', 'IJCAI', 'ACL', 'EMNLP'];
    
    for (const conf of topConferences) {
      if (invitation.includes(conf)) return 'A*';
    }
    
    for (const conf of aConferences) {
      if (invitation.includes(conf)) return 'A';
    }
    
    return undefined;
  }
}

// 导出单例
export const openreview = new OpenReviewDataSource();

