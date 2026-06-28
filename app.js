const DEFAULT_RULES = [
  "rostro,cara,piel,cuerpo: cuerpo",
  "mano,gesto,toque,tacto: contacto",
  "luz,neon,laser,brillo: luz",
  "agua,mar,liquido,niebla: fluido",
  "ruido,glitch,error,scan: ruido",
  "texto,nota,frase,palabra: texto",
  "ciudad,calle,maquina,cable: maquina",
  "audio,sonido,voz,musica: sonido",
].join("\n");

const state = {
  library: [],
  items: [],
  strokes: [],
  selectedId: null,
  mode: "select",
  codePanelOpen: false,
  synth: {
    running: false,
    code: "",
    program: null,
    time: 0,
    startedAt: 0,
    lastRenderedAt: 0,
    raf: null,
  },
  nextFileId: 1,
  nextItemId: 1,
  activeStroke: null,
  drag: null,
};

const imageCache = new Map();
const noiseTextureCache = new Map();

const SYNTH_PRESETS = {
  neon: `osc(11, 0.14, 0.4)
  .kaleid(6)
  .rotate(0.25, 0.06)
  .color(1.0, 0.18, 0.72)
  .contrast(1.25)
  .out()`,
  agua: `noise(3.4, 0.18)
  .modulate(osc(8, 0.12, 0.2), 0.18)
  .scrollX(0, 0.035)
  .color(0.05, 0.55, 0.9)
  .blend(gradient(0.08).color(0.1, 0.9, 0.75), 0.42)
  .out()`,
  pulso: `shape(5, 0.34, 0.08)
  .rotate(0, 0.18)
  .scale(1.1)
  .color(1.0, 0.62, 0.08)
  .blend(osc(18, 0.32, 0.1).kaleid(9), 0.45)
  .out()`,
  scan: `osc(34, 0.06, 0.2)
  .pixelate(80, 45)
  .modulate(noise(9, 0.16), 0.12)
  .color(0.8, 1.0, 0.45)
  .contrast(1.8)
  .out()`,
};

const $ = (id) => document.getElementById(id);

const el = {
  fileInput: $("fileInput"),
  folderInput: $("folderInput"),
  rulesInput: $("rulesInput"),
  reanalyzeBtn: $("reanalyzeBtn"),
  clearLibraryBtn: $("clearLibraryBtn"),
  searchInput: $("searchInput"),
  stats: $("stats"),
  libraryList: $("libraryList"),
  visionAnalyzeBtn: $("visionAnalyzeBtn"),
  organizeDiskBtn: $("organizeDiskBtn"),
  exportProjectBtn: $("exportProjectBtn"),
  selectModeBtn: $("selectModeBtn"),
  paintModeBtn: $("paintModeBtn"),
  brushColor: $("brushColor"),
  brushSize: $("brushSize"),
  brushAlpha: $("brushAlpha"),
  stageColor: $("stageColor"),
  addTextBtn: $("addTextBtn"),
  addDemoImageBtn: $("addDemoImageBtn"),
  clearPaintBtn: $("clearPaintBtn"),
  exportPngBtn: $("exportPngBtn"),
  stageWrap: $("stageWrap"),
  stage: $("stage"),
  synthCanvas: $("synthCanvas"),
  piecesLayer: $("piecesLayer"),
  paintCanvas: $("paintCanvas"),
  toggleCodeBtn: $("toggleCodeBtn"),
  liveCodePanel: $("liveCodePanel"),
  liveCodeInput: $("liveCodeInput"),
  synthPresetSelect: $("synthPresetSelect"),
  applyPresetBtn: $("applyPresetBtn"),
  runCodeBtn: $("runCodeBtn"),
  pauseSynthBtn: $("pauseSynthBtn"),
  captureSynthBtn: $("captureSynthBtn"),
  codeStatus: $("codeStatus"),
  emptyInspector: $("emptyInspector"),
  selectedInspector: $("selectedInspector"),
  materialTitle: $("materialTitle"),
  materialMeta: $("materialMeta"),
  deleteItemBtn: $("deleteItemBtn"),
  duplicateItemBtn: $("duplicateItemBtn"),
  bringForwardBtn: $("bringForwardBtn"),
  sendBackwardBtn: $("sendBackwardBtn"),
  randomNoiseBtn: $("randomNoiseBtn"),
  shapeControl: $("shapeControl"),
  blendControl: $("blendControl"),
  widthControl: $("widthControl"),
  heightControl: $("heightControl"),
  rotationControl: $("rotationControl"),
  opacityControl: $("opacityControl"),
  skewXControl: $("skewXControl"),
  skewYControl: $("skewYControl"),
  brightnessControl: $("brightnessControl"),
  contrastControl: $("contrastControl"),
  saturationControl: $("saturationControl"),
  hueControl: $("hueControl"),
  blurControl: $("blurControl"),
  noiseAmountControl: $("noiseAmountControl"),
  noiseScaleControl: $("noiseScaleControl"),
  noiseWarpControl: $("noiseWarpControl"),
  glitchControl: $("glitchControl"),
  pixelateControl: $("pixelateControl"),
  scanlinesControl: $("scanlinesControl"),
  widthValue: $("widthValue"),
  heightValue: $("heightValue"),
  rotationValue: $("rotationValue"),
  opacityValue: $("opacityValue"),
  skewXValue: $("skewXValue"),
  skewYValue: $("skewYValue"),
  brightnessValue: $("brightnessValue"),
  contrastValue: $("contrastValue"),
  saturationValue: $("saturationValue"),
  hueValue: $("hueValue"),
  blurValue: $("blurValue"),
  noiseAmountValue: $("noiseAmountValue"),
  noiseScaleValue: $("noiseScaleValue"),
  noiseWarpValue: $("noiseWarpValue"),
  glitchValue: $("glitchValue"),
  pixelateValue: $("pixelateValue"),
  scanlinesValue: $("scanlinesValue"),
};

const SHAPES = {
  rect: { clip: "none", radius: "0" },
  soft: { clip: "inset(0 round 24px)", radius: "24px" },
  circle: { clip: "circle(50% at 50% 50%)", radius: "50%" },
  diamond: { clip: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)", radius: "0" },
  trapezoid: { clip: "polygon(12% 0%, 88% 0%, 100% 100%, 0% 100%)", radius: "0" },
  slice: { clip: "polygon(0% 0%, 100% 8%, 86% 100%, 0% 92%)", radius: "0" },
};

const RANGE_BINDINGS = [
  { control: "widthControl", output: "widthValue", prop: "w", suffix: " px" },
  { control: "heightControl", output: "heightValue", prop: "h", suffix: " px" },
  { control: "rotationControl", output: "rotationValue", prop: "rotation", suffix: " deg" },
  {
    control: "opacityControl",
    output: "opacityValue",
    prop: "opacity",
    suffix: "%",
    read: (item) => Math.round(item.opacity * 100),
    write: (value) => Number(value) / 100,
  },
  { control: "skewXControl", output: "skewXValue", prop: "skewX", suffix: " deg" },
  { control: "skewYControl", output: "skewYValue", prop: "skewY", suffix: " deg" },
  { control: "brightnessControl", output: "brightnessValue", prop: "brightness", suffix: "%" },
  { control: "contrastControl", output: "contrastValue", prop: "contrast", suffix: "%" },
  { control: "saturationControl", output: "saturationValue", prop: "saturation", suffix: "%" },
  { control: "hueControl", output: "hueValue", prop: "hue", suffix: " deg" },
  { control: "blurControl", output: "blurValue", prop: "blur", suffix: " px" },
  { control: "noiseAmountControl", output: "noiseAmountValue", prop: "noiseAmount", suffix: "%" },
  { control: "noiseScaleControl", output: "noiseScaleValue", prop: "noiseScale", suffix: " px" },
  { control: "noiseWarpControl", output: "noiseWarpValue", prop: "noiseWarp", suffix: " px" },
  { control: "glitchControl", output: "glitchValue", prop: "glitch", suffix: "%" },
  { control: "pixelateControl", output: "pixelateValue", prop: "pixelate", suffix: " px" },
  { control: "scanlinesControl", output: "scanlinesValue", prop: "scanlines", suffix: "%" },
];

function init() {
  el.rulesInput.value = DEFAULT_RULES;
  el.liveCodeInput.value = SYNTH_PRESETS.neon;
  el.stage.style.setProperty("--paper", el.stageColor.value);
  bindEvents();
  resizePaintCanvas();
  resizeSynthCanvas();
  syncCodePanel();
  applyLiveCode({ render: false });
  renderLibrary();
  renderStats();
  renderInspector();
  if (state.synth.running) startSynth();
}

function bindEvents() {
  el.fileInput.addEventListener("change", async (event) => {
    await addFiles(event.target.files);
    event.target.value = "";
  });

  el.folderInput.addEventListener("change", async (event) => {
    await addFiles(event.target.files);
    event.target.value = "";
  });

  el.reanalyzeBtn.addEventListener("click", () => {
    analyzeLibrary();
    renderLibrary();
    renderStats();
  });

  el.clearLibraryBtn.addEventListener("click", clearAll);
  el.searchInput.addEventListener("input", renderLibrary);
  el.visionAnalyzeBtn.addEventListener("click", analyzeImagesLocally);
  el.organizeDiskBtn.addEventListener("click", organizeToDisk);
  el.exportProjectBtn.addEventListener("click", exportProject);
  el.selectModeBtn.addEventListener("click", () => setMode("select"));
  el.paintModeBtn.addEventListener("click", () => setMode("paint"));
  el.stageColor.addEventListener("input", () => {
    el.stage.style.setProperty("--paper", el.stageColor.value);
  });
  el.addTextBtn.addEventListener("click", addTextItem);
  el.addDemoImageBtn.addEventListener("click", addDemoImageItem);
  el.toggleCodeBtn.addEventListener("click", toggleCodePanel);
  el.applyPresetBtn.addEventListener("click", applySynthPreset);
  el.runCodeBtn.addEventListener("click", applyLiveCode);
  el.pauseSynthBtn.addEventListener("click", toggleSynthPause);
  el.captureSynthBtn.addEventListener("click", captureSynthMaterial);
  el.clearPaintBtn.addEventListener("click", () => {
    state.strokes = [];
    redrawStrokes();
  });
  el.exportPngBtn.addEventListener("click", exportPng);
  el.deleteItemBtn.addEventListener("click", deleteSelectedItem);
  el.duplicateItemBtn.addEventListener("click", duplicateSelectedItem);
  el.bringForwardBtn.addEventListener("click", () => moveLayer(1));
  el.sendBackwardBtn.addEventListener("click", () => moveLayer(-1));
  el.randomNoiseBtn.addEventListener("click", randomizeNoiseSeed);
  el.shapeControl.addEventListener("input", updateSelectedFromInspector);
  el.blendControl.addEventListener("input", updateSelectedFromInspector);

  RANGE_BINDINGS.forEach((binding) => {
    el[binding.control].addEventListener("input", () => {
      const item = getSelectedItem();
      if (!item) return;
      item[binding.prop] = binding.write
        ? binding.write(el[binding.control].value)
        : Number(el[binding.control].value);
      updateSelectedVisual();
      syncRangeOutputs(item);
    });
  });

  el.stage.addEventListener("pointerdown", handleStagePointerDown);
  window.addEventListener("pointermove", handleWindowPointerMove);
  window.addEventListener("pointerup", handleWindowPointerUp);
  el.paintCanvas.addEventListener("pointerdown", startPaint);
  el.paintCanvas.addEventListener("pointermove", continuePaint);
  el.paintCanvas.addEventListener("pointerup", endPaint);
  el.paintCanvas.addEventListener("pointercancel", endPaint);

  el.stageWrap.addEventListener("dragover", (event) => event.preventDefault());
  el.stageWrap.addEventListener("drop", handleStageDrop);
  window.addEventListener("resize", () => {
    resizePaintCanvas();
    resizeSynthCanvas();
  });

  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      resizePaintCanvas();
      resizeSynthCanvas();
    }).observe(el.stage);
  }
}

function toggleCodePanel() {
  state.codePanelOpen = !state.codePanelOpen;
  syncCodePanel();
  resizePaintCanvas();
  resizeSynthCanvas();
  if (state.codePanelOpen) renderSynthFrame();
}

function syncCodePanel() {
  el.liveCodePanel.classList.toggle("closed", !state.codePanelOpen);
  el.toggleCodeBtn.classList.toggle("active", state.codePanelOpen);
  el.pauseSynthBtn.textContent = state.synth.running ? "Pausa" : "Play";
}

function applySynthPreset() {
  const preset = SYNTH_PRESETS[el.synthPresetSelect.value] || SYNTH_PRESETS.neon;
  el.liveCodeInput.value = preset;
  applyLiveCode();
}

function applyLiveCode(options = {}) {
  try {
    state.synth.code = el.liveCodeInput.value;
    state.synth.program = parseSynthCode(state.synth.code);
    setCodeStatus("vivo");
    if (options.render !== false) renderSynthFrame();
  } catch (error) {
    state.synth.program = null;
    setCodeStatus(error.message || "codigo no valido", true);
  }
}

function toggleSynthPause() {
  state.synth.running = !state.synth.running;
  syncCodePanel();
  if (state.synth.running) startSynth();
}

function captureSynthMaterial() {
  renderSynthFrame();
  const dataUrl = el.synthCanvas.toDataURL("image/png");
  const rect = el.stage.getBoundingClientRect();
  const item = createBaseItem({
    name: `synth ${dateStamp()}`,
    kind: "image",
    url: dataUrl,
    category: "codigo vivo",
    x: rect.width / 2,
    y: rect.height / 2,
    w: Math.min(420, rect.width * 0.48),
    h: Math.min(260, rect.height * 0.42),
    shape: "soft",
  });
  state.items.push(item);
  normalizeLayers();
  selectItem(item.id);
  renderPieces();
}

function setCodeStatus(text, isError = false) {
  el.codeStatus.textContent = text;
  el.codeStatus.classList.toggle("error", isError);
}

async function addFiles(fileList) {
  const rules = parseRules();
  const files = Array.from(fileList || []).filter((file) => file.size > 0);
  const added = [];

  files.forEach((file) => {
    const entry = {
      id: `file-${state.nextFileId++}`,
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      path: file.webkitRelativePath || file.name,
      ext: extensionFor(file.name),
      kind: kindForFile(file),
      size: file.size,
      category: "sin-clasificar",
      tags: [],
    };
    analyzeEntry(entry, rules);
    state.library.push(entry);
    added.push(entry);
  });

  renderLibrary();
  renderStats();
  return added;
}

function parseRules() {
  return el.rulesInput.value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(":");
      const rawKeywords = parts[0] || "";
      const category = (parts[1] || parts[0] || "material").trim().toLowerCase();
      const keywords = rawKeywords
        .split(",")
        .map((word) => word.trim().toLowerCase())
        .filter(Boolean);
      return { category, keywords };
    })
    .filter((rule) => rule.keywords.length);
}

function analyzeLibrary() {
  const rules = parseRules();
  state.library.forEach((entry) => analyzeEntry(entry, rules));
}

function analyzeEntry(entry, rules) {
  const haystack = `${entry.path} ${entry.name} ${entry.ext} ${entry.kind}`.toLowerCase();
  const score = new Map();
  const tags = new Set([entry.kind, entry.ext].filter(Boolean));

  rules.forEach((rule) => {
    rule.keywords.forEach((keyword) => {
      if (haystack.includes(keyword)) {
        score.set(rule.category, (score.get(rule.category) || 0) + 1);
        tags.add(keyword);
      }
    });
  });

  let topCategory = entry.kind || "material";
  let topScore = 0;
  score.forEach((value, category) => {
    if (value > topScore) {
      topCategory = category;
      topScore = value;
    }
  });

  entry.category = topCategory;
  entry.tags = Array.from(tags).slice(0, 7);
}

function renderStats() {
  const total = state.library.length;
  const visual = state.library.filter((entry) => ["image", "video"].includes(entry.kind)).length;
  const categories = new Set(state.library.map((entry) => entry.category)).size;

  el.stats.innerHTML = "";
  [
    ["Archivos", total],
    ["Visuales", visual],
    ["Grupos", categories],
  ].forEach(([label, value]) => {
    const stat = document.createElement("div");
    stat.className = "stat";
    const strong = document.createElement("strong");
    strong.textContent = value;
    const span = document.createElement("span");
    span.textContent = label;
    stat.append(strong, span);
    el.stats.appendChild(stat);
  });
}

function renderLibrary() {
  const query = el.searchInput.value.trim().toLowerCase();
  const groups = new Map();
  const filtered = state.library.filter((entry) => matchesQuery(entry, query));

  filtered.forEach((entry) => {
    if (!groups.has(entry.category)) groups.set(entry.category, []);
    groups.get(entry.category).push(entry);
  });

  el.libraryList.innerHTML = "";

  if (!state.library.length) {
    el.libraryList.appendChild(emptyNode("Sin archivos"));
    return;
  }

  if (!filtered.length) {
    el.libraryList.appendChild(emptyNode("Sin coincidencias"));
    return;
  }

  Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([category, entries]) => {
      const section = document.createElement("section");
      section.className = "category";

      const title = document.createElement("div");
      title.className = "category-title";
      title.textContent = `${category} (${entries.length})`;
      section.appendChild(title);

      entries
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((entry) => section.appendChild(fileCard(entry)));

      el.libraryList.appendChild(section);
    });
}

function fileCard(entry) {
  const card = document.createElement("article");
  card.className = "file-card";
  card.draggable = true;
  card.addEventListener("dragstart", (event) => {
    event.dataTransfer.setData("text/file-id", entry.id);
    event.dataTransfer.effectAllowed = "copy";
  });

  const preview = document.createElement("div");
  preview.className = "file-preview";
  if (entry.kind === "image") {
    const img = document.createElement("img");
    img.src = entry.url;
    img.alt = "";
    preview.appendChild(img);
  } else if (entry.kind === "video") {
    const video = document.createElement("video");
    video.src = entry.url;
    video.muted = true;
    preview.appendChild(video);
  } else {
    preview.textContent = entry.kind.toUpperCase().slice(0, 4);
  }

  const details = document.createElement("div");
  details.className = "file-details";
  const name = document.createElement("div");
  name.className = "file-name";
  name.textContent = entry.name;
  const tags = document.createElement("div");
  tags.className = "file-tags";
  entry.tags.forEach((tag) => {
    const tagNode = document.createElement("span");
    tagNode.className = "tag";
    tagNode.textContent = tag;
    tags.appendChild(tagNode);
  });
  details.append(name, tags);

  const useButton = document.createElement("button");
  useButton.className = "small-button";
  useButton.type = "button";
  useButton.textContent = "Usar";
  useButton.addEventListener("click", () => addToCollage(entry));

  card.append(preview, details, useButton);
  return card;
}

function emptyNode(text) {
  const node = document.createElement("div");
  node.className = "empty-panel";
  node.textContent = text;
  return node;
}

function matchesQuery(entry, query) {
  if (!query) return true;
  const terms = query.split(/\s+/).filter(Boolean);
  const haystack = `${entry.name} ${entry.path} ${entry.category} ${entry.tags.join(" ")}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

async function handleStageDrop(event) {
  event.preventDefault();
  const point = pointInStage(event);
  const fileId = event.dataTransfer.getData("text/file-id");

  if (fileId) {
    const entry = state.library.find((candidate) => candidate.id === fileId);
    if (entry) addToCollage(entry, point);
    return;
  }

  if (event.dataTransfer.files?.length) {
    const added = await addFiles(event.dataTransfer.files);
    added.forEach((entry, index) => {
      if (["image", "video", "text", "pdf", "audio"].includes(entry.kind)) {
        addToCollage(entry, { x: point.x + index * 26, y: point.y + index * 18 });
      }
    });
  }
}

function addToCollage(entry, point) {
  const rect = el.stage.getBoundingClientRect();
  const basePoint = point || {
    x: rect.width / 2 + ((state.items.length % 5) - 2) * 34,
    y: rect.height / 2 + ((state.items.length % 3) - 1) * 26,
  };
  const item = createBaseItem({
    fileId: entry.id,
    name: entry.name,
    kind: entry.kind,
    url: entry.url,
    category: entry.category,
    x: clamp(basePoint.x, 60, rect.width - 60),
    y: clamp(basePoint.y, 60, rect.height - 60),
    w: entry.kind === "text" ? 310 : 280,
    h: entry.kind === "audio" ? 120 : entry.kind === "text" ? 190 : 190,
  });

  state.items.push(item);
  normalizeLayers();
  selectItem(item.id);
  renderPieces();

  if (entry.kind === "text") {
    entry.file.text().then((text) => {
      item.text = text.slice(0, 1600);
      renderPieces();
    });
  }
}

function createBaseItem(overrides = {}) {
  return {
    id: `item-${state.nextItemId++}`,
    fileId: null,
    name: "material",
    kind: "note",
    url: "",
    category: "texto",
    text: "",
    x: 260,
    y: 180,
    w: 280,
    h: 190,
    rotation: 0,
    opacity: 1,
    skewX: 0,
    skewY: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    blur: 0,
    noiseAmount: 0,
    noiseScale: 64,
    noiseWarp: 0,
    glitch: 0,
    pixelate: 0,
    scanlines: 0,
    noiseSeed: Math.floor(Math.random() * 10000),
    blend: "normal",
    shape: "rect",
    z: state.items.length + 1,
    ...overrides,
  };
}

function addTextItem() {
  const rect = el.stage.getBoundingClientRect();
  const item = createBaseItem({
    name: "texto vivo",
    kind: "note",
    text: "texto vivo",
    category: "texto",
    x: rect.width / 2,
    y: rect.height / 2,
    w: 280,
    h: 150,
    shape: "soft",
  });
  state.items.push(item);
  normalizeLayers();
  selectItem(item.id);
  renderPieces();
}

function addDemoImageItem() {
  const rect = el.stage.getBoundingClientRect();
  const item = createBaseItem({
    name: "demo distorsion",
    kind: "image",
    url: createDemoImageUrl(),
    category: "demo",
    x: rect.width / 2,
    y: rect.height / 2,
    w: Math.min(520, rect.width * 0.58),
    h: Math.min(340, rect.height * 0.54),
    shape: "soft",
    saturation: 130,
    contrast: 128,
    noiseAmount: 52,
    noiseScale: 42,
    noiseWarp: 34,
    glitch: 46,
    pixelate: 5,
    scanlines: 34,
    noiseSeed: Math.floor(Math.random() * 100000),
  });
  state.items.push(item);
  normalizeLayers();
  selectItem(item.id);
  renderPieces();
}

function createDemoImageUrl() {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 620;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#0f766e");
  gradient.addColorStop(0.38, "#f8faf7");
  gradient.addColorStop(0.68, "#be123c");
  gradient.addColorStop(1, "#111827");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = 0.9;
  for (let x = -80; x < canvas.width + 120; x += 68) {
    ctx.fillStyle = x % 136 === 0 ? "#facc15" : "#38bdf8";
    ctx.fillRect(x, 0, 24, canvas.height);
  }

  ctx.globalAlpha = 0.72;
  for (let y = 28; y < canvas.height; y += 56) {
    ctx.fillStyle = y % 112 === 28 ? "#ffffff" : "#111827";
    ctx.fillRect(0, y, canvas.width, 7);
  }

  ctx.globalAlpha = 0.88;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(250, 230, 130, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(250, 230, 66, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 12;
  for (let i = 0; i < 9; i += 1) {
    ctx.beginPath();
    ctx.moveTo(440 + i * 26, 120);
    ctx.bezierCurveTo(560 + i * 8, 250, 480 - i * 18, 350, 760, 510 - i * 20);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = "#111827";
  ctx.font = "800 72px system-ui, sans-serif";
  ctx.fillText("WARP", 500, 280);
  ctx.font = "700 32px system-ui, sans-serif";
  ctx.fillText("imagen demo", 506, 326);

  return canvas.toDataURL("image/png");
}

function renderPieces() {
  el.piecesLayer.innerHTML = "";
  el.stage.classList.toggle("has-items", state.items.length > 0);

  state.items
    .slice()
    .sort((a, b) => a.z - b.z)
    .forEach((item) => {
      const piece = document.createElement("div");
      piece.className = "piece";
      piece.dataset.id = item.id;
      piece.classList.toggle("selected", item.id === state.selectedId);
      applyItemStyle(piece, item);
      piece.appendChild(createPieceContent(item));

      const rotate = document.createElement("div");
      rotate.className = "rotate-handle";
      rotate.dataset.handle = "rotate";
      rotate.title = "Rotar";

      const resize = document.createElement("div");
      resize.className = "resize-handle";
      resize.dataset.handle = "resize";
      resize.title = "Escalar";

      piece.append(rotate, resize);
      el.piecesLayer.appendChild(piece);
    });
  renderInspector();
}

function createPieceContent(item) {
  if (item.kind === "image") {
    const canvas = document.createElement("canvas");
    canvas.className = "material-canvas";
    canvas.draggable = false;
    renderImageMaterial(canvas, item);
    return canvas;
  }

  if (item.kind === "video") {
    const video = document.createElement("video");
    video.src = item.url;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.draggable = false;
    video.addEventListener("loadeddata", () => video.play().catch(() => {}), { once: true });
    return video;
  }

  if (item.kind === "note" || item.kind === "text") {
    const text = document.createElement("div");
    text.className = "text-material";
    text.contentEditable = "true";
    text.spellcheck = false;
    text.textContent = item.text || item.name;
    text.addEventListener("input", () => {
      item.text = text.textContent;
    });
    text.addEventListener("pointerdown", (event) => {
      if (item.id === state.selectedId) event.stopPropagation();
    });
    return text;
  }

  const fallback = document.createElement("div");
  fallback.className = "fallback-material";
  fallback.textContent = item.name;
  return fallback;
}

function applyItemStyle(node, item) {
  const shape = SHAPES[item.shape] || SHAPES.rect;
  const overlayNoise = item.kind === "image" ? 0 : item.noiseAmount;
  const overlayScanlines = item.kind === "image" ? 0 : item.scanlines;
  node.style.left = `${item.x}px`;
  node.style.top = `${item.y}px`;
  node.style.width = `${item.w}px`;
  node.style.height = `${item.h}px`;
  node.style.transform = `translate(-50%, -50%) rotate(${item.rotation}deg) skew(${item.skewX}deg, ${item.skewY}deg)`;
  node.style.opacity = item.opacity;
  node.style.mixBlendMode = item.blend;
  node.style.filter = cssFilter(item);
  node.style.clipPath = shape.clip;
  node.style.borderRadius = shape.radius;
  node.style.boxShadow = glitchShadow(item);
  node.style.setProperty("--noise-opacity", `${(overlayNoise / 100) * 0.58}`);
  node.style.setProperty("--scanline-opacity", `${(overlayScanlines / 100) * 0.5}`);
  node.style.setProperty("--noise-size", `${item.noiseScale}px`);
  node.style.setProperty("--noise-image", `url(${noiseTexture(item.noiseSeed)})`);
  node.style.zIndex = item.z;
}

function cssFilter(item) {
  return [
    `brightness(${item.brightness}%)`,
    `contrast(${item.contrast}%)`,
    `saturate(${item.saturation}%)`,
    `hue-rotate(${item.hue}deg)`,
    `blur(${item.blur}px)`,
  ].join(" ");
}

function handleStagePointerDown(event) {
  if (state.mode !== "select") return;
  const piece = event.target.closest(".piece");

  if (!piece) {
    selectItem(null);
    return;
  }

  const item = state.items.find((candidate) => candidate.id === piece.dataset.id);
  if (!item) return;

  if (event.target.closest(".text-material") && item.id === state.selectedId) {
    return;
  }

  event.preventDefault();
  selectItem(item.id);

  const handle = event.target.dataset.handle || "move";
  const rect = el.stage.getBoundingClientRect();
  state.drag = {
    pointerId: event.pointerId,
    handle,
    startX: event.clientX,
    startY: event.clientY,
    stageLeft: rect.left,
    stageTop: rect.top,
    itemStart: { ...item },
  };
  piece.setPointerCapture(event.pointerId);
}

function handleWindowPointerMove(event) {
  if (!state.drag) return;
  const item = getSelectedItem();
  if (!item) return;

  const dx = event.clientX - state.drag.startX;
  const dy = event.clientY - state.drag.startY;
  const start = state.drag.itemStart;
  const rect = el.stage.getBoundingClientRect();

  if (state.drag.handle === "move") {
    item.x = clamp(start.x + dx, -start.w, rect.width + start.w);
    item.y = clamp(start.y + dy, -start.h, rect.height + start.h);
  }

  if (state.drag.handle === "resize") {
    item.w = clamp(start.w + dx, 40, 1200);
    item.h = clamp(start.h + dy, 40, 900);
  }

  if (state.drag.handle === "rotate") {
    const centerX = state.drag.stageLeft + item.x;
    const centerY = state.drag.stageTop + item.y;
    item.rotation = Math.round((Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180) / Math.PI + 90);
  }

  updateSelectedVisual();
  syncInspectorValues(item);
}

function handleWindowPointerUp() {
  state.drag = null;
}

function setMode(mode) {
  state.mode = mode;
  el.stage.classList.toggle("painting", mode === "paint");
  el.selectModeBtn.classList.toggle("active", mode === "select");
  el.paintModeBtn.classList.toggle("active", mode === "paint");
}

function startPaint(event) {
  if (state.mode !== "paint") return;
  event.preventDefault();
  const stroke = {
    color: el.brushColor.value,
    size: Number(el.brushSize.value),
    alpha: Number(el.brushAlpha.value) / 100,
    points: [normalizedCanvasPoint(event)],
  };
  state.activeStroke = stroke;
  state.strokes.push(stroke);
  el.paintCanvas.setPointerCapture(event.pointerId);
  redrawStrokes();
}

function continuePaint(event) {
  if (!state.activeStroke || state.mode !== "paint") return;
  state.activeStroke.points.push(normalizedCanvasPoint(event));
  redrawStrokes();
}

function endPaint() {
  state.activeStroke = null;
}

function normalizedCanvasPoint(event) {
  const rect = el.paintCanvas.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
    y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
  };
}

function resizePaintCanvas() {
  const rect = el.stage.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  el.paintCanvas.width = Math.max(1, Math.round(rect.width * dpr));
  el.paintCanvas.height = Math.max(1, Math.round(rect.height * dpr));
  const ctx = el.paintCanvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redrawStrokes();
}

function redrawStrokes(targetCtx = null, width = null, height = null) {
  const ctx = targetCtx || el.paintCanvas.getContext("2d");
  const rect = el.stage.getBoundingClientRect();
  const drawWidth = width || rect.width;
  const drawHeight = height || rect.height;

  if (!targetCtx) ctx.clearRect(0, 0, drawWidth, drawHeight);

  state.strokes.forEach((stroke) => {
    if (stroke.points.length < 1) return;
    ctx.save();
    ctx.globalAlpha = stroke.alpha;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    stroke.points.forEach((point, index) => {
      const x = point.x * drawWidth;
      const y = point.y * drawHeight;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  });
}

function resizeSynthCanvas() {
  const rect = el.stage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const width = Math.round(clamp(rect.width / 6, 140, 200));
  const height = Math.round(width * (rect.height / rect.width));
  if (el.synthCanvas.width !== width || el.synthCanvas.height !== height) {
    el.synthCanvas.width = width;
    el.synthCanvas.height = height;
    renderSynthFrame();
  }
}

function startSynth() {
  if (state.synth.raf || !state.synth.running) return;
  state.synth.startedAt = performance.now() - state.synth.time * 1000;

  const tick = (now) => {
    state.synth.raf = null;
    if (!state.synth.running) return;
    state.synth.time = (now - state.synth.startedAt) / 1000;
    if (now - state.synth.lastRenderedAt > 66) {
      renderSynthFrame();
      state.synth.lastRenderedAt = now;
    }
    state.synth.raf = requestAnimationFrame(tick);
  };

  state.synth.raf = requestAnimationFrame(tick);
}

function renderSynthFrame() {
  drawSynthToCanvas(el.synthCanvas, state.synth.time);
}

function drawSynthToContext(ctx, width, height, time = state.synth.time) {
  if (!state.synth.program) return;
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = Math.round(480 * (height / width));
  drawSynthToCanvas(canvas, time);
  ctx.drawImage(canvas, 0, 0, width, height);
}

function drawSynthToCanvas(canvas, time) {
  const program = state.synth.program;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!program) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const imageData = ctx.createImageData(canvas.width, canvas.height);
  const data = imageData.data;
  const aspect = canvas.width / canvas.height;
  let i = 0;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const u = ((x / canvas.width) - 0.5) * aspect;
      const v = y / canvas.height - 0.5;
      const color = sampleSynthNode(program, u, v, time, 0);
      data[i] = clampChannel(color[0] * 255);
      data[i + 1] = clampChannel(color[1] * 255);
      data[i + 2] = clampChannel(color[2] * 255);
      data[i + 3] = clampChannel((color[3] ?? 1) * 255);
      i += 4;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function parseSynthCode(code) {
  let source = code.replace(/\/\/.*$/gm, "").trim();
  if (!source) throw new Error("codigo vacio");
  source = source.replace(/;+\s*$/g, "").trim();
  source = source.replace(/\.out\s*\(\s*\)\s*$/i, "").trim();
  source = source.replace(/\bout\s*\(\s*\)\s*$/i, "").trim();

  const parsed = parseSynthExpression(source, 0);
  const end = skipSynthSpaces(source, parsed.pos);
  if (end < source.length) {
    throw new Error(`no entiendo cerca de "${source.slice(end, end + 18)}"`);
  }
  return parsed.node;
}

function parseSynthExpression(source, pos) {
  const call = parseSynthCall(source, pos);
  const node = { name: call.name, args: call.args, transforms: [] };
  let current = call.pos;

  while (true) {
    current = skipSynthSpaces(source, current);
    if (source[current] !== ".") break;
    const method = parseSynthCall(source, current + 1);
    node.transforms.push({ name: method.name, args: method.args });
    current = method.pos;
  }

  return { node, pos: current };
}

function parseSynthCall(source, pos) {
  let current = skipSynthSpaces(source, pos);
  const nameMatch = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(source.slice(current));
  if (!nameMatch) throw new Error(`falta nombre cerca de "${source.slice(current, current + 12)}"`);
  const name = nameMatch[0];
  current += name.length;
  current = skipSynthSpaces(source, current);
  if (source[current] !== "(") throw new Error(`falta "(" en ${name}`);
  const parsedArgs = parseSynthArgs(source, current + 1);
  return { name, args: parsedArgs.args, pos: parsedArgs.pos };
}

function parseSynthArgs(source, pos) {
  const args = [];
  let current = skipSynthSpaces(source, pos);
  if (source[current] === ")") return { args, pos: current + 1 };

  while (current < source.length) {
    const value = parseSynthValue(source, current);
    args.push(value.value);
    current = skipSynthSpaces(source, value.pos);

    if (source[current] === ",") {
      current = skipSynthSpaces(source, current + 1);
      continue;
    }

    if (source[current] === ")") return { args, pos: current + 1 };
    throw new Error(`falta coma o ")" cerca de "${source.slice(current, current + 12)}"`);
  }

  throw new Error("parentesis incompleto");
}

function parseSynthValue(source, pos) {
  let current = skipSynthSpaces(source, pos);
  const numberMatch = /^[-+]?(?:\d+\.?\d*|\.\d+)/.exec(source.slice(current));
  if (numberMatch) {
    return { value: Number(numberMatch[0]), pos: current + numberMatch[0].length };
  }

  const nameMatch = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(source.slice(current));
  if (nameMatch) {
    const nameEnd = current + nameMatch[0].length;
    const afterName = skipSynthSpaces(source, nameEnd);
    if (source[afterName] === "(") return parseSynthExpression(source, current);
    return { value: { symbol: nameMatch[0] }, pos: nameEnd };
  }

  throw new Error(`valor no valido cerca de "${source.slice(current, current + 12)}"`);
}

function skipSynthSpaces(source, pos) {
  let current = pos;
  while (/\s/.test(source[current] || "")) current += 1;
  return current;
}

function sampleSynthNode(node, u, v, t, depth) {
  if (!node || depth > 8) return [0, 0, 0, 1];
  let x = u;
  let y = v;

  node.transforms.forEach((transform) => {
    const name = transform.name.toLowerCase();
    if (name === "rotate") {
      const angle = argNumber(transform.args, 0, 0, x, y, t, depth) + t * argNumber(transform.args, 1, 0, x, y, t, depth);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const nextX = x * cos - y * sin;
      y = x * sin + y * cos;
      x = nextX;
    } else if (name === "scale") {
      const scale = Math.max(0.001, argNumber(transform.args, 0, 1, x, y, t, depth));
      x /= scale;
      y /= scale;
    } else if (name === "scrollx") {
      x += argNumber(transform.args, 0, 0, x, y, t, depth) + t * argNumber(transform.args, 1, 0, x, y, t, depth);
    } else if (name === "scrolly") {
      y += argNumber(transform.args, 0, 0, x, y, t, depth) + t * argNumber(transform.args, 1, 0, x, y, t, depth);
    } else if (name === "repeat") {
      const repeatX = Math.max(1, argNumber(transform.args, 0, 2, x, y, t, depth));
      const repeatY = Math.max(1, argNumber(transform.args, 1, repeatX, x, y, t, depth));
      x = fract((x + 0.5) * repeatX) - 0.5;
      y = fract((y + 0.5) * repeatY) - 0.5;
    } else if (name === "pixelate") {
      const cellsX = Math.max(1, argNumber(transform.args, 0, 40, x, y, t, depth));
      const cellsY = Math.max(1, argNumber(transform.args, 1, cellsX, x, y, t, depth));
      x = Math.round((x + 0.5) * cellsX) / cellsX - 0.5;
      y = Math.round((y + 0.5) * cellsY) / cellsY - 0.5;
    } else if (name === "kaleid") {
      const sides = Math.max(1, Math.round(argNumber(transform.args, 0, 6, x, y, t, depth)));
      const radius = Math.hypot(x, y);
      const sector = (Math.PI * 2) / sides;
      let angle = Math.atan2(y, x);
      angle = Math.abs(mod(angle + sector / 2, sector) - sector / 2);
      x = Math.cos(angle) * radius;
      y = Math.sin(angle) * radius;
    } else if (name === "modulate") {
      const signal = argNode(transform.args, 0);
      const amount = argNumber(transform.args, 1, 0.1, x, y, t, depth);
      if (signal) {
        const color = sampleSynthNode(signal, x, y, t, depth + 1);
        const lum = luminance(color);
        x += (lum - 0.5) * amount;
        y += (color[0] - color[2]) * amount * 0.5;
      }
    }
  });

  let color = sampleSynthSource(node, x, y, t, depth);

  node.transforms.forEach((transform) => {
    const name = transform.name.toLowerCase();
    if (name === "color") {
      color = [
        color[0] * argNumber(transform.args, 0, 1, x, y, t, depth),
        color[1] * argNumber(transform.args, 1, 1, x, y, t, depth),
        color[2] * argNumber(transform.args, 2, 1, x, y, t, depth),
        color[3],
      ];
    } else if (name === "brightness") {
      const amount = argNumber(transform.args, 0, 0, x, y, t, depth);
      color = [color[0] + amount, color[1] + amount, color[2] + amount, color[3]];
    } else if (name === "contrast") {
      const amount = argNumber(transform.args, 0, 1, x, y, t, depth);
      color = [
        (color[0] - 0.5) * amount + 0.5,
        (color[1] - 0.5) * amount + 0.5,
        (color[2] - 0.5) * amount + 0.5,
        color[3],
      ];
    } else if (name === "invert") {
      const amount = argNumber(transform.args, 0, 1, x, y, t, depth);
      color = mixColor(color, [1 - color[0], 1 - color[1], 1 - color[2], color[3]], amount);
    } else if (name === "posterize") {
      const levels = Math.max(2, Math.round(argNumber(transform.args, 0, 4, x, y, t, depth)));
      color = [
        Math.floor(color[0] * levels) / (levels - 1),
        Math.floor(color[1] * levels) / (levels - 1),
        Math.floor(color[2] * levels) / (levels - 1),
        color[3],
      ];
    } else if (name === "thresh" || name === "luma") {
      const threshold = argNumber(transform.args, 0, 0.5, x, y, t, depth);
      const value = luminance(color) >= threshold ? 1 : 0;
      color = [value, value, value, color[3]];
    } else if (name === "blend" || name === "add" || name === "diff" || name === "mult") {
      const otherNode = argNode(transform.args, 0);
      const amount = argNumber(transform.args, 1, 0.5, x, y, t, depth);
      if (otherNode) {
        const other = sampleSynthNode(otherNode, u, v, t, depth + 1);
        if (name === "blend") color = mixColor(color, other, amount);
        if (name === "add") color = mixColor(color, addColor(color, other), amount);
        if (name === "diff") color = mixColor(color, diffColor(color, other), amount);
        if (name === "mult") color = mixColor(color, multColor(color, other), amount);
      }
    }
  });

  return clampColor(color);
}

function sampleSynthSource(node, x, y, t, depth) {
  const name = node.name.toLowerCase();

  if (name === "osc") {
    const freq = argNumber(node.args, 0, 10, x, y, t, depth);
    const sync = argNumber(node.args, 1, 0.1, x, y, t, depth);
    const offset = argNumber(node.args, 2, 0, x, y, t, depth);
    const phase = (x + y * 0.18) * freq + t * sync + offset;
    return [
      0.5 + 0.5 * Math.sin(phase * Math.PI * 2),
      0.5 + 0.5 * Math.sin((phase + 0.33) * Math.PI * 2),
      0.5 + 0.5 * Math.sin((phase + 0.66) * Math.PI * 2),
      1,
    ];
  }

  if (name === "noise") {
    const scale = argNumber(node.args, 0, 4, x, y, t, depth);
    const speed = argNumber(node.args, 1, 0.2, x, y, t, depth);
    const value = smoothNoise(x * scale + 10, y * scale + 10, t * speed);
    return [value, value, value, 1];
  }

  if (name === "gradient") {
    const speed = argNumber(node.args, 0, 0.08, x, y, t, depth);
    return [...hslToRgb(fract(x * 0.34 + y * 0.21 + t * speed), 0.68, 0.56), 1];
  }

  if (name === "shape") {
    const sides = Math.max(1, Math.round(argNumber(node.args, 0, 4, x, y, t, depth)));
    const radius = argNumber(node.args, 1, 0.32, x, y, t, depth);
    const soft = Math.max(0.001, argNumber(node.args, 2, 0.04, x, y, t, depth));
    const angle = Math.atan2(y, x);
    const distance = Math.hypot(x, y);
    const edge = radius * (1 + 0.12 * Math.cos(angle * sides));
    const value = 1 - smoothstep(edge - soft, edge + soft, distance);
    return [value, value, value, 1];
  }

  if (name === "solid") {
    return [
      argNumber(node.args, 0, 0, x, y, t, depth),
      argNumber(node.args, 1, 0, x, y, t, depth),
      argNumber(node.args, 2, 0, x, y, t, depth),
      argNumber(node.args, 3, 1, x, y, t, depth),
    ];
  }

  if (name === "checker") {
    const cells = Math.max(1, argNumber(node.args, 0, 8, x, y, t, depth));
    const value = (Math.floor((x + 0.5) * cells) + Math.floor((y + 0.5) * cells)) % 2 ? 1 : 0;
    return [value, value, value, 1];
  }

  return [0, 0, 0, 1];
}

function selectItem(id) {
  state.selectedId = id;
  Array.from(el.piecesLayer.children).forEach((node) => {
    node.classList.toggle("selected", node.dataset.id === id);
  });
  renderInspector();
}

function getSelectedItem() {
  return state.items.find((item) => item.id === state.selectedId) || null;
}

function renderInspector() {
  const item = getSelectedItem();
  const hasItem = Boolean(item);

  el.emptyInspector.hidden = hasItem;
  el.selectedInspector.hidden = !hasItem;
  el.deleteItemBtn.disabled = !hasItem;
  el.randomNoiseBtn.disabled = !hasItem;

  if (!item) return;

  el.materialTitle.textContent = item.name;
  const source = item.fileId ? state.library.find((entry) => entry.id === item.fileId) : null;
  const size = source ? ` / ${formatBytes(source.size)}` : "";
  el.materialMeta.textContent = `${item.kind} / ${item.category}${size}`;
  el.shapeControl.value = item.shape;
  el.blendControl.value = item.blend;
  syncInspectorValues(item);
}

function syncInspectorValues(item) {
  RANGE_BINDINGS.forEach((binding) => {
    const value = binding.read ? binding.read(item) : Math.round(item[binding.prop]);
    el[binding.control].value = value;
    el[binding.output].textContent = `${value}${binding.suffix}`;
  });
  el.shapeControl.value = item.shape;
  el.blendControl.value = item.blend;
}

function syncRangeOutputs(item) {
  RANGE_BINDINGS.forEach((binding) => {
    const value = binding.read ? binding.read(item) : Math.round(item[binding.prop]);
    el[binding.output].textContent = `${value}${binding.suffix}`;
  });
}

function updateSelectedFromInspector() {
  const item = getSelectedItem();
  if (!item) return;
  item.shape = el.shapeControl.value;
  item.blend = el.blendControl.value;
  updateSelectedVisual();
}

function randomizeNoiseSeed() {
  const item = getSelectedItem();
  if (!item) return;
  item.noiseSeed = Math.floor(Math.random() * 100000);
  updateSelectedVisual();
}

function updateSelectedVisual() {
  const item = getSelectedItem();
  if (!item) return;
  const node = el.piecesLayer.querySelector(`[data-id="${item.id}"]`);
  if (!node) return;
  applyItemStyle(node, item);
  const canvas = node.querySelector(".material-canvas");
  if (canvas) renderImageMaterial(canvas, item);
}

function deleteSelectedItem() {
  const item = getSelectedItem();
  if (!item) return;
  state.items = state.items.filter((candidate) => candidate.id !== item.id);
  state.selectedId = null;
  normalizeLayers();
  renderPieces();
}

function duplicateSelectedItem() {
  const item = getSelectedItem();
  if (!item) return;
  const copy = {
    ...item,
    id: `item-${state.nextItemId++}`,
    name: `${item.name} copia`,
    x: item.x + 30,
    y: item.y + 24,
    z: maxLayer() + 1,
  };
  state.items.push(copy);
  normalizeLayers();
  selectItem(copy.id);
  renderPieces();
}

function moveLayer(direction) {
  const item = getSelectedItem();
  if (!item) return;
  item.z += direction * 1.5;
  normalizeLayers();
  renderPieces();
}

function normalizeLayers() {
  state.items
    .sort((a, b) => a.z - b.z)
    .forEach((item, index) => {
      item.z = index + 1;
    });
}

function maxLayer() {
  return state.items.reduce((max, item) => Math.max(max, item.z), 0);
}

function clearAll() {
  if (!state.library.length && !state.items.length && !state.strokes.length) return;
  const ok = window.confirm("Limpiar biblioteca, collage y pintura?");
  if (!ok) return;
  state.library.forEach((entry) => URL.revokeObjectURL(entry.url));
  state.library = [];
  state.items = [];
  state.strokes = [];
  state.selectedId = null;
  renderLibrary();
  renderStats();
  renderPieces();
  redrawStrokes();
}

async function organizeToDisk() {
  if (!state.library.length) return;

  if (!window.showDirectoryPicker) {
    window.alert("Tu navegador no permite copiar carpetas desde esta pantalla. Usa Exportar indice.");
    return;
  }

  try {
    const root = await window.showDirectoryPicker({ mode: "readwrite" });
    for (const entry of state.library) {
      const folder = await root.getDirectoryHandle(safeName(entry.category), { create: true });
      const handle = await folder.getFileHandle(entry.name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(entry.file);
      await writable.close();
    }
    window.alert("Archivos copiados por categoria.");
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
      window.alert("No se pudo copiar a carpetas.");
    }
  }
}

async function analyzeImagesLocally() {
  const imageEntries = state.library.filter((entry) => entry.kind === "image");
  if (!imageEntries.length) return;

  el.visionAnalyzeBtn.disabled = true;
  el.visionAnalyzeBtn.textContent = "Analizando...";

  try {
    for (const entry of imageEntries) {
      const tags = await analyzeImagePixels(entry.url);
      entry.tags = uniqueTags([...entry.tags, ...tags]);
      if (entry.category === "image" || entry.category === "material") {
        entry.category = tags.includes("oscuro") ? "sombra" : tags.includes("luminoso") ? "luz" : "imagen";
      }
    }
    renderLibrary();
    renderStats();
  } finally {
    el.visionAnalyzeBtn.disabled = false;
    el.visionAnalyzeBtn.textContent = "Analizar imagenes local";
  }
}

async function analyzeImagePixels(url) {
  const image = await loadImage(url);
  const canvas = document.createElement("canvas");
  const size = 96;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  let r = 0;
  let g = 0;
  let b = 0;
  let brightness = 0;
  let saturation = 0;
  let edges = 0;
  let samples = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    if (alpha < 0.2) continue;
    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    r += red;
    g += green;
    b += blue;
    brightness += (red + green + blue) / 3;
    saturation += max === 0 ? 0 : (max - min) / max;
    samples += 1;
  }

  for (let y = 1; y < size; y += 1) {
    for (let x = 1; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const prev = (y * size + x - 1) * 4;
      const up = ((y - 1) * size + x) * 4;
      const here = (data[index] + data[index + 1] + data[index + 2]) / 3;
      const left = (data[prev] + data[prev + 1] + data[prev + 2]) / 3;
      const top = (data[up] + data[up + 1] + data[up + 2]) / 3;
      edges += Math.abs(here - left) + Math.abs(here - top);
    }
  }

  if (!samples) return ["transparente"];

  r /= samples;
  g /= samples;
  b /= samples;
  brightness /= samples;
  saturation /= samples;
  edges /= (size - 1) * (size - 1) * 2;

  const tags = [];
  if (brightness > 178) tags.push("luminoso");
  if (brightness < 76) tags.push("oscuro");
  if (saturation > 0.48) tags.push("saturado");
  if (saturation < 0.18) tags.push("gris");
  if (edges > 32) tags.push("textura");
  if (edges < 12) tags.push("plano");

  const dominant = [
    ["rojo", r],
    ["verde", g],
    ["azul", b],
  ].sort((a, bValue) => bValue[1] - a[1])[0];
  tags.push(dominant[0]);

  if (Math.abs(r - g) < 18 && Math.abs(g - b) < 18) tags.push("neutro");
  if (r > 150 && g > 120 && b < 95) tags.push("calido");
  if (b > r + 22 || g > r + 26) tags.push("frio");

  return uniqueTags(tags);
}

function exportProject() {
  const data = {
    name: "Mezclador Tecnoafectivo",
    exportedAt: new Date().toISOString(),
    rules: el.rulesInput.value,
    background: el.stageColor.value,
    library: state.library.map((entry) => ({
      name: entry.name,
      path: entry.path,
      kind: entry.kind,
      category: entry.category,
      tags: entry.tags,
      size: entry.size,
    })),
    collage: state.items.map(({ url, ...item }) => item),
    strokes: state.strokes,
  };
  downloadBlob(JSON.stringify(data, null, 2), "archivador-indice.json", "application/json");
}

async function exportPng() {
  const rect = el.stage.getBoundingClientRect();
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(rect.width * scale);
  canvas.height = Math.round(rect.height * scale);
  const ctx = canvas.getContext("2d");

  ctx.scale(scale, scale);
  ctx.fillStyle = el.stageColor.value;
  ctx.fillRect(0, 0, rect.width, rect.height);
  drawSynthToContext(ctx, rect.width, rect.height, state.synth.time);

  for (const item of state.items.slice().sort((a, b) => a.z - b.z)) {
    await drawItemToCanvas(ctx, item);
  }

  redrawStrokes(ctx, rect.width, rect.height);

  canvas.toBlob((blob) => {
    if (!blob) return;
    downloadBlob(blob, `collage-${dateStamp()}.png`, "image/png");
  }, "image/png");
}

async function drawItemToCanvas(ctx, item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate((item.rotation * Math.PI) / 180);
  ctx.transform(1, Math.tan((item.skewY * Math.PI) / 180), Math.tan((item.skewX * Math.PI) / 180), 1, 0, 0);
  ctx.globalAlpha = item.opacity;
  ctx.globalCompositeOperation = canvasBlendMode(item.blend);
  ctx.filter = cssFilter(item);
  clipCanvasShape(ctx, item);

  if (item.kind === "image") {
    const image = await loadImageCached(item.url);
    const raster = await createRasterMaterialCanvas(item, image);
    ctx.drawImage(raster, -item.w / 2, -item.h / 2, item.w, item.h);
  } else if (item.kind === "video") {
    const video = el.piecesLayer.querySelector(`[data-id="${item.id}"] video`);
    if (video && video.readyState >= 2) {
      const raster = await createRasterMaterialCanvas(item, video);
      ctx.drawImage(raster, -item.w / 2, -item.h / 2, item.w, item.h);
    } else {
      drawFallback(ctx, item);
    }
  } else if (item.kind === "note" || item.kind === "text") {
    drawTextMaterial(ctx, item);
  } else {
    drawFallback(ctx, item);
  }

  if (!["image", "video"].includes(item.kind)) {
    drawProceduralOverlay(ctx, item);
  }

  ctx.restore();
}

async function renderImageMaterial(canvas, item) {
  const key = imageRenderKey(item);
  canvas.dataset.renderKey = key;

  try {
    const image = await loadImageCached(item.url);
    if (canvas.dataset.renderKey !== key) return;
    const raster = await createRasterMaterialCanvas(item, image);
    if (canvas.dataset.renderKey !== key) return;

    canvas.width = raster.width;
    canvas.height = raster.height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(raster, 0, 0);
  } catch (error) {
    const ctx = canvas.getContext("2d");
    canvas.width = Math.max(1, Math.round(item.w));
    canvas.height = Math.max(1, Math.round(item.h));
    ctx.fillStyle = "#eef1ed";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function imageRenderKey(item) {
  return [
    item.url,
    Math.round(item.w),
    Math.round(item.h),
    item.noiseAmount,
    item.noiseScale,
    item.noiseWarp,
    item.glitch,
    item.pixelate,
    item.scanlines,
    item.noiseSeed,
  ].join("|");
}

async function createRasterMaterialCanvas(item, source) {
  const width = clamp(Math.round(item.w), 1, 1000);
  const height = clamp(Math.round(item.h), 1, 800);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (item.pixelate > 0) {
    const pixelSize = Math.max(1, Math.round(item.pixelate));
    const small = document.createElement("canvas");
    small.width = Math.max(1, Math.round(width / pixelSize));
    small.height = Math.max(1, Math.round(height / pixelSize));
    const smallCtx = small.getContext("2d");
    smallCtx.imageSmoothingEnabled = true;
    drawImageCover(smallCtx, source, 0, 0, small.width, small.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
  } else {
    drawImageCover(ctx, source, 0, 0, width, height);
  }

  applyNoiseEngineToCanvas(canvas, item);
  return canvas;
}

function applyNoiseEngineToCanvas(canvas, item) {
  if (!hasNoiseEngine(item)) return;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  if (item.noiseWarp > 0) {
    imageData = warpImageData(imageData, item);
  }

  if (item.glitch > 0) {
    imageData = glitchImageData(imageData, item);
  }

  if (item.noiseAmount > 0 || item.scanlines > 0) {
    burnNoiseIntoImageData(imageData, item);
  }

  ctx.putImageData(imageData, 0, 0);
}

function warpImageData(imageData, item) {
  const { width, height, data } = imageData;
  const output = new ImageData(width, height);
  const out = output.data;
  const scale = Math.max(6, item.noiseScale);
  const strength = item.noiseWarp;
  const seed = item.noiseSeed || 1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const waveX = Math.sin((y + seed * 3.1) / scale) * strength;
      const waveY = Math.cos((x + seed * 1.7) / scale) * strength * 0.42;
      const blockNoise = hashNoise(Math.floor(x / scale), Math.floor(y / scale), seed) - 0.5;
      const sx = clamp(Math.round(x + waveX + blockNoise * strength), 0, width - 1);
      const sy = clamp(Math.round(y + waveY - blockNoise * strength * 0.55), 0, height - 1);
      const sourceIndex = (sy * width + sx) * 4;
      const targetIndex = (y * width + x) * 4;
      out[targetIndex] = data[sourceIndex];
      out[targetIndex + 1] = data[sourceIndex + 1];
      out[targetIndex + 2] = data[sourceIndex + 2];
      out[targetIndex + 3] = data[sourceIndex + 3];
    }
  }

  return output;
}

function glitchImageData(imageData, item) {
  const { width, height, data } = imageData;
  const output = new ImageData(new Uint8ClampedArray(data), width, height);
  const out = output.data;
  const rand = seededRandom((item.noiseSeed || 1) + 9301);
  const bands = Math.max(1, Math.round(item.glitch / 8));
  const maxShift = Math.max(1, Math.round((item.glitch / 100) * width * 0.22));
  const chromaShift = Math.max(1, Math.round((item.glitch / 100) * 12));

  for (let band = 0; band < bands; band += 1) {
    const yStart = Math.floor(rand() * height);
    const bandHeight = Math.max(1, Math.floor(rand() * 18 + item.glitch / 8));
    const shift = Math.round((rand() - 0.5) * maxShift * 2);

    for (let y = yStart; y < Math.min(height, yStart + bandHeight); y += 1) {
      for (let x = 0; x < width; x += 1) {
        const tx = (y * width + x) * 4;
        const sx = clamp(x - shift, 0, width - 1);
        const rx = clamp(sx - chromaShift, 0, width - 1);
        const bx = clamp(sx + chromaShift, 0, width - 1);
        const source = (y * width + sx) * 4;
        const redSource = (y * width + rx) * 4;
        const blueSource = (y * width + bx) * 4;
        out[tx] = data[redSource];
        out[tx + 1] = data[source + 1];
        out[tx + 2] = data[blueSource + 2];
        out[tx + 3] = data[source + 3];
      }
    }
  }

  return output;
}

function burnNoiseIntoImageData(imageData, item) {
  const { width, data } = imageData;
  const rand = seededRandom((item.noiseSeed || 1) + 17017);
  const noisePower = item.noiseAmount * 1.9;
  const scanPower = item.scanlines / 100;

  for (let i = 0; i < data.length; i += 4) {
    const pixel = i / 4;
    const y = Math.floor(pixel / width);
    const scanFactor = scanPower > 0 && y % 4 === 0 ? 1 - scanPower * 0.42 : 1;
    const noise = item.noiseAmount > 0 ? (rand() - 0.5) * noisePower : 0;
    data[i] = clampChannel(data[i] * scanFactor + noise);
    data[i + 1] = clampChannel(data[i + 1] * scanFactor + noise);
    data[i + 2] = clampChannel(data[i + 2] * scanFactor + noise);
  }
}

function drawProceduralOverlay(ctx, item) {
  if (!hasNoiseEngine(item)) return;
  const rand = seededRandom((item.noiseSeed || 1) + 311);

  if (item.noiseAmount > 0) {
    const step = clamp(Math.round(item.noiseScale / 16), 2, 18);
    ctx.save();
    ctx.globalAlpha = (item.noiseAmount / 100) * 0.45;
    ctx.globalCompositeOperation = "overlay";
    for (let y = -item.h / 2; y < item.h / 2; y += step) {
      for (let x = -item.w / 2; x < item.w / 2; x += step) {
        const value = Math.floor(rand() * 255);
        ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
        ctx.fillRect(x, y, step, step);
      }
    }
    ctx.restore();
  }

  if (item.scanlines > 0) {
    ctx.save();
    ctx.globalAlpha = (item.scanlines / 100) * 0.35;
    ctx.fillStyle = "#000000";
    for (let y = -item.h / 2; y < item.h / 2; y += 5) {
      ctx.fillRect(-item.w / 2, y, item.w, 1);
    }
    ctx.restore();
  }
}

function clipCanvasShape(ctx, item) {
  const w = item.w;
  const h = item.h;
  const x = -w / 2;
  const y = -h / 2;
  ctx.beginPath();

  if (item.shape === "circle") {
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (item.shape === "diamond") {
    ctx.moveTo(0, y);
    ctx.lineTo(x + w, 0);
    ctx.lineTo(0, y + h);
    ctx.lineTo(x, 0);
    ctx.closePath();
  } else if (item.shape === "trapezoid") {
    ctx.moveTo(x + w * 0.12, y);
    ctx.lineTo(x + w * 0.88, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  } else if (item.shape === "slice") {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + h * 0.08);
    ctx.lineTo(x + w * 0.86, y + h);
    ctx.lineTo(x, y + h * 0.92);
    ctx.closePath();
  } else if (item.shape === "soft" && ctx.roundRect) {
    ctx.roundRect(x, y, w, h, 24);
  } else {
    ctx.rect(x, y, w, h);
  }

  ctx.clip();
}

function drawImageCover(ctx, image, x, y, w, h) {
  const imageW = image.videoWidth || image.naturalWidth || image.width;
  const imageH = image.videoHeight || image.naturalHeight || image.height;
  const scale = Math.max(w / imageW, h / imageH);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (imageW - sw) / 2;
  const sy = (imageH - sh) / 2;
  ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
}

function drawTextMaterial(ctx, item) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
  ctx.fillRect(-item.w / 2, -item.h / 2, item.w, item.h);
  ctx.fillStyle = "#171717";
  ctx.font = "700 18px system-ui, sans-serif";
  ctx.textBaseline = "top";
  wrapText(ctx, item.text || item.name, -item.w / 2 + 14, -item.h / 2 + 14, item.w - 28, 24, item.h - 28);
}

function drawFallback(ctx, item) {
  const gradient = ctx.createLinearGradient(-item.w / 2, -item.h / 2, item.w / 2, item.h / 2);
  gradient.addColorStop(0, "rgba(8, 127, 117, 0.32)");
  gradient.addColorStop(1, "rgba(183, 121, 31, 0.24)");
  ctx.fillStyle = gradient;
  ctx.fillRect(-item.w / 2, -item.h / 2, item.w, item.h);
  ctx.fillStyle = "#171717";
  ctx.font = "800 18px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(item.name.slice(0, 34), 0, 0, item.w - 20);
  ctx.textAlign = "start";
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxHeight) {
  const words = String(text).replace(/\s+/g, " ").trim().split(" ");
  let line = "";
  let currentY = y;

  words.forEach((word) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      if (currentY + lineHeight <= y + maxHeight) ctx.fillText(line, x, currentY);
      currentY += lineHeight;
      line = word;
    } else {
      line = testLine;
    }
  });

  if (line && currentY + lineHeight <= y + maxHeight) ctx.fillText(line, x, currentY);
}

function hasNoiseEngine(item) {
  return (
    item.noiseAmount > 0 ||
    item.noiseWarp > 0 ||
    item.glitch > 0 ||
    item.pixelate > 0 ||
    item.scanlines > 0
  );
}

function glitchShadow(item) {
  const base = "0 12px 26px rgba(23, 23, 23, 0.16)";
  if (!item.glitch) return base;

  const shift = Math.max(1, Math.round(item.glitch / 12));
  return [
    base,
    `${shift}px 0 0 rgba(225, 29, 72, 0.34)`,
    `${-shift}px 0 0 rgba(8, 127, 117, 0.32)`,
  ].join(", ");
}

function noiseTexture(seed) {
  const key = String(seed || 1);
  if (noiseTextureCache.has(key)) return noiseTextureCache.get(key);

  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(canvas.width, canvas.height);
  const rand = seededRandom(Number(seed || 1));

  for (let i = 0; i < imageData.data.length; i += 4) {
    const value = Math.floor(rand() * 255);
    imageData.data[i] = value;
    imageData.data[i + 1] = value;
    imageData.data[i + 2] = value;
    imageData.data[i + 3] = 220;
  }

  ctx.putImageData(imageData, 0, 0);
  const url = canvas.toDataURL("image/png");
  noiseTextureCache.set(key, url);
  return url;
}

async function loadImageCached(url) {
  if (!imageCache.has(url)) {
    imageCache.set(url, loadImage(url));
  }
  return imageCache.get(url);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function pointInStage(event) {
  const rect = el.stage.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function kindForFile(file) {
  const type = file.type || "";
  const ext = extensionFor(file.name);
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("text/")) return "text";
  if (["txt", "md", "json", "csv", "html", "css", "js"].includes(ext)) return "text";
  if (ext === "pdf") return "pdf";
  return "material";
}

function extensionFor(name) {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function safeName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "material";
}

function canvasBlendMode(mode) {
  if (mode === "normal") return "source-over";

  const allowed = new Set([
    "multiply",
    "screen",
    "overlay",
    "difference",
    "exclusion",
    "hard-light",
    "color-dodge",
  ]);
  return allowed.has(mode) ? mode : "source-over";
}

function uniqueTags(tags) {
  return Array.from(new Set(tags.filter(Boolean))).slice(0, 12);
}

function argNumber(args, index, fallback, u, v, t, depth) {
  const arg = args[index];
  if (typeof arg === "number" && Number.isFinite(arg)) return arg;
  if (arg?.symbol === "t" || arg?.symbol === "time") return t;
  if (arg?.name) return luminance(sampleSynthNode(arg, u, v, t, depth + 1));
  return fallback;
}

function argNode(args, index) {
  const arg = args[index];
  return arg?.name ? arg : null;
}

function luminance(color) {
  return color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722;
}

function mixColor(a, b, amount) {
  const mix = clamp(amount, 0, 1);
  return [
    a[0] * (1 - mix) + b[0] * mix,
    a[1] * (1 - mix) + b[1] * mix,
    a[2] * (1 - mix) + b[2] * mix,
    a[3] * (1 - mix) + (b[3] ?? 1) * mix,
  ];
}

function addColor(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3]];
}

function diffColor(a, b) {
  return [Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]), a[3]];
}

function multColor(a, b) {
  return [a[0] * b[0], a[1] * b[1], a[2] * b[2], a[3]];
}

function clampColor(color) {
  return [
    clamp(color[0], 0, 1),
    clamp(color[1], 0, 1),
    clamp(color[2], 0, 1),
    clamp(color[3] ?? 1, 0, 1),
  ];
}

function hslToRgb(h, s, l) {
  const hueToRgb = (p, q, hue) => {
    let nextHue = hue;
    if (nextHue < 0) nextHue += 1;
    if (nextHue > 1) nextHue -= 1;
    if (nextHue < 1 / 6) return p + (q - p) * 6 * nextHue;
    if (nextHue < 1 / 2) return q;
    if (nextHue < 2 / 3) return p + (q - p) * (2 / 3 - nextHue) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hueToRgb(p, q, h + 1 / 3), hueToRgb(p, q, h), hueToRgb(p, q, h - 1 / 3)];
}

function smoothNoise(x, y, z) {
  const zFloor = Math.floor(z);
  const zMix = fade(z - zFloor);
  const a = smoothNoise2D(x, y, zFloor);
  const b = smoothNoise2D(x, y, zFloor + 1);
  return lerp(a, b, zMix);
}

function smoothNoise2D(x, y, seed) {
  const xFloor = Math.floor(x);
  const yFloor = Math.floor(y);
  const xMix = fade(x - xFloor);
  const yMix = fade(y - yFloor);
  const n00 = hashNoise(xFloor, yFloor, seed);
  const n10 = hashNoise(xFloor + 1, yFloor, seed);
  const n01 = hashNoise(xFloor, yFloor + 1, seed);
  const n11 = hashNoise(xFloor + 1, yFloor + 1, seed);
  return lerp(lerp(n00, n10, xMix), lerp(n01, n11, xMix), yMix);
}

function fade(value) {
  return value * value * (3 - 2 * value);
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function smoothstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function fract(value) {
  return value - Math.floor(value);
}

function mod(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function seededRandom(seed) {
  let value = Math.floor(seed) || 1;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function hashNoise(x, y, seed) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return value - Math.floor(value);
}

function clampChannel(value) {
  return Math.round(clamp(value, 0, 255));
}

function downloadBlob(content, filename, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function dateStamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
  ].join("");
}

function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

init();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}
