/**
 * 工具注册表 - 统一管理所有 MCP 工具的元数据和处理函数
 */

import { searchArxivPapers, downloadArxivPdfTool } from './arxiv-tools.js';
import { 
  parsePdfToText, 
  parsePdfToMarkdown, 
  convertToWechatArticle, 
  convertToAcademicReviewEnhanced,
  processArxivPaper
} from './processing-tools.js';
import { 
  batchDownloadPdfsTool, 
  batchAnalyzePapersTool, 
  generateUnifiedLiteratureReview 
} from './batch-tools.js';
import { searchAcademicPapers } from './search-tools.js';
import {
  exportToNotionFullTool,
  exportToNotionUpdateTool,
  exportIndividualReviewToMd,
  batchExportIndividualReviews
} from './export-tools.js';
import { clearWorkdir } from './utility-tools.js';

/**
 * 工具定义接口
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  handler: (args: any) => Promise<any>;
}

/**
 * 所有工具的注册表
 */
export const TOOL_REGISTRY: ToolDefinition[] = [
  // arXiv 工具
  {
    name: 'search_arxiv_papers',
    description: '搜索 arXiv 论文',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索英文关键词'
        },
        max_results: {
          type: 'number',
          description: '最大结果数量',
          default: 5
        }
      },
      required: ['query']
    },
    handler: async (args) => await searchArxivPapers(args.query, args.max_results || 5)
  },
  {
    name: 'download_arxiv_pdf',
    description: '下载 arXiv PDF 文件',
    inputSchema: {
      type: 'object',
      properties: {
        arxiv_id: {
          type: 'string',
          description: 'arXiv 论文URL（如：http://arxiv.org/abs/2403.15137v1）或 arXiv ID（如：2403.15137v1），优先使用URL'
        }
      },
      required: ['arxiv_id']
    },
    handler: async (args) => await downloadArxivPdfTool(args.arxiv_id)
  },

  // 论文处理工具
  {
    name: 'parse_pdf_to_text',
    description: '解析 PDF 并返回原始文本内容',
    inputSchema: {
      type: 'object',
      properties: {
        arxiv_id: {
          type: 'string',
          description: 'arXiv 论文ID'
        },
        paperInfo: {
          type: 'object',
          description: '论文信息（可选，用于添加论文元数据）',
          properties: {
            title: { type: 'string' },
            summary: { type: 'string' },
            published: { type: 'string' },
            authors: { type: 'array' }
          }
        }
      },
      required: ['arxiv_id']
    },
    handler: async (args) => await parsePdfToText(args.arxiv_id, args.paperInfo)
  },
  {
    name: 'parse_pdf_to_markdown',
    description: '解析 PDF 并返回 LLM 翻译后的中文 Markdown 文件',
    inputSchema: {
      type: 'object',
      properties: {
        arxiv_id: {
          type: 'string',
          description: 'arXiv 论文ID'
        },
        paperInfo: {
          type: 'object',
          description: '论文信息（可选，用于添加论文元数据）',
          properties: {
            title: { type: 'string' },
            summary: { type: 'string' },
            published: { type: 'string' },
            authors: { type: 'array' }
          }
        }
      },
      required: ['arxiv_id']
    },
    handler: async (args) => await parsePdfToMarkdown(args.arxiv_id, args.paperInfo)
  },
  {
    name: 'convert_to_wechat_article',
    description: '转换为微信文章格式',
    inputSchema: {
      type: 'object',
      properties: {
        arxiv_id: {
          type: 'string',
          description: 'arXiv 论文ID'
        }
      },
      required: ['arxiv_id']
    },
    handler: async (args) => await convertToWechatArticle(args.arxiv_id)
  },
  {
    name: 'convert_to_academic_review_enhanced',
    description: '转换为增强版学术文献综述（包含博士思维分析和Mermaid可视化）',
    inputSchema: {
      type: 'object',
      properties: {
        arxiv_id: {
          type: 'string',
          description: 'arXiv 论文ID'
        }
      },
      required: ['arxiv_id']
    },
    handler: async (args) => await convertToAcademicReviewEnhanced(args.arxiv_id)
  },
  {
    name: 'process_arxiv_paper',
    description: '完整流程处理 arXiv 论文（搜索、下载、解析、转换）',
    inputSchema: {
      type: 'object',
      properties: {
        arxiv_id: {
          type: 'string',
          description: 'arXiv 论文ID'
        },
        include_wechat: {
          type: 'boolean',
          description: '是否生成微信文章',
          default: true
        }
      },
      required: ['arxiv_id']
    },
    handler: async (args) => await processArxivPaper(args.arxiv_id, args.include_wechat)
  },

  // 批量处理工具
  {
    name: 'batch_download_pdfs',
    description: '批量并发下载多篇论文的 PDF 文件',
    inputSchema: {
      type: 'object',
      properties: {
        arxiv_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'arXiv ID 列表'
        },
        maxConcurrent: {
          type: 'number',
          description: '最大并发数',
          default: 5
        },
        maxRetries: {
          type: 'number',
          description: '最大重试次数',
          default: 3
        }
      },
      required: ['arxiv_ids']
    },
    handler: async (args) => await batchDownloadPdfsTool(args.arxiv_ids, args.maxConcurrent, args.maxRetries)
  },
  {
    name: 'batch_analyze_papers',
    description: '批量并发分析多篇论文，生成单篇深度分析并保存到数据库',
    inputSchema: {
      type: 'object',
      properties: {
        arxiv_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'arXiv ID 列表'
        },
        include_wechat: {
          type: 'boolean',
          description: '是否生成微信文章',
          default: true
        },
        maxConcurrent: {
          type: 'number',
          description: '最大并发数',
          default: 3
        },
        temperature: {
          type: 'number',
          description: 'AI 温度参数（0-1）',
          default: 0.3
        },
        skipExisting: {
          type: 'boolean',
          description: '跳过已有分析的论文',
          default: true
        }
      },
      required: ['arxiv_ids']
    },
    handler: async (args) => await batchAnalyzePapersTool(
      args.arxiv_ids,
      args.maxConcurrent,
      args.temperature,
      args.skipExisting
    )
  },
  {
    name: 'generate_unified_literature_review',
    description: '基于多篇论文的单篇分析，生成跨论文的综合文献综述',
    inputSchema: {
      type: 'object',
      properties: {
        arxiv_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'arXiv ID 列表'
        },
        topic: {
          type: 'string',
          description: '综述主题'
        },
        temperature: {
          type: 'number',
          description: 'AI 温度参数（0-1）',
          default: 0.4
        },
        focusArea: {
          type: 'string',
          description: '研究焦点领域'
        }
      },
      required: ['arxiv_ids']
    },
    handler: async (args) => await generateUnifiedLiteratureReview(
      args.arxiv_ids,
      args.temperature,
      args.focusArea
    )
  },

  // 多源搜索工具
  {
    name: 'search_academic_papers',
    description: '跨多个学术数据源搜索论文（DBLP、OpenReview、Papers With Code），返回 Notion 友好格式',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词'
        },
        max_results: {
          type: 'number',
          description: '最大结果数量',
          default: 10
        },
        sources: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['dblp', 'openreview', 'paperswithcode']
          },
          description: '数据源列表',
          default: ['dblp', 'openreview', 'paperswithcode']
        },
        export_to_notion: {
          type: 'boolean',
          description: '是否导出到 Notion',
          default: false
        },
        minQualityScore: {
          type: 'number',
          description: '最低质量评分（0-100）',
          default: 0
        }
      },
      required: ['query']
    },
    handler: async (args) => await searchAcademicPapers(
      args.query,
      args.max_results,
      args.sources,
      args.minQualityScore
    )
  },

  // 导出工具
  {
    name: 'export_to_notion_full',
    description: '导出完整的 Notion 元数据（论文库 + 单篇综述 + 综合综述）',
    inputSchema: {
      type: 'object',
      properties: {
        arxiv_id: {
          type: 'string',
          description: 'arXiv 论文ID'
        },
        database_id: {
          type: 'string',
          description: 'Notion 数据库 ID'
        }
      },
      required: ['arxiv_id', 'database_id']
    },
    handler: async (args) => await exportToNotionFullTool(args.arxiv_id, args.database_id)
  },
  {
    name: 'export_to_notion_update',
    description: '只导出增量内容的 Notion 元数据（需要提供已存在的论文列表）',
    inputSchema: {
      type: 'object',
      properties: {
        arxiv_id: {
          type: 'string',
          description: 'arXiv 论文ID'
        },
        page_id: {
          type: 'string',
          description: 'Notion 页面 ID'
        }
      },
      required: ['arxiv_id', 'page_id']
    },
    handler: async (args) => await exportToNotionUpdateTool(
      args.arxiv_id,
      args.page_id
    )
  },
  {
    name: 'export_individual_review_to_md',
    description: '将数据库中的单篇文献综述导出为 Markdown 文件',
    inputSchema: {
      type: 'object',
      properties: {
        arxiv_id: {
          type: 'string',
          description: 'arXiv 论文ID'
        }
      },
      required: ['arxiv_id']
    },
    handler: async (args) => await exportIndividualReviewToMd(args.arxiv_id)
  },
  {
    name: 'batch_export_individual_reviews',
    description: '批量导出所有有单篇综述的论文为 Markdown 文件',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    handler: async () => await batchExportIndividualReviews()
  },

  // 实用工具
  {
    name: 'clear_workdir',
    description: '清空工作区所有文件（危险操作）',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    handler: async () => await clearWorkdir()
  }
];

/**
 * 获取所有工具的元数据（用于 ListToolsRequestSchema）
 */
export function getAllToolsMetadata() {
  return TOOL_REGISTRY.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema
  }));
}

/**
 * 根据工具名称获取处理函数
 */
export function getToolHandler(toolName: string): ((args: any) => Promise<any>) | undefined {
  const tool = TOOL_REGISTRY.find(t => t.name === toolName);
  return tool?.handler;
}

