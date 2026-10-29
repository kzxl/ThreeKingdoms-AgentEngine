var Qt = Object.defineProperty;
var Wt = (i, t, e) => t in i ? Qt(i, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : i[t] = e;
var r = (i, t, e) => Wt(i, typeof t != "symbol" ? t + "" : t, e);
class zt {
  constructor() {
    r(this, "stack", []);
    r(this, "isEscListenerAttached", !1);
    r(this, "BASE_Z_INDEX", 1e3);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }
  /**
   * Pushes a newly opened modal onto the stack and manages focus/z-index.
   */
  push(t, e) {
    const s = this.stack.indexOf(t);
    s > -1 && this.stack.splice(s, 1), this.stack.push(t);
    const a = this.BASE_Z_INDEX + this.stack.length * 10;
    e.style.zIndex = a.toString(), this.ensureEscListener(), this.updateBodyScrollLock();
  }
  /**
   * Removes a closed modal from the stack.
   */
  remove(t) {
    const e = this.stack.indexOf(t);
    e > -1 && this.stack.splice(e, 1), this.updateBodyScrollLock();
  }
  /**
   * Returns the topmost active modal on the stack.
   */
  getTop() {
    return this.stack.length === 0 ? null : this.stack[this.stack.length - 1];
  }
  /**
   * Closes the topmost modal on Esc keypress.
   */
  handleKeyDown(t) {
    if (t.key === "Escape" || t.keyCode === 27) {
      const e = this.getTop();
      e && (t.preventDefault(), t.stopPropagation(), e.close());
    }
  }
  ensureEscListener() {
    typeof window > "u" || this.isEscListenerAttached || (window.addEventListener("keydown", this.handleKeyDown, !0), this.isEscListenerAttached = !0);
  }
  updateBodyScrollLock() {
    typeof document > "u" || (this.stack.length > 0 ? document.body.classList.add("modal-open") : document.body.classList.remove("modal-open"));
  }
}
const lt = new zt(), Yt = /* @__PURE__ */ new Set([
  "spatial-tavern-modal",
  "spatial-arena-modal",
  "spatial-residence-modal",
  "grand-command-hub-modal",
  "personal-journal-modal",
  "caravan-modal"
]);
function Xt(i) {
  return Yt.has(i);
}
class Jt {
  constructor(t) {
    r(this, "id");
    r(this, "options");
    r(this, "backdropEl", null);
    r(this, "dialogEl", null);
    r(this, "titleEl", null);
    r(this, "subtitleEl", null);
    r(this, "sealEl", null);
    r(this, "tabBarEl", null);
    r(this, "bodyEl", null);
    r(this, "footerEl", null);
    r(this, "_isOpen", !1);
    r(this, "_activeTab", null);
    this.id = t.id, this.options = {
      closeOnEsc: !0,
      closeOnBackdrop: !0,
      size: "lg",
      ...t
    }, this._activeTab = t.activeTabId || (t.tabs && t.tabs.length > 0 ? t.tabs[0].id : null), this.mountDom();
  }
  get isOpen() {
    return this._isOpen;
  }
  get activeTab() {
    return this._activeTab;
  }
  /**
   * Mounts or reuses modal DOM elements in the document.
   */
  mountDom() {
    if (typeof document > "u") return;
    if (Xt(this.id)) {
      typeof console < "u" && console.warn(`[ModalShell] "${this.id}" is owned by a legacy renderer; shell not mounted.`);
      return;
    }
    let t = document.getElementById(this.id);
    t || (t = document.createElement("div"), t.id = this.id, document.body.appendChild(t)), this.backdropEl = t, this.backdropEl.className = `modal-backdrop hidden ${this.options.customClass || ""}`.trim();
    const s = {
      sm: "modal-sm",
      md: "modal-md",
      lg: "modal-lg spatial-poi-dialog",
      xl: "modal-box--large spatial-poi-dialog",
      full: "modal-full spatial-poi-dialog"
    }[this.options.size || "lg"] || "modal-lg";
    this.backdropEl.innerHTML = `
      <div class="modal-dialog ${s} ${this.options.dialogClass || ""}" role="dialog" aria-modal="true" aria-labelledby="${this.id}-title">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-title-seal" id="${this.id}-seal">${this.options.seal || "◈"}</span>
            <div>
              <h2 class="modal-title-text" id="${this.id}-title">${this.options.title}</h2>
              <div class="modal-subtitle" id="${this.id}-subtitle">${this.options.subtitle || ""}</div>
            </div>
          </div>
          <button class="ui-btn ui-btn--ghost ui-btn--icon" id="${this.id}-btn-close" title="Đóng [Esc]" aria-label="Close">×</button>
        </div>
        ${this.options.tabs && this.options.tabs.length > 0 ? `<div class="modal-tab-bar" id="${this.id}-tab-bar"></div>` : ""}
        <div class="modal-body" id="${this.id}-body"></div>
        <div class="modal-footer hidden" id="${this.id}-footer"></div>
      </div>
    `, this.dialogEl = this.backdropEl.querySelector(".modal-dialog"), this.titleEl = this.backdropEl.querySelector(`#${this.id}-title`), this.subtitleEl = this.backdropEl.querySelector(`#${this.id}-subtitle`), this.sealEl = this.backdropEl.querySelector(`#${this.id}-seal`), this.tabBarEl = this.backdropEl.querySelector(`#${this.id}-tab-bar`), this.bodyEl = this.backdropEl.querySelector(`#${this.id}-body`), this.footerEl = this.backdropEl.querySelector(`#${this.id}-footer`);
    const a = this.backdropEl.querySelector(`#${this.id}-btn-close`);
    a && a.addEventListener("click", (n) => {
      n.preventDefault(), this.close();
    }), this.options.closeOnBackdrop && this.backdropEl.addEventListener("click", (n) => {
      n.target === this.backdropEl && this.close();
    }), this.options.tabs && this.options.tabs.length > 0 && this.renderTabs(this.options.tabs), this.options.actions && this.options.actions.length > 0 && this.setFooter(this.options.actions);
  }
  /**
   * Renders the tab buttons into the modal-tab-bar container.
   */
  renderTabs(t) {
    this.tabBarEl && (this.tabBarEl.innerHTML = t.map(
      (e) => `
        <button class="modal-tab-btn ${e.id === this._activeTab ? "active" : ""} ${e.disabled ? "disabled" : ""}" 
                data-tab-id="${e.id}" 
                ${e.disabled ? "disabled" : ""}>
          ${e.seal ? `<span class="tab-seal">${e.seal}</span>` : ""}
          <span class="tab-label">${e.label}</span>
          ${e.badge !== void 0 ? `<span class="tab-badge">${e.badge}</span>` : ""}
        </button>
      `
    ).join(""), this.tabBarEl.querySelectorAll(".modal-tab-btn").forEach((e) => {
      e.addEventListener("click", (s) => {
        s.preventDefault();
        const a = e.getAttribute("data-tab-id");
        a && a !== this._activeTab && this.switchTab(a);
      });
    }));
  }
  async open(t) {
    this.backdropEl || this.mountDom(), this.backdropEl && (t && t !== this._activeTab && (this._activeTab = t, this.updateActiveTabButton()), this.backdropEl.classList.remove("hidden"), this._isOpen = !0, lt.push(this, this.backdropEl), this.options.onOpen && await this.options.onOpen(this));
  }
  async close() {
    !this._isOpen || !this.backdropEl || (this.backdropEl.classList.add("hidden"), this._isOpen = !1, lt.remove(this), this.options.onClose && await this.options.onClose(this));
  }
  async toggle() {
    this._isOpen ? await this.close() : await this.open();
  }
  setContent(t) {
    this.bodyEl && (typeof t == "string" ? this.bodyEl.innerHTML = t : (this.bodyEl.innerHTML = "", this.bodyEl.appendChild(t)));
  }
  setTitle(t, e, s) {
    this.titleEl && (this.titleEl.textContent = t), e !== void 0 && this.subtitleEl && (this.subtitleEl.textContent = e), s !== void 0 && this.sealEl && (this.sealEl.textContent = s);
  }
  async switchTab(t) {
    this._activeTab = t, this.updateActiveTabButton(), this.options.onTabChange && await this.options.onTabChange(t, this);
  }
  updateActiveTabButton() {
    this.tabBarEl && this.tabBarEl.querySelectorAll(".modal-tab-btn").forEach((t) => {
      const e = t.getAttribute("data-tab-id");
      t.classList.toggle("active", e === this._activeTab);
    });
  }
  updateTabBadge(t, e) {
    if (!this.tabBarEl) return;
    const s = this.tabBarEl.querySelector(`[data-tab-id="${t}"]`);
    if (!s) return;
    let a = s.querySelector(".tab-badge");
    e == null || e === "" ? a && a.remove() : (a || (a = document.createElement("span"), a.className = "tab-badge", s.appendChild(a)), a.textContent = String(e));
  }
  setFooter(t) {
    if (this.footerEl)
      if (Array.isArray(t)) {
        this.footerEl.innerHTML = "", this.footerEl.className = "modal-footer flex items-center justify-end gap-3";
        for (const e of t) {
          const s = document.createElement("button"), a = e.variant === "ghost" ? "ui-btn--ghost" : e.variant === "danger" ? "ui-btn--danger" : e.variant === "gold" ? "ui-btn--accent" : "ui-btn--primary";
          s.className = `ui-btn ${a}`, s.textContent = e.label, e.disabled && (s.disabled = !0), s.addEventListener("click", async (n) => {
            n.preventDefault(), await e.onClick(this);
          }), this.footerEl.appendChild(s);
        }
        this.footerEl.classList.remove("hidden");
      } else typeof t == "string" ? (this.footerEl.innerHTML = t, this.footerEl.classList.remove("hidden")) : (this.footerEl.innerHTML = "", this.footerEl.appendChild(t), this.footerEl.classList.remove("hidden"));
  }
  getBodyElement() {
    return this.bodyEl;
  }
  getDialogElement() {
    return this.dialogEl;
  }
  destroy() {
    this._isOpen && this.close(), this.options.onDestroy && this.options.onDestroy(this), this.backdropEl && this.backdropEl.parentNode && this.backdropEl.parentNode.removeChild(this.backdropEl), this.backdropEl = null, this.dialogEl = null, this.bodyEl = null, this.tabBarEl = null, this.footerEl = null;
  }
}
function m(i) {
  return new Jt(i);
}
function N(i) {
  return String(i).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function Ht(i = {}) {
  const e = ["ui-btn", `ui-btn--${i.variant || "secondary"}`];
  return i.size === "sm" && e.push("ui-btn--sm"), i.size === "lg" && e.push("ui-btn--lg"), i.className && e.push(i.className), e.join(" ");
}
function ct(i) {
  const t = N(i.label), e = i.icon ? `<span class="ui-btn__icon" aria-hidden="true">${N(i.icon)}</span>` : "";
  return `<button ${[
    `class="${N(Ht(i))}"`,
    i.id ? `id="${N(i.id)}"` : "",
    i.title ? `title="${N(i.title)}"` : "",
    i.disabled ? "disabled" : "",
    `type="${i.type || "button"}"`,
    i.onClick ? `onclick="${N(i.onClick)}"` : ""
  ].filter(Boolean).join(" ")}>${e}<span class="ui-btn__label">${t}</span></button>`;
}
function Zt(i) {
  const t = document.createElement("button");
  return t.className = Ht(i), t.type = i.type || "button", i.id && (t.id = i.id), i.title && (t.title = i.title), t.disabled = !!i.disabled, t.innerHTML = `${i.icon ? `<span class="ui-btn__icon" aria-hidden="true">${N(i.icon)}</span>` : ""}<span class="ui-btn__label">${N(i.label)}</span>`, t;
}
function nt(i) {
  return String(i).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function te(i) {
  const e = ["ui-badge", `ui-badge--${i.tone || "neutral"}`, i.className || ""].filter(Boolean).join(" "), s = i.title ? ` title="${nt(i.title)}"` : "";
  return `<span class="${nt(e)}"${s}>${nt(i.label)}</span>`;
}
function ee(i) {
  const t = document.createElement("span");
  return t.className = ["ui-badge", `ui-badge--${i.tone || "neutral"}`, i.className || ""].filter(Boolean).join(" "), i.title && (t.title = i.title), t.textContent = i.label, t;
}
function se(i) {
  return String(i).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function ae(i, t = "info") {
  const e = window;
  if (typeof e.showToast == "function")
    try {
      e.showToast(i, t === "danger");
      return;
    } catch {
    }
  const s = document.getElementById("toast");
  if (!s) {
    console.log(`[toast:${t}] ${i}`);
    return;
  }
  s.textContent = i, s.dataset.tone = t, s.classList.remove("hidden"), window.setTimeout(() => s.classList.add("hidden"), 2800);
}
let ie = 0;
function ne(i) {
  return new Promise((t) => {
    var l;
    let e = !1;
    const s = (h) => {
      e || (e = !0, t(h));
    }, a = m({
      id: `ui-confirm-${++ie}`,
      title: i.title || "Xác nhận",
      seal: "問",
      size: "sm",
      onClose: () => {
        s(!1), window.setTimeout(() => a.destroy(), 0);
      }
    });
    a.setContent(
      `<div class="ui-confirm">
         <div class="ui-confirm__message">${se(i.message)}</div>
         <div class="ui-toolbar ui-confirm__actions">
           ${ct({ label: i.cancelLabel || "Hủy", variant: "ghost", size: "sm" })}
           ${ct({
        label: i.confirmLabel || "Xác nhận",
        variant: i.danger ? "danger" : "primary",
        size: "sm"
      })}
         </div>
       </div>`
    );
    const n = (l = a.getBodyElement()) == null ? void 0 : l.querySelectorAll(".ui-confirm__actions .ui-btn");
    n && n.length === 2 && (n[0].addEventListener("click", () => void a.close()), n[1].addEventListener("click", () => {
      s(!0), a.close();
    })), a.open();
  });
}
const oe = {
  version: "1.0.0",
  button: { html: ct, create: Zt },
  badge: { html: te, create: ee },
  toast: ae,
  confirm: ne
}, I = class I {
  static getInstance() {
    return I.instance || (I.instance = new I()), I.instance;
  }
  async get(t, e) {
    let s = t;
    if (e) {
      const n = new URLSearchParams();
      for (const [h, b] of Object.entries(e))
        b != null && n.append(h, String(b));
      const l = n.toString();
      l && (s += (s.includes("?") ? "&" : "?") + l);
    }
    const a = await fetch(s);
    if (!a.ok) {
      const n = await a.json().catch(() => ({}));
      throw new Error(n.error || `HTTP error ${a.status}: ${a.statusText}`);
    }
    return a.json();
  }
  async post(t, e) {
    const s = await fetch(t, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: e ? JSON.stringify(e) : void 0
    }), a = await s.json().catch(() => ({}));
    if (!s.ok || a && a.success === !1)
      throw new Error(a.error || `HTTP error ${s.status}: ${s.statusText}`);
    return a;
  }
};
r(I, "instance");
let dt = I;
const u = dt.getInstance(), L = class L {
  static getInstance() {
    return L.instance || (L.instance = new L()), L.instance;
  }
  async getOverview() {
    const t = await u.get("/api/lineage/status");
    return t.overview || t;
  }
  async getCourtshipCandidates() {
    return (await u.get("/api/lineage/courtship-candidates")).candidates || [];
  }
  async proposeMarriage(t) {
    return u.post("/api/lineage/courtship/propose", { spouseNpcId: t });
  }
  async restAndCohabit(t) {
    return u.post("/api/lineage/household/rest", { marriageId: t });
  }
  async assignHouseholdRole(t, e) {
    return u.post("/api/lineage/household/set-role", { marriageId: t, role: e });
  }
  async assignMentor(t, e) {
    return u.post("/api/lineage/children/assign-mentor", { childId: t, mentorNpcId: e });
  }
  async designateHeir(t) {
    return u.post("/api/lineage/children/designate-heir", { childId: t });
  }
  async executeSuccession(t) {
    return u.post("/api/lineage/succession/execute", { heirChildId: t });
  }
};
r(L, "instance");
let ht = L;
const T = ht.getInstance();
class re {
  constructor() {
    r(this, "modal");
    r(this, "overview", null);
    r(this, "candidates", []);
    r(this, "selectedStratumFilter", "ALL");
    this.modal = m({
      id: "standard-lineage-family-modal",
      title: "Gia Thất & Thế Gia Vọng Tộc",
      subtitle: "Cầu hôn giai nhân, bồi dưỡng thế tử kế nghiệp, kiến lập gia tộc ngàn đời",
      seal: "家",
      size: "xl",
      tabs: [
        { id: "courtship", label: "Cầu Hôn & Thê Thiếp", seal: "姻" },
        { id: "heirs", label: "Hậu Duệ & Thụ Giáo", seal: "嗣" },
        { id: "tree", label: "Gia Phả Dòng Họ", seal: "譜" },
        { id: "succession", label: "Tông Miếu & Thừa Kế", seal: "繼" }
      ],
      activeTabId: "courtship",
      onOpen: async () => {
        await this.refreshData(), await this.renderActiveTab();
      },
      onTabChange: async (t) => {
        await this.renderActiveTab();
      }
    });
  }
  async open(t = "courtship") {
    await this.modal.open(t);
  }
  async close() {
    await this.modal.close();
  }
  async refreshData() {
    var t, e;
    try {
      const [s, a] = await Promise.all([
        T.getOverview().catch(() => null),
        T.getCourtshipCandidates().catch(() => [])
      ]);
      this.overview = s, this.candidates = a;
      const n = ((t = s == null ? void 0 : s.spouses) == null ? void 0 : t.length) || 0, l = ((e = s == null ? void 0 : s.children) == null ? void 0 : e.length) || 0;
      this.modal.updateTabBadge("courtship", n > 0 ? n : void 0), this.modal.updateTabBadge("heirs", l > 0 ? l : void 0);
    } catch (s) {
      console.error("[LineageFamilyModal] Error refreshing data:", s);
    }
  }
  async renderActiveTab() {
    switch (this.modal.activeTab || "courtship") {
      case "courtship":
        this.renderCourtshipTab();
        break;
      case "heirs":
        this.renderHeirsTab();
        break;
      case "tree":
        this.renderTreeTab();
        break;
      case "succession":
        this.renderSuccessionTab();
        break;
      default:
        this.renderCourtshipTab();
    }
  }
  renderCourtshipTab() {
    var n, l, h;
    const t = ((n = this.overview) == null ? void 0 : n.spouses) || [], e = t.length > 0;
    let s = this.candidates;
    this.selectedStratumFilter !== "ALL" && (s = this.candidates.filter((b) => b.socialStratum === this.selectedStratumFilter));
    const a = `
      <div class="lineage-modal-content">
        <!-- Clan Banner -->
        <div class="spatial-banner-lead">
          <div class="lead-seal">家</div>
          <div class="lead-text">
            <h3>Gia Tộc Thế Hệ Thứ ${((l = this.overview) == null ? void 0 : l.generation) || 1} • Danh Vọng Gia Tộc: ${((h = this.overview) == null ? void 0 : h.clanPrestige) || 100}</h3>
            <div class="text-muted text-sm">
              ${e ? `Đã thành gia lập thất với ${t.length} phu nhân. Gia đạo hòa thuận, con cháu hưng vượng.` : "Chưa lập gia thất. Hãy tìm kiếm giai nhân phù hợp từ thường dân hoặc danh môn để kết tóc se duyên."}
            </div>
          </div>
        </div>

        <!-- Current Spouses Section -->
        ${e ? `
          <div class="section-title text-gold font-bold mb-3">Chính Thê & Thê Thiếp Đang Chung Sống:</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            ${t.map((b) => this.renderSpouseCard(b)).join("")}
          </div>
        ` : ""}

        <!-- Courtship Section -->
        <div class="flex items-center justify-between mb-3 border-b border-amber-900/40 pb-2">
          <div class="section-title text-gold font-bold">Danh Sách Giai Nhân & Đối Tượng Cầu Hôn:</div>
          <div class="flex gap-2">
            <button class="ui-btn ui-btn--sm ${this.selectedStratumFilter === "ALL" ? "ui-btn--primary" : "ui-btn--ghost"}" onclick="window.LineageFamilyUI.setFilter('ALL')">Tất Cả (${this.candidates.length})</button>
            <button class="ui-btn ui-btn--sm ${this.selectedStratumFilter === "PEASANT" ? "ui-btn--primary" : "ui-btn--ghost"}" onclick="window.LineageFamilyUI.setFilter('PEASANT')">Nông Gia</button>
            <button class="ui-btn ui-btn--sm ${this.selectedStratumFilter === "ARTISAN_SHOP" ? "ui-btn--primary" : "ui-btn--ghost"}" onclick="window.LineageFamilyUI.setFilter('ARTISAN_SHOP')">Thợ Xưởng</button>
            <button class="ui-btn ui-btn--sm ${this.selectedStratumFilter === "GENTRY_CLAN" ? "ui-btn--primary" : "ui-btn--ghost"}" onclick="window.LineageFamilyUI.setFilter('GENTRY_CLAN')">Sĩ Tộc</button>
            <button class="ui-btn ui-btn--sm ${this.selectedStratumFilter === "HISTORICAL_HEROINE" ? "ui-btn--primary" : "ui-btn--ghost"}" onclick="window.LineageFamilyUI.setFilter('HISTORICAL_HEROINE')">Danh Viện</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          ${s.length > 0 ? s.map((b) => this.renderCandidateCard(b)).join("") : '<div class="text-muted col-span-full py-6 text-center">Không có giai nhân nào trong danh mục này.</div>'}
        </div>
      </div>
    `;
    this.modal.setContent(a);
  }
  renderSpouseCard(t) {
    const e = [
      { id: "HOUSEKEEPER", name: "Quản Gia Tề Nội" },
      { id: "ENTERPRISE_SUPERVISOR", name: "Giám Sát Sản Nghiệp" },
      { id: "STRATEGIC_ADVISOR", name: "Mưu Lược Tham Mưu" },
      { id: "MILITARY_DEFENDER", name: "Thống Soái Hộ Vệ" }
    ], s = Number(t.pregnancy_stage) > 0, a = Number(t.pregnancy_stage) === 1 ? "Thai Nghén Sơ Kỳ (Tháng 1)" : Number(t.pregnancy_stage) === 2 ? "Thai Kỳ Trung Kỳ (Tháng 2)" : Number(t.pregnancy_stage) === 3 ? "Sắp Đến Ngày Lâm Bồn!" : "Bình thường";
    return `
      <div class="tactical-card border-l-4 border-pink-500 p-3 bg-slate-900/80 rounded">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h4 class="text-amber-200 font-bold text-base m-0">${t.wife_name_vi}</h4>
            <div class="text-xs text-muted">Hôn Lễ: Ngày ${t.marriage_date} (Lượt ${t.marriage_turn})</div>
          </div>
          <div class="badge ${s ? "badge-danger animate-pulse" : "badge-neutral"} text-xs">
            ${s ? "育 " + a : "Hảo Cảm: " + t.intimacy}
          </div>
        </div>

        <div class="text-xs text-slate-300 mb-3 bg-slate-950/60 p-2 rounded border border-amber-900/30">
          <div class="font-semibold text-amber-300/90 mb-1">Trọng Trách Nội Trạch:</div>
          <select class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-100" 
                  onchange="window.LineageFamilyUI.assignRole('${t.marriage_id}', this.value)">
            ${e.map((n) => `<option value="${n.id}" ${t.household_role === n.id ? "selected" : ""}>${n.name}</option>`).join("")}
          </select>
          <div class="text-muted mt-1 italic">${t.role_effect_desc_vi || ""}</div>
        </div>

        <div class="flex gap-2">
          <button class="ui-btn ui-btn--primary ui-btn--sm flex-1" onclick="window.LineageFamilyUI.restCohabit('${t.marriage_id}')">
            心 Nghỉ Ngơi & Đồng Tẩm
          </button>
        </div>
      </div>
    `;
  }
  renderCandidateCard(t) {
    const s = {
      PEASANT: { label: "Nông Thôn", color: "badge-success" },
      ARTISAN_SHOP: { label: "Thợ Xưởng", color: "badge-info" },
      GENTRY_CLAN: { label: "Sĩ Tộc", color: "badge-warning" },
      HISTORICAL_HEROINE: { label: "Danh Viện", color: "badge-danger" }
    }[t.socialStratum || "HISTORICAL_HEROINE"] || { label: "Danh Viện", color: "badge-danger" };
    return `
      <div class="tactical-card p-3 bg-slate-900/70 border border-slate-800 rounded flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-start mb-2">
            <h4 class="text-amber-100 font-bold m-0 text-sm">${t.nameVi}</h4>
            <span class="badge ${s.color} text-xs">${s.label}</span>
          </div>

          <div class="text-xs text-muted mb-2 line-clamp-2">${t.clueVi}</div>

          ${t.maternalTrait ? `
            <div class="bg-amber-950/30 border border-amber-900/40 rounded p-1.5 text-xs text-amber-300 mb-2">
              <span class="font-bold">Huyết Mạch:</span> ${t.maternalTrait.traitNameVi}
              <div class="text-muted text-[11px]">${t.maternalTrait.descriptionVi}</div>
            </div>
          ` : ""}

          <div class="text-xs text-slate-300 mb-3 flex items-center justify-between">
            <span>Sính Lễ Yêu Cầu:</span>
            <span class="text-amber-400 font-mono font-bold">${(t.recommendedDowryCash ?? 0).toLocaleString()} Quan</span>
          </div>
        </div>

        <button class="ui-btn ui-btn--accent ui-btn--sm w-full" 
                onclick="window.LineageFamilyUI.proposeMarriage('${t.npcId}')">
          Cầu Hôn Nạp Sính Lễ
        </button>
      </div>
    `;
  }
  renderHeirsTab() {
    var s;
    const t = ((s = this.overview) == null ? void 0 : s.children) || [], e = `
      <div class="lineage-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">嗣</div>
          <div class="lead-text">
            <h3>Hậu Duệ & Danh Sư Thụ Giáo</h3>
            <div class="text-muted text-sm">
              Con cái thừa hưởng di truyền phụ mẫu, tiếp nhận huấn luyện của danh tướng để chuẩn bị kế vị tông tộc.
            </div>
          </div>
        </div>

        ${t.length === 0 ? `
          <div class="text-center py-12 text-muted">
            <div class="text-4xl mb-3">子</div>
            <div>Hiện tại gia tộc chưa có hậu duệ sinh hạ. Hãy nghỉ ngơi đồng tẩm cùng phu nhân để thụ thai dưỡng dục.</div>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${t.map((a) => this.renderChildCard(a)).join("")}
          </div>
        `}
      </div>
    `;
    this.modal.setContent(e);
  }
  renderChildCard(t) {
    const e = t.is_heir === 1;
    return `
      <div class="tactical-card p-4 bg-slate-900/80 border ${e ? "border-amber-400 shadow-amber-900/20" : "border-slate-800"} rounded">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h4 class="text-amber-200 font-bold text-base m-0">${t.name_vi} ${t.style_name ? `(${t.style_name})` : ""}</h4>
            <div class="text-xs text-muted">${t.gender === "MALE" ? "Nam Tử" : "Nữ Nhi"} • Tuổi: ${t.age} • Mẫu thân: ${t.mother_name_vi || "Nội thất"}</div>
          </div>
          <span class="badge ${e ? "badge-primary" : "badge-neutral"} text-xs">
            ${e ? "王 ĐÍCH TỬ KẾ VỊ" : "Thứ Tử"}
          </span>
        </div>

        <!-- Genetic Stats Radar / Grid -->
        <div class="grid grid-cols-4 gap-1 text-center font-mono text-xs bg-slate-950/70 p-2 rounded mb-3">
          <div><span class="text-muted">VÕ:</span> <span class="text-red-400 font-bold">${t.stats.war}</span></div>
          <div><span class="text-muted">TRÍ:</span> <span class="text-blue-400 font-bold">${t.stats.int}</span></div>
          <div><span class="text-muted">THỐNG:</span> <span class="text-amber-400 font-bold">${t.stats.ldr}</span></div>
          <div><span class="text-muted">CHÍNH:</span> <span class="text-purple-400 font-bold">${t.stats.pol}</span></div>
          <div><span class="text-muted">THƯƠNG:</span> <span class="text-yellow-400 font-bold">${t.stats.com}</span></div>
          <div><span class="text-muted">GIAO:</span> <span class="text-green-400 font-bold">${t.stats.dip}</span></div>
          <div><span class="text-muted">XẢO:</span> <span class="text-cyan-400 font-bold">${t.stats.cra}</span></div>
          <div><span class="text-muted">HẬU:</span> <span class="text-orange-400 font-bold">${t.stats.log}</span></div>
        </div>

        <div class="text-xs text-slate-300 mb-3">
          <span class="font-bold text-amber-300/80">Danh Sư Hướng Dẫn:</span> 
          ${t.assigned_mentor_name_vi || '<span class="text-muted">Chưa bái sư</span>'}
        </div>

        <div class="flex gap-2">
          ${e ? "" : `
            <button class="ui-btn ui-btn--accent ui-btn--sm flex-1" onclick="window.LineageFamilyUI.designateHeir('${t.child_id}')">
              Lập Làm Thế Tử
            </button>
          `}
          <button class="ui-btn ui-btn--ghost ui-btn--sm flex-1" onclick="window.LineageFamilyUI.assignMentorDialog('${t.child_id}')">
            Chỉ Định Danh Sư
          </button>
        </div>
      </div>
    `;
  }
  renderTreeTab() {
    var e, s, a, n;
    const t = `
      <div class="lineage-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">譜</div>
          <div class="lead-text">
            <h3>Gia Phả Tông Tộc • Thế Hệ ${((e = this.overview) == null ? void 0 : e.generation) || 1}</h3>
            <div class="text-muted text-sm">Ghi chép công đức tiên tổ và thứ bậc con cháu dòng dõi.</div>
          </div>
        </div>

        <div class="p-6 bg-slate-950/60 rounded border border-amber-900/30 text-center">
          <div class="inline-block p-4 border-2 border-amber-500 rounded bg-slate-900 text-amber-200 font-bold text-lg mb-4">
            Đời Thứ ${((s = this.overview) == null ? void 0 : s.generation) || 1}: ${((a = this.overview) == null ? void 0 : a.clanName) || "Lương Gia Tộc"}
          </div>
          <div class="text-xs text-muted mb-6">↓ Các chi phu nhân & thế tử tiếp nối ↓</div>
          
          <div class="flex flex-wrap justify-center gap-4">
            ${(((n = this.overview) == null ? void 0 : n.children) || []).map((l) => `
              <div class="p-3 bg-slate-900 rounded border border-slate-700 min-w-[140px] text-xs">
                <div class="font-bold text-amber-300">${l.name_vi}</div>
                <div class="text-muted">${l.is_heir === 1 ? "王 Thế Tử" : "Chi tộc"}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;
    this.modal.setContent(t);
  }
  renderSuccessionTab() {
    var s, a;
    const t = (s = this.overview) == null ? void 0 : s.activeHeir, e = `
      <div class="lineage-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">繼</div>
          <div class="lead-text">
            <h3>Tông Miếu Kế Thừa & Chuyển Giao Quyền Lực</h3>
            <div class="text-muted text-sm">
              Chuyển giao quyền điều khiển nhân vật chính sang Thế tử trưởng thành, bảo tồn 100% tài sản, sản nghiệp và trang bị truyền thừa.
            </div>
          </div>
        </div>

        ${t ? `
          <div class="tactical-card p-6 bg-slate-900/90 border border-amber-500/50 rounded mb-4">
            <h4 class="text-amber-300 font-bold text-lg mb-2">Thế Tử Kế Thừa: ${t.name_vi} (${t.age} Tuổi)</h4>
            <div class="text-sm text-slate-300 mb-4">
              Khi thực hiện chuyển giao:
              <ul class="list-disc list-inside mt-2 space-y-1 text-slate-400">
                <li>Nhân vật người chơi sẽ chuyển sang điều khiển <strong class="text-amber-200">${t.name_vi}</strong>.</li>
                <li>Thế hệ gia tộc tăng lên <strong>Thế Hệ Thứ ${(((a = this.overview) == null ? void 0 : a.generation) || 1) + 1}</strong>.</li>
                <li>100% Tiền mặt, Sản nghiệp và Binh khí truyền quốc được bảo lưu toàn vẹn.</li>
              </ul>
            </div>

            <button class="ui-btn ui-btn--accent w-full py-2.5 text-base font-bold" 
                    onclick="window.LineageFamilyUI.executeSuccession()">
              Khởi Sự Kế Thừa Gia Tộc
            </button>
          </div>
        ` : `
          <div class="text-center py-10 text-muted">
            Chưa chỉ định Thế tử kế vị. Vui lòng vào mục "Hậu Duệ" và chọn một người con trưởng thành làm thế tử.
          </div>
        `}
      </div>
    `;
    this.modal.setContent(e);
  }
  setFilter(t) {
    this.selectedStratumFilter = t, this.renderCourtshipTab();
  }
  async proposeMarriage(t) {
    try {
      const e = await T.proposeMarriage(t);
      typeof window.showToast == "function" && window.showToast(e.narrativeVi || "Kết tóc se duyên thành công!"), await this.refreshData(), await this.renderActiveTab();
    } catch (e) {
      typeof window.showToast == "function" && window.showToast(e.message || "Cầu hôn thất bại!", !0);
    }
  }
  async restCohabit(t) {
    try {
      const e = await T.restAndCohabit(t);
      typeof window.showToast == "function" && window.showToast(e.narrativeVi || "Đồng tẩm nghỉ ngơi tĩnh dưỡng thành công!"), await this.refreshData(), await this.renderActiveTab();
    } catch (e) {
      typeof window.showToast == "function" && window.showToast(e.message || "Không thể nghỉ ngơi lúc này!", !0);
    }
  }
  async assignRole(t, e) {
    try {
      await T.assignHouseholdRole(t, e), typeof window.showToast == "function" && window.showToast("Đã phân công trọng trách nội trạch thành công!"), await this.refreshData();
    } catch (s) {
      typeof window.showToast == "function" && window.showToast(s.message || "Lỗi phân công trọng trách!", !0);
    }
  }
  async designateHeir(t) {
    try {
      await T.designateHeir(t), typeof window.showToast == "function" && window.showToast("Đã chỉ định đích tử kế vị gia tộc!"), await this.refreshData(), await this.renderActiveTab();
    } catch (e) {
      typeof window.showToast == "function" && window.showToast(e.message || "Không thể lập thế tử!", !0);
    }
  }
  async assignMentorDialog(t) {
    const e = prompt("Nhập ID danh sư thụ giáo (ví dụ: NPC-0003 cho Quan Vũ, NPC-0001 cho Lư Thực):", "NPC-0003");
    if (e)
      try {
        await T.assignMentor(t, e), typeof window.showToast == "function" && window.showToast("Đã bái kiến danh sư thụ giáo thành công!"), await this.refreshData(), await this.renderActiveTab();
      } catch (s) {
        typeof window.showToast == "function" && window.showToast(s.message || "Lỗi chỉ định danh sư!", !0);
      }
  }
  async executeSuccession() {
    var t, e;
    if (confirm("Bạn có chắc chắn muốn chuyển giao quyền lực sang Thế tử kế thừa không?"))
      try {
        const s = (e = (t = this.overview) == null ? void 0 : t.activeHeir) == null ? void 0 : e.child_id;
        if (!s) throw new Error("Chưa chỉ định Thế tử kế vị.");
        const a = await T.executeSuccession(s);
        typeof window.showToast == "function" && window.showToast(a.narrativeVi || "Đại điển kế thừa tông miếu hoàn tất!"), await this.refreshData(), await this.renderActiveTab();
      } catch (s) {
        typeof window.showToast == "function" && window.showToast(s.message || "Kế thừa thất bại!", !0);
      }
  }
}
const w = new re(), k = class k {
  static getInstance() {
    return k.instance || (k.instance = new k()), k.instance;
  }
  async getOverview(t = "PLY-0001") {
    const e = await u.get("/api/equipment", { characterId: t });
    return e.overview || e;
  }
  async equipItem(t, e, s) {
    return u.post("/api/equipment/equip", { characterId: t, slot: e, itemCode: s });
  }
  async unequipItem(t, e) {
    return u.post("/api/equipment/unequip", { characterId: t, slot: e });
  }
  async forgeBespokeWeapon(t) {
    return u.post("/api/professions/forge/bespoke", t);
  }
};
r(k, "instance");
let ut = k;
const X = ut.getInstance();
class le {
  constructor() {
    r(this, "modal");
    r(this, "currentCharacterId", "PLY-0001");
    r(this, "overview", null);
    this.modal = m({
      id: "equipment-forge-modal",
      title: "Vũ Khố & Lò Rèn Thiết Điếm",
      subtitle: "Quản lý 4 ô chiến bị truyền quốc và đúc rèn thần binh độc bản",
      seal: "武",
      size: "xl",
      tabs: [
        { id: "gear", label: "Binh Khí & Giáp Trụ", seal: "武" },
        { id: "forge_bespoke", label: "Đúc Rèn Thần Binh", seal: "鍛" },
        { id: "inventory", label: "Kho Binh Khí", seal: "貨" }
      ],
      activeTabId: "gear",
      onOpen: async () => {
        await this.refreshData(), await this.renderActiveTab();
      },
      onTabChange: async () => {
        await this.renderActiveTab();
      }
    });
  }
  async open(t = "PLY-0001", e = "gear") {
    this.currentCharacterId = t, await this.modal.open(e);
  }
  async close() {
    await this.modal.close();
  }
  async refreshData() {
    try {
      this.overview = await X.getOverview(this.currentCharacterId);
    } catch (t) {
      console.error("[EquipmentForgeModal] Error refreshing data:", t);
    }
  }
  async renderActiveTab() {
    switch (this.modal.activeTab || "gear") {
      case "gear":
        this.renderGearTab();
        break;
      case "forge_bespoke":
        this.renderForgeBespokeTab();
        break;
      case "inventory":
        this.renderInventoryTab();
        break;
    }
  }
  renderGearTab() {
    if (!this.overview) return;
    const t = this.overview.slots, e = this.overview.effectiveStats || {}, s = this.overview.baseStats || {}, a = `
      <div class="equipment-modal-content">
        <!-- Lead Banner -->
        <div class="spatial-banner-lead">
          <div class="lead-seal">武</div>
          <div class="lead-text">
            <h3>Chiến Bị Của ${this.overview.characterNameVi || "Lương Diễn"}</h3>
            <div class="text-muted text-sm">Hiệu ứng chiến bị kích hoạt thuộc tính vàng khi vượt ngưỡng 100 điểm.</div>
          </div>
        </div>

        <!-- Effective Attributes Bar -->
        <div class="grid grid-cols-4 gap-2 mb-4 font-mono text-xs text-center bg-slate-950/80 p-2.5 rounded border border-amber-900/40">
          <div>VÕ: <strong class="${(e.war || 0) >= 100 ? "text-amber-400 font-bold" : "text-red-400"}">${e.war || s.war || 50}</strong> <span class="text-muted text-[10px]">(${s.war || 50})</span></div>
          <div>THỐNG: <strong class="${(e.ldr || 0) >= 100 ? "text-amber-400 font-bold" : "text-amber-300"}">${e.ldr || s.ldr || 50}</strong> <span class="text-muted text-[10px]">(${s.ldr || 50})</span></div>
          <div>TRÍ: <strong class="${(e.int || 0) >= 100 ? "text-amber-400 font-bold" : "text-blue-400"}">${e.int || s.int || 50}</strong> <span class="text-muted text-[10px]">(${s.int || 50})</span></div>
          <div>XẢO: <strong class="${(e.cra || 0) >= 100 ? "text-amber-400 font-bold" : "text-cyan-400"}">${e.cra || s.cra || 50}</strong> <span class="text-muted text-[10px]">(${s.cra || 50})</span></div>
        </div>

        <!-- 4 Equipment Slots Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${this.renderSlotCard("WEAPON", "Binh Khí Tấn Công", "武", t.WEAPON)}
          ${this.renderSlotCard("ARMOR", "Khôi Giáp Phòng Hộ", "盾", t.ARMOR)}
          ${this.renderSlotCard("STEED", "Chiến Mã Tọa Kỵ", "馬", t.STEED)}
          ${this.renderSlotCard("TREASURE", "Bảo Vật & Binh Thư", "卷", t.TREASURE)}
        </div>
      </div>
    `;
    this.modal.setContent(a);
  }
  renderSlotCard(t, e, s, a) {
    const n = a && a.itemCode;
    return `
      <div class="tactical-card p-3 bg-slate-900/80 rounded border ${n ? "border-amber-500/50" : "border-slate-800"} flex justify-between items-center">
        <div>
          <div class="text-xs text-muted font-bold flex items-center gap-1">
            <span>${s}</span> ${e}
          </div>
          <div class="font-bold text-sm ${n ? "text-amber-200" : "text-slate-500"} mt-1">
            ${n ? a.nameVi : "Trống (Chưa Trang Bị)"}
          </div>
          ${n && a.statModifierDesc ? `
            <div class="text-[11px] text-green-400 font-mono mt-0.5">${a.statModifierDesc}</div>
          ` : ""}
        </div>
        <div>
          ${n ? `
            <button class="ui-btn ui-btn--ghost ui-btn--sm" onclick="window.EquipmentUI.unequip('${this.currentCharacterId}', '${t}')">Tháo Ra</button>
          ` : `
            <button class="ui-btn ui-btn--primary ui-btn--sm" onclick="window.EquipmentUI.switchTab('inventory')">Trang Bị</button>
          `}
        </div>
      </div>
    `;
  }
  renderForgeBespokeTab() {
    var a, n;
    const t = ((n = (a = this.overview) == null ? void 0 : a.baseStats) == null ? void 0 : n.cra) || 50, s = `
      <div class="equipment-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">鍛</div>
          <div class="lead-text">
            <h3>Đoán Tạo Thần Binh Tùy Biến (Bespoke Forge)</h3>
            <div class="text-muted text-sm">Chế tác thần binh độc bản khắc tên tướng lĩnh, tiêu hao 25 Thể lực và nguyên liệu luyện tinh.</div>
          </div>
        </div>

        ${t >= 50 ? `
          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1">Tên Thần Binh Độc Bản:</label>
                <input type="text" id="forge-weapon-name" class="modal-input w-full" placeholder="Thanh Long Uyển Nguyệt Đao" />
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1">Phân Loại Binh Khí:</label>
                <select id="forge-weapon-cat" class="modal-input w-full">
                  <option value="BLADE">Đao / Trực Đao (WAR +1..+5)</option>
                  <option value="SPEAR">Thương / Xà Mâu (WAR/LDR +1..+5)</option>
                  <option value="HALBERD">Kích / Phương Thiên (WAR/LDR +1..+5)</option>
                  <option value="SWORD">Kiếm / Bảo Kiếm (LDR/POL +1..+5)</option>
                  <option value="BOW">Cung / Cương Nỏ (WAR/CRA +1..+5)</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1">Cấp Phẩm Nguyên Liệu:</label>
                <select id="forge-material-tier" class="modal-input w-full">
                  <option value="STANDARD">Nguyên Liệu Tiêu Chuẩn (Sắt Thỏi + Than)</option>
                  <option value="FINE">Bách Luyện Tinh Cương (Thép Tinh Luyện + Da Thú)</option>
                  <option value="LEGENDARY">Huyền Thiết Thiên Thạch (Huyền Thiết + Thiên Thạch)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-300 mb-1">Nơi Tiếp Nhận Sau Đúc:</label>
                <select id="forge-destination" class="modal-input w-full">
                  <option value="EQUIP">Tự Động Trang Bị Luôn</option>
                  <option value="WAREHOUSE">Chuyển Vào Kho Huyện Trác</option>
                  <option value="GIFT">Tặng Cho Quan Vũ / Trương Phi</option>
                </select>
              </div>
            </div>

            <button class="ui-btn ui-btn--accent w-full py-2.5 font-bold" onclick="window.EquipmentUI.executeForge()">
              Khai Lò Đúc Thần Binh
            </button>
          </div>
        ` : `
          <div class="text-center py-8 text-muted">
            Cần chỉ số Kỹ Nghệ (CRA) đạt tối thiểu 50 để mở lò rèn thần binh. Hiện tại CRA của bạn: ${t}.
          </div>
        `}
      </div>
    `;
    this.modal.setContent(s);
  }
  renderInventoryTab() {
    var s;
    const t = ((s = this.overview) == null ? void 0 : s.inventoryGear) || [], e = `
      <div class="equipment-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">貨</div>
          <div class="lead-text">
            <h3>Kho Khí Giới Trác Huyện</h3>
            <div class="text-muted text-sm">Kho vũ khí, giáp trụ và chiến mã sẵn sàng trang bị cho nhân vật.</div>
          </div>
        </div>

        ${t.length === 0 ? `
          <div class="text-center py-8 text-muted">
            Kho vũ khí hiện không có trang bị nào. Hãy mua từ chợ phiên hoặc chế tác tại Lò Rèn.
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${t.map((a) => `
              <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                <div>
                  <div class="font-bold text-amber-200 text-sm">${a.nameVi}</div>
                  <div class="text-xs text-muted">Vị trí: ${a.slot} • SL: ${a.quantity}</div>
                </div>
                <button class="ui-btn ui-btn--primary ui-btn--sm" onclick="window.EquipmentUI.equip('${this.currentCharacterId}', '${a.slot}', '${a.itemCode}')">
                  Mặc Vào
                </button>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    `;
    this.modal.setContent(e);
  }
  async equip(t, e, s) {
    try {
      await X.equipItem(t, e, s), typeof window.showToast == "function" && window.showToast("Đã trang bị thành công!"), await this.refreshData(), await this.renderActiveTab();
    } catch (a) {
      typeof window.showToast == "function" && window.showToast(a.message || "Lỗi trang bị!", !0);
    }
  }
  async unequip(t, e) {
    try {
      await X.unequipItem(t, e), typeof window.showToast == "function" && window.showToast("Đã tháo trang bị về kho!"), await this.refreshData(), await this.renderActiveTab();
    } catch (s) {
      typeof window.showToast == "function" && window.showToast(s.message || "Lỗi tháo trang bị!", !0);
    }
  }
  async executeForge() {
    const t = document.getElementById("forge-weapon-name"), e = document.getElementById("forge-weapon-cat"), s = document.getElementById("forge-material-tier"), a = document.getElementById("forge-destination"), n = {
      characterId: this.currentCharacterId,
      weaponNameVi: (t == null ? void 0 : t.value) || "Thần Binh Trác Huyện",
      weaponCategory: (e == null ? void 0 : e.value) || "BLADE",
      targetAttr: "war",
      materialTier: (s == null ? void 0 : s.value) || "STANDARD",
      destination: (a == null ? void 0 : a.value) || "EQUIP"
    };
    try {
      const l = await X.forgeBespokeWeapon(n);
      typeof window.showToast == "function" && window.showToast(l.narrativeVi || "Đúc rèn thần binh thành công!"), await this.refreshData(), await this.modal.switchTab("gear");
    } catch (l) {
      typeof window.showToast == "function" && window.showToast(l.message || "Đúc rèn thất bại!", !0);
    }
  }
}
const V = new le(), M = class M {
  static getInstance() {
    return M.instance || (M.instance = new M()), M.instance;
  }
  async getStatus(t = "PLY-0001") {
    const e = await u.get("/api/enterprise/status", { characterId: t });
    return e.status || e;
  }
  async manageSafeCash(t, e, s) {
    return u.post("/api/enterprise/manage-safe-cash", { enterpriseId: t, action: e, amount: s });
  }
  async executeLaborShift(t, e) {
    return u.post("/api/enterprise/work", { shiftId: t });
  }
};
r(M, "instance");
let pt = M;
const J = pt.getInstance();
class ce {
  constructor() {
    r(this, "modal");
    r(this, "enterprises", []);
    r(this, "laborOptions", []);
    this.modal = m({
      id: "enterprise-modal",
      title: "Sản Nghiệp & Phường Xưởng Bách Nghệ",
      subtitle: "Quản lý xưởng dệt, xưởng rèn, đi làm thuê công nhật tích lũy ngân lượng",
      seal: "業",
      size: "xl",
      tabs: [
        { id: "owner", label: "Sản Nghiệp Gia Tộc", seal: "坊" },
        { id: "work", label: "Đi Làm Thuê Thời Vụ", seal: "工" }
      ],
      activeTabId: "owner",
      onOpen: async () => {
        await this.refreshData(), await this.renderActiveTab();
      },
      onTabChange: async () => {
        await this.renderActiveTab();
      }
    });
  }
  async open(t = "owner") {
    await this.modal.open(t);
  }
  async close() {
    await this.modal.close();
  }
  async refreshData() {
    try {
      const t = await J.getStatus("PLY-0001");
      this.enterprises = (t == null ? void 0 : t.ownedBusinesses) || (t == null ? void 0 : t.activeEnterprises) || [], this.laborOptions = (t == null ? void 0 : t.laborOptions) || [];
    } catch (t) {
      console.error("[EnterpriseWorkshopModal] Error refreshing data:", t);
    }
  }
  async renderActiveTab() {
    (this.modal.activeTab || "owner") === "owner" ? this.renderOwnerTab() : this.renderWorkTab();
  }
  renderOwnerTab() {
    const t = `
      <div class="enterprise-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">業</div>
          <div class="lead-text">
            <h3>Sản Nghiệp Sở Hữu (${this.enterprises.length} Cơ Sở)</h3>
            <div class="text-muted text-sm">Các xưởng chế tác tự động vận hành chu kỳ sản xuất hàng tháng và tích lũy doanh thu vào Quỹ an toàn.</div>
          </div>
        </div>

        ${this.enterprises.length === 0 ? `
          <div class="text-center py-10 text-muted">
            Hiện tại bạn chưa sở hữu sản nghiệp nào. Hãy tích lũy tiền tệ hoặc làm thuê để mua lại xưởng mộc, xưởng rèn tại Trác Huyện.
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${this.enterprises.map((e) => `
              <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800">
                <div class="flex justify-between items-start mb-2">
                  <h4 class="text-amber-200 font-bold m-0 text-base">${e.name_vi}</h4>
                  <span class="badge badge-success text-xs">${e.status || "VẬN HÀNH"}</span>
                </div>
                <div class="text-xs text-muted mb-3">Địa điểm: ${e.settlement_id} • Thợ xưởng: ${e.worker_count || 1}/${e.max_workers || 5}</div>

                <div class="bg-slate-950/70 p-2.5 rounded font-mono text-xs mb-3 space-y-1">
                  <div class="flex justify-between">
                    <span class="text-muted">Quỹ An Toàn:</span>
                    <span class="text-amber-400 font-bold">${Number(e.safe_cash || 0).toLocaleString()} Quan</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted">Chi Phí Tháng:</span>
                    <span class="text-red-400 font-bold">${Number(e.monthly_overhead || 0).toLocaleString()} Quan</span>
                  </div>
                </div>

                <div class="flex gap-2">
                  <button class="ui-btn ui-btn--primary ui-btn--sm flex-1" onclick="window.EnterpriseUI.depositSafeCash('${e.enterprise_id}')">Nạp Quỹ</button>
                  <button class="ui-btn ui-btn--ghost ui-btn--sm flex-1" onclick="window.EnterpriseUI.withdrawSafeCash('${e.enterprise_id}')">Rút Quan</button>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    `;
    this.modal.setContent(t);
  }
  renderWorkTab() {
    this.modal.setContent(`
      <div class="enterprise-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">工</div>
          <div class="lead-text">
            <h3>Lao Động Làm Thuê Thời Vụ</h3>
            <div class="text-muted text-sm">Đi làm thuê tại các xưởng nghề, đồn điền nông nghiệp để kiếm tiền trang trải và rèn luyện kỹ năng.</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 text-center">
            <h4 class="text-amber-300 font-bold text-sm mb-1">Đốn Củi & Tiêu Xa</h4>
            <div class="text-xs text-muted mb-2">Tiêu hao 15 Thể lực • Kiếm 40 Quan • Tăng EXP Võ/Thống</div>
            <button class="ui-btn ui-btn--primary ui-btn--sm w-full" onclick="window.EnterpriseUI.executeWork('WOODCUT')">Nhận Việc</button>
          </div>
          <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 text-center">
            <h4 class="text-amber-300 font-bold text-sm mb-1">Đan Lát Chiếu Trúc</h4>
            <div class="text-xs text-muted mb-2">Tiêu hao 12 Thể lực • Kiếm 50 Quan • Tăng EXP Kỹ Nghệ</div>
            <button class="ui-btn ui-btn--primary ui-btn--sm w-full" onclick="window.EnterpriseUI.executeWork('WEAVE_MAT')">Nhận Việc</button>
          </div>
          <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 text-center">
            <h4 class="text-amber-300 font-bold text-sm mb-1">Phụ Lò Rèn Thiết Điếm</h4>
            <div class="text-xs text-muted mb-2">Tiêu hao 20 Thể lực • Kiếm 65 Quan • Tăng EXP Kỹ Nghệ/Võ</div>
            <button class="ui-btn ui-btn--accent ui-btn--sm w-full" onclick="window.EnterpriseUI.executeWork('SMITH_ASSIST')">Nhận Việc</button>
          </div>
        </div>
      </div>
    `);
  }
  async depositSafeCash(t) {
    const e = prompt("Nhập số tiền muốn nạp vào quỹ an toàn:", "500");
    if (!e) return;
    const s = parseInt(e, 10);
    if (!(isNaN(s) || s <= 0))
      try {
        await J.manageSafeCash(t, "DEPOSIT", s), typeof window.showToast == "function" && window.showToast("Đã nạp tiền vào Quỹ an toàn!"), await this.refreshData(), await this.renderActiveTab();
      } catch (a) {
        typeof window.showToast == "function" && window.showToast(a.message || "Lỗi nạp tiền!", !0);
      }
  }
  async withdrawSafeCash(t) {
    const e = prompt("Nhập số tiền muốn rút từ quỹ an toàn:", "500");
    if (!e) return;
    const s = parseInt(e, 10);
    if (!(isNaN(s) || s <= 0))
      try {
        await J.manageSafeCash(t, "WITHDRAW", s), typeof window.showToast == "function" && window.showToast("Đã rút tiền từ Quỹ an toàn về ngân khố!"), await this.refreshData(), await this.renderActiveTab();
      } catch (a) {
        typeof window.showToast == "function" && window.showToast(a.message || "Lỗi rút tiền!", !0);
      }
  }
  async executeWork(t) {
    try {
      const e = await J.executeLaborShift(t);
      typeof window.showToast == "function" && window.showToast(e.narrativeVi || "Lao động hoàn tất, nhận tiền công!"), await this.refreshData(), await this.renderActiveTab();
    } catch (e) {
      typeof window.showToast == "function" && window.showToast(e.message || "Không thể làm việc lúc này!", !0);
    }
  }
}
const K = new ce(), A = class A {
  static getInstance() {
    return A.instance || (A.instance = new A()), A.instance;
  }
  async getProtagonistDossier() {
    var s;
    const t = await u.get("/api/status"), e = t.player || {};
    return {
      characterId: e.character_id || "PLY-0001",
      nameVi: e.name_vi || "Lương Diễn",
      nameEn: e.name_en || "Liang Yan",
      styleName: e.style_name || "Chí Viễn",
      age: e.age || 20,
      locationVi: ((s = t.settlement) == null ? void 0 : s.nameVi) || "Trác Huyện",
      positionVi: e.position_vi || "Thương Gia Tự Do",
      personality: "PRAGMATIC",
      motivation: "HEGEMONY",
      bioVi: "Hậu nhân Lương thị U Châu, thông tuệ thương đạo, ôm chí lớn bình định loạn thế Tam Quốc.",
      stats: {
        war: e.war_attr || 50,
        int: e.int_attr || 50,
        ldr: e.ldr_attr || 50,
        pol: e.pol_attr || 50,
        com: e.com_attr || 60,
        dip: e.dip_attr || 50,
        cra: e.cra_attr || 55,
        log: e.log_attr || 50
      },
      talents: e.talents ? typeof e.talents == "string" ? JSON.parse(e.talents) : e.talents : ["THƯƠNG_TRÍ", "KỸ_XẢO"]
    };
  }
  async getNpcDossier(t) {
    const e = await u.get("/api/npcs/dossier", { npcId: t });
    return e.dossier || e;
  }
};
r(A, "instance");
let bt = A;
const kt = bt.getInstance();
class de {
  constructor() {
    r(this, "protagonistModal");
    r(this, "npcModal");
    r(this, "currentProtagonist", null);
    r(this, "currentNpc", null);
    this.protagonistModal = m({
      id: "protagonist-dossier-modal",
      title: "Hồ Sơ Nhân Vật Chính • Lương Diễn (Chí Viễn)",
      subtitle: "Toàn bộ chỉ số năng lực 8 chiều, danh hiệu và thiên phú bản mệnh",
      seal: "主",
      size: "lg",
      onOpen: async () => {
        await this.loadProtagonist();
      }
    }), this.npcModal = m({
      id: "npc-dossier-modal",
      title: "Hồ Sơ Nhân Vật • Danh Tướng Tam Quốc",
      subtitle: "Tình báo nhân vật, mức độ thân thiện và bí mật sương mù chiến tranh",
      seal: "将",
      size: "lg"
    });
  }
  async openProtagonist() {
    await this.protagonistModal.open();
  }
  async closeProtagonist() {
    await this.protagonistModal.close();
  }
  async openNpc(t) {
    try {
      this.currentNpc = await kt.getNpcDossier(t), this.npcModal.setTitle(
        `Hồ Sơ Nhân Vật • ${this.currentNpc.nameVi}`,
        `Địa điểm: ${this.currentNpc.locationVi || "U Châu"} • Thân phận: ${this.currentNpc.positionVi || "Võ Tướng"}`
      ), this.renderNpcContent(), await this.npcModal.open();
    } catch (e) {
      console.error("[DossiersModal] Error loading NPC:", e);
    }
  }
  async closeNpc() {
    await this.npcModal.close();
  }
  async loadProtagonist() {
    try {
      this.currentProtagonist = await kt.getProtagonistDossier(), this.renderProtagonistContent();
    } catch (t) {
      console.error("[DossiersModal] Error loading protagonist:", t);
    }
  }
  renderProtagonistContent() {
    const t = this.currentProtagonist;
    if (!t) return;
    const e = t.stats, s = `
      <div class="dossier-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">主</div>
          <div class="lead-text">
            <h3>${t.nameVi} (${t.styleName || "Chí Viễn"}) • Tuổi: ${t.age}</h3>
            <div class="text-muted text-sm">${t.positionVi} • Cư ngụ tại ${t.locationVi}</div>
          </div>
        </div>

        <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 mb-3">
          <h4 class="text-amber-300 font-bold text-xs uppercase mb-2">Bát Diện Năng Lực (Thuộc Tính Bản Thể):</h4>
          <div class="grid grid-cols-4 gap-2 font-mono text-xs text-center bg-slate-950 p-3 rounded">
            <div>VÕ LỰC: <strong class="text-red-400 font-bold">${e.war}</strong></div>
            <div>MƯU TRÍ: <strong class="text-blue-400 font-bold">${e.int}</strong></div>
            <div>THỐNG SOÁI: <strong class="text-amber-400 font-bold">${e.ldr}</strong></div>
            <div>CHÍNH TRỊ: <strong class="text-purple-400 font-bold">${e.pol}</strong></div>
            <div>THƯƠNG NGHIỆP: <strong class="text-yellow-400 font-bold">${e.com}</strong></div>
            <div>NGOẠI GIAO: <strong class="text-green-400 font-bold">${e.dip}</strong></div>
            <div>KỸ NGHỆ: <strong class="text-cyan-400 font-bold">${e.cra}</strong></div>
            <div>HẬU CẦN: <strong class="text-orange-400 font-bold">${e.log}</strong></div>
          </div>
        </div>

        <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800">
          <h4 class="text-amber-300 font-bold text-xs uppercase mb-1">Tiểu Sử & Chí Hướng:</h4>
          <p class="text-xs text-slate-300 leading-relaxed">${t.bioVi}</p>
        </div>
      </div>
    `;
    this.protagonistModal.setContent(s);
  }
  renderNpcContent() {
    const t = this.currentNpc;
    if (!t) return;
    const e = t.stats || { war: 50, int: 50, ldr: 50, pol: 50 }, s = `
      <div class="dossier-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">将</div>
          <div class="lead-text">
            <h3>${t.nameVi} • Tính Cách: ${t.personality}</h3>
            <div class="text-muted text-sm">Động cơ: ${t.motivation} • Thân phận: ${t.positionVi}</div>
          </div>
        </div>

        <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 mb-3">
          <h4 class="text-amber-300 font-bold text-xs uppercase mb-2">Chỉ Số Năng Lực Nổi Trội:</h4>
          <div class="grid grid-cols-4 gap-2 font-mono text-xs text-center bg-slate-950 p-3 rounded">
            <div>VÕ: <strong class="text-red-400 font-bold">${e.war}</strong></div>
            <div>TRÍ: <strong class="text-blue-400 font-bold">${e.int}</strong></div>
            <div>SOÁI: <strong class="text-amber-400 font-bold">${e.ldr}</strong></div>
            <div>CHÍNH: <strong class="text-purple-400 font-bold">${e.pol}</strong></div>
          </div>
        </div>

        <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800">
          <h4 class="text-amber-300 font-bold text-xs uppercase mb-1">Hành Trạng Lịch Sử:</h4>
          <p class="text-xs text-slate-300 leading-relaxed">${t.bioVi || "Nhân tài hào kiệt uy chấn phương bắc."}</p>
        </div>
      </div>
    `;
    this.npcModal.setContent(s);
  }
}
const Z = new de();
class he {
  constructor() {
    r(this, "modal");
    r(this, "currentMode", "BUY");
    r(this, "currentItemCode", "COM-GRAIN");
    r(this, "currentPrice", 50);
    this.modal = m({
      id: "standard-trade-modal",
      title: "Giao Dịch Hàng Hóa Chợ Phiên",
      subtitle: "Thực thi giao thương hàng hóa, cân bằng sổ cái kép kế toán ACID",
      seal: "貿",
      size: "sm"
    });
  }
  async open(t, e, s = 1, a = 50) {
    this.currentMode = t, this.currentItemCode = e, this.currentPrice = a, this.modal.setTitle(
      t === "BUY" ? "Thu Mua Vật Phẩm" : "Xuất Bán Hàng Hóa",
      `Mã vật phẩm: ${e} • Đơn giá hiện tại: ${a} Quan`,
      t === "BUY" ? "買" : "賣"
    ), this.renderForm(s), await this.modal.open();
  }
  async close() {
    await this.modal.close();
  }
  renderForm(t) {
    const e = `
      <div class="space-y-3 p-1">
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Mã Vật Phẩm:</label>
          <input type="text" class="modal-input w-full" value="${this.currentItemCode}" readonly />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Số Lượng Giao Dịch:</label>
          <input type="number" id="quick-trade-qty" class="modal-input w-full" min="1" value="${t}" oninput="window.QuickTradeModal.updateTotal()" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Đơn Giá Đơn Vị (Quan):</label>
          <input type="number" id="quick-trade-price" class="modal-input w-full" value="${this.currentPrice}" readonly />
        </div>
        <div class="bg-slate-950 p-2.5 rounded flex justify-between items-center text-xs font-mono">
          <span class="text-muted">Tổng Giá Trị:</span>
          <span class="text-amber-400 font-bold text-sm" id="quick-trade-total">${(t * this.currentPrice).toLocaleString()} Quan</span>
        </div>
        <button class="ui-btn ui-btn--accent w-full py-2 font-bold mt-2" onclick="window.QuickTradeModal.submit()">
          Xác Nhận ${this.currentMode === "BUY" ? "Thu Mua" : "Bán Hàng"}
        </button>
      </div>
    `;
    this.modal.setContent(e);
  }
  updateTotal() {
    const t = document.getElementById("quick-trade-qty"), e = document.getElementById("quick-trade-total");
    if (!t || !e) return;
    const s = parseFloat(t.value) || 0;
    e.textContent = `${(s * this.currentPrice).toLocaleString()} Quan`;
  }
  async submit() {
    const t = document.getElementById("quick-trade-qty"), e = parseFloat((t == null ? void 0 : t.value) || "1");
    if (isNaN(e) || e <= 0) return;
    const s = {
      type: this.currentMode === "BUY" ? "TRADE_BUY" : "TRADE_SELL",
      item_code: this.currentItemCode,
      quantity: e,
      unit_price: this.currentPrice,
      counterparty: "Thương Khách Chợ Phiên",
      idempotency_key: `TSQUICK_${this.currentMode}_${this.currentItemCode}_${Date.now()}`
    };
    try {
      const a = window.dispatchDirectAction, n = a ? await a(s) : await u.post("/api/action", s);
      if (n && n.success === !1) {
        typeof window.showToast == "function" && window.showToast(`Bị từ chối: ${n.error || "Giao dịch thất bại"}`, !0);
        return;
      }
      await this.modal.close(), typeof window.loadStatus == "function" && await window.loadStatus(), typeof window.loadDeckInventory == "function" && await window.loadDeckInventory();
    } catch (a) {
      typeof window.showToast == "function" && window.showToast(a.message || "Giao dịch thất bại!", !0);
    }
  }
}
const tt = new he(), B = class B {
  static getInstance() {
    return B.instance || (B.instance = new B()), B.instance;
  }
  // --- Tavern Endpoints ---
  async getBanquetStatus() {
    return u.get("/api/banquet/status");
  }
  async drinkWine() {
    return u.post("/api/banquet/drink", {});
  }
  async hostBanquet(t) {
    return u.post("/api/banquet/host", { tierId: t });
  }
  async swearBrotherhood(t) {
    return u.post("/api/banquet/brotherhood", { targetNpcId: t });
  }
  // --- Arena Endpoints ---
  async getArenaRoster() {
    return u.get("/api/arena/roster");
  }
  async startDuel(t) {
    return u.post("/api/arena/duel/start", { opponentId: t });
  }
  async executeDuelRound(t, e) {
    return u.post("/api/arena/duel/round", { duelId: t, action: e });
  }
  // --- Residence Endpoints ---
  async restAtResidence(t = 1) {
    return u.post("/api/character/rest", { days: t });
  }
};
r(B, "instance");
let gt = B;
const Mt = gt.getInstance();
class ue {
  constructor() {
    r(this, "modal");
    r(this, "currentDuelId", null);
    r(this, "duelState", null);
    this.modal = m({
      id: "tactical-battle-modal",
      title: "Quyết Đấu Sa Trường • Đơn Đả Độc Đấu 1v1",
      subtitle: "Tương tác chiến thuật 4 lệnh (Công Kích, Phòng Ngự, Tuyệt Kỹ, Tụ Khí)",
      seal: "斗",
      size: "lg"
    });
  }
  async startDuel(t) {
    try {
      const e = await Mt.startDuel(t);
      this.currentDuelId = e.duelId, this.duelState = e.state, this.renderDuel(), await this.modal.open();
    } catch (e) {
      typeof window.showToast == "function" && window.showToast(e.message || "Lỗi khởi động giao đấu!", !0);
    }
  }
  async close() {
    await this.modal.close();
  }
  renderDuel() {
    const t = this.duelState;
    if (!t) return;
    const e = `
      <div class="tactical-battle-content">
        <div class="p-3 bg-slate-950/80 rounded border border-amber-900/40 mb-3">
          <div class="flex justify-between items-center mb-3">
            <span class="font-bold text-amber-200">Hiệp Đấu Thứ ${t.round}</span>
            <span class="badge ${t.isConcluded ? "badge-danger" : "badge-primary"}">${t.isConcluded ? "TRẬN ĐẤU KẾT THÚC" : "ĐANG ĐỐI ĐẦU"}</span>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-3">
            <div class="p-3 bg-slate-900 rounded border border-slate-800">
              <div class="text-xs font-bold text-amber-300 mb-1">Người Chơi</div>
              <div class="text-xs space-y-0.5 font-mono">
                <div>Sinh Lực: <strong class="text-green-400">${t.playerHp}</strong></div>
                <div>Khí Lực: <strong class="text-blue-400">${t.playerSpirit}</strong></div>
                <div>Sĩ Khí: <strong class="text-amber-400">${t.playerMorale}</strong></div>
              </div>
            </div>
            <div class="p-3 bg-slate-900 rounded border border-slate-800">
              <div class="text-xs font-bold text-red-300 mb-1">Đối Thủ</div>
              <div class="text-xs space-y-0.5 font-mono">
                <div>Sinh Lực: <strong class="text-red-400">${t.oppHp}</strong></div>
                <div>Khí Lực: <strong class="text-blue-400">${t.oppSpirit}</strong></div>
                <div>Sĩ Khí: <strong class="text-amber-400">${t.oppMorale}</strong></div>
              </div>
            </div>
          </div>

          ${t.isConcluded ? `
            <div class="text-center font-bold text-amber-300 py-2">
              ${t.outcome || "Quyết đấu hoàn tất!"}
            </div>
          ` : `
            <div class="grid grid-cols-4 gap-2">
              <button class="ui-btn ui-btn--primary ui-btn--sm" onclick="window.TacticalBattleUI.executeAction('ATTACK')">Công Kích</button>
              <button class="ui-btn ui-btn--ghost ui-btn--sm" onclick="window.TacticalBattleUI.executeAction('DEFEND')">Phòng Ngự</button>
              <button class="ui-btn ui-btn--accent ui-btn--sm" onclick="window.TacticalBattleUI.executeAction('SPECIAL_STRIKE')">Tuyệt Kỹ</button>
              <button class="ui-btn ui-btn--ghost ui-btn--sm" onclick="window.TacticalBattleUI.executeAction('FOCUS_SPIRIT')">Tụ Khí</button>
            </div>
          `}
        </div>

        <div class="bg-black/60 p-3 rounded text-xs font-mono max-h-48 overflow-y-auto space-y-1">
          ${t.combatLogs.map((s) => `<div>${s}</div>`).join("")}
        </div>
      </div>
    `;
    this.modal.setContent(e);
  }
  async executeAction(t) {
    if (this.currentDuelId)
      try {
        this.duelState = await Mt.executeDuelRound(this.currentDuelId, t), this.renderDuel();
      } catch (e) {
        typeof window.showToast == "function" && window.showToast(e.message || "Lỗi hiệp đấu!", !0);
      }
  }
}
const ot = new ue();
class pe {
  constructor() {
    r(this, "travelModal");
    r(this, "turnModal");
    this.travelModal = m({
      id: "travel-transit-modal",
      title: "Lộ Trình Viễn Chinh • Dặm Trường Phong Vân",
      subtitle: "Hành quân liên châu, khảo sát địa hình và ứng biến trước hiểm họa dọc đường",
      seal: "行",
      size: "md"
    }), this.turnModal = m({
      id: "turn-advance-modal",
      title: "Quyết Toán Tháng • Luân Chuyển Chiến Cục",
      subtitle: "Kết thúc tháng hiện tại, kết toán tài chính, sản nghiệp và mô phỏng thế giới sống động",
      seal: "歲",
      size: "md"
    });
  }
  async showTravelTransit(t, e, s, a) {
    this.travelModal.setTitle(
      "Hành Trình Viễn Chinh",
      `Từ ${t} → Đến ${e} (${s} ngày đường)`
    ), this.travelModal.setContent(`
      <div class="travel-transit-body p-2 space-y-3">
        <div class="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono">
          ${a || "<div>Xe ngựa lăn bánh trên quan đạo phương bắc... An toàn đến nơi!</div>"}
        </div>
        <button class="ui-btn ui-btn--primary w-full py-2 font-bold" onclick="window.TravelTransitUI.close()">
          Nhập Thành
        </button>
      </div>
    `), await this.travelModal.open();
  }
  async openTravelTransitModal() {
    await this.travelModal.open();
  }
  async closeTravelTransitModal() {
    await this.travelModal.close();
  }
  async closeTravel() {
    await this.travelModal.close();
  }
  async showTurnAdvance(t, e, s) {
    this.turnModal.setTitle(
      `Quyết Toán Lượt Thứ ${t}`,
      `Thời gian: ${e} • Thiên thời địa lợi`
    ), this.turnModal.setContent(`
      <div class="turn-advance-body p-2 space-y-3">
        <div class="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono space-y-1">
          ${s || `
            <div class="text-green-400">◆ Hoàn tất chu kỳ sản xuất hàng tháng của các xưởng.</div>
            <div class="text-amber-300">◆ Kết toán sổ cái kép thu chi tài chính.</div>
            <div class="text-blue-300">◆ Cập nhật tiến độ thai kỳ và bồi dưỡng thế hệ gia tộc.</div>
          `}
        </div>
        <button class="ui-btn ui-btn--accent w-full py-2 font-bold" onclick="window.TurnAdvanceUI.close()">
          Tiếp Tục Mô Phỏng
        </button>
      </div>
    `), await this.turnModal.open();
  }
  async closeTurn() {
    await this.turnModal.close();
  }
  async openTurnAdvanceModal() {
    await this.turnModal.open();
  }
  async closeTurnAdvanceModal() {
    await this.turnModal.close();
  }
}
const x = new pe();
class be {
  constructor() {
    r(this, "modal");
    this.modal = m({
      id: "world-map-modal",
      title: "Dư Đồ Tam Quốc • Khởi Nghĩa Khăn Vàng (184 SCN)",
      subtitle: "Khảo sát 24 châu quận, phân bố thế lực chư hầu và dịch trạm liên thành",
      seal: "圖",
      size: "xl",
      dialogClass: "world-map-dialog"
    });
  }
  async open() {
    await this.modal.open();
    const t = window.refreshWorldMapView;
    typeof t == "function" ? t() : typeof window.renderWorldMapSvg == "function" && window.renderWorldMapSvg();
  }
  async close() {
    await this.modal.close();
  }
}
const At = new be(), Bt = {
  wu_wei: "xi_liang",
  he_fei: "shou_chun",
  pu_yang: "ye_cheng",
  wu_ling: "jiang_ling"
};
class ge {
  constructor() {
    r(this, "ALIASES", Bt);
    r(this, "state", {
      status: "idle",
      fetchedAt: 0,
      bySettlement: {},
      byMapNode: {},
      activeExpeditions: [],
      player: null,
      playerFaction: null,
      factionsById: {},
      banditsByNode: {},
      crisesByNode: {},
      npcsByName: {},
      npcsById: {},
      playerCash: 0,
      inventory: {},
      specialistsByName: {},
      specialistsByMapNode: {},
      businesses: [],
      guardTiers: [],
      routesByKey: {},
      locationsById: {},
      locToMapNode: {},
      caravans: [],
      expeditions: [],
      resourcesByNode: {},
      resourceTotals: {},
      errors: []
    });
  }
  resolveMapNodeId(t) {
    return Bt[t] || t;
  }
  mergeRecord(t, e) {
    return Object.assign({}, t || {}, e || {});
  }
  async readJson(t) {
    const e = await fetch(t, { headers: { Accept: "application/json" } });
    if (!e.ok) throw new Error(`${t} returned ${e.status}`);
    return e.json();
  }
  async load(t = !1) {
    var It;
    if (!t && this.state.status === "ready" && Date.now() - this.state.fetchedAt < 1e4)
      return this.state;
    this.state.status = "loading", this.state.errors = [];
    const [
      e,
      s,
      a,
      n,
      l,
      h,
      b,
      C,
      $,
      D,
      f,
      y,
      E,
      F,
      U,
      G,
      j
    ] = await Promise.allSettled([
      this.readJson("/api/garrisons"),
      this.readJson("/api/factions/settlements"),
      this.readJson("/api/factions"),
      this.readJson("/api/military/status"),
      this.readJson("/api/logistics/strongholds"),
      this.readJson("/api/ecology/crises"),
      this.readJson("/api/npcs"),
      this.readJson("/api/status"),
      this.readJson("/api/inventory"),
      this.readJson("/api/workforce/specialists"),
      this.readJson("/api/workforce/businesses"),
      this.readJson("/api/caravans/guard-tiers"),
      this.readJson("/api/military/routes"),
      this.readJson("/api/locations"),
      this.readJson("/api/logistics/caravans"),
      this.readJson("/api/expeditions"),
      this.readJson("/api/professions/nodes")
    ]), Dt = e.status === "fulfilled" && e.value.success ? e.value.garrisons || [] : [], Rt = s.status === "fulfilled" && s.value.success ? s.value.settlements || [] : [], vt = a.status === "fulfilled" && a.value.success ? a.value.factions || [] : [], Q = n.status === "fulfilled" && n.value.success ? n.value : null, _t = l.status === "fulfilled" && l.value.success ? l.value.strongholds || [] : [], Vt = h.status === "fulfilled" && h.value.success ? h.value.crises || [] : [], Ot = b.status === "fulfilled" && b.value.success ? b.value.npcs || [] : [], et = C.status === "fulfilled" && C.value.success ? C.value : null, Pt = $.status === "fulfilled" && $.value.success ? $.value.items || [] : [], ft = D.status === "fulfilled" && D.value.success ? D.value.specialists || [] : [], wt = f.status === "fulfilled" && f.value.success ? f.value.businesses || [] : [], qt = y.status === "fulfilled" && y.value.success ? y.value.tiers || [] : [], Kt = E.status === "fulfilled" && E.value.success ? E.value.routes || [] : [], yt = F.status === "fulfilled" && F.value.success ? F.value.locations || [] : [], Ft = U.status === "fulfilled" && U.value.success ? U.value.caravans || [] : [], Ut = G.status === "fulfilled" && G.value.success ? G.value.expeditions || [] : [], Gt = j.status === "fulfilled" && j.value.success ? j.value.nodes || [] : [];
    e.status === "rejected" && this.state.errors.push("garrisons"), s.status === "rejected" && this.state.errors.push("factions/settlements"), a.status === "rejected" && this.state.errors.push("factions"), n.status === "rejected" && this.state.errors.push("military"), l.status === "rejected" && this.state.errors.push("strongholds"), h.status === "rejected" && this.state.errors.push("crises"), b.status === "rejected" && this.state.errors.push("npcs"), C.status === "rejected" && this.state.errors.push("status"), $.status === "rejected" && this.state.errors.push("inventory"), D.status === "rejected" && this.state.errors.push("workforce"), f.status === "rejected" && this.state.errors.push("businesses"), y.status === "rejected" && this.state.errors.push("guard-tiers"), E.status === "rejected" && this.state.errors.push("routes"), F.status === "rejected" && this.state.errors.push("locations"), U.status === "rejected" && this.state.errors.push("caravans"), G.status === "rejected" && this.state.errors.push("expeditions"), j.status === "rejected" && this.state.errors.push("resources");
    const st = {};
    vt.forEach((o) => {
      const c = o && o.factionId;
      c && (st[c] = o);
    });
    const v = {};
    Dt.forEach((o) => {
      !o || !o.settlementId || (v[o.settlementId] = this.mergeRecord(v[o.settlementId], o));
    }), Rt.forEach((o) => {
      !o || !o.settlementId || (v[o.settlementId] = this.mergeRecord(v[o.settlementId], o));
    }), Object.keys(v).forEach((o) => {
      const c = v[o], d = c.rulerFactionId ? st[c.rulerFactionId] : null;
      if (!d) return;
      const p = d;
      c.factionNameVi = p.nameVi, c.factionNameEn = p.nameEn, c.factionColor = p.colorHex, c.factionMilitaryPower = p.militaryPower;
    });
    const R = {};
    Object.keys(v).forEach((o) => {
      this.resolveMapNodeId(o) === o && (R[o] = this.mergeRecord(R[o], {
        ...v[o],
        sourceSettlementId: o
      }));
    }), Object.keys(v).forEach((o) => {
      const c = this.resolveMapNodeId(o);
      R[c] || (R[c] = this.mergeRecord(R[c], {
        ...v[o],
        sourceSettlementId: o
      }));
    }), this.state.bySettlement = v, this.state.byMapNode = R, this.state.activeExpeditions = Q && Q.activeExpeditions || [], this.state.player = Q && Q.commander || null, this.state.playerFaction = vt.find(
      (o) => o.leaderId === "PLY-0001"
    ) || null, this.state.factionsById = st;
    const W = {};
    _t.forEach((o) => {
      const c = o.status, d = o.locationNear;
      if (c !== "ACTIVE" || !d) return;
      const p = this.resolveMapNodeId(d);
      (W[p] || (W[p] = [])).push(o);
    });
    const z = {};
    Vt.forEach((o) => {
      const c = o.settlementId;
      if (!c) return;
      const d = this.resolveMapNodeId(c);
      (z[d] || (z[d] = [])).push(o);
    }), this.state.banditsByNode = W, this.state.crisesByNode = z;
    const Tt = {}, xt = {};
    Ot.forEach((o) => {
      const c = o.name, d = o.npc_id || o.npcId;
      d && (xt[d] = o), c && (Tt[this.normalizeName(c)] = o);
    }), this.state.npcsByName = Tt, this.state.npcsById = xt;
    const jt = Number(
      (It = et == null ? void 0 : et.player) == null ? void 0 : It.liquid_cash
    ) || 0, Nt = {};
    Pt.forEach((o) => {
      const c = o.item_code || o.itemCode, d = Number(o.quantity) || 0;
      c && (Nt[c] = d);
    }), this.state.playerCash = jt, this.state.inventory = Nt, this.state.guardTiers = qt;
    const Ct = {};
    ft.forEach((o) => {
      const c = o.nameVi;
      c && (Ct[this.normalizeName(c)] = o);
    }), this.state.specialistsByName = Ct, this.state.caravans = Ft, this.state.expeditions = Ut;
    const _ = {}, at = {};
    Gt.forEach((o) => {
      const c = String(o.settlementId || ""), d = this.resolveMapNodeId(c), p = String(o.resourceType || "");
      !d || !p || (_[d] || (_[d] = { types: {}, nodes: [] }), _[d].types[p] = (_[d].types[p] || 0) + 1, _[d].nodes.push(o), at[p] = (at[p] || 0) + 1);
    }), this.state.resourcesByNode = _, this.state.resourceTotals = at;
    const $t = {};
    yt.forEach((o) => {
      const c = o.locationId;
      c && ($t[c] = o);
    }), this.state.locationsById = $t;
    const Et = {};
    if (typeof window < "u") {
      const o = window.SETTLEMENT_LABELS || {};
      Object.keys(o).forEach((c) => {
        if (c === "wu_wei") return;
        const d = o[c] && o[c].vi;
        d && (Et[this.normalizeLocationLabel(d)] = c);
      });
    }
    const O = {};
    yt.forEach((o) => {
      const c = o.locationId, d = o.nameVi;
      if (!c || !d) return;
      const p = Et[this.normalizeLocationLabel(d)];
      p && (O[c] = p);
    }), this.state.locToMapNode = O;
    const St = {};
    wt.forEach((o) => {
      const c = o.businessId, d = o.locationId;
      c && d && (St[c] = d);
    });
    const Y = {};
    ft.forEach((o) => {
      const c = !!o.isHired, d = o.assignedBusinessId, p = d ? St[d] : null, it = o.baselineLocation, q = c && p ? p : it, S = q ? O[q] : null;
      S && (Y[S] || (Y[S] = [])).push(o);
    }), this.state.businesses = wt, this.state.specialistsByMapNode = Y;
    const P = {};
    return Kt.forEach((o) => {
      const c = O[o.sourceLocationId || ""], d = O[o.targetLocationId || ""];
      if (!c || !d) return;
      const p = o.descriptionEn ? o.descriptionEn.trim() : "", it = p && !/^RT-/i.test(p) && /^[\x20-\x7E]+$/.test(p) ? p : void 0, q = {
        from: c,
        to: d,
        distanceLi: o.distanceLi,
        terrainType: o.terrainType,
        marchDays: o.standardMarchDays,
        grainCost: o.grainProvisionCost,
        ambushRisk: o.ambushRiskLevel,
        descVi: o.descriptionVi,
        descEn: it
      }, S = `${c}|${d}`, Lt = `${d}|${c}`;
      P[S] || (P[S] = q), P[Lt] || (P[Lt] = { ...q, from: d, to: c });
    }), this.state.routesByKey = P, this.state.status = this.state.errors.length === 17 ? "error" : "ready", this.state.fetchedAt = Date.now(), this.state;
  }
  getForMapNode(t) {
    return t && (this.state.byMapNode[t] || this.state.bySettlement[t]) || null;
  }
  normalizeName(t) {
    return t.normalize("NFC").trim().toLowerCase();
  }
  normalizeLocationLabel(t) {
    return t.replace(/\s*\(.*?\)/g, "").replace(/\s*&.*/g, "").replace(/Kinh Đô\s*/g, "").replace(/Tây Đô\s*/g, "").replace(/Imperial Capital\s*/gi, "").trim().toLowerCase();
  }
  findNpcByName(t) {
    return t && this.state.npcsByName[this.normalizeName(t)] || null;
  }
  findSpecialistByName(t) {
    return t && this.state.specialistsByName[this.normalizeName(t)] || null;
  }
  getLocIdForNode(t) {
    const e = Object.entries(this.state.locToMapNode).find(([, s]) => s === t);
    return e ? e[0] : null;
  }
  getSpecialistsForMapNode(t) {
    return [...this.state.specialistsByMapNode[t] || []].sort((s, a) => {
      const n = !!s.isHired, l = !!a.isHired;
      if (n !== l) return n ? 1 : -1;
      const h = String(s.nameVi || ""), b = String(a.nameVi || "");
      return h.localeCompare(b);
    });
  }
  getRecruitRequirement(t) {
    const e = this.findSpecialistByName(t);
    if (!e)
      return { canRecruit: !0, signingBonus: null, isHired: !1, reasonVi: "", reasonEn: "" };
    const s = !!e.isHired, a = Number(e.signingBonus) || 0;
    return s ? { canRecruit: !1, signingBonus: a, isHired: s, reasonVi: "Đã được chiêu mộ", reasonEn: "Already recruited" } : this.state.playerCash < a ? {
      canRecruit: !1,
      signingBonus: a,
      isHired: s,
      reasonVi: `Cần ${a} quan chiêu mộ`,
      reasonEn: `Need ${a} cash to recruit`
    } : { canRecruit: !0, signingBonus: a, isHired: s, reasonVi: "", reasonEn: "" };
  }
  getActionRequirements() {
    const t = this.state.playerCash, e = Object.values(this.state.inventory).filter((h) => h > 0).length, s = this.state.guardTiers.length ? Math.min(...this.state.guardTiers.map((h) => Number(h.costQian) || 0)) : null;
    let a = !0, n = "", l = "";
    return s == null ? (a = !1, n = "Chưa tải được bảng giá hộ vệ", l = "Guard prices are unavailable") : e === 0 ? (a = !1, n = "Kho không có hàng để xuất", l = "No cargo in the warehouse") : t < s && (a = !1, n = `Cần tối thiểu ${s} quan thuê hộ vệ`, l = `Need at least ${s} cash for guards`), { cash: t, cargoKinds: e, minGuardCost: s, canDispatchCaravan: a, reasonVi: n, reasonEn: l };
  }
  getRoute(t, e) {
    return this.state.routesByKey[`${t}|${e}`] || null;
  }
  getLivingEntities() {
    const t = this.state.caravans.filter((n) => String(n.status).toUpperCase() === "EN_ROUTE").map((n) => ({
      ...n,
      from: this.resolveMapNodeId(String(n.fromSettlementId || "")),
      to: this.resolveMapNodeId(String(n.toSettlementId || "")),
      progress: Number(n.routeProgress) || 0
    })).filter((n) => n.from && n.to), e = this.state.expeditions.filter((n) => String(n.status).toUpperCase() === "MARCHING").map((n) => {
      const l = n;
      return {
        ...n,
        from: this.resolveMapNodeId(String(l.origin_settlement_id || l.originSettlementId || "")),
        to: this.resolveMapNodeId(String(l.target_settlement_id || l.targetSettlementId || ""))
      };
    }).filter((n) => n.from && n.to), s = Object.entries(this.state.banditsByNode).flatMap(
      ([n, l]) => l.map((h) => ({ ...h, nodeId: n }))
    ), a = Object.entries(this.state.crisesByNode).flatMap(
      ([n, l]) => l.map((h) => ({ ...h, nodeId: n }))
    );
    return { caravans: t, expeditions: e, bandits: s, crises: a };
  }
  getStatusForMapNode(t) {
    var b;
    const e = this.getForMapNode(t);
    if (!e)
      return { key: "unknown", labelVi: "Chưa rõ", labelEn: "Unknown", className: "capital" };
    const s = (b = this.state.playerFaction) == null ? void 0 : b.factionId, a = !!(e.rulerFactionId && s && e.rulerFactionId === s), n = Number(e.garrisonTroops ?? 0), l = Number(e.granaryGrain ?? 0), h = Number(e.publicOrder ?? 100);
    return a ? n < 200 || l <= 0 || h < 30 ? { key: "strained", labelVi: "Suy Yếu", labelEn: "Strained", className: "battle" } : { key: "stable", labelVi: "An Định", labelEn: "Stable", className: "safe" } : { key: "foreign", labelVi: "Ngoại Bang", labelEn: "Foreign Holding", className: "capital" };
  }
  getThreatForMapNode(t) {
    const e = this.getForMapNode(t), s = this.state.banditsByNode[t] || [], a = this.state.crisesByNode[t] || [], n = [], l = [];
    let h = 0;
    if (s.length > 0) {
      const f = Math.max(
        ...s.map((y) => Number(y.banditPower) || 0)
      );
      h += Math.min(3, f / 150), n.push(`${s.length} ổ phỉ`), l.push(`${s.length} bandit lair${s.length > 1 ? "s" : ""}`);
    }
    a.forEach((f) => {
      const y = Number(f.severityLevel) || 1;
      h += Math.min(3, y);
      const E = f.titleVi || "Khủng hoảng";
      n.push(E), l.push(E);
    });
    const b = e && Number.isFinite(e.garrisonTroops) ? Number(e.garrisonTroops) : null, C = e && Number.isFinite(e.publicOrder) ? Number(e.publicOrder) : null;
    b != null && b < 500 && (h += 1, n.push("Đồn trú mỏng"), l.push("Thin garrison")), C != null && C < 40 && (h += 1, n.push("Trật tự thấp"), l.push("Low public order"));
    const $ = h >= 3 ? "HIGH" : h >= 1.5 ? "MODERATE" : "LOW", D = {
      LOW: { labelVi: "Thấp", labelEn: "Low", color: "#34d399" },
      MODERATE: { labelVi: "Vừa", labelEn: "Moderate", color: "#fbbf24" },
      HIGH: { labelVi: "Cao", labelEn: "High", color: "#f87171" }
    }[$];
    return { level: $, ...D, reasonsVi: n, reasonsEn: l };
  }
  getResourceDistribution() {
    return {
      byNode: this.state.resourcesByNode,
      totals: this.state.resourceTotals,
      types: Object.keys(this.state.resourceTotals).sort()
    };
  }
  getResourceNodesForMapNode(t) {
    var e;
    return ((e = this.state.resourcesByNode[t]) == null ? void 0 : e.nodes) || [];
  }
  hasArmy() {
    return Array.isArray(this.state.activeExpeditions) && this.state.activeExpeditions.length > 0;
  }
  getState() {
    return this.state;
  }
}
const g = new ge();
function me() {
  if (typeof window > "u") return;
  const i = window;
  i.ModalShellCore = {
    createModalShell: m,
    modalStack: lt
  }, i.UI = oe, i.LineageFamilyUI = {
    open: (t) => w.open(t),
    close: () => w.close(),
    setFilter: (t) => w.setFilter(t),
    proposeMarriage: (t) => w.proposeMarriage(t),
    restCohabit: (t) => w.restCohabit(t),
    assignRole: (t, e) => w.assignRole(t, e),
    designateHeir: (t) => w.designateHeir(t),
    assignMentorDialog: (t) => w.assignMentorDialog(t),
    executeSuccession: () => w.executeSuccession()
  }, i.EquipmentUI = {
    openEquipmentModal: (t, e) => V.open(t, e),
    closeEquipmentModal: () => V.close(),
    switchTab: (t) => V.modal.switchTab(t),
    equip: (t, e, s) => V.equip(t, e, s),
    unequip: (t, e) => V.unequip(t, e),
    executeForge: () => V.executeForge()
  }, i.EnterpriseUI = {
    openEnterpriseModal: (t) => K.open(t),
    closeEnterpriseModal: () => K.close(),
    depositSafeCash: (t) => K.depositSafeCash(t),
    withdrawSafeCash: (t) => K.withdrawSafeCash(t),
    executeWork: (t) => K.executeWork(t)
  }, i.ProtagonistDossierModal = {
    open: () => Z.openProtagonist(),
    close: () => Z.closeProtagonist()
  }, i.NpcDossierModal = {
    open: (t) => Z.openNpc(t),
    close: () => Z.closeNpc()
  }, i.QuickTradeModal = {
    open: (t, e, s, a) => tt.open(t, e, s, a),
    close: () => tt.close(),
    updateTotal: () => tt.updateTotal(),
    submit: () => tt.submit()
  }, i.TacticalBattleUI = {
    startDuel: (t) => ot.startDuel(t),
    close: () => ot.close(),
    executeAction: (t) => ot.executeAction(t)
  }, i.TravelTransitUI = {
    show: (t, e, s, a) => x.showTravelTransit(t, e, s, a),
    close: () => x.closeTravel(),
    openLegacy: () => x.openTravelTransitModal(),
    closeLegacy: () => x.closeTravelTransitModal()
  }, i.TurnAdvanceUI = {
    show: (t, e, s) => x.showTurnAdvance(t, e, s),
    close: () => x.closeTurn(),
    openLegacy: () => x.openTurnAdvanceModal(),
    closeLegacy: () => x.closeTurnAdvanceModal()
  }, i.WorldMapUI = {
    open: () => At.open(),
    close: () => At.close()
  }, i.MapLiveService = {
    load: (t = !1) => g.load(t),
    getForMapNode: (t) => g.getForMapNode(t),
    getStatusForMapNode: (t) => g.getStatusForMapNode(t),
    getThreatForMapNode: (t) => g.getThreatForMapNode(t),
    findNpcByName: (t) => g.findNpcByName(t),
    findSpecialistByName: (t) => g.findSpecialistByName(t),
    getSpecialistsForMapNode: (t) => g.getSpecialistsForMapNode(t),
    getLocIdForNode: (t) => g.getLocIdForNode(t),
    getRecruitRequirement: (t) => g.getRecruitRequirement(t),
    getActionRequirements: () => g.getActionRequirements(),
    getRoute: (t, e) => g.getRoute(t, e),
    getLivingEntities: () => g.getLivingEntities(),
    getResourceDistribution: () => g.getResourceDistribution(),
    getResourceNodesForMapNode: (t) => g.getResourceNodesForMapNode(t),
    resolveMapNodeId: (t) => g.resolveMapNodeId(t),
    hasArmy: () => g.hasArmy(),
    getState: () => g.getState(),
    ALIASES: g.ALIASES
  }, console.log("[ThreeKingdoms-AgentEngine] All 14 client feature slices successfully bridged to window.*");
}
class ve {
  constructor() {
    r(this, "handlers", /* @__PURE__ */ new Map());
  }
  on(t, e) {
    return this.handlers.has(t) || this.handlers.set(t, /* @__PURE__ */ new Set()), this.handlers.get(t).add(e), () => {
      this.off(t, e);
    };
  }
  off(t, e) {
    const s = this.handlers.get(t);
    s && (s.delete(e), s.size === 0 && this.handlers.delete(t));
  }
  emit(t, e) {
    const s = this.handlers.get(t);
    s && s.forEach((a) => {
      try {
        a(e);
      } catch (n) {
        console.error(`[EventBus] Error handling event ${t}:`, n);
      }
    });
  }
}
const Te = new ve(), H = class H {
  static getInstance() {
    return H.instance || (H.instance = new H()), H.instance;
  }
  async getCaravans() {
    return (await u.get("/api/logistics/caravans")).caravans || [];
  }
  async getArbitrageOpportunities() {
    return (await u.get("/api/economy/arbitrage")).routes || [];
  }
  async dispatchCaravan(t) {
    return u.post("/api/caravans/dispatch", {
      cargoItemCode: t.commodityCode,
      cargoQuantity: t.quantity,
      fromSettlementId: t.originSettlementId,
      toSettlementId: t.destSettlementId,
      guardTier: t.escortLevel
    });
  }
};
r(H, "instance");
let mt = H;
const rt = mt.getInstance();
class fe {
  constructor() {
    r(this, "modal");
    r(this, "caravans", []);
    r(this, "routes", []);
    this.modal = m({
      id: "caravan-modal",
      title: "Thương Đoàn Viễn Chinh & Trục Vận Chuyển",
      subtitle: "Thiết lập tuyến buôn liên châu, kinh doanh chênh lệch giá và thuê hộ tiêu áp tải",
      seal: "商",
      size: "xl",
      tabs: [
        { id: "active", label: "Thương Đoàn Đang Chạy", seal: "運" },
        { id: "arbitrage", label: "Thương Cơ & Chênh Lệch Giá", seal: "漲" },
        { id: "dispatch", label: "Xuất Tiêu Khai Tuyến", seal: "旗" }
      ],
      activeTabId: "active",
      onOpen: async () => {
        await this.refreshData(), await this.renderActiveTab();
      },
      onTabChange: async () => {
        await this.renderActiveTab();
      }
    });
  }
  async open(t = "active") {
    await this.modal.open(t);
  }
  async close() {
    await this.modal.close();
  }
  async refreshData() {
    try {
      const [t, e] = await Promise.all([
        rt.getCaravans().catch(() => []),
        rt.getArbitrageOpportunities().catch(() => [])
      ]);
      this.caravans = t, this.routes = e, this.modal.updateTabBadge("active", t.length > 0 ? t.length : void 0);
    } catch (t) {
      console.error("[CaravanLogisticsModal] Error refreshing data:", t);
    }
  }
  async renderActiveTab() {
    switch (this.modal.activeTab || "active") {
      case "active":
        this.renderActiveTabContent();
        break;
      case "arbitrage":
        this.renderArbitrageTabContent();
        break;
      case "dispatch":
        this.renderDispatchTabContent();
        break;
    }
  }
  renderActiveTabContent() {
    const t = `
      <div class="caravan-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">運</div>
          <div class="lead-text">
            <h3>Đội Buôn Lưu Động (${this.caravans.length} Tiêu Xa)</h3>
            <div class="text-muted text-sm">Thương đoàn di chuyển liên thành theo lượt tháng, ứng biến trước thời tiết và thổ phỉ dọc quan đạo.</div>
          </div>
        </div>

        ${this.caravans.length === 0 ? `
          <div class="text-center py-10 text-muted">
            Hiện không có thương đoàn nào trên đường. Hãy vào mục "Xuất Tiêu Khai Tuyến" để phái chuyến buôn đầu tiên.
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${this.caravans.map((e) => `
              <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
                <div class="flex justify-between items-start mb-2">
                  <h4 class="text-amber-200 font-bold m-0 text-sm">Hàng Hóa: ${e.commodity_code} (SL: ${e.cargo_qty})</h4>
                  <span class="badge ${e.status === "IN_TRANSIT" ? "badge-primary" : "badge-success"} text-xs">${e.status}</span>
                </div>
                <div class="text-xs text-muted mb-2">Từ: ${e.origin_settlement_id} → Đến: ${e.dest_settlement_id}</div>
                <div class="text-xs text-slate-300 font-mono">Thời gian còn lại: ${e.days_remaining}/${e.total_days} ngày • Hộ vệ: ${e.escort_level}</div>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    `;
    this.modal.setContent(t);
  }
  renderArbitrageTabContent() {
    const t = `
      <div class="caravan-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">漲</div>
          <div class="lead-text">
            <h3>Bảng Chênh Lệch Giá Hàng Hóa Liên Châu</h3>
            <div class="text-muted text-sm">Phân tích giá mua tại Trác Huyện và giá bán tại các thành thị lớn (Lạc Dương, Nghiệp Thành, Kiến Nghiệp).</div>
          </div>
        </div>

        ${this.routes.length === 0 ? `
          <div class="text-center py-8 text-muted">Đang cập nhật tỷ giá liên thành...</div>
        ` : `
          <div class="grid grid-cols-1 gap-2">
            ${this.routes.map((e) => `
              <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span class="font-bold text-amber-200">${e.commodityNameVi || e.commodityCode}</span>: 
                  ${e.originNameVi} (${e.buyPrice}đ) → ${e.destNameVi} (${e.sellPrice}đ)
                </div>
                <div class="text-right">
                  <span class="text-green-400 font-bold font-mono">+${e.profitPerUnit}đ/đơn vị</span>
                  <div class="text-muted text-[11px]">${e.distanceDays} ngày hành trình</div>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    `;
    this.modal.setContent(t);
  }
  renderDispatchTabContent() {
    this.modal.setContent(`
      <div class="caravan-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">旗</div>
          <div class="lead-text">
            <h3>Khởi Hành Tiêu Xa Thương Đoàn</h3>
            <div class="text-muted text-sm">Chọn điểm đến, loại hàng hóa trong kho và cấp bậc thuê tiêu sư bảo an.</div>
          </div>
        </div>

        <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Thành Thị Đích:</label>
              <select id="caravan-dest-id" class="modal-input w-full">
                <option value="ye_cheng">Nghiệp Thành (Hà Bắc - 5 ngày)</option>
                <option value="luo_yang">Lạc Dương (Kinh Đô - 12 ngày)</option>
                <option value="xu_chang">Hứa Xương (Trung Nguyên - 10 ngày)</option>
                <option value="jian_ye">Kiến Nghiệp (Giang Đông - 18 ngày)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Hàng Hóa Vận Chuyển:</label>
              <select id="caravan-commodity" class="modal-input w-full">
                <option value="PROD-MAT">Chiếu Trúc Lương Gia</option>
                <option value="PROD-BASK">Giỏ Thùng Đan Vận Chuyển</option>
                <option value="COM-SILK">Tơ Lụa Nguyên Tấm</option>
                <option value="COM-IRON">Sắt Thỏi Luyện Tinh</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Số Lượng Xuất Kho:</label>
              <input type="number" id="caravan-qty" class="modal-input w-full" value="20" min="5" max="100" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Cấp Hộ Tiêu Bảo An:</label>
              <select id="caravan-escort" class="modal-input w-full">
                <option value="NONE">Không Thuê (Rủi ro thổ phỉ cao)</option>
                <option value="MILITIA">Dân Binh Địa Phương (+100 Quan)</option>
                <option value="MERCENARY">Tiêu Sư Giang Hồ (+300 Quan, An Toàn 95%)</option>
              </select>
            </div>
          </div>

          <button class="ui-btn ui-btn--accent w-full py-2.5 font-bold" onclick="window.CaravanUI.executeDispatch()">
            Xuất Phát Thương Đoàn
          </button>
        </div>
      </div>
    `);
  }
  async executeDispatch() {
    const t = document.getElementById("caravan-dest-id"), e = document.getElementById("caravan-commodity"), s = document.getElementById("caravan-qty"), a = document.getElementById("caravan-escort"), n = {
      originSettlementId: "zhuo_xian",
      destSettlementId: (t == null ? void 0 : t.value) || "ye_cheng",
      commodityCode: (e == null ? void 0 : e.value) || "PROD-MAT",
      quantity: parseInt((s == null ? void 0 : s.value) || "20", 10),
      escortLevel: (a == null ? void 0 : a.value) || "MILITIA"
    };
    try {
      const l = await rt.dispatchCaravan(n);
      typeof window.showToast == "function" && window.showToast(l.narrativeVi || "Thương đoàn đã xuất phát!"), await this.refreshData(), await this.modal.switchTab("active");
    } catch (l) {
      typeof window.showToast == "function" && window.showToast(l.message || "Lỗi xuất thương đoàn!", !0);
    }
  }
}
const xe = new fe();
class we {
  constructor() {
    r(this, "modal");
    r(this, "selectedScenario", "184_YELLOW_TURBAN");
    this.modal = m({
      // Distinct from the legacy instance-manager modal (#title-screen-modal):
      // two shells sharing an id made the legacy gate render into an empty body.
      id: "title-screen-scenario-modal",
      title: "Tam Quốc Diễn Nghĩa • Khởi Tạo Niên Đại & Nhân Vật",
      subtitle: "Chọn niên đại lịch sử và thiết lập danh tính nhân vật chính",
      seal: "國",
      size: "lg",
      onOpen: async () => {
        this.renderContent();
      }
    });
  }
  async open() {
    await this.modal.open();
  }
  async close() {
    await this.modal.close();
  }
  renderContent() {
    const t = `
      <div class="title-screen-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">國</div>
          <div class="lead-text">
            <h3>Chọn Khởi Điểm Chiến Dịch</h3>
            <div class="text-muted text-sm">Mỗi niên đại có cục diện chư hầu, kinh tế và thế lực hoàn toàn khác biệt.</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div class="tactical-card p-3 bg-slate-900 rounded border ${this.selectedScenario === "184_YELLOW_TURBAN" ? "border-amber-400 bg-amber-950/20" : "border-slate-800"} cursor-pointer"
               onclick="window.TitleScreenUI.selectScenario('184_YELLOW_TURBAN')">
            <h4 class="text-amber-200 font-bold text-sm mb-1">184 SCN: Khởi Nghĩa Khăn Vàng</h4>
            <div class="text-xs text-muted">Trương Giác dấy binh, triều đình suy vi, anh hùng thảo mộc bắt đầu khởi nghiệp.</div>
          </div>

          <div class="tactical-card p-3 bg-slate-900 rounded border ${this.selectedScenario === "190_DONG_ZHUO" ? "border-amber-400 bg-amber-950/20" : "border-slate-800"} cursor-pointer"
               onclick="window.TitleScreenUI.selectScenario('190_DONG_ZHUO')">
            <h4 class="text-amber-200 font-bold text-sm mb-1">190 SCN: Thảo Phạt Đổng Trác</h4>
            <div class="text-xs text-muted">Mười tám lộ chư hầu hội minh Quan Đông, Lạc Dương biển lửa.</div>
          </div>

          <div class="tactical-card p-3 bg-slate-900 rounded border ${this.selectedScenario === "200_GUANDU" ? "border-amber-400 bg-amber-950/20" : "border-slate-800"} cursor-pointer"
               onclick="window.TitleScreenUI.selectScenario('200_GUANDU')">
            <h4 class="text-amber-200 font-bold text-sm mb-1">200 SCN: Quan Độ Chi Chiến</h4>
            <div class="text-xs text-muted">Tào Tháo đối đầu Viên Thiệu tranh đoạt bá chủ phương bắc.</div>
          </div>

          <div class="tactical-card p-3 bg-slate-900 rounded border ${this.selectedScenario === "208_CHIBI" ? "border-amber-400 bg-amber-950/20" : "border-slate-800"} cursor-pointer"
               onclick="window.TitleScreenUI.selectScenario('208_CHIBI')">
            <h4 class="text-amber-200 font-bold text-sm mb-1">208 SCN: Xích Bích Đại Chiến</h4>
            <div class="text-xs text-muted">Tôn Lưu liên minh, đại chiến thủy quân Trường Giang định hình Tam Quốc.</div>
          </div>
        </div>

        <div class="tactical-card p-3.5 bg-slate-900 rounded border border-slate-800">
          <h4 class="text-amber-300 font-bold text-xs uppercase mb-2">Thông Tin Nhân Vật Khởi Tạo:</h4>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Họ & Tên:</label>
              <input type="text" id="ts-player-name" class="modal-input w-full" value="Lương Diễn" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-300 mb-1">Tên Chữ (Tự):</label>
              <input type="text" id="ts-player-style" class="modal-input w-full" value="Chí Viễn" />
            </div>
          </div>
          <button class="ui-btn ui-btn--accent w-full py-2.5 font-bold" onclick="window.TitleScreenUI.startCampaign()">
            Khởi Sự Chiến Dịch Lịch Sử
          </button>
        </div>
      </div>
    `;
    this.modal.setContent(t);
  }
  selectScenario(t) {
    this.selectedScenario = t, this.renderContent();
  }
  async startCampaign() {
    const t = document.getElementById("ts-player-name"), e = document.getElementById("ts-player-style");
    try {
      await u.post("/api/session/new-game", {
        scenario: this.selectedScenario,
        playerName: (t == null ? void 0 : t.value) || "Lương Diễn",
        playerStyle: (e == null ? void 0 : e.value) || "Chí Viễn"
      }), typeof window.showToast == "function" && window.showToast("Khởi tạo chiến dịch thành công!"), await this.modal.close(), window.location.reload();
    } catch (s) {
      typeof window.showToast == "function" && window.showToast(s.message || "Lỗi khởi tạo chiến dịch!", !0);
    }
  }
}
const Ne = new we();
me();
export {
  fe as CaravanLogisticsModal,
  mt as CaravanLogisticsService,
  dt as ClientApiClient,
  de as DossiersModal,
  bt as DossiersService,
  ce as EnterpriseWorkshopModal,
  pt as EnterpriseWorkshopService,
  le as EquipmentForgeModal,
  ut as EquipmentForgeService,
  Yt as LEGACY_OWNED_MODAL_IDS,
  re as LineageFamilyModal,
  ht as LineageFamilyService,
  Jt as ModalShell,
  he as QuickTradeModal,
  ue as TacticalBattleModal,
  we as TitleScreenModal,
  pe as TransitTurnModals,
  be as WorldMapModal,
  u as apiClient,
  xe as caravanLogisticsModal,
  rt as caravanLogisticsService,
  m as createModalShell,
  Z as dossiersModal,
  kt as dossiersService,
  K as enterpriseWorkshopModal,
  J as enterpriseWorkshopService,
  V as equipmentForgeModal,
  X as equipmentForgeService,
  Te as eventBus,
  Xt as isLegacyOwnedModalId,
  w as lineageFamilyModal,
  T as lineageFamilyService,
  lt as modalStack,
  tt as quickTradeModal,
  ot as tacticalBattleModal,
  Ne as titleScreenModal,
  x as transitTurnModals,
  At as worldMapModal
};
//# sourceMappingURL=client-bundle.es.js.map
