/**
 * LLM Provider 类型定义
 */

export interface LLMConfig {
  provider: 'siliconflow' | 'openai' | 'custom';
  apiKey: string;
  baseUrl?: string;  // 自定义 API 端点
  model: string;
  maxTokens?: number;  // 如果不设置，会自动从 provider 获取
  temperature?: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ModelInfo {
  name: string;
  maxContextTokens: number;
  maxOutputTokens: number;
  costPer1kInputTokens?: number;
  costPer1kOutputTokens?: number;
}

/**
 * 预定义的模型信息
 */
export const KNOWN_MODELS: Record<string, ModelInfo> = {
  // SiliconFlow 模型
  'Qwen/Qwen2.5-7B-Instruct': {
    name: 'Qwen/Qwen2.5-7B-Instruct',
    maxContextTokens: 32768,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.0007,
    costPer1kOutputTokens: 0.0007
  },
  'Qwen/Qwen2.5-72B-Instruct': {
    name: 'Qwen/Qwen2.5-72B-Instruct',
    maxContextTokens: 131072,
    maxOutputTokens: 8192,
    costPer1kInputTokens: 0.0035,
    costPer1kOutputTokens: 0.0035
  },
  
  // OpenAI 模型
  'gpt-4o': {
    name: 'gpt-4o',
    maxContextTokens: 128000,
    maxOutputTokens: 16384,
    costPer1kInputTokens: 0.0025,
    costPer1kOutputTokens: 0.01
  },
  'gpt-4o-mini': {
    name: 'gpt-4o-mini',
    maxContextTokens: 128000,
    maxOutputTokens: 16384,
    costPer1kInputTokens: 0.00015,
    costPer1kOutputTokens: 0.0006
  },
  'gpt-4-turbo': {
    name: 'gpt-4-turbo',
    maxContextTokens: 128000,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.01,
    costPer1kOutputTokens: 0.03
  },
  'gpt-3.5-turbo': {
    name: 'gpt-3.5-turbo',
    maxContextTokens: 16385,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.0005,
    costPer1kOutputTokens: 0.0015
  },
  
  // Claude 模型（通过 OpenAI 兼容接口）
  'claude-3-5-sonnet-20241022': {
    name: 'claude-3-5-sonnet-20241022',
    maxContextTokens: 200000,
    maxOutputTokens: 8192,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015
  },
  'claude-3-opus-20240229': {
    name: 'claude-3-opus-20240229',
    maxContextTokens: 200000,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.015,
    costPer1kOutputTokens: 0.075
  },
  'claude-3-sonnet-20240229': {
    name: 'claude-3-sonnet-20240229',
    maxContextTokens: 200000,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015
  },
  'claude-3-haiku-20240307': {
    name: 'claude-3-haiku-20240307',
    maxContextTokens: 200000,
    maxOutputTokens: 4096,
    costPer1kInputTokens: 0.00025,
    costPer1kOutputTokens: 0.00125
  },

  // Deepseek 模型
  'deepseek-chat': {
    name: 'deepseek-chat',
    maxContextTokens: 131072,  // 128K
    maxOutputTokens: 8192,     // 默认 4K，最大 8K
    costPer1kInputTokens: 0.00014,
    costPer1kOutputTokens: 0.00028
  },
  'deepseek-reasoner': {
    name: 'deepseek-reasoner',
    maxContextTokens: 131072,  // 128K
    maxOutputTokens: 8192,     // 默认 4K，最大 8K
    costPer1kInputTokens: 0.00055,
    costPer1kOutputTokens: 0.0022
  }
};

/**
 * Provider 默认配置
 */
export const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; defaultModel: string }> = {
  siliconflow: {
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'Qwen/Qwen2.5-7B-Instruct'
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini'
  }
};

