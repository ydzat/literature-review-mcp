# Literature Review MCP Server

[![npm](https://img.shields.io/npm/v/@ydzat/literature-review-mcp)](https://www.npmjs.com/package/@ydzat/literature-review-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个面向研究生论文级别文献综述的学术论文管理与分析工具。支持 Model Context Protocol (MCP) 标准，提供多源学术搜索、智能压缩、批量分析、跨文献综述生成等功能。

> 专为研究生论文级别的文献综述设计，确保学术严谨性和高质量输出！

## 核心功能

### 📚 完整文献综述工作流
1. **多源学术搜索**：跨 DBLP、OpenReview、Papers With Code 等数据源智能搜索
2. **批量下载与分析**：并发下载 PDF，生成单篇深度综述（低温度，学术严谨）
3. **跨文献综述生成**：基于单篇综述生成详细的跨论文综合分析（≥4000字）
4. **综述导出**：导出单篇/跨文献综述为 Markdown 文件
5. **Notion 集成**：自动生成 Notion 友好格式（需配合 Notion MCP）

### 🗜️ 智能压缩系统
- **精确 Token 计算**：使用 tiktoken 精确计算
- **章节识别与分级压缩**：Abstract/Method 100% 保留，Reference 0% 保留
- **滚动压缩**：逐步合并，避免一次性处理超长文本
- **语义压缩**：LLM 智能压缩，非简单截断
- **实测效果**：138K tokens → 38K tokens（压缩率 72.3%）

### 🤖 多 LLM Provider 支持
- **SiliconFlow**：默认，支持 Qwen 系列
- **Deepseek**：高性价比（128K context, 8K output）
- **OpenAI**：GPT-4o, GPT-4-turbo
- **自定义 API**：任何 OpenAI 兼容 API

### 📊 智能质量评估
- 基于引用数、会议等级、作者声誉、机构等级的综合评分
- 自动识别 A*/A 类会议、顶级学者、名校机构
- 特别关注最近 30 天的新论文

## 致谢

本项目 Fork 自 [arxiv-mcp-server](https://github.com/yzfly/arxiv-mcp-server)，感谢原作者 [@yzfly](https://github.com/yzfly) 的开源贡献。在原项目基础上进行了大量重构和功能扩展（v2.0.0 完全模块化架构）。

## 安装使用

### NPX 方式（推荐）

```bash
npx -y @ydzat/literature-review-mcp@latest
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

支持通过环境变量或 `.env` 文件配置：

```bash
# LLM Provider 配置（必需）
LLM_PROVIDER=siliconflow  # 可选: siliconflow, openai, custom
LLM_API_KEY=your_api_key_here

# 可选配置
LLM_BASE_URL=https://api.siliconflow.cn/v1  # 自定义 API 端点
LLM_MODEL=Qwen/Qwen2.5-7B-Instruct          # 指定模型
LLM_TEMPERATURE=0.3                         # 温度参数（默认 0.7）
```

### 支持的 LLM Provider

| Provider | LLM_PROVIDER | LLM_BASE_URL | 推荐模型 |
|----------|--------------|--------------|---------|
| SiliconFlow（默认） | `siliconflow` | 自动设置 | `Qwen/Qwen2.5-7B-Instruct` |
| Deepseek | `custom` | `https://api.deepseek.com/v1` | `deepseek-chat` |
| OpenAI | `openai` | 自动设置 | `gpt-4o` |
| 其他 | `custom` | 你的 API 端点 | 你的模型名 |

**获取 API Key**：
- SiliconFlow: [https://cloud.siliconflow.cn/i/TxUlXG3u](https://cloud.siliconflow.cn/i/TxUlXG3u)
- Deepseek: [https://platform.deepseek.com/](https://platform.deepseek.com/)
- OpenAI: [https://platform.openai.com/](https://platform.openai.com/)

### 数据存储

所有数据自动存储在 `~/.arxiv-mcp/` 目录：
- `arxiv-mcp.db` - SQLite 数据库（论文、作者、机构、综述）
- `pdfs/` - 下载的 PDF 文件
- `texts/` - 提取的文本内容
- `generated/` - 生成的综述文件

## MCP 客户端配置

### Claude Desktop 配置

配置文件位置：
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

#### 方式 1：使用 NPX（推荐）

```json
{
  "mcpServers": {
    "literature-review-mcp": {
      "command": "npx",
      "args": ["-y", "@ydzat/literature-review-mcp@latest"],
      "env": {
        "LLM_PROVIDER": "siliconflow",
        "LLM_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

**其他 Provider 配置**：
- **Deepseek**: 设置 `LLM_PROVIDER="custom"`, `LLM_BASE_URL="https://api.deepseek.com/v1"`, `LLM_MODEL="deepseek-chat"`
- **OpenAI**: 设置 `LLM_PROVIDER="openai"`, `LLM_MODEL="gpt-4o"`

#### 方式 2：使用本地开发版本

```bash
# 先编译项目
cd /path/to/literature-review-mcp
npm install && npm run build
```

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

**注意**：路径必须是绝对路径，指向 `build/index.js`（不是 `src/index.ts`）

## 使用示例

### 完整工作流程

```mermaid
graph LR
    A[搜索论文] --> B[批量下载]
    B --> C[批量分析]
    C --> D[生成综述]
    D --> E[导出文件/Notion]
```

#### 1. 搜索论文
```
请搜索关于 "transformer attention" 的高质量论文，
要求：DBLP + OpenReview，最多 20 篇，质量评分≥60
```

#### 2. 批量下载与分析
```
请下载并分析以下论文：
- arXiv:1706.03762 (Attention Is All You Need)
- arXiv:2010.11929 (ViT)
- arXiv:2005.14165 (GPT-3)
```

**自动处理**：
- 下载 PDF → 提取文本 → 智能压缩（如需）→ 生成单篇综述（2000-3000字）

#### 3. 生成跨文献综述
```
请基于这 3 篇论文生成统一的文献综述，
重点关注：方法演进、对比分析、未来方向
```

**生成内容**：
- 8 个详细章节（研究领域概述、动机对比、方法论对比、实验分析、创新点、局限性、未来方向、批判性讨论）
- ≥4000 字的深度分析
- 自动保存到 `~/.arxiv-mcp/generated/`

#### 4. 导出综述
```
请将单篇综述导出为 Markdown 文件
```

**时间估算**：搜索 10s + 下载 30s + 分析 5-10min + 综述 3-5min = **10-15 分钟**

---

## 主要工具

### 学术搜索与分析
- **`search_academic_papers`** - 多源学术搜索（DBLP、OpenReview、Papers With Code）
- **`batch_download_papers`** - 批量下载论文 PDF
- **`batch_analyze_papers`** - 批量生成单篇深度综述

### 综述生成与导出
- **`generate_unified_literature_review`** - 生成跨文献综述（≥4000字）
- **`export_individual_review_to_md`** - 导出单篇综述为 Markdown
- **`batch_export_individual_reviews`** - 批量导出所有单篇综述

### 传统工具
- **`search_arxiv`** - 搜索 arXiv 论文
- **`download_arxiv_pdf`** - 下载 PDF
- **`parse_pdf_to_markdown`** - 解析为中文 Markdown
- **`convert_to_wechat_article`** - 生成微信文章
- **`process_arxiv_paper`** - 完整流程处理

### Notion 集成
- **`export_to_notion_full`** - 完整导出到 Notion
- **`export_to_notion_update`** - 增量更新 Notion

完整工具列表和参数说明请参考源码中的 `src/tools/tool-registry.ts`


## 开发指南

### 本地开发

```bash
git clone https://github.com/ydzat/literature-review-mcp.git
cd literature-review-mcp
npm install
cp .env.example .env  # 配置 LLM Provider
npm run dev           # 开发模式
npm run build         # 构建
npm start             # 运行
```

### 项目架构（v2.0.0）

```
src/
├── core/              # 核心功能（PDF、arXiv、处理）
├── tools/             # 工具封装（按功能分类）
├── llm/               # LLM 抽象（Provider + 智能压缩）
├── storage/           # 存储管理（文件 + 数据库）
├── database/          # SQLite 数据库
├── sources/           # 学术数据源（DBLP、OpenReview 等）
├── reputation/        # 质量评分系统
└── index.ts           # MCP 服务器入口（89 行）
```

### 技术栈

- **Node.js** >= 18.0.0, **TypeScript**, **MCP**
- **SQLite** (better-sqlite3) - 数据库
- **LLM**: SiliconFlow / OpenAI / Deepseek / 自定义
- **智能压缩**: tiktoken + pdfjs-dist
- **学术数据源**: arXiv / DBLP / OpenReview / Papers With Code

## 故障排除

| 问题 | 解决方案 |
|------|---------|
| API Key 错误 | 检查 `.env` 文件中的 `LLM_API_KEY` 配置 |
| 论文下载失败 | 检查 arXiv ID 是否正确，确保网络连接正常 |
| 数据库权限问题 | 确保 `~/.arxiv-mcp/` 目录有写入权限 |
| Notion 集成不工作 | 需要单独配置 Notion MCP Server |

## 贡献指南

欢迎贡献！请遵循：
1. Fork 项目 → 创建特性分支 → 提交更改 → 推送分支 → 创建 PR
2. 使用 TypeScript，遵循 ESLint 规范
3. 添加适当的错误处理和测试
4. 保持代码简洁，避免过度设计

详细设计文档见 `docs/` 目录。

## 更新日志

### v2.0.0 (2025-10-20) - 重大重构

**架构重构**：
- 🏗️ 完全模块化设计（`index.ts` 从 1210 行 → 89 行，减少 93%）
- ✅ 向后兼容（所有工具名称和参数保持不变）
- 🧪 完整测试（单元 + 集成 + 兼容性，57 项全部通过）
- 🗜️ 智能压缩集成（所有 LLM 调用自动使用）
- 🐛 Bug 修复（作者信息、PDF 提取、Markdown 生成等）

**新增功能**：
- 📝 跨文献综述生成（≥4000字详细分析）
- 📤 综述导出工具（单篇/批量导出为 Markdown）
- 🔧 工具注册表（配置化管理）
- � 增强 LLMProvider（新增便捷方法）

### v1.0.0 (2025-10-18) - 首次发布

Fork 自 [arxiv-mcp-server](https://github.com/yzfly/arxiv-mcp-server)，新增：
- 🚀 多 LLM Provider 支持
- 🗜️ 智能压缩系统（138K → 38K tokens）
- ✨ 多源学术搜索（DBLP、OpenReview、Papers With Code）
- 📊 智能质量评估
- 📥 批量并发处理
- 📚 Notion 集成
- 💾 SQLite 数据库

完整更新日志见 [CHANGELOG.md](CHANGELOG.md)

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 支持

如果觉得这个项目有用，请给它一个 ⭐！

有问题或建议？欢迎提 [Issue](https://github.com/ydzat/literature-review-mcp/issues)！
