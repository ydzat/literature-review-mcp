# Literature Review MCP Server

[![npm version](https://badge.fury.io/js/%40ydzat%2Fliterature-review-mcp.svg)](https://www.npmjs.com/package/@ydzat/literature-review-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个面向研究生论文级别文献综述的学术论文管理与分析工具。支持 Model Context Protocol (MCP) 标准，提供多源学术数据库搜索、智能质量评估、智能压缩、多 LLM Provider、Notion 知识库集成等功能。

## 致谢

本项目最初 Fork 自 [arxiv-mcp-server](https://github.com/yzfly/arxiv-mcp-server)，感谢原作者 [@yzfly](https://github.com/yzfly) 的开源贡献。

在原项目基础上，我们进行了大量重构和功能扩展：

- ✨ **多源学术搜索**：新增 DBLP、OpenReview、Papers With Code 等数据源
- 📊 **智能质量评估**：基于引用数、会议等级、作者声誉的综合评分系统
- 🗜️ **智能文本压缩**：自动处理超长论文（138K tokens → 38K tokens，压缩率 72.3%）
- 🤖 **多 LLM Provider 支持**：支持 SiliconFlow、OpenAI、Deepseek 及任何 OpenAI 兼容 API
- 📥 **批量并发处理**：批量下载、批量分析、统一综述生成
- 📚 **Notion 完整集成**：自动生成 Notion 友好格式，支持完整/增量导出
- 💾 **SQLite 数据库**：重构存储架构，支持持久化和高效查询
- 🔧 **环境变量配置**：支持 `.env` 文件配置，灵活易用

## 功能亮点

### 🎉 完整文献综述生成
* 🔍 **多源学术搜索**：跨 DBLP、OpenReview、Papers With Code 等数据源智能搜索
* 📥 **批量并发下载**：并发下载多篇论文 PDF，支持重试和断点续传
* 🤖 **批量深度分析**：并发分析多篇论文，生成单篇深度综述（低温度参数，聚焦内容）
* 📚 **统一文献综述**：基于单篇分析生成跨论文的综合综述（方法对比、趋势分析、知识图谱）
* 📤 **Notion 完整导出**：完整或增量导出到 Notion（论文库 + 单篇综述 + 综合综述）

### 🗜️ 智能压缩系统
* 📊 **精确 Token 计算**：使用 tiktoken 库精确计算 token 数
* 📑 **章节识别**：自动识别论文结构（Abstract, Method, Conclusion 等）
* 🎯 **分级压缩**：根据章节重要性智能压缩（Abstract/Method: 100% 保留，Reference: 0% 保留）
* 🔄 **滚动压缩**：逐步合并，避免一次性处理超长文本
* 🧠 **语义压缩**：调用 LLM 进行智能压缩，而非简单截断
* ✅ **实测效果**：138K tokens → 38K tokens（压缩率 72.3%），保留核心信息

### 🤖 多 LLM Provider 支持
* 🌐 **SiliconFlow**：默认 Provider，支持 Qwen 系列模型
* 🔥 **Deepseek**：高性价比推理模型（128K context, 8K output）
* 🚀 **OpenAI**：GPT-4o, GPT-4-turbo 等模型
* 🔧 **自定义 API**：支持任何 OpenAI 兼容 API
* ⚙️ **灵活配置**：通过环境变量或 `.env` 文件配置

### 核心功能
* 📊 **智能质量评估**：基于引用数、会议等级、作者声誉、机构等级的综合评分系统
* 🎓 **学术严谨性**：低温度 AI 生成（0.3-0.5），严格基于文献内容，减少发散
* 📚 **Notion 集成**：自动生成 Notion 友好的结构化输出，一键导入知识库（需要 Notion MCP）
* 🏆 **顶级论文优先**：自动识别 A*/A 类会议、顶级学者、名校机构的论文
* 🆕 **最新论文追踪**：特别关注最近 30 天的新论文（AI 领域快速迭代）
* 💾 **本地数据库**：SQLite 数据库存储，支持缓存和离线查询

### 传统功能
* 📥 **arXiv 论文下载**：自动获取并保存原始论文
* 📝 **中英文智能转换**：将 PDF 英文内容解析为高质量的中文 Markdown
* 📱 **微信文章生成**：自动生成适配微信阅读体验的文章草稿

> 专为研究生论文级别的文献综述设计，确保学术严谨性和高质量输出！

## 安装使用

### NPX 方式（推荐）

```bash
npx @ydzat/literature-review-mcp@latest
```

### 全局安装

```bash
npm install -g @ydzat/literature-review-mcp@latest
literature-review-mcp
```

### 本地开发

```bash
# 克隆项目
git clone https://github.com/ydzat/literature-review-mcp.git
cd literature-review-mcp

# 安装依赖
npm install

# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置你的 LLM Provider
# vim .env

# 开发模式运行（使用 tsx 直接运行 TypeScript）
npm run dev

# 构建（编译 TypeScript 到 build/ 目录）
npm run build

# 运行构建版本（必须先执行 npm run build）
npm start
# 或直接运行
node build/index.js

# 运行测试
npm run build && node build/tests/test-literature-review.js
```

**⚠️ 重要提示**：
- 如果在 MCP 客户端配置中使用本地路径，必须先运行 `npm run build` 编译项目
- 本地路径必须指向 `build/index.js`，而不是 `src/index.ts`
- 每次修改代码后，需要重新运行 `npm run build`

## 配置要求

### 环境变量

在使用前，请设置以下环境变量：

```bash
# LLM Provider 配置（必需）
export LLM_PROVIDER="siliconflow"  # 可选: siliconflow, openai, custom
export LLM_API_KEY="your_api_key_here"

# 可选配置
export LLM_BASE_URL="https://api.siliconflow.cn/v1"  # 自定义 API 端点
export LLM_MODEL="Qwen/Qwen2.5-7B-Instruct"          # 指定模型
export LLM_MAX_TOKENS="4096"                         # 最大输出 tokens（不设置则自动获取）
export LLM_TEMPERATURE="0.3"                         # 温度参数（默认 0.7）
```

**注意**：工作目录已自动设置为 `~/.arxiv-mcp/`，无需手动配置。

### 支持的 LLM Provider

#### 1. SiliconFlow（默认）
```bash
export LLM_PROVIDER="siliconflow"
export LLM_API_KEY="your_siliconflow_key"
# 可选：export LLM_MODEL="Qwen/Qwen2.5-7B-Instruct"
```
获取 API Key：[https://cloud.siliconflow.cn/i/TxUlXG3u](https://cloud.siliconflow.cn/i/TxUlXG3u)

#### 2. OpenAI
```bash
export LLM_PROVIDER="openai"
export LLM_API_KEY="your_openai_key"
export LLM_MODEL="gpt-4o"
```

#### 3. Deepseek
```bash
export LLM_PROVIDER="custom"
export LLM_BASE_URL="https://api.deepseek.com/v1"
export LLM_API_KEY="your_deepseek_key"
export LLM_MODEL="deepseek-chat"
```

#### 4. 其他 OpenAI 兼容 API
```bash
export LLM_PROVIDER="custom"
export LLM_BASE_URL="https://your-api-endpoint/v1"
export LLM_API_KEY="your_api_key"
export LLM_MODEL="your_model_name"
```

### 智能压缩功能

本工具内置**智能文本压缩系统**，可自动处理超长论文：

- ✅ **精确 Token 计算**：使用 tiktoken 库精确计算 token 数
- ✅ **章节识别**：自动识别论文结构（Abstract, Method, Conclusion 等）
- ✅ **分级压缩**：根据章节重要性智能压缩
  - Abstract/Method: 100% 保留
  - Introduction/Conclusion: 90% 保留
  - Experiment/Result: 80% 保留
  - Reference: 0% 保留（完全丢弃）
- ✅ **滚动压缩**：逐步合并，避免一次性处理超长文本
- ✅ **语义压缩**：调用 LLM 进行智能压缩，而非简单截断

**示例**：138K tokens 的超长论文 → 压缩到 38K tokens（压缩率 72.3%），同时保留核心信息

### 数据存储

所有数据自动存储在 `~/.arxiv-mcp/` 目录：
- `arxiv-mcp.db` - SQLite 数据库（论文、作者、机构信息）
- `pdfs/` - 下载的 PDF 文件
- `texts/` - 提取的文本内容
- `generated/` - 生成的文件（综述、微信文章等）

## MCP 客户端配置

### Claude Desktop 配置

在 Claude Desktop 的配置文件中添加：

#### 方式 1：使用 NPX（推荐，自动更新）

##### 使用 SiliconFlow（默认）
```json
{
  "mcpServers": {
    "literature-review-mcp": {
      "command": "npx",
      "args": ["-y", "@ydzat/literature-review-mcp@latest"],
      "env": {
        "LLM_PROVIDER": "siliconflow",
        "LLM_API_KEY": "your_siliconflow_key"
      }
    }
  }
}
```

##### 使用 Deepseek
```json
{
  "mcpServers": {
    "literature-review-mcp": {
      "command": "npx",
      "args": ["-y", "@ydzat/literature-review-mcp@latest"],
      "env": {
        "LLM_PROVIDER": "custom",
        "LLM_BASE_URL": "https://api.deepseek.com/v1",
        "LLM_API_KEY": "your_deepseek_key",
        "LLM_MODEL": "deepseek-chat"
      }
    }
  }
}
```

##### 使用 OpenAI
```json
{
  "mcpServers": {
    "literature-review-mcp": {
      "command": "npx",
      "args": ["-y", "@ydzat/literature-review-mcp@latest"],
      "env": {
        "LLM_PROVIDER": "openai",
        "LLM_API_KEY": "your_openai_key",
        "LLM_MODEL": "gpt-4o"
      }
    }
  }
}
```

#### 方式 2：使用本地开发版本

**⚠️ 使用前必须先编译**：
```bash
cd /path/to/your/literature-review-mcp
npm install
npm run build
```

**配置示例**：
```json
{
  "mcpServers": {
    "literature-review-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/literature-review-mcp/build/index.js"],
      "env": {
        "LLM_PROVIDER": "siliconflow",
        "LLM_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

**注意**：
- 路径必须是**绝对路径**，指向 `build/index.js`（不是 `src/index.ts`）
- 每次修改代码后需要重新运行 `npm run build`

> **注意**：将 `/path/to/your/literature-review-mcp` 替换为你的实际项目路径

**注意**：
- 工作目录已自动设置为 `~/.arxiv-mcp/`，无需配置 `WORK_DIR`
- 如需使用 Notion 集成功能，请同时配置 Notion MCP Server
- 兼容旧版配置：`SILICONFLOW_API_KEY` 仍然有效（会自动映射到 `LLM_API_KEY`）

配置文件位置：
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### 其他 MCP 客户端

对于其他支持 MCP 的客户端，请参考其文档配置 stdio 传输方式。

---

## 📖 完整使用示例

以下是一个完整的文献综述工作流程示例，展示如何从搜索论文到生成综述并导出到 Notion。

### 场景：研究 Transformer 注意力机制

假设你正在研究 Transformer 的注意力机制，需要做一个系统性的文献综述。

#### 步骤 1️⃣：多源学术搜索

在 Claude Desktop 或其他 MCP 客户端中，使用 `search_academic_papers` 工具：

```
请帮我搜索关于 "transformer attention mechanism" 的高质量论文，
要求：
- 搜索 DBLP、OpenReview、Papers With Code 三个数据源
- 最多返回 20 篇论文
- 质量评分至少 60 分
```

**工具调用**：
```json
{
  "query": "transformer attention mechanism",
  "maxResults": 20,
  "sources": ["dblp", "openreview", "paperswithcode"],
  "minQualityScore": 60
}
```

**返回结果**：
- 20 篇高质量论文的元数据
- 每篇论文的质量评分（基于引用数、会议等级、作者声誉等）
- Notion 数据库格式的结构化数据
- 论文已自动保存到本地数据库

#### 步骤 2️⃣：批量下载 PDF

选择你感兴趣的论文（例如前 5 篇），使用 `process_arxiv_paper` 工具批量下载：

```
请帮我下载以下论文的 PDF：
1. arXiv:1706.03762 (Attention Is All You Need)
2. arXiv:2010.11929 (An Image is Worth 16x16 Words)
3. arXiv:2005.14165 (Language Models are Few-Shot Learners)
4. arXiv:2304.08485 (Segment Anything)
5. arXiv:2303.08774 (GPT-4 Technical Report)
```

**工具调用**（对每篇论文）：
```json
{
  "arxivId": "1706.03762",
  "includeWechat": false
}
```

**返回结果**：
- PDF 文件下载到 `~/.arxiv-mcp/pdfs/`
- 自动提取文本到 `~/.arxiv-mcp/texts/`
- 论文信息保存到数据库

#### 步骤 3️⃣：批量深度分析

使用 AI 对每篇论文进行深度分析（自动调用智能压缩）：

```
请对刚才下载的 5 篇论文进行深度分析，生成单篇综述
```

**后台处理**：
- 自动识别论文结构（Abstract, Method, Conclusion 等）
- 智能压缩超长论文（例如 GPT-4 Technical Report 有 100 页）
- 使用低温度参数（0.3）生成严谨的学术综述
- 每篇论文生成 2000-3000 字的深度分析

**生成内容示例**（单篇综述）：
```markdown
# Attention Is All You Need - 深度综述

## 📋 论文信息
- **标题**: Attention Is All You Need
- **作者**: Vaswani et al.
- **发表**: NeurIPS 2017
- **引用数**: 100,000+

## 🎯 核心贡献
1. 提出 Transformer 架构，完全基于注意力机制
2. 引入多头自注意力（Multi-Head Self-Attention）
3. 位置编码（Positional Encoding）解决序列顺序问题

## 🔬 方法详解
### 自注意力机制
...

## 📊 实验结果
...

## 💡 创新点与局限
...

## 🔗 与其他工作的关系
...
```

#### 步骤 4️⃣：生成统一文献综述

基于单篇分析，生成跨论文的综合综述：

```
请基于这 5 篇论文的单篇分析，生成一个统一的文献综述，
重点关注：
1. Transformer 注意力机制的演进
2. 不同模型的方法对比
3. 未来研究方向
```

**后台处理**：
- 读取所有单篇综述
- 使用 LLM 进行跨论文分析
- 生成方法对比表格
- 绘制知识图谱（Mermaid）
- 提出研究问题和改进建议

**生成内容示例**（统一综述）：
```markdown
# Transformer 注意力机制文献综述

## 📊 综述概览
- **研究领域**: Transformer 注意力机制
- **论文数量**: 5 篇
- **时间跨度**: 2017-2023
- **总字数**: 12,000 字

## 🔄 方法演进

### 阶段 1：基础 Transformer (2017)
- Attention Is All You Need 提出基础架构
- 多头自注意力 + 位置编码

### 阶段 2：视觉 Transformer (2020)
- ViT 将 Transformer 应用到视觉领域
- Patch Embedding + Class Token

### 阶段 3：大规模预训练 (2020-2023)
- GPT-3/GPT-4 扩展到 175B/1.76T 参数
- In-Context Learning 新范式

## 📈 方法对比

| 模型 | 注意力类型 | 参数量 | 应用领域 |
|------|-----------|--------|---------|
| Transformer | Multi-Head | 65M | NLP |
| ViT | Multi-Head | 86M | Vision |
| GPT-3 | Causal | 175B | Language |
| SAM | Cross-Attention | 636M | Segmentation |

## 🔮 未来方向
1. 高效注意力机制（Sparse Attention, Linear Attention）
2. 多模态融合（Vision-Language）
3. 可解释性研究

## 📚 参考文献
[1] Vaswani et al. (2017) Attention Is All You Need
...
```

#### 步骤 5️⃣：导出到 Notion

将所有内容导出到 Notion 知识库：

```
请将这个文献综述导出到 Notion，包括：
1. 论文数据库（5 篇论文的元数据）
2. 单篇综述页面（5 个页面）
3. 统一综述页面（1 个页面）
```

**Notion 结构**：
```
📚 Literature Review Database
├── 📄 Attention Is All You Need (2017)
│   ├── 质量评分: 95
│   ├── 引用数: 100,000+
│   └── 单篇综述: [链接]
├── 📄 An Image is Worth 16x16 Words (2020)
│   └── ...
├── 📄 Language Models are Few-Shot Learners (2020)
│   └── ...
├── 📄 Segment Anything (2023)
│   └── ...
└── 📄 GPT-4 Technical Report (2023)
    └── ...

📖 Unified Review
└── Transformer 注意力机制文献综述
    ├── 方法演进
    ├── 方法对比表格
    ├── 知识图谱
    └── 未来方向
```

### 🎯 工作流程总结

```mermaid
graph LR
    A[搜索论文] --> B[批量下载]
    B --> C[批量分析]
    C --> D[生成综述]
    D --> E[导出 Notion]

    style A fill:#e1f5ff
    style B fill:#fff3e0
    style C fill:#f3e5f5
    style D fill:#e8f5e9
    style E fill:#fce4ec
```

**时间估算**：
- 搜索论文：10 秒
- 下载 5 篇 PDF：30 秒
- 分析 5 篇论文：5-10 分钟（取决于论文长度和 LLM 速度）
- 生成统一综述：2-3 分钟
- 导出 Notion：10 秒

**总计**：约 10-15 分钟完成完整的文献综述流程！

### 💡 高级技巧

1. **智能压缩自动启用**：超长论文（>100 页）会自动压缩，无需手动处理
2. **质量过滤**：使用 `minQualityScore` 参数过滤低质量论文
3. **增量更新**：使用 `exportToNotionUpdate` 只更新新增论文
4. **自定义 LLM**：在 `.env` 中配置不同的 LLM Provider 和模型
5. **批量处理**：一次性处理 10-20 篇论文，充分利用并发能力

---

## 可用工具与参数

### 🆕 多源学术搜索（推荐）

#### search_academic_papers
跨多个学术数据源搜索论文，返回 Notion 友好格式

**参数**:
- `query` (必需): 搜索关键词
- `maxResults` (可选): 最大结果数量，默认 10
- `sources` (可选): 数据源列表，可选 `["dblp", "openreview", "paperswithcode"]`，默认全部
- `minQualityScore` (可选): 最低质量评分（0-100），默认 0

**返回**:
- 结构化的论文数据
- Notion 数据库 schema 和 entries
- 质量评分详情
- 使用说明

**示例**:
```json
{
  "query": "transformer attention mechanism",
  "maxResults": 10,
  "sources": ["dblp", "openreview"],
  "minQualityScore": 50
}
```

### 传统 arXiv 工具

#### 1. search_arxiv
搜索 arXiv 论文

**参数**:
- `query`: 关键词
- `maxResults`: 返回论文数（可选，默认 5）

#### 2. download_arxiv_pdf
下载 arXiv PDF 文件

**参数**:
- `input`: arXiv 论文 URL 或 arXiv ID（如：2403.15137v1）

#### 3. parse_pdf_to_markdown
解析为中文 Markdown

**参数**:
- `arxivId`: arXiv 论文 ID
- `paperInfo`: 论文元信息（可选）

#### 4. convert_to_wechat_article
转换为微信文章

**参数**:
- `arxivId`: arXiv 论文 ID

#### 5. process_arxiv_paper
完整流程处理

**参数**:
- `arxivId`: arXiv 论文 ID
- `includeWechat`: 是否生成微信文章（可选，默认 true）

#### 6. clear_workdir
清理所有历史文件

**参数**: 无


## 数据存储说明

所有数据自动存储在 `~/.arxiv-mcp/` 目录：

### 数据库文件
* `arxiv-mcp.db` - SQLite 数据库
  - `papers` 表：论文元数据、质量评分
  - `authors` 表：作者信息、声誉评分
  - `institutions` 表：机构信息、等级评分
  - `api_cache` 表：API 响应缓存（自动过期）

### 文件存储
* `pdfs/{arxivId}.pdf` - 下载的 PDF 文件
* `texts/{arxivId}.txt` - 提取的文本内容
* `generated/` - 生成的文件
  - `{arxivId}_md_zh.md` - 中文 Markdown 解读
  - `{arxivId}_wechat.md` - 微信公众号文章

**注意**：执行 `clear_workdir` 会删除 `generated/` 目录下的所有文件，但不会删除数据库和 PDF 文件。

## 使用流程示例

### 场景 1：研究生文献综述（推荐）

1. **多源学术搜索**
   ```
   使用 search_academic_papers 工具
   - 设置关键词：如 "transformer attention mechanism"
   - 选择数据源：["dblp", "openreview"]
   - 设置最低质量评分：50
   ```

2. **查看 Notion 输出**
   - 工具返回包含 `notion_metadata` 的结构化数据
   - 包含论文数据库 schema 和 entries
   - 包含质量评分详情和使用说明

3. **导入 Notion**
   - 让你的 Agent 使用 Notion MCP 创建数据库
   - 自动导入论文、作者、机构信息
   - 建立关联关系

### 场景 2：传统 arXiv 论文处理

1. **搜索论文** - 使用 `search_arxiv` 工具
2. **下载 PDF** - 使用 `download_arxiv_pdf` 工具
3. **解析为中文** - 使用 `parse_pdf_to_markdown` 工具
4. **生成微信文章** - 使用 `convert_to_wechat_article` 工具
5. **清理文件** - 使用 `clear_workdir` 工具


## 开发指南

### 本地开发

```bash
# 克隆项目
git clone https://github.com/yzfly/arxiv-mcp-server.git
cd arxiv-mcp-server

# 安装依赖
npm install

# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置你的 LLM Provider
# vim .env

# 开发模式运行
npm run dev

# 构建
npm run build

# 运行构建版本
npm start

# 运行测试
npm run build && node build/tests/test-literature-review.js
```

### 项目结构

```
arxiv-mcp-server/
├── src/
│   ├── index.ts              # 主服务器文件
│   ├── database/             # 数据库模块
│   │   ├── DatabaseManager.ts
│   │   └── schema.sql
│   ├── storage/              # 存储管理
│   │   └── StorageManager.ts
│   ├── sources/              # 学术数据源
│   │   ├── base.ts
│   │   ├── dblp.ts
│   │   ├── openreview.ts
│   │   ├── paperswithcode.ts
│   │   └── unified.ts
│   ├── reputation/           # 声誉评分系统
│   │   ├── scoring.ts
│   │   ├── topAuthors.ts
│   │   └── topInstitutions.ts
│   └── notion/               # Notion 集成
│       ├── types.ts
│       └── formatters.ts
├── build/                    # 编译输出目录
├── docs/                     # 设计文档
│   ├── 01-学术化改造方案.md
│   ├── 02-实施检查清单.md
│   ├── 03-Notion集成输出设计.md
│   ├── 04-数据存储策略.md
│   └── 05-数据库方案分析.md
└── ~/.arxiv-mcp/             # 数据存储目录
    ├── arxiv-mcp.db          # SQLite 数据库
    ├── pdfs/                 # PDF 文件
    ├── texts/                # 提取的文本
    └── generated/            # 生成的文件
```

### 核心特性

1. **多源学术搜索**：集成 DBLP、OpenReview、Papers With Code
2. **智能质量评估**：基于引用数、会议等级、作者声誉的综合评分
3. **数据库存储**：SQLite 数据库，支持缓存和离线查询
4. **Notion 集成**：自动生成 Notion 友好的结构化输出
5. **学术严谨性**：低温度 AI 生成，聚焦已下载文章

## 技术栈

- **Node.js** >= 18.0.0
- **TypeScript** - 类型安全的 JavaScript
- **Model Context Protocol (MCP)** - 标准化的 AI 上下文协议
- **SQLite (better-sqlite3)** - 嵌入式数据库，高性能缓存
- **多 LLM Provider 支持**：
  - SiliconFlow API - 默认 AI 服务
  - OpenAI API - GPT 系列模型
  - Deepseek API - 高性价比推理模型
  - 任何 OpenAI 兼容 API
- **智能压缩**：
  - tiktoken - 精确 token 计算
  - pdfjs-dist - PDF 文本提取
- **学术数据源**：
  - arXiv API - 预印本论文
  - DBLP API - 计算机科学文献
  - OpenReview API - 顶级会议预审
  - Papers With Code API - 论文+代码

## 故障排除

### 常见问题

1. **API Key 错误**
   ```
   错误：请设置 SILICONFLOW_API_KEY 环境变量
   解决：确保正确设置了 SiliconFlow API Key
   ```

2. **论文下载失败**
   ```
   错误：下载失败: Request failed with status code 404
   解决：检查 arXiv ID 是否正确，确保网络连接正常
   ```

3. **数据库权限问题**
   ```
   错误：EACCES: permission denied, open '~/.arxiv-mcp/arxiv-mcp.db'
   解决：确保 ~/.arxiv-mcp/ 目录有写入权限
   ```

4. **学术搜索返回结果少**
   ```
   原因：OpenReview 和 Papers With Code 使用本地过滤
   解决：这是正常现象，建议使用 DBLP 数据源获取更多结果
   ```

5. **Notion 集成不工作**
   ```
   原因：需要单独配置 Notion MCP Server
   解决：本工具只提供 Notion 友好的输出格式，需要你的 Agent 连接 Notion MCP
   ```

### 日志调试

启用详细日志：
```bash
DEBUG=arxiv-mcp-server npx @langgpt/arxiv-mcp-server
```

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本项目
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

### 开发规范

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 代码规范
- 添加适当的错误处理和日志
- 编写清晰的注释和文档
- 单元测试覆盖核心功能
- 保持代码简洁，避免过度设计

### 开发路线图

查看 `docs/` 目录了解详细的设计文档：
- `01-学术化改造方案.md` - 核心设计方案
- `02-实施检查清单.md` - 开发进度追踪
- `03-Notion集成输出设计.md` - Notion 集成设计
- `04-数据存储策略.md` - 存储架构设计
- `05-数据库方案分析.md` - 数据库选型分析

## 发布流程

本项目使用 GitHub Actions 自动化发布到 npm。

### 快速发布

```bash
# 1. 更新版本号并创建 tag
npm version patch  # Bug 修复 (1.0.0 -> 1.0.1)
npm version minor  # 新功能 (1.0.0 -> 1.1.0)
npm version major  # 破坏性更新 (1.0.0 -> 2.0.0)

# 2. 推送到 GitHub
git push && git push --tags
```

GitHub Actions 会自动：
1. ✅ 检出代码
2. 📦 安装依赖
3. 🔨 构建项目
4. ✅ 验证构建产物
5. ✅ 验证版本号
6. 📦 发布到 npm
7. 📋 创建 GitHub Release

### 前置要求

在 GitHub 仓库的 Settings → Secrets 中添加 `NPM_TOKEN`（详见 [RELEASE.md](RELEASE.md)）。

## 许可证

本项目采用 MIT 许可证。详情请见 [LICENSE](LICENSE) 文件。

## 更新日志

### v1.0.0 (2025-10-18)

**首次独立发布** - Fork 自 [arxiv-mcp-server](https://github.com/yzfly/arxiv-mcp-server)

#### 核心功能

- 🚀 **多 LLM Provider 支持**：支持 SiliconFlow、OpenAI、Deepseek 及任何 OpenAI 兼容 API
- 🗜️ **智能文本压缩系统**：自动处理超长论文（138K tokens → 38K tokens，压缩率 72.3%）
  - 精确 token 计算（tiktoken）
  - 章节识别与分级压缩
  - 滚动压缩策略
  - 语义压缩（非简单截断）
- 📥 **批量并发下载**：支持并发下载多篇论文 PDF，自动处理 DOI 链接
- 🤖 **批量深度分析**：并发分析多篇论文，生成单篇深度综述
- 📚 **统一文献综述**：基于单篇分析生成跨论文综合综述
- 📤 **Notion 完整导出**：完整或增量导出到 Notion

#### 学术功能

- ✨ **多源学术搜索**：跨 DBLP、OpenReview、Papers With Code 等数据源智能搜索
- 📊 **智能质量评估**：基于引用数、会议等级、作者声誉、机构等级的综合评分
- 🎓 **学术严谨性**：低温度 AI 生成，聚焦已下载文章，减少发散
- 🏆 **顶级论文优先**：自动识别 A*/A 类会议、顶级学者、名校机构的论文
- 🆕 **最新论文追踪**：特别关注最近 30 天的 AI 领域新论文

#### 技术架构

- � **SQLite 数据库**：重构存储架构，支持持久化和高效查询
- 🔧 **环境变量配置**：支持 `.env` 文件配置
- 📖 **完善文档**：详细的 README、.env.example、配置示例
- 🧪 **完整测试**：端到端测试覆盖主要功能

#### 继承的功能（来自原项目）

- 🔍 **arXiv 论文搜索**：支持 arXiv 论文搜索和下载
- 📝 **智能中文解读**：将 PDF 英文内容解析为高质量的中文 Markdown
- 📱 **微信文章生成**：自动生成适配微信阅读体验的文章草稿

## 相关链接

### 核心技术
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) - AI 上下文协议标准
- [Claude Desktop](https://claude.ai/download) - MCP 客户端

### 学术数据源
- [arXiv.org](https://arxiv.org/) - 预印本论文库
- [DBLP](https://dblp.org/) - 计算机科学文献库
- [OpenReview](https://openreview.net/) - 顶级会议预审平台
- [Papers With Code](https://paperswithcode.com/) - 论文+代码平台

### AI 服务
- [SiliconFlow](https://cloud.siliconflow.cn/) - AI 内容生成服务

## 支持

如果您觉得这个项目有用，请给它一个 ⭐！

如有问题或建议，请留下你的issue！