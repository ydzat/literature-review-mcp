import axios from 'axios';
import { AcademicDataSource, PaperMetadata, SearchFilters, SearchResult } from './base.js';
import { storage } from '../storage/StorageManager.js';

/**
 * DBLP 数据源
 * DBLP 是计算机科学领域的权威文献数据库
 * API 文档: https://dblp.org/faq/How+to+use+the+dblp+search+API.html
 */
export class DBLPDataSource extends AcademicDataSource {
  readonly name = 'DBLP';
  private readonly baseUrl = 'https://dblp.org/search/publ/api';
  private readonly cacheTTL = 7 * 24 * 60 * 60; // 7 天

  async search(filters: SearchFilters): Promise<SearchResult> {
    try {
      const cacheKey = `dblp_search_${JSON.stringify(filters)}`;
      const cached = storage.db.getCache(cacheKey);
      if (cached) {
        console.log('✅ DBLP 搜索结果已缓存');
        return cached;
      }

      const maxResults = filters.maxResults || 30;
      const params = new URLSearchParams({
        q: filters.query,
        format: 'json',
        h: maxResults.toString()
      });

      console.log(`🔍 搜索 DBLP: ${filters.query}`);
      const response = await axios.get(`${this.baseUrl}?${params.toString()}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'ArXiv-MCP-Server/1.0'
        }
      });

      const data = response.data;
      const hits = data.result?.hits?.hit || [];
      
      const papers: PaperMetadata[] = hits.map((hit: any) => {
        const info = hit.info;
        return {
          id: info.key || '',
          title: info.title || '',
          authors: info.authors?.author 
            ? (Array.isArray(info.authors.author) 
                ? info.authors.author.map((a: any) => a.text || a) 
                : [info.authors.author.text || info.authors.author])
            : [],
          year: info.year ? parseInt(info.year) : undefined,
          venue: info.venue || info.booktitle || info.journal,
          pdfUrl: info.ee || undefined,
          sourceUrl: info.url || undefined,
          source: 'dblp',
          doi: info.doi || undefined
        };
      });

      const result: SearchResult = {
        totalResults: parseInt(data.result?.hits?.['@total'] || '0'),
        papers
      };

      // 缓存结果
      storage.db.setCache(cacheKey, result, this.cacheTTL);
      console.log(`✅ 找到 ${papers.length} 篇论文`);

      return result;
    } catch (error) {
      console.error('DBLP 搜索失败:', error);
      throw new Error(`DBLP 搜索失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getPaperDetails(id: string): Promise<PaperMetadata | null> {
    try {
      const cacheKey = `dblp_paper_${id}`;
      const cached = storage.db.getCache(cacheKey);
      if (cached) {
        return cached;
      }

      // DBLP 的详情 API
      const response = await axios.get(`https://dblp.org/rec/${id}.xml`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'ArXiv-MCP-Server/1.0'
        }
      });

      // 简单的 XML 解析（实际应该用 XML 解析库）
      const xmlData = response.data;
      
      // 这里简化处理，实际应该用 xml2js 等库
      // 暂时返回基本信息
      const paper: PaperMetadata = {
        id,
        title: '',
        authors: [],
        source: 'dblp',
        sourceUrl: `https://dblp.org/rec/${id}.html`
      };

      storage.db.setCache(cacheKey, paper, this.cacheTTL);
      return paper;
    } catch (error) {
      console.error('获取 DBLP 论文详情失败:', error);
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get('https://dblp.org', {
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * 根据作者搜索论文
   */
  async searchByAuthor(authorName: string, maxResults: number = 30): Promise<SearchResult> {
    return this.search({
      query: `author:${authorName}`,
      maxResults
    });
  }

  /**
   * 根据会议/期刊搜索论文
   */
  async searchByVenue(venueName: string, maxResults: number = 30): Promise<SearchResult> {
    return this.search({
      query: `venue:${venueName}`,
      maxResults
    });
  }

  /**
   * 搜索特定年份的论文
   */
  async searchByYear(query: string, year: number, maxResults: number = 30): Promise<SearchResult> {
    return this.search({
      query: `${query} year:${year}`,
      maxResults
    });
  }
}

// 导出单例
export const dblp = new DBLPDataSource();

