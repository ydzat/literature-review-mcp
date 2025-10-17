// 学术数据源基础接口

export interface PaperMetadata {
  id: string;
  title: string;
  abstract?: string;
  authors: string[];
  year?: number;
  publicationDate?: string;
  venue?: string;
  venueRank?: 'A*' | 'A' | 'B' | 'C';
  citationCount?: number;
  impactFactor?: number;
  peerReviewStatus?: 'accepted' | 'preprint' | 'rejected';
  pdfUrl?: string;
  sourceUrl?: string;
  source: string;
  doi?: string;
  arxivId?: string;
}

export interface SearchFilters {
  query: string;
  maxResults?: number;
  yearRange?: [number, number];
  minCitations?: number;
  venue?: string;
  authors?: string[];
}

export interface SearchResult {
  totalResults: number;
  papers: PaperMetadata[];
}

export abstract class AcademicDataSource {
  abstract readonly name: string;
  
  /**
   * 搜索论文
   */
  abstract search(filters: SearchFilters): Promise<SearchResult>;
  
  /**
   * 获取论文详情
   */
  abstract getPaperDetails(id: string): Promise<PaperMetadata | null>;
  
  /**
   * 检查数据源是否可用
   */
  abstract isAvailable(): Promise<boolean>;
}

