/**
 * 统一文献综述生成器
 * 基于多篇论文的单篇分析，生成跨论文的综合文献综述
 */

import { storage } from '../storage/StorageManager.js';
import { createLLMProvider, LLMProvider } from '../llm/LLMProvider.js';

// 延迟初始化 LLM Provider（在第一次使用时创建）
let llm: LLMProvider | null = null;
function getLLM(): LLMProvider {
  if (!llm) {
    llm = createLLMProvider();
  }
  return llm;
}

export interface UnifiedReviewOptions {
  temperature?: number;  // AI 温度参数，默认 0.4
  focusArea?: string;    // 研究焦点领域
  includeVisualization?: boolean;  // 是否包含 Mermaid 可视化，默认 true
}

export interface UnifiedReviewResult {
  success: boolean;
  reviewId?: number;
  reviewContent?: string;
  error?: string;
}

/**
 * 调用 AI 生成统一文献综述
 */
async function generateUnifiedReview(
  individualReviews: Array<{ arxivId: string; title: string; review: string }>,
  options: Required<UnifiedReviewOptions>
): Promise<string> {
  const systemPrompt = `你是一位资深的学术研究者，专门负责撰写高质量的文献综述。

**核心要求**：
1. **严格基于已有分析**：所有内容必须来自提供的单篇论文分析，不得添加未提及的内容
2. **综合而非堆砌**：找出论文之间的联系、对比、演进关系，而非简单罗列
3. **结构化组织**：按照研究主题、方法类别等维度组织内容
4. **客观中立**：基于事实进行对比分析，不做主观臆断

**输出结构**：
1. **研究背景与领域概述**
   - 该领域的核心问题是什么？
   - 为什么这些问题重要？
   - 现有研究的整体脉络

2. **主要方法对比分析**
   - 按方法类别分组（如：基于规则、基于学习、混合方法等）
   - 使用表格对比不同方法的特点、优势、局限
   - 分析方法之间的演进关系

3. **研究趋势与演进路径**
   - 时间维度：研究如何发展演变？
   - 技术维度：哪些技术路线在兴起？
   - 问题维度：研究焦点如何转移？

4. **研究空白与未来方向**
   - 当前研究的共同局限是什么？
   - 哪些问题尚未被充分解决？
   - 未来可能的研究方向

5. **知识图谱**（Mermaid 格式）
   - 展示研究主题、方法、论文之间的关系
   - 使用 flowchart 或 graph 类型

**输出格式**：Markdown，包含清晰的章节、表格、列表和 Mermaid 图表。`;

  // 构建输入内容
  const reviewsText = individualReviews.map((r, i) => {
    return `### 论文 ${i + 1}: ${r.title} (${r.arxivId})

${r.review}

---
`;
  }).join('\n');

  const userPrompt = `请基于以下 ${individualReviews.length} 篇论文的单篇分析，生成一份综合的文献综述。

${options.focusArea ? `**研究焦点领域**: ${options.focusArea}\n` : ''}

---
${reviewsText}
---

请严格按照系统提示中的输出结构，生成 Markdown 格式的综合文献综述。`;

  try {
    const totalInputLength = systemPrompt.length + userPrompt.length;
    console.log(`  🤖 调用 AI 生成统一综述（${individualReviews.length} 篇论文，输入长度: ${totalInputLength} 字符）...`);

    const response = await getLLM().chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: options.temperature
    });

    return response.content;
  } catch (error: any) {
    throw new Error(`AI 调用失败: ${error.message}`);
  }
}

/**
 * 生成统一文献综述
 */
export async function generateUnifiedLiteratureReview(
  paperIds: number[],
  options: UnifiedReviewOptions = {}
): Promise<UnifiedReviewResult> {
  const opts: Required<UnifiedReviewOptions> = {
    temperature: options.temperature || 0.4,
    focusArea: options.focusArea || '',
    includeVisualization: options.includeVisualization !== undefined ? options.includeVisualization : true
  };

  try {
    console.log(`\n📚 开始生成统一文献综述...`);
    console.log(`   论文数量: ${paperIds.length}`);
    console.log(`   温度参数: ${opts.temperature}`);
    if (opts.focusArea) {
      console.log(`   研究焦点: ${opts.focusArea}`);
    }

    // 1. 从数据库获取所有论文的单篇分析
    const individualReviews: Array<{ arxivId: string; title: string; review: string }> = [];
    const missingReviews: string[] = [];

    for (const id of paperIds) {
      const paper = storage.db.getPaperById(id);
      if (!paper) {
        console.warn(`⚠️  论文 ID ${id} 不存在`);
        continue;
      }

      if (!paper.individual_review) {
        missingReviews.push(paper.arxiv_id);
        console.warn(`⚠️  论文 ${paper.arxiv_id} 缺少单篇分析`);
        continue;
      }

      individualReviews.push({
        arxivId: paper.arxiv_id,
        title: paper.title,
        review: paper.individual_review
      });
    }

    if (individualReviews.length === 0) {
      throw new Error('没有可用的单篇分析，请先运行 batch_analyze_papers');
    }

    if (missingReviews.length > 0) {
      console.log(`\n⚠️  ${missingReviews.length} 篇论文缺少单篇分析，将被跳过:`);
      missingReviews.forEach(id => console.log(`   - ${id}`));
    }

    console.log(`\n✓ 找到 ${individualReviews.length} 篇论文的单篇分析`);

    // 2. 调用 AI 生成统一综述
    const reviewContent = await generateUnifiedReview(individualReviews, opts);

    // 3. 保存到数据库
    const reviewId = storage.db.insertReview({
      title: opts.focusArea || `文献综述 (${individualReviews.length} 篇论文)`,
      focus_area: opts.focusArea || 'general',
      content: reviewContent,
      total_papers: individualReviews.length,
      total_words: reviewContent.length,
      ai_generated_ratio: 1.0
    });

    // 4. 建立综述和论文的关联
    for (const id of paperIds) {
      const paper = storage.db.getPaperById(id);
      if (paper && paper.individual_review) {
        storage.db.linkReviewPaper(reviewId, id);
      }
    }

    console.log(`\n✅ 统一综述已生成并保存到数据库 (ID: ${reviewId})`);
    console.log(`   包含论文: ${individualReviews.length} 篇`);
    console.log(`   总字数: ${reviewContent.length}`);

    return {
      success: true,
      reviewId,
      reviewContent
    };

  } catch (error: any) {
    const errorMsg = error.message || String(error);
    console.error(`❌ 统一综述生成失败: ${errorMsg}`);
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * 根据搜索条件生成统一综述
 */
export async function generateReviewFromSearch(
  query: string,
  options: UnifiedReviewOptions = {}
): Promise<UnifiedReviewResult> {
  console.log(`\n🔍 根据搜索条件生成综述: "${query}"`);

  // 从数据库中搜索相关论文（简单的标题/摘要匹配）
  const allPapers = storage.db.getAllPapers();
  const relevantPapers = allPapers.filter((p: any) => {
    const searchText = `${p.title} ${p.abstract || ''}`.toLowerCase();
    return searchText.includes(query.toLowerCase());
  });

  if (relevantPapers.length === 0) {
    return {
      success: false,
      error: `未找到与 "${query}" 相关的论文`
    };
  }

  console.log(`✓ 找到 ${relevantPapers.length} 篇相关论文`);

  const paperIds = relevantPapers.map((p: any) => p.id!);
  return generateUnifiedLiteratureReview(paperIds, {
    ...options,
    focusArea: options.focusArea || query
  });
}

