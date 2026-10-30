var e = new class {
	stack = [];
	isEscListenerAttached = !1;
	BASE_Z_INDEX = 1e3;
	constructor() {
		this.handleKeyDown = this.handleKeyDown.bind(this);
	}
	push(e, t) {
		let n = this.stack.indexOf(e);
		n > -1 && this.stack.splice(n, 1), this.stack.push(e);
		let r = this.BASE_Z_INDEX + this.stack.length * 10;
		t.style.zIndex = r.toString(), this.ensureEscListener(), this.updateBodyScrollLock();
	}
	remove(e) {
		let t = this.stack.indexOf(e);
		t > -1 && this.stack.splice(t, 1), this.updateBodyScrollLock();
	}
	getTop() {
		return this.stack.length === 0 ? null : this.stack[this.stack.length - 1];
	}
	handleKeyDown(e) {
		if (e.key === "Escape" || e.keyCode === 27) {
			let t = this.getTop();
			t && (e.preventDefault(), e.stopPropagation(), t.close());
		}
	}
	ensureEscListener() {
		typeof window < "u" && (this.isEscListenerAttached ||= (window.addEventListener("keydown", this.handleKeyDown, !0), !0));
	}
	updateBodyScrollLock() {
		typeof document < "u" && (this.stack.length > 0 ? document.body.classList.add("modal-open") : document.body.classList.remove("modal-open"));
	}
}(), t = /* @__PURE__ */ new Set([
	"spatial-tavern-modal",
	"spatial-arena-modal",
	"spatial-residence-modal",
	"grand-command-hub-modal",
	"personal-journal-modal",
	"caravan-modal"
]);
function n(e) {
	return t.has(e);
}
var r = class {
	id;
	options;
	backdropEl = null;
	dialogEl = null;
	titleEl = null;
	subtitleEl = null;
	sealEl = null;
	tabBarEl = null;
	bodyEl = null;
	footerEl = null;
	_isOpen = !1;
	_activeTab = null;
	constructor(e) {
		this.id = e.id, this.options = {
			closeOnEsc: !0,
			closeOnBackdrop: !0,
			size: "lg",
			...e
		}, this._activeTab = e.activeTabId || (e.tabs && e.tabs.length > 0 ? e.tabs[0].id : null), this.mountDom();
	}
	get isOpen() {
		return this._isOpen;
	}
	get activeTab() {
		return this._activeTab;
	}
	mountDom() {
		if (typeof document > "u") return;
		if (n(this.id)) {
			typeof console < "u" && console.warn(`[ModalShell] "${this.id}" is owned by a legacy renderer; shell not mounted.`);
			return;
		}
		let e = document.getElementById(this.id);
		e || (e = document.createElement("div"), e.id = this.id, document.body.appendChild(e)), this.backdropEl = e, this.backdropEl.className = `modal-backdrop hidden ${this.options.customClass || ""}`.trim();
		let t = {
			sm: "modal-sm",
			md: "modal-md",
			lg: "modal-lg spatial-poi-dialog",
			xl: "modal-box--large spatial-poi-dialog",
			full: "modal-full spatial-poi-dialog"
		}[this.options.size || "lg"] || "modal-lg";
		this.backdropEl.innerHTML = `
      <div class="modal-dialog ${t} ${this.options.dialogClass || ""}" role="dialog" aria-modal="true" aria-labelledby="${this.id}-title">
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
		let r = this.backdropEl.querySelector(`#${this.id}-btn-close`);
		r && r.addEventListener("click", (e) => {
			e.preventDefault(), this.close();
		}), this.options.closeOnBackdrop && this.backdropEl.addEventListener("click", (e) => {
			e.target === this.backdropEl && this.close();
		}), this.options.tabs && this.options.tabs.length > 0 && this.renderTabs(this.options.tabs), this.options.actions && this.options.actions.length > 0 && this.setFooter(this.options.actions);
	}
	renderTabs(e) {
		this.tabBarEl && (this.tabBarEl.innerHTML = e.map((e) => `
        <button class="modal-tab-btn ${e.id === this._activeTab ? "active" : ""} ${e.disabled ? "disabled" : ""}" 
                data-tab-id="${e.id}" 
                ${e.disabled ? "disabled" : ""}>
          ${e.seal ? `<span class="tab-seal">${e.seal}</span>` : ""}
          <span class="tab-label">${e.label}</span>
          ${e.badge === void 0 ? "" : `<span class="tab-badge">${e.badge}</span>`}
        </button>
      `).join(""), this.tabBarEl.querySelectorAll(".modal-tab-btn").forEach((e) => {
			e.addEventListener("click", (t) => {
				t.preventDefault();
				let n = e.getAttribute("data-tab-id");
				n && n !== this._activeTab && this.switchTab(n);
			});
		}));
	}
	async open(t) {
		this.backdropEl || this.mountDom(), this.backdropEl && (t && t !== this._activeTab && (this._activeTab = t, this.updateActiveTabButton()), this.backdropEl.classList.remove("hidden"), this._isOpen = !0, e.push(this, this.backdropEl), this.options.onOpen && await this.options.onOpen(this));
	}
	async close() {
		this._isOpen && this.backdropEl && (this.backdropEl.classList.add("hidden"), this._isOpen = !1, e.remove(this), this.options.onClose && await this.options.onClose(this));
	}
	async toggle() {
		this._isOpen ? await this.close() : await this.open();
	}
	setContent(e) {
		this.bodyEl && (typeof e == "string" ? this.bodyEl.innerHTML = e : (this.bodyEl.innerHTML = "", this.bodyEl.appendChild(e)));
	}
	setTitle(e, t, n) {
		this.titleEl && (this.titleEl.textContent = e), t !== void 0 && this.subtitleEl && (this.subtitleEl.textContent = t), n !== void 0 && this.sealEl && (this.sealEl.textContent = n);
	}
	async switchTab(e) {
		this._activeTab = e, this.updateActiveTabButton(), this.options.onTabChange && await this.options.onTabChange(e, this);
	}
	updateActiveTabButton() {
		this.tabBarEl && this.tabBarEl.querySelectorAll(".modal-tab-btn").forEach((e) => {
			let t = e.getAttribute("data-tab-id");
			e.classList.toggle("active", t === this._activeTab);
		});
	}
	updateTabBadge(e, t) {
		if (!this.tabBarEl) return;
		let n = this.tabBarEl.querySelector(`[data-tab-id="${e}"]`);
		if (!n) return;
		let r = n.querySelector(".tab-badge");
		t == null || t === "" ? r && r.remove() : (r || (r = document.createElement("span"), r.className = "tab-badge", n.appendChild(r)), r.textContent = String(t));
	}
	setFooter(e) {
		if (this.footerEl) {
			if (Array.isArray(e)) {
				this.footerEl.innerHTML = "", this.footerEl.className = "modal-footer flex items-center justify-end gap-3";
				for (let t of e) {
					let e = document.createElement("button");
					e.className = `ui-btn ${t.variant === "ghost" ? "ui-btn--ghost" : t.variant === "danger" ? "ui-btn--danger" : t.variant === "gold" ? "ui-btn--accent" : "ui-btn--primary"}`, e.textContent = t.label, t.disabled && (e.disabled = !0), e.addEventListener("click", async (e) => {
						e.preventDefault(), await t.onClick(this);
					}), this.footerEl.appendChild(e);
				}
				this.footerEl.classList.remove("hidden");
			} else typeof e == "string" ? (this.footerEl.innerHTML = e, this.footerEl.classList.remove("hidden")) : (this.footerEl.innerHTML = "", this.footerEl.appendChild(e), this.footerEl.classList.remove("hidden"));
		}
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
};
function i(e) {
	return new r(e);
}
// src/client/core/ui/button.ts
function a(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function o(e = {}) {
	let t = ["ui-btn", `ui-btn--${e.variant || "secondary"}`];
	return e.size === "sm" && t.push("ui-btn--sm"), e.size === "lg" && t.push("ui-btn--lg"), e.className && t.push(e.className), t.join(" ");
}
function s(e) {
	let t = a(e.label), n = e.icon ? `<span class="ui-btn__icon" aria-hidden="true">${a(e.icon)}</span>` : "";
	return `<button ${[
		`class="${a(o(e))}"`,
		e.id ? `id="${a(e.id)}"` : "",
		e.title ? `title="${a(e.title)}"` : "",
		e.disabled ? "disabled" : "",
		`type="${e.type || "button"}"`,
		e.onClick ? `onclick="${a(e.onClick)}"` : ""
	].filter(Boolean).join(" ")}>${n}<span class="ui-btn__label">${t}</span></button>`;
}
function c(e) {
	let t = document.createElement("button");
	return t.className = o(e), t.type = e.type || "button", e.id && (t.id = e.id), e.title && (t.title = e.title), t.disabled = !!e.disabled, t.innerHTML = `${e.icon ? `<span class="ui-btn__icon" aria-hidden="true">${a(e.icon)}</span>` : ""}<span class="ui-btn__label">${a(e.label)}</span>`, t;
}
// src/client/core/ui/badge.ts
function l(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function u(e) {
	let t = [
		"ui-badge",
		`ui-badge--${e.tone || "neutral"}`,
		e.className || ""
	].filter(Boolean).join(" "), n = e.title ? ` title="${l(e.title)}"` : "";
	return `<span class="${l(t)}"${n}>${l(e.label)}</span>`;
}
function d(e) {
	let t = document.createElement("span");
	return t.className = [
		"ui-badge",
		`ui-badge--${e.tone || "neutral"}`,
		e.className || ""
	].filter(Boolean).join(" "), e.title && (t.title = e.title), t.textContent = e.label, t;
}
// src/client/core/ui/feedback.ts
function f(e) {
	return String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function p(e, t = "info") {
	let n = window;
	if (typeof n.showToast == "function") try {
		n.showToast(e, t === "danger");
		return;
	} catch {}
	let r = document.getElementById("toast");
	r ? (r.textContent = e, r.dataset.tone = t, r.classList.remove("hidden"), window.setTimeout(() => r.classList.add("hidden"), 2800)) : console.log(`[toast:${t}] ${e}`);
}
var m = 0;
function h(e) {
	return new Promise((t) => {
		let n = !1, r = (e) => {
			n || (n = !0, t(e));
		}, a = i({
			id: `ui-confirm-${++m}`,
			title: e.title || "Xác nhận",
			seal: "問",
			size: "sm",
			onClose: () => {
				r(!1), window.setTimeout(() => a.destroy(), 0);
			}
		});
		a.setContent(`<div class="ui-confirm">
         <div class="ui-confirm__message">${f(e.message)}</div>
         <div class="ui-toolbar ui-confirm__actions">
           ${s({
			label: e.cancelLabel || "Hủy",
			variant: "ghost",
			size: "sm"
		})}
           ${s({
			label: e.confirmLabel || "Xác nhận",
			variant: e.danger ? "danger" : "primary",
			size: "sm"
		})}
         </div>
       </div>`);
		let o = a.getBodyElement()?.querySelectorAll(".ui-confirm__actions .ui-btn");
		o && o.length === 2 && (o[0].addEventListener("click", () => void a.close()), o[1].addEventListener("click", () => {
			r(!0), a.close();
		})), a.open();
	});
}
// src/client/core/ui/index.ts
var g = {
	version: "1.0.0",
	button: {
		html: s,
		create: c
	},
	badge: {
		html: u,
		create: d
	},
	toast: p,
	confirm: h
}, _ = class e {
	static instance;
	static getInstance() {
		return e.instance ||= new e(), e.instance;
	}
	async get(e, t) {
		let n = e;
		if (t) {
			let e = new URLSearchParams();
			for (let [n, r] of Object.entries(t)) r != null && e.append(n, String(r));
			let r = e.toString();
			r && (n += (n.includes("?") ? "&" : "?") + r);
		}
		let r = await fetch(n);
		if (!r.ok) {
			let e = await r.json().catch(() => ({}));
			throw Error(e.error || `HTTP error ${r.status}: ${r.statusText}`);
		}
		return r.json();
	}
	async post(e, t) {
		let n = await fetch(e, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: t ? JSON.stringify(t) : void 0
		}), r = await n.json().catch(() => ({}));
		if (!n.ok || r && r.success === !1) throw Error(r.error || `HTTP error ${n.status}: ${n.statusText}`);
		return r;
	}
}, v = _.getInstance(), y = class e {
	static instance;
	static getInstance() {
		return e.instance ||= new e(), e.instance;
	}
	async getOverview() {
		let e = await v.get("/api/lineage/status");
		return e.overview || e;
	}
	async getCourtshipCandidates() {
		return (await v.get("/api/lineage/courtship-candidates")).candidates || [];
	}
	async proposeMarriage(e) {
		return v.post("/api/lineage/courtship/propose", { spouseNpcId: e });
	}
	async restAndCohabit(e) {
		return v.post("/api/lineage/household/rest", { marriageId: e });
	}
	async assignHouseholdRole(e, t) {
		return v.post("/api/lineage/household/set-role", {
			marriageId: e,
			role: t
		});
	}
	async assignMentor(e, t) {
		return v.post("/api/lineage/children/assign-mentor", {
			childId: e,
			mentorNpcId: t
		});
	}
	async designateHeir(e) {
		return v.post("/api/lineage/children/designate-heir", { childId: e });
	}
	async executeSuccession(e) {
		return v.post("/api/lineage/succession/execute", { heirChildId: e });
	}
}, b = y.getInstance(), x = class {
	modal;
	overview = null;
	candidates = [];
	selectedStratumFilter = "ALL";
	constructor() {
		this.modal = i({
			id: "standard-lineage-family-modal",
			title: "Gia Thất & Thế Gia Vọng Tộc",
			subtitle: "Cầu hôn giai nhân, bồi dưỡng thế tử kế nghiệp, kiến lập gia tộc ngàn đời",
			seal: "家",
			size: "xl",
			tabs: [
				{
					id: "courtship",
					label: "Cầu Hôn & Thê Thiếp",
					seal: "姻"
				},
				{
					id: "heirs",
					label: "Hậu Duệ & Thụ Giáo",
					seal: "嗣"
				},
				{
					id: "tree",
					label: "Gia Phả Dòng Họ",
					seal: "譜"
				},
				{
					id: "succession",
					label: "Tông Miếu & Thừa Kế",
					seal: "繼"
				}
			],
			activeTabId: "courtship",
			onOpen: async () => {
				await this.refreshData(), await this.renderActiveTab();
			},
			onTabChange: async (e) => {
				await this.renderActiveTab();
			}
		});
	}
	async open(e = "courtship") {
		await this.modal.open(e);
	}
	async close() {
		await this.modal.close();
	}
	async refreshData() {
		try {
			let [e, t] = await Promise.all([b.getOverview().catch(() => null), b.getCourtshipCandidates().catch(() => [])]);
			this.overview = e, this.candidates = t;
			let n = e?.spouses?.length || 0, r = e?.children?.length || 0;
			this.modal.updateTabBadge("courtship", n > 0 ? n : void 0), this.modal.updateTabBadge("heirs", r > 0 ? r : void 0);
		} catch (e) {
			console.error("[LineageFamilyModal] Error refreshing data:", e);
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
			default: this.renderCourtshipTab();
		}
	}
	renderCourtshipTab() {
		let e = this.overview?.spouses || [], t = e.length > 0, n = this.candidates;
		this.selectedStratumFilter !== "ALL" && (n = this.candidates.filter((e) => e.socialStratum === this.selectedStratumFilter));
		let r = `
      <div class="lineage-modal-content">
        <!-- Clan Banner -->
        <div class="spatial-banner-lead">
          <div class="lead-seal">家</div>
          <div class="lead-text">
            <h3>Gia Tộc Thế Hệ Thứ ${this.overview?.generation || 1} • Danh Vọng Gia Tộc: ${this.overview?.clanPrestige || 100}</h3>
            <div class="text-muted text-sm">
              ${t ? `Đã thành gia lập thất với ${e.length} phu nhân. Gia đạo hòa thuận, con cháu hưng vượng.` : "Chưa lập gia thất. Hãy tìm kiếm giai nhân phù hợp từ thường dân hoặc danh môn để kết tóc se duyên."}
            </div>
          </div>
        </div>

        <!-- Current Spouses Section -->
        ${t ? `
          <div class="section-title text-gold font-bold mb-3">Chính Thê & Thê Thiếp Đang Chung Sống:</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            ${e.map((e) => this.renderSpouseCard(e)).join("")}
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
          ${n.length > 0 ? n.map((e) => this.renderCandidateCard(e)).join("") : "<div class=\"text-muted col-span-full py-6 text-center\">Không có giai nhân nào trong danh mục này.</div>"}
        </div>
      </div>
    `;
		this.modal.setContent(r);
	}
	renderSpouseCard(e) {
		let t = [
			{
				id: "HOUSEKEEPER",
				name: "Quản Gia Tề Nội"
			},
			{
				id: "ENTERPRISE_SUPERVISOR",
				name: "Giám Sát Sản Nghiệp"
			},
			{
				id: "STRATEGIC_ADVISOR",
				name: "Mưu Lược Tham Mưu"
			},
			{
				id: "MILITARY_DEFENDER",
				name: "Thống Soái Hộ Vệ"
			}
		], n = Number(e.pregnancy_stage) > 0, r = Number(e.pregnancy_stage) === 1 ? "Thai Nghén Sơ Kỳ (Tháng 1)" : Number(e.pregnancy_stage) === 2 ? "Thai Kỳ Trung Kỳ (Tháng 2)" : Number(e.pregnancy_stage) === 3 ? "Sắp Đến Ngày Lâm Bồn!" : "Bình thường";
		return `
      <div class="tactical-card border-l-4 border-pink-500 p-3 bg-slate-900/80 rounded">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h4 class="text-amber-200 font-bold text-base m-0">${e.wife_name_vi}</h4>
            <div class="text-xs text-muted">Hôn Lễ: Ngày ${e.marriage_date} (Lượt ${e.marriage_turn})</div>
          </div>
          <div class="badge ${n ? "badge-danger animate-pulse" : "badge-neutral"} text-xs">
            ${n ? "育 " + r : "Hảo Cảm: " + e.intimacy}
          </div>
        </div>

        <div class="text-xs text-slate-300 mb-3 bg-slate-950/60 p-2 rounded border border-amber-900/30">
          <div class="font-semibold text-amber-300/90 mb-1">Trọng Trách Nội Trạch:</div>
          <select class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-100" 
                  onchange="window.LineageFamilyUI.assignRole('${e.marriage_id}', this.value)">
            ${t.map((t) => `<option value="${t.id}" ${e.household_role === t.id ? "selected" : ""}>${t.name}</option>`).join("")}
          </select>
          <div class="text-muted mt-1 italic">${e.role_effect_desc_vi || ""}</div>
        </div>

        <div class="flex gap-2">
          <button class="ui-btn ui-btn--primary ui-btn--sm flex-1" onclick="window.LineageFamilyUI.restCohabit('${e.marriage_id}')">
            心 Nghỉ Ngơi & Đồng Tẩm
          </button>
        </div>
      </div>
    `;
	}
	renderCandidateCard(e) {
		let t = {
			PEASANT: {
				label: "Nông Thôn",
				color: "badge-success"
			},
			ARTISAN_SHOP: {
				label: "Thợ Xưởng",
				color: "badge-info"
			},
			GENTRY_CLAN: {
				label: "Sĩ Tộc",
				color: "badge-warning"
			},
			HISTORICAL_HEROINE: {
				label: "Danh Viện",
				color: "badge-danger"
			}
		}[e.socialStratum || "HISTORICAL_HEROINE"] || {
			label: "Danh Viện",
			color: "badge-danger"
		};
		return `
      <div class="tactical-card p-3 bg-slate-900/70 border border-slate-800 rounded flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-start mb-2">
            <h4 class="text-amber-100 font-bold m-0 text-sm">${e.nameVi}</h4>
            <span class="badge ${t.color} text-xs">${t.label}</span>
          </div>

          <div class="text-xs text-muted mb-2 line-clamp-2">${e.clueVi}</div>

          ${e.maternalTrait ? `
            <div class="bg-amber-950/30 border border-amber-900/40 rounded p-1.5 text-xs text-amber-300 mb-2">
              <span class="font-bold">Huyết Mạch:</span> ${e.maternalTrait.traitNameVi}
              <div class="text-muted text-[11px]">${e.maternalTrait.descriptionVi}</div>
            </div>
          ` : ""}

          <div class="text-xs text-slate-300 mb-3 flex items-center justify-between">
            <span>Sính Lễ Yêu Cầu:</span>
            <span class="text-amber-400 font-mono font-bold">${(e.recommendedDowryCash ?? 0).toLocaleString()} Quan</span>
          </div>
        </div>

        <button class="ui-btn ui-btn--accent ui-btn--sm w-full" 
                onclick="window.LineageFamilyUI.proposeMarriage('${e.npcId}')">
          Cầu Hôn Nạp Sính Lễ
        </button>
      </div>
    `;
	}
	renderHeirsTab() {
		let e = this.overview?.children || [], t = `
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

        ${e.length === 0 ? "\n          <div class=\"text-center py-12 text-muted\">\n            <div class=\"text-4xl mb-3\">子</div>\n            <div>Hiện tại gia tộc chưa có hậu duệ sinh hạ. Hãy nghỉ ngơi đồng tẩm cùng phu nhân để thụ thai dưỡng dục.</div>\n          </div>\n        " : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${e.map((e) => this.renderChildCard(e)).join("")}
          </div>
        `}
      </div>
    `;
		this.modal.setContent(t);
	}
	renderChildCard(e) {
		let t = e.is_heir === 1;
		return `
      <div class="tactical-card p-4 bg-slate-900/80 border ${t ? "border-amber-400 shadow-amber-900/20" : "border-slate-800"} rounded">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h4 class="text-amber-200 font-bold text-base m-0">${e.name_vi} ${e.style_name ? `(${e.style_name})` : ""}</h4>
            <div class="text-xs text-muted">${e.gender === "MALE" ? "Nam Tử" : "Nữ Nhi"} • Tuổi: ${e.age} • Mẫu thân: ${e.mother_name_vi || "Nội thất"}</div>
          </div>
          <span class="badge ${t ? "badge-primary" : "badge-neutral"} text-xs">
            ${t ? "王 ĐÍCH TỬ KẾ VỊ" : "Thứ Tử"}
          </span>
        </div>

        <!-- Genetic Stats Radar / Grid -->
        <div class="grid grid-cols-4 gap-1 text-center font-mono text-xs bg-slate-950/70 p-2 rounded mb-3">
          <div><span class="text-muted">VÕ:</span> <span class="text-red-400 font-bold">${e.stats.war}</span></div>
          <div><span class="text-muted">TRÍ:</span> <span class="text-blue-400 font-bold">${e.stats.int}</span></div>
          <div><span class="text-muted">THỐNG:</span> <span class="text-amber-400 font-bold">${e.stats.ldr}</span></div>
          <div><span class="text-muted">CHÍNH:</span> <span class="text-purple-400 font-bold">${e.stats.pol}</span></div>
          <div><span class="text-muted">THƯƠNG:</span> <span class="text-yellow-400 font-bold">${e.stats.com}</span></div>
          <div><span class="text-muted">GIAO:</span> <span class="text-green-400 font-bold">${e.stats.dip}</span></div>
          <div><span class="text-muted">XẢO:</span> <span class="text-cyan-400 font-bold">${e.stats.cra}</span></div>
          <div><span class="text-muted">HẬU:</span> <span class="text-orange-400 font-bold">${e.stats.log}</span></div>
        </div>

        <div class="text-xs text-slate-300 mb-3">
          <span class="font-bold text-amber-300/80">Danh Sư Hướng Dẫn:</span> 
          ${e.assigned_mentor_name_vi || "<span class=\"text-muted\">Chưa bái sư</span>"}
        </div>

        <div class="flex gap-2">
          ${t ? "" : `
            <button class="ui-btn ui-btn--accent ui-btn--sm flex-1" onclick="window.LineageFamilyUI.designateHeir('${e.child_id}')">
              Lập Làm Thế Tử
            </button>
          `}
          <button class="ui-btn ui-btn--ghost ui-btn--sm flex-1" onclick="window.LineageFamilyUI.assignMentorDialog('${e.child_id}')">
            Chỉ Định Danh Sư
          </button>
        </div>
      </div>
    `;
	}
	renderTreeTab() {
		let e = `
      <div class="lineage-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">譜</div>
          <div class="lead-text">
            <h3>Gia Phả Tông Tộc • Thế Hệ ${this.overview?.generation || 1}</h3>
            <div class="text-muted text-sm">Ghi chép công đức tiên tổ và thứ bậc con cháu dòng dõi.</div>
          </div>
        </div>

        <div class="p-6 bg-slate-950/60 rounded border border-amber-900/30 text-center">
          <div class="inline-block p-4 border-2 border-amber-500 rounded bg-slate-900 text-amber-200 font-bold text-lg mb-4">
            Đời Thứ ${this.overview?.generation || 1}: ${this.overview?.clanName || "Lương Gia Tộc"}
          </div>
          <div class="text-xs text-muted mb-6">↓ Các chi phu nhân & thế tử tiếp nối ↓</div>
          
          <div class="flex flex-wrap justify-center gap-4">
            ${(this.overview?.children || []).map((e) => `
              <div class="p-3 bg-slate-900 rounded border border-slate-700 min-w-[140px] text-xs">
                <div class="font-bold text-amber-300">${e.name_vi}</div>
                <div class="text-muted">${e.is_heir === 1 ? "王 Thế Tử" : "Chi tộc"}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;
		this.modal.setContent(e);
	}
	renderSuccessionTab() {
		let e = this.overview?.activeHeir, t = `
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

        ${e ? `
          <div class="tactical-card p-6 bg-slate-900/90 border border-amber-500/50 rounded mb-4">
            <h4 class="text-amber-300 font-bold text-lg mb-2">Thế Tử Kế Thừa: ${e.name_vi} (${e.age} Tuổi)</h4>
            <div class="text-sm text-slate-300 mb-4">
              Khi thực hiện chuyển giao:
              <ul class="list-disc list-inside mt-2 space-y-1 text-slate-400">
                <li>Nhân vật người chơi sẽ chuyển sang điều khiển <strong class="text-amber-200">${e.name_vi}</strong>.</li>
                <li>Thế hệ gia tộc tăng lên <strong>Thế Hệ Thứ ${(this.overview?.generation || 1) + 1}</strong>.</li>
                <li>100% Tiền mặt, Sản nghiệp và Binh khí truyền quốc được bảo lưu toàn vẹn.</li>
              </ul>
            </div>

            <button class="ui-btn ui-btn--accent w-full py-2.5 text-base font-bold" 
                    onclick="window.LineageFamilyUI.executeSuccession()">
              Khởi Sự Kế Thừa Gia Tộc
            </button>
          </div>
        ` : "\n          <div class=\"text-center py-10 text-muted\">\n            Chưa chỉ định Thế tử kế vị. Vui lòng vào mục \"Hậu Duệ\" và chọn một người con trưởng thành làm thế tử.\n          </div>\n        "}
      </div>
    `;
		this.modal.setContent(t);
	}
	setFilter(e) {
		this.selectedStratumFilter = e, this.renderCourtshipTab();
	}
	async proposeMarriage(e) {
		try {
			let t = await b.proposeMarriage(e);
			typeof window.showToast == "function" && window.showToast(t.narrativeVi || "Kết tóc se duyên thành công!"), await this.refreshData(), await this.renderActiveTab();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Cầu hôn thất bại!", !0);
		}
	}
	async restCohabit(e) {
		try {
			let t = await b.restAndCohabit(e);
			typeof window.showToast == "function" && window.showToast(t.narrativeVi || "Đồng tẩm nghỉ ngơi tĩnh dưỡng thành công!"), await this.refreshData(), await this.renderActiveTab();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Không thể nghỉ ngơi lúc này!", !0);
		}
	}
	async assignRole(e, t) {
		try {
			await b.assignHouseholdRole(e, t), typeof window.showToast == "function" && window.showToast("Đã phân công trọng trách nội trạch thành công!"), await this.refreshData();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Lỗi phân công trọng trách!", !0);
		}
	}
	async designateHeir(e) {
		try {
			await b.designateHeir(e), typeof window.showToast == "function" && window.showToast("Đã chỉ định đích tử kế vị gia tộc!"), await this.refreshData(), await this.renderActiveTab();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Không thể lập thế tử!", !0);
		}
	}
	async assignMentorDialog(e) {
		let t = prompt("Nhập ID danh sư thụ giáo (ví dụ: NPC-0003 cho Quan Vũ, NPC-0001 cho Lư Thực):", "NPC-0003");
		if (t) try {
			await b.assignMentor(e, t), typeof window.showToast == "function" && window.showToast("Đã bái kiến danh sư thụ giáo thành công!"), await this.refreshData(), await this.renderActiveTab();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Lỗi chỉ định danh sư!", !0);
		}
	}
	async executeSuccession() {
		if (confirm("Bạn có chắc chắn muốn chuyển giao quyền lực sang Thế tử kế thừa không?")) try {
			let e = this.overview?.activeHeir?.child_id;
			if (!e) throw Error("Chưa chỉ định Thế tử kế vị.");
			let t = await b.executeSuccession(e);
			typeof window.showToast == "function" && window.showToast(t.narrativeVi || "Đại điển kế thừa tông miếu hoàn tất!"), await this.refreshData(), await this.renderActiveTab();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Kế thừa thất bại!", !0);
		}
	}
}, S = new x(), C = class e {
	static instance;
	static getInstance() {
		return e.instance ||= new e(), e.instance;
	}
	async getOverview(e = "PLY-0001") {
		let t = await v.get("/api/equipment", { characterId: e });
		return t.overview || t;
	}
	async equipItem(e, t, n) {
		return v.post("/api/equipment/equip", {
			characterId: e,
			slot: t,
			itemCode: n
		});
	}
	async unequipItem(e, t) {
		return v.post("/api/equipment/unequip", {
			characterId: e,
			slot: t
		});
	}
	async forgeBespokeWeapon(e) {
		return v.post("/api/professions/forge/bespoke", e);
	}
}, w = C.getInstance(), T = class {
	modal;
	currentCharacterId = "PLY-0001";
	overview = null;
	constructor() {
		this.modal = i({
			id: "equipment-forge-modal",
			title: "Vũ Khố & Lò Rèn Thiết Điếm",
			subtitle: "Quản lý 4 ô chiến bị truyền quốc và đúc rèn thần binh độc bản",
			seal: "武",
			size: "xl",
			tabs: [
				{
					id: "gear",
					label: "Binh Khí & Giáp Trụ",
					seal: "武"
				},
				{
					id: "forge_bespoke",
					label: "Đúc Rèn Thần Binh",
					seal: "鍛"
				},
				{
					id: "inventory",
					label: "Kho Binh Khí",
					seal: "貨"
				}
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
	async open(e = "PLY-0001", t = "gear") {
		this.currentCharacterId = e, await this.modal.open(t);
	}
	async close() {
		await this.modal.close();
	}
	async refreshData() {
		try {
			this.overview = await w.getOverview(this.currentCharacterId);
		} catch (e) {
			console.error("[EquipmentForgeModal] Error refreshing data:", e);
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
			case "inventory": this.renderInventoryTab();
		}
	}
	renderGearTab() {
		if (!this.overview) return;
		let e = this.overview.slots, t = this.overview.effectiveStats || {}, n = this.overview.baseStats || {}, r = `
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
          <div>VÕ: <strong class="${(t.war || 0) >= 100 ? "text-amber-400 font-bold" : "text-red-400"}">${t.war || n.war || 50}</strong> <span class="text-muted text-[10px]">(${n.war || 50})</span></div>
          <div>THỐNG: <strong class="${(t.ldr || 0) >= 100 ? "text-amber-400 font-bold" : "text-amber-300"}">${t.ldr || n.ldr || 50}</strong> <span class="text-muted text-[10px]">(${n.ldr || 50})</span></div>
          <div>TRÍ: <strong class="${(t.int || 0) >= 100 ? "text-amber-400 font-bold" : "text-blue-400"}">${t.int || n.int || 50}</strong> <span class="text-muted text-[10px]">(${n.int || 50})</span></div>
          <div>XẢO: <strong class="${(t.cra || 0) >= 100 ? "text-amber-400 font-bold" : "text-cyan-400"}">${t.cra || n.cra || 50}</strong> <span class="text-muted text-[10px]">(${n.cra || 50})</span></div>
        </div>

        <!-- 4 Equipment Slots Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${this.renderSlotCard("WEAPON", "Binh Khí Tấn Công", "武", e.WEAPON)}
          ${this.renderSlotCard("ARMOR", "Khôi Giáp Phòng Hộ", "盾", e.ARMOR)}
          ${this.renderSlotCard("STEED", "Chiến Mã Tọa Kỵ", "馬", e.STEED)}
          ${this.renderSlotCard("TREASURE", "Bảo Vật & Binh Thư", "卷", e.TREASURE)}
        </div>
      </div>
    `;
		this.modal.setContent(r);
	}
	renderSlotCard(e, t, n, r) {
		let i = r && r.itemCode;
		return `
      <div class="tactical-card p-3 bg-slate-900/80 rounded border ${i ? "border-amber-500/50" : "border-slate-800"} flex justify-between items-center">
        <div>
          <div class="text-xs text-muted font-bold flex items-center gap-1">
            <span>${n}</span> ${t}
          </div>
          <div class="font-bold text-sm ${i ? "text-amber-200" : "text-slate-500"} mt-1">
            ${i ? r.nameVi : "Trống (Chưa Trang Bị)"}
          </div>
          ${i && r.statModifierDesc ? `
            <div class="text-[11px] text-green-400 font-mono mt-0.5">${r.statModifierDesc}</div>
          ` : ""}
        </div>
        <div>
          ${i ? `
            <button class="ui-btn ui-btn--ghost ui-btn--sm" onclick="window.EquipmentUI.unequip('${this.currentCharacterId}', '${e}')">Tháo Ra</button>
          ` : "\n            <button class=\"ui-btn ui-btn--primary ui-btn--sm\" onclick=\"window.EquipmentUI.switchTab('inventory')\">Trang Bị</button>\n          "}
        </div>
      </div>
    `;
	}
	renderForgeBespokeTab() {
		let e = this.overview?.baseStats?.cra || 50, t = `
      <div class="equipment-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">鍛</div>
          <div class="lead-text">
            <h3>Đoán Tạo Thần Binh Tùy Biến (Bespoke Forge)</h3>
            <div class="text-muted text-sm">Chế tác thần binh độc bản khắc tên tướng lĩnh, tiêu hao 25 Thể lực và nguyên liệu luyện tinh.</div>
          </div>
        </div>

        ${e >= 50 ? "\n          <div class=\"tactical-card p-4 bg-slate-900 rounded border border-slate-800\">\n            <div class=\"grid grid-cols-1 md:grid-cols-2 gap-3 mb-4\">\n              <div>\n                <label class=\"block text-xs font-bold text-slate-300 mb-1\">Tên Thần Binh Độc Bản:</label>\n                <input type=\"text\" id=\"forge-weapon-name\" class=\"modal-input w-full\" placeholder=\"Thanh Long Uyển Nguyệt Đao\" />\n              </div>\n              <div>\n                <label class=\"block text-xs font-bold text-slate-300 mb-1\">Phân Loại Binh Khí:</label>\n                <select id=\"forge-weapon-cat\" class=\"modal-input w-full\">\n                  <option value=\"BLADE\">Đao / Trực Đao (WAR +1..+5)</option>\n                  <option value=\"SPEAR\">Thương / Xà Mâu (WAR/LDR +1..+5)</option>\n                  <option value=\"HALBERD\">Kích / Phương Thiên (WAR/LDR +1..+5)</option>\n                  <option value=\"SWORD\">Kiếm / Bảo Kiếm (LDR/POL +1..+5)</option>\n                  <option value=\"BOW\">Cung / Cương Nỏ (WAR/CRA +1..+5)</option>\n                </select>\n              </div>\n            </div>\n\n            <div class=\"grid grid-cols-1 md:grid-cols-2 gap-3 mb-4\">\n              <div>\n                <label class=\"block text-xs font-bold text-slate-300 mb-1\">Cấp Phẩm Nguyên Liệu:</label>\n                <select id=\"forge-material-tier\" class=\"modal-input w-full\">\n                  <option value=\"STANDARD\">Nguyên Liệu Tiêu Chuẩn (Sắt Thỏi + Than)</option>\n                  <option value=\"FINE\">Bách Luyện Tinh Cương (Thép Tinh Luyện + Da Thú)</option>\n                  <option value=\"LEGENDARY\">Huyền Thiết Thiên Thạch (Huyền Thiết + Thiên Thạch)</option>\n                </select>\n              </div>\n              <div>\n                <label class=\"block text-xs font-bold text-slate-300 mb-1\">Nơi Tiếp Nhận Sau Đúc:</label>\n                <select id=\"forge-destination\" class=\"modal-input w-full\">\n                  <option value=\"EQUIP\">Tự Động Trang Bị Luôn</option>\n                  <option value=\"WAREHOUSE\">Chuyển Vào Kho Huyện Trác</option>\n                  <option value=\"GIFT\">Tặng Cho Quan Vũ / Trương Phi</option>\n                </select>\n              </div>\n            </div>\n\n            <button class=\"ui-btn ui-btn--accent w-full py-2.5 font-bold\" onclick=\"window.EquipmentUI.executeForge()\">\n              Khai Lò Đúc Thần Binh\n            </button>\n          </div>\n        " : `
          <div class="text-center py-8 text-muted">
            Cần chỉ số Kỹ Nghệ (CRA) đạt tối thiểu 50 để mở lò rèn thần binh. Hiện tại CRA của bạn: ${e}.
          </div>
        `}
      </div>
    `;
		this.modal.setContent(t);
	}
	renderInventoryTab() {
		let e = this.overview?.inventoryGear || [], t = `
      <div class="equipment-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">貨</div>
          <div class="lead-text">
            <h3>Kho Khí Giới Trác Huyện</h3>
            <div class="text-muted text-sm">Kho vũ khí, giáp trụ và chiến mã sẵn sàng trang bị cho nhân vật.</div>
          </div>
        </div>

        ${e.length === 0 ? "\n          <div class=\"text-center py-8 text-muted\">\n            Kho vũ khí hiện không có trang bị nào. Hãy mua từ chợ phiên hoặc chế tác tại Lò Rèn.\n          </div>\n        " : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${e.map((e) => `
              <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                <div>
                  <div class="font-bold text-amber-200 text-sm">${e.nameVi}</div>
                  <div class="text-xs text-muted">Vị trí: ${e.slot} • SL: ${e.quantity}</div>
                </div>
                <button class="ui-btn ui-btn--primary ui-btn--sm" onclick="window.EquipmentUI.equip('${this.currentCharacterId}', '${e.slot}', '${e.itemCode}')">
                  Mặc Vào
                </button>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    `;
		this.modal.setContent(t);
	}
	async equip(e, t, n) {
		try {
			await w.equipItem(e, t, n), typeof window.showToast == "function" && window.showToast("Đã trang bị thành công!"), await this.refreshData(), await this.renderActiveTab();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Lỗi trang bị!", !0);
		}
	}
	async unequip(e, t) {
		try {
			await w.unequipItem(e, t), typeof window.showToast == "function" && window.showToast("Đã tháo trang bị về kho!"), await this.refreshData(), await this.renderActiveTab();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Lỗi tháo trang bị!", !0);
		}
	}
	async executeForge() {
		let e = document.getElementById("forge-weapon-name"), t = document.getElementById("forge-weapon-cat"), n = document.getElementById("forge-material-tier"), r = document.getElementById("forge-destination"), i = {
			characterId: this.currentCharacterId,
			weaponNameVi: e?.value || "Thần Binh Trác Huyện",
			weaponCategory: t?.value || "BLADE",
			targetAttr: "war",
			materialTier: n?.value || "STANDARD",
			destination: r?.value || "EQUIP"
		};
		try {
			let e = await w.forgeBespokeWeapon(i);
			typeof window.showToast == "function" && window.showToast(e.narrativeVi || "Đúc rèn thần binh thành công!"), await this.refreshData(), await this.modal.switchTab("gear");
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Đúc rèn thất bại!", !0);
		}
	}
}, E = new T(), D = class e {
	static instance;
	static getInstance() {
		return e.instance ||= new e(), e.instance;
	}
	async getStatus(e = "PLY-0001") {
		let t = await v.get("/api/enterprise/status", { characterId: e });
		return t.status || t;
	}
	async manageSafeCash(e, t, n) {
		return v.post("/api/enterprise/manage-safe-cash", {
			enterpriseId: e,
			action: t,
			amount: n
		});
	}
	async executeLaborShift(e, t) {
		return v.post("/api/enterprise/work", { shiftId: e });
	}
}, O = D.getInstance(), k = class {
	modal;
	enterprises = [];
	laborOptions = [];
	constructor() {
		this.modal = i({
			id: "enterprise-modal",
			title: "Sản Nghiệp & Phường Xưởng Bách Nghệ",
			subtitle: "Quản lý xưởng dệt, xưởng rèn, đi làm thuê công nhật tích lũy ngân lượng",
			seal: "業",
			size: "xl",
			tabs: [{
				id: "owner",
				label: "Sản Nghiệp Gia Tộc",
				seal: "坊"
			}, {
				id: "work",
				label: "Đi Làm Thuê Thời Vụ",
				seal: "工"
			}],
			activeTabId: "owner",
			onOpen: async () => {
				await this.refreshData(), await this.renderActiveTab();
			},
			onTabChange: async () => {
				await this.renderActiveTab();
			}
		});
	}
	async open(e = "owner") {
		await this.modal.open(e);
	}
	async close() {
		await this.modal.close();
	}
	async refreshData() {
		try {
			let e = await O.getStatus("PLY-0001");
			this.enterprises = e?.ownedBusinesses || e?.activeEnterprises || [], this.laborOptions = e?.laborOptions || [];
		} catch (e) {
			console.error("[EnterpriseWorkshopModal] Error refreshing data:", e);
		}
	}
	async renderActiveTab() {
		(this.modal.activeTab || "owner") === "owner" ? this.renderOwnerTab() : this.renderWorkTab();
	}
	renderOwnerTab() {
		let e = `
      <div class="enterprise-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">業</div>
          <div class="lead-text">
            <h3>Sản Nghiệp Sở Hữu (${this.enterprises.length} Cơ Sở)</h3>
            <div class="text-muted text-sm">Các xưởng chế tác tự động vận hành chu kỳ sản xuất hàng tháng và tích lũy doanh thu vào Quỹ an toàn.</div>
          </div>
        </div>

        ${this.enterprises.length === 0 ? "\n          <div class=\"text-center py-10 text-muted\">\n            Hiện tại bạn chưa sở hữu sản nghiệp nào. Hãy tích lũy tiền tệ hoặc làm thuê để mua lại xưởng mộc, xưởng rèn tại Trác Huyện.\n          </div>\n        " : `
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
		this.modal.setContent(e);
	}
	renderWorkTab() {
		this.modal.setContent("\n      <div class=\"enterprise-modal-content\">\n        <div class=\"spatial-banner-lead\">\n          <div class=\"lead-seal\">工</div>\n          <div class=\"lead-text\">\n            <h3>Lao Động Làm Thuê Thời Vụ</h3>\n            <div class=\"text-muted text-sm\">Đi làm thuê tại các xưởng nghề, đồn điền nông nghiệp để kiếm tiền trang trải và rèn luyện kỹ năng.</div>\n          </div>\n        </div>\n\n        <div class=\"grid grid-cols-1 md:grid-cols-3 gap-3\">\n          <div class=\"tactical-card p-3 bg-slate-900 rounded border border-slate-800 text-center\">\n            <h4 class=\"text-amber-300 font-bold text-sm mb-1\">Đốn Củi & Tiêu Xa</h4>\n            <div class=\"text-xs text-muted mb-2\">Tiêu hao 15 Thể lực • Kiếm 40 Quan • Tăng EXP Võ/Thống</div>\n            <button class=\"ui-btn ui-btn--primary ui-btn--sm w-full\" onclick=\"window.EnterpriseUI.executeWork('WOODCUT')\">Nhận Việc</button>\n          </div>\n          <div class=\"tactical-card p-3 bg-slate-900 rounded border border-slate-800 text-center\">\n            <h4 class=\"text-amber-300 font-bold text-sm mb-1\">Đan Lát Chiếu Trúc</h4>\n            <div class=\"text-xs text-muted mb-2\">Tiêu hao 12 Thể lực • Kiếm 50 Quan • Tăng EXP Kỹ Nghệ</div>\n            <button class=\"ui-btn ui-btn--primary ui-btn--sm w-full\" onclick=\"window.EnterpriseUI.executeWork('WEAVE_MAT')\">Nhận Việc</button>\n          </div>\n          <div class=\"tactical-card p-3 bg-slate-900 rounded border border-slate-800 text-center\">\n            <h4 class=\"text-amber-300 font-bold text-sm mb-1\">Phụ Lò Rèn Thiết Điếm</h4>\n            <div class=\"text-xs text-muted mb-2\">Tiêu hao 20 Thể lực • Kiếm 65 Quan • Tăng EXP Kỹ Nghệ/Võ</div>\n            <button class=\"ui-btn ui-btn--accent ui-btn--sm w-full\" onclick=\"window.EnterpriseUI.executeWork('SMITH_ASSIST')\">Nhận Việc</button>\n          </div>\n        </div>\n      </div>\n    ");
	}
	async depositSafeCash(e) {
		let t = prompt("Nhập số tiền muốn nạp vào quỹ an toàn:", "500");
		if (!t) return;
		let n = parseInt(t, 10);
		if (!(isNaN(n) || n <= 0)) try {
			await O.manageSafeCash(e, "DEPOSIT", n), typeof window.showToast == "function" && window.showToast("Đã nạp tiền vào Quỹ an toàn!"), await this.refreshData(), await this.renderActiveTab();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Lỗi nạp tiền!", !0);
		}
	}
	async withdrawSafeCash(e) {
		let t = prompt("Nhập số tiền muốn rút từ quỹ an toàn:", "500");
		if (!t) return;
		let n = parseInt(t, 10);
		if (!(isNaN(n) || n <= 0)) try {
			await O.manageSafeCash(e, "WITHDRAW", n), typeof window.showToast == "function" && window.showToast("Đã rút tiền từ Quỹ an toàn về ngân khố!"), await this.refreshData(), await this.renderActiveTab();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Lỗi rút tiền!", !0);
		}
	}
	async executeWork(e) {
		try {
			let t = await O.executeLaborShift(e);
			typeof window.showToast == "function" && window.showToast(t.narrativeVi || "Lao động hoàn tất, nhận tiền công!"), await this.refreshData(), await this.renderActiveTab();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Không thể làm việc lúc này!", !0);
		}
	}
}, A = new k(), j = class e {
	static instance;
	static getInstance() {
		return e.instance ||= new e(), e.instance;
	}
	async getProtagonistDossier() {
		let e = await v.get("/api/status"), t = e.player || {};
		return {
			characterId: t.character_id || "PLY-0001",
			nameVi: t.name_vi || "Lương Diễn",
			nameEn: t.name_en || "Liang Yan",
			styleName: t.style_name || "Chí Viễn",
			age: t.age || 20,
			locationVi: e.settlement?.nameVi || "Trác Huyện",
			positionVi: t.position_vi || "Thương Gia Tự Do",
			personality: "PRAGMATIC",
			motivation: "HEGEMONY",
			bioVi: "Hậu nhân Lương thị U Châu, thông tuệ thương đạo, ôm chí lớn bình định loạn thế Tam Quốc.",
			stats: {
				war: t.war_attr || 50,
				int: t.int_attr || 50,
				ldr: t.ldr_attr || 50,
				pol: t.pol_attr || 50,
				com: t.com_attr || 60,
				dip: t.dip_attr || 50,
				cra: t.cra_attr || 55,
				log: t.log_attr || 50
			},
			talents: t.talents ? typeof t.talents == "string" ? JSON.parse(t.talents) : t.talents : ["THƯƠNG_TRÍ", "KỸ_XẢO"]
		};
	}
	async getNpcDossier(e) {
		let t = await v.get("/api/npcs/dossier", { npcId: e });
		return t.dossier || t;
	}
}, M = j.getInstance(), N = class {
	protagonistModal;
	npcModal;
	currentProtagonist = null;
	currentNpc = null;
	constructor() {
		this.protagonistModal = i({
			id: "protagonist-dossier-modal",
			title: "Hồ Sơ Nhân Vật Chính • Lương Diễn (Chí Viễn)",
			subtitle: "Toàn bộ chỉ số năng lực 8 chiều, danh hiệu và thiên phú bản mệnh",
			seal: "主",
			size: "lg",
			onOpen: async () => {
				await this.loadProtagonist();
			}
		}), this.npcModal = i({
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
	async openNpc(e) {
		try {
			this.currentNpc = await M.getNpcDossier(e), this.npcModal.setTitle(`Hồ Sơ Nhân Vật • ${this.currentNpc.nameVi}`, `Địa điểm: ${this.currentNpc.locationVi || "U Châu"} • Thân phận: ${this.currentNpc.positionVi || "Võ Tướng"}`), this.renderNpcContent(), await this.npcModal.open();
		} catch (e) {
			console.error("[DossiersModal] Error loading NPC:", e);
		}
	}
	async closeNpc() {
		await this.npcModal.close();
	}
	async loadProtagonist() {
		try {
			this.currentProtagonist = await M.getProtagonistDossier(), this.renderProtagonistContent();
		} catch (e) {
			console.error("[DossiersModal] Error loading protagonist:", e);
		}
	}
	renderProtagonistContent() {
		let e = this.currentProtagonist;
		if (!e) return;
		let t = e.stats, n = `
      <div class="dossier-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">主</div>
          <div class="lead-text">
            <h3>${e.nameVi} (${e.styleName || "Chí Viễn"}) • Tuổi: ${e.age}</h3>
            <div class="text-muted text-sm">${e.positionVi} • Cư ngụ tại ${e.locationVi}</div>
          </div>
        </div>

        <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 mb-3">
          <h4 class="text-amber-300 font-bold text-xs uppercase mb-2">Bát Diện Năng Lực (Thuộc Tính Bản Thể):</h4>
          <div class="grid grid-cols-4 gap-2 font-mono text-xs text-center bg-slate-950 p-3 rounded">
            <div>VÕ LỰC: <strong class="text-red-400 font-bold">${t.war}</strong></div>
            <div>MƯU TRÍ: <strong class="text-blue-400 font-bold">${t.int}</strong></div>
            <div>THỐNG SOÁI: <strong class="text-amber-400 font-bold">${t.ldr}</strong></div>
            <div>CHÍNH TRỊ: <strong class="text-purple-400 font-bold">${t.pol}</strong></div>
            <div>THƯƠNG NGHIỆP: <strong class="text-yellow-400 font-bold">${t.com}</strong></div>
            <div>NGOẠI GIAO: <strong class="text-green-400 font-bold">${t.dip}</strong></div>
            <div>KỸ NGHỆ: <strong class="text-cyan-400 font-bold">${t.cra}</strong></div>
            <div>HẬU CẦN: <strong class="text-orange-400 font-bold">${t.log}</strong></div>
          </div>
        </div>

        <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800">
          <h4 class="text-amber-300 font-bold text-xs uppercase mb-1">Tiểu Sử & Chí Hướng:</h4>
          <p class="text-xs text-slate-300 leading-relaxed">${e.bioVi}</p>
        </div>
      </div>
    `;
		this.protagonistModal.setContent(n);
	}
	renderNpcContent() {
		let e = this.currentNpc;
		if (!e) return;
		let t = e.stats || {
			war: 50,
			int: 50,
			ldr: 50,
			pol: 50,
			com: 50,
			dip: 50,
			cra: 50,
			log: 50
		}, n = `
      <div class="dossier-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">将</div>
          <div class="lead-text">
            <h3>${e.nameVi} • Tính Cách: ${e.personality}</h3>
            <div class="text-muted text-sm">Động cơ: ${e.motivation} • Thân phận: ${e.positionVi}</div>
          </div>
        </div>

        <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 mb-3">
          <h4 class="text-amber-300 font-bold text-xs uppercase mb-2">Chỉ Số Năng Lực Nổi Trội:</h4>
          <div class="grid grid-cols-4 gap-2 font-mono text-xs text-center bg-slate-950 p-3 rounded">
            <div>VÕ: <strong class="text-red-400 font-bold">${t.war}</strong></div>
            <div>TRÍ: <strong class="text-blue-400 font-bold">${t.int}</strong></div>
            <div>SOÁI: <strong class="text-amber-400 font-bold">${t.ldr}</strong></div>
            <div>CHÍNH: <strong class="text-purple-400 font-bold">${t.pol}</strong></div>
          </div>
        </div>

        <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800">
          <h4 class="text-amber-300 font-bold text-xs uppercase mb-1">Hành Trạng Lịch Sử:</h4>
          <p class="text-xs text-slate-300 leading-relaxed">${e.bioVi || "Nhân tài hào kiệt uy chấn phương bắc."}</p>
        </div>
      </div>
    `;
		this.npcModal.setContent(n);
	}
}, P = new N(), F = class {
	modal;
	currentMode = "BUY";
	currentItemCode = "COM-GRAIN";
	currentPrice = 50;
	constructor() {
		this.modal = i({
			id: "standard-trade-modal",
			title: "Giao Dịch Hàng Hóa Chợ Phiên",
			subtitle: "Thực thi giao thương hàng hóa, cân bằng sổ cái kép kế toán ACID",
			seal: "貿",
			size: "sm"
		});
	}
	async open(e, t, n = 1, r = 50) {
		this.currentMode = e, this.currentItemCode = t, this.currentPrice = r, this.modal.setTitle(e === "BUY" ? "Thu Mua Vật Phẩm" : "Xuất Bán Hàng Hóa", `Mã vật phẩm: ${t} • Đơn giá hiện tại: ${r} Quan`, e === "BUY" ? "買" : "賣"), this.renderForm(n), await this.modal.open();
	}
	async close() {
		await this.modal.close();
	}
	renderForm(e) {
		let t = `
      <div class="space-y-3 p-1">
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Mã Vật Phẩm:</label>
          <input type="text" class="modal-input w-full" value="${this.currentItemCode}" readonly />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Số Lượng Giao Dịch:</label>
          <input type="number" id="quick-trade-qty" class="modal-input w-full" min="1" value="${e}" oninput="window.QuickTradeModal.updateTotal()" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-1">Đơn Giá Đơn Vị (Quan):</label>
          <input type="number" id="quick-trade-price" class="modal-input w-full" value="${this.currentPrice}" readonly />
        </div>
        <div class="bg-slate-950 p-2.5 rounded flex justify-between items-center text-xs font-mono">
          <span class="text-muted">Tổng Giá Trị:</span>
          <span class="text-amber-400 font-bold text-sm" id="quick-trade-total">${(e * this.currentPrice).toLocaleString()} Quan</span>
        </div>
        <button class="ui-btn ui-btn--accent w-full py-2 font-bold mt-2" onclick="window.QuickTradeModal.submit()">
          Xác Nhận ${this.currentMode === "BUY" ? "Thu Mua" : "Bán Hàng"}
        </button>
      </div>
    `;
		this.modal.setContent(t);
	}
	updateTotal() {
		let e = document.getElementById("quick-trade-qty"), t = document.getElementById("quick-trade-total");
		e && t && (t.textContent = `${((parseFloat(e.value) || 0) * this.currentPrice).toLocaleString()} Quan`);
	}
	async submit() {
		let e = document.getElementById("quick-trade-qty"), t = parseFloat(e?.value || "1");
		if (isNaN(t) || t <= 0) return;
		let n = {
			type: this.currentMode === "BUY" ? "TRADE_BUY" : "TRADE_SELL",
			item_code: this.currentItemCode,
			quantity: t,
			unit_price: this.currentPrice,
			counterparty: "Thương Khách Chợ Phiên",
			idempotency_key: `TSQUICK_${this.currentMode}_${this.currentItemCode}_${Date.now()}`
		};
		try {
			let e = window.dispatchDirectAction, t = e ? await e(n) : await v.post("/api/action", n);
			if (t && t.success === !1) {
				typeof window.showToast == "function" && window.showToast(`Bị từ chối: ${t.error || "Giao dịch thất bại"}`, !0);
				return;
			}
			await this.modal.close(), typeof window.loadStatus == "function" && await window.loadStatus(), typeof window.loadDeckInventory == "function" && await window.loadDeckInventory();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Giao dịch thất bại!", !0);
		}
	}
}, I = new F(), L = class e {
	static instance;
	static getInstance() {
		return e.instance ||= new e(), e.instance;
	}
	async getBanquetStatus() {
		return v.get("/api/banquet/status");
	}
	async drinkWine() {
		return v.post("/api/banquet/drink", {});
	}
	async hostBanquet(e) {
		return v.post("/api/banquet/host", { tierId: e });
	}
	async swearBrotherhood(e) {
		return v.post("/api/banquet/brotherhood", { targetNpcId: e });
	}
	async getArenaRoster() {
		return v.get("/api/arena/roster");
	}
	async startDuel(e) {
		return v.post("/api/arena/duel/start", { opponentId: e });
	}
	async executeDuelRound(e, t) {
		return v.post("/api/arena/duel/round", {
			duelId: e,
			action: t
		});
	}
	async restAtResidence(e = 1) {
		return v.post("/api/character/rest", { days: e });
	}
}.getInstance(), R = class {
	modal;
	currentDuelId = null;
	duelState = null;
	constructor() {
		this.modal = i({
			id: "tactical-battle-modal",
			title: "Quyết Đấu Sa Trường • Đơn Đả Độc Đấu 1v1",
			subtitle: "Tương tác chiến thuật 4 lệnh (Công Kích, Phòng Ngự, Tuyệt Kỹ, Tụ Khí)",
			seal: "斗",
			size: "lg"
		});
	}
	async startDuel(e) {
		try {
			let t = await L.startDuel(e);
			this.currentDuelId = t.duelId, this.duelState = t.state, this.renderDuel(), await this.modal.open();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Lỗi khởi động giao đấu!", !0);
		}
	}
	async close() {
		await this.modal.close();
	}
	renderDuel() {
		let e = this.duelState;
		if (!e) return;
		let t = `
      <div class="tactical-battle-content">
        <div class="p-3 bg-slate-950/80 rounded border border-amber-900/40 mb-3">
          <div class="flex justify-between items-center mb-3">
            <span class="font-bold text-amber-200">Hiệp Đấu Thứ ${e.round}</span>
            <span class="badge ${e.isConcluded ? "badge-danger" : "badge-primary"}">${e.isConcluded ? "TRẬN ĐẤU KẾT THÚC" : "ĐANG ĐỐI ĐẦU"}</span>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-3">
            <div class="p-3 bg-slate-900 rounded border border-slate-800">
              <div class="text-xs font-bold text-amber-300 mb-1">Người Chơi</div>
              <div class="text-xs space-y-0.5 font-mono">
                <div>Sinh Lực: <strong class="text-green-400">${e.playerHp}</strong></div>
                <div>Khí Lực: <strong class="text-blue-400">${e.playerSpirit}</strong></div>
                <div>Sĩ Khí: <strong class="text-amber-400">${e.playerMorale}</strong></div>
              </div>
            </div>
            <div class="p-3 bg-slate-900 rounded border border-slate-800">
              <div class="text-xs font-bold text-red-300 mb-1">Đối Thủ</div>
              <div class="text-xs space-y-0.5 font-mono">
                <div>Sinh Lực: <strong class="text-red-400">${e.oppHp}</strong></div>
                <div>Khí Lực: <strong class="text-blue-400">${e.oppSpirit}</strong></div>
                <div>Sĩ Khí: <strong class="text-amber-400">${e.oppMorale}</strong></div>
              </div>
            </div>
          </div>

          ${e.isConcluded ? `
            <div class="text-center font-bold text-amber-300 py-2">
              ${e.outcome || "Quyết đấu hoàn tất!"}
            </div>
          ` : "\n            <div class=\"grid grid-cols-4 gap-2\">\n              <button class=\"ui-btn ui-btn--primary ui-btn--sm\" onclick=\"window.TacticalBattleUI.executeAction('ATTACK')\">Công Kích</button>\n              <button class=\"ui-btn ui-btn--ghost ui-btn--sm\" onclick=\"window.TacticalBattleUI.executeAction('DEFEND')\">Phòng Ngự</button>\n              <button class=\"ui-btn ui-btn--accent ui-btn--sm\" onclick=\"window.TacticalBattleUI.executeAction('SPECIAL_STRIKE')\">Tuyệt Kỹ</button>\n              <button class=\"ui-btn ui-btn--ghost ui-btn--sm\" onclick=\"window.TacticalBattleUI.executeAction('FOCUS_SPIRIT')\">Tụ Khí</button>\n            </div>\n          "}
        </div>

        <div class="bg-black/60 p-3 rounded text-xs font-mono max-h-48 overflow-y-auto space-y-1">
          ${e.combatLogs.map((e) => `<div>${e}</div>`).join("")}
        </div>
      </div>
    `;
		this.modal.setContent(t);
	}
	async executeAction(e) {
		if (this.currentDuelId) try {
			this.duelState = await L.executeDuelRound(this.currentDuelId, e), this.renderDuel();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Lỗi hiệp đấu!", !0);
		}
	}
}, z = new R(), B = class {
	travelModal;
	turnModal;
	constructor() {
		this.travelModal = i({
			id: "travel-transit-modal",
			title: "Lộ Trình Viễn Chinh • Dặm Trường Phong Vân",
			subtitle: "Hành quân liên châu, khảo sát địa hình và ứng biến trước hiểm họa dọc đường",
			seal: "行",
			size: "md"
		}), this.turnModal = i({
			id: "turn-advance-modal",
			title: "Quyết Toán Tháng • Luân Chuyển Chiến Cục",
			subtitle: "Kết thúc tháng hiện tại, kết toán tài chính, sản nghiệp và mô phỏng thế giới sống động",
			seal: "歲",
			size: "md"
		});
	}
	async showTravelTransit(e, t, n, r) {
		this.travelModal.setTitle("Hành Trình Viễn Chinh", `Từ ${e} → Đến ${t} (${n} ngày đường)`), this.travelModal.setContent(`
      <div class="travel-transit-body p-2 space-y-3">
        <div class="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono">
          ${r || "<div>Xe ngựa lăn bánh trên quan đạo phương bắc... An toàn đến nơi!</div>"}
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
	async showTurnAdvance(e, t, n) {
		this.turnModal.setTitle(`Quyết Toán Lượt Thứ ${e}`, `Thời gian: ${t} • Thiên thời địa lợi`), this.turnModal.setContent(`
      <div class="turn-advance-body p-2 space-y-3">
        <div class="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono space-y-1">
          ${n || "\n            <div class=\"text-green-400\">◆ Hoàn tất chu kỳ sản xuất hàng tháng của các xưởng.</div>\n            <div class=\"text-amber-300\">◆ Kết toán sổ cái kép thu chi tài chính.</div>\n            <div class=\"text-blue-300\">◆ Cập nhật tiến độ thai kỳ và bồi dưỡng thế hệ gia tộc.</div>\n          "}
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
}, V = new B(), H = class {
	modal;
	constructor() {
		this.modal = i({
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
		let e = window.refreshWorldMapView;
		typeof e == "function" ? e() : typeof window.renderWorldMapSvg == "function" && window.renderWorldMapSvg();
	}
	async close() {
		await this.modal.close();
	}
}, U = new H(), W = {
	wu_wei: "xi_liang",
	he_fei: "shou_chun",
	pu_yang: "ye_cheng",
	wu_ling: "jiang_ling"
}, G = new class {
	ALIASES = W;
	state = {
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
	};
	resolveMapNodeId(e) {
		return W[e] || e;
	}
	mergeRecord(e, t) {
		return Object.assign({}, e || {}, t || {});
	}
	async readJson(e) {
		let t = await fetch(e, { headers: { Accept: "application/json" } });
		if (!t.ok) throw Error(`${e} returned ${t.status}`);
		return t.json();
	}
	async load(e = !1) {
		if (!e && this.state.status === "ready" && Date.now() - this.state.fetchedAt < 1e4) return this.state;
		this.state.status = "loading", this.state.errors = [];
		let [t, n, r, i, a, o, s, c, l, u, d, f, p, m, h, g, _] = await Promise.allSettled([
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
		]), v = t.status === "fulfilled" && t.value.success && t.value.garrisons || [], y = n.status === "fulfilled" && n.value.success && n.value.settlements || [], b = r.status === "fulfilled" && r.value.success && r.value.factions || [], x = i.status === "fulfilled" && i.value.success ? i.value : null, S = a.status === "fulfilled" && a.value.success && a.value.strongholds || [], C = o.status === "fulfilled" && o.value.success && o.value.crises || [], w = s.status === "fulfilled" && s.value.success && s.value.npcs || [], T = c.status === "fulfilled" && c.value.success ? c.value : null, E = l.status === "fulfilled" && l.value.success && l.value.items || [], D = u.status === "fulfilled" && u.value.success && u.value.specialists || [], O = d.status === "fulfilled" && d.value.success && d.value.businesses || [], k = f.status === "fulfilled" && f.value.success && f.value.tiers || [], A = p.status === "fulfilled" && p.value.success && p.value.routes || [], j = m.status === "fulfilled" && m.value.success && m.value.locations || [], M = h.status === "fulfilled" && h.value.success && h.value.caravans || [], N = g.status === "fulfilled" && g.value.success && g.value.expeditions || [], P = _.status === "fulfilled" && _.value.success && _.value.nodes || [];
		t.status === "rejected" && this.state.errors.push("garrisons"), n.status === "rejected" && this.state.errors.push("factions/settlements"), r.status === "rejected" && this.state.errors.push("factions"), i.status === "rejected" && this.state.errors.push("military"), a.status === "rejected" && this.state.errors.push("strongholds"), o.status === "rejected" && this.state.errors.push("crises"), s.status === "rejected" && this.state.errors.push("npcs"), c.status === "rejected" && this.state.errors.push("status"), l.status === "rejected" && this.state.errors.push("inventory"), u.status === "rejected" && this.state.errors.push("workforce"), d.status === "rejected" && this.state.errors.push("businesses"), f.status === "rejected" && this.state.errors.push("guard-tiers"), p.status === "rejected" && this.state.errors.push("routes"), m.status === "rejected" && this.state.errors.push("locations"), h.status === "rejected" && this.state.errors.push("caravans"), g.status === "rejected" && this.state.errors.push("expeditions"), _.status === "rejected" && this.state.errors.push("resources");
		let F = {};
		b.forEach((e) => {
			let t = e && e.factionId;
			t && (F[t] = e);
		});
		let I = {};
		v.forEach((e) => {
			e && e.settlementId && (I[e.settlementId] = this.mergeRecord(I[e.settlementId], e));
		}), y.forEach((e) => {
			e && e.settlementId && (I[e.settlementId] = this.mergeRecord(I[e.settlementId], e));
		}), Object.keys(I).forEach((e) => {
			let t = I[e], n = t.rulerFactionId ? F[t.rulerFactionId] : null;
			if (!n) return;
			let r = n;
			t.factionNameVi = r.nameVi, t.factionNameEn = r.nameEn, t.factionColor = r.colorHex, t.factionMilitaryPower = r.militaryPower;
		});
		let L = {};
		Object.keys(I).forEach((e) => {
			this.resolveMapNodeId(e) === e && (L[e] = this.mergeRecord(L[e], {
				...I[e],
				sourceSettlementId: e
			}));
		}), Object.keys(I).forEach((e) => {
			let t = this.resolveMapNodeId(e);
			L[t] || (L[t] = this.mergeRecord(L[t], {
				...I[e],
				sourceSettlementId: e
			}));
		}), this.state.bySettlement = I, this.state.byMapNode = L, this.state.activeExpeditions = x && x.activeExpeditions || [], this.state.player = x && x.commander || null, this.state.playerFaction = b.find((e) => e.leaderId === "PLY-0001") || null, this.state.factionsById = F;
		let R = {};
		S.forEach((e) => {
			let t = e.status, n = e.locationNear;
			if (t !== "ACTIVE" || !n) return;
			let r = this.resolveMapNodeId(n);
			(R[r] ||= []).push(e);
		});
		let z = {};
		C.forEach((e) => {
			let t = e.settlementId;
			if (!t) return;
			let n = this.resolveMapNodeId(t);
			(z[n] ||= []).push(e);
		}), this.state.banditsByNode = R, this.state.crisesByNode = z;
		let B = {}, V = {};
		w.forEach((e) => {
			let t = e.name, n = e.npc_id || e.npcId;
			n && (V[n] = e), t && (B[this.normalizeName(t)] = e);
		}), this.state.npcsByName = B, this.state.npcsById = V;
		let H = Number(T?.player?.liquid_cash) || 0, U = {};
		E.forEach((e) => {
			let t = e.item_code || e.itemCode, n = Number(e.quantity) || 0;
			t && (U[t] = n);
		}), this.state.playerCash = H, this.state.inventory = U, this.state.guardTiers = k;
		let W = {};
		D.forEach((e) => {
			let t = e.nameVi;
			t && (W[this.normalizeName(t)] = e);
		}), this.state.specialistsByName = W, this.state.caravans = M, this.state.expeditions = N;
		let G = {}, K = {};
		P.forEach((e) => {
			let t = String(e.settlementId || ""), n = this.resolveMapNodeId(t), r = String(e.resourceType || "");
			n && r && (G[n] || (G[n] = {
				types: {},
				nodes: []
			}), G[n].types[r] = (G[n].types[r] || 0) + 1, G[n].nodes.push(e), K[r] = (K[r] || 0) + 1);
		}), this.state.resourcesByNode = G, this.state.resourceTotals = K;
		let q = {};
		j.forEach((e) => {
			let t = e.locationId;
			t && (q[t] = e);
		}), this.state.locationsById = q;
		let J = {};
		if (typeof window < "u") {
			let e = window.SETTLEMENT_LABELS || {};
			Object.keys(e).forEach((t) => {
				if (t === "wu_wei") return;
				let n = e[t] && e[t].vi;
				n && (J[this.normalizeLocationLabel(n)] = t);
			});
		}
		let Y = {};
		j.forEach((e) => {
			let t = e.locationId, n = e.nameVi;
			if (!t || !n) return;
			let r = J[this.normalizeLocationLabel(n)];
			r && (Y[t] = r);
		}), this.state.locToMapNode = Y;
		let X = {};
		O.forEach((e) => {
			let t = e.businessId, n = e.locationId;
			t && n && (X[t] = n);
		});
		let Z = {};
		D.forEach((e) => {
			let t = !!e.isHired, n = e.assignedBusinessId, r = n ? X[n] : null, i = e.baselineLocation, a = t && r ? r : i, o = a ? Y[a] : null;
			o && (Z[o] ||= []).push(e);
		}), this.state.businesses = O, this.state.specialistsByMapNode = Z;
		let Q = {};
		return A.forEach((e) => {
			let t = Y[e.sourceLocationId || ""], n = Y[e.targetLocationId || ""];
			if (!t || !n) return;
			let r = e.descriptionEn ? e.descriptionEn.trim() : "", i = r && !/^RT-/i.test(r) && /^[\x20-\x7E]+$/.test(r) ? r : void 0, a = {
				from: t,
				to: n,
				distanceLi: e.distanceLi,
				terrainType: e.terrainType,
				marchDays: e.standardMarchDays,
				grainCost: e.grainProvisionCost,
				ambushRisk: e.ambushRiskLevel,
				descVi: e.descriptionVi,
				descEn: i
			}, o = `${t}|${n}`, s = `${n}|${t}`;
			Q[o] || (Q[o] = a), Q[s] || (Q[s] = {
				...a,
				from: n,
				to: t
			});
		}), this.state.routesByKey = Q, this.state.status = this.state.errors.length === 17 ? "error" : "ready", this.state.fetchedAt = Date.now(), this.state;
	}
	getForMapNode(e) {
		return e && (this.state.byMapNode[e] || this.state.bySettlement[e]) || null;
	}
	normalizeName(e) {
		return e.normalize("NFC").trim().toLowerCase();
	}
	normalizeLocationLabel(e) {
		return e.replace(/\s*\(.*?\)/g, "").replace(/\s*&.*/g, "").replace(/Kinh Đô\s*/g, "").replace(/Tây Đô\s*/g, "").replace(/Imperial Capital\s*/gi, "").trim().toLowerCase();
	}
	findNpcByName(e) {
		return e && this.state.npcsByName[this.normalizeName(e)] || null;
	}
	findSpecialistByName(e) {
		return e && this.state.specialistsByName[this.normalizeName(e)] || null;
	}
	getLocIdForNode(e) {
		let t = Object.entries(this.state.locToMapNode).find(([, t]) => t === e);
		return t ? t[0] : null;
	}
	getSpecialistsForMapNode(e) {
		return [...this.state.specialistsByMapNode[e] || []].sort((e, t) => {
			let n = !!e.isHired;
			if (n !== !!t.isHired) return n ? 1 : -1;
			let r = String(e.nameVi || ""), i = String(t.nameVi || "");
			return r.localeCompare(i);
		});
	}
	getRecruitRequirement(e) {
		let t = this.findSpecialistByName(e);
		if (!t) return {
			canRecruit: !0,
			signingBonus: null,
			isHired: !1,
			reasonVi: "",
			reasonEn: ""
		};
		let n = !!t.isHired, r = Number(t.signingBonus) || 0;
		return n ? {
			canRecruit: !1,
			signingBonus: r,
			isHired: n,
			reasonVi: "Đã được chiêu mộ",
			reasonEn: "Already recruited"
		} : this.state.playerCash < r ? {
			canRecruit: !1,
			signingBonus: r,
			isHired: n,
			reasonVi: `Cần ${r} quan chiêu mộ`,
			reasonEn: `Need ${r} cash to recruit`
		} : {
			canRecruit: !0,
			signingBonus: r,
			isHired: n,
			reasonVi: "",
			reasonEn: ""
		};
	}
	getActionRequirements() {
		let e = this.state.playerCash, t = Object.values(this.state.inventory).filter((e) => e > 0).length, n = this.state.guardTiers.length ? Math.min(...this.state.guardTiers.map((e) => Number(e.costQian) || 0)) : null, r = !0, i = "", a = "";
		return n == null ? (r = !1, i = "Chưa tải được bảng giá hộ vệ", a = "Guard prices are unavailable") : t === 0 ? (r = !1, i = "Kho không có hàng để xuất", a = "No cargo in the warehouse") : e < n && (r = !1, i = `Cần tối thiểu ${n} quan thuê hộ vệ`, a = `Need at least ${n} cash for guards`), {
			cash: e,
			cargoKinds: t,
			minGuardCost: n,
			canDispatchCaravan: r,
			reasonVi: i,
			reasonEn: a
		};
	}
	getRoute(e, t) {
		return this.state.routesByKey[`${e}|${t}`] || null;
	}
	getLivingEntities() {
		return {
			caravans: this.state.caravans.filter((e) => String(e.status).toUpperCase() === "EN_ROUTE").map((e) => ({
				...e,
				from: this.resolveMapNodeId(String(e.fromSettlementId || "")),
				to: this.resolveMapNodeId(String(e.toSettlementId || "")),
				progress: Number(e.routeProgress) || 0
			})).filter((e) => e.from && e.to),
			expeditions: this.state.expeditions.filter((e) => String(e.status).toUpperCase() === "MARCHING").map((e) => {
				let t = e;
				return {
					...e,
					from: this.resolveMapNodeId(String(t.origin_settlement_id || t.originSettlementId || "")),
					to: this.resolveMapNodeId(String(t.target_settlement_id || t.targetSettlementId || ""))
				};
			}).filter((e) => e.from && e.to),
			bandits: Object.entries(this.state.banditsByNode).flatMap(([e, t]) => t.map((t) => ({
				...t,
				nodeId: e
			}))),
			crises: Object.entries(this.state.crisesByNode).flatMap(([e, t]) => t.map((t) => ({
				...t,
				nodeId: e
			})))
		};
	}
	getStatusForMapNode(e) {
		let t = this.getForMapNode(e);
		if (!t) return {
			key: "unknown",
			labelVi: "Chưa rõ",
			labelEn: "Unknown",
			className: "capital"
		};
		let n = this.state.playerFaction?.factionId, r = !!(t.rulerFactionId && n && t.rulerFactionId === n), i = Number(t.garrisonTroops ?? 0), a = Number(t.granaryGrain ?? 0), o = Number(t.publicOrder ?? 100);
		return r ? i < 200 || a <= 0 || o < 30 ? {
			key: "strained",
			labelVi: "Suy Yếu",
			labelEn: "Strained",
			className: "battle"
		} : {
			key: "stable",
			labelVi: "An Định",
			labelEn: "Stable",
			className: "safe"
		} : {
			key: "foreign",
			labelVi: "Ngoại Bang",
			labelEn: "Foreign Holding",
			className: "capital"
		};
	}
	getThreatForMapNode(e) {
		let t = this.getForMapNode(e), n = this.state.banditsByNode[e] || [], r = this.state.crisesByNode[e] || [], i = [], a = [], o = 0;
		if (n.length > 0) {
			let e = Math.max(...n.map((e) => Number(e.banditPower) || 0));
			o += Math.min(3, e / 150), i.push(`${n.length} ổ phỉ`), a.push(`${n.length} bandit lair${n.length > 1 ? "s" : ""}`);
		}
		r.forEach((e) => {
			let t = Number(e.severityLevel) || 1;
			o += Math.min(3, t);
			let n = e.titleVi || "Khủng hoảng";
			i.push(n), a.push(n);
		});
		let s = t && Number.isFinite(t.garrisonTroops) ? Number(t.garrisonTroops) : null, c = t && Number.isFinite(t.publicOrder) ? Number(t.publicOrder) : null;
		s != null && s < 500 && (o += 1, i.push("Đồn trú mỏng"), a.push("Thin garrison")), c != null && c < 40 && (o += 1, i.push("Trật tự thấp"), a.push("Low public order"));
		let l = o >= 3 ? "HIGH" : o >= 1.5 ? "MODERATE" : "LOW";
		return {
			level: l,
			...{
				LOW: {
					labelVi: "Thấp",
					labelEn: "Low",
					color: "#34d399"
				},
				MODERATE: {
					labelVi: "Vừa",
					labelEn: "Moderate",
					color: "#fbbf24"
				},
				HIGH: {
					labelVi: "Cao",
					labelEn: "High",
					color: "#f87171"
				}
			}[l],
			reasonsVi: i,
			reasonsEn: a
		};
	}
	getResourceDistribution() {
		return {
			byNode: this.state.resourcesByNode,
			totals: this.state.resourceTotals,
			types: Object.keys(this.state.resourceTotals).sort()
		};
	}
	getResourceNodesForMapNode(e) {
		return this.state.resourcesByNode[e]?.nodes || [];
	}
	hasArmy() {
		return Array.isArray(this.state.activeExpeditions) && this.state.activeExpeditions.length > 0;
	}
	getState() {
		return this.state;
	}
}();
// src/client/features/legacy-bridge.ts
function K() {
	if (typeof window > "u") return;
	let t = window;
	t.ModalShellCore = {
		createModalShell: i,
		modalStack: e
	}, t.UI = g, t.LineageFamilyUI = {
		open: (e) => S.open(e),
		close: () => S.close(),
		setFilter: (e) => S.setFilter(e),
		proposeMarriage: (e) => S.proposeMarriage(e),
		restCohabit: (e) => S.restCohabit(e),
		assignRole: (e, t) => S.assignRole(e, t),
		designateHeir: (e) => S.designateHeir(e),
		assignMentorDialog: (e) => S.assignMentorDialog(e),
		executeSuccession: () => S.executeSuccession()
	}, t.EquipmentUI = {
		openEquipmentModal: (e, t) => E.open(e, t),
		closeEquipmentModal: () => E.close(),
		switchTab: (e) => E.modal.switchTab(e),
		equip: (e, t, n) => E.equip(e, t, n),
		unequip: (e, t) => E.unequip(e, t),
		executeForge: () => E.executeForge()
	}, t.EnterpriseUI = {
		openEnterpriseModal: (e) => A.open(e),
		closeEnterpriseModal: () => A.close(),
		depositSafeCash: (e) => A.depositSafeCash(e),
		withdrawSafeCash: (e) => A.withdrawSafeCash(e),
		executeWork: (e) => A.executeWork(e)
	}, t.ProtagonistDossierModal = {
		open: () => P.openProtagonist(),
		close: () => P.closeProtagonist()
	}, t.NpcDossierModal = {
		open: (e) => P.openNpc(e),
		close: () => P.closeNpc()
	}, t.QuickTradeModal = {
		open: (e, t, n, r) => I.open(e, t, n, r),
		close: () => I.close(),
		updateTotal: () => I.updateTotal(),
		submit: () => I.submit()
	}, t.TacticalBattleUI = {
		startDuel: (e) => z.startDuel(e),
		close: () => z.close(),
		executeAction: (e) => z.executeAction(e)
	}, t.TravelTransitUI = {
		show: (e, t, n, r) => V.showTravelTransit(e, t, n, r),
		close: () => V.closeTravel(),
		openLegacy: () => V.openTravelTransitModal(),
		closeLegacy: () => V.closeTravelTransitModal()
	}, t.TurnAdvanceUI = {
		show: (e, t, n) => V.showTurnAdvance(e, t, n),
		close: () => V.closeTurn(),
		openLegacy: () => V.openTurnAdvanceModal(),
		closeLegacy: () => V.closeTurnAdvanceModal()
	}, t.WorldMapUI = {
		open: () => U.open(),
		close: () => U.close()
	}, t.MapLiveService = {
		load: (e = !1) => G.load(e),
		getForMapNode: (e) => G.getForMapNode(e),
		getStatusForMapNode: (e) => G.getStatusForMapNode(e),
		getThreatForMapNode: (e) => G.getThreatForMapNode(e),
		findNpcByName: (e) => G.findNpcByName(e),
		findSpecialistByName: (e) => G.findSpecialistByName(e),
		getSpecialistsForMapNode: (e) => G.getSpecialistsForMapNode(e),
		getLocIdForNode: (e) => G.getLocIdForNode(e),
		getRecruitRequirement: (e) => G.getRecruitRequirement(e),
		getActionRequirements: () => G.getActionRequirements(),
		getRoute: (e, t) => G.getRoute(e, t),
		getLivingEntities: () => G.getLivingEntities(),
		getResourceDistribution: () => G.getResourceDistribution(),
		getResourceNodesForMapNode: (e) => G.getResourceNodesForMapNode(e),
		resolveMapNodeId: (e) => G.resolveMapNodeId(e),
		hasArmy: () => G.hasArmy(),
		getState: () => G.getState(),
		ALIASES: G.ALIASES
	}, console.log("[ThreeKingdoms-AgentEngine] All 14 client feature slices successfully bridged to window.*");
}
var q = new class {
	handlers = /* @__PURE__ */ new Map();
	on(e, t) {
		return this.handlers.has(e) || this.handlers.set(e, /* @__PURE__ */ new Set()), this.handlers.get(e).add(t), () => {
			this.off(e, t);
		};
	}
	off(e, t) {
		let n = this.handlers.get(e);
		n && (n.delete(t), n.size === 0 && this.handlers.delete(e));
	}
	emit(e, t) {
		let n = this.handlers.get(e);
		n && n.forEach((n) => {
			try {
				n(t);
			} catch (t) {
				console.error(`[EventBus] Error handling event ${e}:`, t);
			}
		});
	}
}(), J = class e {
	static instance;
	static getInstance() {
		return e.instance ||= new e(), e.instance;
	}
	async getCaravans() {
		return (await v.get("/api/logistics/caravans")).caravans || [];
	}
	async getArbitrageOpportunities() {
		return (await v.get("/api/economy/arbitrage")).routes || [];
	}
	async dispatchCaravan(e) {
		return v.post("/api/caravans/dispatch", {
			cargoItemCode: e.commodityCode,
			cargoQuantity: e.quantity,
			fromSettlementId: e.originSettlementId,
			toSettlementId: e.destSettlementId,
			guardTier: e.escortLevel
		});
	}
}, Y = J.getInstance(), X = class {
	modal;
	caravans = [];
	routes = [];
	constructor() {
		this.modal = i({
			id: "caravan-modal",
			title: "Thương Đoàn Viễn Chinh & Trục Vận Chuyển",
			subtitle: "Thiết lập tuyến buôn liên châu, kinh doanh chênh lệch giá và thuê hộ tiêu áp tải",
			seal: "商",
			size: "xl",
			tabs: [
				{
					id: "active",
					label: "Thương Đoàn Đang Chạy",
					seal: "運"
				},
				{
					id: "arbitrage",
					label: "Thương Cơ & Chênh Lệch Giá",
					seal: "漲"
				},
				{
					id: "dispatch",
					label: "Xuất Tiêu Khai Tuyến",
					seal: "旗"
				}
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
	async open(e = "active") {
		await this.modal.open(e);
	}
	async close() {
		await this.modal.close();
	}
	async refreshData() {
		try {
			let [e, t] = await Promise.all([Y.getCaravans().catch(() => []), Y.getArbitrageOpportunities().catch(() => [])]);
			this.caravans = e, this.routes = t, this.modal.updateTabBadge("active", e.length > 0 ? e.length : void 0);
		} catch (e) {
			console.error("[CaravanLogisticsModal] Error refreshing data:", e);
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
			case "dispatch": this.renderDispatchTabContent();
		}
	}
	renderActiveTabContent() {
		let e = `
      <div class="caravan-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">運</div>
          <div class="lead-text">
            <h3>Đội Buôn Lưu Động (${this.caravans.length} Tiêu Xa)</h3>
            <div class="text-muted text-sm">Thương đoàn di chuyển liên thành theo lượt tháng, ứng biến trước thời tiết và thổ phỉ dọc quan đạo.</div>
          </div>
        </div>

        ${this.caravans.length === 0 ? "\n          <div class=\"text-center py-10 text-muted\">\n            Hiện không có thương đoàn nào trên đường. Hãy vào mục \"Xuất Tiêu Khai Tuyến\" để phái chuyến buôn đầu tiên.\n          </div>\n        " : `
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
		this.modal.setContent(e);
	}
	renderArbitrageTabContent() {
		let e = `
      <div class="caravan-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">漲</div>
          <div class="lead-text">
            <h3>Bảng Chênh Lệch Giá Hàng Hóa Liên Châu</h3>
            <div class="text-muted text-sm">Phân tích giá mua tại Trác Huyện và giá bán tại các thành thị lớn (Lạc Dương, Nghiệp Thành, Kiến Nghiệp).</div>
          </div>
        </div>

        ${this.routes.length === 0 ? "\n          <div class=\"text-center py-8 text-muted\">Đang cập nhật tỷ giá liên thành...</div>\n        " : `
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
		this.modal.setContent(e);
	}
	renderDispatchTabContent() {
		this.modal.setContent("\n      <div class=\"caravan-modal-content\">\n        <div class=\"spatial-banner-lead\">\n          <div class=\"lead-seal\">旗</div>\n          <div class=\"lead-text\">\n            <h3>Khởi Hành Tiêu Xa Thương Đoàn</h3>\n            <div class=\"text-muted text-sm\">Chọn điểm đến, loại hàng hóa trong kho và cấp bậc thuê tiêu sư bảo an.</div>\n          </div>\n        </div>\n\n        <div class=\"tactical-card p-4 bg-slate-900 rounded border border-slate-800\">\n          <div class=\"grid grid-cols-1 md:grid-cols-2 gap-3 mb-3\">\n            <div>\n              <label class=\"block text-xs font-bold text-slate-300 mb-1\">Thành Thị Đích:</label>\n              <select id=\"caravan-dest-id\" class=\"modal-input w-full\">\n                <option value=\"ye_cheng\">Nghiệp Thành (Hà Bắc - 5 ngày)</option>\n                <option value=\"luo_yang\">Lạc Dương (Kinh Đô - 12 ngày)</option>\n                <option value=\"xu_chang\">Hứa Xương (Trung Nguyên - 10 ngày)</option>\n                <option value=\"jian_ye\">Kiến Nghiệp (Giang Đông - 18 ngày)</option>\n              </select>\n            </div>\n            <div>\n              <label class=\"block text-xs font-bold text-slate-300 mb-1\">Hàng Hóa Vận Chuyển:</label>\n              <select id=\"caravan-commodity\" class=\"modal-input w-full\">\n                <option value=\"PROD-MAT\">Chiếu Trúc Lương Gia</option>\n                <option value=\"PROD-BASK\">Giỏ Thùng Đan Vận Chuyển</option>\n                <option value=\"COM-SILK\">Tơ Lụa Nguyên Tấm</option>\n                <option value=\"COM-IRON\">Sắt Thỏi Luyện Tinh</option>\n              </select>\n            </div>\n          </div>\n\n          <div class=\"grid grid-cols-1 md:grid-cols-2 gap-3 mb-4\">\n            <div>\n              <label class=\"block text-xs font-bold text-slate-300 mb-1\">Số Lượng Xuất Kho:</label>\n              <input type=\"number\" id=\"caravan-qty\" class=\"modal-input w-full\" value=\"20\" min=\"5\" max=\"100\" />\n            </div>\n            <div>\n              <label class=\"block text-xs font-bold text-slate-300 mb-1\">Cấp Hộ Tiêu Bảo An:</label>\n              <select id=\"caravan-escort\" class=\"modal-input w-full\">\n                <option value=\"NONE\">Không Thuê (Rủi ro thổ phỉ cao)</option>\n                <option value=\"MILITIA\">Dân Binh Địa Phương (+100 Quan)</option>\n                <option value=\"MERCENARY\">Tiêu Sư Giang Hồ (+300 Quan, An Toàn 95%)</option>\n              </select>\n            </div>\n          </div>\n\n          <button class=\"ui-btn ui-btn--accent w-full py-2.5 font-bold\" onclick=\"window.CaravanUI.executeDispatch()\">\n            Xuất Phát Thương Đoàn\n          </button>\n        </div>\n      </div>\n    ");
	}
	async executeDispatch() {
		let e = document.getElementById("caravan-dest-id"), t = document.getElementById("caravan-commodity"), n = document.getElementById("caravan-qty"), r = document.getElementById("caravan-escort"), i = {
			originSettlementId: "zhuo_xian",
			destSettlementId: e?.value || "ye_cheng",
			commodityCode: t?.value || "PROD-MAT",
			quantity: parseInt(n?.value || "20", 10),
			escortLevel: r?.value || "MILITIA"
		};
		try {
			let e = await Y.dispatchCaravan(i);
			typeof window.showToast == "function" && window.showToast(e.narrativeVi || "Thương đoàn đã xuất phát!"), await this.refreshData(), await this.modal.switchTab("active");
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Lỗi xuất thương đoàn!", !0);
		}
	}
}, Z = new X(), Q = class {
	modal;
	selectedScenario = "184_YELLOW_TURBAN";
	constructor() {
		this.modal = i({
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
		let e = `
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
		this.modal.setContent(e);
	}
	selectScenario(e) {
		this.selectedScenario = e, this.renderContent();
	}
	async startCampaign() {
		let e = document.getElementById("ts-player-name"), t = document.getElementById("ts-player-style");
		try {
			await v.post("/api/session/new-game", {
				scenario: this.selectedScenario,
				playerName: e?.value || "Lương Diễn",
				playerStyle: t?.value || "Chí Viễn"
			}), typeof window.showToast == "function" && window.showToast("Khởi tạo chiến dịch thành công!"), await this.modal.close(), window.location.reload();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Lỗi khởi tạo chiến dịch!", !0);
		}
	}
}, $ = new Q();
// src/client/main.ts
K();
export { X as CaravanLogisticsModal, J as CaravanLogisticsService, _ as ClientApiClient, N as DossiersModal, j as DossiersService, k as EnterpriseWorkshopModal, D as EnterpriseWorkshopService, T as EquipmentForgeModal, C as EquipmentForgeService, t as LEGACY_OWNED_MODAL_IDS, x as LineageFamilyModal, y as LineageFamilyService, r as ModalShell, F as QuickTradeModal, R as TacticalBattleModal, Q as TitleScreenModal, B as TransitTurnModals, H as WorldMapModal, v as apiClient, Z as caravanLogisticsModal, Y as caravanLogisticsService, i as createModalShell, P as dossiersModal, M as dossiersService, A as enterpriseWorkshopModal, O as enterpriseWorkshopService, E as equipmentForgeModal, w as equipmentForgeService, q as eventBus, n as isLegacyOwnedModalId, S as lineageFamilyModal, b as lineageFamilyService, e as modalStack, I as quickTradeModal, z as tacticalBattleModal, $ as titleScreenModal, V as transitTurnModals, U as worldMapModal };

//# sourceMappingURL=client-bundle.es.js.map