/**
 * 批量处理相关工具函数
 */

import { batchAnalyzePapers, batchAnalyzeFromDatabase, AnalyzeResult } from '../batch/analyze.js';
import { downloadArxivPdf } from '../core/arxiv.js';
import { storage } from '../storage/StorageManager.js';

/**
 * 批量并发下载多篇论文的 PDF 文件
 */
export async function batchDownloadPdfsTool(
  arxivIds: string[],
  maxConcurrent: number = 5,
  maxRetries: number = 3
): Promise<{
  success: number;
  failed: number;
  results: Array<{ arxivId: string; success: boolean; pdfPath?: string; error?: string }>;
}> {
  try {
    const results: Array<{ arxivId: string; success: boolean; pdfPath?: string; error?: string }> = [];
    let successCount = 0;
    let failedCount = 0;

    // 使用简单的并发控制
    for (let i = 0; i < arxivIds.length; i += maxConcurrent) {
      const batch = arxivIds.slice(i, i + maxConcurrent);
      const promises = batch.map(async (arxivId) => {
        try {
          const pdfPath = await downloadArxivPdf(arxivId);
          successCount++;
          return { arxivId, success: true, pdfPath };
        } catch (error: any) {
          failedCount++;
          return { arxivId, success: false, error: error.message };
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }

    return { success: successCount, failed: failedCount, results };
  } catch (error: any) {
    throw new Error(`批量下载失败: ${error.message}`);
  }
}

/**
 * 批量并发分析多篇论文
 */
export async function batchAnalyzePapersTool(
  arxivIds: string[],
  maxConcurrent: number = 3,
  temperature: number = 0.3,
  skipExisting: boolean = true
): Promise<{
  success: number;
  skipped: number;
  failed: number;
  results: AnalyzeResult[];
}> {
  try {
    const results = await batchAnalyzePapers(arxivIds, {
      maxConcurrent,
      temperature,
      skipExisting
    });

    // 统计结果
    const success = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const skipped = arxivIds.length - results.length;

    return {
      success,
      skipped,
      failed,
      results
    };
  } catch (error: any) {
    throw new Error(`批量分析失败: ${error.message}`);
  }
}

/**
 * 生成统一文献综述
 * 基于多篇论文的单篇综述，生成跨文献的综合综述
 */
export async function generateUnifiedLiteratureReview(
  arxivIds: string[],
  temperature: number = 0.4,
  focusArea?: string
): Promise<{
  reviewId: number;
  reviewPath: string;
  paperCount: number;
}> {
  try {
    const { createLLMProvider } = await import('../llm/LLMProvider.js');
    const path = await import('path');
    const fs = await import('fs');

    console.log(`\n🚀 开始生成跨文献综述...`);
    console.log(`   论文数量: ${arxivIds.length}`);
    console.log(`   聚焦领域: ${focusArea || '无'}`);
    console.log(`   温度参数: ${temperature}`);

    // 1. 获取所有论文的单篇综述
    const papers = arxivIds
      .map(id => storage.db.getPaperByArxivId(id))
      .filter((p): p is NonNullable<typeof p> => p !== null && p.individual_review !== null && p.individual_review !== undefined);

    if (papers.length === 0) {
      throw new Error('没有可用的单篇综述。请先运行 batch_analyze_papers 生成单篇综述');
    }

    if (papers.length < arxivIds.length) {
      const missing = arxivIds.length - papers.length;
      console.warn(`⚠️  ${missing} 篇论文没有单篇综述，将被跳过`);
    }

    console.log(`✅ 找到 ${papers.length} 篇论文的单篇综述`);

    // 2. 构造输入：拼接所有单篇综述
    const combinedReviews = papers.map((p, idx) => `
## 论文 ${idx + 1}: ${p.title}

**arXiv ID**: ${p.arxiv_id}
**发布日期**: ${p.publication_date || 'N/A'}
**会议/期刊**: ${p.venue || 'N/A'}
**引用数**: ${p.citation_count || 0}

### 单篇综述

${p.individual_review}
`).join('\n\n---\n\n');

    // 3. 调用 LLM 生成跨文献综述
    console.log(`🤖 调用 LLM 生成跨文献综述...`);

    const systemPrompt = `你是一位资深学术研究者，专门负责撰写高质量、深度详尽的文献综述。你的综述应该达到研究生论文级别的学术严谨性和深度。

**任务**：基于多篇论文的单篇深度分析，生成一篇全面、深入的跨文献综合综述。

**核心要求**：
1. **严格基于论文内容**：所有分析、对比、结论必须来自提供的单篇综述内容，不得添加论文中未提及的信息
2. **深度而非广度**：对每个关键点进行深入分析，而非浅尝辄止的罗列
3. **横向对比分析**：详细对比不同论文的方法、假设、实验设计、结果，找出异同点和内在联系
4. **纵向趋势分析**：识别研究领域的发展脉络、演进路径、范式转变
5. **批判性思考**：指出领域内的共识、争议、矛盾、未解决问题，提供深刻见解
6. **知识整合**：构建论文之间的关联网络，形成连贯的知识体系
7. **学术严谨性**：使用准确的学术术语，保持客观中立，避免主观臆测

**分析框架**（每个章节都要详细展开）：

### 1. 研究领域概述（≥500字）
- 领域定义与核心问题
- 研究背景与发展历程
- 当前研究现状与挑战
- 这些论文在领域中的定位

### 2. 研究动机与问题对比（≥600字）
- 各论文的研究动机对比
- 各论文试图解决的核心问题
- 问题之间的关联与差异
- 问题演进的逻辑关系

### 3. 方法论深度对比（≥800字）
- 详细对比各论文的方法论框架
- 分析方法的理论基础与假设
- 对比实现细节与技术路线
- 评估方法的优势、局限、适用场景
- 识别方法之间的继承、改进、创新关系

### 4. 实验设计与结果分析（≥700字）
- 对比实验设置（数据集、基线、评估指标）
- 详细分析实验结果的异同
- 识别结果中的规律、趋势、反常现象
- 评估结果的可靠性与泛化性
- 分析结果对理论假设的支持或挑战

### 5. 创新点深度剖析（≥600字）
- 归纳各论文的主要创新点
- 分析创新点的理论意义与实践价值
- 对比创新点之间的关系（互补、竞争、递进）
- 评估创新点的突破性与影响力

### 6. 局限性与挑战综合分析（≥500字）
- 总结各论文自述的局限性
- 识别跨论文的共同局限
- 指出领域内的系统性挑战
- 分析局限性的根源（理论、方法、数据、计算）

### 7. 未来研究方向（≥600字）
- 基于各论文提出的 future work 进行整合
- 识别未解决的关键问题
- 提出综合性的研究方向
- 分析不同方向的可行性与优先级
- 预测领域的发展趋势

### 8. 批判性讨论（≥400字）
- 指出领域内的争议点与矛盾
- 分析不同观点的合理性
- 提供深刻的批判性见解
- 讨论研究范式的潜在转变

**输出格式**：
- 使用 Markdown 格式
- 每个章节必须有清晰的标题（##）和子标题（###）
- 使用要点列表、表格、对比分析等结构化方式组织内容
- 总字数应≥4000字，确保深度和完整性
- 使用学术化的语言，避免口语化表达`;

    const userPrompt = `请基于以下 ${papers.length} 篇论文的单篇深度分析，生成一篇全面、深入的跨文献综述。
${focusArea ? `\n**聚焦领域**: ${focusArea}\n` : ''}

**重要提示**：
1. 每个章节都要详细展开，不要简单罗列
2. 进行深入的对比分析，而非表面的总结
3. 提供批判性见解，而非简单描述
4. 总字数应≥4000字，确保深度和完整性
5. 严格按照系统提示中的8个章节框架输出

---

${combinedReviews}

---

请严格按照系统提示中的分析框架，生成详细、深入、专业的跨文献综述。`;

    const llmInstance = createLLMProvider();
    const reviewContent = await llmInstance.chatWithCompression(
      userPrompt,
      systemPrompt,
      { temperature }
    );

    console.log(`✅ 跨文献综述生成完成`);

    // 4. 保存到数据库
    const title = focusArea || `文献综述_${papers.length}篇论文`;
    const reviewId = storage.db.insertReview({
      title,
      focus_area: focusArea,
      content: reviewContent,
      total_papers: papers.length,
      total_words: reviewContent.length
    });

    // 5. 关联论文
    papers.forEach(p => {
      if (p.id) {
        storage.db.linkReviewPaper(reviewId, p.id);
      }
    });

    console.log(`✅ 综述已保存到数据库 (ID: ${reviewId})`);

    // 6. 保存为文件
    const safeTitle = title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').substring(0, 50);
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${safeTitle}_跨文献综述_${timestamp}.md`;
    const reviewPath = path.join(storage.GENERATED_DIR, filename);

    // 添加文件头部信息
    const fileContent = `# ${title}

**生成时间**: ${new Date().toLocaleString('zh-CN')}
**论文数量**: ${papers.length}
**聚焦领域**: ${focusArea || '无'}

---

${reviewContent}

---

## 参考论文

${papers.map((p, idx) => `${idx + 1}. **${p.title}** (${p.arxiv_id}) - ${p.publication_date || 'N/A'}`).join('\n')}
`;

    fs.writeFileSync(reviewPath, fileContent, 'utf-8');
    console.log(`✅ 综述已保存为文件: ${filename}`);

    return {
      reviewId,
      reviewPath,
      paperCount: papers.length
    };
  } catch (error: any) {
    throw new Error(`生成综述失败: ${error.message}`);
  }
}

