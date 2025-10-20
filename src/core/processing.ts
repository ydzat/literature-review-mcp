/**
 * 统一的论文处理模块
 * 包含 Markdown 转换、微信文章生成、学术综述等功能
 */

import * as fs from 'fs';
import * as path from 'path';
import { storage } from '../storage/StorageManager.js';
import { createLLMProvider, LLMProvider } from '../llm/LLMProvider.js';
import { extractPdfText } from './pdf.js';
import { cleanArxivId } from './arxiv.js';

// 延迟初始化 LLM Provider
let llm: LLMProvider | null = null;
function getLLM(): LLMProvider {
  if (!llm) {
    llm = createLLMProvider();
  }
  return llm;
}

/**
 * 处理选项
 */
export interface ProcessingOptions {
  /** 是否强制重新生成（忽略缓存） */
  forceRegenerate?: boolean;
  /** LLM 温度参数 */
  temperature?: number;
  /** 自定义系统提示 */
  systemPrompt?: string;
}

/**
 * Markdown 转换选项
 */
export interface MarkdownOptions extends ProcessingOptions {
  /** 是否包含论文元信息 */
  includeMeta?: boolean;
}

/**
 * 微信文章选项
 */
export interface WechatOptions extends ProcessingOptions {
  /** 是否添加表情符号 */
  useEmoji?: boolean;
}

/**
 * 学术综述选项
 */
export interface ReviewOptions extends ProcessingOptions {
  /** 是否包含 Mermaid 可视化 */
  includeMermaid?: boolean;
}

/**
 * 一站式处理选项
 */
export interface FullProcessingOptions {
  /** 是否生成微信文章 */
  includeWechat?: boolean;
  /** 是否生成学术综述 */
  includeReview?: boolean;
  /** 是否生成 Markdown */
  includeMarkdown?: boolean;
  /** 处理选项 */
  options?: ProcessingOptions;
}

/**
 * 处理结果
 */
export interface ProcessingResult {
  arxivId: string;
  steps: string[];
  files: {
    pdf?: string;
    text?: string;
    markdown?: string;
    wechat?: string;
    review?: string;
  };
  paperInfo?: any;
}

/**
 * 调用 LLM（内部辅助函数，带智能压缩）
 * 现在使用 LLMProvider 的 chatWithCompression 方法
 */
async function callLLM(
  prompt: string,
  systemPrompt?: string,
  options?: { temperature?: number }
): Promise<string> {
  const llmInstance = getLLM();
  return await llmInstance.chatWithCompression(prompt, systemPrompt, {
    temperature: options?.temperature
  });
}

/**
 * 转换 PDF 为中文 Markdown
 * 
 * @param pdfPath PDF 文件路径
 * @param arxivId arXiv ID
 * @param paperInfo 论文信息（可选）
 * @param options 转换选项
 * @returns Markdown 内容
 */
export async function convertToMarkdown(
  pdfPath: string,
  arxivId: string,
  paperInfo?: any,
  options: MarkdownOptions = {}
): Promise<string> {
  try {
    const cleanId = cleanArxivId(arxivId);
    const mdPath = path.join(storage.GENERATED_DIR, `${cleanId}_md_zh.md`);

    // 检查缓存
    if (!options.forceRegenerate && fs.existsSync(mdPath)) {
      console.log(`✓ Markdown 文件已存在: ${mdPath}`);
      return fs.readFileSync(mdPath, 'utf-8');
    }

    console.log(`📝 转换 PDF 为 Markdown: ${arxivId}`);

    // 提取 PDF 文本
    const pdfResult = await extractPdfText(pdfPath);
    const pdfText = pdfResult.text;

    // 构建系统提示
    const systemPrompt = options.systemPrompt || 
      `你是一名学术论文内容整理专家，请将英文学术论文内容翻译为**流畅的中文**，并输出为**学术风格的 Markdown**（标题、分段、引用、列表均保持Markdown格式，适合知识分享），请不要夸张修饰，保持专业准确`;

    // 构建论文元信息
    let meta = '';
    if (options.includeMeta !== false && paperInfo) {
      meta += `论文标题: ${paperInfo.title}\n`;
      meta += `arXiv ID: ${arxivId}\n`;

      // 安全处理 authors 数组
      if (paperInfo.authors && paperInfo.authors.length > 0) {
        const authorNames = paperInfo.authors
          .map((a: any) => {
            if (typeof a === 'string') return a;
            if (a && typeof a === 'object' && a.name) return a.name;
            return null;
          })
          .filter((name: any) => name !== null);

        if (authorNames.length > 0) {
          meta += `作者: ${authorNames.join(', ')}\n`;
        }
      }

      if (paperInfo.summary) {
        meta += `摘要: ${paperInfo.summary}\n`;
      }
      if (paperInfo.published) {
        meta += `发布日期: ${paperInfo.published}\n`;
      }
      meta += '\n';
    }

    const prompt = `请将以下论文内容翻译为中文并输出为 Markdown：\n\n${meta}${pdfText}`;

    // 调用 LLM
    const markdown = await callLLM(prompt, systemPrompt, { temperature: options.temperature });

    // 保存文件
    fs.writeFileSync(mdPath, markdown, 'utf-8');
    console.log(`✓ Markdown 已保存: ${mdPath}`);

    // 更新数据库
    const paper = storage.db.getPaperByArxivId(cleanId);
    if (paper) {
      storage.db.updatePaper(cleanId, { markdown_path: mdPath });
    } else {
      storage.db.insertOrUpdatePaper({
        arxiv_id: cleanId,
        title: paperInfo?.title || `arXiv:${cleanId}`,
        abstract: paperInfo?.summary,
        publication_date: paperInfo?.published,
        markdown_path: mdPath,
        source: 'arxiv'
      });
    }
    console.log(`✓ 数据库已更新`);

    return markdown;

  } catch (error) {
    console.error('PDF 转 Markdown 失败:', error);
    throw new Error(`PDF 转 Markdown 失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 转换为微信文章格式
 * 
 * @param textContent 文本内容
 * @param arxivId arXiv ID
 * @param options 转换选项
 * @returns 微信文章内容
 */
export async function convertToWechatArticle(
  textContent: string,
  arxivId: string,
  options: WechatOptions = {}
): Promise<string> {
  try {
    const cleanId = cleanArxivId(arxivId);
    const wechatPath = path.join(storage.GENERATED_DIR, `${cleanId}_wechat.md`);

    // 检查缓存
    if (!options.forceRegenerate && fs.existsSync(wechatPath)) {
      console.log(`✓ 微信文章已存在: ${wechatPath}`);
      return fs.readFileSync(wechatPath, 'utf-8');
    }

    console.log(`📱 生成微信文章: ${arxivId}`);

    // 构建系统提示
    const systemPrompt = options.systemPrompt ||
      `你是一个专业的微信公众号文章编辑。请将学术论文解读转换为适合微信公众号的文章格式。
要求：
1. 标题吸引人但不夸张
2. ${options.useEmoji !== false ? '增加适当的表情符号' : '不使用表情符号'}
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
${options.useEmoji !== false ? '- 适当的表情符号' : ''}
- 总结性的结尾`;

    // 调用 LLM
    const wechatContent = await callLLM(prompt, systemPrompt, { temperature: options.temperature });

    // 保存文件
    fs.writeFileSync(wechatPath, wechatContent, 'utf-8');
    console.log(`✓ 微信文章已保存: ${wechatPath}`);

    // 更新数据库
    const paper = storage.db.getPaperByArxivId(cleanId);
    if (paper) {
      storage.db.updatePaper(cleanId, { wechat_path: wechatPath });
      console.log(`✓ 数据库已更新`);
    }

    return wechatContent;

  } catch (error) {
    console.error("转换微信文章失败:", error);
    throw new Error(`微信文章转换失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 生成学术综述（增强版，包含批判性分析和可视化）
 *
 * @param textContent 文本内容
 * @param arxivId arXiv ID
 * @param options 综述选项
 * @returns 学术综述内容
 */
export async function generateAcademicReview(
  textContent: string,
  arxivId: string,
  options: ReviewOptions = {}
): Promise<string> {
  try {
    const cleanId = cleanArxivId(arxivId);
    const reviewPath = path.join(storage.GENERATED_DIR, `${cleanId}_review_enhanced.md`);

    // 检查缓存
    if (!options.forceRegenerate && fs.existsSync(reviewPath)) {
      console.log(`✓ 学术综述已存在: ${reviewPath}`);
      return fs.readFileSync(reviewPath, 'utf-8');
    }

    console.log(`📚 生成学术综述: ${arxivId}`);

    // 构建系统提示
    const systemPrompt = options.systemPrompt ||
      `你是一位资深科研工作者和学术编辑，擅长撰写科研论文综述。
请以研究生/博士的视角分析论文：
- 聚焦该论文内容，不扩展到其他文献（除非论文中明确提及）
- 分析研究背景、核心问题、方法、实验、结果和局限
- 对方法与实验提出批判性问题和潜在改进点
- 使用逻辑清晰的推理和分析，突出思考过程
${options.includeMermaid !== false ? '- 尝试用 Mermaid 生成流程图或结构图展示方法、实验流程或研究结构' : ''}
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
${options.includeMermaid !== false ? '   - 尽量用 Mermaid 可视化方法流程或模型结构' : ''}
4. 实验与结果讨论：
   - 分析实验设计合理性、数据可靠性、结果解释
   - 提出可能存在的实验局限或改进建议
${options.includeMermaid !== false ? '   - 用 Mermaid 可视化实验流程或关键数据关系' : ''}
5. 局限性与未来方向：批判性分析，给出改进思路或未来研究方向
6. 总结与展望：概述论文贡献及研究价值

请确保：
- 仅分析本文内容，不进行外部文献对比
- 从研究生/博士角度提出问题、疑问点和改进建议
- Markdown 格式清晰，段落分明
${options.includeMermaid !== false ? '- 尽可能使用 Mermaid 可视化关键流程和结构' : ''}`;

    // 调用 LLM（低温度以减少发散）
    const reviewContent = await callLLM(
      prompt,
      systemPrompt,
      { temperature: options.temperature ?? 0.3 }
    );

    // 保存文件
    fs.writeFileSync(reviewPath, reviewContent, 'utf-8');
    console.log(`✓ 学术综述已保存: ${reviewPath}`);

    // 更新数据库（保存到 papers 表）
    const paper = storage.db.getPaperByArxivId(cleanId);
    if (paper) {
      storage.db.updatePaper(cleanId, { review_path: reviewPath });
      console.log(`✓ 数据库已更新`);
    }

    return reviewContent;

  } catch (error) {
    console.error("生成学术综述失败:", error);
    throw new Error(`学术综述生成失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 一站式处理 arXiv 论文
 * 包含下载、提取、转换等所有步骤
 *
 * @param arxivId arXiv ID
 * @param options 处理选项
 * @returns 处理结果
 */
export async function processArxivPaper(
  arxivId: string,
  options: FullProcessingOptions = {}
): Promise<ProcessingResult> {
  const { downloadArxivPdf, getArxivPaperInfo } = await import('./arxiv.js');
  const { extractAndSavePdfText } = await import('./pdf.js');

  const cleanId = cleanArxivId(arxivId);
  const steps: string[] = [];
  const files: ProcessingResult['files'] = {};
  let paperInfo: any = null;

  try {
    // 步骤 0: 获取论文信息
    steps.push("步骤 0: 获取论文信息...");
    try {
      paperInfo = await getArxivPaperInfo(arxivId);
      if (paperInfo) {
        steps.push(`✅ 论文信息获取成功: ${paperInfo.title}`);
      } else {
        steps.push(`⚠️  论文信息获取失败，将使用基础信息处理`);
      }
    } catch (error) {
      steps.push(`⚠️  论文信息获取失败，将使用基础信息处理`);
    }

    // 步骤 1: 下载 PDF
    steps.push("步骤 1: 下载 PDF...");
    const pdfPath = await downloadArxivPdf(arxivId);
    files.pdf = pdfPath;
    steps.push(`✅ PDF 下载完成: ${pdfPath}`);

    // 步骤 2: 提取文本
    steps.push("步骤 2: 解析 PDF 并提取文本内容...");
    const extractedText = await extractAndSavePdfText(cleanId, pdfPath, paperInfo);
    const textPath = storage.getTextPath(cleanId);
    files.text = textPath;
    steps.push(`✅ PDF 文本提取完成，文件: ${path.basename(textPath)}`);

    // 步骤 3: 生成 Markdown（可选）
    if (options.includeMarkdown) {
      steps.push("步骤 3: 转换为中文 Markdown...");
      await convertToMarkdown(pdfPath, arxivId, paperInfo, options.options);
      const mdPath = path.join(storage.GENERATED_DIR, `${cleanId}_md_zh.md`);
      files.markdown = mdPath;
      steps.push(`✅ Markdown 生成完成，文件: ${path.basename(mdPath)}`);
    }

    // 步骤 4: 生成微信文章（可选）
    if (options.includeWechat) {
      const stepNum = options.includeMarkdown ? 4 : 3;
      steps.push(`步骤 ${stepNum}: 转换为微信文章格式...`);
      await convertToWechatArticle(extractedText, arxivId, options.options);
      const wechatPath = path.join(storage.GENERATED_DIR, `${cleanId}_wechat.md`);
      files.wechat = wechatPath;
      steps.push(`✅ 微信文章生成完成，文件: ${path.basename(wechatPath)}`);
    }

    // 步骤 5: 生成学术综述（可选）
    if (options.includeReview) {
      const stepNum = (options.includeMarkdown ? 1 : 0) + (options.includeWechat ? 1 : 0) + 3;
      steps.push(`步骤 ${stepNum}: 生成学术综述...`);
      await generateAcademicReview(extractedText, arxivId, options.options);
      const reviewPath = path.join(storage.GENERATED_DIR, `${cleanId}_review_enhanced.md`);
      files.review = reviewPath;
      steps.push(`✅ 学术综述生成完成，文件: ${path.basename(reviewPath)}`);
    }

    // 完成
    steps.push(`\n🎉 论文 ${arxivId} 处理完成！`);
    steps.push(`PDF 保存在: ${storage.PDFS_DIR}`);
    steps.push(`文本保存在: ${storage.TEXTS_DIR}`);
    steps.push(`生成文件保存在: ${storage.GENERATED_DIR}`);

    if (paperInfo) {
      steps.push(`\n📄 论文信息：`);
      steps.push(`标题: ${paperInfo.title}`);
      steps.push(`作者: ${paperInfo.authors.map((author: any) => author.name || author).join(', ')}`);
      steps.push(`发布时间: ${paperInfo.published}`);
    }

    return {
      arxivId: cleanId,
      steps,
      files,
      paperInfo
    };

  } catch (error) {
    console.error('论文处理失败:', error);
    throw new Error(`论文处理失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

