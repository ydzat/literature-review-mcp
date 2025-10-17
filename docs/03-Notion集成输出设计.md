# Notion 集成输出设计
## 让文献综述和知识自动组织到 Notion 知识库

---

## 🎯 设计目标

让 Agent 能够轻松地将本工具的输出转换为 Notion 页面和数据库，无需本工具直接调用 Notion API。

**核心原则**:
1. **结构化输出**: 提供清晰的层级结构，方便 Agent 创建 Notion 页面
2. **元数据丰富**: 提供足够的元数据，方便创建 Notion 数据库
3. **Markdown 兼容**: 使用 Notion 支持的 Markdown 格式
4. **关系明确**: 明确标注论文间的引用关系，方便创建 Notion 关联

---

## 📊 Notion 知识库结构设计

### 推荐的 Notion 结构

```
📚 文献综述知识库 (Workspace)
├── 📄 综述文档 (Pages)
│   ├── [综述标题] - 2025-01-15
│   ├── [综述标题] - 2025-01-10
│   └── ...
│
├── 📊 论文数据库 (Database)
│   ├── 标题 (Title)
│   ├── 作者 (Multi-select)
│   ├── 年份 (Number)
│   ├── 来源 (Select: arXiv, DBLP, etc.)
│   ├── 引用数 (Number)
│   ├── 质量评分 (Number)
│   ├── 作者声誉 (Number)
│   ├── 机构 (Multi-select)
│   ├── 标签 (Multi-select)
│   ├── 状态 (Select: 待读, 已读, 已引用)
│   ├── arXiv ID (Text)
│   ├── PDF 链接 (URL)
│   └── 相关综述 (Relation)
│
├── 👥 作者数据库 (Database)
│   ├── 姓名 (Title)
│   ├── h-index (Number)
│   ├── 总引用数 (Number)
│   ├── 机构 (Select)
│   ├── 研究领域 (Multi-select)
│   ├── 代表作 (Relation to 论文数据库)
│   └── 是否知名学者 (Checkbox)
│
└── 🏛️ 机构数据库 (Database)
    ├── 名称 (Title)
    ├── 等级 (Select: top-tier, tier-1, tier-2)
    ├── 评分 (Number)
    └── 相关论文 (Relation to 论文数据库)
```

---

## 🔧 工具输出格式设计

### 1. 论文搜索结果输出

**当前输出** (简单列表):
```json
{
  "papers": [
    {"title": "...", "authors": [...], "year": 2024}
  ]
}
```

**Notion 友好输出** (结构化 + 元数据):
```json
{
  "papers": [...],
  "notion_metadata": {
    "database_schema": {
      "title": "论文数据库",
      "properties": {
        "标题": {"type": "title"},
        "作者": {"type": "multi_select", "options": ["Author1", "Author2"]},
        "年份": {"type": "number"},
        "来源": {"type": "select", "options": ["arXiv", "DBLP", "OpenReview"]},
        "引用数": {"type": "number"},
        "质量评分": {"type": "number"},
        "作者声誉": {"type": "number"},
        "机构": {"type": "multi_select", "options": ["MIT", "Stanford"]},
        "标签": {"type": "multi_select", "options": ["Deep Learning", "NLP"]},
        "arXiv ID": {"type": "rich_text"},
        "PDF 链接": {"type": "url"},
        "状态": {"type": "select", "options": ["待读", "已读", "已引用"]}
      }
    },
    "database_entries": [
      {
        "标题": "Attention is All You Need",
        "作者": ["Vaswani", "Shazeer"],
        "年份": 2017,
        "来源": "arXiv",
        "引用数": 50000,
        "质量评分": 95,
        "作者声誉": 85,
        "机构": ["Google Brain"],
        "标签": ["Transformer", "Attention", "NLP"],
        "arXiv ID": "1706.03762",
        "PDF 链接": "https://arxiv.org/pdf/1706.03762.pdf",
        "状态": "待读"
      }
    ]
  }
}
```

### 2. 文献综述输出

**当前输出** (纯 Markdown):
```markdown
# 文献综述

## 引言
...

## 相关工作
...
```

**Notion 友好输出** (结构化 Markdown + 元数据):
```json
{
  "review": {
    "title": "Transformer 架构演进综述",
    "created_date": "2025-01-15",
    "focus_area": "Transformer Architecture",
    "total_papers": 15,
    "date_range": [2017, 2025],
    
    "content": {
      "type": "notion_blocks",
      "blocks": [
        {
          "type": "heading_1",
          "text": "文献综述：Transformer 架构演进"
        },
        {
          "type": "callout",
          "emoji": "📊",
          "text": "本综述涵盖 15 篇论文，时间跨度 2017-2025 年"
        },
        {
          "type": "heading_2",
          "text": "1. 引言"
        },
        {
          "type": "paragraph",
          "text": "Transformer 架构自 2017 年提出以来..."
        },
        {
          "type": "heading_2",
          "text": "2. 核心论文分析"
        },
        {
          "type": "heading_3",
          "text": "2.1 原始 Transformer (2017)"
        },
        {
          "type": "paragraph",
          "text": "Vaswani et al. 提出了 Transformer 架构 [1]..."
        },
        {
          "type": "callout",
          "emoji": "📄",
          "text": "论文: Attention is All You Need | 引用数: 50000 | 质量评分: 95/100"
        },
        {
          "type": "divider"
        }
      ]
    },
    
    "references": [
      {
        "id": 1,
        "title": "Attention is All You Need",
        "authors": ["Vaswani", "Shazeer", "..."],
        "year": 2017,
        "arxiv_id": "1706.03762",
        "citation_count": 50000,
        "quality_score": 95,
        "notion_page_id": null  // Agent 创建后填充
      }
    ],
    
    "source_mapping": {
      "section_2_1": {
        "source_papers": ["1706.03762"],
        "confidence": 0.95
      }
    },
    
    "statistics": {
      "total_words": 3500,
      "ai_generated_ratio": 0.25,
      "average_citations_per_paper": 15000,
      "top_authors": ["Vaswani", "Devlin", "Brown"],
      "top_institutions": ["Google Brain", "OpenAI", "DeepMind"]
    }
  },
  
  "notion_metadata": {
    "page_properties": {
      "标题": "Transformer 架构演进综述",
      "创建日期": "2025-01-15",
      "焦点领域": "Transformer Architecture",
      "论文数量": 15,
      "时间跨度": "2017-2025",
      "总字数": 3500,
      "AI 生成比例": "25%",
      "状态": "草稿"
    },
    "related_papers": [
      "1706.03762",
      "1810.04805",
      "2005.14165"
    ]
  }
}
```

### 3. 作者声誉输出

**Notion 友好输出**:
```json
{
  "author": {
    "name": "Yann LeCun",
    "h_index": 180,
    "total_citations": 250000,
    "current_affiliation": "Meta AI",
    "research_areas": ["Deep Learning", "Computer Vision", "CNN"],
    "is_top_author": true,
    "top_papers": [
      {
        "title": "Gradient-Based Learning Applied to Document Recognition",
        "year": 1998,
        "citations": 35000
      }
    ]
  },
  
  "notion_metadata": {
    "database_entry": {
      "姓名": "Yann LeCun",
      "h-index": 180,
      "总引用数": 250000,
      "机构": "Meta AI",
      "研究领域": ["Deep Learning", "Computer Vision", "CNN"],
      "是否知名学者": true,
      "代表作": ["Gradient-Based Learning Applied to Document Recognition"]
    }
  }
}
```

### 4. 最近论文输出（30 天内）

**Notion 友好输出**:
```json
{
  "recent_papers": [...],
  
  "notion_metadata": {
    "page_title": "最新论文追踪 - 2025-01-15",
    "page_icon": "🆕",
    "page_cover": "https://...",
    
    "content_blocks": [
      {
        "type": "heading_1",
        "text": "最新论文追踪（最近 30 天）"
      },
      {
        "type": "callout",
        "emoji": "⚡",
        "text": "发现 12 篇来自顶级机构的最新论文"
      },
      {
        "type": "heading_2",
        "text": "突破性论文 (5 篇)"
      },
      {
        "type": "toggle",
        "text": "Flash Attention 3 - Stanford (2025-01-10)",
        "children": [
          {
            "type": "paragraph",
            "text": "作者: Tri Dao, et al."
          },
          {
            "type": "paragraph",
            "text": "机构: Stanford"
          },
          {
            "type": "paragraph",
            "text": "突破性评分: 90/100"
          },
          {
            "type": "paragraph",
            "text": "理由: 知名学者 + 顶级机构 + 标题包含突破性关键词"
          }
        ]
      }
    ],
    
    "database_view": {
      "filter": {
        "property": "发表日期",
        "date": {
          "past_month": {}
        }
      },
      "sort": [
        {
          "property": "质量评分",
          "direction": "descending"
        }
      ]
    }
  }
}
```

---

## 📋 推荐的工具输出增强

### 所有工具统一添加 `notion_metadata` 字段

```typescript
interface ToolOutput<T> {
  // 原有数据
  data: T;
  
  // Notion 元数据（新增）
  notion_metadata?: {
    // 数据库模式（如果适用）
    database_schema?: NotionDatabaseSchema;
    
    // 数据库条目（如果适用）
    database_entries?: NotionDatabaseEntry[];
    
    // 页面属性（如果适用）
    page_properties?: NotionPageProperties;
    
    // 内容块（如果适用）
    content_blocks?: NotionBlock[];
    
    // 关系（如果适用）
    relations?: {
      [key: string]: string[];  // 关联的其他条目 ID
    };
  };
  
  // 人类可读的摘要（方便 Agent 理解）
  summary?: string;
}
```

### 具体工具输出示例

#### 1. `search_academic_papers`
```json
{
  "data": {
    "papers": [...]
  },
  "notion_metadata": {
    "database_schema": {...},
    "database_entries": [...]
  },
  "summary": "找到 25 篇论文，其中 5 篇来自顶级机构，平均质量评分 78/100"
}
```

#### 2. `generate_literature_review_strict`
```json
{
  "data": {
    "review": "...",
    "source_mapping": {...},
    "statistics": {...}
  },
  "notion_metadata": {
    "page_properties": {...},
    "content_blocks": [...],
    "related_papers": [...]
  },
  "summary": "生成了 3500 字的综述，涵盖 15 篇论文，AI 生成比例 25%"
}
```

#### 3. `get_recent_papers`
```json
{
  "data": {
    "papers": [...]
  },
  "notion_metadata": {
    "page_title": "最新论文追踪 - 2025-01-15",
    "content_blocks": [...],
    "database_view": {...}
  },
  "summary": "发现 12 篇最近 30 天内的论文，其中 5 篇被识别为突破性论文"
}
```

---

## 🎨 Notion Block 类型映射

### 支持的 Notion Block 类型

```typescript
type NotionBlock = 
  | { type: 'heading_1', text: string }
  | { type: 'heading_2', text: string }
  | { type: 'heading_3', text: string }
  | { type: 'paragraph', text: string }
  | { type: 'bulleted_list_item', text: string }
  | { type: 'numbered_list_item', text: string }
  | { type: 'toggle', text: string, children: NotionBlock[] }
  | { type: 'quote', text: string }
  | { type: 'callout', emoji: string, text: string }
  | { type: 'code', language: string, text: string }
  | { type: 'divider' }
  | { type: 'table_of_contents' }
  | { type: 'bookmark', url: string }
  | { type: 'link_to_page', page_id: string };
```

### Markdown 到 Notion Block 的转换规则

```typescript
const markdownToNotion = {
  '# ': { type: 'heading_1' },
  '## ': { type: 'heading_2' },
  '### ': { type: 'heading_3' },
  '- ': { type: 'bulleted_list_item' },
  '1. ': { type: 'numbered_list_item' },
  '> ': { type: 'quote' },
  '```': { type: 'code' },
  '---': { type: 'divider' },
  '[📄]': { type: 'callout', emoji: '📄' },
  '[⚡]': { type: 'callout', emoji: '⚡' }
};
```

---

## 💡 Agent 使用流程示例

### 场景 1: 搜索论文并创建 Notion 数据库

```
User: "搜索最近关于 Transformer 的论文"

Agent:
1. 调用 arxiv-mcp: search_academic_papers("Transformer", recentDays=30)
2. 获得输出（包含 notion_metadata）
3. 调用 notion-mcp: create_database(schema=notion_metadata.database_schema)
4. 调用 notion-mcp: create_pages(entries=notion_metadata.database_entries)
5. 返回: "已创建包含 25 篇论文的 Notion 数据库"
```

### 场景 2: 生成综述并创建 Notion 页面

```
User: "基于这些论文生成文献综述"

Agent:
1. 调用 arxiv-mcp: generate_literature_review_strict(arxivIds=[...])
2. 获得输出（包含 notion_metadata）
3. 调用 notion-mcp: create_page(
     title=notion_metadata.page_properties.标题,
     blocks=notion_metadata.content_blocks
   )
4. 调用 notion-mcp: create_relations(
     page_id=new_page_id,
     related_papers=notion_metadata.related_papers
   )
5. 返回: "已创建综述页面，并关联了 15 篇论文"
```

---

## ✅ 实施建议

### Phase 1: 基础输出增强（1-2 天）
- [ ] 为所有工具添加 `notion_metadata` 字段
- [ ] 实现 Markdown 到 Notion Block 的转换
- [ ] 添加 `summary` 字段

### Phase 2: 数据库模式生成（2-3 天）
- [ ] 实现论文数据库模式生成
- [ ] 实现作者数据库模式生成
- [ ] 实现机构数据库模式生成

### Phase 3: 内容块生成（2-3 天）
- [ ] 实现综述内容块生成
- [ ] 实现最新论文追踪页面生成
- [ ] 实现论文详情页面生成

### Phase 4: 测试和优化（1-2 天）
- [ ] 与 Notion MCP 集成测试
- [ ] 优化输出格式
- [ ] 文档完善

**总计**: 6-10 天（约 1.5-2 周）

---

## 🎯 预期效果

### 对用户的好处
- ✅ **一键创建知识库**: Agent 自动将搜索结果组织到 Notion
- ✅ **结构化管理**: 论文、作者、机构分别存储在不同数据库
- ✅ **关系清晰**: 综述页面自动关联引用的论文
- ✅ **易于检索**: 通过 Notion 的强大搜索和过滤功能快速找到论文
- ✅ **持续更新**: 定期运行工具，自动更新最新论文

### 对 Agent 的好处
- ✅ **清晰的结构**: 知道如何组织数据到 Notion
- ✅ **丰富的元数据**: 有足够的信息创建完整的 Notion 页面
- ✅ **标准化格式**: 统一的输出格式，易于处理

---

**目标**: 让文献综述和知识管理无缝集成到 Notion，打造个人学术知识库 📚

