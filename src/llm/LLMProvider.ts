/**
 * LLM Provider - 统一的 LLM 调用接口
 * 支持 SiliconFlow、OpenAI 及其他兼容 OpenAI API 的服务
 */

import axios, { AxiosInstance } from 'axios';
import { LLMConfig, LLMRequest, LLMResponse, ModelInfo, KNOWN_MODELS, PROVIDER_DEFAULTS } from './types.js';

export class LLMProvider {
  private config: LLMConfig;
  private client: AxiosInstance;
  private modelInfo: ModelInfo | null = null;

  constructor(config: LLMConfig) {
    this.config = config;
    
    // 设置默认 baseUrl
    if (!this.config.baseUrl) {
      const defaults = PROVIDER_DEFAULTS[this.config.provider];
      if (defaults) {
        this.config.baseUrl = defaults.baseUrl;
      } else {
        throw new Error(`未知的 provider: ${this.config.provider}，请提供 baseUrl`);
      }
    }
    
    // 创建 axios 客户端
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 180000  // 3 分钟超时
    });
    
    // 获取模型信息
    this.modelInfo = this.getModelInfo();
  }

  /**
   * 获取模型信息
   */
  private getModelInfo(): ModelInfo | null {
    // 优先使用已知模型信息
    if (KNOWN_MODELS[this.config.model]) {
      return KNOWN_MODELS[this.config.model];
    }
    
    // 如果是未知模型，返回保守的默认值
    console.warn(`⚠️  未知模型: ${this.config.model}，使用默认配置`);
    return {
      name: this.config.model,
      maxContextTokens: 32768,  // 保守估计
      maxOutputTokens: 4096,    // 保守估计
    };
  }

  /**
   * 获取模型的最大输出 tokens
   */
  public getMaxOutputTokens(): number {
    // 优先使用用户配置
    if (this.config.maxTokens) {
      return this.config.maxTokens;
    }
    
    // 使用模型信息
    if (this.modelInfo) {
      return this.modelInfo.maxOutputTokens;
    }
    
    // 默认值
    return 4096;
  }

  /**
   * 获取模型的最大上下文 tokens
   */
  public getMaxContextTokens(): number {
    return this.modelInfo?.maxContextTokens || 32768;
  }

  /**
   * 调用 LLM
   */
  public async chat(request: LLMRequest): Promise<LLMResponse> {
    try {
      const maxTokens = request.maxTokens || this.getMaxOutputTokens();
      
      // 构建请求体
      const requestBody = {
        model: this.config.model,
        messages: request.messages,
        temperature: request.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: maxTokens,
        stream: request.stream ?? false
      };
      
      // 调用 API
      const response = await this.client.post('/chat/completions', requestBody);
      
      // 解析响应
      const content = response.data.choices[0].message.content;
      const usage = response.data.usage ? {
        promptTokens: response.data.usage.prompt_tokens,
        completionTokens: response.data.usage.completion_tokens,
        totalTokens: response.data.usage.total_tokens
      } : undefined;
      
      return { content, usage };
      
    } catch (error: any) {
      // 详细的错误信息
      const errorDetail = error.response?.data 
        ? JSON.stringify(error.response.data) 
        : error.message;
      throw new Error(`LLM 调用失败: ${errorDetail}`);
    }
  }

  /**
   * 估算文本的 token 数量（粗略估计）
   */
  public estimateTokens(text: string): number {
    // 简单估算：中文 ~1.5 字符/token，英文 ~4 字符/token
    // 这里使用保守估计：1 字符 = 1 token
    return text.length;
  }

  /**
   * 检查文本是否超过上下文限制
   */
  public isWithinContextLimit(text: string): boolean {
    const estimatedTokens = this.estimateTokens(text);
    const maxTokens = this.getMaxContextTokens();
    return estimatedTokens < maxTokens * 0.8;  // 留 20% 余量
  }

  /**
   * 截断文本以适应上下文限制
   */
  public truncateToContextLimit(text: string, reservedTokens: number = 1000): string {
    const maxTokens = this.getMaxContextTokens() - this.getMaxOutputTokens() - reservedTokens;
    const estimatedTokens = this.estimateTokens(text);
    
    if (estimatedTokens <= maxTokens) {
      return text;
    }
    
    // 简单截断（按字符数）
    const ratio = maxTokens / estimatedTokens;
    const truncatedLength = Math.floor(text.length * ratio);
    
    console.warn(`⚠️  文本过长，已截断: ${estimatedTokens} tokens → ${maxTokens} tokens`);
    return text.substring(0, truncatedLength) + '\n\n[... 文本已截断 ...]';
  }

  /**
   * 获取模型信息（供外部查询）
   */
  public getModelInfoForDisplay(): string {
    if (!this.modelInfo) {
      return `模型: ${this.config.model} (未知配置)`;
    }
    
    return `模型: ${this.modelInfo.name}
上下文窗口: ${this.modelInfo.maxContextTokens.toLocaleString()} tokens
最大输出: ${this.modelInfo.maxOutputTokens.toLocaleString()} tokens
${this.modelInfo.costPer1kInputTokens ? `成本: $${this.modelInfo.costPer1kInputTokens}/1K 输入, $${this.modelInfo.costPer1kOutputTokens}/1K 输出` : ''}`;
  }
}

/**
 * 从配置文件或环境变量创建 LLM Provider
 */
export function createLLMProvider(): LLMProvider {
  // 优先从环境变量读取
  const provider = (process.env.LLM_PROVIDER || 'siliconflow') as 'siliconflow' | 'openai' | 'custom';
  const apiKey = process.env.LLM_API_KEY || process.env.SILICONFLOW_API_KEY || '';
  const baseUrl = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL || PROVIDER_DEFAULTS[provider]?.defaultModel || 'Qwen/Qwen2.5-7B-Instruct';
  const maxTokens = process.env.LLM_MAX_TOKENS ? parseInt(process.env.LLM_MAX_TOKENS) : undefined;
  const temperature = process.env.LLM_TEMPERATURE ? parseFloat(process.env.LLM_TEMPERATURE) : undefined;
  
  if (!apiKey) {
    throw new Error('LLM API Key 未设置，请设置环境变量 LLM_API_KEY 或 SILICONFLOW_API_KEY');
  }
  
  const config: LLMConfig = {
    provider,
    apiKey,
    baseUrl,
    model,
    maxTokens,
    temperature
  };
  
  const llm = new LLMProvider(config);
  
  console.log('✅ LLM Provider 已初始化');
  console.log(`   Provider: ${provider}`);
  console.log(`   Model: ${model}`);
  console.log(`   Base URL: ${baseUrl || PROVIDER_DEFAULTS[provider]?.baseUrl || 'custom'}`);
  console.log(`   Max Output Tokens: ${llm.getMaxOutputTokens()}`);
  
  return llm;
}

