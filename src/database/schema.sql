-- ArXiv MCP Server Database Schema
-- SQLite 数据库表结构定义

-- ============================================
-- 论文表
-- ============================================
CREATE TABLE IF NOT EXISTS papers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  arxiv_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  abstract TEXT,
  year INTEGER,
  publication_date TEXT,
  venue TEXT,
  venue_rank TEXT,  -- A*, A, B, C
  citation_count INTEGER DEFAULT 0,
  impact_factor REAL,
  peer_review_status TEXT,  -- accepted, preprint, rejected
  pdf_url TEXT,
  pdf_path TEXT,
  text_path TEXT,
  markdown_path TEXT,  -- 生成的中文 Markdown 路径
  wechat_path TEXT,    -- 生成的微信文章路径
  review_path TEXT,    -- 生成的学术综述路径
  individual_review TEXT,  -- 单篇论文的深度分析内容（用于文献综述）
  source TEXT,  -- arxiv, dblp, openreview, paperswithcode, ieee, acm
  
  -- 质量评分
  quality_score REAL,
  author_reputation_score REAL,
  affiliation_tier_score REAL,
  recency_bonus REAL,
  
  -- 元数据
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TEXT,
  
  -- 缓存控制
  cache_ttl INTEGER DEFAULT 604800  -- 7 天（秒）
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_papers_arxiv_id ON papers(arxiv_id);
CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(year);
CREATE INDEX IF NOT EXISTS idx_papers_citation_count ON papers(citation_count);
CREATE INDEX IF NOT EXISTS idx_papers_quality_score ON papers(quality_score);
CREATE INDEX IF NOT EXISTS idx_papers_publication_date ON papers(publication_date);
CREATE INDEX IF NOT EXISTS idx_papers_source ON papers(source);

-- ============================================
-- 作者表
-- ============================================
CREATE TABLE IF NOT EXISTS authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  h_index INTEGER,
  total_citations INTEGER,
  current_affiliation TEXT,
  research_areas TEXT,  -- JSON array
  is_top_author BOOLEAN DEFAULT 0,
  reputation_score REAL,
  
  -- 元数据
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  cache_ttl INTEGER DEFAULT 2592000  -- 30 天
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_authors_name ON authors(name);
CREATE INDEX IF NOT EXISTS idx_authors_h_index ON authors(h_index);
CREATE INDEX IF NOT EXISTS idx_authors_reputation_score ON authors(reputation_score);
CREATE INDEX IF NOT EXISTS idx_authors_is_top_author ON authors(is_top_author);

-- ============================================
-- 机构表
-- ============================================
CREATE TABLE IF NOT EXISTS institutions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  tier TEXT,  -- top-tier, tier-1, tier-2, other
  tier_score REAL,
  country TEXT,
  
  -- 元数据
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_institutions_name ON institutions(name);
CREATE INDEX IF NOT EXISTS idx_institutions_tier ON institutions(tier);

-- ============================================
-- 论文-作者关系表（多对多）
-- ============================================
CREATE TABLE IF NOT EXISTS paper_authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  author_order INTEGER,  -- 第几作者
  
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE,
  UNIQUE(paper_id, author_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_paper_authors_paper_id ON paper_authors(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_authors_author_id ON paper_authors(author_id);

-- ============================================
-- 论文-机构关系表（多对多）
-- ============================================
CREATE TABLE IF NOT EXISTS paper_institutions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paper_id INTEGER NOT NULL,
  institution_id INTEGER NOT NULL,
  
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE,
  UNIQUE(paper_id, institution_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_paper_institutions_paper_id ON paper_institutions(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_institutions_institution_id ON paper_institutions(institution_id);

-- ============================================
-- 论文引用关系表（论文之间的引用）
-- ============================================
CREATE TABLE IF NOT EXISTS paper_citations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  citing_paper_id INTEGER NOT NULL,  -- 引用者
  cited_paper_id INTEGER NOT NULL,   -- 被引用者
  
  FOREIGN KEY (citing_paper_id) REFERENCES papers(id) ON DELETE CASCADE,
  FOREIGN KEY (cited_paper_id) REFERENCES papers(id) ON DELETE CASCADE,
  UNIQUE(citing_paper_id, cited_paper_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_paper_citations_citing ON paper_citations(citing_paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_citations_cited ON paper_citations(cited_paper_id);

-- ============================================
-- 综述表
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  focus_area TEXT,
  content TEXT,  -- Markdown 内容
  total_papers INTEGER,
  total_words INTEGER,
  ai_generated_ratio REAL,
  
  -- Notion 集成
  notion_page_id TEXT,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_reviews_title ON reviews(title);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);

-- ============================================
-- 综述-论文关系表
-- ============================================
CREATE TABLE IF NOT EXISTS review_papers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id INTEGER NOT NULL,
  paper_id INTEGER NOT NULL,
  
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
  UNIQUE(review_id, paper_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_review_papers_review_id ON review_papers(review_id);
CREATE INDEX IF NOT EXISTS idx_review_papers_paper_id ON review_papers(paper_id);

-- ============================================
-- API 缓存表
-- ============================================
CREATE TABLE IF NOT EXISTS api_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_key TEXT UNIQUE NOT NULL,
  cache_value TEXT NOT NULL,  -- JSON
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  ttl INTEGER DEFAULT 86400  -- 1 天
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_api_cache_created_at ON api_cache(created_at);

-- ============================================
-- 触发器：自动更新 updated_at
-- ============================================
CREATE TRIGGER IF NOT EXISTS update_papers_timestamp 
AFTER UPDATE ON papers
BEGIN
  UPDATE papers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_authors_timestamp 
AFTER UPDATE ON authors
BEGIN
  UPDATE authors SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_institutions_timestamp 
AFTER UPDATE ON institutions
BEGIN
  UPDATE institutions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_reviews_timestamp 
AFTER UPDATE ON reviews
BEGIN
  UPDATE reviews SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

