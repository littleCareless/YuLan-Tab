# 技术背景

## 技术栈

### 核心框架与库
- **WXT**: 用于Chrome扩展开发的现代化框架，简化了扩展开发流程
- **React 19**: 用于构建用户界面的JavaScript库，特别是侧边面板的设置界面
- **TypeScript**: 为JavaScript添加静态类型定义，提高代码质量和开发效率

### 浏览器API
- **Chrome Extension API**: 基于Manifest V3规范，包括：
  - `browser.runtime`: 用于后台脚本通信和消息传递
  - `browser.storage`: 用于存储用户设置
  - `browser.commands`: 用于处理快捷键命令
  - `browser.tabs`: 用于与浏览器标签页交互

## 开发环境

### 开发工具
- **Node.js**: JavaScript运行环境
- **npm**: 包管理工具
- **WXT CLI**: 用于构建、测试和打包Chrome扩展

### 开发流程
1. 使用`npm run dev`启动开发服务器
2. 在Chrome中加载`.wxt/chrome/`目录作为未打包扩展
3. 使用`npm run build`构建生产版本

## 技术约束

### Manifest V3限制
- 不支持长时间运行的后台脚本，需要使用事件驱动模型
- 内容脚本的权限受限，需要通过消息传递与后台脚本通信
- 跨域资源访问受限，预览功能需要考虑同源策略限制

### 浏览器兼容性
- 主要针对Chrome浏览器开发
- 可选支持Firefox，但需要考虑API差异

## 依赖关系

### 主要依赖
- `react`: ^19.1.0
- `react-dom`: ^19.1.0
- `@wxt-dev/module-react`: ^1.1.3
- `typescript`: ^5.8.3
- `wxt`: ^0.20.0

### 构建脚本
- `dev`: 启动开发服务器
- `dev:firefox`: 针对Firefox启动开发服务器
- `build`: 构建Chrome扩展
- `build:firefox`: 构建Firefox扩展
- `zip`: 打包Chrome扩展
- `zip:firefox`: 打包Firefox扩展