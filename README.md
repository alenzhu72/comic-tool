# 系列日记漫画生成器

这个项目已经安装了 GitHub 上的 `recurring-character-diary-comic` 技能包：

```text
skills/recurring-character-diary-comic/
```

它适合做固定原创角色的日记漫画工作流：锁定角色、故事节拍、精确对白、页面结构、QA 和确定性加字。它不是完整网页应用，也不自带图像模型。

本目录额外提供了一个本地静态工具：

```text
index.html
styles.css
app.js
```

直接打开 `index.html` 即可使用。现在可以只输入故事，或点击“读取 TXT”加载 `.txt` 文件，然后分别点击：

- “角色分析”：自动推断主角、场景、关键道具和连续性要求；
- “对白提取”：从引号和短句中提取对白，可手动修正；
- “分镜”：生成 4-8 格分镜、页面结构预览和完整提示词。
- “图片任务”：生成一组可交给 Codex 图像生成功能的批量指令和逐张提示词。

工具会生成：

- 4-8 格分镜；
- 页面结构预览；
- 可复制给图像模型的整页漫画提示词；
- 延续系列用的 JSON 合同；
- localStorage 保存的剧集历史；
- 可下载的 `.comic.json` 文件。
- Codex 图片生成任务包。

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
2. 用 Codex/ImageGen 或 OpenAI Images API 生成一张完整无字页或带字页。
3. 若中文对白不准，使用技能包里的 `compose_panels.py` 对无字整页做确定性加字。
