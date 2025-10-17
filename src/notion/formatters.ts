import { PaperMetadata } from '../sources/base.js';
import { QualityScore } from '../reputation/scoring.js';
import {
  NotionMetadata,
  NotionDatabaseSchema,
  NotionDatabaseEntry,
  NotionBlock,
  NotionPageProperties,
  ToolOutputWithNotion
} from './types.js';

/**
 * 论文数据库模式
 */
export const PAPER_DATABASE_SCHEMA: NotionDatabaseSchema = {
  title: '📚 论文数据库',
  description: '存储所有检索到的学术论文',
  properties: [
    { name: '标题', type: 'title' },
    { name: 'ArXiv ID', type: 'rich_text' },
    { name: '作者', type: 'multi_select' },
    { name: '年份', type: 'number' },
    { name: '会议/期刊', type: 'select' },
    { name: '会议等级', type: 'select', options: ['A*', 'A', 'B', 'C'] },
    { name: '引用数', type: 'number' },
    { name: '质量评分', type: 'number' },
    { name: '来源', type: 'select', options: ['arxiv', 'dblp', 'openreview', 'paperswithcode'] },
    { name: 'PDF链接', type: 'url' },
    { name: '论文链接', type: 'url' },
    { name: '发布日期', type: 'date' },
    { name: '同行评议状态', type: 'select', options: ['accepted', 'preprint', 'rejected'] },
    { name: '是否最新', type: 'checkbox' }
  ]
};

/**
 * 作者数据库模式
 */
export const AUTHOR_DATABASE_SCHEMA: NotionDatabaseSchema = {
  title: '👥 作者数据库',
  description: '存储论文作者信息',
  properties: [
    { name: '姓名', type: 'title' },
    { name: 'h-index', type: 'number' },
    { name: '总引用数', type: 'number' },
    { name: '当前机构', type: 'select' },
    { name: '机构等级', type: 'select', options: ['top-tier', 'tier-1', 'tier-2', 'other'] },
    { name: '是否顶级学者', type: 'checkbox' },
    { name: '研究领域', type: 'multi_select' },
    { name: '声誉评分', type: 'number' }
  ]
};

/**
 * 机构数据库模式
 */
export const INSTITUTION_DATABASE_SCHEMA: NotionDatabaseSchema = {
  title: '🏛️ 机构数据库',
  description: '存储研究机构信息',
  properties: [
    { name: '机构名称', type: 'title' },
    { name: '等级', type: 'select', options: ['top-tier', 'tier-1', 'tier-2', 'other'] },
    { name: '评分', type: 'number' },
    { name: '国家', type: 'select' },
    { name: '类型', type: 'select', options: ['大学', '研究所', '企业实验室'] }
  ]
};

/**
 * 将论文转换为 Notion 数据库条目
 */
export function paperToNotionEntry(
  paper: PaperMetadata,
  qualityScore?: QualityScore
): NotionDatabaseEntry {
  const isRecent = paper.publicationDate 
    ? (Date.now() - new Date(paper.publicationDate).getTime()) / (1000 * 60 * 60 * 24) <= 30
    : false;

  return {
    properties: {
      '标题': paper.title,
      'ArXiv ID': paper.arxivId || '',
      '作者': paper.authors,
      '年份': paper.year || null,
      '会议/期刊': paper.venue || '',
      '会议等级': paper.venueRank || '',
      '引用数': paper.citationCount || 0,
      '质量评分': qualityScore?.totalScore || 0,
      '来源': paper.source,
      'PDF链接': paper.pdfUrl || '',
      '论文链接': paper.sourceUrl || '',
      '发布日期': paper.publicationDate || '',
      '同行评议状态': paper.peerReviewStatus || '',
      '是否最新': isRecent
    },
    children: [
      {
        type: 'heading_2' as const,
        content: '摘要'
      },
      {
        type: 'paragraph' as const,
        content: paper.abstract || '暂无摘要'
      },
      ...(qualityScore ? [
        {
          type: 'heading_2' as const,
          content: '质量评分详情'
        },
        {
          type: 'bulleted_list_item' as const,
          content: `总分: ${qualityScore.totalScore.toFixed(1)}/100`
        },
        ...qualityScore.breakdown.map(item => ({
          type: 'bulleted_list_item' as const,
          content: item
        }))
      ] : [])
    ]
  };
}

/**
 * 创建文献综述页面
 */
export function createLiteratureReviewPage(
  title: string,
  content: string,
  papers: PaperMetadata[]
): { properties: NotionPageProperties; blocks: NotionBlock[] } {
  const blocks: NotionBlock[] = [
    {
      type: 'heading_1',
      content: title
    },
    {
      type: 'paragraph',
      content: `本综述基于 ${papers.length} 篇论文生成`
    },
    {
      type: 'divider',
      content: ''
    },
    {
      type: 'heading_2',
      content: '综述内容'
    },
    ...content.split('\n\n').map(para => ({
      type: 'paragraph' as const,
      content: para
    })),
    {
      type: 'divider',
      content: ''
    },
    {
      type: 'heading_2',
      content: '参考文献'
    },
    ...papers.map((paper, i) => ({
      type: 'numbered_list_item' as const,
      content: `${paper.title} (${paper.year || 'N/A'}) - ${paper.authors.slice(0, 3).join(', ')}${paper.authors.length > 3 ? ' et al.' : ''}`
    }))
  ];

  return {
    properties: {
      title,
      icon: '📄',
      properties: {
        '论文数量': papers.length,
        '生成时间': new Date().toISOString()
      }
    },
    blocks
  };
}

/**
 * 格式化搜索结果为 Notion 输出
 */
export function formatSearchResultsForNotion(
  papers: PaperMetadata[],
  qualityScores?: Map<string, QualityScore>
): NotionMetadata {
  return {
    database_entries: papers.map(paper =>
      paperToNotionEntry(paper, qualityScores?.get(paper.id))
    ),
    content_blocks: [],
    databases: [
      {
        schema: PAPER_DATABASE_SCHEMA,
        entries: papers.map(paper =>
          paperToNotionEntry(paper, qualityScores?.get(paper.id))
        )
      }
    ],
    instructions: `
## 使用说明

1. **创建论文数据库**：
   - 在 Notion 中创建一个新的数据库
   - 使用上面的 schema 定义添加所有属性
   - 将 entries 中的数据逐条添加到数据库

2. **查看论文详情**：
   - 点击任意论文标题查看完整内容
   - 包含摘要和质量评分详情

3. **筛选和排序**：
   - 按质量评分降序排列查看最佳论文
   - 按"是否最新"筛选查看最近30天的论文
   - 按会议等级筛选查看顶级会议论文
    `.trim()
  };
}

/**
 * 格式化文献综述为 Notion 输出
 */
export function formatLiteratureReviewForNotion(
  title: string,
  content: string,
  papers: PaperMetadata[]
): NotionMetadata {
  const reviewPage = createLiteratureReviewPage(title, content, papers);

  return {
    database_entries: [],
    content_blocks: reviewPage.blocks,
    pages: [{
      title: reviewPage.properties.title,
      blocks: reviewPage.blocks
    }],
    databases: [
      {
        schema: PAPER_DATABASE_SCHEMA,
        entries: papers.map(paper => paperToNotionEntry(paper))
      }
    ],
    relationships: [
      {
        from: '综述页面',
        to: '论文数据库',
        type: 'one-to-many',
        description: '综述引用了多篇论文'
      }
    ],
    instructions: `
## 使用说明

1. **创建综述页面**：
   - 在 Notion 中创建一个新页面
   - 复制上面的 blocks 内容到页面中

2. **创建论文数据库**：
   - 在同一个工作区创建论文数据库
   - 使用提供的 schema 和 entries

3. **建立关联**：
   - 在综述页面中添加"相关论文"关系属性
   - 链接到论文数据库中的对应条目
    `.trim()
  };
}

/**
 * 包装工具输出为 Notion 友好格式
 */
export function wrapWithNotionMetadata<T>(
  data: T,
  notionMetadata: NotionMetadata,
  summary?: string
): ToolOutputWithNotion<T> {
  return {
    data,
    notion_metadata: notionMetadata,
    summary
  };
}

