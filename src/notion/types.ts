/**
 * Notion 输出格式类型定义
 * 用于生成 Notion 友好的结构化输出
 */

/**
 * Notion 数据库属性类型
 */
export type NotionPropertyType = 
  | 'title'
  | 'rich_text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'people'
  | 'files'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone_number'
  | 'formula'
  | 'relation'
  | 'rollup'
  | 'created_time'
  | 'created_by'
  | 'last_edited_time'
  | 'last_edited_by';

/**
 * Notion 数据库属性定义
 */
export interface NotionProperty {
  name: string;
  type: NotionPropertyType;
  options?: string[]; // 用于 select 和 multi_select
}

/**
 * Notion 数据库模式
 */
export interface NotionDatabaseSchema {
  title: string;
  description?: string;
  properties: NotionProperty[];
}

/**
 * Notion 数据库条目
 */
export interface NotionDatabaseEntry {
  properties: Record<string, any>;
  children?: NotionBlock[]; // 页面内容
}

/**
 * Notion 块类型
 */
export type NotionBlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bulleted_list_item'
  | 'numbered_list_item'
  | 'to_do'
  | 'toggle'
  | 'code'
  | 'quote'
  | 'callout'
  | 'divider'
  | 'table_of_contents';

/**
 * Notion 块
 */
export interface NotionBlock {
  type: NotionBlockType;
  content: string;
  children?: NotionBlock[];
  language?: string; // 用于 code 块
  checked?: boolean; // 用于 to_do 块
}

/**
 * Notion 页面属性
 */
export interface NotionPageProperties {
  title: string;
  icon?: string; // emoji
  cover?: string; // URL
  properties?: Record<string, any>;
}

/**
 * Notion 元数据（完整输出）
 */
export interface NotionMetadata {
  // 数据库相关
  databases?: {
    schema: NotionDatabaseSchema;
    entries: NotionDatabaseEntry[];
  }[];
  
  // 页面相关
  pages?: {
    properties: NotionPageProperties;
    blocks: NotionBlock[];
  }[];
  
  // 关系说明
  relationships?: {
    from: string; // 源数据库/页面
    to: string;   // 目标数据库/页面
    type: 'one-to-many' | 'many-to-many';
    description: string;
  }[];
  
  // 使用说明
  instructions?: string;
}

/**
 * 工具输出（包含 Notion 元数据）
 */
export interface ToolOutputWithNotion<T = any> {
  // 原始数据
  data: T;
  
  // Notion 元数据
  notion_metadata: NotionMetadata;
  
  // 摘要
  summary?: string;
}

