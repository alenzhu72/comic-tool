const $ = (selector) => document.querySelector(selector);

const state = {
  latest: null,
  history: JSON.parse(localStorage.getItem("comicSeriesHistory") || "[]"),
  characterAnalysis: null,
  dialogueAnalysis: [],
};

const formIds = [
  "seriesTitle",
  "characterProfile",
  "storyInput",
  "panelCount",
  "episodeCount",
  "pageSize",
  "visualStyle",
  "dialogueInput",
];

const pronouns = new Set(["他", "她", "它", "他们", "她们", "我", "你", "我们", "主角"]);
const commonVerbs = ["说", "想", "看", "拿", "放", "走", "跑", "坐", "站", "笑", "哭", "问", "回", "买", "吃", "喝", "穿", "打开", "关上"];

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[。！？!?；;])|(?<=\.)\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getStoryText() {
  return $("#storyInput").value.trim();
}

function unique(values) {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

function guessNames(text) {
  const quotedSpeakers = [...text.matchAll(/([^\s，。、“”‘’：:]{1,8})\s*[：:]\s*[“"「]?/g)].map((match) => match[1]);
  const beforeAction = [...text.matchAll(/([一-龥A-Za-z][一-龥A-Za-z0-9·]{0,7})(?:为了|正在|一边|突然|发现|觉得|把|对|向|说|问|想|看见|听见)/g)].map((match) => match[1]);
  const candidates = unique([...quotedSpeakers, ...beforeAction]).filter((name) => !pronouns.has(name) && !commonVerbs.includes(name));
  return candidates.length ? candidates.slice(0, 4) : ["主角"];
}

function guessProps(text) {
  const objectMatches = [...text.matchAll(/(?:把|拿起|放下|带着|打开|关上|跨过|看着|收到|忘带)([^，。！？；、\s]{1,10})/g)].map((match) => match[1]);
  const nounHints = ["手机", "饭盒", "门", "门口", "鞋", "包", "钥匙", "杯子", "纸条", "电脑", "书", "伞", "外套", "电梯", "消息"];
  const hinted = nounHints.filter((item) => text.includes(item));
  return unique([...objectMatches, ...hinted]).slice(0, 8);
}

function guessSetting(text) {
  const places = ["家门口", "厨房", "客厅", "卧室", "办公室", "电梯", "公交站", "街边", "学校", "咖啡店"];
  const found = places.find((place) => text.includes(place.replace("家", "")) || text.includes(place));
  if (found) return found;
  if (text.includes("出门") || text.includes("门口") || text.includes("换鞋")) return "家门口或玄关";
  return "日常生活场景";
}

function analyzeCharacters() {
  const analysis = deriveCharacterAnalysis(getStoryText());
  state.characterAnalysis = analysis;
  $("#characterProfile").value = analysis.profile;
  renderAnalysis();
  generate(false);
  activateTab("analysis");
}

function deriveCharacterAnalysis(story) {
  const names = guessNames(story);
  const props = guessProps(story);
  const setting = guessSetting(story);
  const lead = names[0];
  return {
    lead,
    supporting: names.slice(1),
    setting,
    props,
    profile: `原创角色：${lead}。从故事自动推断：主要行动者，出现在 ${setting}。性格倾向：目标明确，但在日常细节上容易被打断或产生反差。关键道具：${props.length ? props.join("、") : "待补充"}。禁止漂移：每一格保持同一个角色身份、发型、服装、体型和随身物；如果没有角色参考图，不要把第一次随机长相当成长期设定。`,
  };
}

function extractDialogue() {
  const dialogue = deriveDialogue(getStoryText());
  state.dialogueAnalysis = dialogue;
  $("#dialogueInput").value = dialogue.map((line) => `${line.speaker}：${line.text}`).join("\n");
  renderAnalysis();
  generate(false);
  activateTab("analysis");
}

function deriveDialogue(story) {
  const names = guessNames(story);
  const lead = state.characterAnalysis?.lead || names[0] || "主角";
  const matches = [
    ...story.matchAll(/([^“”"「」]{0,8})(?:说|问|喊|嘀咕|想着|心想)?[：:，,]?[“"「](.*?)[”"」]/g),
  ];
  const dialogue = matches.map((match, index) => {
    const speakerHint = match[1].replace(/[，。,：:\s]/g, "");
    const speaker = names.includes(speakerHint) ? speakerHint : lead;
    return { id: `line-${index + 1}`, speaker, text: match[2].trim() };
  });
  if (!dialogue.length) {
    const shortSentences = splitSentences(story).filter((sentence) => sentence.length <= 24);
    if (shortSentences.length) {
      dialogue.push({ id: "line-1", speaker: lead, text: shortSentences[0].replace(/[。！？!?]$/, "") });
    }
  }
  return dialogue;
}

function parseDialogue(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split(/[:：]/);
      if (parts.length >= 2) {
        return { id: `line-${index + 1}`, speaker: parts[0].trim(), text: parts.slice(1).join("：").trim() };
      }
      return { id: `line-${index + 1}`, speaker: "旁白", text: line };
    });
}

function extractCharacterName(profile) {
  const match = profile.match(/(?:角色|主角|原创角色)[:：]?\s*([^，。,.\n]+)/);
  return state.characterAnalysis?.lead || (match ? match[1].trim() : guessNames(getStoryText())[0]);
}

function makeBeats(story, panelCount, dialogue) {
  const sentences = splitSentences(story);
  const fallback = story.trim() || "一个很小的日常瞬间被主角认真对待，最后出现轻微反差。";
  const assigned = assignSentencesToPanels(sentences.length ? sentences : [fallback], panelCount);
  const beats = [];
  for (let index = 0; index < panelCount; index += 1) {
    const source = assigned[index] || fallback;
    const role = index === 0 ? "开场" : index === panelCount - 1 ? "落点" : index === panelCount - 2 ? "转折" : "推进";
    const line = dialogue[index] || (index === 0 ? dialogue[0] : null);
    beats.push({
      id: `p${index + 1}`,
      role,
      action: source,
      camera: chooseCamera(index, panelCount),
      dialogue: line ? `${line.speaker}：${line.text}` : "",
      state: chooseState(index, panelCount),
      risk: index === panelCount - 2 ? "S0：关键因果、手物关系、跨格状态" : index === panelCount - 1 ? "S0：最终状态必须清楚" : "S2：构图可替换",
    });
  }
  return beats;
}

function assignSentencesToPanels(sentences, panelCount) {
  if (sentences.length === panelCount) return sentences;
  if (sentences.length > panelCount) {
    const grouped = Array.from({ length: panelCount }, () => []);
    sentences.forEach((sentence, index) => {
      const slot = Math.min(panelCount - 1, Math.floor((index / sentences.length) * panelCount));
      grouped[slot].push(sentence);
    });
    return grouped.map((items) => items.join(""));
  }
  const result = [];
  const arc = ["建立角色、环境和目标。", "出现干扰或第一次偏离。", "动作继续，关键道具位置发生变化。", "反差开始显露。", "最终状态和角色反应同时出现。"];
  for (let index = 0; index < panelCount; index += 1) {
    result.push(sentences[index] || arc[Math.min(index, arc.length - 1)]);
  }
  return result;
}

function chooseCamera(index, total) {
  if (index === 0) return "中景建立环境，角色和关键道具同时可见";
  if (index === total - 1) return "稍远的静止镜头，留出反应和余味";
  if (index === total - 2) return "近景强调动作证据，手、道具、方向必须清楚";
  return index % 2 ? "半身侧面，保留阅读方向" : "俯视小景，突出物体位置变化";
}

function chooseState(index, total) {
  if (index === 0) return "角色身份完整出现，道具进入画面";
  if (index === total - 1) return "动作后果已经发生，角色反应明确";
  return "延续上一格状态，只改变一个关键变量";
}

function makeLayouts(panelCount) {
  return [
    {
      id: "structure-a",
      name: "共享边界马赛克",
      reason: "节奏均衡，适合清楚交代一连串日常动作。",
      frames: buildFrames(panelCount, "mosaic"),
    },
    {
      id: "structure-b",
      name: "大转折格加反应格",
      reason: "把倒数第二格作为视觉锚点，让笑点或转折更强。",
      frames: buildFrames(panelCount, "anchor"),
    },
    {
      id: "structure-c",
      name: "开放结尾",
      reason: "最后一格留白更多，适合安静、尴尬或自嘲式落点。",
      frames: buildFrames(panelCount, "open"),
    },
  ];
}

function buildFrames(count, mode) {
  const frames = [];
  const gutter = 28;
  const w = 1200;
  const h = 1600;
  if (mode === "anchor" && count >= 5) {
    frames.push([gutter, gutter, 548, 330], [624, gutter, 548, 330]);
    frames.push([gutter, 386, 1144, 554]);
    const bottomCount = count - 3;
    const bottomW = (1144 - gutter * (bottomCount - 1)) / bottomCount;
    for (let i = 0; i < bottomCount; i += 1) frames.push([gutter + i * (bottomW + gutter), 968, bottomW, 604]);
    return frames.slice(0, count);
  }
  if (mode === "open") {
    const topCount = Math.max(2, count - 1);
    const rowH = 240;
    for (let i = 0; i < topCount; i += 1) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      frames.push([gutter + col * 586, gutter + row * (rowH + gutter), 558, rowH]);
    }
    frames.push([gutter, h - 520, w - gutter * 2, 492]);
    return frames.slice(0, count);
  }
  const rows = Math.ceil(count / 2);
  const frameH = (h - gutter * (rows + 1)) / rows;
  for (let i = 0; i < count; i += 1) {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const colsInRow = i === count - 1 && count % 2 ? 1 : 2;
    const frameW = colsInRow === 1 ? w - gutter * 2 : (w - gutter * 3) / 2;
    frames.push([gutter + col * (frameW + gutter), gutter + row * (frameH + gutter), frameW, frameH]);
  }
  return frames;
}

function buildPrompt(data) {
  const lines = data.beats
    .map((beat, index) => `${index + 1}. ${beat.role}：${beat.action}；镜头：${beat.camera}${beat.dialogue ? `；对白：${beat.dialogue}` : ""}`)
    .join("\n");
  return `生成一页完整的系列日记漫画，不要拆成独立插图。\n\n固定角色：${data.characterProfile}\n\n画面风格：${data.visualStyle}\n页面尺寸：${data.pageSize}\n选定结构：${data.selectedLayout.name}\n\n分镜：\n${lines}\n\n要求：保持角色脸、发型、服装、随身物一致；只出现锁定对白；气泡归属清楚；关键道具的位置变化可见；不要添加水印、logo、无关文字或受版权保护的角色。`;
}

function buildImageJobs(data) {
  const widthHeight = data.pageSize.split("x").map(Number);
  const basePrompt = buildPrompt(data);
  const imageCount = Math.max(1, Math.min(12, Number($("#episodeCount").value) || 1));
  const jobs = [];
  for (let index = 0; index < imageCount; index += 1) {
    const episodeNumber = index + 1;
    const continuityLine =
      episodeNumber === 1
        ? "这是系列第一张，建立固定角色外观和页面语言。"
        : `这是同一系列第 ${episodeNumber} 张，必须延续第 1 张的角色身份、线稿、上色和气泡语言。`;
    jobs.push({
      id: `image-${String(episodeNumber).padStart(2, "0")}`,
      filename: `${slugify(data.seriesTitle)}-${String(episodeNumber).padStart(2, "0")}.png`,
      size: data.pageSize,
      prompt: `${basePrompt}\n\n系列连续性：${continuityLine}\n输出：一张完整漫画页面，尺寸比例 ${widthHeight[0]}:${widthHeight[1]}，不要只给单格，不要给流程图。`,
    });
  }
  return jobs;
}

function buildCodexInstruction(data) {
  const jobList = data.imageJobs
    .map((job) => `- ${job.filename}: ${job.prompt.replace(/\n+/g, " ").slice(0, 420)}...`)
    .join("\n");
  return `请使用 Codex 内置 image_gen 为我生成这一组系列漫画图片，并把最终图片保存到当前项目的 output/images/ 目录。先生成第 1 张作为角色和风格锚点；后续图片必须延续同一角色身份、页面风格、线稿和配色。\n\n${jobList}`;
}

function buildContract(data) {
  return {
    contract_version: "comic-tool-v1",
    series_title: data.seriesTitle,
    artifact_type: "recurring-character-diary-comic",
    page_size: data.pageSize,
    production_route: "page-native",
    image_output: {
      mode: "codex-imagegen-task-pack",
      count: data.imageJobs?.length || 0,
      note: "静态网页不能直接调用 Codex 内置 image_gen；把 imageJobs 交给 Codex 聊天或接入 OpenAI Images API 后端。",
    },
    story_source: data.story,
    analysis: {
      lead: data.characterName,
      props: state.characterAnalysis?.props || [],
      setting: state.characterAnalysis?.setting || "未分析",
      extracted_dialogue_count: data.dialogue.length,
    },
    character_profile: data.characterProfile,
    selected_strategy: data.selectedLayout.id,
    layout_candidates: data.layouts.map((layout) => ({ id: layout.id, name: layout.name, reason: layout.reason })),
    panels: data.beats.map((beat) => ({
      id: beat.id,
      beat: beat.action,
      camera: beat.camera,
      dialogue: beat.dialogue,
      continuity_state: beat.state,
      risk: beat.risk,
    })),
    global_rules: [
      "保持固定角色身份不漂移",
      "最终页只包含已锁定对白",
      "关键道具、手部、方向和最终状态必须可见",
      "公开发布前必须人工验收原始尺寸和 25% 缩略图",
    ],
  };
}

function collectData() {
  if (!$("#characterProfile").value.trim()) {
    state.characterAnalysis = deriveCharacterAnalysis(getStoryText());
    $("#characterProfile").value = state.characterAnalysis.profile;
  }
  if (!$("#dialogueInput").value.trim()) {
    state.dialogueAnalysis = deriveDialogue(getStoryText());
    $("#dialogueInput").value = state.dialogueAnalysis.map((line) => `${line.speaker}：${line.text}`).join("\n");
  }
  const panelCount = Math.max(4, Math.min(8, Number($("#panelCount").value) || 5));
  const dialogue = parseDialogue($("#dialogueInput").value);
  const layouts = makeLayouts(panelCount);
  const selectedLayout = layouts[panelCount >= 5 ? 1 : 0];
  const data = {
    id: makeId(),
    createdAt: new Date().toISOString(),
    seriesTitle: $("#seriesTitle").value.trim() || "未命名系列",
    characterProfile: $("#characterProfile").value.trim(),
    characterName: extractCharacterName($("#characterProfile").value),
    story: $("#storyInput").value.trim(),
    panelCount,
    episodeCount: Math.max(1, Math.min(12, Number($("#episodeCount").value) || 1)),
    pageSize: $("#pageSize").value,
    visualStyle: $("#visualStyle").value,
    dialogue,
    layouts,
    selectedLayout,
  };
  data.beats = makeBeats(data.story, data.panelCount, data.dialogue);
  data.prompt = buildPrompt(data);
  data.imageJobs = buildImageJobs(data);
  data.codexInstruction = buildCodexInstruction(data);
  data.contract = buildContract(data);
  return data;
}

function makeId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `episode-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function drawPreview(data) {
  const canvas = $("#pageCanvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fffdf8";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#202124";
  ctx.font = "700 38px Microsoft YaHei, sans-serif";
  ctx.fillText(data.seriesTitle, 44, 76);
  const palette = ["#d9e8f5", "#e7ddd4", "#dceadd", "#f0dfeb", "#f3e7c8", "#dce2ec", "#e8ded9", "#d8ebe7"];
  data.selectedLayout.frames.forEach((frame, index) => {
    const [x, y, w, h] = frame;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = palette[index % palette.length];
    ctx.strokeStyle = "#202124";
    ctx.lineWidth = 5;
    roundRect(ctx, 0, 0, w, h, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.beginPath();
    ctx.arc(w * 0.28, h * 0.52, Math.min(w, h) * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#202124";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#202124";
    ctx.font = "700 30px Microsoft YaHei, sans-serif";
    ctx.fillText(`P${index + 1}`, 24, 42);
    ctx.font = "24px Microsoft YaHei, sans-serif";
    wrapText(ctx, data.beats[index]?.role || "", 24, h - 62, w - 48, 30);
    ctx.restore();
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const chars = text.split("");
  let line = "";
  for (const char of chars) {
    const test = line + char;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = char;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

function renderViews(data) {
  $("#beatsView").innerHTML = `<div class="beat-grid">${data.beats
    .map(
      (beat) => `<article class="beat-card">
        <h3>${beat.id.toUpperCase()} · ${beat.role}</h3>
        <p>${escapeHtml(beat.action)}</p>
        <p>${escapeHtml(beat.camera)}</p>
        <p>${escapeHtml(beat.dialogue || "无对白")}</p>
        <p class="small">${escapeHtml(beat.risk)}</p>
      </article>`,
    )
    .join("")}</div>`;
  $("#promptView").innerHTML = `<pre>${escapeHtml(data.prompt)}</pre>`;
  renderImageJobs(data);
  $("#contractView").innerHTML = `<pre>${escapeHtml(JSON.stringify(data.contract, null, 2))}</pre>`;
  renderAnalysis();
  renderHistory();
}

function renderImageJobs(data) {
  $("#imagesView").innerHTML = `<div class="image-job-layout">
    <div class="job-actions">
      <button type="button" id="copyCodexBtn">复制 Codex 批量指令</button>
      <button type="button" id="copyFirstPromptBtn">复制第 1 张提示词</button>
    </div>
    <pre>${escapeHtml(data.codexInstruction)}</pre>
    <div class="beat-grid">${data.imageJobs
      .map(
        (job) => `<article class="beat-card">
          <h3>${escapeHtml(job.filename)}</h3>
          <p class="small">${escapeHtml(job.size)}</p>
          <p>${escapeHtml(job.prompt)}</p>
        </article>`,
      )
      .join("")}</div>
  </div>`;
  $("#copyCodexBtn").addEventListener("click", () => copyText(data.codexInstruction));
  $("#copyFirstPromptBtn").addEventListener("click", () => copyText(data.imageJobs[0]?.prompt || data.prompt));
}

function renderAnalysis() {
  const analysis = state.characterAnalysis;
  const dialogue = parseDialogue($("#dialogueInput").value);
  $("#analysisView").innerHTML = `<div class="beat-grid">
    <article class="beat-card">
      <h3>角色</h3>
      <p>${escapeHtml(analysis?.profile || "尚未分析。")}</p>
    </article>
    <article class="beat-card">
      <h3>道具与场景</h3>
      <p>场景：${escapeHtml(analysis?.setting || "未识别")}</p>
      <p>道具：${escapeHtml((analysis?.props || []).join("、") || "未识别")}</p>
    </article>
    <article class="beat-card">
      <h3>对白</h3>
      <p>${escapeHtml(dialogue.length ? dialogue.map((line) => `${line.speaker}：${line.text}`).join(" / ") : "未提取")}</p>
    </article>
  </div>`;
}

function renderHistory() {
  if (!state.history.length) {
    $("#historyView").innerHTML = `<p class="small">还没有保存的剧集。</p>`;
    return;
  }
  $("#historyView").innerHTML = `<div class="history-list">${state.history
    .map(
      (item) => `<div class="history-item">
        <div>
          <strong>${escapeHtml(item.seriesTitle)}</strong>
          <div class="small">${new Date(item.createdAt).toLocaleString()} · ${item.panelCount} 格 · ${escapeHtml(item.characterName)}</div>
        </div>
        <button type="button" data-load="${item.id}">载入</button>
      </div>`,
    )
    .join("")}</div>`;
  document.querySelectorAll("[data-load]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = state.history.find((entry) => entry.id === button.dataset.load);
      if (item) {
        state.latest = item;
        drawPreview(item);
        renderViews(item);
        activateTab("beats");
      }
    });
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function generate(openBeats = true) {
  state.latest = collectData();
  drawPreview(state.latest);
  renderViews(state.latest);
  if (openBeats) activateTab("beats");
}

function saveEpisode() {
  if (!state.latest) generate();
  state.history = [state.latest, ...state.history.filter((item) => item.id !== state.latest.id)].slice(0, 30);
  localStorage.setItem("comicSeriesHistory", JSON.stringify(state.history));
  renderHistory();
  activateTab("history");
}

function exportLatest() {
  if (!state.latest) generate();
  const blob = new Blob([JSON.stringify(state.latest, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.latest.seriesTitle.replace(/[^\p{L}\p{N}-]+/gu, "-")}.comic.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function slugify(value) {
  return String(value || "comic")
    .trim()
    .replace(/[^\p{L}\p{N}-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "comic";
}

function activateTab(name) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
  document.querySelectorAll(".tab-view").forEach((view) => view.classList.remove("active"));
  $(`#${name}View`).classList.add("active");
}

$("#analyzeBtn").addEventListener("click", analyzeCharacters);
$("#dialogueBtn").addEventListener("click", extractDialogue);
$("#storyboardBtn").addEventListener("click", () => generate(true));
$("#imageJobsBtn").addEventListener("click", () => {
  generate(false);
  activateTab("images");
});
$("#saveBtn").addEventListener("click", saveEpisode);
$("#exportBtn").addEventListener("click", exportLatest);
document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => activateTab(tab.dataset.tab)));
formIds.forEach((id) => $(`#${id}`).addEventListener("change", () => generate(false)));
$("#storyFile").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  $("#storyInput").value = await file.text();
  $("#fileStatus").textContent = `已读取：${file.name}`;
  $("#characterProfile").value = "";
  $("#dialogueInput").value = "";
  state.characterAnalysis = null;
  state.dialogueAnalysis = [];
  analyzeCharacters();
  extractDialogue();
  generate(true);
});

generate();
