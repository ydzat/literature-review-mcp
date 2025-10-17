#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ArXivClient } from '@agentic/arxiv';
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { exec } from "child_process";
import { PdfReader } from "pdfreader";
import { storage } from './storage/StorageManager.js';

const execAsync = promisify(exec);

// SiliconFlow API配置
const SILICONFLOW_API_URL = "https://api.siliconflow.cn/v1/chat/completions";
const SILICONFLOW_API_KEY_ENV = process.env.SILICONFLOW_API_KEY;

if (!SILICONFLOW_API_KEY_ENV) {
  console.error("❌ 错误: 必须设置 SILICONFLOW_API_KEY 环境变量");
  console.error("您可以通过以下链接获取 API key: https://cloud.siliconflow.cn/i/TxUlXG3u");
  process.exit(1);
}

// 现在 SILICONFLOW_API_KEY 确保是 string 类型
const SILICONFLOW_API_KEY: string = SILICONFLOW_API_KEY_ENV;

// 初始化 ArXiv 客户端
const arxivClient = new ArXivClient({});

// 创建 MCP 服务器
const server = new Server(
  {
    name: "arxiv-mcp-server",
    version: "1.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 工具函数：搜索 arXiv 论文
async function searchArxivPapers(query: string, maxResults: number = 5): Promise<{totalResults: number, papers: any[]}> {
  try {
    // 1. 先检查缓存
    const cacheKey = `arxiv_search:${query}:${maxResults}`;
    const cached = storage.db.getCache(cacheKey);
    if (cached) {
      console.log('✅ 使用缓存的搜索结果');
      return cached;
    }

    // 2. 调用 arXiv API
    const results = await arxivClient.search({
      start: 0,
      searchQuery: {
        include: [
          { field: "all", value: query }
        ]
      },
      maxResults: maxResults
    });

    // 3. 保存论文到数据库并构建返回结果
    const papers = results.entries.map(entry => {
      const urlParts = entry.url.split('/');
      const arxivId = urlParts[urlParts.length - 1];
      const cleanArxivId = arxivId.replace(/v\d+$/, '');

      // 保存到数据库
      const paperData = {
        arxiv_id: cleanArxivId,
        title: entry.title.replace(/\s+/g, ' ').trim(),
        abstract: entry.summary.replace(/\s+/g, ' ').trim(),
        publication_date: entry.published,
        pdf_url: entry.url.replace('/abs/', '/pdf/') + '.pdf',
        source: 'arxiv'
      };

      const paperId = storage.db.insertOrUpdatePaper(paperData);

      // 保存作者并建立关联
      if (entry.authors && entry.authors.length > 0) {
        entry.authors.forEach((author: any, index: number) => {
          const authorName = author.name || author;
          const authorId = storage.db.getOrCreateAuthor({ name: authorName });
          storage.db.linkPaperAuthor(paperId, authorId, index + 1);
        });
      }

      return {
        id: arxivId,
        url: entry.url,
        title: entry.title.replace(/\s+/g, ' ').trim(),
        summary: entry.summary.replace(/\s+/g, ' ').trim(),
        published: entry.published,
        authors: entry.authors || []
      };
    });

    const result = {
      totalResults: results.totalResults,
      papers: papers
    };

    // 4. 缓存结果（1天）
    storage.db.setCache(cacheKey, result, 24 * 60 * 60);

    return result;
  } catch (error) {
    console.error("搜索 arXiv 论文时出错:", error);
    throw new Error(`搜索失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 工具函数：下载 arXiv PDF
async function downloadArxivPdf(input: string): Promise<string> {
  try {
    let arxivId: string;
    let pdfUrl: string;

    if (input.startsWith('http://') || input.startsWith('https://')) {
      const urlParts = input.split('/');
      arxivId = urlParts[urlParts.length - 1];
      pdfUrl = input.replace('/abs/', '/pdf/') + '.pdf';
    } else {
      arxivId = input;
      pdfUrl = `http://arxiv.org/pdf/${arxivId}.pdf`;
    }

    const cleanArxivId = arxivId.replace(/v\d+$/, '');
    const pdfPath = storage.getPdfPath(cleanArxivId);

    if (storage.pdfExists(cleanArxivId)) {
      console.log(`PDF 文件已存在: ${pdfPath}`);
      return pdfPath;
    }

    console.log(`正在下载 PDF: ${pdfUrl}`);

    const response = await axios({
      method: 'GET',
      url: pdfUrl,
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ArXiv-MCP-Server/1.0)'
      }
    });

    storage.savePdf(cleanArxivId, Buffer.from(response.data));
    console.log(`PDF 下载完成: ${pdfPath}`);

    // 🆕 更新数据库
    const paper = storage.db.getPaperByArxivId(cleanArxivId);
    if (paper) {
      storage.db.updatePaper(cleanArxivId, { pdf_path: pdfPath });
    } else {
      // 如果数据库中没有，创建基础记录
      storage.db.insertOrUpdatePaper({
        arxiv_id: cleanArxivId,
        title: `arXiv:${cleanArxivId}`,
        pdf_url: pdfUrl,
        pdf_path: pdfPath,
        source: 'arxiv'
      });
    }

    return pdfPath;
  } catch (error) {
    console.error("下载 PDF 时出错:", error);
    throw new Error(`下载失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 工具函数：使用 AI 模型
async function callSiliconFlowAPI(prompt: string, systemPrompt?: string, options?: { temperature?: number; top_p?: number }): Promise<string> {
  try {
    const messages: Array<{role: string, content: string}> = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const temperature = options?.temperature ?? 0.7;
    const top_p = options?.top_p ?? 0.7;

    const response = await axios.post(SILICONFLOW_API_URL, {
      model: "Qwen/Qwen3-8B", // 可选 deepseek-ai/DeepSeek-V3
      messages: messages,
      stream: false,
      max_tokens: 8192,
      temperature: temperature,
      top_p: top_p,
    }, {
      headers: {
        "Authorization": `Bearer ${SILICONFLOW_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("调用 SiliconFlow API 时出错:", error);
    throw new Error(`AI 调用失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function extractPdfText(pdfPath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const texts: string[] = [];
    new PdfReader().parseFileItems(pdfPath, (err, item) => {
      if (err) {
        console.error("PDF 解析失败:", err);
        reject(new Error("PDF 解析失败: " + err));
      } else if (!item) {
        // 解析结束，拼成一段文本
        let text = texts.join(' ').replace(/\s+/g, ' ').trim();
        if (text.length < 100) {
          reject(new Error("PDF 文本提取失败或内容过少"));
        } else {
          resolve(text);
        }
      } else if (item.text) {
        texts.push(item.text);
      }
    });
  });
}

// 工具函数：解析 PDF 并返回原始文本
async function parsePdfToText(pdfPath: string, arxivId: string, paperInfo?: any): Promise<string> {
  try {
    const cleanArxivId = arxivId.replace(/v\d+$/, '');
    const textPath = storage.getTextPath(cleanArxivId);

    const existingText = storage.readText(cleanArxivId);
    if (existingText) {
      console.log(`文本文件已存在: ${textPath}`);
      return existingText;
    }

    const pdfText = await extractPdfText(pdfPath);

    let outputContent = '';

    if (paperInfo) {
      outputContent += `=== 论文信息 ===\n`;
      outputContent += `标题: ${paperInfo.title}\n`;
      outputContent += `arXiv ID: ${arxivId}\n`;
      outputContent += `发布日期: ${paperInfo.published}\n`;

      if (paperInfo.authors && paperInfo.authors.length > 0) {
        outputContent += `作者: ${paperInfo.authors.map((author: any) => author.name || author).join(', ')}\n`;
      }

      outputContent += `摘要: ${paperInfo.summary}\n`;
      outputContent += `\n=== PDF 解析文本 ===\n\n`;
    }

    outputContent += pdfText;

    const savedTextPath = storage.saveText(cleanArxivId, outputContent);

    // 🆕 更新数据库
    const paper = storage.db.getPaperByArxivId(cleanArxivId);
    if (paper) {
      storage.db.updatePaper(cleanArxivId, { text_path: savedTextPath });
    } else {
      // 创建基础记录
      storage.db.insertOrUpdatePaper({
        arxiv_id: cleanArxivId,
        title: paperInfo?.title || `arXiv:${cleanArxivId}`,
        abstract: paperInfo?.summary,
        publication_date: paperInfo?.published,
        text_path: savedTextPath,
        source: 'arxiv'
      });
    }

    return outputContent;
  } catch (error) {
    console.error("解析 PDF 时出错:", error);
    throw new Error(`PDF 解析失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 工具函数：转换为微信文章
async function convertToWechatArticle(textContent: string, arxivId: string): Promise<string> {
  try {
    const cleanArxivId = arxivId.replace(/v\d+$/, '');
    // wechat文章保存到GENERATED_DIR
    const wechatPath = path.join(storage.GENERATED_DIR, `${cleanArxivId}_wechat.md`);

    if (fs.existsSync(wechatPath)) {
      return fs.readFileSync(wechatPath, 'utf-8');
    }

    const systemPrompt = `你是一个专业的微信公众号文章编辑。请将学术论文解读转换为适合微信公众号的文章格式。
要求：
1. 标题吸引人但不夸张
2. 增加适当的表情符号
3. 分段合理，便于手机阅读
4. 保持内容的专业性和准确性
5. 添加引人入胜的开头和总结
6. 使用微信公众号常见的排版风格`;

    const prompt = `请将以下论文解读内容转换为微信公众号文章格式：

${textContent}

请保持 Markdown 格式，但要适合微信公众号的阅读习惯，包括：
- 吸引人的标题
- 简洁的开头
- 清晰的分段
- 适当的表情符号
- 总结性的结尾`;

    const wechatContent = await callSiliconFlowAPI(prompt, systemPrompt);

    fs.writeFileSync(wechatPath, wechatContent, 'utf-8');

    // 🆕 更新数据库
    const paper = storage.db.getPaperByArxivId(cleanArxivId);
    if (paper) {
      storage.db.updatePaper(cleanArxivId, { wechat_path: wechatPath });
      console.log('✅ 微信文章路径已保存到数据库');
    }

    return wechatContent;
  } catch (error) {
    console.error("转换微信文章时出错:", error);
    throw new Error(`微信文章转换失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}


// 工具函数：增强版学术文献综述（博士思维 + Mermaid可视化）
async function convertToAcademicReviewEnhanced(textContent: string, arxivId: string): Promise<string> {
  try {
    const cleanArxivId = arxivId.replace(/v\d+$/, '');
    const reviewPath = path.join(storage.GENERATED_DIR, `${cleanArxivId}_review_enhanced.md`);

    if (fs.existsSync(reviewPath)) {
      return fs.readFileSync(reviewPath, 'utf-8');
    }

    // 系统提示：研究生/博士分析思维 + 可视化指导
    const systemPrompt = `你是一位资深科研工作者和学术编辑，擅长撰写科研论文综述。
请以研究生/博士的视角分析论文：
- 聚焦该论文内容，不扩展到其他文献（除非论文中明确提及）
- 分析研究背景、核心问题、方法、实验、结果和局限
- 对方法与实验提出批判性问题和潜在改进点
- 使用逻辑清晰的推理和分析，突出思考过程
- 尝试用 Mermaid 生成流程图或结构图展示方法、实验流程或研究结构
- 输出面向科研人员，风格正式、客观、分析性强
- 保持 Markdown 格式，段落清晰
- 生成时尽量低发散（temperature ≈ 0.3）`;

    const prompt = `请将以下论文解读内容转换为一篇专业的学术综述文（仅分析该论文内容）：
    
${textContent}

输出要求：
1. 摘要：概述研究主题、意义及关键问题
2. 背景与研究问题：分析论文提出的问题和研究动机
3. 方法与技术分析：
   - 详细解析方法原理和创新点
   - 提出研究思路中潜在问题或可改进之处
   - 尽量用 Mermaid 可视化方法流程或模型结构
4. 实验与结果讨论：
   - 分析实验设计合理性、数据可靠性、结果解释
   - 提出可能存在的实验局限或改进建议
   - 用 Mermaid 可视化实验流程或关键数据关系
5. 局限性与未来方向：批判性分析，给出改进思路或未来研究方向
6. 总结与展望：概述论文贡献及研究价值

请确保：
- 仅分析本文内容，不进行外部文献对比
- 从研究生/博士角度提出问题、疑问点和改进建议
- Markdown 格式清晰，段落分明
- 尽可能使用 Mermaid 可视化关键流程和结构`;

    // 调用模型，低发散
    const reviewContent = await callSiliconFlowAPI(prompt, systemPrompt, { temperature: 0.3 });

    fs.writeFileSync(reviewPath, reviewContent, 'utf-8');

    // 🆕 保存到数据库 reviews 表和 papers 表
    const paper = storage.db.getPaperByArxivId(cleanArxivId);
    if (paper) {
      // 保存综述记录
      storage.db.insertReview({
        title: `${paper.title} - 学术综述`,
        focus_area: 'single-paper-review',
        content: reviewContent,
        total_papers: 1,
        total_words: reviewContent.length,
        ai_generated_ratio: 1.0
      });
      // 更新论文的综述路径
      storage.db.updatePaper(cleanArxivId, { review_path: reviewPath });
      console.log('✅ 综述已保存到数据库');
    }

    return reviewContent;
  } catch (error) {
    console.error("转换增强版学术综述时出错:", error);
    throw new Error(`增强版文献综述转换失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}



























// 新增工具函数：解析 PDF 并返回 LLM 翻译后的中文 Markdown
async function parsePdfToMarkdown(pdfPath: string, arxivId: string, paperInfo?: any): Promise<string> {
  try {
    const cleanArxivId = arxivId.replace(/v\d+$/, '');
    const mdPath = path.join(storage.GENERATED_DIR, `${cleanArxivId}_md_zh.md`);

    if (fs.existsSync(mdPath)) {
      return fs.readFileSync(mdPath, 'utf-8');
    }

    // 先解析出 PDF 的英文文本
    const pdfText = await extractPdfText(pdfPath);

    // 构建系统提示
    let systemPrompt = `你是一名学术论文内容整理专家，请将英文学术论文内容翻译为**流畅的中文**，并输出为**学术风格的 Markdown**（标题、分段、引用、列表均保持Markdown格式，适合知识分享），请不要夸张修饰，保持专业准确`;

    let meta = '';
    if (paperInfo) {
      meta += `论文标题: ${paperInfo.title}\n`;
      meta += `arXiv ID: ${arxivId}\n`;
      meta += `作者: ${(paperInfo.authors || []).map((a: any) => a.name || a).join(', ')}\n`;
      meta += `摘要: ${paperInfo.summary}\n`;
      meta += `发布日期: ${paperInfo.published}\n\n`;
    }

    const prompt = `请将以下论文内容翻译为中文并输出为 Markdown：\n\n${meta}${pdfText}`;

    const markdown = await callSiliconFlowAPI(prompt, systemPrompt);

    fs.writeFileSync(mdPath, markdown, 'utf-8');

    // 🆕 更新数据库
    const paper = storage.db.getPaperByArxivId(cleanArxivId);
    if (paper) {
      storage.db.updatePaper(cleanArxivId, { markdown_path: mdPath });
    } else {
      // 创建基础记录
      storage.db.insertOrUpdatePaper({
        arxiv_id: cleanArxivId,
        title: paperInfo?.title || `arXiv:${cleanArxivId}`,
        abstract: paperInfo?.summary,
        publication_date: paperInfo?.published,
        markdown_path: mdPath,
        source: 'arxiv'
      });
    }

    return markdown;
  } catch (error) {
    console.error("PDF 转 Markdown 时出错:", error);
    throw new Error(`PDF 转 Markdown 失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 注册工具列表处理器
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_arxiv",
        description: "搜索 arXiv 论文",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "搜索英文关键词"
            },
            maxResults: {
              type: "number",
              description: "最大结果数量",
              default: 5
            }
          },
          required: ["query"]
        }
      },
      {
        name: "download_arxiv_pdf",
        description: "下载 arXiv PDF 文件",
        inputSchema: {
          type: "object",
          properties: {
            input: {
              type: "string",
              description: "arXiv 论文URL（如：http://arxiv.org/abs/2403.15137v1）或 arXiv ID（如：2403.15137v1），优先使用URL"
            }
          },
          required: ["input"]
        }
      },
      {
        name: "parse_pdf_to_text",
        description: "解析 PDF 并返回原始文本内容",
        inputSchema: {
          type: "object",
          properties: {
            arxivId: {
              type: "string",
              description: "arXiv 论文ID"
            },
            paperInfo: {
              type: "object",
              description: "论文信息（可选，用于添加论文元数据）",
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                published: { type: "string" },
                authors: { type: "array" }
              }
            }
          },
          required: ["arxivId"]
        }
      },
      {
        name: "convert_to_wechat_article",
        description: "转换为微信文章格式",
        inputSchema: {
          type: "object",
          properties: {
            arxivId: {
              type: "string",
              description: "arXiv 论文ID"
            }
          },
          required: ["arxivId"]
        }
      },
      {
        name: "parse_pdf_to_markdown",
        description: "解析 PDF 并返回 LLM 翻译后的中文 Markdown 文件",
        inputSchema: {
          type: "object",
          properties: {
            arxivId: {
              type: "string",
              description: "arXiv 论文ID"
            },
            paperInfo: {
              type: "object",
              description: "论文信息（可选，用于添加论文元数据）",
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                published: { type: "string" },
                authors: { type: "array" }
              }
            }
          },
          required: ["arxivId"]
        }
      },
      {
        name: "convert_to_academic_review_enhanced",
        description: "转换为增强版学术文献综述（包含博士思维分析和Mermaid可视化）",
        inputSchema: {
          type: "object",
          properties: {
            arxivId: {
              type: "string",
              description: "arXiv 论文ID"
            }
          },
          required: ["arxivId"]
        }
      },
      {
        name: "process_arxiv_paper",
        description: "完整流程处理 arXiv 论文（搜索、下载、解析、转换）",
        inputSchema: {
          type: "object",
          properties: {
            arxivId: {
              type: "string",
              description: "arXiv 论文ID"
            },
            includeWechat: {
              type: "boolean",
              description: "是否生成微信文章",
              default: true
            }
          },
          required: ["arxivId"]
        }
      },
      // 新增：清空工作区工具
      {
        name: "clear_workdir",
        description: "清空工作区所有文件（危险操作）",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      // 新增：多源学术搜索工具
      {
        name: "search_academic_papers",
        description: "跨多个学术数据源搜索论文（DBLP、OpenReview、Papers With Code），返回 Notion 友好格式",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "搜索关键词"
            },
            maxResults: {
              type: "number",
              description: "最大结果数量",
              default: 10
            },
            sources: {
              type: "array",
              items: {
                type: "string",
                enum: ["dblp", "openreview", "paperswithcode"]
              },
              description: "数据源列表",
              default: ["dblp", "openreview", "paperswithcode"]
            },
            minQualityScore: {
              type: "number",
              description: "最低质量评分（0-100）",
              default: 0
            }
          },
          required: ["query"]
        }
      },
      // 新增：批量下载 PDF
      {
        name: "batch_download_pdfs",
        description: "批量并发下载多篇论文的 PDF 文件",
        inputSchema: {
          type: "object",
          properties: {
            paperIds: {
              type: "array",
              items: { type: "number" },
              description: "论文数据库 ID 列表"
            },
            maxConcurrent: {
              type: "number",
              description: "最大并发数",
              default: 5
            },
            maxRetries: {
              type: "number",
              description: "最大重试次数",
              default: 3
            }
          },
          required: ["paperIds"]
        }
      },
      // 新增：批量分析论文
      {
        name: "batch_analyze_papers",
        description: "批量并发分析多篇论文，生成单篇深度分析并保存到数据库",
        inputSchema: {
          type: "object",
          properties: {
            arxivIds: {
              type: "array",
              items: { type: "string" },
              description: "arXiv ID 列表"
            },
            maxConcurrent: {
              type: "number",
              description: "最大并发数",
              default: 3
            },
            temperature: {
              type: "number",
              description: "AI 温度参数（0-1）",
              default: 0.3
            },
            skipExisting: {
              type: "boolean",
              description: "跳过已有分析的论文",
              default: true
            }
          },
          required: ["arxivIds"]
        }
      },
      // 新增：生成统一文献综述
      {
        name: "generate_unified_literature_review",
        description: "基于多篇论文的单篇分析，生成跨论文的综合文献综述",
        inputSchema: {
          type: "object",
          properties: {
            paperIds: {
              type: "array",
              items: { type: "number" },
              description: "论文数据库 ID 列表"
            },
            temperature: {
              type: "number",
              description: "AI 温度参数（0-1）",
              default: 0.4
            },
            focusArea: {
              type: "string",
              description: "研究焦点领域"
            }
          },
          required: ["paperIds"]
        }
      },
      // 新增：导出到 Notion (Full 模式)
      {
        name: "export_to_notion_full",
        description: "导出完整的 Notion 元数据（论文库 + 单篇综述 + 综合综述）",
        inputSchema: {
          type: "object",
          properties: {
            paperIds: {
              type: "array",
              items: { type: "number" },
              description: "论文数据库 ID 列表"
            },
            reviewId: {
              type: "number",
              description: "综述 ID（可选）"
            }
          },
          required: ["paperIds"]
        }
      },
      // 新增：导出到 Notion (Update 模式)
      {
        name: "export_to_notion_update",
        description: "只导出增量内容的 Notion 元数据（需要提供已存在的论文列表）",
        inputSchema: {
          type: "object",
          properties: {
            paperIds: {
              type: "array",
              items: { type: "number" },
              description: "论文数据库 ID 列表"
            },
            existingArxivIds: {
              type: "array",
              items: { type: "string" },
              description: "Notion 中已存在的 arXiv ID 列表"
            },
            reviewId: {
              type: "number",
              description: "综述 ID（可选）"
            }
          },
          required: ["paperIds", "existingArxivIds"]
        }
      }
    ]
  };
});

// 注册工具调用处理器
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_arxiv": {
        const { query, maxResults = 5 } = args as { query: string; maxResults?: number };
        const results = await searchArxivPapers(query, maxResults);

        return {
          content: [{
            type: "text",
            text: `找到 ${results.papers.length} 篇相关论文（总计 ${results.totalResults} 篇）：\n\n${results.papers.map((paper, index) =>
              `${index + 1}. **${paper.title}**\n   ID: ${paper.id}\n   发布日期: ${paper.published}\n   作者: ${paper.authors.map((author: any) => author.name || author).join(', ')}\n   摘要: ${paper.summary.substring(0, 300)}...\n   URL: ${paper.url}\n`
            ).join('\n')}`
          }]
        };
      }

      case "download_arxiv_pdf": {
        const { input } = args as { input: string };
        const pdfPath = await downloadArxivPdf(input);

        return {
          content: [{
            type: "text",
            text: `PDF 下载成功: ${pdfPath}`,
            file: path.basename(pdfPath) // 新增文件名
          }]
        };
      }

      case "parse_pdf_to_text": {
        const { arxivId, paperInfo } = args as { arxivId: string; paperInfo?: any };
        const cleanArxivId = arxivId.replace(/v\d+$/, '');
        // PDF应该从PDFS_DIR读取
        const pdfPath = storage.getPdfPath(cleanArxivId);

        if (!storage.pdfExists(cleanArxivId)) {
          throw new Error(`PDF 文件不存在，请先下载: ${pdfPath}`);
        }

        const extractedText = await parsePdfToText(pdfPath, arxivId, paperInfo);
        const textPath = storage.getTextPath(cleanArxivId);
        return {
          content: [{
            type: "text",
            text: extractedText,
            file: path.basename(textPath)
          }]
        };
      }

      case "convert_to_wechat_article": {
        const { arxivId } = args as { arxivId: string };
        const cleanArxivId = arxivId.replace(/v\d+$/, '');
        // 文本应该从TEXTS_DIR读取
        const textPath = storage.getTextPath(cleanArxivId);

        if (!storage.textExists(cleanArxivId)) {
          throw new Error(`文本文件不存在，请先解析 PDF: ${textPath}`);
        }

        const textContent = storage.readText(cleanArxivId)!;
        const wechatContent = await convertToWechatArticle(textContent, arxivId);
        // wechat文章保存到GENERATED_DIR
        const wechatPath = path.join(storage.GENERATED_DIR, `${cleanArxivId}_wechat.md`);

        return {
          content: [{
            type: "text",
            text: wechatContent,
            file: path.basename(wechatPath)
          }]
        };
      }

      // 新增 Markdown 工具分支
      case "parse_pdf_to_markdown": {
        const { arxivId, paperInfo } = args as { arxivId: string; paperInfo?: any };
        const cleanArxivId = arxivId.replace(/v\d+$/, '');
        // PDF应该从PDFS_DIR读取
        const pdfPath = storage.getPdfPath(cleanArxivId);

        if (!storage.pdfExists(cleanArxivId)) {
          throw new Error(`PDF 文件不存在，请先下载: ${pdfPath}`);
        }

        const markdown = await parsePdfToMarkdown(pdfPath, arxivId, paperInfo);
        const mdPath = path.join(storage.GENERATED_DIR, `${cleanArxivId}_md_zh.md`);

        return {
          content: [{
            type: "text",
            text: markdown,
            file: path.basename(mdPath)
          }]
        };
      }

      case "convert_to_academic_review_enhanced": {
        const { arxivId } = args as { arxivId: string };
        const cleanArxivId = arxivId.replace(/v\d+$/, '');
        // 文本应该从TEXTS_DIR读取
        const textPath = storage.getTextPath(cleanArxivId);

        if (!storage.textExists(cleanArxivId)) {
          throw new Error(`文本文件不存在，请先解析 PDF: ${textPath}`);
        }

        const textContent = storage.readText(cleanArxivId)!;
        const reviewContent = await convertToAcademicReviewEnhanced(textContent, arxivId);
        const reviewPath = path.join(storage.GENERATED_DIR, `${cleanArxivId}_review_enhanced.md`);

        return {
          content: [{
            type: "text",
            text: reviewContent,
            file: path.basename(reviewPath)
          }]
        };
      }

      case "process_arxiv_paper": {
        const { arxivId, includeWechat = true } = args as {
          arxivId: string;
          includeWechat?: boolean;
        };
        const results = [];
        let paperInfo = null;

        try {
          results.push("步骤 0: 获取论文信息...");
          const searchResults = await searchArxivPapers(arxivId, 1);
          if (searchResults.papers.length > 0) {
            paperInfo = searchResults.papers[0];
            results.push(`✅ 论文信息获取成功: ${paperInfo.title}`);
          }
        } catch (error) {
          results.push(`⚠️ 论文信息获取失败，将使用基础信息处理`);
        }

        results.push("步骤 1: 下载 PDF...");
        const pdfPath = await downloadArxivPdf(arxivId);
        results.push(`✅ PDF 下载完成: ${pdfPath}`);

        results.push("步骤 2: 解析 PDF 并提取文本内容...");
        const extractedText = await parsePdfToText(pdfPath, arxivId, paperInfo);
        const cleanArxivId = arxivId.replace(/v\d+$/, '');
        const textPath = storage.getTextPath(cleanArxivId);
        results.push(`✅ PDF 文本提取完成，文件: ${path.basename(textPath)}`);

        if (includeWechat) {
          results.push("步骤 3: 转换为微信文章格式...");
          await convertToWechatArticle(extractedText, arxivId);
          const wechatPath = path.join(storage.GENERATED_DIR, `${cleanArxivId}_wechat.md`);
          results.push(`✅ 微信文章生成完成，文件: ${path.basename(wechatPath)}`);
        }

        results.push(`\n🎉 论文 ${arxivId} 处理完成！`);
        results.push(`PDF 保存在: ${storage.PDFS_DIR}`);
        results.push(`文本保存在: ${storage.TEXTS_DIR}`);
        results.push(`生成文件保存在: ${storage.GENERATED_DIR}`);

        if (paperInfo) {
          results.push(`\n📄 论文信息：`);
          results.push(`标题: ${paperInfo.title}`);
          results.push(`作者: ${paperInfo.authors.map((author: any) => author.name || author).join(', ')}`);
          results.push(`发布时间: ${paperInfo.published}`);
        }

        return {
          content: [{
            type: "text",
            text: results.join('\n')
          }]
        };
      }

      // 新增：清空工作区所有文件
      case "clear_workdir": {
        const files = fs.readdirSync(storage.GENERATED_DIR).map(f => path.join(storage.GENERATED_DIR, f));
        const removed: string[] = [];
        for (const file of files) {
          try {
            if (fs.lstatSync(file).isFile()) {
              fs.unlinkSync(file);
              removed.push(path.basename(file));
            }
          } catch (err) {
            // ignore
          }
        }
        return {
          content: [{
            type: "text",
            text: `工作区清理完成，删除文件: ${removed.join(', ')}`,
            files: removed
          }]
        };
      }

      // 新增：多源学术搜索
      case "search_academic_papers": {
        const { searchWithNotionOutput } = await import('./sources/unified.js');
        const { query, maxResults = 10, sources, minQualityScore = 0 } = args as {
          query: string;
          maxResults?: number;
          sources?: string[];
          minQualityScore?: number;
        };

        const result = await searchWithNotionOutput({
          query,
          maxResults,
          sources: sources as any,
          minQualityScore
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      // 新增：批量下载 PDF
      case "batch_download_pdfs": {
        const { batchDownloadFromDatabase } = await import('./batch/download.js');
        const { paperIds, maxConcurrent, maxRetries } = args as {
          paperIds: number[];
          maxConcurrent?: number;
          maxRetries?: number;
        };

        const results = await batchDownloadFromDatabase(paperIds, {
          maxConcurrent,
          maxRetries
        });

        const summary = {
          total: results.length,
          success: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results: results
        };

        return {
          content: [{
            type: "text",
            text: JSON.stringify(summary, null, 2)
          }]
        };
      }

      // 新增：批量分析论文
      case "batch_analyze_papers": {
        const { batchAnalyzePapers } = await import('./batch/analyze.js');
        const { arxivIds, maxConcurrent, temperature, skipExisting } = args as {
          arxivIds: string[];
          maxConcurrent?: number;
          temperature?: number;
          skipExisting?: boolean;
        };

        const results = await batchAnalyzePapers(arxivIds, {
          maxConcurrent,
          temperature,
          skipExisting
        });

        const summary = {
          total: results.length,
          success: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results: results.map(r => ({
            arxivId: r.arxivId,
            success: r.success,
            error: r.error,
            reviewLength: r.reviewContent?.length
          }))
        };

        return {
          content: [{
            type: "text",
            text: JSON.stringify(summary, null, 2)
          }]
        };
      }

      // 新增：生成统一文献综述
      case "generate_unified_literature_review": {
        const { generateUnifiedLiteratureReview } = await import('./batch/unified-review.js');
        const { paperIds, temperature, focusArea } = args as {
          paperIds: number[];
          temperature?: number;
          focusArea?: string;
        };

        const result = await generateUnifiedLiteratureReview(paperIds, {
          temperature,
          focusArea
        });

        if (result.success) {
          return {
            content: [{
              type: "text",
              text: `✅ 统一文献综述已生成\n\n综述 ID: ${result.reviewId}\n字数: ${result.reviewContent?.length}\n\n${result.reviewContent}`
            }]
          };
        } else {
          return {
            content: [{
              type: "text",
              text: `❌ 综述生成失败: ${result.error}`
            }],
            isError: true
          };
        }
      }

      // 新增：导出到 Notion (Full 模式)
      case "export_to_notion_full": {
        const { exportToNotionFull } = await import('./notion/export.js');
        const { paperIds, reviewId } = args as {
          paperIds: number[];
          reviewId?: number;
        };

        const result = await exportToNotionFull(paperIds, reviewId);

        if (result.success) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                summary: result.summary,
                notion_metadata: result.notion_metadata
              }, null, 2)
            }]
          };
        } else {
          return {
            content: [{
              type: "text",
              text: `❌ 导出失败: ${result.error}`
            }],
            isError: true
          };
        }
      }

      // 新增：导出到 Notion (Update 模式)
      case "export_to_notion_update": {
        const { exportToNotionUpdate } = await import('./notion/export.js');
        const { paperIds, existingArxivIds, reviewId } = args as {
          paperIds: number[];
          existingArxivIds: string[];
          reviewId?: number;
        };

        const result = await exportToNotionUpdate(paperIds, existingArxivIds, reviewId);

        if (result.success) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                summary: result.summary,
                notion_metadata: result.notion_metadata
              }, null, 2)
            }]
          };
        } else {
          return {
            content: [{
              type: "text",
              text: `❌ 导出失败: ${result.error}`
            }],
            isError: true
          };
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `工具执行失败: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

// 启动服务器
console.log("启动 ArXiv MCP Server...");
console.log(`✅ 存储目录: ${storage.STORAGE_ROOT}`);

const transport = new StdioServerTransport();
await server.connect(transport);

console.log("🚀 ArXiv MCP Server 已启动，等待连接...");
