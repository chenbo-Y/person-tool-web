# person-tool-web (English)

This project is a local file search and media browsing tool with:

- Keyword search (file path / file content)
- Manga-style image browser (tags, notes, delete, rename)
- Video browser (streaming playback, tags, notes, delete, rename)
- Tagged overview (centralized tags, notes, rating, media-type filter)
- Task manager (task type, due time, Markdown, image paste/drag, Excel export)

## Language

- [中文](./README.zh-CN.md)
- [English](./README.en.md)
- [日本語](./README.ja.md)

## Requirements

- Node.js 18+ (Node.js 20+ recommended)

## Install

```bash
npm install
```

## Run

```bash
npm start
```

After startup, the terminal prints local URLs, for example:

- `http://127.0.0.1:3847/` (keyword search)
- `http://127.0.0.1:3847/manga.html` (image browser)
- `http://127.0.0.1:3847/video.html` (video browser)
- `http://127.0.0.1:3847/overview.html` (tagged overview)
- `http://127.0.0.1:3847/task.html` (task manager)

## Data and Logs

- Tags, notes, and ratings are stored in: `data/file-tags.json`
- Tasks and progress logs are stored in: `data/tasks.json`
- Task attachments (images/files) are stored per task under: `data/task/<taskId>/` (removed when the task is deleted)
- Legacy flat folder `data/task-assets/` is still read for old Markdown links
- Runtime logs are written to: `logs/app-YYYY-MM-DD.log`

Environment variables:

- `KW_WEB_NO_LOG=1`: disable file logging
- `KW_WEB_LOG_LEVEL=info|warn|error`: set log level

## Rating

- Rating range: `1~10`
- `0` means unrated (shown as "Unrated" in UI)
- Lists are sorted by rating in descending order by default

## Task Notes

- Task list supports filters by status, task type, and keyword
- Task detail page supports appending progress logs (rendered from Markdown)
- You can paste or drag images directly into task detail/progress input; images are uploaded and inserted as Markdown image links
- Excel export (`.xlsx`) exports the currently filtered task list

