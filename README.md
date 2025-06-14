# ArXiv MCP Server

一个基于 arXiv 的论文解读与知识整理助手。支持 Model Context Protocol (MCP) 标准，将学术论文一键转为通俗中文解读和微信公众号文章，适合自用或自动化工具集成。

## 功能亮点

* 🔍 **arXiv 论文智能搜索**：关键词检索，快速定位你关心的论文
* 📥 **一键下载 PDF**：自动获取并保存原始论文
* 📝 **中英文智能转换**：将 PDF 英文内容解析为高质量的中文 Markdown，方便笔记、归档与复用
* 📱 **微信文章生成**：自动生成适配微信阅读体验的爆款文章草稿
* 🗑️ **一键清理文件**：支持一键清空所有历史处理文件，避免空间积压
* 🤖 **AI 内容理解与重写**：依托 SiliconFlow 大模型服务，内容处理高效、自然

> 每个文件处理工具都会返回实际保存的文件名，方便你集成到任何自动化流程！

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
# 必需：SiliconFlow API Key
export SILICONFLOW_API_KEY="your_api_key_here"

# 可选：工作目录（默认为当前目录下的 DATA_DIR）
export WORK_DIR="/path/to/your/data/directory"
```

### 获取 API Key

请通过以下链接获取 SiliconFlow API Key：
[https://cloud.siliconflow.cn/i/TxUlXG3u](https://cloud.siliconflow.cn/i/TxUlXG3u)

## MCP 客户端配置

### Claude Desktop 配置

在 Claude Desktop 的配置文件中添加：

```json
{
  "mcpServers": {
    "arxiv-mcp-server": {
      "command": "npx",
      "args": ["-y", "@langgpt/arxiv-mcp-server@latest"],
      "env": {
        "SILICONFLOW_API_KEY": "your_api_key_here",
        "WORK_DIR": "/path/to/your/data/directory"
      }
    }
  }
}
```

配置文件位置：
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### 其他 MCP 客户端

对于其他支持 MCP 的客户端，请参考其文档配置 stdio 传输方式。

## 可用工具与参数

每个工具处理后都会返回保存的文件名，便于后续追踪或下载。

### 1. 搜索论文

* **工具名**: `search_arxiv`
* **参数**:

  * `query`：关键词
  * `maxResults`：返回论文数（可选，默认 5）

### 2. 下载PDF

* **工具名**: `download_arxiv_pdf`
* **参数**:

  * `input`：arXiv 论文 URL 或 arXiv ID（如：2403.15137v1）

### 3. 解析为中文Markdown

* **工具名**: `parse_pdf_to_markdown`
* **参数**:

  * `arxivId`：arXiv 论文 ID
  * `paperInfo`：论文元信息（可选，含标题/作者/摘要等）

### 4. 转换为微信文章

* **工具名**: `convert_to_wechat_article`
* **参数**:

  * `arxivId`：arXiv 论文 ID

### 5. 完整流程处理

* **工具名**: `process_arxiv_paper`
* **参数**:

  * `arxivId`：arXiv 论文 ID
  * `includeWechat`：是否生成微信文章（可选，默认 true）

### 6. 清理所有历史文件

* **工具名**: `clear_workdir`
* **参数**: 无


## 文件输出规范

所有生成文件均保存至工作目录，文件名规则如下：

* `{arxivId}.pdf`               - 原始 PDF
* `{arxivId}_text.txt`          - 英文原文解析文本
* `{arxivId}_md_zh.md`          - 中文 Markdown 解读
* `{arxivId}_wechat.md`         - 微信公众号文章
* （你可以用工具返回值直接获取这些文件名）

执行 `clear_workdir` 会**一键删除工作区全部文件**，务必谨慎操作！

## 使用流程示例

1. **搜索论文**
   使用 `search_arxiv` 工具搜索相关论文
2. **下载 PDF**
   用 `download_arxiv_pdf` 工具拉取 PDF
3. **智能解析转中文 Markdown**
   用 `parse_pdf_to_markdown` 工具生成带格式的中文文档
4. **生成微信文章**
   用 `convert_to_wechat_article` 工具自动排版生成公众号文章
5. **清理历史文件**
   用 `clear_workdir` 工具一键清空所有产出文件


## 开发指南

### 本地开发

```bash
# 克隆项目
git clone https://github.com/yzfly/arxiv-mcp-server.git
cd arxiv-mcp-server

# 安装依赖
npm install

# 设置环境变量
export SILICONFLOW_API_KEY="your_api_key"

# 开发模式运行
npm run dev

# 构建
npm run build

# 运行构建版本
npm start
```

### 项目结构

```
arxiv-mcp-server/
├── src/
│   └── index.ts          # 主服务器文件
├── build/                # 编译输出目录
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
├── README.md             # 项目说明
└── DATA_DIR/             # 默认工作目录
    ├── {arxivId}.pdf     # 下载的PDF文件
    ├── {arxivId}.md      # 中文解读
    ├── {arxivId}_wechat.md # 微信文章
    └── {arxivId}_speech.txt # 语音脚本
```

### 自定义扩展

您可以根据需要扩展以下功能：

1. **PDF解析器**：集成更强大的PDF解析库（如 pdf-parse）
2. **语音合成**：集成真实的TTS服务API
3. **更多格式**：支持导出为其他格式（如HTML、Word等）
4. **批量处理**：支持批量处理多篇论文
5. **缓存机制**：添加智能缓存以提高性能

## 技术栈

- **Node.js** >= 18.0.0
- **TypeScript** - 类型安全的JavaScript
- **Model Context Protocol** - 标准化的AI上下文协议
- **SiliconFlow API** - AI内容理解和生成
- **arXiv API** - 学术论文数据源

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

3. **工作目录权限问题**
   ```
   错误：EACCES: permission denied
   解决：确保工作目录有写入权限，或设置 WORK_DIR 到有权限的目录
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
- 添加适当的错误处理
- 编写清晰的注释和文档

## 许可证

本项目采用 MIT 许可证。详情请见 [LICENSE](LICENSE) 文件。

## 作者信息

- **作者**: yzfly
- **邮箱**: yz.liu.me@gmail.com
- **GitHub**: [https://github.com/yzfly](https://github.com/yzfly)
- **微信公众号**: 云中江树

## 更新日志

### v1.0.0 (2024-12-19)

- ✨ 初始版本发布
- 🔍 支持 arXiv 论文搜索
- 📥 支持 PDF 下载
- 📝 支持智能中文解读
- 📱 支持微信文章格式转换
- 🤖 集成 SiliconFlow AI 服务

## 相关链接

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [arXiv.org](https://arxiv.org/)
- [SiliconFlow](https://cloud.siliconflow.cn/)
- [Claude Desktop](https://claude.ai/download)

## 支持

如果您觉得这个项目有用，请给它一个 ⭐！

如有问题或建议，请通过以下方式联系：

- 📧 邮箱：yz.liu.me@gmail.com
- 🐛 GitHub Issues：[项目问题追踪](https://github.com/yzfly/arxiv-mcp-server/issues)
- 💬 GitHub Discussions：[项目讨论区](https://github.com/yzfly/arxiv-mcp-server/discussions)