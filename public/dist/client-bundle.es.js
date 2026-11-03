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
	sessionHeaders() {
		if (typeof window > "u" || window.sessionStorage === void 0) return {};
		let e = window.sessionStorage.getItem("sim.sessionId"), t = window.sessionStorage.getItem("sim.sessionToken");
		return !e || !t ? {} : {
			"x-session-id": e,
			"x-session-token": t
		};
	}
	async get(e, t) {
		let n = e;
		if (t) {
			let e = new URLSearchParams();
			for (let [n, r] of Object.entries(t)) r != null && e.append(n, String(r));
			let r = e.toString();
			r && (n += (n.includes("?") ? "&" : "?") + r);
		}
		let r = await fetch(n, { headers: this.sessionHeaders() });
		if (!r.ok) {
			let e = await r.json().catch(() => ({}));
			throw Error(e.error || `HTTP error ${r.status}: ${r.statusText}`);
		}
		return r.json();
	}
	async post(e, t) {
		let n = await fetch(e, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...this.sessionHeaders()
			},
			body: t ? JSON.stringify(t) : void 0
		}), r = await n.json().catch(() => ({}));
		if (!n.ok || r && r.success === !1) throw Error(r.error || `HTTP error ${n.status}: ${n.statusText}`);
		return r;
	}
}, v = _.getInstance(), ee = class e {
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
}, y = ee.getInstance(), b = class {
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
			let [e, t] = await Promise.all([y.getOverview().catch(() => null), y.getCourtshipCandidates().catch(() => [])]);
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
			let t = await y.proposeMarriage(e);
			typeof window.showToast == "function" && window.showToast(t.narrativeVi || "Kết tóc se duyên thành công!"), await this.refreshData(), await this.renderActiveTab();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Cầu hôn thất bại!", !0);
		}
	}
	async restCohabit(e) {
		try {
			let t = await y.restAndCohabit(e);
			typeof window.showToast == "function" && window.showToast(t.narrativeVi || "Đồng tẩm nghỉ ngơi tĩnh dưỡng thành công!"), await this.refreshData(), await this.renderActiveTab();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Không thể nghỉ ngơi lúc này!", !0);
		}
	}
	async assignRole(e, t) {
		try {
			await y.assignHouseholdRole(e, t), typeof window.showToast == "function" && window.showToast("Đã phân công trọng trách nội trạch thành công!"), await this.refreshData();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Lỗi phân công trọng trách!", !0);
		}
	}
	async designateHeir(e) {
		try {
			await y.designateHeir(e), typeof window.showToast == "function" && window.showToast("Đã chỉ định đích tử kế vị gia tộc!"), await this.refreshData(), await this.renderActiveTab();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Không thể lập thế tử!", !0);
		}
	}
	async assignMentorDialog(e) {
		let t = prompt("Nhập ID danh sư thụ giáo (ví dụ: NPC-0003 cho Quan Vũ, NPC-0001 cho Lư Thực):", "NPC-0003");
		if (t) try {
			await y.assignMentor(e, t), typeof window.showToast == "function" && window.showToast("Đã bái kiến danh sư thụ giáo thành công!"), await this.refreshData(), await this.renderActiveTab();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Lỗi chỉ định danh sư!", !0);
		}
	}
	async executeSuccession() {
		if (await h({
			title: "Chuyển giao quyền lực",
			message: "Bạn có chắc chắn muốn chuyển giao quyền lực sang Thế tử kế thừa không?",
			confirmLabel: "Kế vị",
			danger: !0
		})) try {
			let e = this.overview?.activeHeir?.child_id;
			if (!e) throw Error("Chưa chỉ định Thế tử kế vị.");
			let t = await y.executeSuccession(e);
			typeof window.showToast == "function" && window.showToast(t.narrativeVi || "Đại điển kế thừa tông miếu hoàn tất!"), await this.refreshData(), await this.renderActiveTab();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Kế thừa thất bại!", !0);
		}
	}
}, x = new b(), te = class e {
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
	async getTools(e = "PLY-0001") {
		return (await v.get("/api/professions/tools", { characterId: e })).tools || [];
	}
	async repairTool(e, t) {
		return v.post("/api/professions/tools/repair", {
			characterId: e,
			itemCode: t,
			idempotencyKey: `tool-repair-${e}-${t}-${Date.now()}`
		});
	}
}, S = te.getInstance();
// src/client/features/equipment-forge/equipment-forge.modal.ts
function C(e) {
	return String(e ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
var ne = class {
	modal;
	currentCharacterId = "PLY-0001";
	overview = null;
	tools = [];
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
				},
				{
					id: "tools",
					label: "Công Cụ & Sửa Chữa",
					seal: "器"
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
		let [e, t] = await Promise.all([S.getOverview(this.currentCharacterId).catch((e) => (console.error("[EquipmentForgeModal] Error refreshing overview:", e), null)), S.getTools(this.currentCharacterId).catch((e) => (console.error("[EquipmentForgeModal] Error refreshing tools:", e), []))]);
		this.overview = e, this.tools = t;
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
			case "tools": this.renderToolsTab();
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
	renderToolsTab() {
		let e = this.tools, t = e.length > 0 ? e.map((e) => {
			let t = e.kind === "DURABLE" ? "Bền" : "Tiêu hao", n = e.repairSkillCode ? `${e.repairSkillCode} bậc ${e.repairMinTier}` : "Không yêu cầu kỹ năng", r = e.kind === "CONSUMABLE" ? "Vật phẩm tiêu hao — mua mới thay vì sửa." : e.needsRepair ? e.canRepair ? `Sửa tốn ${e.repairCash} Quan, hồi đầy ${e.maxUses} lượt.` : `Cần ${n} (hiện bậc ${e.skillTier}).` : "Đang ở độ bền tối đa.", i = e.needsRepair && e.canRepair;
			return `
          <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
            <div class="flex justify-between items-start gap-3">
              <div>
                <div class="font-bold text-amber-200 text-sm">${C(e.nameVi)}</div>
                <div class="text-xs text-muted">${C(e.itemCode)} • ${t} • SL: ${e.quantity}</div>
              </div>
              <button class="ui-btn ui-btn--primary ui-btn--sm" ${i ? "" : "disabled"}
                onclick="window.EquipmentUI.repairTool('${C(e.itemCode)}')">Sửa Chữa</button>
            </div>
            <div class="text-[11px] text-slate-300 mt-2">
              Độ bền: ${e.usesLeft}/${e.maxUses} lượt
              <progress class="tool-durability-bar" max="${e.maxUses}" value="${e.usesLeft}"></progress>
            </div>
            <div class="text-[11px] text-muted mt-1">${C(r)}</div>
          </div>
        `;
		}).join("") : "<div class=\"text-center py-8 text-muted\">\n          Kho chưa có công cụ nào. Chế tác tại Lò Rèn hoặc mua từ chợ phiên.\n        </div>";
		this.modal.setContent(`
      <div class="equipment-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">器</div>
          <div class="lead-text">
            <h3>Công Cụ Nghề Nghiệp</h3>
            <div class="text-muted text-sm">Công cụ bền mất lượt khi thu hoạch; sửa chữa hồi đầy độ bền nhưng tốn Quan và có thể cần kỹ năng.</div>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">${t}</div>
      </div>
    `);
	}
	async repairTool(e) {
		try {
			let t = await S.repairTool(this.currentCharacterId, e), n = t?.result || t;
			typeof window.showToast == "function" && window.showToast(`Đã sửa ${e}: ${n?.usesBefore ?? "?"} → ${n?.usesAfter ?? "?"} lượt (${n?.cashPaid ?? 0} Quan).`), await this.refreshData(), await this.renderActiveTab();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Sửa công cụ thất bại!", !0);
		}
	}
	async equip(e, t, n) {
		try {
			await S.equipItem(e, t, n), typeof window.showToast == "function" && window.showToast("Đã trang bị thành công!"), await this.refreshData(), await this.renderActiveTab();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Lỗi trang bị!", !0);
		}
	}
	async unequip(e, t) {
		try {
			await S.unequipItem(e, t), typeof window.showToast == "function" && window.showToast("Đã tháo trang bị về kho!"), await this.refreshData(), await this.renderActiveTab();
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
			let e = await S.forgeBespokeWeapon(i);
			typeof window.showToast == "function" && window.showToast(e.narrativeVi || "Đúc rèn thần binh thành công!"), await this.refreshData(), await this.modal.switchTab("gear");
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Đúc rèn thất bại!", !0);
		}
	}
}, w = new ne(), T = class e {
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
			businessId: e,
			action: t,
			amount: n,
			idempotencyKey: `enterprise-cash-${e}-${t}-${Date.now()}`
		});
	}
	async executeLaborShift(e) {
		return v.post("/api/enterprise/work", {
			shiftId: e,
			idempotencyKey: `enterprise-work-${e}-${Date.now()}`
		});
	}
	async collectProfits(e, t) {
		return v.post("/api/enterprise/collect", {
			businessId: e,
			amount: t,
			idempotencyKey: `enterprise-collect-${e}-${Date.now()}`
		});
	}
	async openEnterprise(e, t = !0, n) {
		return v.post("/api/enterprise/open", {
			businessType: e,
			turnkey: t,
			customName: n,
			idempotencyKey: `enterprise-open-${e}-${Date.now()}`
		});
	}
}, E = T.getInstance();
// src/client/features/enterprise-workshop/enterprise-workshop.modal.ts
function D(e) {
	return String(e ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function O(e) {
	return Number(e || 0).toLocaleString("vi-VN");
}
var re = {
	cra: "Kỹ Nghệ",
	com: "Thương Nghiệp",
	int: "Trí Lực",
	log: "Hậu Cần",
	war: "Võ Lực",
	ldr: "Thống Soái"
}, ie = {
	CLOSED: "Đóng cửa",
	DISTRESSED: "Nợ xấu",
	PROFITABLE: "Có lời",
	BREAK_EVEN: "Hòa vốn",
	PAUSED: "Tạm dừng"
}, ae = {
	FOREMAN: "Thợ cả",
	CARPENTER: "Thợ mộc",
	CRAFTSMAN: "Thợ thủ công",
	MANAGER: "Quản lý",
	CHIEF_ARTISAN_PARTNER: "Thợ cả đồng sáng lập",
	ACCOUNTANT_MANAGER: "Quản lý kế toán",
	APPRENTICE_CARPENTER: "Thợ mộc học việc",
	APPRENTICE_WEAVER: "Thợ dệt học việc",
	SPECIALIST_OPERATOR: "Chuyên viên vận hành",
	CARAVAN_ESCORT_CHIEF: "Đội trưởng hộ tống",
	MASTER_BLACKSMITH: "Thợ rèn bậc thầy",
	FOUNDRY_MASTER: "Chủ lò đúc",
	ASSISTANT_WORKER: "Phụ thợ"
};
function oe(e) {
	return ae[String(e || "").toUpperCase()] || String(e || "Nhân công").replace(/_/g, " ");
}
var k = {
	WORKSHOP: "Xưởng thủ công",
	TAVERN: "Tửu điếm",
	APOTHECARY: "Dược đường",
	FORGE: "Lò rèn",
	BLACKSMITH: "Lò rèn"
}, A = class {
	modal;
	status = null;
	constructor() {
		this.modal = i({
			id: "enterprise-modal",
			title: "Sản Nghiệp & Phường Xưởng Bách Nghệ",
			subtitle: "Quản lý xưởng, lao động thời vụ và mở cơ sở mới",
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
			this.status = await E.getStatus("PLY-0001");
		} catch (e) {
			console.error("[EnterpriseWorkshopModal] Error refreshing data:", e), this.status = null;
		}
	}
	async renderActiveTab() {
		(this.modal.activeTab || "owner") === "owner" ? this.renderOwnerTab() : this.renderWorkTab();
	}
	renderSummary() {
		let e = this.status;
		return e ? `
      <div class="enterprise-summary-grid">
        ${[
			{
				label: "Tiền mặt",
				value: `${O(e.playerCash)} Quan`,
				tone: ""
			},
			{
				label: "Quỹ an toàn xưởng",
				value: `${O(e.totalSafeCash)} Quan`,
				tone: "is-gold"
			},
			{
				label: "Nợ xưởng",
				value: `${O(e.totalDebt)} Quan`,
				tone: e.totalDebt > 0 ? "is-danger" : ""
			},
			{
				label: "Lương tháng",
				value: `${O(e.totalStaffWages)} Quan`,
				tone: ""
			},
			{
				label: "Thuê xưởng",
				value: `${O(e.totalMonthlyRent)} Quan`,
				tone: ""
			},
			{
				label: "Lợi nhuận tích lũy",
				value: `${O(e.totalAccumulatedProfit)} Quan`,
				tone: e.totalAccumulatedProfit > 0 ? "is-positive" : ""
			}
		].map((e) => `
          <div class="enterprise-summary-card ${e.tone}">
            <span>${e.label}</span>
            <strong>${e.value}</strong>
          </div>
        `).join("")}
      </div>
    ` : "";
	}
	renderOwnerTab() {
		let e = this.status;
		if (!e) {
			this.modal.setContent("<div class=\"journal-modal-content\"><div class=\"text-muted text-sm\">Không tải được sản nghiệp.</div></div>");
			return;
		}
		let t = e.ownedBusinesses || [], n = e.openableTypes || [], r = t.length > 0 ? t.map((e) => this.renderEnterpriseCard(e)).join("") : "<div class=\"enterprise-empty\">Chưa sở hữu cơ sở nào. Chọn một loại hình bên dưới để mở.</div>", i = n.length > 0 ? n.map((e) => this.renderOpenableCard(e)).join("") : "<div class=\"enterprise-empty\">Danh mục mở cơ sở chưa sẵn sàng.</div>";
		this.modal.setContent(`
      <div class="enterprise-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">業</div>
          <div class="lead-text">
            <h3>Phường Xưởng Lương Gia</h3>
            <div class="text-muted text-sm">Xưởng tự vận hành theo tháng. Lợi nhuận trả nợ trước, phần còn lại vào quỹ an toàn; thiếu nhân công thì sản lượng giảm.</div>
          </div>
        </div>
        ${this.renderSummary()}

        <section class="enterprise-section">
          <div class="enterprise-section-title">
            Cơ sở đang sở hữu <span>${t.length}</span>
          </div>
          <div class="enterprise-grid">${r}</div>
        </section>

        <section class="enterprise-section">
          <div class="enterprise-section-title">
            Mở cơ sở mới <span>${n.length}</span>
          </div>
          <div class="enterprise-open-grid">${i}</div>
        </section>
      </div>
    `), this.bindOwnerActions();
	}
	renderEnterpriseCard(e) {
		let t = e.health || (e.status === "ACTIVE" ? "BREAK_EVEN" : "PAUSED"), n = Number(e.accumulated_profit || 0), r = Number(e.safe_cash || 0), i = n > 0 || r > 0, a = e.staff_members || [], o = Number(e.staff_wages || 0), s = a.length > 0 ? a.map((e) => `
          <div class="enterprise-payroll-row">
            <span class="enterprise-payroll-name" title="${D(`${e.name} (${e.npc_id})`)}">
              ${D(e.name)} <span class="enterprise-payroll-role">• ${D(oe(e.role))}</span>
            </span>
            <span class="enterprise-payroll-wage">${O(e.monthly_wage)} Quan/tháng</span>
          </div>
        `).join("") : "<div class=\"enterprise-payroll-empty\">Chưa bổ nhiệm gia nhân nào vào cơ sở này.</div>";
		return `
      <div class="enterprise-card">
        <div class="enterprise-card-head">
          <div class="enterprise-icon">${e.business_type === "FORGE" || e.business_type === "BLACKSMITH" ? "鍛" : e.business_type === "TAVERN" ? "酒" : e.business_type === "APOTHECARY" ? "藥" : "工"}</div>
          <div class="enterprise-name-wrap">
            <div class="enterprise-name">${D(e.name)}</div>
            <div class="enterprise-meta">${k[e.business_type] || e.business_type} • ${D(e.location_id)} • Tier ${e.tier || 1}</div>
          </div>
          <span class="enterprise-health is-${t.toLowerCase()}">${ie[t] || t}</span>
        </div>

        <div class="enterprise-meta mt-1">Quản lý: ${D(e.manager_name || e.manager_npc_id)} • Hiệu suất ${Math.round(Number(e.efficiency_multiplier || 0) * 100)}% • ${e.auto_procure ? "Tự mua nguyên liệu" : "Mua tay"}</div>

        <div class="enterprise-stats">
          <div class="enterprise-stat"><span>Quỹ an toàn</span><strong>${O(r)}</strong></div>
          <div class="enterprise-stat"><span>Nợ</span><strong class="${Number(e.debt || 0) > 0 ? "is-danger" : ""}">${O(e.debt)}</strong></div>
          <div class="enterprise-stat"><span>Doanh thu/ngày</span><strong>${O(e.daily_revenue)}</strong></div>
          <div class="enterprise-stat"><span>Lợi nhuận tích lũy</span><strong class="${n > 0 ? "is-positive" : ""}">${O(n)}</strong></div>
          <div class="enterprise-stat"><span>Nhân sự</span><strong>${e.staff_count ?? 0}/${e.current_workforce ?? 0}</strong></div>
          <div class="enterprise-stat"><span>Lương nhân công</span><strong>${O(o)}</strong></div>
          <div class="enterprise-stat"><span>Lương + thuê</span><strong>${O(e.monthly_overhead)}</strong></div>
        </div>

        <div class="enterprise-payroll">
          <div class="enterprise-payroll-head">
            <span>Bảng lương nhân công</span>
            <strong>${a.length} người • ${O(o)} Quan/tháng</strong>
          </div>
          <div class="enterprise-payroll-list">${s}</div>
        </div>

        <div class="enterprise-cash-row">
          <input class="enterprise-cash-input" id="enterprise-cash-${D(e.business_id)}" type="number" min="1" step="50" value="500" aria-label="Số tiền nạp hoặc rút" />
          <button class="ui-btn ui-btn--primary ui-btn--sm" data-enterprise-cash="DEPOSIT" data-business-id="${D(e.business_id)}">Nạp quỹ</button>
          <button class="ui-btn ui-btn--ghost ui-btn--sm" data-enterprise-cash="WITHDRAW" data-business-id="${D(e.business_id)}">Rút quỹ</button>
          <button class="ui-btn ui-btn--accent ui-btn--sm" data-enterprise-collect="${D(e.business_id)}" ${i ? "" : "disabled"}>Thu lợi nhuận</button>
        </div>
      </div>
    `;
	}
	renderOpenableCard(e) {
		let t = Number(e.startupCash || 0) + Number(e.effectiveTurnkeyCost || 0), n = (e.requiredMaterials || []).map((e) => `
      <span class="enterprise-material ${e.hasEnough ? "is-ready" : "is-missing"}" title="${e.available}/${e.quantity}">
        ${D(e.itemNameVi)} ${e.available}/${e.quantity}
      </span>
    `).join("");
		return `
      <div class="enterprise-open-card">
        <div class="enterprise-card-head">
          <div class="enterprise-icon">${e.icon || "業"}</div>
          <div class="enterprise-name-wrap">
            <div class="enterprise-name">${D(e.titleVi)}</div>
            <div class="enterprise-meta">Thuê ${O(e.monthlyRent)}/tháng • ${e.baseWorkforce} nhân sự • ${O(e.projectedDailyRevenueMin)}–${O(e.projectedDailyRevenueMax)}/ngày</div>
          </div>
        </div>
        <div class="enterprise-open-desc">${D(e.descriptionVi)}</div>
        <div class="enterprise-materials">${n || "<span class=\"enterprise-material is-ready\">Không cần nguyên liệu</span>"}</div>
        <div class="enterprise-open-actions">
          <button class="ui-btn ui-btn--ghost ui-btn--sm" data-open-enterprise="${D(e.typeId)}" data-turnkey="false" ${e.canAffordCash ? "" : "disabled"}>
            Mở chuẩn · ${O(e.startupCash)}
          </button>
          <button class="ui-btn ui-btn--primary ui-btn--sm" data-open-enterprise="${D(e.typeId)}" data-turnkey="true" ${e.canAffordTurnkey ? "" : "disabled"}>
            Mở turnkey · ${O(t)}
          </button>
        </div>
      </div>
    `;
	}
	bindOwnerActions() {
		let e = this.modal.getBodyElement();
		e && (e.querySelectorAll("[data-enterprise-cash]").forEach((e) => {
			e.addEventListener("click", async () => {
				let t = e.dataset.businessId || "", n = e.dataset.enterpriseCash || "DEPOSIT", r = document.getElementById(`enterprise-cash-${t}`), i = Number(r?.value || 0);
				if (!Number.isFinite(i) || i <= 0) this.toast("Số tiền phải lớn hơn 0.", !0);
				else {
					e.setAttribute("disabled", "true");
					try {
						await E.manageSafeCash(t, n, Math.round(i)), this.toast(n === "DEPOSIT" ? "Đã nạp tiền vào quỹ an toàn." : "Đã rút tiền về ngân khố."), await this.refreshData(), await this.renderActiveTab();
					} catch (t) {
						e.removeAttribute("disabled"), this.toast(t.message || "Thao tác quỹ thất bại.", !0);
					}
				}
			});
		}), e.querySelectorAll("[data-enterprise-collect]").forEach((e) => {
			e.addEventListener("click", async () => {
				let t = e.dataset.enterpriseCollect || "";
				e.setAttribute("disabled", "true");
				try {
					let e = await E.collectProfits(t);
					this.toast(e.message || `Đã thu ${O(e.collectedAmount)} Quan lợi nhuận.`, e.success === !1), await this.refreshData(), await this.renderActiveTab();
				} catch (t) {
					e.removeAttribute("disabled"), this.toast(t.message || "Thu lợi nhuận thất bại.", !0);
				}
			});
		}), e.querySelectorAll("[data-open-enterprise]").forEach((e) => {
			e.addEventListener("click", async () => {
				let t = e.dataset.openEnterprise || "", n = e.dataset.turnkey === "true", r = (this.status?.openableTypes || []).find((e) => e.typeId === t);
				if (!r) return;
				let i = n ? Number(r.startupCash) + Number(r.effectiveTurnkeyCost) : Number(r.startupCash);
				if (await h({
					title: "Mở cơ sở mới",
					message: `Mở ${r.titleVi} với chi phí ${O(i)} Quan${n ? " (turnkey, mua bù nguyên liệu thiếu)" : ""}? Mỗi lần mở tốn 2 ngày.`,
					confirmLabel: "Mở cơ sở",
					danger: !0
				})) {
					e.setAttribute("disabled", "true");
					try {
						await E.openEnterprise(t, n), this.toast(`Đã mở ${r.titleVi}.`), await this.refreshData(), await this.renderActiveTab();
					} catch (t) {
						e.removeAttribute("disabled"), this.toast(t.message || "Mở cơ sở thất bại.", !0);
					}
				}
			});
		}));
	}
	renderWorkTab() {
		let e = this.status, t = e?.laborShifts || [], n = Number(e?.playerFatigue || 0), r = t.filter((e) => n + Number(e.fatigueCost || 0) <= 100), i = t.reduce((e, t) => Number(t.wage) > Number(e?.wage || 0) ? t : e, t[0]), a = t.reduce((e, t) => Number(t.wage) / Math.max(1, Number(t.fatigueCost || 1)) > (e ? Number(e.wage) / Math.max(1, Number(e.fatigueCost || 1)) : 0) ? t : e, t[0]), o = `
      <div class="work-summary-grid">
        <div class="work-summary-card"><span>Mệt mỏi</span><strong>${n}/100</strong></div>
        <div class="work-summary-card"><span>Ca khả dụng</span><strong>${r.length}/${t.length}</strong></div>
        <div class="work-summary-card"><span>Lương cao nhất</span><strong>${i ? `${O(i.wage)} Quan` : "—"}</strong></div>
        <div class="work-summary-card"><span>Hiệu quả nhất</span><strong>${a ? `${O(a.wage)} / ${a.fatigueCost} thể lực` : "—"}</strong></div>
      </div>
    `, s = t.length > 0 ? [...t].sort((e, t) => Number(t.wage) - Number(e.wage)).map((e) => {
			let t = Number(e.fatigueCost ?? e.staminaCost ?? 0), r = n + t > 100, i = re[String(e.attributeTarget || "cra")] || String(e.attributeTarget || "").toUpperCase();
			return `
          <div class="work-card ${r ? "is-blocked" : ""}">
            <div class="work-card-head">
              <span class="enterprise-icon">${e.icon || "工"}</span>
              <div>
                <div class="enterprise-name">${D(e.titleVi)}</div>
                <div class="enterprise-meta">${D(e.workplaceVi)} • ${D(e.professionNameVi)}</div>
              </div>
            </div>
            <div class="work-wage">${O(e.wage)} <span>Quan / ca</span></div>
            <div class="work-meta">
              <span>${t} thể lực</span>
              <span>+${e.expGain} EXP nghề</span>
              <span>+${e.attributeExp} EXP ${i}</span>
            </div>
            <div class="work-note">${r ? `Cần nghỉ ngơi: đang mệt ${n}/100, ca này tốn ${t}.` : D(e.narrativeVi)}</div>
            <button class="ui-btn ui-btn--primary ui-btn--sm w-full" data-work-shift="${D(e.shiftId)}" ${r ? "disabled" : ""}>Nhận việc · 1 ngày</button>
          </div>
        `;
		}).join("") : "<div class=\"enterprise-empty md:col-span-3\">Chưa tải được danh mục ca làm việc.</div>";
		this.modal.setContent(`
      <div class="enterprise-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">工</div>
          <div class="lead-text">
            <h3>Lao Động Làm Thuê Thời Vụ</h3>
            <div class="text-muted text-sm">Mỗi ca tốn 1 ngày, trả tiền mặt ngay và tăng EXP nghề/thuộc tính. Mệt mỏi từ 100 trở lên sẽ chặn nhận ca.</div>
          </div>
        </div>
        ${o}
        <div class="work-grid">${s}</div>
      </div>
    `), this.modal.getBodyElement()?.querySelectorAll("[data-work-shift]").forEach((e) => {
			e.addEventListener("click", async () => {
				let t = e.dataset.workShift || "";
				e.setAttribute("disabled", "true"), await this.executeWork(t), e.removeAttribute("disabled");
			});
		});
	}
	toast(e, t = !1) {
		typeof window.showToast == "function" && window.showToast(e, t);
	}
	async depositSafeCash(e) {
		let t = document.getElementById(`enterprise-cash-${e}`), n = Number(t?.value || 0);
		!Number.isFinite(n) || n <= 0 || (await E.manageSafeCash(e, "DEPOSIT", Math.round(n)), this.toast("Đã nạp tiền vào Quỹ an toàn."), await this.refreshData(), await this.renderActiveTab());
	}
	async withdrawSafeCash(e) {
		let t = document.getElementById(`enterprise-cash-${e}`), n = Number(t?.value || 0);
		!Number.isFinite(n) || n <= 0 || (await E.manageSafeCash(e, "WITHDRAW", Math.round(n)), this.toast("Đã rút tiền từ Quỹ an toàn về ngân khố."), await this.refreshData(), await this.renderActiveTab());
	}
	async executeWork(e) {
		try {
			let t = await E.executeLaborShift(e);
			this.toast(t.messageVi || t.message || t.narrativeVi || "Lao động hoàn tất, nhận tiền công!"), await this.refreshData(), await this.renderActiveTab();
		} catch (e) {
			this.toast(e.message || "Không thể làm việc lúc này!", !0);
		}
	}
}, j = new A(), M = class {
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
}, N = new M(), P = class e {
	static instance;
	static getInstance() {
		return e.instance ||= new e(), e.instance;
	}
	async getBanquetStatus() {
		return v.get("/api/banquet/status");
	}
	async drinkWine() {
		return v.post("/api/action", {
			type: "PERSONAL_GROWTH",
			sub_type: "REST_RECOVERY",
			fatigue_delta: 25,
			morale_delta: 5,
			memo: "Thưởng thức rượu tại tửu quán",
			idempotencyKey: `tavern-drink-${Date.now()}`
		});
	}
	async hostBanquet(e) {
		return v.post("/api/banquet/host", {
			tier: e,
			idempotencyKey: `banquet-host-${e}-${Date.now()}`
		});
	}
	async swearBrotherhood(e) {
		return v.post("/api/banquet/brotherhood", {
			npcId: e,
			idempotencyKey: `banquet-brotherhood-${e}-${Date.now()}`
		});
	}
	async getArenaRoster() {
		let e = await v.get("/api/duel/arena/roster");
		return { opponents: (Array.isArray(e.roster) ? e.roster : []).map((e) => ({
			id: String(e.opponentId || e.id),
			nameVi: String(e.nameVi || e.name || e.opponentId),
			titleVi: String(e.titleVi || e.tierTitleVi || ""),
			tier: e.tier === 3 || e.tierKey === "TIER_3" ? "CHAMPION" : e.tier === 2 || e.tierKey === "TIER_2" ? "VETERAN" : "NOVICE",
			warAttr: Number(e.war || e.warAttr || 50),
			weaponVi: String(e.descriptionVi || e.weaponVi || ""),
			rewardQian: Number(e.prizeCash || e.rewardQian || 0),
			rewardExp: Number(e.warExpReward || e.rewardExp || 0)
		})) };
	}
	async startDuel(e) {
		let t = (await v.post("/api/duel/initiate", {
			opponentId: e,
			context: "TOURNAMENT_ARENA",
			maxRounds: 5,
			idempotencyKey: `duel-initiate-${e}-${Date.now()}`
		})).duel || {};
		return {
			duelId: String(t.duelId || ""),
			state: t
		};
	}
	async executeDuelRound(e, t) {
		let n = await v.post("/api/duel/round", {
			duelId: e,
			action: t,
			idempotencyKey: `duel-round-${e}-${t}-${Date.now()}`
		});
		return n.duel || n;
	}
	async restAtResidence(e = 1) {
		return v.post("/api/life/act", {
			actionCode: "SLEEP",
			days: e,
			idempotencyKey: `residence-sleep-${Date.now()}`
		});
	}
}.getInstance(), F = class {
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
			let t = await P.startDuel(e);
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
			this.duelState = await P.executeDuelRound(this.currentDuelId, e), this.renderDuel();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Lỗi hiệp đấu!", !0);
		}
	}
}, I = new F(), se = class {
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
			title: "Ngày Tiếp Theo • Dòng Thời Gian",
			subtitle: "Tiến một ngày, chi dùng hằng ngày và tự động chốt tháng khi sang mùng 1",
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
		this.turnModal.setTitle(`Ngày ${t}`, `Nhịp thời gian: ngày ${e} • Chi dùng và tiến trình tự động`), this.turnModal.setContent(`
      <div class="turn-advance-body p-2 space-y-3">
        <div class="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono space-y-1">
          ${n || "\n            <div class=\"text-green-400\">◆ Một ngày trôi qua: lương thảo tiêu hao, thể lực hồi phục.</div>\n            <div class=\"text-amber-300\">◆ Công việc dài ngày và thương đoàn tiếp tục tiến.</div>\n            <div class=\"text-blue-300\">◆ Sang mùng 1, tháng tự động kết toán sản nghiệp và thế giới.</div>\n          "}
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
}, L = new se();
// src/client/features/quests/quest.modal.ts
function R() {
	return window.currentLang === "en";
}
function z(e) {
	return String(e ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function B(e) {
	if (!e || typeof e != "object") return "";
	let t = [];
	if (e.cash && t.push(`+${e.cash} Quan`), e.fame && t.push(`+${e.fame} ${R() ? "fame" : "danh vọng"}`), e.exp) for (let [n, r] of Object.entries(e.exp)) r && t.push(`+${r} ${String(n).toUpperCase()} EXP`);
	if (Array.isArray(e.items)) for (let n of e.items) t.push(`${n.quantity}× ${n.code}`);
	return t.join(" • ");
}
var V = new class {
	modal;
	constructor() {
		this.modal = i({
			id: "quest-modal",
			title: "Nhật Ký Nhiệm Vụ",
			subtitle: "Nhiệm vụ theo từng phẩm lộ, dữ liệu lấy từ DB",
			seal: "任",
			size: "md"
		});
	}
	async open() {
		await this.modal.open(), await this.refresh(null);
	}
	async close() {
		await this.modal.close();
	}
	async load() {
		let e = await (await fetch("/api/quests")).json();
		if (!e.success) throw Error(e.error || "Quest log failed");
		return e.quests || [];
	}
	async loadFarm() {
		let e = await (await fetch("/api/farm/parcels")).json();
		if (!e.success) throw Error(e.error || "Farm board failed");
		return {
			settlementId: e.settlementId || "",
			season: e.season || "",
			parcels: e.parcels || [],
			summary: e.summary || {
				idle: 0,
				leased: 0,
				growing: 0,
				nextHarvest: null
			}
		};
	}
	async loadIntel() {
		let e = await (await fetch("/api/intel")).json();
		if (!e.success) throw Error(e.error || "Intel board failed");
		return e.reports || [];
	}
	async loadContracts() {
		let e = await (await fetch("/api/contracts")).json();
		if (!e.success) throw Error(e.error || "Contract board failed");
		return {
			settlementId: e.settlementId || "",
			offers: e.offers || [],
			contracts: e.contracts || [],
			summary: e.summary || {
				active: 0,
				overdue: 0,
				rewardAtRisk: 0
			}
		};
	}
	async loadObligations() {
		let e = await (await fetch("/api/obligations")).json();
		if (!e.success) throw Error(e.error || "Obligation log failed");
		return {
			obligations: e.obligations || [],
			summary: e.summary || {
				dueCount: 0,
				overdueCount: 0,
				totalCashDue: 0,
				totalGrainDue: 0,
				nextDueDate: null
			}
		};
	}
	async refresh(e) {
		try {
			let [t, n, r, i, a] = await Promise.all([
				this.load(),
				this.loadObligations().catch(() => ({
					obligations: [],
					summary: {
						dueCount: 0,
						overdueCount: 0,
						totalCashDue: 0,
						totalGrainDue: 0,
						nextDueDate: null
					}
				})),
				this.loadContracts().catch(() => ({
					settlementId: "",
					offers: [],
					contracts: [],
					summary: {
						active: 0,
						overdue: 0,
						rewardAtRisk: 0
					}
				})),
				this.loadIntel().catch(() => []),
				this.loadFarm().catch(() => ({
					settlementId: "",
					season: "",
					parcels: [],
					summary: {
						idle: 0,
						leased: 0,
						growing: 0,
						nextHarvest: null
					}
				}))
			]);
			this.modal.setContent(this.render(t, n.obligations, n.summary, r, i, a, e));
		} catch (e) {
			this.modal.setContent(`<div class="quest-empty">${z(e.message)}</div>`);
		}
	}
	async accept(e) {
		try {
			let t = await (await fetch("/api/quests/accept", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ questId: e })
			})).json();
			if (!t.success) throw Error(t.error || "Accept failed");
			await this.refresh(null);
		} catch (e) {
			window.showToast?.(e.message, !0);
		}
	}
	async advance(e) {
		try {
			let t = await (await fetch("/api/quests/advance", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ questId: e })
			})).json();
			if (!t.success) throw Error(t.error || "Advance failed");
			await this.refresh(t.result), window.loadStatus?.();
		} catch (e) {
			window.showToast?.(e.message, !0);
		}
	}
	async payObligation(e) {
		try {
			let t = await (await fetch("/api/obligations/pay", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ obligationId: e })
			})).json();
			if (!t.success) throw Error(t.error || "Payment failed");
			await this.refresh(null), window.loadStatus?.();
		} catch (e) {
			window.showToast?.(e.message, !0);
		}
	}
	async acceptContract(e) {
		try {
			let t = await (await fetch("/api/contracts/accept", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ offerId: e })
			})).json();
			if (!t.success) throw Error(t.error || "Accept contract failed");
			await this.refresh(null);
		} catch (e) {
			window.showToast?.(e.message, !0);
		}
	}
	async rentFarm(e) {
		try {
			let t = await (await fetch("/api/farm/rent", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ parcelId: e })
			})).json();
			if (!t.success) throw Error(t.error || "Rent failed");
			await this.refresh(null), window.loadStatus?.();
		} catch (e) {
			window.showToast?.(e.message, !0);
		}
	}
	async plantCrop(e, t) {
		try {
			let n = await (await fetch("/api/farm/plant", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					parcelId: e,
					cropCode: t
				})
			})).json();
			if (!n.success) throw Error(n.error || "Plant failed");
			await this.refresh(null), window.loadStatus?.();
		} catch (e) {
			window.showToast?.(e.message, !0);
		}
	}
	async harvestFarm(e) {
		try {
			let t = await (await fetch("/api/farm/harvest", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ parcelId: e })
			})).json();
			if (!t.success) throw Error(t.error || "Harvest failed");
			await this.refresh(null), window.loadStatus?.();
		} catch (e) {
			window.showToast?.(e.message, !0);
		}
	}
	async verifyIntel(e) {
		try {
			let t = await (await fetch("/api/intel/verify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ reportId: e })
			})).json();
			if (!t.success) throw Error(t.error || "Verify intel failed");
			await this.refresh(null), window.loadStatus?.();
		} catch (e) {
			window.showToast?.(e.message, !0);
		}
	}
	async deliverContract(e) {
		try {
			let t = await (await fetch("/api/contracts/deliver", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ contractId: e })
			})).json();
			if (!t.success) throw Error(t.error || "Deliver contract failed");
			await this.refresh(null), window.loadStatus?.();
		} catch (e) {
			window.showToast?.(e.message, !0);
		}
	}
	renderContracts(e, t) {
		let n = e.offers || [], r = (e.contracts || []).filter((e) => e.status === "ACTIVE");
		if (n.length === 0 && r.length === 0) return `<div class="quest-empty">${t ? "No contracts posted." : "Chưa có hợp đồng."}</div>`;
		let i = t ? `Contracts • ${e.settlementId} • ${r.length} active` : `Hợp đồng • ${e.settlementId} • ${r.length} đang chạy`, a = n.map((e) => `
      <div class="quest-item">
        <div class="quest-head">
          <div>
            <div class="quest-title">${z(t ? e.itemNameEn : e.itemNameVi)} × ${e.quantity}</div>
            <div class="quest-path">${z(e.rewardCash)} Quan • +${e.rewardFame} ${t ? "fame" : "danh vọng"} • ${t ? "by" : "hạn"} ${z(e.expiresDate)}</div>
          </div>
          <button class="quest-action" onclick="QuestUI.acceptContract('${z(e.offerId)}')">${t ? "Accept" : "Nhận"}</button>
        </div>
        <div class="quest-desc">${z(t ? e.narrativeEn : e.narrativeVi)}</div>
      </div>
    `).join(""), o = r.map((e) => {
			let n = e.haveQuantity >= e.quantity, r = e.daysRemaining < 0;
			return `
        <div class="quest-item">
          <div class="quest-head">
            <div>
              <div class="quest-title">${z(t ? e.itemNameEn : e.itemNameVi)} ${e.haveQuantity}/${e.quantity}</div>
              <div class="quest-path">${z(e.rewardCash)} Quan • ${t ? "due" : "hạn"} ${z(e.dueDate)}${r ? ` • ${t ? "late" : "quá hạn"}` : ""}</div>
            </div>
            <button class="quest-action ${n ? "is-primary" : ""}" onclick="QuestUI.deliverContract('${z(e.contractId)}')">${t ? "Deliver" : "Giao"}</button>
          </div>
        </div>
      `;
		}).join("");
		return `
      <div class="quest-section">
        <div class="quest-section-title">${z(i)}</div>
        ${o}${a}
      </div>
    `;
	}
	renderFarm(e, t) {
		if (!e.parcels || e.parcels.length === 0) return `<div class="quest-empty">${t ? "No farmland here." : "Không có ruộng ở đây."}</div>`;
		let n = e.parcels.map((e) => {
			let n = t ? e.nameEn : e.nameVi, r = "";
			if (e.status === "IDLE") r = `<button class="quest-action" onclick="QuestUI.rentFarm('${z(e.parcelId)}')">${t ? "Rent" : "Thuê"} (${e.rentCash} Quan)</button>`;
			else if (e.status === "LEASED") {
				let n = (e.availableCrops || []).filter((e) => e.inSeason);
				r = n.length > 0 ? n.map((n) => `<button class="quest-action" onclick="QuestUI.plantCrop('${z(e.parcelId)}','${z(n.cropCode)}')">${t ? `Plant ${n.nameEn}` : `Trồng ${n.nameVi}`}</button>`).join(" ") : `<span class="quest-badge">${t ? "Out of season" : "Trái mùa"}</span>`;
			} else e.status === "GROWING" && e.crop && (r = `<button class="quest-action ${e.crop.daysRemaining <= 0 ? "is-primary" : ""}" onclick="QuestUI.harvestFarm('${z(e.parcelId)}')">${t ? "Harvest" : "Thu hoạch"}</button>`);
			let i = e.crop ? `${z(e.crop.nameVi)} • ${t ? "harvest" : "thu"} ${z(e.crop.harvestDate)} • ${e.crop.daysRemaining}${t ? "d" : " ngày"} • ${t ? "yield" : "dự kiến"} ${e.crop.expectedYield}` : `${e.areaMu} ${t ? "mu" : "mẫu"} • ${t ? "soil" : "đất"} ${e.soilQuality.toFixed(2)} • ${t ? "rent" : "tô"} ${e.rentCash} Quan${(e.rentDiscount || 0) > 0 ? ` (-${e.rentDiscount}%)` : ""}`;
			return `
        <div class="quest-item">
          <div class="quest-head">
            <div>
              <div class="quest-title">${z(n)}</div>
              <div class="quest-path">${i}</div>
            </div>
            ${r}
          </div>
        </div>
      `;
		}).join("");
		return `
      <div class="quest-section">
        <div class="quest-section-title">${t ? `Farmland • ${e.season} • ${e.summary.growing} growing` : `Nông Trại • ${e.season} • ${e.summary.growing} vụ`}</div>
        ${n}
      </div>
    `;
	}
	renderIntel(e, t) {
		if (!e || e.length === 0) return `<div class="quest-empty">${t ? "No reports this month." : "Không có tin đồn tháng này."}</div>`;
		let n = e.map((e) => {
			let n = e.subjectType === "PRICE" ? t ? `${e.claim.price} quan` : `${e.claim.price} Quan` : t ? `${e.claim.troops} troops` : `${e.claim.troops} binh`;
			return `
        <div class="quest-item">
          <div class="quest-head">
            <div>
              <div class="quest-title">${z(e.subjectName)}</div>
              <div class="quest-path">${z(e.subjectType)} • ${z(n)} • ${z(e.source)} • ${z(e.confidenceLabel)}</div>
            </div>
            <button class="quest-action" onclick="QuestUI.verifyIntel('${z(e.reportId)}')">${t ? `Verify (${e.verificationDays}d)` : `Xác minh (${e.verificationDays} ngày)`}</button>
          </div>
          <div class="quest-path">${t ? "Expires" : "Hết hạn"} ${z(e.expiresDate)}</div>
        </div>
      `;
		}).join("");
		return `
      <div class="quest-section">
        <div class="quest-section-title">${t ? `Intel • ${e.length} reports` : `Tin đồn • ${e.length} báo cáo`}</div>
        ${n}
      </div>
    `;
	}
	renderObligations(e, t, n) {
		let r = e.filter((e) => e.status === "DUE" || e.status === "OVERDUE");
		if (r.length === 0) return `<div class="quest-empty">${n ? "No obligations due." : "Không có nghĩa vụ đến hạn."}</div>`;
		let i = n ? `Obligations • ${t.totalCashDue} quan due${t.overdueCount ? ` • ${t.overdueCount} overdue` : ""}` : `Nghĩa vụ • ${t.totalCashDue} Quan đến hạn${t.overdueCount ? ` • ${t.overdueCount} quá hạn` : ""}`, a = r.map((e) => {
			let t = e.status === "OVERDUE", r = t ? n ? "Overdue" : "Quá hạn" : n ? "Due" : "Đến hạn", i = t ? n ? `${Math.abs(e.daysRemaining)} days late` : `Trễ ${Math.abs(e.daysRemaining)} ngày` : n ? `${e.daysRemaining} days left` : `Còn ${e.daysRemaining} ngày`, a = e.amountGrain > 0 ? `${e.amountCash} Quan + ${e.amountGrain} ${n ? "piculs" : "Thạch"}` : `${e.amountCash} Quan`;
			return `
        <div class="quest-item">
          <div class="quest-head">
            <div>
              <div class="quest-title">${z((n ? e.narrativeEn : e.narrativeVi) || e.type)}</div>
              <div class="quest-path">${z(e.type)} • ${z(e.dueDate)} • ${z(i)}</div>
            </div>
            <button class="quest-action ${t ? "is-primary" : ""}" onclick="QuestUI.payObligation('${z(e.obligationId)}')">${n ? "Pay" : "Nộp"}</button>
          </div>
          <div class="quest-meta">${z(a)}</div>
          <div class="quest-path"><span class="quest-badge">${r}</span></div>
        </div>
      `;
		}).join("");
		return `
      <div class="quest-section">
        <div class="quest-section-title">${z(i)}</div>
        ${a}
      </div>
    `;
	}
	render(e, t, n, r, i, a, o) {
		let s = R(), c = o ? `
      <div class="quest-result ${o.success ? "is-success" : "is-failure"}">
        <strong>${o.success ? s ? "Step succeeded" : "Bước thành công" : s ? "Step failed" : "Bước thất bại"}</strong>
        <div>${z(s ? o.narrativeEn : o.narrative)}</div>
        <div class="quest-meta">D20 ${o.roll} + ${o.mod} = ${o.total} / DC ${o.dc}</div>
        <div class="quest-meta">${z(B(o.rewards || {}))}</div>
      </div>
    ` : "", l = e.map((e) => {
			let t = e.status === "COMPLETED" ? s ? "Completed" : "Đã hoàn thành" : e.status === "ACTIVE" ? s ? "Active" : "Đang làm" : s ? "Available" : "Có thể nhận", n = e.steps.map((t) => `
        <div class="quest-step ${t.index < e.currentStep ? "is-done" : t.index === e.currentStep && e.status === "ACTIVE" ? "is-current" : ""}">
          <span class="quest-step-index">${t.index + 1}</span>
          <span class="quest-step-title">${z(s ? t.titleEn : t.titleVi)}</span>
          <span class="quest-step-check">${z(String(t.stat).toUpperCase())} DC ${t.dc} • ${t.daysCost}${s ? "d" : " ngày"}</span>
        </div>
      `).join(""), r = e.status === "AVAILABLE" ? `<button class="quest-action" onclick="QuestUI.accept('${z(e.questId)}')">${s ? "Accept" : "Nhận nhiệm vụ"}</button>` : e.status === "ACTIVE" ? `<button class="quest-action is-primary" onclick="QuestUI.advance('${z(e.questId)}')">${s ? `Advance step ${e.currentStep + 1}` : `Thực hiện bước ${e.currentStep + 1}`}</button>` : `<span class="quest-badge">${s ? "Completed" : "Hoàn thành"}</span>`;
			return `
        <div class="quest-item">
          <div class="quest-head">
            <div>
              <div class="quest-title">${z(s ? e.titleEn : e.titleVi)}</div>
              <div class="quest-path">${z(e.pathCode)} • ${t}</div>
            </div>
            ${r}
          </div>
          <div class="quest-desc">${z(s ? e.descriptionEn : e.descriptionVi)}</div>
          <div class="quest-steps">${n}</div>
        </div>
      `;
		}).join("");
		return `<div class="quest-body">${c}${this.renderObligations(t, n, s)}${this.renderContracts(r, s)}${this.renderFarm(a, s)}${this.renderIntel(i, s)}${l || `<div class="quest-empty">${s ? "No quests available." : "Chưa có nhiệm vụ."}</div>`}</div>`;
	}
}(), H = class e {
	static instance;
	static getInstance() {
		return e.instance ||= new e(), e.instance;
	}
	async getStall(e = "PLY-0001") {
		return (await v.get("/api/stall", { characterId: e })).stall || null;
	}
	async getOffers(e) {
		return (await v.get("/api/market/npc-offers", e ? { settlementId: e } : void 0)).offers || [];
	}
	async getWarehouses() {
		return (await v.get("/api/warehouses", { characterId: "PLY-0001" })).warehouses || [];
	}
	async rentWarehouse(e) {
		return v.post("/api/warehouses/rent", {
			settlementId: e,
			idempotencyKey: `warehouse-rent-${Date.now()}`
		});
	}
	async buyWarehouse(e) {
		return v.post("/api/warehouses/buy", {
			settlementId: e,
			idempotencyKey: `warehouse-buy-${Date.now()}`
		});
	}
	async deposit(e, t, n) {
		return v.post("/api/warehouses/deposit", {
			warehouseId: e,
			itemCode: t,
			quantity: n,
			idempotencyKey: `warehouse-deposit-${Date.now()}`
		});
	}
	async withdraw(e, t, n) {
		return v.post("/api/warehouses/withdraw", {
			warehouseId: e,
			itemCode: t,
			quantity: n,
			idempotencyKey: `warehouse-withdraw-${Date.now()}`
		});
	}
	async renewWarehouse(e) {
		return v.post("/api/warehouses/renew", {
			warehouseId: e,
			idempotencyKey: `warehouse-renew-${e}-${Date.now()}`
		});
	}
	async openStall(e) {
		return v.post("/api/stall/open", {
			settlementId: e,
			idempotencyKey: `stall-open-${Date.now()}`
		});
	}
	async listItem(e, t, n, r = "BAG", i, a) {
		return v.post("/api/stall/list", {
			itemCode: e,
			quantity: t,
			unitPrice: n,
			source: r,
			warehouseId: i,
			stallId: a,
			idempotencyKey: `stall-list-${e}-${Date.now()}`
		});
	}
	async closeStall(e) {
		return v.post("/api/stall/close", {
			stallId: e,
			idempotencyKey: `stall-close-${Date.now()}`
		});
	}
	async buyOffer(e, t) {
		return v.post("/api/market/npc-offers/buy", {
			offerId: e,
			quantity: t,
			idempotencyKey: `offer-buy-${e}-${Date.now()}`
		});
	}
	async getFreightContracts(e) {
		return (await v.get("/api/freight/contracts", e ? { settlementId: e } : void 0)).contracts || [];
	}
	async getFreightShipments() {
		return (await v.get("/api/freight/shipments")).shipments || [];
	}
	async acceptFreight(e, t = "VETERAN", n = !1) {
		return v.post("/api/freight/accept", {
			contractId: e,
			guardTier: t,
			insurance: n,
			idempotencyKey: `freight-accept-${e}-${Date.now()}`
		});
	}
	async deliverFreight(e) {
		return v.post("/api/freight/deliver", {
			shipmentId: e,
			idempotencyKey: `freight-deliver-${e}-${Date.now()}`
		});
	}
	async getMerchantRoutes() {
		return (await v.get("/api/merchant/routes")).routes || [];
	}
	async getMerchantEvents() {
		return (await v.get("/api/merchant/events")).events || [];
	}
	async createMerchantRoute(e) {
		return v.post("/api/merchant/routes", {
			...e,
			idempotencyKey: `merchant-route-create-${e.fromWarehouseId}-${e.toWarehouseId}-${Date.now()}`
		});
	}
	async setMerchantRouteStatus(e, t) {
		return v.post(`/api/merchant/routes/${e}/status`, {
			status: t,
			idempotencyKey: `merchant-route-${e}-${t}-${Date.now()}`
		});
	}
}.getInstance();
// src/client/features/market-stall/market-stall.modal.ts
function U(e) {
	return String(e ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function W(e, t = !1) {
	typeof window.showToast == "function" && window.showToast(e, t);
}
var G = new class {
	modal;
	stall = null;
	offers = [];
	warehouses = [];
	freightContracts = [];
	freightShipments = [];
	merchantRoutes = [];
	merchantEvents = [];
	constructor() {
		this.modal = i({
			id: "market-stall-modal",
			title: "Chợ & Quầy Bán",
			subtitle: "Niêm yết hàng cho NPC trong thành và mua lại hàng NPC đang bán",
			seal: "市",
			size: "lg",
			tabs: [
				{
					id: "stall",
					label: "Quầy Của Ta",
					seal: "攤"
				},
				{
					id: "offers",
					label: "Hàng NPC Bán",
					seal: "貨"
				},
				{
					id: "warehouse",
					label: "Kho Thành",
					seal: "倉"
				},
				{
					id: "logistics",
					label: "Vận Chuyển",
					seal: "運"
				}
			],
			activeTabId: "stall",
			onOpen: async () => {
				await this.refresh(), this.render();
			},
			onTabChange: async () => {
				this.render();
			}
		});
	}
	async open(e = "stall") {
		await this.modal.open(e);
	}
	async close() {
		await this.modal.close();
	}
	async refresh() {
		this.stall = await H.getStall("PLY-0001"), this.offers = await H.getOffers(this.stall?.settlementId), this.warehouses = await H.getWarehouses();
		let [e, t, n, r] = await Promise.all([
			H.getFreightContracts(this.stall?.settlementId).catch(() => []),
			H.getFreightShipments().catch(() => []),
			H.getMerchantRoutes().catch(() => []),
			H.getMerchantEvents().catch(() => [])
		]);
		this.freightContracts = e, this.freightShipments = t, this.merchantRoutes = n, this.merchantEvents = r;
	}
	render() {
		let e = this.modal.activeTab || "stall";
		e === "offers" ? this.modal.setContent(this.renderOffers()) : e === "warehouse" ? this.modal.setContent(this.renderWarehouses()) : e === "logistics" ? this.modal.setContent(this.renderLogistics()) : this.modal.setContent(this.renderStall()), this.bind();
	}
	renderStall() {
		if (!this.stall) return "\n        <div class=\"journal-modal-content\">\n          <div class=\"spatial-banner-lead\">\n            <div class=\"lead-seal\">市</div>\n            <div class=\"lead-text\">\n              <h3>Chưa Có Quầy</h3>\n              <div class=\"text-muted text-sm\">Mở quầy tại thành đang đứng (phí 20 Quan) để NPC trong thành mua hàng mỗi ngày.</div>\n            </div>\n          </div>\n          <button class=\"ui-btn ui-btn--primary\" data-stall-action=\"open\">Mở Quầy</button>\n        </div>\n      ";
		let e = this.stall.listings.length > 0 ? this.stall.listings.map((e) => {
			let t = e.marketPrice > 0 ? Math.round((e.unitPrice / e.marketPrice - 1) * 100) : 0;
			return `
          <div class="flex justify-between items-center text-[11px] border-b border-slate-800 py-1.5">
            <span class="text-slate-200">${U(e.itemNameVi)} × ${e.quantity}</span>
            <span class="font-mono text-amber-300">${e.unitPrice} Quan (${t >= 0 ? "+" : ""}${t}% chợ)</span>
          </div>
        `;
		}).join("") : "<div class=\"text-muted text-xs\">Quầy chưa có hàng.</div>", t = this.stall.recentSales.length > 0 ? this.stall.recentSales.map((e) => `
        <div class="flex justify-between text-[11px] py-1">
          <span class="text-slate-300">${U(e.npcNameVi)} mua ${e.quantity} ${U(e.itemCode)}</span>
          <span class="font-mono text-green-400">+${e.totalCash} Quan</span>
        </div>
      `).join("") : "<div class=\"text-muted text-xs\">Chưa có giao dịch.</div>";
		return `
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">攤</div>
          <div class="lead-text">
            <h3>${U(this.stall.nameVi)}</h3>
            <div class="text-muted text-sm">${U(this.stall.settlementId)} • Hàng đang bán: ${this.stall.listings.length} • NPC sẽ mua mỗi ngày nếu giá ≤ 115% giá chợ.</div>
          </div>
        </div>

        <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 mb-3">
          <div class="text-xs font-bold text-amber-200 mb-2">Niêm Yết Hàng</div>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-2 text-[11px]">
            <input id="stall-item-code" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" placeholder="Mã hàng, vd COM-GRAIN" value="COM-GRAIN" />
            <input id="stall-item-qty" type="number" min="1" step="1" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="5" />
            <input id="stall-item-price" type="number" min="1" step="1" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="50" />
            <button class="ui-btn ui-btn--primary ui-btn--sm" data-stall-action="list">Niêm Yết</button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] mt-2">
            <input id="stall-source" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="BAG" placeholder="BAG hoặc WAREHOUSE" />
            <input id="stall-warehouse" list="stall-warehouse-list" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" placeholder="Mã kho (nếu lấy từ kho)" />
            <datalist id="stall-warehouse-list">
              ${this.warehouses.filter((e) => e.settlementId === this.stall?.settlementId).map((e) => `<option value="${U(e.warehouseId)}">${U(e.nameVi)} (${e.usedCapacity}/${e.capacity})</option>`).join("")}
            </datalist>
          </div>
          <div class="text-muted text-[10px] mt-1">Giá thấp hơn 115% giá chợ thì NPC mua nhanh hơn; giá quá cao sẽ không có người mua.</div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
            <div class="text-xs font-bold text-amber-200 mb-2">Hàng Đang Bán</div>
            ${e}
            <button class="ui-btn ui-btn--ghost ui-btn--sm mt-2" data-stall-action="close">Đóng Quầy & Trả Hàng</button>
          </div>
          <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
            <div class="text-xs font-bold text-amber-200 mb-2">Giao Dịch Gần Đây</div>
            ${t}
          </div>
        </div>
      </div>
    `;
	}
	renderWarehouses() {
		return `
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">倉</div>
          <div class="lead-text">
            <h3>Kho Theo Thành</h3>
            <div class="text-muted text-sm">Kho tách khỏi túi nhân. Thuê 300 Quan / 90 ngày; mua 2.000 Quan.</div>
          </div>
        </div>
        <div class="flex gap-2 mb-3">
          <button class="ui-btn ui-btn--primary ui-btn--sm" data-warehouse-action="rent">Thuê kho tại thành hiện tại</button>
          <button class="ui-btn ui-btn--ghost ui-btn--sm" data-warehouse-action="buy">Mua kho tại thành hiện tại</button>
        </div>
        ${this.warehouses.length > 0 ? this.warehouses.map((e) => `
        <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 mb-2">
          <div class="flex justify-between items-center">
            <div>
              <div class="text-sm font-bold text-slate-200">${U(e.nameVi)} • ${U(e.ownershipType)}</div>
              <div class="text-[11px] text-muted">${U(e.settlementId)} • ${e.usedCapacity}/${e.capacity} • ${e.status}${e.leaseUntil ? ` • hết hạn ${U(e.leaseUntil)}` : ""}</div>
            </div>
            <div class="flex gap-1">
              ${e.ownershipType === "RENTED" ? `<button class="ui-btn ui-btn--primary ui-btn--sm" data-warehouse-action="renew" data-warehouse-id="${U(e.warehouseId)}" title="Cộng thêm 90 ngày từ hạn hiện tại">Gia hạn</button>` : ""}
              <button class="ui-btn ui-btn--ghost ui-btn--sm" data-warehouse-action="withdraw" data-warehouse-id="${U(e.warehouseId)}">Rút hàng</button>
            </div>
          </div>
        </div>
      `).join("") : "<div class=\"text-muted text-sm mb-2\">Chưa có kho. Thuê kho tại thành đang đứng để mở kho địa phương.</div>"}
        <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
          <div class="text-xs font-bold text-amber-200 mb-2">Nạp / Rút Kho</div>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-2 text-[11px]">
            <input id="warehouse-id" list="warehouse-id-list" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" placeholder="Mã kho" />
            <datalist id="warehouse-id-list">
              ${this.warehouses.map((e) => `<option value="${U(e.warehouseId)}">${U(e.nameVi)}</option>`).join("") || "<option value=\"\">Chưa có kho</option>"}
            </datalist>
            <input id="warehouse-item" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="COM-GRAIN" placeholder="Mã hàng" />
            <input id="warehouse-qty" type="number" min="1" step="1" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="10" />
            <div class="flex gap-2">
              <button class="ui-btn ui-btn--primary ui-btn--sm flex-1" data-warehouse-action="deposit">Nạp</button>
              <button class="ui-btn ui-btn--ghost ui-btn--sm flex-1" data-warehouse-action="withdraw-form">Rút</button>
            </div>
          </div>
        </div>
      </div>
    `;
	}
	renderOffers() {
		return this.offers.length === 0 ? "<div class=\"journal-modal-content\"><div class=\"text-muted text-sm\">Thành này chưa có NPC nào đăng bán. Hãy đi sang ngày khác hoặc tới thành khác.</div></div>" : `
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">貨</div>
          <div class="lead-text">
            <h3>Hàng NPC Đang Bán</h3>
            <div class="text-muted text-sm">Giá dao động 85%–125% quanh giá chợ địa phương. Mua xong hàng vào kho, NPC nhận tiền.</div>
          </div>
        </div>
        <div class="space-y-2">
          ${this.offers.map((e) => `
            <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 flex justify-between items-center gap-3">
              <div>
                <div class="text-sm font-bold text-slate-200">${U(e.itemNameVi)} × ${e.quantity}</div>
                <div class="text-[11px] text-muted">${U(e.npcNameVi)} • ${e.unitPrice} Quan (${e.priceDeltaPct >= 0 ? "+" : ""}${e.priceDeltaPct}% chợ) • hết hạn ${U(e.expiresDate)}</div>
              </div>
              <button class="ui-btn ui-btn--primary ui-btn--sm" data-offer-buy="${U(e.offerId)}">Mua 1</button>
            </div>
          `).join("")}
        </div>
      </div>
    `;
	}
	renderLogistics() {
		let e = this.freightContracts.length > 0 ? this.freightContracts.map((e) => `
        <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 mb-2">
          <div class="flex justify-between items-start gap-3">
            <div>
              <div class="text-sm font-bold text-slate-200">${U(e.itemCode)} × ${e.quantity}</div>
              <div class="text-[11px] text-muted">${U(e.fromSettlementId)} → ${U(e.toSettlementId)} • thưởng ${e.rewardCash} Quan • còn ${e.daysLeft} ngày • đi ${e.travelDays} ngày</div>
            </div>
            <label class="text-[10px] text-slate-300 flex items-center gap-1">
              <input type="checkbox" data-freight-insurance="${U(e.contractId)}" /> Bảo hiểm +4%
            </label>
          </div>
          <div class="flex gap-1 mt-2">
            <button class="ui-btn ui-btn--ghost ui-btn--sm" data-freight-accept data-contract-id="${U(e.contractId)}" data-guard-tier="MILITIA">Dân Dũng</button>
            <button class="ui-btn ui-btn--primary ui-btn--sm" data-freight-accept data-contract-id="${U(e.contractId)}" data-guard-tier="VETERAN">Thiện Chiến</button>
            <button class="ui-btn ui-btn--ghost ui-btn--sm" data-freight-accept data-contract-id="${U(e.contractId)}" data-guard-tier="ELITE_RETINUE">Tinh Nhuệ</button>
          </div>
        </div>
      `).join("") : "<div class=\"text-muted text-sm mb-2\">Thành này chưa có hợp đồng vận chuyển.</div>", t = this.freightShipments.length > 0 ? this.freightShipments.map((e) => `
        <div class="flex justify-between items-center text-[11px] border-b border-slate-800 py-1.5 gap-2">
          <div>
            <div class="text-slate-200">${U(e.itemCode)} × ${e.quantity} • ${U(e.status)}</div>
            <div class="text-muted">${e.status === "ARRIVED" ? "Đã đến đích" : `Còn ${e.daysRemaining} ngày`} • ${U(e.guardTier)}${e.insured ? " • có bảo hiểm" : ""}${e.ambushLossQuantity > 0 ? ` • mất ${e.ambushLossQuantity} do phục kích` : ""}</div>
          </div>
          ${e.status === "ARRIVED" ? `<button class="ui-btn ui-btn--primary ui-btn--sm" data-freight-deliver="${U(e.shipmentId)}">Giao hàng</button>` : ""}
        </div>
      `).join("") : "<div class=\"text-muted text-sm mb-2\">Không có chuyến hàng đang chạy.</div>", n = this.merchantRoutes.length > 0 ? this.merchantRoutes.map((e) => {
			let t = (e.items && e.items.length > 0 ? e.items : [{
				itemCode: e.itemCode,
				quantityPerRun: e.quantityPerRun
			}]).map((e) => `${U(e.itemCode)}×${e.quantityPerRun}`).join(", ");
			return `
        <div class="flex justify-between items-center text-[11px] border-b border-slate-800 py-1.5 gap-2">
          <div>
            <div class="text-slate-200">${U(e.nameVi)} • ${t}</div>
            <div class="text-muted">${U(e.fromSettlementId)} → ${U(e.toSettlementId)} • ${U(e.status)} • mỗi ${e.frequencyDays} ngày</div>
          </div>
          <button class="ui-btn ui-btn--ghost ui-btn--sm" data-route-status data-route-id="${U(e.routeId)}" data-next-status="${e.status === "ACTIVE" ? "PAUSED" : "ACTIVE"}">
            ${e.status === "ACTIVE" ? "Tạm Dừng" : "Tiếp Tục"}
          </button>
        </div>
      `;
		}).join("") : "<div class=\"text-muted text-sm\">Chưa có thương lộ tự động.</div>", r = this.merchantEvents.length > 0 ? this.merchantEvents.slice(0, 5).map((e) => `
        <div class="text-[11px] border-b border-slate-800 py-1">
          <span class="text-slate-300">${U(e.eventType || e.event_type)}</span>
          <span class="text-muted"> • ${U(e.gameDate || e.game_date || "")} • ${U(e.itemCode || e.item_code || "")}</span>
        </div>
      `).join("") : "<div class=\"text-muted text-sm\">Chưa có biến cố thương lộ.</div>", i = this.warehouses.map((e) => `<option value="${U(e.warehouseId)}">${U(e.nameVi)} (${U(e.settlementId)})</option>`).join(""), a = this.warehouses.length >= 2;
		return `
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">運</div>
          <div class="lead-text">
            <h3>Vận Chuyển & Thương Lộ</h3>
            <div class="text-muted text-sm">Hợp đồng freight trả phí theo chuyến; thương lộ tự động mua – chở – bán giữa hai kho. Hộ vệ yếu có thể bị ổ phỉ phục kích.</div>
          </div>
        </div>

        ${`
      <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 mb-3">
        <div class="text-xs font-bold text-amber-200 mb-2">Mở Thương Lộ Tự Động</div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-2 text-[11px] mb-2">
          <select id="route-from" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200">${i}</select>
          <select id="route-to" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200">${i}</select>
          <input id="route-freq" type="number" min="1" step="1" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="7" placeholder="Ngày/chuyến" />
          <select id="route-guard" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200">
            <option value="MILITIA">Dân Dũng</option>
            <option value="VETERAN" selected>Thiện Chiến</option>
            <option value="ELITE_RETINUE">Tinh Nhuệ</option>
          </select>
        </div>
        <div class="route-items-head text-[11px] text-muted mb-1">Mặt hàng · SL/chuyến · Giá mua trần · Giá bán sàn</div>
        <div id="route-items" class="route-items">
          <div class="route-item-row">
            <input data-route-field="item" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="COM-GRAIN" placeholder="Mã hàng" />
            <input data-route-field="qty" type="number" min="1" step="1" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="10" />
            <input data-route-field="buy" type="number" min="1" step="1" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="50" placeholder="Mua trần" />
            <input data-route-field="sell" type="number" min="1" step="1" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="100" placeholder="Bán sàn" />
            <button class="ui-btn ui-btn--ghost ui-btn--sm" data-route-remove-item title="Xóa mặt hàng">×</button>
          </div>
        </div>
        <button class="ui-btn ui-btn--ghost ui-btn--sm mt-1" data-route-add-item>+ Mặt hàng</button>
        <div class="flex justify-between items-center mt-2 gap-2">
          <div class="text-muted text-[11px]">${a ? "Kho nguồn và kho đích phải khác thành; giá bán sàn phải cao hơn giá mua trần." : "Cần ít nhất 2 kho ở hai thành khác nhau."}</div>
          <button class="ui-btn ui-btn--primary ui-btn--sm" data-route-create ${a ? "" : "disabled"}>Mở Thương Lộ</button>
        </div>
      </div>
    `}

        <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 mb-3">
          <div class="text-xs font-bold text-amber-200 mb-2">Hợp Đồng Vận Chuyển</div>
          ${e}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
            <div class="text-xs font-bold text-amber-200 mb-2">Chuyến Hàng Của Ta</div>
            ${t}
          </div>
          <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
            <div class="text-xs font-bold text-amber-200 mb-2">Thương Lộ Tự Động</div>
            ${n}
          </div>
        </div>

        <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 mt-3">
          <div class="text-xs font-bold text-amber-200 mb-2">Biến Cố Gần Đây</div>
          ${r}
        </div>
      </div>
    `;
	}
	bind() {
		let e = this.modal.getBodyElement();
		if (!e) return;
		e.querySelectorAll("[data-stall-action]").forEach((t) => {
			t.addEventListener("click", async () => {
				let n = t.dataset.stallAction;
				t.setAttribute("disabled", "true");
				try {
					if (n === "open") await H.openStall(), W("Đã mở quầy.");
					else if (n === "list") {
						let t = e.querySelector("#stall-item-code")?.value.trim() || "", n = Number(e.querySelector("#stall-item-qty")?.value || 0), r = Number(e.querySelector("#stall-item-price")?.value || 0), i = (e.querySelector("#stall-source")?.value || "BAG").toUpperCase(), a = e.querySelector("#stall-warehouse")?.value || void 0;
						await H.listItem(t, n, r, i, a, this.stall?.stallId), W(`Đã niêm yết ${n} ${t}.`);
					} else n === "close" && (await H.closeStall(this.stall?.stallId), W("Đã đóng quầy và trả hàng về kho."));
					await this.refresh(), this.render();
				} catch (e) {
					t.removeAttribute("disabled"), W(e.message || "Thao tác quầy thất bại.", !0);
				}
			});
		}), e.querySelectorAll("[data-offer-buy]").forEach((e) => {
			e.addEventListener("click", async () => {
				let t = e.dataset.offerBuy || "";
				e.setAttribute("disabled", "true");
				try {
					await H.buyOffer(t, 1), W("Đã mua hàng từ NPC."), await this.refresh(), this.render();
				} catch (t) {
					e.removeAttribute("disabled"), W(t.message || "Mua hàng thất bại.", !0);
				}
			});
		}), e.querySelectorAll("[data-warehouse-action]").forEach((t) => {
			t.addEventListener("click", async () => {
				let n = t.dataset.warehouseAction || "", r = t.dataset.warehouseId || e.querySelector("#warehouse-id")?.value || "", i = e.querySelector("#warehouse-item")?.value.trim() || "COM-GRAIN", a = Number(e.querySelector("#warehouse-qty")?.value || 1);
				t.setAttribute("disabled", "true");
				try {
					n === "rent" ? (await H.rentWarehouse(), W("Đã thuê kho tại thành hiện tại.")) : n === "buy" ? (await H.buyWarehouse(), W("Đã mua kho tại thành hiện tại.")) : n === "renew" ? W(`Đã gia hạn kho đến ${(await H.renewWarehouse(r))?.result?.leaseUntil || "hạn mới"}.`) : n === "deposit" ? (await H.deposit(r, i, a), W(`Đã nạp ${a} ${i} vào kho.`)) : (await H.withdraw(r, i, a), W(`Đã rút ${a} ${i} khỏi kho.`)), await this.refresh(), this.render();
				} catch (e) {
					t.removeAttribute("disabled"), W(e.message || "Thao tác kho thất bại.", !0);
				}
			});
		}), e.querySelectorAll("[data-freight-accept]").forEach((t) => {
			t.addEventListener("click", async () => {
				let n = t.dataset.contractId || "", r = t.dataset.guardTier || "VETERAN", i = e.querySelector(`[data-freight-insurance="${n}"]`)?.checked === !0;
				t.setAttribute("disabled", "true");
				try {
					await H.acceptFreight(n, r, i), W(i ? "Đã nhận chuyến và mua bảo hiểm." : "Đã nhận chuyến hàng."), await this.refresh(), this.render();
				} catch (e) {
					t.removeAttribute("disabled"), W(e.message || "Nhận chuyến thất bại.", !0);
				}
			});
		}), e.querySelectorAll("[data-freight-deliver]").forEach((e) => {
			e.addEventListener("click", async () => {
				let t = e.dataset.freightDeliver || "";
				e.setAttribute("disabled", "true");
				try {
					await H.deliverFreight(t), W("Đã giao hàng và nhận phí vận chuyển."), await this.refresh(), this.render();
				} catch (t) {
					e.removeAttribute("disabled"), W(t.message || "Giao hàng thất bại.", !0);
				}
			});
		});
		let t = (t) => {
			t.querySelector("[data-route-remove-item]")?.addEventListener("click", () => {
				e.querySelectorAll(".route-item-row").length > 1 && t.remove();
			});
		};
		e.querySelectorAll(".route-item-row").forEach(t), e.querySelector("[data-route-add-item]")?.addEventListener("click", () => {
			let n = e.querySelector("#route-items"), r = n?.querySelector(".route-item-row");
			if (!n || !r) return;
			let i = r.cloneNode(!0);
			i.querySelectorAll("input").forEach((e) => {
				e.dataset.routeField === "item" && (e.value = ""), e.dataset.routeField === "qty" && (e.value = "10"), e.dataset.routeField === "buy" && (e.value = "50"), e.dataset.routeField === "sell" && (e.value = "100");
			}), n.appendChild(i), t(i);
		}), e.querySelectorAll("[data-route-create]").forEach((t) => {
			t.addEventListener("click", async () => {
				let n = e.querySelector("#route-from")?.value || "", r = e.querySelector("#route-to")?.value || "", i = Number(e.querySelector("#route-freq")?.value || 7), a = e.querySelector("#route-guard")?.value || "VETERAN";
				if (!n || !r || n === r) {
					W("Kho nguồn và kho đích phải khác nhau.", !0);
					return;
				}
				let o = Array.from(e.querySelectorAll(".route-item-row")).map((e) => {
					let t = (t) => e.querySelector(`[data-route-field="${t}"]`);
					return {
						itemCode: t("item")?.value.trim() || "",
						quantityPerRun: Number(t("qty")?.value || 0),
						maxBuyPrice: Number(t("buy")?.value || 0),
						minSellPrice: Number(t("sell")?.value || 0)
					};
				});
				if (o.length === 0 || o.some((e) => !e.itemCode || e.quantityPerRun <= 0 || e.maxBuyPrice <= 0 || e.minSellPrice <= e.maxBuyPrice)) W("Kiểm tra từng mặt hàng: mã hàng, số lượng và giá bán sàn > giá mua trần.", !0);
				else {
					t.setAttribute("disabled", "true");
					try {
						await H.createMerchantRoute({
							fromWarehouseId: n,
							toWarehouseId: r,
							items: o,
							frequencyDays: i,
							guardTier: a
						}), W("Đã mở thương lộ tự động."), await this.refresh(), this.render();
					} catch (e) {
						t.removeAttribute("disabled"), W(e.message || "Mở thương lộ thất bại.", !0);
					}
				}
			});
		}), e.querySelectorAll("[data-route-status]").forEach((e) => {
			e.addEventListener("click", async () => {
				let t = e.dataset.routeId || "", n = e.dataset.nextStatus || "PAUSED";
				e.setAttribute("disabled", "true");
				try {
					await H.setMerchantRouteStatus(t, n), W(n === "ACTIVE" ? "Đã tiếp tục thương lộ." : "Đã tạm dừng thương lộ."), await this.refresh(), this.render();
				} catch (t) {
					e.removeAttribute("disabled"), W(t.message || "Đổi trạng thái thương lộ thất bại.", !0);
				}
			});
		});
	}
}(), K = class {
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
}, ce = new K(), le = class e {
	static instance;
	static getInstance() {
		return e.instance ||= new e(), e.instance;
	}
	async get(e) {
		return await v.get("/api/map/wilderness", e ? { nodeId: e } : void 0);
	}
	async travel(e) {
		return v.post("/api/map/wilderness/travel", {
			subLocationId: e,
			idempotencyKey: `wilderness-travel-${e}-${Date.now()}`
		});
	}
	async gather(e, t = "PLY-0001") {
		return v.post("/api/professions/gather", {
			characterId: t,
			nodeId: e,
			idempotencyKey: `wilderness-gather-${e}-${Date.now()}`
		});
	}
	async getScene(e, t = "PLY-0001") {
		return v.get("/api/scene", {
			subLocation: e,
			characterId: t
		});
	}
	async dispatchAction(e) {
		return v.post("/api/action", e);
	}
}, q = le.getInstance();
// src/client/features/world-map/wilderness-map.modal.ts
function J(e) {
	return String(e ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function Y(e, t = !1) {
	typeof window.showToast == "function" && window.showToast(e, t);
}
var ue = {
	mountain: "山",
	water: "水",
	forest: "林",
	lair: "寨",
	farm: "田",
	wild: "野"
}, de = class {
	modal;
	view = null;
	nodeId = null;
	scene = null;
	scenePoiName = null;
	constructor() {
		this.modal = i({
			id: "wilderness-map-modal",
			title: "Dã Ngoại",
			subtitle: "Khảo sát địa hình ngoài thành, điểm tài nguyên và ổ phỉ",
			seal: "野",
			size: "xl",
			onOpen: async () => {
				await this.refresh(), this.render();
			}
		});
	}
	async open(e) {
		this.nodeId = e || null, await this.modal.open();
	}
	async close() {
		await this.modal.close();
	}
	async refresh() {
		this.view = await q.get(this.nodeId || void 0), this.nodeId = this.view.nodeId;
	}
	render() {
		if (!this.view) {
			this.modal.setContent("<div class=\"journal-modal-content\"><div class=\"text-muted text-sm\">Không tải được dã ngoại.</div></div>"), this.bind();
			return;
		}
		let { wilderness: e, resources: t, city: n, currentSubLocation: r } = this.view, i = n?.nameVi || this.view.nodeId, a = e.map((e) => this.renderSpot(e, r)), o = t.length, s = this.view.poiScenes.length;
		this.modal.setContent(`
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">野</div>
          <div class="lead-text">
            <h3>${J(i)} • Dã Ngoại</h3>
            <div class="text-muted text-sm">${e.length} địa danh ngoài thành • ${o} điểm tài nguyên • ${s} POI. Mỗi lần di chuyển tốn 1 ngày và 5 thể lực.</div>
          </div>
        </div>
        <div class="wilderness-map-frame">
          <svg class="wilderness-map-svg" viewBox="0 0 600 360" role="img" aria-label="Bản đồ dã ngoại ${J(i)}">
            <rect class="wilderness-map-ground" x="0" y="0" width="600" height="360" rx="8"></rect>
            <circle class="wilderness-map-ring" cx="300" cy="180" r="130"></circle>
            <circle class="wilderness-map-ring" cx="300" cy="180" r="72"></circle>
            <path class="wilderness-map-road" d="M 60 300 C 180 250, 240 200, 300 180 S 460 110, 560 60"></path>
            ${a.join("")}
          </svg>
        </div>
        <div class="wilderness-map-legend">
          <span>Vị trí hiện tại: <strong>${J(r || "Trong thành")}</strong></span>
          <span class="text-muted">Chọn một địa danh để đi bộ tới; quay lại thành bằng nút đóng.</span>
        </div>
        ${this.renderResourcesPanel(r)}
        ${this.renderPoiPanel()}
        ${this.renderScenePanel()}
      </div>
    `), this.bind();
	}
	isInWilderness(e) {
		return !!e && (this.view?.wilderness || []).some((t) => t.nameVi === e);
	}
	renderResourcesPanel(e) {
		let t = this.view?.resources || [];
		if (t.length === 0) return "";
		let n = this.isInWilderness(e);
		return `
      <div class="wilderness-action-panel">
        <div class="flex justify-between items-center gap-3 mb-2">
          <div class="text-xs font-bold text-amber-200">Điểm Tài Nguyên</div>
          <div class="text-[11px] text-muted">${n ? `Đang ở ${J(e || "")} — có thể khai thác.` : "Hãy đi tới một địa danh dã ngoại trước khi khai thác."}</div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          ${t.map((e) => `
            <div class="flex justify-between items-center gap-2 rounded border border-slate-800 bg-slate-900/70 p-2">
              <div>
                <div class="text-sm text-slate-200">${J(e.nameVi)}</div>
                <div class="text-[11px] text-muted">${J(e.resourceType)} • ${J(e.resourceNodeId)}</div>
              </div>
              <button class="ui-btn ui-btn--primary ui-btn--sm" data-wilderness-gather="${J(e.resourceNodeId)}" ${n ? "" : "disabled"}>
                Khai Thác
              </button>
            </div>
          `).join("")}
        </div>
      </div>
    `;
	}
	renderPoiPanel() {
		let e = this.view?.poiScenes || [];
		return e.length === 0 ? "" : `
      <div class="wilderness-action-panel">
        <div class="text-xs font-bold text-amber-200 mb-2">Khảo Sát Địa Điểm</div>
        <div class="flex flex-wrap gap-2">
          ${e.map((e) => `
            <button class="ui-btn ui-btn--ghost ui-btn--sm" data-poi-scene="${J(e.poiName)}">
              ${J(e.poiName)}
            </button>
          `).join("")}
        </div>
      </div>
    `;
	}
	renderScenePanel() {
		if (!this.scene) return "";
		let e = Array.isArray(this.scene.options) ? this.scene.options : [];
		return `
      <div class="wilderness-scene-card">
        <div class="flex justify-between items-start gap-3">
          <div>
            <div class="text-xs font-bold text-amber-200">${J(this.scenePoiName || this.scene.npc?.name || "Khảo sát")}</div>
            <div class="text-[11px] text-muted">${J(this.scene.npc?.name || "")}${this.scene.npc?.title ? ` • ${J(this.scene.npc.title)}` : ""}</div>
          </div>
          <button class="ui-btn ui-btn--ghost ui-btn--sm" data-scene-close>Đóng</button>
        </div>
        <p class="text-sm text-slate-300 mt-2">${J(this.scene.narrative || "")}</p>
        <div class="grid grid-cols-1 gap-2 mt-2">
          ${e.map((e, t) => `
            <button class="ui-btn ui-btn--ghost ui-btn--sm text-left" data-scene-option="${t}" ${e.disabled ? "disabled" : ""}>
              <strong>${J(e.title || e.id || `Lựa chọn ${t + 1}`)}</strong>
              ${e.desc ? `<span class="block text-[11px] text-muted">${J(e.desc)}</span>` : ""}
            </button>
          `).join("")}
        </div>
      </div>
    `;
	}
	renderSpot(e, t) {
		let n = 40 + Number(e.localX ?? .5) * 520, r = 30 + Number(e.localY ?? .5) * 300, i = e.nameVi === t, a = ue[e.iconKey] || "野";
		return `
      <g class="wilderness-node${i ? " is-current" : ""}" data-wilderness-travel="${J(e.subLocationId)}" tabindex="0" role="button" aria-label="${J(e.nameVi)}">
        <circle class="wilderness-node-halo" cx="${n.toFixed(1)}" cy="${r.toFixed(1)}" r="22"></circle>
        <circle class="wilderness-node-dot" cx="${n.toFixed(1)}" cy="${r.toFixed(1)}" r="14"></circle>
        <text class="wilderness-node-seal" x="${n.toFixed(1)}" y="${(r + 5).toFixed(1)}" text-anchor="middle">${a}</text>
        <text class="wilderness-node-label" x="${n.toFixed(1)}" y="${(r + 33).toFixed(1)}" text-anchor="middle">${J(e.nameVi)}</text>
      </g>
    `;
	}
	bind() {
		let e = this.modal.getBodyElement();
		e && (e.querySelectorAll("[data-wilderness-travel]").forEach((e) => {
			let t = async () => {
				let t = e.dataset.wildernessTravel || "";
				try {
					let e = await q.travel(t), n = Number(e?.time?.advancedDays || 1);
					Y(`Đã tới ${e?.result?.nameVi || "địa danh"} sau ${n} ngày.`), await this.refresh(), this.render();
				} catch (e) {
					Y(e.message || "Không thể di chuyển.", !0);
				}
			};
			e.addEventListener("click", t), e.addEventListener("keydown", (e) => {
				(e.key === "Enter" || e.key === " ") && (e.preventDefault(), t());
			});
		}), e.querySelectorAll("[data-wilderness-gather]").forEach((e) => {
			e.addEventListener("click", async () => {
				let t = e.dataset.wildernessGather || "";
				e.setAttribute("disabled", "true");
				try {
					let e = await q.gather(t), n = e?.result || e, r = n?.itemNameVi || n?.itemCode || "tài nguyên", i = Number(n?.quantity || n?.yieldQuantity || 0);
					Y(i > 0 ? `Khai thác được ${i} ${r}.` : "Khai thác thành công."), await this.refresh(), this.render();
				} catch (t) {
					e.removeAttribute("disabled"), Y(t.message || "Khai thác thất bại.", !0);
				}
			});
		}), e.querySelectorAll("[data-poi-scene]").forEach((e) => {
			e.addEventListener("click", async () => {
				let t = e.dataset.poiScene || "";
				e.setAttribute("disabled", "true");
				try {
					this.scene = await q.getScene(t), this.scenePoiName = t, this.render();
				} catch (t) {
					e.removeAttribute("disabled"), Y(t.message || "Không mở được địa điểm.", !0);
				}
			});
		}), e.querySelectorAll("[data-scene-close]").forEach((e) => {
			e.addEventListener("click", () => {
				this.scene = null, this.scenePoiName = null, this.render();
			});
		}), e.querySelectorAll("[data-scene-option]").forEach((e) => {
			e.addEventListener("click", async () => {
				let t = Number(e.dataset.sceneOption || -1), n = this.scene?.options?.[t];
				if (n?.action) {
					e.setAttribute("disabled", "true");
					try {
						Y((await q.dispatchAction(n.action))?.message || "Đã thực hiện lựa chọn."), this.scene = null, this.scenePoiName = null, await this.refresh(), this.render();
					} catch (t) {
						e.removeAttribute("disabled"), Y(t.message || "Hành động thất bại.", !0);
					}
				}
			});
		}));
	}
}, fe = new de(), pe = class e {
	static instance;
	static getInstance() {
		return e.instance ||= new e(), e.instance;
	}
	async get(e) {
		return await v.get("/api/map/city", e ? { nodeId: e } : void 0);
	}
	async enter(e) {
		return v.post("/api/map/city/enter", {
			subLocationId: e,
			idempotencyKey: `city-enter-${e}-${Date.now()}`
		});
	}
	async getScene(e, t = "PLY-0001") {
		return v.get("/api/scene", {
			subLocation: e,
			characterId: t
		});
	}
	async dispatchAction(e) {
		return v.post("/api/action", e);
	}
}, X = pe.getInstance();
// src/client/features/world-map/city-map.modal.ts
function Z(e) {
	return String(e ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function me(e, t = !1) {
	typeof window.showToast == "function" && window.showToast(e, t);
}
var he = {
	government: "府",
	residence: "宅",
	market: "市",
	forge: "鍛",
	tavern: "酒",
	arena: "武",
	city: "城",
	temple: "寺",
	gate: "門",
	workshop: "坊"
}, ge = class {
	modal;
	view = null;
	nodeId = null;
	scene = null;
	sceneSpotName = null;
	constructor() {
		this.modal = i({
			id: "city-map-modal",
			title: "Nội Thành",
			subtitle: "Đi lại giữa các địa điểm trong thành và khảo sát tại chỗ",
			seal: "城",
			size: "xl",
			onOpen: async () => {
				await this.refresh(), this.render();
			}
		});
	}
	async open(e) {
		this.nodeId = e || null, await this.modal.open();
	}
	async close() {
		await this.modal.close();
	}
	async refresh() {
		this.view = await X.get(this.nodeId || void 0), this.nodeId = this.view.nodeId;
	}
	render() {
		if (!this.view) {
			this.modal.setContent("<div class=\"journal-modal-content\"><div class=\"text-muted text-sm\">Không tải được nội thành.</div></div>"), this.bind();
			return;
		}
		let { citySpots: e, city: t, currentSubLocation: n, poiScenes: r } = this.view, i = t?.nameVi || this.view.nodeId, a = e.find((e) => e.nameVi === n);
		this.modal.setContent(`
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">城</div>
          <div class="lead-text">
            <h3>${Z(i)} • Nội Thành</h3>
            <div class="text-muted text-sm">${e.length} địa điểm trong thành • ${r.length} POI. Đi lại nội thành không tốn ngày; mỗi địa điểm mở một cảnh ngữ cảnh.</div>
          </div>
        </div>
        <div class="wilderness-map-legend">
          <span>Vị trí hiện tại: <strong>${Z(a?.nameVi || n || "Cổng thành")}</strong></span>
          <span class="text-muted">Chọn một địa điểm để vào và khảo sát.</span>
        </div>
        <div class="city-map-grid">
          ${e.map((e) => this.renderSpot(e, n)).join("")}
        </div>
        ${this.renderScenePanel()}
      </div>
    `), this.bind();
	}
	renderSpot(e, t) {
		let n = he[e.iconKey] || "城", r = e.nameVi === t;
		return `
      <button class="city-spot-card${r ? " is-current" : ""}" data-city-enter="${Z(e.subLocationId)}">
        <span class="city-spot-seal">${n}</span>
        <span class="city-spot-name">${Z(e.nameVi)}</span>
        <span class="city-spot-kind">${Z(e.kind)}${r ? " • đang ở đây" : ""}</span>
      </button>
    `;
	}
	renderScenePanel() {
		if (!this.scene) return "";
		let e = Array.isArray(this.scene.options) ? this.scene.options : [];
		return `
      <div class="wilderness-scene-card">
        <div class="flex justify-between items-start gap-3">
          <div>
            <div class="text-xs font-bold text-amber-200">${Z(this.sceneSpotName || this.scene.npc?.name || "Khảo sát")}</div>
            <div class="text-[11px] text-muted">${Z(this.scene.npc?.name || "")}${this.scene.npc?.title ? ` • ${Z(this.scene.npc.title)}` : ""}</div>
          </div>
          <button class="ui-btn ui-btn--ghost ui-btn--sm" data-scene-close>Đóng</button>
        </div>
        <p class="text-sm text-slate-300 mt-2">${Z(this.scene.narrative || "")}</p>
        <div class="grid grid-cols-1 gap-2 mt-2">
          ${e.map((e, t) => `
            <button class="ui-btn ui-btn--ghost ui-btn--sm text-left" data-scene-option="${t}" ${e.disabled ? "disabled" : ""}>
              <strong>${Z(e.title || e.id || `Lựa chọn ${t + 1}`)}</strong>
              ${e.desc ? `<span class="block text-[11px] text-muted">${Z(e.desc)}</span>` : ""}
            </button>
          `).join("")}
        </div>
      </div>
    `;
	}
	bind() {
		let e = this.modal.getBodyElement();
		e && (e.querySelectorAll("[data-city-enter]").forEach((e) => {
			e.addEventListener("click", async () => {
				let t = e.dataset.cityEnter || "";
				e.setAttribute("disabled", "true");
				try {
					let e = (await X.enter(t))?.result?.nameVi || t;
					this.scene = await X.getScene(e), this.sceneSpotName = e, await this.refresh(), this.render();
				} catch (t) {
					e.removeAttribute("disabled"), me(t.message || "Không vào được địa điểm.", !0);
				}
			});
		}), e.querySelectorAll("[data-scene-close]").forEach((e) => {
			e.addEventListener("click", () => {
				this.scene = null, this.sceneSpotName = null, this.render();
			});
		}), e.querySelectorAll("[data-scene-option]").forEach((e) => {
			e.addEventListener("click", async () => {
				let t = Number(e.dataset.sceneOption || -1), n = this.scene?.options?.[t];
				if (n?.action) {
					e.setAttribute("disabled", "true");
					try {
						me((await X.dispatchAction(n.action))?.message || "Đã thực hiện lựa chọn."), this.scene = null, this.sceneSpotName = null, await this.refresh(), this.render();
					} catch (t) {
						e.removeAttribute("disabled"), me(t.message || "Hành động thất bại.", !0);
					}
				}
			});
		}));
	}
}, _e = new ge(), ve = class e {
	static instance;
	static getInstance() {
		return e.instance ||= new e(), e.instance;
	}
	async quote(e, t = "PLY-0001") {
		return (await v.get("/api/workforce/quote", {
			candidateName: e,
			characterId: t
		})).quote;
	}
	async hire(e, t = "PLY-0001") {
		return v.post("/api/workforce/hire", {
			candidateName: e,
			characterId: t,
			idempotencyKey: `workforce-hire-${e}-${Date.now()}`
		});
	}
}.getInstance();
// src/client/features/workforce/workforce-hire.modal.ts
function Q(e) {
	return String(e ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function ye(e, t = !1) {
	typeof window.showToast == "function" && window.showToast(e, t);
}
var be = {
	ACCOUNTANT_MANAGER: "Chưởng Quỹ",
	MASTER_BLACKSMITH: "Thợ Cả Lò Rèn",
	CARAVAN_ESCORT_CHIEF: "Tiêu Đầu Hộ Vệ",
	MASTER_WEAVER: "Thợ Dệt Cả",
	ASSISTANT_WORKER: "Phụ Việc"
}, xe = new class {
	modal;
	candidateName = "";
	quote = null;
	error = "";
	submitting = !1;
	constructor() {
		this.modal = i({
			id: "workforce-hire-modal",
			title: "Chiêu Mộ Nhân Sĩ",
			subtitle: "Giá ký khế ước do máy chủ quyết định từ danh vọng, đức độ và thiện cảm",
			seal: "聘",
			size: "lg",
			onOpen: async () => {
				await this.load(), this.render();
			}
		});
	}
	async open(e) {
		this.candidateName = e, this.quote = null, this.error = "", await this.modal.open();
	}
	async close() {
		await this.modal.close();
	}
	async load() {
		try {
			this.quote = await ve.quote(this.candidateName), this.error = "";
		} catch (e) {
			this.quote = null, this.error = e.message || "Không lấy được báo giá chiêu mộ.";
		}
	}
	render() {
		if (this.error) {
			this.modal.setContent(`
        <div class="journal-modal-content">
          <div class="text-sm text-red-300">${Q(this.error)}</div>
          <button class="ui-btn ui-btn--ghost ui-btn--sm mt-3" data-hire-cancel>Đóng</button>
        </div>
      `), this.bind();
			return;
		}
		if (!this.quote) {
			this.modal.setContent("<div class=\"journal-modal-content\"><div class=\"text-muted text-sm\">Đang lấy báo giá...</div></div>");
			return;
		}
		let e = this.quote, t = be[e.recommendedRole] || e.recommendedRole, n = Math.round((e.fameDiscount + e.virtueDiscount) * 100), r = e.canHire ? "" : `<div class="hire-refusal">
          <div class="hire-refusal-title">${e.alreadyHired ? "Đã có chủ" : "Lời mời bị từ chối"}</div>
          <div class="text-sm">${Q(e.refusalReasonVi || "Chưa đủ điều kiện chiêu mộ.")}</div>
          ${e.retryAfterDate ? `<div class="text-sm mt-1">Có thể thử lại sau ngày <strong>${Q(e.retryAfterDate)}</strong>.</div>` : ""}
          ${e.alreadyHired ? "" : "<div class=\"text-[11px] text-muted mt-1\">Gợi ý: giao tiếp, tặng quà hoặc hoàn thành nhiệm vụ để tăng thiện cảm; danh vọng tăng qua chiến công và uy tín.</div>"}
        </div>`;
		this.modal.setContent(`
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">聘</div>
          <div class="lead-text">
            <h3>${Q(e.candidateName)}</h3>
            <div class="text-muted text-sm">${Q(t)} • về ${Q(e.businessName)}</div>
          </div>
        </div>

        <div class="hire-quote-grid">
          <div class="hire-quote-cell"><span>Danh vọng</span><strong>${e.fame}/${e.minFame}</strong></div>
          <div class="hire-quote-cell"><span>Đức độ</span><strong>${e.virtue}</strong></div>
          <div class="hire-quote-cell"><span>Thiện cảm</span><strong>${e.affinity}/100</strong></div>
          <div class="hire-quote-cell"><span>Ký quỹ</span><strong>${e.signingBonus} Quan</strong></div>
        </div>

        <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 mt-3">
          <div class="text-xs text-muted mb-1">Báo giá máy chủ</div>
          <div class="text-sm text-slate-200">Ký quỹ gốc ${e.baseSigningBonus} Quan${n > 0 ? ` • giảm ${n}% nhờ danh vọng/đức độ` : ""}</div>
          <div class="text-sm text-slate-200">Lương tháng ${e.monthlyWage} Quan • hiệu suất +${Math.round(e.efficiencyBonus * 100)}%</div>
        </div>

        ${r}

        <div class="flex justify-end gap-2 mt-4">
          <button class="ui-btn ui-btn--ghost ui-btn--sm" data-hire-cancel>Hủy</button>
          <button class="ui-btn ui-btn--primary ui-btn--sm" data-hire-confirm ${e.canHire && !this.submitting ? "" : "disabled"}>
            ${this.submitting ? "Đang ký..." : `Ký Khế Ước (${e.signingBonus} Quan)`}
          </button>
        </div>
      </div>
    `), this.bind();
	}
	bind() {
		let e = this.modal.getBodyElement();
		e && (e.querySelectorAll("[data-hire-cancel]").forEach((e) => {
			e.addEventListener("click", () => {
				this.close();
			});
		}), e.querySelectorAll("[data-hire-confirm]").forEach((e) => {
			e.addEventListener("click", async () => {
				if (!this.submitting) {
					this.submitting = !0, this.render();
					try {
						let e = await ve.hire(this.candidateName);
						ye(`Đã chiêu mộ ${e?.nameVi || this.candidateName} vào ${e?.businessName || "sản nghiệp"}.`), await this.close(), typeof window.refreshWorldMapLive == "function" && window.refreshWorldMapLive();
					} catch (e) {
						this.submitting = !1, this.error = e.message || "Chiêu mộ thất bại.", await this.load(), this.render(), ye(this.error, !0);
					}
				}
			});
		}));
	}
}(), Se = "sim_onboarding_v1_done", Ce = [
	{
		seal: "日",
		titleVi: "Vòng ngày và tháng",
		titleEn: "Day and month loop",
		bodyVi: "Mỗi hành động tiêu hao ngày. Khi sang mùng 1, tháng cũ tự chốt: lương, thuế, hao hụt và hồi phục vết thương.",
		bodyEn: "Every action spends days. On the first of the month the previous month closes: wages, rent, spoilage and injury recovery."
	},
	{
		seal: "時",
		titleVi: "Chi phí hành động",
		titleEn: "Action cost",
		bodyVi: "Chip thời gian cạnh nút xác nhận cho biết hành động tốn bao nhiêu ngày và thể lực trước khi bạn cam kết.",
		bodyEn: "The time chip beside a confirm button shows the days and stamina an action costs before you commit."
	},
	{
		seal: "市",
		titleVi: "Chợ địa phương",
		titleEn: "Local market",
		bodyVi: "Giá mua bán theo cung cầu từng thành. Muốn lời, hãy chở hàng tới nơi khan hiếm hoặc mở thương lộ tự động.",
		bodyEn: "Prices follow local supply and demand. Profit comes from moving goods to scarce markets or running automated trade routes."
	},
	{
		seal: "存",
		titleVi: "Lưu và tải",
		titleEn: "Save and load",
		bodyVi: "Mở menu hệ thống để lưu phiên chơi. Dữ liệu nằm trong SQLite; mỗi phiên chơi là một tệp riêng.",
		bodyEn: "Open the system menu to save. Data lives in SQLite, and each campaign is its own file."
	}
], we = new class {
	modal;
	constructor() {
		this.modal = i({
			id: "onboarding-modal",
			title: "Hướng Dẫn Nhập Môn",
			subtitle: "Ba mươi ngày đầu của một thương nhân",
			seal: "導",
			size: "lg",
			onOpen: () => this.render(),
			onClose: () => this.markDone()
		});
	}
	async open(e = !1) {
		(e || !this.isDone()) && await this.modal.open();
	}
	async close() {
		await this.modal.close();
	}
	isEnglish() {
		return window.currentLang === "en";
	}
	isDone() {
		try {
			return window.localStorage.getItem(Se) === "1";
		} catch {
			return !1;
		}
	}
	markDone() {
		try {
			window.localStorage.setItem(Se, "1");
		} catch {}
	}
	render() {
		let e = this.isEnglish();
		this.modal.setContent(`
      <div class="onboarding-grid">
        ${Ce.map((t) => `
          <div class="onboarding-step">
            <span class="onboarding-seal">${t.seal}</span>
            <div>
              <div class="onboarding-step-title">${e ? t.titleEn : t.titleVi}</div>
              <div class="onboarding-step-body">${e ? t.bodyEn : t.bodyVi}</div>
            </div>
          </div>
        `).join("")}
      </div>
      <div class="onboarding-foot">
        <span class="onboarding-hint">${e ? "Press ? in the header to reopen this guide." : "Bấm nút ? trên thanh công cụ để mở lại hướng dẫn."}</span>
        <button class="ui-btn ui-btn--primary" data-onboarding-done>${e ? "Begin" : "Bắt đầu"}</button>
      </div>
    `), this.modal.getBodyElement()?.querySelectorAll("[data-onboarding-done]").forEach((e) => {
			e.addEventListener("click", () => {
				this.close();
			});
		});
	}
}();
typeof window < "u" && window.setTimeout(() => {
	we.open(!1);
}, 900);
// src/shared/map-aliases.ts
var Te = {
	wu_wei: "xi_liang",
	he_fei: "shou_chun",
	pu_yang: "ye_cheng",
	wu_ling: "jiang_ling"
};
function Ee(e) {
	return Te[e] || e;
}
var $ = new class {
	ALIASES = Te;
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
		mapRegistry: null,
		errors: []
	};
	resolveMapNodeId(e) {
		return Ee(e);
	}
	getSubLocationsForNode(e) {
		return this.state.mapRegistry?.subLocationsByNode?.[e] || [];
	}
	getPoiScenesForNode(e) {
		return this.state.mapRegistry?.poiScenesByNode?.[e] || [];
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
		let [t, n, r, i, a, o, s, c, l, u, d, f, p, m, h, g, _, v] = await Promise.allSettled([
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
			this.readJson("/api/professions/nodes"),
			this.readJson("/api/map/registry")
		]), ee = t.status === "fulfilled" && t.value.success && t.value.garrisons || [], y = n.status === "fulfilled" && n.value.success && n.value.settlements || [], b = r.status === "fulfilled" && r.value.success && r.value.factions || [], x = i.status === "fulfilled" && i.value.success ? i.value : null, te = a.status === "fulfilled" && a.value.success && a.value.strongholds || [], S = o.status === "fulfilled" && o.value.success && o.value.crises || [], C = s.status === "fulfilled" && s.value.success && s.value.npcs || [], ne = c.status === "fulfilled" && c.value.success ? c.value : null, w = l.status === "fulfilled" && l.value.success && l.value.items || [], T = u.status === "fulfilled" && u.value.success && u.value.specialists || [], E = d.status === "fulfilled" && d.value.success && d.value.businesses || [], D = f.status === "fulfilled" && f.value.success && f.value.tiers || [], O = p.status === "fulfilled" && p.value.success && p.value.routes || [], re = m.status === "fulfilled" && m.value.success && m.value.locations || [], ie = h.status === "fulfilled" && h.value.success && h.value.caravans || [], ae = g.status === "fulfilled" && g.value.success && g.value.expeditions || [], oe = _.status === "fulfilled" && _.value.success && _.value.nodes || [], k = v.status === "fulfilled" && v.value.success ? v.value : null;
		v.status === "rejected" && this.state.errors.push("map-registry"), t.status === "rejected" && this.state.errors.push("garrisons"), n.status === "rejected" && this.state.errors.push("factions/settlements"), r.status === "rejected" && this.state.errors.push("factions"), i.status === "rejected" && this.state.errors.push("military"), a.status === "rejected" && this.state.errors.push("strongholds"), o.status === "rejected" && this.state.errors.push("crises"), s.status === "rejected" && this.state.errors.push("npcs"), c.status === "rejected" && this.state.errors.push("status"), l.status === "rejected" && this.state.errors.push("inventory"), u.status === "rejected" && this.state.errors.push("workforce"), d.status === "rejected" && this.state.errors.push("businesses"), f.status === "rejected" && this.state.errors.push("guard-tiers"), p.status === "rejected" && this.state.errors.push("routes"), m.status === "rejected" && this.state.errors.push("locations"), h.status === "rejected" && this.state.errors.push("caravans"), g.status === "rejected" && this.state.errors.push("expeditions"), _.status === "rejected" && this.state.errors.push("resources"), this.state.mapRegistry = k ? {
			nodes: k.nodes || [],
			subLocationsByNode: k.subLocationsByNode || {},
			poiScenesByNode: k.poiScenesByNode || {},
			resourcesByNode: k.resourcesByNode || {},
			orphans: k.orphans || []
		} : null;
		let A = {};
		b.forEach((e) => {
			let t = e && e.factionId;
			t && (A[t] = e);
		});
		let j = {};
		ee.forEach((e) => {
			e && e.settlementId && (j[e.settlementId] = this.mergeRecord(j[e.settlementId], e));
		}), y.forEach((e) => {
			e && e.settlementId && (j[e.settlementId] = this.mergeRecord(j[e.settlementId], e));
		}), Object.keys(j).forEach((e) => {
			let t = j[e], n = t.rulerFactionId ? A[t.rulerFactionId] : null;
			if (!n) return;
			let r = n;
			t.factionNameVi = r.nameVi, t.factionNameEn = r.nameEn, t.factionColor = r.colorHex, t.factionMilitaryPower = r.militaryPower;
		});
		let M = {};
		Object.keys(j).forEach((e) => {
			this.resolveMapNodeId(e) === e && (M[e] = this.mergeRecord(M[e], {
				...j[e],
				sourceSettlementId: e
			}));
		}), Object.keys(j).forEach((e) => {
			let t = this.resolveMapNodeId(e);
			M[t] || (M[t] = this.mergeRecord(M[t], {
				...j[e],
				sourceSettlementId: e
			}));
		}), this.state.bySettlement = j, this.state.byMapNode = M, this.state.activeExpeditions = x && x.activeExpeditions || [], this.state.player = x && x.commander || null, this.state.playerFaction = b.find((e) => e.leaderId === "PLY-0001") || null, this.state.factionsById = A;
		let N = {};
		te.forEach((e) => {
			let t = e.status, n = e.locationNear;
			if (t !== "ACTIVE" || !n) return;
			let r = this.resolveMapNodeId(n);
			(N[r] ||= []).push(e);
		});
		let P = {};
		S.forEach((e) => {
			let t = e.settlementId;
			if (!t) return;
			let n = this.resolveMapNodeId(t);
			(P[n] ||= []).push(e);
		}), this.state.banditsByNode = N, this.state.crisesByNode = P;
		let F = {}, I = {};
		C.forEach((e) => {
			let t = e.name, n = e.npc_id || e.npcId;
			n && (I[n] = e), t && (F[this.normalizeName(t)] = e);
		}), this.state.npcsByName = F, this.state.npcsById = I;
		let se = Number(ne?.player?.liquid_cash) || 0, L = {};
		w.forEach((e) => {
			let t = e.item_code || e.itemCode, n = Number(e.quantity) || 0;
			t && (L[t] = n);
		}), this.state.playerCash = se, this.state.inventory = L, this.state.guardTiers = D;
		let R = {};
		T.forEach((e) => {
			let t = e.nameVi;
			t && (R[this.normalizeName(t)] = e);
		}), this.state.specialistsByName = R, this.state.caravans = ie, this.state.expeditions = ae;
		let z = {}, B = {};
		oe.forEach((e) => {
			let t = String(e.settlementId || ""), n = this.resolveMapNodeId(t), r = String(e.resourceType || "");
			n && r && (z[n] || (z[n] = {
				types: {},
				nodes: []
			}), z[n].types[r] = (z[n].types[r] || 0) + 1, z[n].nodes.push(e), B[r] = (B[r] || 0) + 1);
		}), this.state.resourcesByNode = z, this.state.resourceTotals = B;
		let V = {};
		re.forEach((e) => {
			let t = e.locationId;
			t && (V[t] = e);
		}), this.state.locationsById = V;
		let H = {};
		if (typeof window < "u") {
			let e = window.SETTLEMENT_LABELS || {};
			Object.keys(e).forEach((t) => {
				if (t === "wu_wei") return;
				let n = e[t] && e[t].vi;
				n && (H[this.normalizeLocationLabel(n)] = t);
			});
		}
		let U = {};
		re.forEach((e) => {
			let t = e.locationId, n = e.nameVi;
			if (!t || !n) return;
			let r = H[this.normalizeLocationLabel(n)];
			r && (U[t] = r);
		}), this.state.locToMapNode = U;
		let W = {};
		E.forEach((e) => {
			let t = e.businessId, n = e.locationId;
			t && n && (W[t] = n);
		});
		let G = {};
		T.forEach((e) => {
			let t = !!e.isHired, n = e.assignedBusinessId, r = n ? W[n] : null, i = e.baselineLocation, a = t && r ? r : i, o = a ? U[a] : null;
			o && (G[o] ||= []).push(e);
		}), this.state.businesses = E, this.state.specialistsByMapNode = G;
		let K = {};
		return O.forEach((e) => {
			let t = U[e.sourceLocationId || ""], n = U[e.targetLocationId || ""];
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
			K[o] || (K[o] = a), K[s] || (K[s] = {
				...a,
				from: n,
				to: t
			});
		}), this.state.routesByKey = K, this.state.status = this.state.errors.length === 17 ? "error" : "ready", this.state.fetchedAt = Date.now(), this.state;
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
			expeditions: this.state.expeditions.filter((e) => ["MARCHING", "ARRIVED"].includes(String(e.status).toUpperCase())).map((e) => {
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
function De() {
	if (typeof window > "u") return;
	let t = window;
	t.ModalShellCore = {
		createModalShell: i,
		modalStack: e
	}, t.UI = g, t.LineageFamilyUI = {
		open: (e) => x.open(e),
		close: () => x.close(),
		setFilter: (e) => x.setFilter(e),
		proposeMarriage: (e) => x.proposeMarriage(e),
		restCohabit: (e) => x.restCohabit(e),
		assignRole: (e, t) => x.assignRole(e, t),
		designateHeir: (e) => x.designateHeir(e),
		assignMentorDialog: (e) => x.assignMentorDialog(e),
		executeSuccession: () => x.executeSuccession()
	}, t.EquipmentUI = {
		openEquipmentModal: (e, t) => w.open(e, t),
		closeEquipmentModal: () => w.close(),
		switchTab: (e) => w.modal.switchTab(e),
		equip: (e, t, n) => w.equip(e, t, n),
		unequip: (e, t) => w.unequip(e, t),
		repairTool: (e) => w.repairTool(e),
		executeForge: () => w.executeForge()
	}, t.EnterpriseUI = {
		openEnterpriseModal: (e) => j.open(e),
		closeEnterpriseModal: () => j.close(),
		depositSafeCash: (e) => j.depositSafeCash(e),
		withdrawSafeCash: (e) => j.withdrawSafeCash(e),
		executeWork: (e) => j.executeWork(e)
	}, t.QuickTradeModal = {
		open: (e, t, n, r) => N.open(e, t, n, r),
		close: () => N.close(),
		updateTotal: () => N.updateTotal(),
		submit: () => N.submit()
	}, t.MarketStallModal = {
		open: (e = "stall") => G.open(e),
		close: () => G.close()
	}, t.TacticalBattleUI = {
		startDuel: (e) => I.startDuel(e),
		close: () => I.close(),
		executeAction: (e) => I.executeAction(e)
	}, t.TravelTransitUI = {
		show: (e, t, n, r) => L.showTravelTransit(e, t, n, r),
		close: () => L.closeTravel(),
		openLegacy: () => L.openTravelTransitModal(),
		closeLegacy: () => L.closeTravelTransitModal()
	}, t.TurnAdvanceUI = {
		show: (e, t, n) => L.showTurnAdvance(e, t, n),
		close: () => L.closeTurn(),
		openLegacy: () => L.openTurnAdvanceModal(),
		closeLegacy: () => L.closeTurnAdvanceModal()
	}, t.QuestUI = {
		open: () => V.open(),
		close: () => V.close(),
		accept: (e) => V.accept(e),
		advance: (e) => V.advance(e),
		payObligation: (e) => V.payObligation(e),
		acceptContract: (e) => V.acceptContract(e),
		deliverContract: (e) => V.deliverContract(e),
		verifyIntel: (e) => V.verifyIntel(e),
		rentFarm: (e) => V.rentFarm(e),
		plantCrop: (e, t) => V.plantCrop(e, t),
		harvestFarm: (e) => V.harvestFarm(e)
	}, t.WorldMapUI = {
		open: () => ce.open(),
		close: () => ce.close()
	}, t.WildernessMapUI = {
		open: (e) => fe.open(e),
		close: () => fe.close()
	}, t.CityMapUI = {
		open: (e) => _e.open(e),
		close: () => _e.close()
	}, t.WorkforceHireUI = {
		open: (e) => xe.open(e),
		close: () => xe.close()
	}, t.OnboardingUI = {
		open: (e = !1) => we.open(e),
		close: () => we.close()
	}, t.MapLiveService = {
		load: (e = !1) => $.load(e),
		getForMapNode: (e) => $.getForMapNode(e),
		getSubLocationsForNode: (e) => $.getSubLocationsForNode(e),
		getPoiScenesForNode: (e) => $.getPoiScenesForNode(e),
		getStatusForMapNode: (e) => $.getStatusForMapNode(e),
		getThreatForMapNode: (e) => $.getThreatForMapNode(e),
		findNpcByName: (e) => $.findNpcByName(e),
		findSpecialistByName: (e) => $.findSpecialistByName(e),
		getSpecialistsForMapNode: (e) => $.getSpecialistsForMapNode(e),
		getLocIdForNode: (e) => $.getLocIdForNode(e),
		getRecruitRequirement: (e) => $.getRecruitRequirement(e),
		getActionRequirements: () => $.getActionRequirements(),
		getRoute: (e, t) => $.getRoute(e, t),
		getLivingEntities: () => $.getLivingEntities(),
		getResourceDistribution: () => $.getResourceDistribution(),
		getResourceNodesForMapNode: (e) => $.getResourceNodesForMapNode(e),
		resolveMapNodeId: (e) => $.resolveMapNodeId(e),
		hasArmy: () => $.hasArmy(),
		getState: () => $.getState(),
		ALIASES: $.ALIASES
	}, console.log("[ThreeKingdoms-AgentEngine] All 14 client feature slices successfully bridged to window.*");
}
var Oe = new class {
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
}(), ke = class e {
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
}, Ae = ke.getInstance(), je = class {
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
			let [e, t] = await Promise.all([Ae.getCaravans().catch(() => []), Ae.getArbitrageOpportunities().catch(() => [])]);
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
			let e = await Ae.dispatchCaravan(i);
			typeof window.showToast == "function" && window.showToast(e.narrativeVi || "Thương đoàn đã xuất phát!"), await this.refreshData(), await this.modal.switchTab("active");
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Lỗi xuất thương đoàn!", !0);
		}
	}
}, Me = new je(), Ne = class {
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
		let e = document.getElementById("ts-player-name"), t = document.getElementById("ts-player-style"), n = {
			"184_YELLOW_TURBAN": "SCN-184-ZHOU",
			"190_DONG_ZHUO": "SCN-190-DONG",
			"200_GUANDU": "SCN-200-GUAN",
			"208_CHIBI": "SCN-208-CHIB"
		};
		try {
			await v.post("/api/game/new", {
				scenarioId: n[this.selectedScenario] || "SCN-184-ZHOU",
				archetypeId: "ARCH-COMMONER-YOUTH",
				customPlayerName: e?.value || "Lương Diễn",
				customStyleName: t?.value || "Chí Viễn",
				idempotencyKey: `new-game-${this.selectedScenario}-${Date.now()}`
			}), typeof window.showToast == "function" && window.showToast("Khởi tạo chiến dịch thành công!"), await this.modal.close(), window.location.reload();
		} catch (e) {
			typeof window.showToast == "function" && window.showToast(e.message || "Lỗi khởi tạo chiến dịch!", !0);
		}
	}
}, Pe = new Ne();
// src/client/main.ts
De();
export { je as CaravanLogisticsModal, ke as CaravanLogisticsService, ge as CityMapModal, pe as CityMapService, _ as ClientApiClient, A as EnterpriseWorkshopModal, T as EnterpriseWorkshopService, ne as EquipmentForgeModal, te as EquipmentForgeService, t as LEGACY_OWNED_MODAL_IDS, b as LineageFamilyModal, ee as LineageFamilyService, r as ModalShell, M as QuickTradeModal, F as TacticalBattleModal, Ne as TitleScreenModal, se as TransitTurnModals, de as WildernessMapModal, le as WildernessMapService, K as WorldMapModal, v as apiClient, Me as caravanLogisticsModal, Ae as caravanLogisticsService, _e as cityMapModal, X as cityMapService, i as createModalShell, j as enterpriseWorkshopModal, E as enterpriseWorkshopService, w as equipmentForgeModal, S as equipmentForgeService, Oe as eventBus, n as isLegacyOwnedModalId, x as lineageFamilyModal, y as lineageFamilyService, e as modalStack, N as quickTradeModal, I as tacticalBattleModal, Pe as titleScreenModal, L as transitTurnModals, fe as wildernessMapModal, q as wildernessMapService, ce as worldMapModal };

//# sourceMappingURL=client-bundle.es.js.map