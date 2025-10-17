/**
 * 智能文本压缩模块
 * 用于处理超长论文文本，通过分段、分级压缩和滚动合并来适应 LLM 上下文限制
 */

import { encoding_for_model } from 'tiktoken';
import { LLMProvider } from './LLMProvider.js';

/**
 * 论文章节类型及其重要性权重
 */
export enum SectionType {
  ABSTRACT = 'abstract',           // 摘要 - 最重要
  INTRODUCTION = 'introduction',   // 引言 - 很重要
  METHOD = 'method',               // 方法 - 核心
  EXPERIMENT = 'experiment',       // 实验 - 重要
  RESULT = 'result',               // 结果 - 重要
  DISCUSSION = 'discussion',       // 讨论 - 中等
  CONCLUSION = 'conclusion',       // 结论 - 很重要
  RELATED_WORK = 'related_work',   // 相关工作 - 中等
  REFERENCE = 'reference',         // 参考文献 - 可丢弃
  APPENDIX = 'appendix',           // 附录 - 低优先级
  OTHER = 'other'                  // 其他 - 中等
}

/**
 * 章节重要性配置
 */
const SECTION_IMPORTANCE: Record<SectionType, number> = {
  [SectionType.ABSTRACT]: 1.0,      // 100% 保留
  [SectionType.INTRODUCTION]: 0.9,  // 90% 保留
  [SectionType.METHOD]: 1.0,        // 100% 保留
  [SectionType.EXPERIMENT]: 0.8,    // 80% 保留
  [SectionType.RESULT]: 0.8,        // 80% 保留
  [SectionType.DISCUSSION]: 0.6,    // 60% 保留
  [SectionType.CONCLUSION]: 0.9,    // 90% 保留
  [SectionType.RELATED_WORK]: 0.5,  // 50% 保留
  [SectionType.REFERENCE]: 0.0,     // 0% 保留（完全丢弃）
  [SectionType.APPENDIX]: 0.3,      // 30% 保留
  [SectionType.OTHER]: 0.7          // 70% 保留
};

/**
 * 论文章节
 */
export interface PaperSection {
  type: SectionType;
  title: string;
  content: string;
  startIndex: number;
  endIndex: number;
  tokens: number;
}

/**
 * 压缩选项
 */
export interface CompressionOptions {
  maxTokensPerChunk: number;      // 每个分块的最大 token 数
  targetCompressionRatio: number; // 目标压缩比（0-1）
  preserveStructure: boolean;     // 是否保留结构信息
}

/**
 * 精确计算文本的 token 数
 */
export function countTokens(text: string, model: string = 'gpt-4'): number {
  try {
    const encoding = encoding_for_model(model as any);
    const tokens = encoding.encode(text);
    const count = tokens.length;
    encoding.free();
    return count;
  } catch (error) {
    // 如果模型不支持，使用估算（1 token ≈ 4 字符）
    return Math.ceil(text.length / 4);
  }
}

/**
 * 识别论文章节
 */
export function identifySections(text: string): PaperSection[] {
  const sections: PaperSection[] = [];
  const lines = text.split('\n');
  
  // 常见章节标题模式
  const patterns: Array<{ type: SectionType; regex: RegExp }> = [
    { type: SectionType.ABSTRACT, regex: /^(abstract|摘要)/i },
    { type: SectionType.INTRODUCTION, regex: /^(\d+\.?\s*)?(introduction|引言)/i },
    { type: SectionType.METHOD, regex: /^(\d+\.?\s*)?(method|methodology|approach|方法)/i },
    { type: SectionType.EXPERIMENT, regex: /^(\d+\.?\s*)?(experiment|evaluation|实验|评估)/i },
    { type: SectionType.RESULT, regex: /^(\d+\.?\s*)?(result|findings|结果)/i },
    { type: SectionType.DISCUSSION, regex: /^(\d+\.?\s*)?(discussion|讨论)/i },
    { type: SectionType.CONCLUSION, regex: /^(\d+\.?\s*)?(conclusion|summary|结论|总结)/i },
    { type: SectionType.RELATED_WORK, regex: /^(\d+\.?\s*)?(related work|background|相关工作|背景)/i },
    { type: SectionType.REFERENCE, regex: /^(reference|bibliography|参考文献)/i },
    { type: SectionType.APPENDIX, regex: /^(appendix|附录)/i }
  ];
  
  let currentSection: PaperSection | null = null;
  let currentContent: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 检查是否是新章节标题
    let matchedType: SectionType | null = null;
    for (const pattern of patterns) {
      if (pattern.regex.test(line)) {
        matchedType = pattern.type;
        break;
      }
    }
    
    if (matchedType) {
      // 保存上一个章节
      if (currentSection) {
        currentSection.content = currentContent.join('\n');
        currentSection.endIndex = i - 1;
        currentSection.tokens = countTokens(currentSection.content);
        sections.push(currentSection);
      }
      
      // 开始新章节
      currentSection = {
        type: matchedType,
        title: line,
        content: '',
        startIndex: i,
        endIndex: i,
        tokens: 0
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }
  
  // 保存最后一个章节
  if (currentSection) {
    currentSection.content = currentContent.join('\n');
    currentSection.endIndex = lines.length - 1;
    currentSection.tokens = countTokens(currentSection.content);
    sections.push(currentSection);
  }
  
  // 如果没有识别到任何章节，将整个文本作为 OTHER
  if (sections.length === 0) {
    sections.push({
      type: SectionType.OTHER,
      title: 'Full Text',
      content: text,
      startIndex: 0,
      endIndex: lines.length - 1,
      tokens: countTokens(text)
    });
  }
  
  return sections;
}

/**
 * 根据重要性压缩单个章节
 */
async function compressSection(
  section: PaperSection,
  llm: LLMProvider,
  targetTokens: number
): Promise<string> {
  const importance = SECTION_IMPORTANCE[section.type];
  
  // 参考文献直接丢弃
  if (section.type === SectionType.REFERENCE) {
    return `[参考文献部分已省略]`;
  }
  
  // 如果已经小于目标长度，直接返回
  if (section.tokens <= targetTokens) {
    return section.content;
  }
  
  // 根据重要性计算压缩比
  const compressionRatio = Math.max(0.3, importance); // 最少保留 30%
  const targetLength = Math.floor(targetTokens * compressionRatio);
  
  // 调用 LLM 进行智能压缩
  const systemPrompt = `你是一个学术论文压缩专家。请压缩以下论文章节，保留最重要的信息。

**压缩要求**：
- 目标长度：约 ${targetLength} tokens
- 章节类型：${section.type}
- 重要性：${(importance * 100).toFixed(0)}%
- 保留核心观点、关键数据、重要结论
- 删除冗余描述、详细例子、次要细节
- 保持学术语言的准确性

**压缩策略**：
${section.type === SectionType.METHOD ? '- 保留核心算法、关键步骤、创新点' : ''}
${section.type === SectionType.EXPERIMENT ? '- 保留实验设置、主要结果、关键发现' : ''}
${section.type === SectionType.ABSTRACT || section.type === SectionType.CONCLUSION ? '- 尽可能保留原文，只删除最冗余的部分' : ''}
${section.type === SectionType.RELATED_WORK ? '- 只保留最相关的工作和对比' : ''}
${section.type === SectionType.APPENDIX ? '- 只保留最关键的补充信息' : ''}

输出压缩后的文本，不要添加任何解释或元信息。`;

  const userPrompt = `请压缩以下章节（${section.title}）：

${section.content}`;

  try {
    const response = await llm.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3
    });
    
    return response.content;
  } catch (error: any) {
    console.warn(`⚠️  章节压缩失败，使用简单截断: ${error.message}`);
    // 如果压缩失败，使用简单截断
    const ratio = targetLength / section.tokens;
    const truncatedLength = Math.floor(section.content.length * ratio);
    return section.content.substring(0, truncatedLength) + '\n[... 内容已截断 ...]';
  }
}

/**
 * 滚动压缩：逐步合并压缩结果
 */
export async function rollingCompression(
  sections: PaperSection[],
  llm: LLMProvider,
  maxTokensPerChunk: number
): Promise<string> {
  console.log(`\n🔄 开始滚动压缩 ${sections.length} 个章节...`);
  
  let accumulated = '';
  let accumulatedTokens = 0;
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const isLast = i === sections.length - 1;
    
    console.log(`  📄 处理章节 ${i + 1}/${sections.length}: ${section.title} (${section.tokens} tokens, 重要性: ${(SECTION_IMPORTANCE[section.type] * 100).toFixed(0)}%)`);
    
    // 参考文献直接跳过
    if (section.type === SectionType.REFERENCE) {
      console.log(`     ⏭️  跳过参考文献`);
      continue;
    }
    
    // 计算当前可用空间
    const availableTokens = maxTokensPerChunk - accumulatedTokens - 1000; // 留 1000 tokens 给 prompt
    
    if (availableTokens <= 0) {
      // 空间不足，先压缩已累积的内容
      console.log(`     🗜️  空间不足，压缩已累积内容 (${accumulatedTokens} tokens)...`);
      accumulated = await compressAccumulated(accumulated, llm, Math.floor(maxTokensPerChunk * 0.3));
      accumulatedTokens = countTokens(accumulated);
      console.log(`     ✅ 压缩完成，新长度: ${accumulatedTokens} tokens`);
    }
    
    // 处理当前章节
    let sectionContent: string;
    if (section.tokens > availableTokens) {
      // 章节太长，需要压缩
      console.log(`     🗜️  章节过长，压缩中...`);
      sectionContent = await compressSection(section, llm, availableTokens);
      const compressedTokens = countTokens(sectionContent);
      console.log(`     ✅ 压缩完成: ${section.tokens} → ${compressedTokens} tokens`);
    } else {
      sectionContent = section.content;
      console.log(`     ✅ 无需压缩，直接添加`);
    }
    
    // 添加到累积内容
    accumulated += `\n\n## ${section.title}\n\n${sectionContent}`;
    accumulatedTokens = countTokens(accumulated);
    
    // 如果是最后一个章节，不再压缩
    if (isLast) {
      console.log(`  ✅ 最后一个章节，保留完整累积内容 (${accumulatedTokens} tokens)`);
      break;
    }
  }
  
  console.log(`\n✅ 滚动压缩完成，最终长度: ${accumulatedTokens} tokens\n`);
  return accumulated;
}

/**
 * 压缩已累积的内容
 */
async function compressAccumulated(
  text: string,
  llm: LLMProvider,
  targetTokens: number
): Promise<string> {
  const systemPrompt = `你是一个学术论文压缩专家。请压缩以下已累积的论文内容，保留最核心的信息。

**压缩要求**：
- 目标长度：约 ${targetTokens} tokens
- 保留核心观点、关键方法、重要结论
- 删除冗余描述、重复信息、次要细节
- 保持逻辑连贯性和学术准确性

输出压缩后的文本，不要添加任何解释或元信息。`;

  const response = await llm.chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ],
    temperature: 0.3
  });
  
  return response.content;
}

