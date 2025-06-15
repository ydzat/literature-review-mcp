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

const execAsync = promisify(exec);

// 工作目录设置 - 必须设置环境变量
const WORK_DIR_ENV = process.env.WORK_DIR;

// 检查 WORK_DIR 是否设置
if (!WORK_DIR_ENV) {
  console.error("❌ 错误: 必须设置 WORK_DIR 环境变量");
  console.error("请设置工作目录，例如:");
  console.error("  export WORK_DIR=/path/to/your/work/directory");
  console.error("  或者在运行时指定: WORK_DIR=/path/to/dir node server.js");
  process.exit(1);
}

// 现在 WORK_DIR 确保是 string 类型
const WORK_DIR: string = WORK_DIR_ENV;

// 确保工作目录存在
try {
  if (!fs.existsSync(WORK_DIR)) {
    fs.mkdirSync(WORK_DIR, { recursive: true });
    console.log(`✅ 工作目录已创建: ${WORK_DIR}`);
  } else {
    console.log(`✅ 使用工作目录: ${WORK_DIR}`);
  }
} catch (error) {
  console.error(`❌ 无法创建或访问工作目录 ${WORK_DIR}:`, error);
  console.error("请检查路径是否正确且有写入权限");
  process.exit(1);
}

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
    version: "1.1.6",
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
    const results = await arxivClient.search({
      start: 0,
      searchQuery: {
        include: [
          { field: "all", value: query }
        ]
      },
      maxResults: maxResults
    });

    const papers = results.entries.map(entry => {
      const urlParts = entry.url.split('/');
      const arxivId = urlParts[urlParts.length - 1];

      return {
        id: arxivId,
        url: entry.url,
        title: entry.title.replace(/\s+/g, ' ').trim(),
        summary: entry.summary.replace(/\s+/g, ' ').trim(),
        published: entry.published,
        authors: entry.authors || []
      };
    });

    return {
      totalResults: results.totalResults,
      papers: papers
    };
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
    const pdfPath = path.join(WORK_DIR, `${cleanArxivId}.pdf`);
    
    if (fs.existsSync(pdfPath)) {
      console.log(`PDF 文件已存在: ${pdfPath}`);
      return pdfPath;
    }

    console.log(`正在下载 PDF: ${pdfUrl}`);

    const response = await axios({
      method: 'GET',
      url: pdfUrl,
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ArXiv-MCP-Server/1.0)'
      }
    });

    const writer = fs.createWriteStream(pdfPath);
    response.data.pipe(writer);

    return new Promise<string>((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`PDF 下载完成: ${pdfPath}`);
        resolve(pdfPath);
      });
      writer.on('error', (error) => {
        console.error(`PDF 下载失败: ${error}`);
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath);
        }
        reject(error);
      });
    });
  } catch (error) {
    console.error("下载 PDF 时出错:", error);
    throw new Error(`下载失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 工具函数：使用 AI 模型
async function callSiliconFlowAPI(prompt: string, systemPrompt?: string): Promise<string> {
  try {
    const messages: Array<{role: string, content: string}> = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await axios.post(SILICONFLOW_API_URL, {
      model: "Qwen/Qwen3-8B", // 可选 deepseek-ai/DeepSeek-V3
      messages: messages,
      stream: false,
      max_tokens: 8192,
      temperature: 0.7,
      top_p: 0.7,
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
    const textPath = path.join(WORK_DIR, `${cleanArxivId}_text.txt`);

    if (fs.existsSync(textPath)) {
      console.log(`文本文件已存在: ${textPath}`);
      return fs.readFileSync(textPath, 'utf-8');
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

    fs.writeFileSync(textPath, outputContent, 'utf-8');
    console.log(`文本文件已保存: ${textPath}`);

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
    const wechatPath = path.join(WORK_DIR, `${cleanArxivId}_wechat.md`);

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

    return wechatContent;
  } catch (error) {
    console.error("转换微信文章时出错:", error);
    throw new Error(`微信文章转换失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 新增工具函数：解析 PDF 并返回 LLM 翻译后的中文 Markdown
async function parsePdfToMarkdown(pdfPath: string, arxivId: string, paperInfo?: any): Promise<string> {
  try {
    const cleanArxivId = arxivId.replace(/v\d+$/, '');
    const mdPath = path.join(WORK_DIR, `${cleanArxivId}_md_zh.md`);

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
        const pdfPath = path.join(WORK_DIR, `${cleanArxivId}.pdf`);

        if (!fs.existsSync(pdfPath)) {
          throw new Error(`PDF 文件不存在，请先下载: ${pdfPath}`);
        }

        const extractedText = await parsePdfToText(pdfPath, arxivId, paperInfo);
        const textPath = path.join(WORK_DIR, `${cleanArxivId}_text.txt`);
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
        const textPath = path.join(WORK_DIR, `${cleanArxivId}_text.txt`);

        if (!fs.existsSync(textPath)) {
          throw new Error(`文本文件不存在，请先解析 PDF: ${textPath}`);
        }

        const textContent = fs.readFileSync(textPath, 'utf-8');
        const wechatContent = await convertToWechatArticle(textContent, arxivId);
        const wechatPath = path.join(WORK_DIR, `${cleanArxivId}_wechat.md`);

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
        const pdfPath = path.join(WORK_DIR, `${cleanArxivId}.pdf`);

        if (!fs.existsSync(pdfPath)) {
          throw new Error(`PDF 文件不存在，请先下载: ${pdfPath}`);
        }

        const markdown = await parsePdfToMarkdown(pdfPath, arxivId, paperInfo);
        const mdPath = path.join(WORK_DIR, `${cleanArxivId}_md_zh.md`);

        return {
          content: [{
            type: "text",
            text: markdown,
            file: path.basename(mdPath)
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
        const textPath = path.join(WORK_DIR, `${arxivId.replace(/v\d+$/, '')}_text.txt`);
        results.push(`✅ PDF 文本提取完成，文件: ${path.basename(textPath)}`);

        if (includeWechat) {
          results.push("步骤 3: 转换为微信文章格式...");
          await convertToWechatArticle(extractedText, arxivId);
          const wechatPath = path.join(WORK_DIR, `${arxivId.replace(/v\d+$/, '')}_wechat.md`);
          results.push(`✅ 微信文章生成完成，文件: ${path.basename(wechatPath)}`);
        }

        results.push(`\n🎉 论文 ${arxivId} 处理完成！所有文件保存在: ${WORK_DIR}`);

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
        const files = fs.readdirSync(WORK_DIR).map(f => path.join(WORK_DIR, f));
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
console.log(`✅ 工作目录已设置: ${WORK_DIR}`);

const transport = new StdioServerTransport();
await server.connect(transport);

console.log("🚀 ArXiv MCP Server 已启动，等待连接...");
