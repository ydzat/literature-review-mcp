# 发布检查清单

## 📋 发布前准备

### 1. ✅ 项目信息已更新

- [x] **包名**：`@ydzat/literature-review-mcp`
- [x] **版本号**：`1.0.0`
- [x] **作者信息**：ydzat (ydzat@live.com)
- [x] **仓库地址**：https://github.com/ydzat/literature-review-mcp.git
- [x] **bin 命令**：`literature-review-mcp`

### 2. ✅ 文档已更新

- [x] **README.md**：
  - 添加致谢部分
  - 更新包名和安装命令
  - 更新 MCP 配置示例
  - 更新功能亮点（智能压缩、多 LLM Provider）
  - 更新更新日志（v1.0.0）
  
- [x] **.env.example**：
  - 完整的环境变量说明
  - 多个 Provider 配置示例
  - 已知模型列表
  - 智能压缩功能说明

- [x] **mcp-local-config-example.json**：
  - NPX 方式配置示例
  - 本地开发配置示例
  - 多个 Provider 示例

### 3. ✅ 代码已准备

- [x] **编译成功**：`npm run build` 无错误
- [x] **测试通过**：端到端测试成功（5/5 论文分析成功）
- [x] **依赖完整**：所有依赖已安装

### 4. ⚠️ 待完成项

- [ ] **LICENSE 文件**：确认 MIT 许可证内容正确
- [ ] **npm 账号**：确认已登录 npm（`npm whoami`）
- [ ] **GitHub 仓库**：确认仓库已创建并推送代码
- [ ] **npm 组织**：确认 `@ydzat` 组织已创建（或使用个人账号）

---

## 🚀 发布步骤

### 步骤 1：检查 npm 登录状态

```bash
npm whoami
```

如果未登录，执行：
```bash
npm login
```

### 步骤 2：创建 npm 组织（如果使用 @ydzat 命名空间）

访问：https://www.npmjs.com/org/create

或者使用个人账号发布（修改 package.json 中的 name 为 `literature-review-mcp`）

### 步骤 3：确认 LICENSE 文件

检查 LICENSE 文件是否存在，如果不存在，创建 MIT 许可证：

```bash
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025 ydzat

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

### 步骤 4：推送代码到 GitHub

```bash
# 添加远程仓库（如果还没有）
git remote add origin https://github.com/ydzat/literature-review-mcp.git

# 提交所有更改
git add .
git commit -m "chore: prepare for v1.0.0 release"

# 推送到 GitHub
git push -u origin main
```

### 步骤 5：构建项目

```bash
npm run build
```

### 步骤 6：发布到 npm

```bash
# 发布（首次发布）
npm publish --access public

# 如果需要发布 beta 版本
# npm publish --tag beta --access public
```

### 步骤 7：验证发布

```bash
# 检查包是否已发布
npm view @ydzat/literature-review-mcp

# 测试安装
npx @ydzat/literature-review-mcp@latest --help
```

---

## 📝 发布后任务

### 1. 创建 GitHub Release

1. 访问：https://github.com/ydzat/literature-review-mcp/releases/new
2. 标签：`v1.0.0`
3. 标题：`v1.0.0 - 首次独立发布`
4. 描述：复制 README.md 中的更新日志内容

### 2. 更新 README badges

确认 npm badge 链接正确：
```markdown
[![npm version](https://badge.fury.io/js/%40ydzat%2Fliterature-review-mcp.svg)](https://www.npmjs.com/package/@ydzat/literature-review-mcp)
```

### 3. 社区推广（可选）

- 在原项目 Issue 中感谢并分享你的 Fork 版本
- 在相关社区（Reddit, Twitter, 知乎）分享
- 撰写博客文章介绍项目

---

## ⚠️ 常见问题

### Q1: npm 组织不存在怎么办？

**方案 A**：创建 `@ydzat` 组织
- 访问：https://www.npmjs.com/org/create
- 创建组织名：`ydzat`

**方案 B**：使用个人账号发布
- 修改 `package.json` 中的 `name` 为 `literature-review-mcp`（不带 @ydzat）
- 修改 README.md 中所有相关引用

### Q2: 发布失败 "You do not have permission to publish"

确保：
1. 已登录正确的 npm 账号（`npm whoami`）
2. 包名没有被占用（`npm view @ydzat/literature-review-mcp`）
3. 如果使用组织，确保你是组织成员

### Q3: 如何撤销发布？

```bash
# 撤销特定版本（发布后 72 小时内）
npm unpublish @ydzat/literature-review-mcp@1.0.0

# 撤销整个包（慎用！）
npm unpublish @ydzat/literature-review-mcp --force
```

### Q4: 如何发布补丁版本？

```bash
# 修改代码后
npm version patch  # 1.0.0 -> 1.0.1
npm run build
npm publish
git push --tags
```

---

## 📚 参考资源

- [npm 发布指南](https://docs.npmjs.com/cli/v8/commands/npm-publish)
- [语义化版本](https://semver.org/lang/zh-CN/)
- [npm 组织管理](https://docs.npmjs.com/orgs/)
- [GitHub Release 指南](https://docs.github.com/en/repositories/releasing-projects-on-github)

---

## ✅ 发布完成确认

发布成功后，确认以下内容：

- [ ] npm 包页面可访问：https://www.npmjs.com/package/@ydzat/literature-review-mcp
- [ ] `npx @ydzat/literature-review-mcp@latest` 可正常运行
- [ ] GitHub Release 已创建
- [ ] README badges 显示正确
- [ ] 文档链接都可访问

**恭喜！🎉 你的项目已成功发布！**

