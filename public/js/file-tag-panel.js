(function () {
  const uiLang = String(window.__kwLang || "zh-CN");
  const I18N = {
    "zh-CN": {
      saveTagFail: "标签保存失败",
      head: "标签与备注",
      score: "评分",
      scoreUnrated: "0（未评分）",
      scoreUnit: "分",
      saveScore: "保存评分",
      noTags: "暂无标签",
      removeTagAria: (t) => `删除标签 ${t}`,
      tagInputPlaceholder: "输入标签，回车或点添加",
      add: "添加",
      notePlaceholder: "备注：简要说明文件内容（可选）",
      saveNote: "保存备注",
    },
    en: {
      saveTagFail: "Failed to save tags",
      head: "Tags & Notes",
      score: "Score",
      scoreUnrated: "0 (Unrated)",
      scoreUnit: "pt",
      saveScore: "Save Score",
      noTags: "No tags",
      removeTagAria: (t) => `Remove tag ${t}`,
      tagInputPlaceholder: "Enter tag and press Enter or Add",
      add: "Add",
      notePlaceholder: "Note: brief description of this file (optional)",
      saveNote: "Save Note",
    },
    ja: {
      saveTagFail: "タグの保存に失敗しました",
      head: "タグとメモ",
      score: "評価",
      scoreUnrated: "0（未評価）",
      scoreUnit: "点",
      saveScore: "評価を保存",
      noTags: "タグなし",
      removeTagAria: (t) => `タグを削除 ${t}`,
      tagInputPlaceholder: "タグを入力し Enter または追加を押してください",
      add: "追加",
      notePlaceholder: "メモ：ファイル内容の簡単な説明（任意）",
      saveNote: "メモを保存",
    },
  };
  function t(key, ...args) {
    const pack = I18N[uiLang] || I18N["zh-CN"];
    const value = pack[key];
    if (typeof value === "function") return value(...args);
    return value ?? I18N["zh-CN"][key] ?? key;
  }
  /**
   * @param {string} filePath
   * @param {string[]} initialTags
   * @param {string} initialNote
   * @param {number} initialScore
   * @param {{ textContent: string, classList: DOMTokenList }} statusLineEl 用于显示保存错误（如 #status）
   */
  function createFileTagPanel(filePath, initialTags, initialNote, initialScore, statusLineEl) {
    let tags = Array.isArray(initialTags) ? [...initialTags] : [];
    let note = typeof initialNote === "string" ? initialNote : "";
    let score = Number.isFinite(Number(initialScore))
      ? Math.min(10, Math.max(0, Math.trunc(Number(initialScore))))
      : 0;
    const root = document.createElement("div");
    root.className = "file-tag-panel";

    async function saveTags(payload) {
      const res = await fetch("/api/file-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (statusLineEl) {
          statusLineEl.textContent = data.error || t("saveTagFail");
          statusLineEl.classList.add("error");
        }
        return false;
      }
      if (statusLineEl) {
        statusLineEl.classList.remove("error");
      }
      tags = Array.isArray(data.tags) ? data.tags : [];
      note = typeof data.note === "string" ? data.note : "";
      score = Number.isFinite(Number(data.score))
        ? Math.min(10, Math.max(0, Math.trunc(Number(data.score))))
        : 0;
      render();
      return true;
    }

    function render() {
      root.replaceChildren();

      const head = document.createElement("div");
      head.className = "file-tag-head";
      head.textContent = t("head");
      root.appendChild(head);

      const scoreRow = document.createElement("div");
      scoreRow.className = "file-tag-score";
      const scoreLabel = document.createElement("span");
      scoreLabel.className = "file-tag-score-label";
      scoreLabel.textContent = t("score");
      const scoreSel = document.createElement("select");
      scoreSel.className = "file-tag-score-select";
      for (let i = 10; i >= 0; i--) {
        const op = document.createElement("option");
        op.value = String(i);
        op.textContent = i === 0 ? t("scoreUnrated") : `${i} ${t("scoreUnit")}`;
        if (i === score) op.selected = true;
        scoreSel.appendChild(op);
      }
      const scoreSaveBtn = document.createElement("button");
      scoreSaveBtn.type = "button";
      scoreSaveBtn.className = "tag-score-save";
      scoreSaveBtn.textContent = t("saveScore");
      scoreSaveBtn.addEventListener("click", () => saveTags({ score: Number(scoreSel.value) }));
      scoreRow.appendChild(scoreLabel);
      scoreRow.appendChild(scoreSel);
      scoreRow.appendChild(scoreSaveBtn);
      root.appendChild(scoreRow);

      const chipRow = document.createElement("div");
      chipRow.className = "file-tags-chips";
      if (!tags.length) {
        const empty = document.createElement("span");
        empty.className = "file-tags-empty";
        empty.textContent = t("noTags");
        chipRow.appendChild(empty);
      } else {
        for (const tag of tags) {
          const chip = document.createElement("span");
          chip.className = "tag-chip";
          const lab = document.createElement("span");
          lab.className = "tag-chip-text";
          lab.textContent = tag;
          const x = document.createElement("button");
          x.type = "button";
          x.className = "tag-chip-remove";
          x.setAttribute("aria-label", t("removeTagAria", tag));
          x.textContent = "×";
          x.addEventListener("click", () => saveTags({ removeTag: tag }));
          chip.appendChild(lab);
          chip.appendChild(x);
          chipRow.appendChild(chip);
        }
      }
      root.appendChild(chipRow);

      const addRow = document.createElement("div");
      addRow.className = "file-tag-add";
      const inp = document.createElement("input");
      inp.type = "text";
      inp.placeholder = t("tagInputPlaceholder");
      inp.maxLength = 40;
      inp.autocomplete = "off";
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "tag-add-btn";
      addBtn.textContent = t("add");
      const doAdd = () => {
        const v = inp.value.trim();
        if (!v) return;
        inp.value = "";
        saveTags({ addTag: v });
      };
      addBtn.addEventListener("click", doAdd);
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          doAdd();
        }
      });
      addRow.appendChild(inp);
      addRow.appendChild(addBtn);
      root.appendChild(addRow);

      const noteRow = document.createElement("div");
      noteRow.className = "file-tag-note";
      const ta = document.createElement("textarea");
      ta.className = "tag-note-input";
      ta.rows = 2;
      ta.placeholder = t("notePlaceholder");
      ta.maxLength = 2000;
      ta.value = note;
      const saveN = document.createElement("button");
      saveN.type = "button";
      saveN.className = "tag-note-save";
      saveN.textContent = t("saveNote");
      saveN.addEventListener("click", () => saveTags({ note: ta.value }));
      noteRow.appendChild(ta);
      noteRow.appendChild(saveN);
      root.appendChild(noteRow);
    }

    render();
    return root;
  }

  window.createFileTagPanel = createFileTagPanel;
})();
