/**
 * 批量并发分析论文
 */

import * as fs from 'fs';
import { storage } from '../storage/StorageManager.js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createLLMProvider, LLMProvider } from '../llm/LLMProvider.js';
import { countTokens, identifySections, rollingCompression } from '../llm/smart-compression.js';

// 延迟初始化 LLM Provider（在第一次使用时创建）
let llm: LLMProvider | null = null;
function getLLM(): LLMProvider {
  if (!llm) {
    llm = createLLMProvider();
  }
  return llm;
}

export interface AnalyzeResult {
  arxivId: string;
  success: boolean;
  reviewContent?: string;
  error?: string;
}

export interface AnalyzeOptions {
  maxConcurrent?: number;  // 最大并发数，默认 3（AI 调用较慢）
  temperature?: number;    // AI 温度参数，默认 0.3
  skipExisting?: boolean;  // 跳过已有分析的论文，默认 true
}

/**
 * 提取 PDF 文本
 */
async function extractPdfText(pdfPath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(pdfPath);
  const uint8Array = new Uint8Array(dataBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;

  const textParts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    textParts.push(pageText);
  }

  return textParts.join('\n\n');
}

/**
 * 调用 AI 生成单篇论文深度分析
 */
async function generateIndividualReview(
  textContent: string,
  arxivId: string,
  temperature: number = 0.3
): Promise<string> {
  const llmInstance = getLLM();

  // 1. 计算文本 token 数
  const totalTokens = countTokens(textContent);
  const maxContextTokens = llmInstance.getMaxContextTokens();
  const maxOutputTokens = llmInstance.getMaxOutputTokens();
  const systemPromptTokens = 500; // 估算 system prompt 的 token 数
  const availableTokens = maxContextTokens - maxOutputTokens - systemPromptTokens - 1000; // 留 1000 安全余量

  console.log(`  📊 文本统计: ${totalTokens} tokens (上下文限制: ${maxContextTokens}, 可用: ${availableTokens})`);

  // 2. 如果文本过长，使用智能压缩
  let processedText = textContent;
  if (totalTokens > availableTokens) {
    console.log(`  🗜️  文本超长，启动智能压缩...`);

    // 识别章节
    const sections = identifySections(textContent);
    console.log(`  📑 识别到 ${sections.length} 个章节`);

    // 滚动压缩
    processedText = await rollingCompression(sections, llmInstance, availableTokens);

    const compressedTokens = countTokens(processedText);
    console.log(`  ✅ 压缩完成: ${totalTokens} → ${compressedTokens} tokens (压缩率: ${((1 - compressedTokens / totalTokens) * 100).toFixed(1)}%)`);
  }

  // 3. 生成分析
  const systemPrompt = `你是一位严谨的学术研究助手，专门负责对单篇论文进行深度分析。

**核心要求**：
1. **严格基于论文内容**：所有分析必须来自论文原文，不得添加论文中未提及的内容
2. **聚焦而非发散**：专注于论文本身的贡献，不要过度延伸到相关领域
3. **客观准确**：使用低温度参数，确保分析的准确性和可重复性
4. **结构化输出**：按照指定格式组织内容

**分析框架**：
- 研究背景与动机（论文为什么要做这个研究？）
- 核心方法论（论文提出了什么方法？如何实现？）
- 实验设计与结果（如何验证？结果如何？）
- 主要创新点（相比已有工作的突破在哪里？）
- 局限性与不足（论文自身承认或明显的局限）
- 未来研究方向（论文中提到的 future work）

**输出格式**：Markdown，包含清晰的章节标题和要点列表。`;

  const userPrompt = `请对以下论文进行深度分析（arXiv ID: ${arxivId}）：

---
${processedText}
---

请严格按照系统提示中的分析框架输出 Markdown 格式的分析报告。`;

  try {
    const response = await llmInstance.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: temperature
    });

    return response.content;
  } catch (error: any) {
    throw new Error(`AI 调用失败: ${error.message}`);
  }
}

/**
 * 分析单篇论文
 */
async function analyzeSinglePaper(
  arxivId: string,
  options: Required<AnalyzeOptions>
): Promise<AnalyzeResult> {
  const cleanArxivId = arxivId.replace(/v\d+$/, '');

  try {
    // 检查是否已有分析
    if (options.skipExisting) {
      const paper = storage.db.getPaperByArxivId(cleanArxivId);
      if (paper?.individual_review) {
        console.log(`✅ 已有分析，跳过: ${cleanArxivId}`);
        return { arxivId: cleanArxivId, success: true, reviewContent: paper.individual_review };
      }
    }

    console.log(`🔍 开始分析论文: ${cleanArxivId}`);

    // 1. 检查 PDF 是否存在
    if (!storage.pdfExists(cleanArxivId)) {
      throw new Error('PDF 文件不存在，请先下载');
    }

    // 2. 提取文本（如果尚未提取）
    let textContent: string;
    if (storage.textExists(cleanArxivId)) {
      textContent = storage.readText(cleanArxivId)!;
      console.log(`  ✓ 使用已提取的文本`);
    } else {
      console.log(`  📄 提取 PDF 文本...`);
      const pdfPath = storage.getPdfPath(cleanArxivId);
      textContent = await extractPdfText(pdfPath);
      storage.saveText(cleanArxivId, textContent);
      
      // 更新数据库
      const textPath = storage.getTextPath(cleanArxivId);
      storage.db.updatePaper(cleanArxivId, { text_path: textPath });
      console.log(`  ✓ 文本已提取并保存`);
    }

    // 3. 调用 AI 生成分析
    console.log(`  🤖 调用 AI 生成深度分析...`);
    const reviewContent = await generateIndividualReview(textContent, cleanArxivId, options.temperature);

    // 4. 保存到数据库
    storage.db.updatePaper(cleanArxivId, { individual_review: reviewContent });
    console.log(`✅ 分析完成: ${cleanArxivId}`);

    return { arxivId: cleanArxivId, success: true, reviewContent };

  } catch (error: any) {
    const errorMsg = error.message || String(error);
    console.error(`❌ 分析失败: ${cleanArxivId} - ${errorMsg}`);
    return { arxivId: cleanArxivId, success: false, error: errorMsg };
  }
}

/**
 * 批量并发分析论文
 */
export async function batchAnalyzePapers(
  arxivIds: string[],
  options: AnalyzeOptions = {}
): Promise<AnalyzeResult[]> {
  const opts: Required<AnalyzeOptions> = {
    maxConcurrent: options.maxConcurrent || 3,
    temperature: options.temperature || 0.3,
    skipExisting: options.skipExisting !== undefined ? options.skipExisting : true
  };

  console.log(`\n🚀 开始批量分析 ${arxivIds.length} 篇论文...`);
  console.log(`   并发数: ${opts.maxConcurrent}, 温度: ${opts.temperature}, 跳过已有: ${opts.skipExisting}`);

  const results: AnalyzeResult[] = [];
  const queue = [...arxivIds];

  // 并发控制
  const workers: Promise<void>[] = [];
  for (let i = 0; i < opts.maxConcurrent; i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const arxivId = queue.shift();
          if (!arxivId) break;

          const result = await analyzeSinglePaper(arxivId, opts);
          results.push(result);
        }
      })()
    );
  }

  await Promise.all(workers);

  // 统计结果
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`\n📊 分析完成: 成功 ${successCount}/${arxivIds.length}, 失败 ${failCount}`);

  if (failCount > 0) {
    console.log('\n❌ 失败的论文:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.arxivId}: ${r.error}`);
    });
  }

  return results;
}

/**
 * 从数据库中获取论文 ID 列表并批量分析
 */
export async function batchAnalyzeFromDatabase(
  paperIds: number[],
  options: AnalyzeOptions = {}
): Promise<AnalyzeResult[]> {
  const arxivIds: string[] = [];

  for (const id of paperIds) {
    const paper = storage.db.getPaperById(id);
    if (paper) {
      arxivIds.push(paper.arxiv_id);
    } else {
      console.warn(`⚠️  论文 ID ${id} 不存在`);
    }
  }

  return batchAnalyzePapers(arxivIds, options);
}

