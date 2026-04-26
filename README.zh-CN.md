# person-tool-web（中文）

本项目是一个本地可运行的文件检索与浏览工具，提供：

- 关键字搜索（路径名 / 文件内容）
- 漫画式图片浏览（标签、备注、删除、重命名）
- 视频浏览（流式播放、标签、备注、删除、重命名）
- 标注一览（统一查看标签、备注、评分、类型筛选）
- 任务管理（任务类型、截止时间、Markdown、图片粘贴/拖拽、导出 Excel）

## 语言切换

- [中文](./README.zh-CN.md)
- [English](./README.en.md)
- [日本語](./README.ja.md)

## 环境要求

- Node.js 18+（推荐 Node.js 20+）

## 安装

```bash
npm install
```

## 启动

```bash
npm start
```

启动后终端会输出本地访问地址，例如：

- `http://127.0.0.1:3847/`（关键字搜索）
- `http://127.0.0.1:3847/manga.html`（漫画图片浏览）
- `http://127.0.0.1:3847/video.html`（视频浏览）
- `http://127.0.0.1:3847/overview.html`（标注一览）
- `http://127.0.0.1:3847/task.html`（任务管理）

## 数据与日志

- 标签、备注、评分保存在：`data/file-tags.json`
- 任务与进展保存在：`data/tasks.json`
- 任务详情图片保存在：`data/task-assets/`
- 运行日志输出到：`logs/app-YYYY-MM-DD.log`

可通过环境变量控制日志：

- `KW_WEB_NO_LOG=1`：关闭文件日志
- `KW_WEB_LOG_LEVEL=info|warn|error`：设置日志级别

## 评分说明

- 评分范围：`1~10`
- `0` 代表未评分（界面中显示“未评”）
- 列表默认按评分从高到低排序

## Task 功能说明

- 任务列表支持按状态、任务类型、关键词筛选
- 任务详情支持追加“进展记录”（Markdown 渲染）
- 在任务详细/进展输入框中可直接粘贴图片或拖拽图片，系统会自动上传并插入 Markdown 图片链接
- 导出 Excel 会按“当前筛选结果”导出（`.xlsx`）

