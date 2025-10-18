import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 类型定义
export interface Paper {
  id?: number;
  arxiv_id: string;
  title: string;
  abstract?: string;
  year?: number;
  publication_date?: string;
  venue?: string;
  venue_rank?: string;
  citation_count?: number;
  impact_factor?: number;
  peer_review_status?: string;
  pdf_url?: string;
  pdf_path?: string;
  text_path?: string;
  markdown_path?: string;
  wechat_path?: string;
  review_path?: string;
  individual_review?: string;  // 单篇论文深度分析内容
  source?: string;
  quality_score?: number;
  author_reputation_score?: number;
  affiliation_tier_score?: number;
  recency_bonus?: number;
}

export interface Author {
  id?: number;
  name: string;
  h_index?: number;
  total_citations?: number;
  current_affiliation?: string;
  research_areas?: string;
  is_top_author?: boolean;
  reputation_score?: number;
}

export interface Institution {
  id?: number;
  name: string;
  tier?: string;
  tier_score?: number;
  country?: string;
}

export interface Review {
  id?: number;
  title: string;
  focus_area?: string;
  content?: string;
  total_papers?: number;
  total_words?: number;
  ai_generated_ratio?: number;
  notion_page_id?: string;
}

export interface CacheEntry {
  cache_key: string;
  cache_value: string;
  ttl?: number;
}

export class DatabaseManager {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    
    // 确保目录存在
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ 数据库目录已创建: ${dir}`);
    }
    
    // 打开数据库
    this.db = new Database(dbPath);
    
    // 性能优化
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000'); // 64MB cache
    
    console.log(`✅ 数据库已连接: ${dbPath}`);
    
    // 初始化表结构
    this.initTables();
  }

  private initTables(): void {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    this.db.exec(schema);
    console.log('✅ 数据库表结构已初始化');
  }

  // ============================================
  // 论文相关操作
  // ============================================

  insertPaper(paper: Paper): number {
    const stmt = this.db.prepare(`
      INSERT INTO papers (
        arxiv_id, title, abstract, year, publication_date,
        venue, venue_rank, citation_count, impact_factor,
        peer_review_status, pdf_url, pdf_path, text_path,
        markdown_path, wechat_path, review_path, individual_review,
        source, quality_score, author_reputation_score,
        affiliation_tier_score, recency_bonus
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      paper.arxiv_id,
      paper.title,
      paper.abstract || null,
      paper.year || null,
      paper.publication_date || null,
      paper.venue || null,
      paper.venue_rank || null,
      paper.citation_count || 0,
      paper.impact_factor || null,
      paper.peer_review_status || null,
      paper.pdf_url || null,
      paper.pdf_path || null,
      paper.text_path || null,
      paper.markdown_path || null,
      paper.wechat_path || null,
      paper.review_path || null,
      paper.individual_review || null,
      paper.source || 'arxiv',
      paper.quality_score || null,
      paper.author_reputation_score || null,
      paper.affiliation_tier_score || null,
      paper.recency_bonus || null
    );

    return result.lastInsertRowid as number;
  }

  getPaperByArxivId(arxivId: string): Paper | null {
    const stmt = this.db.prepare('SELECT * FROM papers WHERE arxiv_id = ?');
    return stmt.get(arxivId) as Paper | null;
  }

  getPaperById(id: number): Paper | null {
    const stmt = this.db.prepare('SELECT * FROM papers WHERE id = ?');
    return stmt.get(id) as Paper | null;
  }

  getAllPapers(): Paper[] {
    const stmt = this.db.prepare('SELECT * FROM papers');
    return stmt.all() as Paper[];
  }

  updatePaper(arxivId: string, updates: Partial<Paper>): void {
    const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'arxiv_id');
    if (fields.length === 0) return;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => (updates as any)[f]);

    const stmt = this.db.prepare(`UPDATE papers SET ${setClause} WHERE arxiv_id = ?`);
    stmt.run(...values, arxivId);
  }

  insertOrUpdatePaper(paper: Partial<Paper>): number {
    const existing = this.getPaperByArxivId(paper.arxiv_id!);
    if (existing) {
      this.updatePaper(paper.arxiv_id!, paper);
      return existing.id!;
    }
    return this.insertPaper(paper as Paper);
  }

  searchPapers(filters: {
    minCitations?: number;
    minQualityScore?: number;
    yearRange?: [number, number];
    source?: string;
    limit?: number;
  }): Paper[] {
    let sql = 'SELECT * FROM papers WHERE 1=1';
    const params: any[] = [];
    
    if (filters.minCitations !== undefined) {
      sql += ' AND citation_count >= ?';
      params.push(filters.minCitations);
    }
    
    if (filters.minQualityScore !== undefined) {
      sql += ' AND quality_score >= ?';
      params.push(filters.minQualityScore);
    }
    
    if (filters.yearRange) {
      sql += ' AND year BETWEEN ? AND ?';
      params.push(filters.yearRange[0], filters.yearRange[1]);
    }
    
    if (filters.source) {
      sql += ' AND source = ?';
      params.push(filters.source);
    }
    
    sql += ' ORDER BY quality_score DESC';
    
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as Paper[];
  }

  // ============================================
  // 作者相关操作
  // ============================================

  insertAuthor(author: Author): number {
    const stmt = this.db.prepare(`
      INSERT INTO authors (
        name, h_index, total_citations, current_affiliation,
        research_areas, is_top_author, reputation_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      author.name,
      author.h_index || null,
      author.total_citations || null,
      author.current_affiliation || null,
      author.research_areas || null,
      author.is_top_author ? 1 : 0,
      author.reputation_score || null
    );
    
    return result.lastInsertRowid as number;
  }

  getAuthorByName(name: string): Author | null {
    const stmt = this.db.prepare('SELECT * FROM authors WHERE name = ?');
    return stmt.get(name) as Author | null;
  }

  getOrCreateAuthor(author: Partial<Author>): number {
    const existing = this.getAuthorByName(author.name!);
    if (existing) {
      return existing.id!;
    }
    return this.insertAuthor(author as Author);
  }

  // ============================================
  // 机构相关操作
  // ============================================

  insertInstitution(institution: Institution): number {
    const stmt = this.db.prepare(`
      INSERT INTO institutions (name, tier, tier_score, country)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      institution.name,
      institution.tier || null,
      institution.tier_score || null,
      institution.country || null
    );
    
    return result.lastInsertRowid as number;
  }

  getInstitutionByName(name: string): Institution | null {
    const stmt = this.db.prepare('SELECT * FROM institutions WHERE name = ?');
    return stmt.get(name) as Institution | null;
  }

  getOrCreateInstitution(institution: Institution): number {
    const existing = this.getInstitutionByName(institution.name);
    if (existing) {
      return existing.id!;
    }
    return this.insertInstitution(institution);
  }

  // ============================================
  // 关系操作
  // ============================================

  linkPaperAuthor(paperId: number, authorId: number, authorOrder?: number): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO paper_authors (paper_id, author_id, author_order)
      VALUES (?, ?, ?)
    `);
    stmt.run(paperId, authorId, authorOrder || null);
  }

  linkPaperInstitution(paperId: number, institutionId: number): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO paper_institutions (paper_id, institution_id)
      VALUES (?, ?)
    `);
    stmt.run(paperId, institutionId);
  }

  getPaperAuthors(paperId: number): Author[] {
    const stmt = this.db.prepare(`
      SELECT a.* FROM authors a
      JOIN paper_authors pa ON a.id = pa.author_id
      WHERE pa.paper_id = ?
      ORDER BY pa.author_order
    `);
    return stmt.all(paperId) as Author[];
  }

  getPapersByAuthor(authorName: string): Paper[] {
    const stmt = this.db.prepare(`
      SELECT p.* FROM papers p
      JOIN paper_authors pa ON p.id = pa.paper_id
      JOIN authors a ON pa.author_id = a.id
      WHERE a.name = ?
      ORDER BY p.year DESC
    `);
    return stmt.all(authorName) as Paper[];
  }

  // ============================================
  // 综述相关操作
  // ============================================

  insertReview(review: Omit<Review, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO reviews (title, focus_area, content, total_papers, total_words, ai_generated_ratio, notion_page_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      review.title,
      review.focus_area || null,
      review.content || null,
      review.total_papers || null,
      review.total_words || null,
      review.ai_generated_ratio || null,
      review.notion_page_id || null
    );

    return result.lastInsertRowid as number;
  }

  getReviewById(id: number): Review | null {
    const stmt = this.db.prepare('SELECT * FROM reviews WHERE id = ?');
    return stmt.get(id) as Review | null;
  }

  getAllReviews(): Review[] {
    const stmt = this.db.prepare('SELECT * FROM reviews ORDER BY created_at DESC');
    return stmt.all() as Review[];
  }

  linkReviewPaper(reviewId: number, paperId: number): void {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO review_papers (review_id, paper_id)
      VALUES (?, ?)
    `);
    stmt.run(reviewId, paperId);
  }

  getPapersByReviewId(reviewId: number): Paper[] {
    const stmt = this.db.prepare(`
      SELECT p.* FROM papers p
      INNER JOIN review_papers rp ON p.id = rp.paper_id
      WHERE rp.review_id = ?
    `);
    return stmt.all(reviewId) as Paper[];
  }

  // ============================================
  // 缓存操作
  // ============================================

  getCache(key: string): any | null {
    const stmt = this.db.prepare(`
      SELECT cache_value, created_at, ttl FROM api_cache
      WHERE cache_key = ?
    `);

    const row = stmt.get(key) as any;
    if (!row) return null;

    // 检查是否过期
    const createdAt = new Date(row.created_at).getTime();
    const age = (Date.now() - createdAt) / 1000;

    if (age > row.ttl) {
      this.deleteCache(key);
      return null;
    }
    
    try {
      return JSON.parse(row.cache_value);
    } catch {
      return null;
    }
  }

  setCache(key: string, value: any, ttl: number = 86400): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO api_cache (cache_key, cache_value, ttl)
      VALUES (?, ?, ?)
    `);
    stmt.run(key, JSON.stringify(value), ttl);
  }

  deleteCache(key: string): void {
    const stmt = this.db.prepare('DELETE FROM api_cache WHERE cache_key = ?');
    stmt.run(key);
  }

  cleanExpiredCache(): number {
    const stmt = this.db.prepare(`
      DELETE FROM api_cache
      WHERE (unixepoch('now') - unixepoch(created_at)) > ttl
    `);
    return stmt.run().changes;
  }

  // ============================================
  // 工具方法
  // ============================================

  close(): void {
    this.db.close();
    console.log('✅ 数据库连接已关闭');
  }

  getStats(): any {
    const papers = this.db.prepare('SELECT COUNT(*) as count FROM papers').get() as any;
    const authors = this.db.prepare('SELECT COUNT(*) as count FROM authors').get() as any;
    const institutions = this.db.prepare('SELECT COUNT(*) as count FROM institutions').get() as any;
    const reviews = this.db.prepare('SELECT COUNT(*) as count FROM reviews').get() as any;
    
    return {
      papers: papers.count,
      authors: authors.count,
      institutions: institutions.count,
      reviews: reviews.count
    };
  }
}

