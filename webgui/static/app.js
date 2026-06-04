const state = {
  type: "birthday",
  templateId: null,
  previewDirty: false,
};

const $ = (id) => document.getElementById(id);
const status = (msg, ok = true) => {
  const s = $("status");
  s.textContent = msg;
  s.style.color = ok ? "var(--status-ok)" : "var(--status-err)";
};

// ── Тема ──────────────────────────────────────────────────────────────────
const html = document.documentElement;
const themeBtn = $("themeBtn");

function applyTheme(dark) {
  html.dataset.theme = dark ? "dark" : "light";
  themeBtn.textContent = dark ? "🌙" : "☀️";
  localStorage.setItem("theme", dark ? "dark" : "light");
}

applyTheme(localStorage.getItem("theme") !== "light");
themeBtn.onclick = () => applyTheme(html.dataset.theme !== "dark");

// ── Шаблоны ───────────────────────────────────────────────────────────────
function renderTemplateChips() {
  const list = window.TEMPLATES[state.type] || [];
  const wrap = $("templateChips");
  wrap.innerHTML = "";
  if (!list.length) {
    wrap.innerHTML = '<span style="color:var(--text-dim);font-size:13px">Нет шаблонов для этого типа</span>';
    state.templateId = null;
    return;
  }
  if (!list.find((t) => t.id === state.templateId)) state.templateId = list[0].id;
  list.forEach((t) => {
    const b = document.createElement("button");
    b.className = "chip" + (t.id === state.templateId ? " active" : "");
    b.textContent = t.name;
    b.onclick = () => {
      state.templateId = t.id;
      state.previewDirty = false;
      renderTemplateChips();
      renderPreview();
    };
    wrap.appendChild(b);
  });
}

document.querySelectorAll("#typeChips .chip").forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll("#typeChips .chip").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    state.type = b.dataset.type;
    state.templateId = null;
    state.previewDirty = false;
    renderTemplateChips();
    renderPreview();
  };
});

// ── Предпросмотр в реальном времени ───────────────────────────────────────
function clientRender() {
  const tpls = window.TEMPLATES[state.type] || [];
  const tpl = tpls.find((t) => t.id === state.templateId) || tpls[0];
  if (!tpl) return "";

  const name   = $("name").value.trim()   || "друг";
  const age    = $("age").value.trim()    || "";
  const sender = $("sender").value.trim() || "";
  const wishes = $("wishes").value.trim() || "";

  let text = tpl.text
    .replace(/{name}/g, name)
    .replace(/{age}/g, age)
    .replace(/{sender}/g, sender)
    .replace(/{wishes}/g, wishes);

  if (wishes) text += "\n\nP.S. " + wishes;
  return text;
}

function renderPreview() {
  if (state.previewDirty) return;
  $("result").value = clientRender();
}

let previewTimer = null;
function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreview, 150);
}

["name", "age", "sender", "wishes"].forEach((id) =>
  $(id).addEventListener("input", schedulePreview)
);

$("result").addEventListener("input", () => {
  state.previewDirty = true;
});

// ── Генерация (сохраняет в историю) ──────────────────────────────────────
async function generate() {
  const payload = {
    type: state.type,
    template_id: state.templateId,
    name: $("name").value,
    age: $("age").value,
    sender: $("sender").value,
    wishes: $("wishes").value,
  };
  const r = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await r.json();
  if (!r.ok) {
    status(data.error || "Ошибка", false);
    return;
  }
  state.previewDirty = false;
  $("result").value = data.text;
  status("Поздравление сгенерировано");
  loadHistory();
}

$("generateBtn").onclick = generate;

// ── Копировать / Скачать / Очистить ───────────────────────────────────────
$("copyBtn").onclick = async () => {
  const text = $("result").value;
  if (!text) return status("Нечего копировать", false);
  try {
    await navigator.clipboard.writeText(text);
    status("Скопировано в буфер обмена");
  } catch {
    status("Не удалось скопировать", false);
  }
};

$("downloadBtn").onclick = async () => {
  const text = $("result").value;
  if (!text) return status("Нечего сохранять", false);
  const r = await fetch("/api/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "greeting.txt";
  a.click();
  URL.revokeObjectURL(url);
  status("Файл сохранён");
};

$("clearFormBtn").onclick = () => {
  ["name", "age", "sender", "wishes"].forEach((id) => ($(id).value = ""));
  state.previewDirty = false;
  $("result").value = "";
  status("Форма очищена");
};

// ── История с поиском ────────────────────────────────────────────────────
let historyItems = [];

$("clearHistoryBtn").onclick = async () => {
  if (!confirm("Очистить всю историю?")) return;
  await fetch("/api/history", { method: "DELETE" });
  historyItems = [];
  renderHistory("");
  status("История очищена");
};

$("historySearch").addEventListener("input", (e) =>
  renderHistory(e.target.value.trim().toLowerCase())
);

function renderHistory(query) {
  const ul = $("history");
  ul.innerHTML = "";
  const filtered = query
    ? historyItems.filter(
        (it) =>
          it.name.toLowerCase().includes(query) ||
          it.type_label.toLowerCase().includes(query) ||
          it.template.toLowerCase().includes(query)
      )
    : historyItems;

  if (!filtered.length) {
    ul.innerHTML = `<li style="cursor:default;color:var(--text-dim);font-size:13px">${
      query ? "Ничего не найдено" : "История пуста"
    }</li>`;
    return;
  }
  filtered.forEach((it) => {
    const li = document.createElement("li");
    li.innerHTML =
      `<div class="meta">${it.ts} · ${it.type_label} · ${it.template} · ${it.name}</div>` +
      `<div class="preview">${it.text.replace(/\n/g, " ")}</div>`;
    li.onclick = () => {
      $("result").value = it.text;
      state.previewDirty = true;
      status("Загружено из истории");
    };
    ul.appendChild(li);
  });
}

async function loadHistory() {
  const r = await fetch("/api/history");
  historyItems = await r.json();
  renderHistory($("historySearch").value.trim().toLowerCase());
}

// ── Форматирование ────────────────────────────────────────────────────────
const EMOJIS = [
  "🎉","🎂","🎁","🥳","🎊","🌸","🌹","💐",
  "❤️","💕","💖","🥂","🍾","✨","⭐","🌟",
  "💫","🎵","🎶","🏆","🎓","👑","🙏","😊",
  "😍","🤗","💪","🌈","🌺","🦋","🎀","🕊️",
];

const emojiPicker = $("emojiPicker");
EMOJIS.forEach((em) => {
  const b = document.createElement("button");
  b.textContent = em;
  b.title = em;
  b.onclick = () => {
    insertAtCursor($("result"), em);
    emojiPicker.classList.remove("open");
    state.previewDirty = true;
  };
  emojiPicker.appendChild(b);
});

$("emojiBtn").onclick = (e) => {
  e.stopPropagation();
  emojiPicker.classList.toggle("open");
};
document.addEventListener("click", () => emojiPicker.classList.remove("open"));

function insertAtCursor(ta, text) {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
  ta.selectionStart = ta.selectionEnd = start + text.length;
  ta.focus();
}

function wrapSelection(ta, marker) {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const selected = ta.value.slice(start, end);
  const wrapped = marker + selected + marker;
  ta.value = ta.value.slice(0, start) + wrapped + ta.value.slice(end);
  ta.selectionStart = start + marker.length;
  ta.selectionEnd = end + marker.length;
  ta.focus();
  state.previewDirty = true;
}

$("boldBtn").onclick = () => wrapSelection($("result"), "**");
$("italicBtn").onclick = () => wrapSelection($("result"), "*");

$("result").addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); wrapSelection($("result"), "**"); }
  if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); wrapSelection($("result"), "*"); }
});

// ── Шрифт и размер ───────────────────────────────────────────────────────
const resultTA = $("result");

$("fontSelect").addEventListener("change", (e) => {
  resultTA.style.fontFamily = e.target.value;
  localStorage.setItem("fontFamily", e.target.value);
});

$("fontSizeSelect").addEventListener("change", (e) => {
  resultTA.style.fontSize = e.target.value;
  localStorage.setItem("fontSize", e.target.value);
});

(function restoreFont() {
  const ff = localStorage.getItem("fontFamily");
  const fs = localStorage.getItem("fontSize");
  if (ff) { resultTA.style.fontFamily = ff; $("fontSelect").value = ff; }
  if (fs) { resultTA.style.fontSize = fs; $("fontSizeSelect").value = fs; }
})();

// ── Инициализация ─────────────────────────────────────────────────────────
renderTemplateChips();
renderPreview();
loadHistory();
