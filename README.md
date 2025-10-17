# ArXiv MCP Server

一个面向研究生论文级别文献综述的学术论文管理与分析工具。支持 Model Context Protocol (MCP) 标准，提供多源学术数据库搜索、智能质量评估、Notion 知识库集成等功能。

## 功能亮点

### 🎉 NEW! 完整文献综述生成
* 🔍 **多源学术搜索**：跨 DBLP、OpenReview、Papers With Code 等数据源智能搜索
* 📥 **批量并发下载**：并发下载多篇论文 PDF，支持重试和断点续传
* 🤖 **批量深度分析**：并发分析多篇论文，生成单篇深度综述（低温度参数，聚焦内容）
* 📚 **统一文献综述**：基于单篇分析生成跨论文的综合综述（方法对比、趋势分析、知识图谱）
* 📤 **Notion 完整导出**：完整或增量导出到 Notion（论文库 + 单篇综述 + 综合综述）

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
npx @langgpt/arxiv-mcp-server
```

### 全局安装

```bash
npm install -g @langgpt/arxiv-mcp-server
arxiv-mcp-server
```

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

#### 使用 SiliconFlow（默认）
```json
{
  "mcpServers": {
    "arxiv-mcp-server": {
      "command": "npx",
      "args": ["-y", "@langgpt/arxiv-mcp-server@latest"],
      "env": {
        "LLM_PROVIDER": "siliconflow",
        "LLM_API_KEY": "your_siliconflow_key"
      }
    }
  }
}
```

#### 使用 Deepseek
```json
{
  "mcpServers": {
    "arxiv-mcp-server": {
      "command": "npx",
      "args": ["-y", "@langgpt/arxiv-mcp-server@latest"],
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

#### 使用 OpenAI
```json
{
  "mcpServers": {
    "arxiv-mcp-server": {
      "command": "npx",
      "args": ["-y", "@langgpt/arxiv-mcp-server@latest"],
      "env": {
        "LLM_PROVIDER": "openai",
        "LLM_API_KEY": "your_openai_key",
        "LLM_MODEL": "gpt-4o"
      }
    }
  }
}
```

**注意**：
- 工作目录已自动设置为 `~/.arxiv-mcp/`，无需配置 `WORK_DIR`
- 如需使用 Notion 集成功能，请同时配置 Notion MCP Server
- 兼容旧版配置：`SILICONFLOW_API_KEY` 仍然有效（会自动映射到 `LLM_API_KEY`）

配置文件位置：
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### 其他 MCP 客户端

对于其他支持 MCP 的客户端，请参考其文档配置 stdio 传输方式。

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

## 许可证

本项目采用 MIT 许可证。详情请见 [LICENSE](LICENSE) 文件。

## 更新日志

### v1.3.0 (2025-10-18)

- 作者：@ydzat

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
- 🔧 **环境变量配置**：支持 `.env` 文件配置
- 📖 **完善文档**：更新 README、.env.example、配置示例

### v1.2.0 (2025-10-17)

- 作者：@ydzat

- ✨ **新增多源学术搜索工具**：支持跨 DBLP、OpenReview、Papers With Code 等数据源智能搜索论文
- 📊 **引入智能质量评估系统**：基于引用数、会议等级、作者声誉、机构等级的综合评分
- 🎓 **增强学术严谨性**：采用低温度 AI 生成，聚焦已下载文章，减少发散
- 📚 **集成 Notion 知识库**：自动生成 Notion 友好格式，一键导入（需连接 Notion MCP）
- 🏆 **优先顶级论文**：自动识别 A*/A 类会议、顶级学者、名校机构的论文
- 🆕 **新增最新论文追踪**：特别关注最近 30 天的 AI 领域新论文
- 🔧 **优化 MCP 客户端配置**：更新 Claude Desktop 等配置示例
- 📖 **完善文档**：添加详细工具参数、使用流程和故障排除指南

### v1.0.0 (2024-12-19)

- 作者：@yzfly

- ✨ 初始版本发布
- 🔍 支持 arXiv 论文搜索
- 📥 支持 PDF 下载
- 📝 支持智能中文解读
- 📱 支持微信文章格式转换
- 🤖 集成 SiliconFlow AI 服务

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