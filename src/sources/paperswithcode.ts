import axios from 'axios';
import { AcademicDataSource, PaperMetadata, SearchFilters, SearchResult } from './base.js';
import { storage } from '../storage/StorageManager.js';

/**
 * Papers With Code 数据源
 * Papers With Code 提供带代码实现的论文
 * API 文档: https://paperswithcode.com/api/v1/docs/
 */
export class PapersWithCodeDataSource extends AcademicDataSource {
  readonly name = 'Papers With Code';
  private readonly baseUrl = 'https://paperswithcode.com/api/v1';
  private readonly cacheTTL = 7 * 24 * 60 * 60; // 7 天

  async search(filters: SearchFilters): Promise<SearchResult> {
    try {
      const cacheKey = `pwc_search_${JSON.stringify(filters)}`;
      const cached = storage.db.getCache(cacheKey);
      if (cached) {
        console.log('✅ Papers With Code 搜索结果已缓存');
        return cached;
      }

      const itemsPerPage = Math.min(filters.maxResults || 30, 50);

      console.log(`🔍 搜索 Papers With Code: ${filters.query}`);

      // Papers With Code API 不支持全文搜索
      // 改为获取最新论文或热门论文
      const response = await axios.get(`${this.baseUrl}/papers/`, {
        params: {
          items_per_page: itemsPerPage
        },
        timeout: 15000,
        headers: {
          'User-Agent': 'ArXiv-MCP-Server/1.0'
        }
      });

      const results = response.data.results || [];

      // 将所有论文转换为 PaperMetadata
      const allPapers: PaperMetadata[] = results.map((paper: any) => ({
        id: paper.id || paper.paper_url?.split('/').pop() || '',
        title: paper.title || '',
        abstract: paper.abstract || '',
        authors: paper.authors?.split(',').map((a: string) => a.trim()) || [],
        year: paper.published ? new Date(paper.published).getFullYear() : undefined,
        publicationDate: paper.published || undefined,
        venue: paper.conference || paper.proceeding || undefined,
        pdfUrl: paper.url_pdf || undefined,
        sourceUrl: paper.paper_url || `https://paperswithcode.com/paper/${paper.id}`,
        source: 'paperswithcode',
        arxivId: paper.arxiv_id || undefined
      }));

      // 本地过滤：标题或摘要包含查询关键词
      const query = filters.query.toLowerCase();
      const filteredPapers = allPapers.filter(paper => {
        const titleMatch = paper.title.toLowerCase().includes(query);
        const abstractMatch = paper.abstract?.toLowerCase().includes(query);
        return titleMatch || abstractMatch;
      });

      const result: SearchResult = {
        totalResults: filteredPapers.length,
        papers: filteredPapers
      };

      storage.db.setCache(cacheKey, result, this.cacheTTL);
      console.log(`✅ 找到 ${filteredPapers.length} 篇论文`);

      return result;
    } catch (error) {
      console.error('Papers With Code 搜索失败:', error);
      // 返回空结果而不是抛出错误
      return { totalResults: 0, papers: [] };
    }
  }

  async getPaperDetails(id: string): Promise<PaperMetadata | null> {
    try {
      const cacheKey = `pwc_paper_${id}`;
      const cached = storage.db.getCache(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await axios.get(`${this.baseUrl}/papers/${id}/`, {
        timeout: 10000
      });

      const paper = response.data;

      const metadata: PaperMetadata = {
        id: paper.id || id,
        title: paper.title || '',
        abstract: paper.abstract || '',
        authors: paper.authors?.split(',').map((a: string) => a.trim()) || [],
        year: paper.published ? new Date(paper.published).getFullYear() : undefined,
        publicationDate: paper.published || undefined,
        venue: paper.conference || paper.proceeding || undefined,
        pdfUrl: paper.url_pdf || undefined,
        sourceUrl: paper.paper_url || `https://paperswithcode.com/paper/${id}`,
        source: 'paperswithcode',
        arxivId: paper.arxiv_id || undefined
      };

      storage.db.setCache(cacheKey, metadata, this.cacheTTL);
      return metadata;
    } catch (error) {
      console.error('获取 Papers With Code 论文详情失败:', error);
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/papers/`, {
        params: { items_per_page: 1 },
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * 搜索特定任务的论文
   */
  async searchByTask(taskName: string, maxResults: number = 30): Promise<SearchResult> {
    try {
      const response = await axios.get(`${this.baseUrl}/papers/`, {
        params: {
          task: taskName,
          items_per_page: Math.min(maxResults, 50)
        },
        timeout: 10000
      });

      const results = response.data.results || [];
      const papers: PaperMetadata[] = results.map((paper: any) => ({
        id: paper.id || '',
        title: paper.title || '',
        abstract: paper.abstract || '',
        authors: paper.authors?.split(',').map((a: string) => a.trim()) || [],
        year: paper.published ? new Date(paper.published).getFullYear() : undefined,
        sourceUrl: paper.paper_url || '',
        source: 'paperswithcode',
        arxivId: paper.arxiv_id || undefined
      }));

      return {
        totalResults: response.data.count || papers.length,
        papers
      };
    } catch (error) {
      console.error('按任务搜索失败:', error);
      return { totalResults: 0, papers: [] };
    }
  }

  /**
   * 获取热门论文
   */
  async getTrendingPapers(maxResults: number = 30): Promise<SearchResult> {
    try {
      const response = await axios.get(`${this.baseUrl}/papers/`, {
        params: {
          ordering: '-stars',
          items_per_page: Math.min(maxResults, 50)
        },
        timeout: 10000
      });

      const results = response.data.results || [];
      const papers: PaperMetadata[] = results.map((paper: any) => ({
        id: paper.id || '',
        title: paper.title || '',
        abstract: paper.abstract || '',
        authors: paper.authors?.split(',').map((a: string) => a.trim()) || [],
        year: paper.published ? new Date(paper.published).getFullYear() : undefined,
        sourceUrl: paper.paper_url || '',
        source: 'paperswithcode',
        arxivId: paper.arxiv_id || undefined
      }));

      return {
        totalResults: papers.length,
        papers
      };
    } catch (error) {
      console.error('获取热门论文失败:', error);
      return { totalResults: 0, papers: [] };
    }
  }

  /**
   * 根据 arXiv ID 查找论文
   */
  async getByArxivId(arxivId: string): Promise<PaperMetadata | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/papers/`, {
        params: {
          arxiv_id: arxivId
        },
        timeout: 10000
      });

      const results = response.data.results || [];
      if (results.length === 0) {
        return null;
      }

      const paper = results[0];
      return {
        id: paper.id || '',
        title: paper.title || '',
        abstract: paper.abstract || '',
        authors: paper.authors?.split(',').map((a: string) => a.trim()) || [],
        year: paper.published ? new Date(paper.published).getFullYear() : undefined,
        sourceUrl: paper.paper_url || '',
        source: 'paperswithcode',
        arxivId: paper.arxiv_id || arxivId
      };
    } catch (error) {
      console.error('根据 arXiv ID 查找失败:', error);
      return null;
    }
  }
}

// 导出单例
export const paperswithcode = new PapersWithCodeDataSource();

