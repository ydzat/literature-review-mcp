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
import { exportToNotionFullTool, exportToNotionUpdateTool } from './export-tools.js';
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
    name: 'search_arxiv',
    description: '搜索 arXiv 论文',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索英文关键词'
        },
        maxResults: {
          type: 'number',
          description: '最大结果数量',
          default: 5
        }
      },
      required: ['query']
    },
    handler: async (args) => await searchArxivPapers(args.query, args.maxResults)
  },
  {
    name: 'download_arxiv_pdf',
    description: '下载 arXiv PDF 文件',
    inputSchema: {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: 'arXiv 论文URL（如：http://arxiv.org/abs/2403.15137v1）或 arXiv ID（如：2403.15137v1），优先使用URL'
        }
      },
      required: ['input']
    },
    handler: async (args) => await downloadArxivPdfTool(args.input)
  },

  // 论文处理工具
  {
    name: 'parse_pdf_to_text',
    description: '解析 PDF 并返回原始文本内容',
    inputSchema: {
      type: 'object',
      properties: {
        arxivId: {
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
      required: ['arxivId']
    },
    handler: async (args) => await parsePdfToText(args.arxivId, args.paperInfo)
  },
  {
    name: 'parse_pdf_to_markdown',
    description: '解析 PDF 并返回 LLM 翻译后的中文 Markdown 文件',
    inputSchema: {
      type: 'object',
      properties: {
        arxivId: {
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
      required: ['arxivId']
    },
    handler: async (args) => await parsePdfToMarkdown(args.arxivId, args.paperInfo)
  },
  {
    name: 'convert_to_wechat_article',
    description: '转换为微信文章格式',
    inputSchema: {
      type: 'object',
      properties: {
        arxivId: {
          type: 'string',
          description: 'arXiv 论文ID'
        }
      },
      required: ['arxivId']
    },
    handler: async (args) => await convertToWechatArticle(args.arxivId)
  },
  {
    name: 'convert_to_academic_review_enhanced',
    description: '转换为增强版学术文献综述（包含博士思维分析和Mermaid可视化）',
    inputSchema: {
      type: 'object',
      properties: {
        arxivId: {
          type: 'string',
          description: 'arXiv 论文ID'
        }
      },
      required: ['arxivId']
    },
    handler: async (args) => await convertToAcademicReviewEnhanced(args.arxivId)
  },
  {
    name: 'process_arxiv_paper',
    description: '完整流程处理 arXiv 论文（搜索、下载、解析、转换）',
    inputSchema: {
      type: 'object',
      properties: {
        arxivId: {
          type: 'string',
          description: 'arXiv 论文ID'
        },
        includeWechat: {
          type: 'boolean',
          description: '是否生成微信文章',
          default: true
        }
      },
      required: ['arxivId']
    },
    handler: async (args) => await processArxivPaper(args.arxivId, args.includeWechat)
  },

  // 批量处理工具
  {
    name: 'batch_download_pdfs',
    description: '批量并发下载多篇论文的 PDF 文件',
    inputSchema: {
      type: 'object',
      properties: {
        paperIds: {
          type: 'array',
          items: { type: 'number' },
          description: '论文数据库 ID 列表'
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
      required: ['paperIds']
    },
    handler: async (args) => await batchDownloadPdfsTool(args.paperIds, args.maxConcurrent, args.maxRetries)
  },
  {
    name: 'batch_analyze_papers',
    description: '批量并发分析多篇论文，生成单篇深度分析并保存到数据库',
    inputSchema: {
      type: 'object',
      properties: {
        arxivIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'arXiv ID 列表'
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
      required: ['arxivIds']
    },
    handler: async (args) => await batchAnalyzePapersTool(
      args.arxivIds,
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
        paperIds: {
          type: 'array',
          items: { type: 'number' },
          description: '论文数据库 ID 列表'
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
      required: ['paperIds']
    },
    handler: async (args) => await generateUnifiedLiteratureReview(
      args.paperIds,
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
        maxResults: {
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
      args.maxResults,
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
        paperIds: {
          type: 'array',
          items: { type: 'number' },
          description: '论文数据库 ID 列表'
        },
        reviewId: {
          type: 'number',
          description: '综述 ID（可选）'
        }
      },
      required: ['paperIds']
    },
    handler: async (args) => await exportToNotionFullTool(args.paperIds, args.reviewId)
  },
  {
    name: 'export_to_notion_update',
    description: '只导出增量内容的 Notion 元数据（需要提供已存在的论文列表）',
    inputSchema: {
      type: 'object',
      properties: {
        paperIds: {
          type: 'array',
          items: { type: 'number' },
          description: '论文数据库 ID 列表'
        },
        existingArxivIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Notion 中已存在的 arXiv ID 列表'
        },
        reviewId: {
          type: 'number',
          description: '综述 ID（可选）'
        }
      },
      required: ['paperIds', 'existingArxivIds']
    },
    handler: async (args) => await exportToNotionUpdateTool(
      args.paperIds,
      args.existingArxivIds,
      args.reviewId
    )
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

