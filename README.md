# 系列日记漫画生成器 / Series Comic Generator

这个项目已经安装了 GitHub 上的 `recurring-character-diary-comic` 技能包：

This project includes the `recurring-character-diary-comic` skill package:

```text
skills/recurring-character-diary-comic/
```

它适合做固定原创角色的日记漫画工作流：锁定角色、故事节拍、精确对白、页面结构、QA 和确定性加字。它不是完整网页应用，也不自带图像模型。

It is useful for recurring-character diary comic workflows: character continuity, story beats, dialogue/narration records, page planning, QA, and optional deterministic lettering. It is not a complete image-generation app by itself.

本目录额外提供了一个本地静态工具：

```text
index.html
styles.css
app.js
```

直接打开 `index.html` 即可使用。现在可以只输入故事，或点击“读取 TXT”加载 `.txt` 文件，然后分别点击：

Open `index.html` directly. You can paste a story or load a `.txt` file, then use:

- “角色分析”：自动推断主角、场景、关键道具和连续性要求；
- “对白提取”：从引号和短句中提取对白，可手动修正；
- “分镜”：生成 4-8 格分镜、页面结构预览和完整提示词。
- “图片任务”：生成一组可交给 Codex 图像生成功能的批量指令和逐张提示词。

- “角色分析 / Character”: detects the protagonist, setting, key props, and continuity notes.
- “对白提取 / Dialogue”: extracts dialogue/narration for audio and subtitles.
- “分镜 / Storyboard”: creates 4-8 visual beats and prompt material.
- “图片任务 / Images”: creates image-generation prompts for Codex image generation.

工具会生成：

- 4-8 格分镜；
- 页面结构预览；
- 可复制给图像模型的整页漫画提示词；
- 多语种有声书友好的无文字图片提示词；
- 输出布局设置，默认生成 `5 合 1 分镜漫画页`；
- 生成平台设置，可选择 `ChatGPT 网页版长提示词` 或 `Codex 批量指令`；
- 亮度设置，默认使用更适合手机/YouTube 视频的明亮可读画面；
- 延续系列用的 JSON 合同；
- localStorage 保存的剧集历史；
- 可下载的 `.comic.json` 文件。
- Codex 图片生成任务包。

- text-free prompts for multilingual audiobook images;
- output layout control, defaulting to a `5-in-1 comic page`;
- prompt target control for `ChatGPT Web detailed prompts` or `Codex batch instruction`;
- brightness control, defaulting to a brighter video-ready look for mobile and YouTube;
- JSON contracts for continuity;
- Codex image-generation task packs.

默认画幅面向视频制作：

- 手机竖版：`1080x1920`，适合 Shorts、Reels、TikTok 等竖屏视频；
- YouTube 横版：`1920x1080`，适合 16:9 横屏有声书视频；
- 方版封面：`1080x1080`，适合封面或社交预览。

Default video formats:

- Mobile vertical: `1080x1920`, for Shorts, Reels, TikTok, and phone-first videos.
- YouTube landscape: `1920x1080`, for 16:9 audiobook videos.
- Square cover: `1080x1080`, for covers and social previews.

## 图片文字与亮度 / Text And Brightness

图片任务默认禁止画面内文字：不要标题、对白气泡、字幕、招牌、手机屏幕文字、水印或 logo。对白和旁白只保留在 JSON 中，用于后期多语种配音和字幕。

Image prompts are text-free by default: no titles, speech bubbles, subtitles, signs, phone-screen text, watermarks, or logos. Dialogue and narration stay in JSON for later multilingual dubbing and subtitles.

亮度可选：

- 明亮可读 / Brighter video-ready：默认选项，减少大片死黑，适合视频观看；
- 标准平衡 / Balanced：保留电影感，暗部仍有细节；
- 偏暗悬疑 / Dark suspense：更暗，但仍要求主体和关键动作可见。

## 生成平台 / Prompt Target

如果要在网页版 ChatGPT 里生成图片，选择 `ChatGPT 网页版长提示词 / ChatGPT Web detailed prompts`。这个模式会输出更长、更完整、可逐张复制的提示词，包含画幅、角色连续性、5 合 1 分镜布局、无文字规则、亮度要求和输出前检查。

If you will generate images in ChatGPT Web, choose `ChatGPT Web detailed prompts`. This creates longer prompts that can be copied one by one, including canvas, character continuity, 5-in-1 page layout, no-text rules, brightness, and quality checks.

## 关于真正生成图片

静态网页不能直接调用 Codex 内置的 `image_gen` 工具。当前可用路线有两种：

1. 在网页里点“图片任务”，复制 Codex 批量指令，然后发给当前 Codex 聊天；Codex 会用内置图像生成工具生成图片。
2. 如果要网页按钮自己一键出图，需要增加本地后端，并接 OpenAI Images API 和 `OPENAI_API_KEY`。

可选拼版器自测已通过：

```sh
python skills/recurring-character-diary-comic/scripts/self_test_compositor.py
```

如果后续要真正“自动出图”，建议路线是：

1. 用本地网页生成分镜和整页提示词。
2. 用 Codex/ImageGen 或 OpenAI Images API 生成一张完整无字图片。
3. 对白和旁白保留在导出的 JSON 中，后续用于葡萄牙语、英语、中文等多语种配音或字幕，不写入图片画面。
