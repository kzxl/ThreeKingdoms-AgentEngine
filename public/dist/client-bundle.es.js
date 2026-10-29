var k = Object.defineProperty;
var E = (d, t, e) => t in d ? k(d, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : d[t] = e;
var s = (d, t, e) => E(d, typeof t != "symbol" ? t + "" : t, e);
class C {
  constructor() {
    s(this, "stack", []);
    s(this, "isEscListenerAttached", !1);
    s(this, "BASE_Z_INDEX", 1e3);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }
  /**
   * Pushes a newly opened modal onto the stack and manages focus/z-index.
   */
  push(t, e) {
    const a = this.stack.indexOf(t);
    a > -1 && this.stack.splice(a, 1), this.stack.push(t);
    const i = this.BASE_Z_INDEX + this.stack.length * 10;
    e.style.zIndex = i.toString(), this.ensureEscListener(), this.updateBodyScrollLock();
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
const T = new C();
class S {
  constructor(t) {
    s(this, "id");
    s(this, "options");
    s(this, "backdropEl", null);
    s(this, "dialogEl", null);
    s(this, "titleEl", null);
    s(this, "subtitleEl", null);
    s(this, "sealEl", null);
    s(this, "tabBarEl", null);
    s(this, "bodyEl", null);
    s(this, "footerEl", null);
    s(this, "_isOpen", !1);
    s(this, "_activeTab", null);
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
    let t = document.getElementById(this.id);
    t || (t = document.createElement("div"), t.id = this.id, document.body.appendChild(t)), this.backdropEl = t, this.backdropEl.className = `modal-backdrop hidden ${this.options.customClass || ""}`.trim();
    const a = {
      sm: "modal-sm",
      md: "modal-md",
      lg: "modal-lg spatial-poi-dialog",
      xl: "modal-box--large spatial-poi-dialog",
      full: "modal-full spatial-poi-dialog"
    }[this.options.size || "lg"] || "modal-lg";
    this.backdropEl.innerHTML = `
      <div class="modal-dialog ${a} ${this.options.dialogClass || ""}" role="dialog" aria-modal="true" aria-labelledby="${this.id}-title">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-title-seal" id="${this.id}-seal">${this.options.seal || "◈"}</span>
            <div>
              <h2 class="modal-title-text" id="${this.id}-title">${this.options.title}</h2>
              <div class="modal-subtitle" id="${this.id}-subtitle">${this.options.subtitle || ""}</div>
            </div>
          </div>
          <button class="btn-close-modal" id="${this.id}-btn-close" title="Đóng [Esc]" aria-label="Close">✕</button>
        </div>
        ${this.options.tabs && this.options.tabs.length > 0 ? `<div class="modal-tab-bar" id="${this.id}-tab-bar"></div>` : ""}
        <div class="modal-body" id="${this.id}-body"></div>
        <div class="modal-footer hidden" id="${this.id}-footer"></div>
      </div>
    `, this.dialogEl = this.backdropEl.querySelector(".modal-dialog"), this.titleEl = this.backdropEl.querySelector(`#${this.id}-title`), this.subtitleEl = this.backdropEl.querySelector(`#${this.id}-subtitle`), this.sealEl = this.backdropEl.querySelector(`#${this.id}-seal`), this.tabBarEl = this.backdropEl.querySelector(`#${this.id}-tab-bar`), this.bodyEl = this.backdropEl.querySelector(`#${this.id}-body`), this.footerEl = this.backdropEl.querySelector(`#${this.id}-footer`);
    const i = this.backdropEl.querySelector(`#${this.id}-btn-close`);
    i && i.addEventListener("click", (n) => {
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
      e.addEventListener("click", (a) => {
        a.preventDefault();
        const i = e.getAttribute("data-tab-id");
        i && i !== this._activeTab && this.switchTab(i);
      });
    }));
  }
  async open(t) {
    this.backdropEl || this.mountDom(), this.backdropEl && (t && t !== this._activeTab && (this._activeTab = t, this.updateActiveTabButton()), this.backdropEl.classList.remove("hidden"), this._isOpen = !0, T.push(this, this.backdropEl), this.options.onOpen && await this.options.onOpen(this));
  }
  async close() {
    !this._isOpen || !this.backdropEl || (this.backdropEl.classList.add("hidden"), this._isOpen = !1, T.remove(this), this.options.onClose && await this.options.onClose(this));
  }
  async toggle() {
    this._isOpen ? await this.close() : await this.open();
  }
  setContent(t) {
    this.bodyEl && (typeof t == "string" ? this.bodyEl.innerHTML = t : (this.bodyEl.innerHTML = "", this.bodyEl.appendChild(t)));
  }
  setTitle(t, e, a) {
    this.titleEl && (this.titleEl.textContent = t), e !== void 0 && this.subtitleEl && (this.subtitleEl.textContent = e), a !== void 0 && this.sealEl && (this.sealEl.textContent = a);
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
    const a = this.tabBarEl.querySelector(`[data-tab-id="${t}"]`);
    if (!a) return;
    let i = a.querySelector(".tab-badge");
    e == null || e === "" ? i && i.remove() : (i || (i = document.createElement("span"), i.className = "tab-badge", a.appendChild(i)), i.textContent = String(e));
  }
  setFooter(t) {
    if (this.footerEl)
      if (Array.isArray(t)) {
        this.footerEl.innerHTML = "", this.footerEl.className = "modal-footer flex items-center justify-end gap-3";
        for (const e of t) {
          const a = document.createElement("button"), i = e.variant === "ghost" ? "btn-action-ghost" : e.variant === "danger" ? "btn-danger" : e.variant === "gold" ? "btn-action-gold" : "btn-primary";
          a.className = `btn ${i}`, a.textContent = e.label, e.disabled && (a.disabled = !0), a.addEventListener("click", async (n) => {
            n.preventDefault(), await e.onClick(this);
          }), this.footerEl.appendChild(a);
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
function m(d) {
  return new S(d);
}
const b = class b {
  static getInstance() {
    return b.instance || (b.instance = new b()), b.instance;
  }
  async get(t, e) {
    let a = t;
    if (e) {
      const n = new URLSearchParams();
      for (const [w, c] of Object.entries(e))
        c != null && n.append(w, String(c));
      const r = n.toString();
      r && (a += (a.includes("?") ? "&" : "?") + r);
    }
    const i = await fetch(a);
    if (!i.ok) {
      const n = await i.json().catch(() => ({}));
      throw new Error(n.error || `HTTP error ${i.status}: ${i.statusText}`);
    }
    return i.json();
  }
  async post(t, e) {
    const a = await fetch(t, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: e ? JSON.stringify(e) : void 0
    }), i = await a.json().catch(() => ({}));
    if (!a.ok || i && i.success === !1)
      throw new Error(i.error || `HTTP error ${a.status}: ${a.statusText}`);
    return i;
  }
};
s(b, "instance");
let x = b;
const o = x.getInstance(), g = class g {
  static getInstance() {
    return g.instance || (g.instance = new g()), g.instance;
  }
  async getOverview() {
    const t = await o.get("/api/lineage/status");
    return t.overview || t;
  }
  async getCourtshipCandidates() {
    return (await o.get("/api/lineage/courtship-candidates")).candidates || [];
  }
  async proposeMarriage(t) {
    return o.post("/api/lineage/propose-marriage", { candidateId: t });
  }
  async restAndCohabit(t) {
    return o.post("/api/lineage/rest-cohabit", { spouseId: t });
  }
  async assignHouseholdRole(t, e) {
    return o.post("/api/lineage/assign-role", { marriageId: t, role: e });
  }
  async getHeirs() {
    return o.get("/api/lineage/heirs");
  }
  async assignMentor(t, e) {
    return o.post("/api/lineage/assign-mentor", { childId: t, mentorId: e });
  }
  async designateHeir(t) {
    return o.post("/api/lineage/designate-heir", { childId: t });
  }
  async getSuccessionPreview() {
    return o.get("/api/lineage/succession-preview");
  }
  async executeSuccession() {
    return o.post("/api/lineage/execute-succession", {});
  }
};
s(g, "instance");
let f = g;
const u = f.getInstance();
class $ {
  constructor() {
    s(this, "modal");
    s(this, "overview", null);
    s(this, "candidates", []);
    s(this, "selectedStratumFilter", "ALL");
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
      const [a, i] = await Promise.all([
        u.getOverview().catch(() => null),
        u.getCourtshipCandidates().catch(() => [])
      ]);
      this.overview = a, this.candidates = i;
      const n = ((t = a == null ? void 0 : a.spouses) == null ? void 0 : t.length) || 0, r = ((e = a == null ? void 0 : a.children) == null ? void 0 : e.length) || 0;
      this.modal.updateTabBadge("courtship", n > 0 ? n : void 0), this.modal.updateTabBadge("heirs", r > 0 ? r : void 0);
    } catch (a) {
      console.error("[LineageFamilyModal] Error refreshing data:", a);
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
    var n, r, w;
    const t = ((n = this.overview) == null ? void 0 : n.spouses) || [], e = t.length > 0;
    let a = this.candidates;
    this.selectedStratumFilter !== "ALL" && (a = this.candidates.filter((c) => c.socialStratum === this.selectedStratumFilter));
    const i = `
      <div class="lineage-modal-content">
        <!-- Clan Banner -->
        <div class="spatial-banner-lead">
          <div class="lead-seal">家</div>
          <div class="lead-text">
            <h3>Gia Tộc Thế Hệ Thứ ${((r = this.overview) == null ? void 0 : r.generation) || 1} • Danh Vọng Gia Tộc: ${((w = this.overview) == null ? void 0 : w.clanPrestige) || 100}</h3>
            <div class="text-muted text-sm">
              ${e ? `Đã thành gia lập thất với ${t.length} phu nhân. Gia đạo hòa thuận, con cháu hưng vượng.` : "Chưa lập gia thất. Hãy tìm kiếm giai nhân phù hợp từ thường dân hoặc danh môn để kết tóc se duyên."}
            </div>
          </div>
        </div>

        <!-- Current Spouses Section -->
        ${e ? `
          <div class="section-title text-gold font-bold mb-3">Chính Thê & Thê Thiếp Đang Chung Sống:</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            ${t.map((c) => this.renderSpouseCard(c)).join("")}
          </div>
        ` : ""}

        <!-- Courtship Section -->
        <div class="flex items-center justify-between mb-3 border-b border-amber-900/40 pb-2">
          <div class="section-title text-gold font-bold">Danh Sách Giai Nhân & Đối Tượng Cầu Hôn:</div>
          <div class="flex gap-2">
            <button class="btn btn-xs ${this.selectedStratumFilter === "ALL" ? "btn-primary" : "btn-action-ghost"}" onclick="window.LineageFamilyUI.setFilter('ALL')">Tất Cả (${this.candidates.length})</button>
            <button class="btn btn-xs ${this.selectedStratumFilter === "PEASANT" ? "btn-primary" : "btn-action-ghost"}" onclick="window.LineageFamilyUI.setFilter('PEASANT')">Nông Gia</button>
            <button class="btn btn-xs ${this.selectedStratumFilter === "ARTISAN_SHOP" ? "btn-primary" : "btn-action-ghost"}" onclick="window.LineageFamilyUI.setFilter('ARTISAN_SHOP')">Thợ Xưởng</button>
            <button class="btn btn-xs ${this.selectedStratumFilter === "GENTRY_CLAN" ? "btn-primary" : "btn-action-ghost"}" onclick="window.LineageFamilyUI.setFilter('GENTRY_CLAN')">Sĩ Tộc</button>
            <button class="btn btn-xs ${this.selectedStratumFilter === "HISTORICAL_HEROINE" ? "btn-primary" : "btn-action-ghost"}" onclick="window.LineageFamilyUI.setFilter('HISTORICAL_HEROINE')">Danh Viện</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          ${a.length > 0 ? a.map((c) => this.renderCandidateCard(c)).join("") : '<div class="text-muted col-span-full py-6 text-center">Không có giai nhân nào trong danh mục này.</div>'}
        </div>
      </div>
    `;
    this.modal.setContent(i);
  }
  renderSpouseCard(t) {
    const e = [
      { id: "HOUSEKEEPER", name: "Quản Gia Tề Nội" },
      { id: "ENTERPRISE_SUPERVISOR", name: "Giám Sát Sản Nghiệp" },
      { id: "STRATEGIC_ADVISOR", name: "Mưu Lược Tham Mưu" },
      { id: "MILITARY_DEFENDER", name: "Thống Soái Hộ Vệ" }
    ], a = Number(t.pregnancy_stage) > 0, i = Number(t.pregnancy_stage) === 1 ? "Thai Nghén Sơ Kỳ (Tháng 1)" : Number(t.pregnancy_stage) === 2 ? "Thai Kỳ Trung Kỳ (Tháng 2)" : Number(t.pregnancy_stage) === 3 ? "Sắp Đến Ngày Lâm Bồn!" : "Bình thường";
    return `
      <div class="tactical-card border-l-4 border-pink-500 p-3 bg-slate-900/80 rounded">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h4 class="text-amber-200 font-bold text-base m-0">${t.wife_name_vi}</h4>
            <div class="text-xs text-muted">Hôn Lễ: Ngày ${t.marriage_date} (Lượt ${t.marriage_turn})</div>
          </div>
          <div class="badge ${a ? "badge-danger animate-pulse" : "badge-neutral"} text-xs">
            ${a ? "🍼 " + i : "Hảo Cảm: " + t.intimacy}
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
          <button class="btn btn-xs btn-primary flex-1" onclick="window.LineageFamilyUI.restCohabit('${t.wife_id}')">
            ❤️ Nghỉ Ngơi & Đồng Tẩm
          </button>
        </div>
      </div>
    `;
  }
  renderCandidateCard(t) {
    const a = {
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
            <span class="badge ${a.color} text-xs">${a.label}</span>
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
            <span class="text-amber-400 font-mono font-bold">${t.dowryCash.toLocaleString()} Tiền</span>
          </div>
        </div>

        <button class="btn btn-xs btn-action-gold w-full" 
                onclick="window.LineageFamilyUI.proposeMarriage('${t.npcId}')">
          Cầu Hôn Nạp Sính Lễ
        </button>
      </div>
    `;
  }
  renderHeirsTab() {
    var a;
    const t = ((a = this.overview) == null ? void 0 : a.children) || [], e = `
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
            <div class="text-4xl mb-3">👶</div>
            <div>Hiện tại gia tộc chưa có hậu duệ sinh hạ. Hãy nghỉ ngơi đồng tẩm cùng phu nhân để thụ thai dưỡng dục.</div>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${t.map((i) => this.renderChildCard(i)).join("")}
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
            ${e ? "👑 ĐÍCH TỬ KẾ VỊ" : "Thứ Tử"}
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
            <button class="btn btn-xs btn-action-gold flex-1" onclick="window.LineageFamilyUI.designateHeir('${t.child_id}')">
              Lập Làm Thế Tử
            </button>
          `}
          <button class="btn btn-xs btn-action-ghost flex-1" onclick="window.LineageFamilyUI.assignMentorDialog('${t.child_id}')">
            Chỉ Định Danh Sư
          </button>
        </div>
      </div>
    `;
  }
  renderTreeTab() {
    var e, a, i, n;
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
            Đời Thứ ${((a = this.overview) == null ? void 0 : a.generation) || 1}: ${((i = this.overview) == null ? void 0 : i.clanName) || "Lương Gia Tộc"}
          </div>
          <div class="text-xs text-muted mb-6">↓ Các chi phu nhân & thế tử tiếp nối ↓</div>
          
          <div class="flex flex-wrap justify-center gap-4">
            ${(((n = this.overview) == null ? void 0 : n.children) || []).map((r) => `
              <div class="p-3 bg-slate-900 rounded border border-slate-700 min-w-[140px] text-xs">
                <div class="font-bold text-amber-300">${r.name_vi}</div>
                <div class="text-muted">${r.is_heir === 1 ? "👑 Thế Tử" : "Chi tộc"}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;
    this.modal.setContent(t);
  }
  renderSuccessionTab() {
    var a, i;
    const t = (a = this.overview) == null ? void 0 : a.activeHeir, e = `
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
                <li>Thế hệ gia tộc tăng lên <strong>Thế Hệ Thứ ${(((i = this.overview) == null ? void 0 : i.generation) || 1) + 1}</strong>.</li>
                <li>100% Tiền mặt, Sản nghiệp và Binh khí truyền quốc được bảo lưu toàn vẹn.</li>
              </ul>
            </div>

            <button class="btn btn-action-gold w-full py-2.5 text-base font-bold" 
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
      const e = await u.proposeMarriage(t);
      typeof window.showToast == "function" && window.showToast(e.narrativeVi || "Kết tóc se duyên thành công!"), await this.refreshData(), await this.renderActiveTab();
    } catch (e) {
      typeof window.showToast == "function" && window.showToast(e.message || "Cầu hôn thất bại!", !0);
    }
  }
  async restCohabit(t) {
    try {
      const e = await u.restAndCohabit(t);
      typeof window.showToast == "function" && window.showToast(e.narrativeVi || "Đồng tẩm nghỉ ngơi tĩnh dưỡng thành công!"), await this.refreshData(), await this.renderActiveTab();
    } catch (e) {
      typeof window.showToast == "function" && window.showToast(e.message || "Không thể nghỉ ngơi lúc này!", !0);
    }
  }
  async assignRole(t, e) {
    try {
      await u.assignHouseholdRole(t, e), typeof window.showToast == "function" && window.showToast("Đã phân công trọng trách nội trạch thành công!"), await this.refreshData();
    } catch (a) {
      typeof window.showToast == "function" && window.showToast(a.message || "Lỗi phân công trọng trách!", !0);
    }
  }
  async designateHeir(t) {
    try {
      await u.designateHeir(t), typeof window.showToast == "function" && window.showToast("Đã chỉ định đích tử kế vị gia tộc!"), await this.refreshData(), await this.renderActiveTab();
    } catch (e) {
      typeof window.showToast == "function" && window.showToast(e.message || "Không thể lập thế tử!", !0);
    }
  }
  async assignMentorDialog(t) {
    const e = prompt("Nhập ID danh sư thụ giáo (ví dụ: NPC-0003 cho Quan Vũ, NPC-0001 cho Lư Thực):", "NPC-0003");
    if (e)
      try {
        await u.assignMentor(t, e), typeof window.showToast == "function" && window.showToast("Đã bái kiến danh sư thụ giáo thành công!"), await this.refreshData(), await this.renderActiveTab();
      } catch (a) {
        typeof window.showToast == "function" && window.showToast(a.message || "Lỗi chỉ định danh sư!", !0);
      }
  }
  async executeSuccession() {
    if (confirm("Bạn có chắc chắn muốn chuyển giao quyền lực sang Thế tử kế thừa không?"))
      try {
        const t = await u.executeSuccession();
        typeof window.showToast == "function" && window.showToast(t.narrativeVi || "Đại điển kế thừa tông miếu hoàn tất!"), await this.refreshData(), await this.renderActiveTab();
      } catch (t) {
        typeof window.showToast == "function" && window.showToast(t.message || "Kế thừa thất bại!", !0);
      }
  }
}
const h = new $(), v = class v {
  static getInstance() {
    return v.instance || (v.instance = new v()), v.instance;
  }
  // --- Tavern Endpoints ---
  async getBanquetStatus() {
    return o.get("/api/banquet/status");
  }
  async drinkWine() {
    return o.post("/api/banquet/drink", {});
  }
  async hostBanquet(t) {
    return o.post("/api/banquet/host", { tierId: t });
  }
  async swearBrotherhood(t) {
    return o.post("/api/banquet/brotherhood", { targetNpcId: t });
  }
  // --- Arena Endpoints ---
  async getArenaRoster() {
    return o.get("/api/arena/roster");
  }
  async startDuel(t) {
    return o.post("/api/arena/duel/start", { opponentId: t });
  }
  async executeDuelRound(t, e) {
    return o.post("/api/arena/duel/round", { duelId: t, action: e });
  }
  // --- Residence Endpoints ---
  async restAtResidence(t = 1) {
    return o.post("/api/character/rest", { days: t });
  }
};
s(v, "instance");
let y = v;
const p = y.getInstance();
class M {
  constructor() {
    s(this, "tavernModal");
    s(this, "arenaModal");
    s(this, "residenceModal");
    s(this, "currentDuelId", null);
    s(this, "currentDuelState", null);
    s(this, "arenaRoster", []);
    this.tavernModal = m({
      id: "spatial-tavern-modal",
      title: "Tửu Quán Trác Huyện • Ẩm Tửu & Tụ Nghĩa",
      subtitle: "Gặp gỡ anh hùng bốn phương, mở tiệc rượu kết giao và chiêu mộ môn khách",
      seal: "酒",
      size: "lg",
      tabs: [
        { id: "drink", label: "Ẩm Tửu Dưỡng Thần", seal: "🍶" },
        { id: "banquet", label: "Đại Yến Hào Kiệt", seal: "🍲" },
        { id: "brotherhood", label: "Kết Bái Huynh Đệ", seal: "🤝" },
        { id: "recruit", label: "Chiêu Mộ Môn Khách", seal: "🚩" }
      ],
      activeTabId: "drink",
      onOpen: async () => {
        await this.renderTavernTab();
      },
      onTabChange: async () => {
        await this.renderTavernTab();
      }
    }), this.arenaModal = m({
      id: "spatial-arena-modal",
      title: "Lôi Đài Giáo Trường • Luận Kiếm & Diễn Võ",
      subtitle: "Thao trường luận kiếm danh tướng, giao đấu 1v1 đoạt danh vọng và chiến tích",
      seal: "武",
      size: "lg",
      tabs: [
        { id: "spar", label: "Luận Kiếm Danh Tướng", seal: "⚔️" },
        { id: "challenge", label: "Lôi Đài Tam Cấp", seal: "🏆" },
        { id: "duel", label: "Chiến Báo Quyết Đấu", seal: "⚡" }
      ],
      activeTabId: "spar",
      onOpen: async () => {
        await this.renderArenaTab();
      },
      onTabChange: async () => {
        await this.renderArenaTab();
      }
    }), this.residenceModal = m({
      id: "spatial-residence-modal",
      title: "Tư Trạch Vườn Đào • Dưỡng Thần & Gia Đạo",
      subtitle: "Trang viên tư gia, tề gia lập thất, nghỉ ngơi phục hồi sinh lực và bồi dưỡng thế hệ",
      seal: "園",
      size: "lg",
      tabs: [
        { id: "rest", label: "Dưỡng Sinh Nghỉ Ngơi", seal: "🍵" },
        { id: "family", label: "Gia Đạo & Thê Thiếp", seal: "家" },
        { id: "study", label: "Thư Trai Điển Tịch", seal: "📜" }
      ],
      activeTabId: "rest",
      onOpen: async () => {
        await this.renderResidenceTab();
      },
      onTabChange: async () => {
        await this.renderResidenceTab();
      }
    });
  }
  // --- Public Control Methods ---
  async openTavern(t = "drink") {
    await this.tavernModal.open(t);
  }
  async closeTavern() {
    await this.tavernModal.close();
  }
  async openArena(t = "spar") {
    await this.arenaModal.open(t);
  }
  async closeArena() {
    await this.arenaModal.close();
  }
  async openResidence(t = "rest") {
    await this.residenceModal.open(t);
  }
  async closeResidence() {
    await this.residenceModal.close();
  }
  // =========================================================================
  // 1. TAVERN RENDERING
  // =========================================================================
  async renderTavernTab() {
    switch (this.tavernModal.activeTab || "drink") {
      case "drink":
        this.tavernModal.setContent(`
          <div class="spatial-banner-lead">
            <div class="lead-seal">🍶</div>
            <div class="lead-text">
              <h3>Đỗ Khang Mỹ Tửu • Ẩm Tửu Tiêu Sầu</h3>
              <div class="text-muted text-sm">Thưởng thức danh tửu Trác Quận, xua tan mỏi mệt sa trường và tăng cường khí lực.</div>
            </div>
          </div>
          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 text-center">
            <div class="text-3xl mb-2">🍶</div>
            <h4 class="text-amber-200 font-bold mb-2">Bình Đỗ Khang Nồng Ấm</h4>
            <p class="text-xs text-muted mb-4">Chi phí: 50 Tiền / 1 Rượu • Hồi phục +25 Thể lực, +15 Sĩ khí</p>
            <button class="btn btn-action-gold px-6 py-2" onclick="window.SpatialPoiModals.executeDrinkWine()">
              Uống Rượu Dưỡng Thần
            </button>
          </div>
        `);
        break;
      case "banquet":
        this.tavernModal.setContent(`
          <div class="spatial-banner-lead">
            <div class="lead-seal">🍲</div>
            <div class="lead-text">
              <h3>Khai Yến Chiêu Đãi • Tụ Nghĩa Hào Kiệt</h3>
              <div class="text-muted text-sm">Mở tiệc thết đãi chư tướng và hào kiệt trong thành, gia tăng tình cảm và hảo cảm phe phái.</div>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
              <h4 class="text-amber-300 font-bold text-sm mb-1">Tiểu Yến Đàm Đạo</h4>
              <div class="text-xs text-muted mb-3">Yến tiệc nhỏ đàm đạo thế sự cùng 2-3 hảo hữu.</div>
              <div class="text-xs font-mono text-amber-400 mb-3">300 Tiền • 2 Rượu</div>
              <button class="btn btn-xs btn-primary w-full" onclick="window.SpatialPoiModals.hostBanquet('TIER_SMALL')">Mở Tiểu Yến</button>
            </div>
            <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
              <h4 class="text-amber-300 font-bold text-sm mb-1">Trung Yến Khoán Đãi</h4>
              <div class="text-xs text-muted mb-3">Mở tiệc thết đãi chư tướng quan lại địa phương.</div>
              <div class="text-xs font-mono text-amber-400 mb-3">800 Tiền • 5 Rượu</div>
              <button class="btn btn-xs btn-primary w-full" onclick="window.SpatialPoiModals.hostBanquet('TIER_MEDIUM')">Mở Trung Yến</button>
            </div>
            <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
              <h4 class="text-amber-300 font-bold text-sm mb-1">Hào Môn Đại Yến</h4>
              <div class="text-xs text-muted mb-3">Đại yến vang danh thiên hạ, nức tiếng Kinh Hoa.</div>
              <div class="text-xs font-mono text-amber-400 mb-3">2,000 Tiền • 12 Rượu</div>
              <button class="btn btn-xs btn-action-gold w-full" onclick="window.SpatialPoiModals.hostBanquet('TIER_GRAND')">Khai Đại Yến</button>
            </div>
          </div>
        `);
        break;
      case "brotherhood":
        this.tavernModal.setContent(`
          <div class="spatial-banner-lead">
            <div class="lead-seal">🤝</div>
            <div class="lead-text">
              <h3>Đào Viên Tụ Nghĩa • Kết Bái Huynh Đệ</h3>
              <div class="text-muted text-sm">Tuy không sinh cùng ngày cùng tháng, nhưng nguyện đồng sinh cộng tử vì đại nghiệp.</div>
            </div>
          </div>
          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 text-center">
            <p class="text-xs text-slate-300 mb-4">Cần Hảo Cảm đạt mức 100 và cùng vượt qua khảo nghiệm sa trường để kết bái nghĩa huynh đệ.</p>
            <div class="flex justify-center gap-3">
              <button class="btn btn-sm btn-primary" onclick="window.SpatialPoiModals.swearBrotherhood('NPC-0003')">Kết Bái Quan Vũ</button>
              <button class="btn btn-sm btn-primary" onclick="window.SpatialPoiModals.swearBrotherhood('NPC-0004')">Kết Bái Trương Phi</button>
            </div>
          </div>
        `);
        break;
      case "recruit":
        this.tavernModal.setContent(`
          <div class="spatial-banner-lead">
            <div class="lead-seal">🚩</div>
            <div class="lead-text">
              <h3>Bảng Cầu Hiền • Chiêu Mộ Môn Khách</h3>
              <div class="text-muted text-sm">Tuyển mộ võ sư, thương nhân hộ tống và mưu sĩ du phương vào tiêu xa thương đoàn.</div>
            </div>
          </div>
          <div class="text-center py-8 text-muted text-xs">
            Hiện tại các môn khách lưu lạc đang ngụ tại lữ điếm. Hãy nâng cao Danh Vọng để chiêu mộ nhân tài.
          </div>
        `);
        break;
    }
  }
  // =========================================================================
  // 2. ARENA RENDERING
  // =========================================================================
  async renderArenaTab() {
    switch (this.arenaModal.activeTab || "spar") {
      case "spar":
        this.arenaModal.setContent(`
          <div class="spatial-banner-lead">
            <div class="lead-seal">⚔️</div>
            <div class="lead-text">
              <h3>Đài Giáo Trường • Luận Kiếm Cùng Danh Tướng</h3>
              <div class="text-muted text-sm">Thử sức võ nghệ cùng Trương Phi và Quan Vũ, nâng cao chỉ số Võ Lực và kinh nghiệm đối kháng.</div>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800">
              <h4 class="text-amber-300 font-bold mb-1">Trương Phi (Bát Xà Mâu)</h4>
              <div class="text-xs text-muted mb-2">Võ Lực: 98 • Cuồng Lôi Xà Mâu Quyết</div>
              <button class="btn btn-sm btn-action-gold w-full" onclick="window.SpatialPoiModals.startDuel('NPC-0004')">Khiêu Chiến Luận Kiếm</button>
            </div>
            <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800">
              <h4 class="text-amber-300 font-bold mb-1">Quan Vũ (Thanh Long Đao)</h4>
              <div class="text-xs text-muted mb-2">Võ Lực: 97 • Yển Nguyệt Trảm Tam Đao</div>
              <button class="btn btn-sm btn-action-gold w-full" onclick="window.SpatialPoiModals.startDuel('NPC-0003')">Khiêu Chiến Luận Kiếm</button>
            </div>
          </div>
        `);
        break;
      case "challenge":
        this.arenaModal.setContent(`
          <div class="spatial-banner-lead">
            <div class="lead-seal">🏆</div>
            <div class="lead-text">
              <h3>Lôi Đài Tam Cấp • Đấu Võ Đoạt Thưởng</h3>
              <div class="text-muted text-sm">Vượt qua các đấu thủ từ Tân Binh, Tinh Anh đến Đương Thế Đệ Nhất Kiếm.</div>
            </div>
          </div>
          <div class="text-center py-6 text-muted text-xs">
            Đang tải danh sách đấu sĩ lôi đài mùa giải Trác Quận...
          </div>
        `);
        break;
      case "duel":
        this.currentDuelState ? this.renderActiveDuelState() : this.arenaModal.setContent(`
            <div class="text-center py-10 text-muted">
              Hiện chưa có trận quyết đấu nào diễn ra. Hãy vào mục "Luận Kiếm" để khiêu chiến danh tướng.
            </div>
          `);
        break;
    }
  }
  renderActiveDuelState() {
    const t = this.currentDuelState;
    t && this.arenaModal.setContent(`
      <div class="p-3 bg-slate-950/80 rounded border border-amber-900/40 mb-3">
        <div class="flex justify-between items-center mb-2">
          <div class="font-bold text-amber-200">Hiệp Đấu Thứ ${t.round}</div>
          <div class="badge ${t.isConcluded ? "badge-danger" : "badge-primary"}">${t.isConcluded ? "KẾT THÚC" : "ĐANG GIAO ĐẤU"}</div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-3">
          <div class="p-2 bg-slate-900 rounded border border-slate-800">
            <div class="font-bold text-xs text-amber-300">Người Chơi</div>
            <div class="text-xs">HP: ${t.playerHp} | Khí: ${t.playerSpirit} | Sĩ Khí: ${t.playerMorale}</div>
          </div>
          <div class="p-2 bg-slate-900 rounded border border-slate-800">
            <div class="font-bold text-xs text-red-300">Đối Thủ</div>
            <div class="text-xs">HP: ${t.oppHp} | Khí: ${t.oppSpirit} | Sĩ Khí: ${t.oppMorale}</div>
          </div>
        </div>

        ${t.isConcluded ? `
          <div class="text-center font-bold text-amber-400 py-2">Kết quả: ${t.outcome || "Đã phân thắng bại"}</div>
        ` : `
          <div class="flex gap-2 justify-center">
            <button class="btn btn-xs btn-primary flex-1" onclick="window.SpatialPoiModals.executeDuelRound('ATTACK')">Công Kích</button>
            <button class="btn btn-xs btn-action-ghost flex-1" onclick="window.SpatialPoiModals.executeDuelRound('DEFEND')">Phòng Ngự</button>
            <button class="btn btn-xs btn-action-gold flex-1" onclick="window.SpatialPoiModals.executeDuelRound('SPECIAL_STRIKE')">Tuyệt Kỹ</button>
            <button class="btn btn-xs btn-action-ghost flex-1" onclick="window.SpatialPoiModals.executeDuelRound('FOCUS_SPIRIT')">Tụ Khí</button>
          </div>
        `}
      </div>

      <div class="combat-logs p-2 bg-black/60 rounded text-xs font-mono max-h-40 overflow-y-auto">
        ${t.combatLogs.map((e) => `<div class="mb-1">${e}</div>`).join("")}
      </div>
    `);
  }
  // =========================================================================
  // 3. RESIDENCE RENDERING
  // =========================================================================
  async renderResidenceTab() {
    switch (this.residenceModal.activeTab || "rest") {
      case "rest":
        this.residenceModal.setContent(`
          <div class="spatial-banner-lead">
            <div class="lead-seal">🍵</div>
            <div class="lead-text">
              <h3>Tư Gia Điền Viên • Dưỡng Thần Phục Thể</h3>
              <div class="text-muted text-sm">Nghỉ ngơi tại trang viên, hồi phục toàn bộ thể lực và chuẩn bị cho các kế hoạch đại sự.</div>
            </div>
          </div>
          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 text-center">
            <div class="text-3xl mb-2">🏡</div>
            <h4 class="text-amber-200 font-bold mb-2">Tĩnh Dưỡng Nội Viện</h4>
            <p class="text-xs text-muted mb-4">Nghỉ ngơi 1 ngày • Hồi phục 100% Thể lực & Sức bền</p>
            <button class="btn btn-action-gold px-6 py-2" onclick="window.SpatialPoiModals.executeRestAtResidence()">
              Nghỉ Ngơi Dưỡng Thần
            </button>
          </div>
        `);
        break;
      case "family":
        this.residenceModal.setContent(`
          <div class="spatial-banner-lead">
            <div class="lead-seal">家</div>
            <div class="lead-text">
              <h3>Khuê Phòng & Gia Thất</h3>
              <div class="text-muted text-sm">Quản lý phu nhân, cầu hôn giai nhân và chăm sóc hậu duệ gia tộc.</div>
            </div>
          </div>
          <div class="text-center py-6">
            <button class="btn btn-primary px-6 py-2.5 font-bold" onclick="window.SpatialPoiModals.closeResidence(); if(window.LineageFamilyUI) window.LineageFamilyUI.open('courtship');">
              Mở Sổ Bộ Gia Thất & Cầu Hôn [J]
            </button>
          </div>
        `);
        break;
      case "study":
        this.residenceModal.setContent(`
          <div class="spatial-banner-lead">
            <div class="lead-seal">📜</div>
            <div class="lead-text">
              <h3>Thư Trai Điển Tịch • Đọc Sách Dưỡng Khí</h3>
              <div class="text-muted text-sm">Nghiên cứu binh pháp Tôn Tử, điển tịch triều Hán nâng cao Trí Lực và Chính Trị.</div>
            </div>
          </div>
          <div class="text-center py-8 text-muted text-xs">
            Thư phòng yên tĩnh, điển tịch phong phú. Đọc sách giúp tĩnh tâm dưỡng trí.
          </div>
        `);
        break;
    }
  }
  // =========================================================================
  // ACTIONS EXECUTION
  // =========================================================================
  async executeDrinkWine() {
    try {
      const t = await p.drinkWine();
      typeof window.showToast == "function" && window.showToast(t.narrativeVi || "Ẩm tửu tiêu sầu, thể lực sảng khoái!");
    } catch (t) {
      typeof window.showToast == "function" && window.showToast(t.message || "Không thể uống rượu lúc này!", !0);
    }
  }
  async hostBanquet(t) {
    try {
      const e = await p.hostBanquet(t);
      typeof window.showToast == "function" && window.showToast(e.narrativeVi || "Yến tiệc tưng bừng, tân khách hoan hỉ!");
    } catch (e) {
      typeof window.showToast == "function" && window.showToast(e.message || "Không đủ ngân lượng hoặc rượu để khai yến!", !0);
    }
  }
  async swearBrotherhood(t) {
    try {
      const e = await p.swearBrotherhood(t);
      typeof window.showToast == "function" && window.showToast(e.narrativeVi || "Đào Viên kết bái thành công!");
    } catch (e) {
      typeof window.showToast == "function" && window.showToast(e.message || "Chưa đủ điều kiện kết bái huynh đệ!", !0);
    }
  }
  async startDuel(t) {
    try {
      const e = await p.startDuel(t);
      this.currentDuelId = e.duelId, this.currentDuelState = e.state, await this.arenaModal.switchTab("duel");
    } catch (e) {
      typeof window.showToast == "function" && window.showToast(e.message || "Lỗi khởi động lôi đài!", !0);
    }
  }
  async executeDuelRound(t) {
    if (this.currentDuelId)
      try {
        const e = await p.executeDuelRound(this.currentDuelId, t);
        this.currentDuelState = e, this.renderActiveDuelState();
      } catch (e) {
        typeof window.showToast == "function" && window.showToast(e.message || "Lỗi hiệp đấu!", !0);
      }
  }
  async executeRestAtResidence() {
    try {
      const t = await p.restAtResidence(1);
      typeof window.showToast == "function" && window.showToast(t.narrativeVi || "Dưỡng sinh nghỉ ngơi hoàn tất, thể lực tràn trề!");
    } catch (t) {
      typeof window.showToast == "function" && window.showToast(t.message || "Không thể nghỉ ngơi lúc này!", !0);
    }
  }
}
const l = new M();
function L() {
  if (typeof window > "u") return;
  const d = window;
  d.ModalShellCore = {
    createModalShell: m,
    modalStack: T
  }, d.LineageFamilyUI = {
    open: (t) => h.open(t),
    close: () => h.close(),
    setFilter: (t) => h.setFilter(t),
    proposeMarriage: (t) => h.proposeMarriage(t),
    restCohabit: (t) => h.restCohabit(t),
    assignRole: (t, e) => h.assignRole(t, e),
    designateHeir: (t) => h.designateHeir(t),
    assignMentorDialog: (t) => h.assignMentorDialog(t),
    executeSuccession: () => h.executeSuccession()
  }, d.SpatialPoiModals = {
    openTavernModal: (t) => l.openTavern(t),
    closeTavernModal: () => l.closeTavern(),
    openArenaModal: (t) => l.openArena(t),
    closeArenaModal: () => l.closeArena(),
    openResidenceModal: (t) => l.openResidence(t),
    closeResidenceModal: () => l.closeResidence(),
    executeDrinkWine: () => l.executeDrinkWine(),
    hostBanquet: (t) => l.hostBanquet(t),
    swearBrotherhood: (t) => l.swearBrotherhood(t),
    startDuel: (t) => l.startDuel(t),
    executeDuelRound: (t) => l.executeDuelRound(t),
    executeRestAtResidence: () => l.executeRestAtResidence()
  }, console.log("[ThreeKingdoms-AgentEngine] Modern ES Module Client & ModalShell successfully initialized.");
}
class D {
  constructor() {
    s(this, "handlers", /* @__PURE__ */ new Map());
  }
  on(t, e) {
    return this.handlers.has(t) || this.handlers.set(t, /* @__PURE__ */ new Set()), this.handlers.get(t).add(e), () => {
      this.off(t, e);
    };
  }
  off(t, e) {
    const a = this.handlers.get(t);
    a && (a.delete(e), a.size === 0 && this.handlers.delete(t));
  }
  emit(t, e) {
    const a = this.handlers.get(t);
    a && a.forEach((i) => {
      try {
        i(e);
      } catch (n) {
        console.error(`[EventBus] Error handling event ${t}:`, n);
      }
    });
  }
}
const N = new D();
L();
export {
  x as ClientApiClient,
  $ as LineageFamilyModal,
  f as LineageFamilyService,
  S as ModalShell,
  M as SpatialPoiModalsManager,
  y as SpatialPoiService,
  o as apiClient,
  m as createModalShell,
  N as eventBus,
  h as lineageFamilyModal,
  u as lineageFamilyService,
  T as modalStack,
  l as spatialPoiModals,
  p as spatialPoiService
};
//# sourceMappingURL=client-bundle.es.js.map
