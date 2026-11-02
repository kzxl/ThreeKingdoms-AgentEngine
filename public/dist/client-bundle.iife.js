var SimulationClient=(function(e){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});var t=new class{stack=[];isEscListenerAttached=!1;BASE_Z_INDEX=1e3;constructor(){this.handleKeyDown=this.handleKeyDown.bind(this)}push(e,t){let n=this.stack.indexOf(e);n>-1&&this.stack.splice(n,1),this.stack.push(e);let r=this.BASE_Z_INDEX+this.stack.length*10;t.style.zIndex=r.toString(),this.ensureEscListener(),this.updateBodyScrollLock()}remove(e){let t=this.stack.indexOf(e);t>-1&&this.stack.splice(t,1),this.updateBodyScrollLock()}getTop(){return this.stack.length===0?null:this.stack[this.stack.length-1]}handleKeyDown(e){if(e.key===`Escape`||e.keyCode===27){let t=this.getTop();t&&(e.preventDefault(),e.stopPropagation(),t.close())}}ensureEscListener(){typeof window<`u`&&(this.isEscListenerAttached||=(window.addEventListener(`keydown`,this.handleKeyDown,!0),!0))}updateBodyScrollLock(){typeof document<`u`&&(this.stack.length>0?document.body.classList.add(`modal-open`):document.body.classList.remove(`modal-open`))}},n=new Set([`spatial-tavern-modal`,`spatial-arena-modal`,`spatial-residence-modal`,`grand-command-hub-modal`,`personal-journal-modal`,`caravan-modal`]);function r(e){return n.has(e)}var i=class{id;options;backdropEl=null;dialogEl=null;titleEl=null;subtitleEl=null;sealEl=null;tabBarEl=null;bodyEl=null;footerEl=null;_isOpen=!1;_activeTab=null;constructor(e){this.id=e.id,this.options={closeOnEsc:!0,closeOnBackdrop:!0,size:`lg`,...e},this._activeTab=e.activeTabId||(e.tabs&&e.tabs.length>0?e.tabs[0].id:null),this.mountDom()}get isOpen(){return this._isOpen}get activeTab(){return this._activeTab}mountDom(){if(typeof document>`u`)return;if(r(this.id)){typeof console<`u`&&console.warn(`[ModalShell] "${this.id}" is owned by a legacy renderer; shell not mounted.`);return}let e=document.getElementById(this.id);e||(e=document.createElement(`div`),e.id=this.id,document.body.appendChild(e)),this.backdropEl=e,this.backdropEl.className=`modal-backdrop hidden ${this.options.customClass||``}`.trim();let t={sm:`modal-sm`,md:`modal-md`,lg:`modal-lg spatial-poi-dialog`,xl:`modal-box--large spatial-poi-dialog`,full:`modal-full spatial-poi-dialog`}[this.options.size||`lg`]||`modal-lg`;this.backdropEl.innerHTML=`
      <div class="modal-dialog ${t} ${this.options.dialogClass||``}" role="dialog" aria-modal="true" aria-labelledby="${this.id}-title">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-title-seal" id="${this.id}-seal">${this.options.seal||`◈`}</span>
            <div>
              <h2 class="modal-title-text" id="${this.id}-title">${this.options.title}</h2>
              <div class="modal-subtitle" id="${this.id}-subtitle">${this.options.subtitle||``}</div>
            </div>
          </div>
          <button class="ui-btn ui-btn--ghost ui-btn--icon" id="${this.id}-btn-close" title="Đóng [Esc]" aria-label="Close">×</button>
        </div>
        ${this.options.tabs&&this.options.tabs.length>0?`<div class="modal-tab-bar" id="${this.id}-tab-bar"></div>`:``}
        <div class="modal-body" id="${this.id}-body"></div>
        <div class="modal-footer hidden" id="${this.id}-footer"></div>
      </div>
    `,this.dialogEl=this.backdropEl.querySelector(`.modal-dialog`),this.titleEl=this.backdropEl.querySelector(`#${this.id}-title`),this.subtitleEl=this.backdropEl.querySelector(`#${this.id}-subtitle`),this.sealEl=this.backdropEl.querySelector(`#${this.id}-seal`),this.tabBarEl=this.backdropEl.querySelector(`#${this.id}-tab-bar`),this.bodyEl=this.backdropEl.querySelector(`#${this.id}-body`),this.footerEl=this.backdropEl.querySelector(`#${this.id}-footer`);let n=this.backdropEl.querySelector(`#${this.id}-btn-close`);n&&n.addEventListener(`click`,e=>{e.preventDefault(),this.close()}),this.options.closeOnBackdrop&&this.backdropEl.addEventListener(`click`,e=>{e.target===this.backdropEl&&this.close()}),this.options.tabs&&this.options.tabs.length>0&&this.renderTabs(this.options.tabs),this.options.actions&&this.options.actions.length>0&&this.setFooter(this.options.actions)}renderTabs(e){this.tabBarEl&&(this.tabBarEl.innerHTML=e.map(e=>`
        <button class="modal-tab-btn ${e.id===this._activeTab?`active`:``} ${e.disabled?`disabled`:``}" 
                data-tab-id="${e.id}" 
                ${e.disabled?`disabled`:``}>
          ${e.seal?`<span class="tab-seal">${e.seal}</span>`:``}
          <span class="tab-label">${e.label}</span>
          ${e.badge===void 0?``:`<span class="tab-badge">${e.badge}</span>`}
        </button>
      `).join(``),this.tabBarEl.querySelectorAll(`.modal-tab-btn`).forEach(e=>{e.addEventListener(`click`,t=>{t.preventDefault();let n=e.getAttribute(`data-tab-id`);n&&n!==this._activeTab&&this.switchTab(n)})}))}async open(e){this.backdropEl||this.mountDom(),this.backdropEl&&(e&&e!==this._activeTab&&(this._activeTab=e,this.updateActiveTabButton()),this.backdropEl.classList.remove(`hidden`),this._isOpen=!0,t.push(this,this.backdropEl),this.options.onOpen&&await this.options.onOpen(this))}async close(){this._isOpen&&this.backdropEl&&(this.backdropEl.classList.add(`hidden`),this._isOpen=!1,t.remove(this),this.options.onClose&&await this.options.onClose(this))}async toggle(){this._isOpen?await this.close():await this.open()}setContent(e){this.bodyEl&&(typeof e==`string`?this.bodyEl.innerHTML=e:(this.bodyEl.innerHTML=``,this.bodyEl.appendChild(e)))}setTitle(e,t,n){this.titleEl&&(this.titleEl.textContent=e),t!==void 0&&this.subtitleEl&&(this.subtitleEl.textContent=t),n!==void 0&&this.sealEl&&(this.sealEl.textContent=n)}async switchTab(e){this._activeTab=e,this.updateActiveTabButton(),this.options.onTabChange&&await this.options.onTabChange(e,this)}updateActiveTabButton(){this.tabBarEl&&this.tabBarEl.querySelectorAll(`.modal-tab-btn`).forEach(e=>{let t=e.getAttribute(`data-tab-id`);e.classList.toggle(`active`,t===this._activeTab)})}updateTabBadge(e,t){if(!this.tabBarEl)return;let n=this.tabBarEl.querySelector(`[data-tab-id="${e}"]`);if(!n)return;let r=n.querySelector(`.tab-badge`);t==null||t===``?r&&r.remove():(r||(r=document.createElement(`span`),r.className=`tab-badge`,n.appendChild(r)),r.textContent=String(t))}setFooter(e){if(this.footerEl){if(Array.isArray(e)){this.footerEl.innerHTML=``,this.footerEl.className=`modal-footer flex items-center justify-end gap-3`;for(let t of e){let e=document.createElement(`button`);e.className=`ui-btn ${t.variant===`ghost`?`ui-btn--ghost`:t.variant===`danger`?`ui-btn--danger`:t.variant===`gold`?`ui-btn--accent`:`ui-btn--primary`}`,e.textContent=t.label,t.disabled&&(e.disabled=!0),e.addEventListener(`click`,async e=>{e.preventDefault(),await t.onClick(this)}),this.footerEl.appendChild(e)}this.footerEl.classList.remove(`hidden`)}else typeof e==`string`?(this.footerEl.innerHTML=e,this.footerEl.classList.remove(`hidden`)):(this.footerEl.innerHTML=``,this.footerEl.appendChild(e),this.footerEl.classList.remove(`hidden`))}}getBodyElement(){return this.bodyEl}getDialogElement(){return this.dialogEl}destroy(){this._isOpen&&this.close(),this.options.onDestroy&&this.options.onDestroy(this),this.backdropEl&&this.backdropEl.parentNode&&this.backdropEl.parentNode.removeChild(this.backdropEl),this.backdropEl=null,this.dialogEl=null,this.bodyEl=null,this.tabBarEl=null,this.footerEl=null}};function a(e){return new i(e)}function o(e){return String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function s(e={}){let t=[`ui-btn`,`ui-btn--${e.variant||`secondary`}`];return e.size===`sm`&&t.push(`ui-btn--sm`),e.size===`lg`&&t.push(`ui-btn--lg`),e.className&&t.push(e.className),t.join(` `)}function c(e){let t=o(e.label),n=e.icon?`<span class="ui-btn__icon" aria-hidden="true">${o(e.icon)}</span>`:``;return`<button ${[`class="${o(s(e))}"`,e.id?`id="${o(e.id)}"`:``,e.title?`title="${o(e.title)}"`:``,e.disabled?`disabled`:``,`type="${e.type||`button`}"`,e.onClick?`onclick="${o(e.onClick)}"`:``].filter(Boolean).join(` `)}>${n}<span class="ui-btn__label">${t}</span></button>`}function l(e){let t=document.createElement(`button`);return t.className=s(e),t.type=e.type||`button`,e.id&&(t.id=e.id),e.title&&(t.title=e.title),t.disabled=!!e.disabled,t.innerHTML=`${e.icon?`<span class="ui-btn__icon" aria-hidden="true">${o(e.icon)}</span>`:``}<span class="ui-btn__label">${o(e.label)}</span>`,t}function u(e){return String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function d(e){let t=[`ui-badge`,`ui-badge--${e.tone||`neutral`}`,e.className||``].filter(Boolean).join(` `),n=e.title?` title="${u(e.title)}"`:``;return`<span class="${u(t)}"${n}>${u(e.label)}</span>`}function f(e){let t=document.createElement(`span`);return t.className=[`ui-badge`,`ui-badge--${e.tone||`neutral`}`,e.className||``].filter(Boolean).join(` `),e.title&&(t.title=e.title),t.textContent=e.label,t}function p(e){return String(e).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function m(e,t=`info`){let n=window;if(typeof n.showToast==`function`)try{n.showToast(e,t===`danger`);return}catch{}let r=document.getElementById(`toast`);r?(r.textContent=e,r.dataset.tone=t,r.classList.remove(`hidden`),window.setTimeout(()=>r.classList.add(`hidden`),2800)):console.log(`[toast:${t}] ${e}`)}var h=0;function g(e){return new Promise(t=>{let n=!1,r=e=>{n||(n=!0,t(e))},i=a({id:`ui-confirm-${++h}`,title:e.title||`Xác nhận`,seal:`問`,size:`sm`,onClose:()=>{r(!1),window.setTimeout(()=>i.destroy(),0)}});i.setContent(`<div class="ui-confirm">
         <div class="ui-confirm__message">${p(e.message)}</div>
         <div class="ui-toolbar ui-confirm__actions">
           ${c({label:e.cancelLabel||`Hủy`,variant:`ghost`,size:`sm`})}
           ${c({label:e.confirmLabel||`Xác nhận`,variant:e.danger?`danger`:`primary`,size:`sm`})}
         </div>
       </div>`);let o=i.getBodyElement()?.querySelectorAll(`.ui-confirm__actions .ui-btn`);o&&o.length===2&&(o[0].addEventListener(`click`,()=>void i.close()),o[1].addEventListener(`click`,()=>{r(!0),i.close()})),i.open()})}var _={version:`1.0.0`,button:{html:c,create:l},badge:{html:d,create:f},toast:m,confirm:g},v=class e{static instance;static getInstance(){return e.instance||=new e,e.instance}async get(e,t){let n=e;if(t){let e=new URLSearchParams;for(let[n,r]of Object.entries(t))r!=null&&e.append(n,String(r));let r=e.toString();r&&(n+=(n.includes(`?`)?`&`:`?`)+r)}let r=await fetch(n);if(!r.ok){let e=await r.json().catch(()=>({}));throw Error(e.error||`HTTP error ${r.status}: ${r.statusText}`)}return r.json()}async post(e,t){let n=await fetch(e,{method:`POST`,headers:{"Content-Type":`application/json`},body:t?JSON.stringify(t):void 0}),r=await n.json().catch(()=>({}));if(!n.ok||r&&r.success===!1)throw Error(r.error||`HTTP error ${n.status}: ${n.statusText}`);return r}},y=v.getInstance(),ee=class e{static instance;static getInstance(){return e.instance||=new e,e.instance}async getOverview(){let e=await y.get(`/api/lineage/status`);return e.overview||e}async getCourtshipCandidates(){return(await y.get(`/api/lineage/courtship-candidates`)).candidates||[]}async proposeMarriage(e){return y.post(`/api/lineage/courtship/propose`,{spouseNpcId:e})}async restAndCohabit(e){return y.post(`/api/lineage/household/rest`,{marriageId:e})}async assignHouseholdRole(e,t){return y.post(`/api/lineage/household/set-role`,{marriageId:e,role:t})}async assignMentor(e,t){return y.post(`/api/lineage/children/assign-mentor`,{childId:e,mentorNpcId:t})}async designateHeir(e){return y.post(`/api/lineage/children/designate-heir`,{childId:e})}async executeSuccession(e){return y.post(`/api/lineage/succession/execute`,{heirChildId:e})}},b=ee.getInstance(),x=class{modal;overview=null;candidates=[];selectedStratumFilter=`ALL`;constructor(){this.modal=a({id:`standard-lineage-family-modal`,title:`Gia Thất & Thế Gia Vọng Tộc`,subtitle:`Cầu hôn giai nhân, bồi dưỡng thế tử kế nghiệp, kiến lập gia tộc ngàn đời`,seal:`家`,size:`xl`,tabs:[{id:`courtship`,label:`Cầu Hôn & Thê Thiếp`,seal:`姻`},{id:`heirs`,label:`Hậu Duệ & Thụ Giáo`,seal:`嗣`},{id:`tree`,label:`Gia Phả Dòng Họ`,seal:`譜`},{id:`succession`,label:`Tông Miếu & Thừa Kế`,seal:`繼`}],activeTabId:`courtship`,onOpen:async()=>{await this.refreshData(),await this.renderActiveTab()},onTabChange:async e=>{await this.renderActiveTab()}})}async open(e=`courtship`){await this.modal.open(e)}async close(){await this.modal.close()}async refreshData(){try{let[e,t]=await Promise.all([b.getOverview().catch(()=>null),b.getCourtshipCandidates().catch(()=>[])]);this.overview=e,this.candidates=t;let n=e?.spouses?.length||0,r=e?.children?.length||0;this.modal.updateTabBadge(`courtship`,n>0?n:void 0),this.modal.updateTabBadge(`heirs`,r>0?r:void 0)}catch(e){console.error(`[LineageFamilyModal] Error refreshing data:`,e)}}async renderActiveTab(){switch(this.modal.activeTab||`courtship`){case`courtship`:this.renderCourtshipTab();break;case`heirs`:this.renderHeirsTab();break;case`tree`:this.renderTreeTab();break;case`succession`:this.renderSuccessionTab();break;default:this.renderCourtshipTab()}}renderCourtshipTab(){let e=this.overview?.spouses||[],t=e.length>0,n=this.candidates;this.selectedStratumFilter!==`ALL`&&(n=this.candidates.filter(e=>e.socialStratum===this.selectedStratumFilter));let r=`
      <div class="lineage-modal-content">
        <!-- Clan Banner -->
        <div class="spatial-banner-lead">
          <div class="lead-seal">家</div>
          <div class="lead-text">
            <h3>Gia Tộc Thế Hệ Thứ ${this.overview?.generation||1} • Danh Vọng Gia Tộc: ${this.overview?.clanPrestige||100}</h3>
            <div class="text-muted text-sm">
              ${t?`Đã thành gia lập thất với ${e.length} phu nhân. Gia đạo hòa thuận, con cháu hưng vượng.`:`Chưa lập gia thất. Hãy tìm kiếm giai nhân phù hợp từ thường dân hoặc danh môn để kết tóc se duyên.`}
            </div>
          </div>
        </div>

        <!-- Current Spouses Section -->
        ${t?`
          <div class="section-title text-gold font-bold mb-3">Chính Thê & Thê Thiếp Đang Chung Sống:</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            ${e.map(e=>this.renderSpouseCard(e)).join(``)}
          </div>
        `:``}

        <!-- Courtship Section -->
        <div class="flex items-center justify-between mb-3 border-b border-amber-900/40 pb-2">
          <div class="section-title text-gold font-bold">Danh Sách Giai Nhân & Đối Tượng Cầu Hôn:</div>
          <div class="flex gap-2">
            <button class="ui-btn ui-btn--sm ${this.selectedStratumFilter===`ALL`?`ui-btn--primary`:`ui-btn--ghost`}" onclick="window.LineageFamilyUI.setFilter('ALL')">Tất Cả (${this.candidates.length})</button>
            <button class="ui-btn ui-btn--sm ${this.selectedStratumFilter===`PEASANT`?`ui-btn--primary`:`ui-btn--ghost`}" onclick="window.LineageFamilyUI.setFilter('PEASANT')">Nông Gia</button>
            <button class="ui-btn ui-btn--sm ${this.selectedStratumFilter===`ARTISAN_SHOP`?`ui-btn--primary`:`ui-btn--ghost`}" onclick="window.LineageFamilyUI.setFilter('ARTISAN_SHOP')">Thợ Xưởng</button>
            <button class="ui-btn ui-btn--sm ${this.selectedStratumFilter===`GENTRY_CLAN`?`ui-btn--primary`:`ui-btn--ghost`}" onclick="window.LineageFamilyUI.setFilter('GENTRY_CLAN')">Sĩ Tộc</button>
            <button class="ui-btn ui-btn--sm ${this.selectedStratumFilter===`HISTORICAL_HEROINE`?`ui-btn--primary`:`ui-btn--ghost`}" onclick="window.LineageFamilyUI.setFilter('HISTORICAL_HEROINE')">Danh Viện</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          ${n.length>0?n.map(e=>this.renderCandidateCard(e)).join(``):`<div class="text-muted col-span-full py-6 text-center">Không có giai nhân nào trong danh mục này.</div>`}
        </div>
      </div>
    `;this.modal.setContent(r)}renderSpouseCard(e){let t=[{id:`HOUSEKEEPER`,name:`Quản Gia Tề Nội`},{id:`ENTERPRISE_SUPERVISOR`,name:`Giám Sát Sản Nghiệp`},{id:`STRATEGIC_ADVISOR`,name:`Mưu Lược Tham Mưu`},{id:`MILITARY_DEFENDER`,name:`Thống Soái Hộ Vệ`}],n=Number(e.pregnancy_stage)>0,r=Number(e.pregnancy_stage)===1?`Thai Nghén Sơ Kỳ (Tháng 1)`:Number(e.pregnancy_stage)===2?`Thai Kỳ Trung Kỳ (Tháng 2)`:Number(e.pregnancy_stage)===3?`Sắp Đến Ngày Lâm Bồn!`:`Bình thường`;return`
      <div class="tactical-card border-l-4 border-pink-500 p-3 bg-slate-900/80 rounded">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h4 class="text-amber-200 font-bold text-base m-0">${e.wife_name_vi}</h4>
            <div class="text-xs text-muted">Hôn Lễ: Ngày ${e.marriage_date} (Lượt ${e.marriage_turn})</div>
          </div>
          <div class="badge ${n?`badge-danger animate-pulse`:`badge-neutral`} text-xs">
            ${n?`育 `+r:`Hảo Cảm: `+e.intimacy}
          </div>
        </div>

        <div class="text-xs text-slate-300 mb-3 bg-slate-950/60 p-2 rounded border border-amber-900/30">
          <div class="font-semibold text-amber-300/90 mb-1">Trọng Trách Nội Trạch:</div>
          <select class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-100" 
                  onchange="window.LineageFamilyUI.assignRole('${e.marriage_id}', this.value)">
            ${t.map(t=>`<option value="${t.id}" ${e.household_role===t.id?`selected`:``}>${t.name}</option>`).join(``)}
          </select>
          <div class="text-muted mt-1 italic">${e.role_effect_desc_vi||``}</div>
        </div>

        <div class="flex gap-2">
          <button class="ui-btn ui-btn--primary ui-btn--sm flex-1" onclick="window.LineageFamilyUI.restCohabit('${e.marriage_id}')">
            心 Nghỉ Ngơi & Đồng Tẩm
          </button>
        </div>
      </div>
    `}renderCandidateCard(e){let t={PEASANT:{label:`Nông Thôn`,color:`badge-success`},ARTISAN_SHOP:{label:`Thợ Xưởng`,color:`badge-info`},GENTRY_CLAN:{label:`Sĩ Tộc`,color:`badge-warning`},HISTORICAL_HEROINE:{label:`Danh Viện`,color:`badge-danger`}}[e.socialStratum||`HISTORICAL_HEROINE`]||{label:`Danh Viện`,color:`badge-danger`};return`
      <div class="tactical-card p-3 bg-slate-900/70 border border-slate-800 rounded flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-start mb-2">
            <h4 class="text-amber-100 font-bold m-0 text-sm">${e.nameVi}</h4>
            <span class="badge ${t.color} text-xs">${t.label}</span>
          </div>

          <div class="text-xs text-muted mb-2 line-clamp-2">${e.clueVi}</div>

          ${e.maternalTrait?`
            <div class="bg-amber-950/30 border border-amber-900/40 rounded p-1.5 text-xs text-amber-300 mb-2">
              <span class="font-bold">Huyết Mạch:</span> ${e.maternalTrait.traitNameVi}
              <div class="text-muted text-[11px]">${e.maternalTrait.descriptionVi}</div>
            </div>
          `:``}

          <div class="text-xs text-slate-300 mb-3 flex items-center justify-between">
            <span>Sính Lễ Yêu Cầu:</span>
            <span class="text-amber-400 font-mono font-bold">${(e.recommendedDowryCash??0).toLocaleString()} Quan</span>
          </div>
        </div>

        <button class="ui-btn ui-btn--accent ui-btn--sm w-full" 
                onclick="window.LineageFamilyUI.proposeMarriage('${e.npcId}')">
          Cầu Hôn Nạp Sính Lễ
        </button>
      </div>
    `}renderHeirsTab(){let e=this.overview?.children||[],t=`
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

        ${e.length===0?`
          <div class="text-center py-12 text-muted">
            <div class="text-4xl mb-3">子</div>
            <div>Hiện tại gia tộc chưa có hậu duệ sinh hạ. Hãy nghỉ ngơi đồng tẩm cùng phu nhân để thụ thai dưỡng dục.</div>
          </div>
        `:`
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${e.map(e=>this.renderChildCard(e)).join(``)}
          </div>
        `}
      </div>
    `;this.modal.setContent(t)}renderChildCard(e){let t=e.is_heir===1;return`
      <div class="tactical-card p-4 bg-slate-900/80 border ${t?`border-amber-400 shadow-amber-900/20`:`border-slate-800`} rounded">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h4 class="text-amber-200 font-bold text-base m-0">${e.name_vi} ${e.style_name?`(${e.style_name})`:``}</h4>
            <div class="text-xs text-muted">${e.gender===`MALE`?`Nam Tử`:`Nữ Nhi`} • Tuổi: ${e.age} • Mẫu thân: ${e.mother_name_vi||`Nội thất`}</div>
          </div>
          <span class="badge ${t?`badge-primary`:`badge-neutral`} text-xs">
            ${t?`王 ĐÍCH TỬ KẾ VỊ`:`Thứ Tử`}
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
          ${e.assigned_mentor_name_vi||`<span class="text-muted">Chưa bái sư</span>`}
        </div>

        <div class="flex gap-2">
          ${t?``:`
            <button class="ui-btn ui-btn--accent ui-btn--sm flex-1" onclick="window.LineageFamilyUI.designateHeir('${e.child_id}')">
              Lập Làm Thế Tử
            </button>
          `}
          <button class="ui-btn ui-btn--ghost ui-btn--sm flex-1" onclick="window.LineageFamilyUI.assignMentorDialog('${e.child_id}')">
            Chỉ Định Danh Sư
          </button>
        </div>
      </div>
    `}renderTreeTab(){let e=`
      <div class="lineage-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">譜</div>
          <div class="lead-text">
            <h3>Gia Phả Tông Tộc • Thế Hệ ${this.overview?.generation||1}</h3>
            <div class="text-muted text-sm">Ghi chép công đức tiên tổ và thứ bậc con cháu dòng dõi.</div>
          </div>
        </div>

        <div class="p-6 bg-slate-950/60 rounded border border-amber-900/30 text-center">
          <div class="inline-block p-4 border-2 border-amber-500 rounded bg-slate-900 text-amber-200 font-bold text-lg mb-4">
            Đời Thứ ${this.overview?.generation||1}: ${this.overview?.clanName||`Lương Gia Tộc`}
          </div>
          <div class="text-xs text-muted mb-6">↓ Các chi phu nhân & thế tử tiếp nối ↓</div>
          
          <div class="flex flex-wrap justify-center gap-4">
            ${(this.overview?.children||[]).map(e=>`
              <div class="p-3 bg-slate-900 rounded border border-slate-700 min-w-[140px] text-xs">
                <div class="font-bold text-amber-300">${e.name_vi}</div>
                <div class="text-muted">${e.is_heir===1?`王 Thế Tử`:`Chi tộc`}</div>
              </div>
            `).join(``)}
          </div>
        </div>
      </div>
    `;this.modal.setContent(e)}renderSuccessionTab(){let e=this.overview?.activeHeir,t=`
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

        ${e?`
          <div class="tactical-card p-6 bg-slate-900/90 border border-amber-500/50 rounded mb-4">
            <h4 class="text-amber-300 font-bold text-lg mb-2">Thế Tử Kế Thừa: ${e.name_vi} (${e.age} Tuổi)</h4>
            <div class="text-sm text-slate-300 mb-4">
              Khi thực hiện chuyển giao:
              <ul class="list-disc list-inside mt-2 space-y-1 text-slate-400">
                <li>Nhân vật người chơi sẽ chuyển sang điều khiển <strong class="text-amber-200">${e.name_vi}</strong>.</li>
                <li>Thế hệ gia tộc tăng lên <strong>Thế Hệ Thứ ${(this.overview?.generation||1)+1}</strong>.</li>
                <li>100% Tiền mặt, Sản nghiệp và Binh khí truyền quốc được bảo lưu toàn vẹn.</li>
              </ul>
            </div>

            <button class="ui-btn ui-btn--accent w-full py-2.5 text-base font-bold" 
                    onclick="window.LineageFamilyUI.executeSuccession()">
              Khởi Sự Kế Thừa Gia Tộc
            </button>
          </div>
        `:`
          <div class="text-center py-10 text-muted">
            Chưa chỉ định Thế tử kế vị. Vui lòng vào mục "Hậu Duệ" và chọn một người con trưởng thành làm thế tử.
          </div>
        `}
      </div>
    `;this.modal.setContent(t)}setFilter(e){this.selectedStratumFilter=e,this.renderCourtshipTab()}async proposeMarriage(e){try{let t=await b.proposeMarriage(e);typeof window.showToast==`function`&&window.showToast(t.narrativeVi||`Kết tóc se duyên thành công!`),await this.refreshData(),await this.renderActiveTab()}catch(e){typeof window.showToast==`function`&&window.showToast(e.message||`Cầu hôn thất bại!`,!0)}}async restCohabit(e){try{let t=await b.restAndCohabit(e);typeof window.showToast==`function`&&window.showToast(t.narrativeVi||`Đồng tẩm nghỉ ngơi tĩnh dưỡng thành công!`),await this.refreshData(),await this.renderActiveTab()}catch(e){typeof window.showToast==`function`&&window.showToast(e.message||`Không thể nghỉ ngơi lúc này!`,!0)}}async assignRole(e,t){try{await b.assignHouseholdRole(e,t),typeof window.showToast==`function`&&window.showToast(`Đã phân công trọng trách nội trạch thành công!`),await this.refreshData()}catch(e){typeof window.showToast==`function`&&window.showToast(e.message||`Lỗi phân công trọng trách!`,!0)}}async designateHeir(e){try{await b.designateHeir(e),typeof window.showToast==`function`&&window.showToast(`Đã chỉ định đích tử kế vị gia tộc!`),await this.refreshData(),await this.renderActiveTab()}catch(e){typeof window.showToast==`function`&&window.showToast(e.message||`Không thể lập thế tử!`,!0)}}async assignMentorDialog(e){let t=prompt(`Nhập ID danh sư thụ giáo (ví dụ: NPC-0003 cho Quan Vũ, NPC-0001 cho Lư Thực):`,`NPC-0003`);if(t)try{await b.assignMentor(e,t),typeof window.showToast==`function`&&window.showToast(`Đã bái kiến danh sư thụ giáo thành công!`),await this.refreshData(),await this.renderActiveTab()}catch(e){typeof window.showToast==`function`&&window.showToast(e.message||`Lỗi chỉ định danh sư!`,!0)}}async executeSuccession(){if(confirm(`Bạn có chắc chắn muốn chuyển giao quyền lực sang Thế tử kế thừa không?`))try{let e=this.overview?.activeHeir?.child_id;if(!e)throw Error(`Chưa chỉ định Thế tử kế vị.`);let t=await b.executeSuccession(e);typeof window.showToast==`function`&&window.showToast(t.narrativeVi||`Đại điển kế thừa tông miếu hoàn tất!`),await this.refreshData(),await this.renderActiveTab()}catch(e){typeof window.showToast==`function`&&window.showToast(e.message||`Kế thừa thất bại!`,!0)}}},S=new x,te=class e{static instance;static getInstance(){return e.instance||=new e,e.instance}async getOverview(e=`PLY-0001`){let t=await y.get(`/api/equipment`,{characterId:e});return t.overview||t}async equipItem(e,t,n){return y.post(`/api/equipment/equip`,{characterId:e,slot:t,itemCode:n})}async unequipItem(e,t){return y.post(`/api/equipment/unequip`,{characterId:e,slot:t})}async forgeBespokeWeapon(e){return y.post(`/api/professions/forge/bespoke`,e)}async getTools(e=`PLY-0001`){return(await y.get(`/api/professions/tools`,{characterId:e})).tools||[]}async repairTool(e,t){return y.post(`/api/professions/tools/repair`,{characterId:e,itemCode:t,idempotencyKey:`tool-repair-${e}-${t}-${Date.now()}`})}},C=te.getInstance();function w(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}var ne=class{modal;currentCharacterId=`PLY-0001`;overview=null;tools=[];constructor(){this.modal=a({id:`equipment-forge-modal`,title:`Vũ Khố & Lò Rèn Thiết Điếm`,subtitle:`Quản lý 4 ô chiến bị truyền quốc và đúc rèn thần binh độc bản`,seal:`武`,size:`xl`,tabs:[{id:`gear`,label:`Binh Khí & Giáp Trụ`,seal:`武`},{id:`forge_bespoke`,label:`Đúc Rèn Thần Binh`,seal:`鍛`},{id:`inventory`,label:`Kho Binh Khí`,seal:`貨`},{id:`tools`,label:`Công Cụ & Sửa Chữa`,seal:`器`}],activeTabId:`gear`,onOpen:async()=>{await this.refreshData(),await this.renderActiveTab()},onTabChange:async()=>{await this.renderActiveTab()}})}async open(e=`PLY-0001`,t=`gear`){this.currentCharacterId=e,await this.modal.open(t)}async close(){await this.modal.close()}async refreshData(){let[e,t]=await Promise.all([C.getOverview(this.currentCharacterId).catch(e=>(console.error(`[EquipmentForgeModal] Error refreshing overview:`,e),null)),C.getTools(this.currentCharacterId).catch(e=>(console.error(`[EquipmentForgeModal] Error refreshing tools:`,e),[]))]);this.overview=e,this.tools=t}async renderActiveTab(){switch(this.modal.activeTab||`gear`){case`gear`:this.renderGearTab();break;case`forge_bespoke`:this.renderForgeBespokeTab();break;case`inventory`:this.renderInventoryTab();break;case`tools`:this.renderToolsTab()}}renderGearTab(){if(!this.overview)return;let e=this.overview.slots,t=this.overview.effectiveStats||{},n=this.overview.baseStats||{},r=`
      <div class="equipment-modal-content">
        <!-- Lead Banner -->
        <div class="spatial-banner-lead">
          <div class="lead-seal">武</div>
          <div class="lead-text">
            <h3>Chiến Bị Của ${this.overview.characterNameVi||`Lương Diễn`}</h3>
            <div class="text-muted text-sm">Hiệu ứng chiến bị kích hoạt thuộc tính vàng khi vượt ngưỡng 100 điểm.</div>
          </div>
        </div>

        <!-- Effective Attributes Bar -->
        <div class="grid grid-cols-4 gap-2 mb-4 font-mono text-xs text-center bg-slate-950/80 p-2.5 rounded border border-amber-900/40">
          <div>VÕ: <strong class="${(t.war||0)>=100?`text-amber-400 font-bold`:`text-red-400`}">${t.war||n.war||50}</strong> <span class="text-muted text-[10px]">(${n.war||50})</span></div>
          <div>THỐNG: <strong class="${(t.ldr||0)>=100?`text-amber-400 font-bold`:`text-amber-300`}">${t.ldr||n.ldr||50}</strong> <span class="text-muted text-[10px]">(${n.ldr||50})</span></div>
          <div>TRÍ: <strong class="${(t.int||0)>=100?`text-amber-400 font-bold`:`text-blue-400`}">${t.int||n.int||50}</strong> <span class="text-muted text-[10px]">(${n.int||50})</span></div>
          <div>XẢO: <strong class="${(t.cra||0)>=100?`text-amber-400 font-bold`:`text-cyan-400`}">${t.cra||n.cra||50}</strong> <span class="text-muted text-[10px]">(${n.cra||50})</span></div>
        </div>

        <!-- 4 Equipment Slots Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${this.renderSlotCard(`WEAPON`,`Binh Khí Tấn Công`,`武`,e.WEAPON)}
          ${this.renderSlotCard(`ARMOR`,`Khôi Giáp Phòng Hộ`,`盾`,e.ARMOR)}
          ${this.renderSlotCard(`STEED`,`Chiến Mã Tọa Kỵ`,`馬`,e.STEED)}
          ${this.renderSlotCard(`TREASURE`,`Bảo Vật & Binh Thư`,`卷`,e.TREASURE)}
        </div>
      </div>
    `;this.modal.setContent(r)}renderSlotCard(e,t,n,r){let i=r&&r.itemCode;return`
      <div class="tactical-card p-3 bg-slate-900/80 rounded border ${i?`border-amber-500/50`:`border-slate-800`} flex justify-between items-center">
        <div>
          <div class="text-xs text-muted font-bold flex items-center gap-1">
            <span>${n}</span> ${t}
          </div>
          <div class="font-bold text-sm ${i?`text-amber-200`:`text-slate-500`} mt-1">
            ${i?r.nameVi:`Trống (Chưa Trang Bị)`}
          </div>
          ${i&&r.statModifierDesc?`
            <div class="text-[11px] text-green-400 font-mono mt-0.5">${r.statModifierDesc}</div>
          `:``}
        </div>
        <div>
          ${i?`
            <button class="ui-btn ui-btn--ghost ui-btn--sm" onclick="window.EquipmentUI.unequip('${this.currentCharacterId}', '${e}')">Tháo Ra</button>
          `:`
            <button class="ui-btn ui-btn--primary ui-btn--sm" onclick="window.EquipmentUI.switchTab('inventory')">Trang Bị</button>
          `}
        </div>
      </div>
    `}renderForgeBespokeTab(){let e=this.overview?.baseStats?.cra||50,t=`
      <div class="equipment-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">鍛</div>
          <div class="lead-text">
            <h3>Đoán Tạo Thần Binh Tùy Biến (Bespoke Forge)</h3>
            <div class="text-muted text-sm">Chế tác thần binh độc bản khắc tên tướng lĩnh, tiêu hao 25 Thể lực và nguyên liệu luyện tinh.</div>
          </div>
        </div>

        ${e>=50?`
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
        `:`
          <div class="text-center py-8 text-muted">
            Cần chỉ số Kỹ Nghệ (CRA) đạt tối thiểu 50 để mở lò rèn thần binh. Hiện tại CRA của bạn: ${e}.
          </div>
        `}
      </div>
    `;this.modal.setContent(t)}renderInventoryTab(){let e=this.overview?.inventoryGear||[],t=`
      <div class="equipment-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">貨</div>
          <div class="lead-text">
            <h3>Kho Khí Giới Trác Huyện</h3>
            <div class="text-muted text-sm">Kho vũ khí, giáp trụ và chiến mã sẵn sàng trang bị cho nhân vật.</div>
          </div>
        </div>

        ${e.length===0?`
          <div class="text-center py-8 text-muted">
            Kho vũ khí hiện không có trang bị nào. Hãy mua từ chợ phiên hoặc chế tác tại Lò Rèn.
          </div>
        `:`
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${e.map(e=>`
              <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                <div>
                  <div class="font-bold text-amber-200 text-sm">${e.nameVi}</div>
                  <div class="text-xs text-muted">Vị trí: ${e.slot} • SL: ${e.quantity}</div>
                </div>
                <button class="ui-btn ui-btn--primary ui-btn--sm" onclick="window.EquipmentUI.equip('${this.currentCharacterId}', '${e.slot}', '${e.itemCode}')">
                  Mặc Vào
                </button>
              </div>
            `).join(``)}
          </div>
        `}
      </div>
    `;this.modal.setContent(t)}renderToolsTab(){let e=this.tools,t=e.length>0?e.map(e=>{let t=e.kind===`DURABLE`?`Bền`:`Tiêu hao`,n=e.repairSkillCode?`${e.repairSkillCode} bậc ${e.repairMinTier}`:`Không yêu cầu kỹ năng`,r=e.kind===`CONSUMABLE`?`Vật phẩm tiêu hao — mua mới thay vì sửa.`:e.needsRepair?e.canRepair?`Sửa tốn ${e.repairCash} Quan, hồi đầy ${e.maxUses} lượt.`:`Cần ${n} (hiện bậc ${e.skillTier}).`:`Đang ở độ bền tối đa.`,i=e.needsRepair&&e.canRepair;return`
          <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
            <div class="flex justify-between items-start gap-3">
              <div>
                <div class="font-bold text-amber-200 text-sm">${w(e.nameVi)}</div>
                <div class="text-xs text-muted">${w(e.itemCode)} • ${t} • SL: ${e.quantity}</div>
              </div>
              <button class="ui-btn ui-btn--primary ui-btn--sm" ${i?``:`disabled`}
                onclick="window.EquipmentUI.repairTool('${w(e.itemCode)}')">Sửa Chữa</button>
            </div>
            <div class="text-[11px] text-slate-300 mt-2">
              Độ bền: ${e.usesLeft}/${e.maxUses} lượt
              <progress class="tool-durability-bar" max="${e.maxUses}" value="${e.usesLeft}"></progress>
            </div>
            <div class="text-[11px] text-muted mt-1">${w(r)}</div>
          </div>
        `}).join(``):`<div class="text-center py-8 text-muted">
          Kho chưa có công cụ nào. Chế tác tại Lò Rèn hoặc mua từ chợ phiên.
        </div>`;this.modal.setContent(`
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
    `)}async repairTool(e){try{let t=await C.repairTool(this.currentCharacterId,e),n=t?.result||t;typeof window.showToast==`function`&&window.showToast(`Đã sửa ${e}: ${n?.usesBefore??`?`} → ${n?.usesAfter??`?`} lượt (${n?.cashPaid??0} Quan).`),await this.refreshData(),await this.renderActiveTab()}catch(e){typeof window.showToast==`function`&&window.showToast(e.message||`Sửa công cụ thất bại!`,!0)}}async equip(e,t,n){try{await C.equipItem(e,t,n),typeof window.showToast==`function`&&window.showToast(`Đã trang bị thành công!`),await this.refreshData(),await this.renderActiveTab()}catch(e){typeof window.showToast==`function`&&window.showToast(e.message||`Lỗi trang bị!`,!0)}}async unequip(e,t){try{await C.unequipItem(e,t),typeof window.showToast==`function`&&window.showToast(`Đã tháo trang bị về kho!`),await this.refreshData(),await this.renderActiveTab()}catch(e){typeof window.showToast==`function`&&window.showToast(e.message||`Lỗi tháo trang bị!`,!0)}}async executeForge(){let e=document.getElementById(`forge-weapon-name`),t=document.getElementById(`forge-weapon-cat`),n=document.getElementById(`forge-material-tier`),r=document.getElementById(`forge-destination`),i={characterId:this.currentCharacterId,weaponNameVi:e?.value||`Thần Binh Trác Huyện`,weaponCategory:t?.value||`BLADE`,targetAttr:`war`,materialTier:n?.value||`STANDARD`,destination:r?.value||`EQUIP`};try{let e=await C.forgeBespokeWeapon(i);typeof window.showToast==`function`&&window.showToast(e.narrativeVi||`Đúc rèn thần binh thành công!`),await this.refreshData(),await this.modal.switchTab(`gear`)}catch(e){typeof window.showToast==`function`&&window.showToast(e.message||`Đúc rèn thất bại!`,!0)}}},T=new ne,E=class e{static instance;static getInstance(){return e.instance||=new e,e.instance}async getStatus(e=`PLY-0001`){let t=await y.get(`/api/enterprise/status`,{characterId:e});return t.status||t}async manageSafeCash(e,t,n){return y.post(`/api/enterprise/manage-safe-cash`,{enterpriseId:e,action:t,amount:n})}async executeLaborShift(e,t){return y.post(`/api/enterprise/work`,{shiftId:e})}},D=E.getInstance(),re=class{modal;enterprises=[];laborOptions=[];constructor(){this.modal=a({id:`enterprise-modal`,title:`Sản Nghiệp & Phường Xưởng Bách Nghệ`,subtitle:`Quản lý xưởng dệt, xưởng rèn, đi làm thuê công nhật tích lũy ngân lượng`,seal:`業`,size:`xl`,tabs:[{id:`owner`,label:`Sản Nghiệp Gia Tộc`,seal:`坊`},{id:`work`,label:`Đi Làm Thuê Thời Vụ`,seal:`工`}],activeTabId:`owner`,onOpen:async()=>{await this.refreshData(),await this.renderActiveTab()},onTabChange:async()=>{await this.renderActiveTab()}})}async open(e=`owner`){await this.modal.open(e)}async close(){await this.modal.close()}async refreshData(){try{let e=await D.getStatus(`PLY-0001`);this.enterprises=e?.ownedBusinesses||e?.activeEnterprises||[],this.laborOptions=e?.laborOptions||[]}catch(e){console.error(`[EnterpriseWorkshopModal] Error refreshing data:`,e)}}async renderActiveTab(){(this.modal.activeTab||`owner`)===`owner`?this.renderOwnerTab():this.renderWorkTab()}renderOwnerTab(){let e=`
      <div class="enterprise-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">業</div>
          <div class="lead-text">
            <h3>Sản Nghiệp Sở Hữu (${this.enterprises.length} Cơ Sở)</h3>
            <div class="text-muted text-sm">Các xưởng chế tác tự động vận hành chu kỳ sản xuất hàng tháng và tích lũy doanh thu vào Quỹ an toàn.</div>
          </div>
        </div>

        ${this.enterprises.length===0?`
          <div class="text-center py-10 text-muted">
            Hiện tại bạn chưa sở hữu sản nghiệp nào. Hãy tích lũy tiền tệ hoặc làm thuê để mua lại xưởng mộc, xưởng rèn tại Trác Huyện.
          </div>
        `:`
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${this.enterprises.map(e=>`
              <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800">
                <div class="flex justify-between items-start mb-2">
                  <h4 class="text-amber-200 font-bold m-0 text-base">${e.name_vi}</h4>
                  <span class="badge badge-success text-xs">${e.status||`VẬN HÀNH`}</span>
                </div>
                <div class="text-xs text-muted mb-3">Địa điểm: ${e.settlement_id} • Thợ xưởng: ${e.worker_count||1}/${e.max_workers||5}</div>

                <div class="bg-slate-950/70 p-2.5 rounded font-mono text-xs mb-3 space-y-1">
                  <div class="flex justify-between">
                    <span class="text-muted">Quỹ An Toàn:</span>
                    <span class="text-amber-400 font-bold">${Number(e.safe_cash||0).toLocaleString()} Quan</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted">Chi Phí Tháng:</span>
                    <span class="text-red-400 font-bold">${Number(e.monthly_overhead||0).toLocaleString()} Quan</span>
                  </div>
                </div>

                <div class="flex gap-2">
                  <button class="ui-btn ui-btn--primary ui-btn--sm flex-1" onclick="window.EnterpriseUI.depositSafeCash('${e.enterprise_id}')">Nạp Quỹ</button>
                  <button class="ui-btn ui-btn--ghost ui-btn--sm flex-1" onclick="window.EnterpriseUI.withdrawSafeCash('${e.enterprise_id}')">Rút Quan</button>
                </div>
              </div>
            `).join(``)}
          </div>
        `}
      </div>
    `;this.modal.setContent(e)}renderWorkTab(){this.modal.setContent(`
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
    `)}async depositSafeCash(e){let t=prompt(`Nhập số tiền muốn nạp vào quỹ an toàn:`,`500`);if(!t)return;let n=parseInt(t,10);if(!(isNaN(n)||n<=0))try{await D.manageSafeCash(e,`DEPOSIT`,n),typeof window.showToast==`function`&&window.showToast(`Đã nạp tiền vào Quỹ an toàn!`),await this.refreshData(),await this.renderActiveTab()}catch(e){typeof window.showToast==`function`&&window.showToast(e.message||`Lỗi nạp tiền!`,!0)}}async withdrawSafeCash(e){let t=prompt(`Nhập số tiền muốn rút từ quỹ an toàn:`,`500`);if(!t)return;let n=parseInt(t,10);if(!(isNaN(n)||n<=0))try{await D.manageSafeCash(e,`WITHDRAW`,n),typeof window.showToast==`function`&&window.showToast(`Đã rút tiền từ Quỹ an toàn về ngân khố!`),await this.refreshData(),await this.renderActiveTab()}catch(e){typeof window.showToast==`function`&&window.showToast(e.message||`Lỗi rút tiền!`,!0)}}async executeWork(e){try{let t=await D.executeLaborShift(e);typeof window.showToast==`function`&&window.showToast(t.narrativeVi||`Lao động hoàn tất, nhận tiền công!`),await this.refreshData(),await this.renderActiveTab()}catch(e){typeof window.showToast==`function`&&window.showToast(e.message||`Không thể làm việc lúc này!`,!0)}}},O=new re,ie=class e{static instance;static getInstance(){return e.instance||=new e,e.instance}async getProtagonistDossier(){let e=await y.get(`/api/status`),t=e.player||{};return{characterId:t.character_id||`PLY-0001`,nameVi:t.name_vi||`Lương Diễn`,nameEn:t.name_en||`Liang Yan`,styleName:t.style_name||`Chí Viễn`,age:t.age||20,locationVi:e.settlement?.nameVi||`Trác Huyện`,positionVi:t.position_vi||`Thương Gia Tự Do`,personality:`PRAGMATIC`,motivation:`HEGEMONY`,bioVi:`Hậu nhân Lương thị U Châu, thông tuệ thương đạo, ôm chí lớn bình định loạn thế Tam Quốc.`,stats:{war:t.war_attr||50,int:t.int_attr||50,ldr:t.ldr_attr||50,pol:t.pol_attr||50,com:t.com_attr||60,dip:t.dip_attr||50,cra:t.cra_attr||55,log:t.log_attr||50},talents:t.talents?typeof t.talents==`string`?JSON.parse(t.talents):t.talents:[`THƯƠNG_TRÍ`,`KỸ_XẢO`]}}async getNpcDossier(e){let t=await y.get(`/api/npcs/dossier`,{npcId:e});return t.dossier||t}},k=ie.getInstance(),ae=class{protagonistModal;npcModal;currentProtagonist=null;currentNpc=null;constructor(){this.protagonistModal=a({id:`protagonist-dossier-modal`,title:`Hồ Sơ Nhân Vật Chính • Lương Diễn (Chí Viễn)`,subtitle:`Toàn bộ chỉ số năng lực 8 chiều, danh hiệu và thiên phú bản mệnh`,seal:`主`,size:`lg`,onOpen:async()=>{await this.loadProtagonist()}}),this.npcModal=a({id:`npc-dossier-modal`,title:`Hồ Sơ Nhân Vật • Danh Tướng Tam Quốc`,subtitle:`Tình báo nhân vật, mức độ thân thiện và bí mật sương mù chiến tranh`,seal:`将`,size:`lg`})}async openProtagonist(){await this.protagonistModal.open()}async closeProtagonist(){await this.protagonistModal.close()}async openNpc(e){try{this.currentNpc=await k.getNpcDossier(e),this.npcModal.setTitle(`Hồ Sơ Nhân Vật • ${this.currentNpc.nameVi}`,`Địa điểm: ${this.currentNpc.locationVi||`U Châu`} • Thân phận: ${this.currentNpc.positionVi||`Võ Tướng`}`),this.renderNpcContent(),await this.npcModal.open()}catch(e){console.error(`[DossiersModal] Error loading NPC:`,e)}}async closeNpc(){await this.npcModal.close()}async loadProtagonist(){try{this.currentProtagonist=await k.getProtagonistDossier(),this.renderProtagonistContent()}catch(e){console.error(`[DossiersModal] Error loading protagonist:`,e)}}renderProtagonistContent(){let e=this.currentProtagonist;if(!e)return;let t=e.stats,n=`
      <div class="dossier-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">主</div>
          <div class="lead-text">
            <h3>${e.nameVi} (${e.styleName||`Chí Viễn`}) • Tuổi: ${e.age}</h3>
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
    `;this.protagonistModal.setContent(n)}renderNpcContent(){let e=this.currentNpc;if(!e)return;let t=e.stats||{war:50,int:50,ldr:50,pol:50,com:50,dip:50,cra:50,log:50},n=`
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
          <p class="text-xs text-slate-300 leading-relaxed">${e.bioVi||`Nhân tài hào kiệt uy chấn phương bắc.`}</p>
        </div>
      </div>
    `;this.npcModal.setContent(n)}},A=new ae,j=class{modal;currentMode=`BUY`;currentItemCode=`COM-GRAIN`;currentPrice=50;constructor(){this.modal=a({id:`standard-trade-modal`,title:`Giao Dịch Hàng Hóa Chợ Phiên`,subtitle:`Thực thi giao thương hàng hóa, cân bằng sổ cái kép kế toán ACID`,seal:`貿`,size:`sm`})}async open(e,t,n=1,r=50){this.currentMode=e,this.currentItemCode=t,this.currentPrice=r,this.modal.setTitle(e===`BUY`?`Thu Mua Vật Phẩm`:`Xuất Bán Hàng Hóa`,`Mã vật phẩm: ${t} • Đơn giá hiện tại: ${r} Quan`,e===`BUY`?`買`:`賣`),this.renderForm(n),await this.modal.open()}async close(){await this.modal.close()}renderForm(e){let t=`
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
          <span class="text-amber-400 font-bold text-sm" id="quick-trade-total">${(e*this.currentPrice).toLocaleString()} Quan</span>
        </div>
        <button class="ui-btn ui-btn--accent w-full py-2 font-bold mt-2" onclick="window.QuickTradeModal.submit()">
          Xác Nhận ${this.currentMode===`BUY`?`Thu Mua`:`Bán Hàng`}
        </button>
      </div>
    `;this.modal.setContent(t)}updateTotal(){let e=document.getElementById(`quick-trade-qty`),t=document.getElementById(`quick-trade-total`);e&&t&&(t.textContent=`${((parseFloat(e.value)||0)*this.currentPrice).toLocaleString()} Quan`)}async submit(){let e=document.getElementById(`quick-trade-qty`),t=parseFloat(e?.value||`1`);if(isNaN(t)||t<=0)return;let n={type:this.currentMode===`BUY`?`TRADE_BUY`:`TRADE_SELL`,item_code:this.currentItemCode,quantity:t,unit_price:this.currentPrice,counterparty:`Thương Khách Chợ Phiên`,idempotency_key:`TSQUICK_${this.currentMode}_${this.currentItemCode}_${Date.now()}`};try{let e=window.dispatchDirectAction,t=e?await e(n):await y.post(`/api/action`,n);if(t&&t.success===!1){typeof window.showToast==`function`&&window.showToast(`Bị từ chối: ${t.error||`Giao dịch thất bại`}`,!0);return}await this.modal.close(),typeof window.loadStatus==`function`&&await window.loadStatus(),typeof window.loadDeckInventory==`function`&&await window.loadDeckInventory()}catch(e){typeof window.showToast==`function`&&window.showToast(e.message||`Giao dịch thất bại!`,!0)}}},M=new j,N=class e{static instance;static getInstance(){return e.instance||=new e,e.instance}async getBanquetStatus(){return y.get(`/api/banquet/status`)}async drinkWine(){return y.post(`/api/banquet/drink`,{})}async hostBanquet(e){return y.post(`/api/banquet/host`,{tierId:e})}async swearBrotherhood(e){return y.post(`/api/banquet/brotherhood`,{targetNpcId:e})}async getArenaRoster(){return y.get(`/api/arena/roster`)}async startDuel(e){return y.post(`/api/arena/duel/start`,{opponentId:e})}async executeDuelRound(e,t){return y.post(`/api/arena/duel/round`,{duelId:e,action:t})}async restAtResidence(e=1){return y.post(`/api/character/rest`,{days:e})}}.getInstance(),P=class{modal;currentDuelId=null;duelState=null;constructor(){this.modal=a({id:`tactical-battle-modal`,title:`Quyết Đấu Sa Trường • Đơn Đả Độc Đấu 1v1`,subtitle:`Tương tác chiến thuật 4 lệnh (Công Kích, Phòng Ngự, Tuyệt Kỹ, Tụ Khí)`,seal:`斗`,size:`lg`})}async startDuel(e){try{let t=await N.startDuel(e);this.currentDuelId=t.duelId,this.duelState=t.state,this.renderDuel(),await this.modal.open()}catch(e){typeof window.showToast==`function`&&window.showToast(e.message||`Lỗi khởi động giao đấu!`,!0)}}async close(){await this.modal.close()}renderDuel(){let e=this.duelState;if(!e)return;let t=`
      <div class="tactical-battle-content">
        <div class="p-3 bg-slate-950/80 rounded border border-amber-900/40 mb-3">
          <div class="flex justify-between items-center mb-3">
            <span class="font-bold text-amber-200">Hiệp Đấu Thứ ${e.round}</span>
            <span class="badge ${e.isConcluded?`badge-danger`:`badge-primary`}">${e.isConcluded?`TRẬN ĐẤU KẾT THÚC`:`ĐANG ĐỐI ĐẦU`}</span>
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

          ${e.isConcluded?`
            <div class="text-center font-bold text-amber-300 py-2">
              ${e.outcome||`Quyết đấu hoàn tất!`}
            </div>
          `:`
            <div class="grid grid-cols-4 gap-2">
              <button class="ui-btn ui-btn--primary ui-btn--sm" onclick="window.TacticalBattleUI.executeAction('ATTACK')">Công Kích</button>
              <button class="ui-btn ui-btn--ghost ui-btn--sm" onclick="window.TacticalBattleUI.executeAction('DEFEND')">Phòng Ngự</button>
              <button class="ui-btn ui-btn--accent ui-btn--sm" onclick="window.TacticalBattleUI.executeAction('SPECIAL_STRIKE')">Tuyệt Kỹ</button>
              <button class="ui-btn ui-btn--ghost ui-btn--sm" onclick="window.TacticalBattleUI.executeAction('FOCUS_SPIRIT')">Tụ Khí</button>
            </div>
          `}
        </div>

        <div class="bg-black/60 p-3 rounded text-xs font-mono max-h-48 overflow-y-auto space-y-1">
          ${e.combatLogs.map(e=>`<div>${e}</div>`).join(``)}
        </div>
      </div>
    `;this.modal.setContent(t)}async executeAction(e){if(this.currentDuelId)try{this.duelState=await N.executeDuelRound(this.currentDuelId,e),this.renderDuel()}catch(e){typeof window.showToast==`function`&&window.showToast(e.message||`Lỗi hiệp đấu!`,!0)}}},F=new P,I=class{travelModal;turnModal;constructor(){this.travelModal=a({id:`travel-transit-modal`,title:`Lộ Trình Viễn Chinh • Dặm Trường Phong Vân`,subtitle:`Hành quân liên châu, khảo sát địa hình và ứng biến trước hiểm họa dọc đường`,seal:`行`,size:`md`}),this.turnModal=a({id:`turn-advance-modal`,title:`Ngày Tiếp Theo • Dòng Thời Gian`,subtitle:`Tiến một ngày, chi dùng hằng ngày và tự động chốt tháng khi sang mùng 1`,seal:`歲`,size:`md`})}async showTravelTransit(e,t,n,r){this.travelModal.setTitle(`Hành Trình Viễn Chinh`,`Từ ${e} → Đến ${t} (${n} ngày đường)`),this.travelModal.setContent(`
      <div class="travel-transit-body p-2 space-y-3">
        <div class="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono">
          ${r||`<div>Xe ngựa lăn bánh trên quan đạo phương bắc... An toàn đến nơi!</div>`}
        </div>
        <button class="ui-btn ui-btn--primary w-full py-2 font-bold" onclick="window.TravelTransitUI.close()">
          Nhập Thành
        </button>
      </div>
    `),await this.travelModal.open()}async openTravelTransitModal(){await this.travelModal.open()}async closeTravelTransitModal(){await this.travelModal.close()}async closeTravel(){await this.travelModal.close()}async showTurnAdvance(e,t,n){this.turnModal.setTitle(`Ngày ${t}`,`Nhịp thời gian: ngày ${e} • Chi dùng và tiến trình tự động`),this.turnModal.setContent(`
      <div class="turn-advance-body p-2 space-y-3">
        <div class="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono space-y-1">
          ${n||`
            <div class="text-green-400">◆ Một ngày trôi qua: lương thảo tiêu hao, thể lực hồi phục.</div>
            <div class="text-amber-300">◆ Công việc dài ngày và thương đoàn tiếp tục tiến.</div>
            <div class="text-blue-300">◆ Sang mùng 1, tháng tự động kết toán sản nghiệp và thế giới.</div>
          `}
        </div>
        <button class="ui-btn ui-btn--accent w-full py-2 font-bold" onclick="window.TurnAdvanceUI.close()">
          Tiếp Tục Mô Phỏng
        </button>
      </div>
    `),await this.turnModal.open()}async closeTurn(){await this.turnModal.close()}async openTurnAdvanceModal(){await this.turnModal.open()}async closeTurnAdvanceModal(){await this.turnModal.close()}},L=new I;function oe(){return window.currentLang===`en`}function R(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function se(e){if(!e||typeof e!=`object`)return``;let t=[];if(e.cash&&t.push(`+${e.cash} Quan`),e.fame&&t.push(`+${e.fame} ${oe()?`fame`:`danh vọng`}`),e.exp)for(let[n,r]of Object.entries(e.exp))r&&t.push(`+${r} ${String(n).toUpperCase()} EXP`);if(Array.isArray(e.items))for(let n of e.items)t.push(`${n.quantity}× ${n.code}`);return t.join(` • `)}var z=new class{modal;constructor(){this.modal=a({id:`quest-modal`,title:`Nhật Ký Nhiệm Vụ`,subtitle:`Nhiệm vụ theo từng phẩm lộ, dữ liệu lấy từ DB`,seal:`任`,size:`md`})}async open(){await this.modal.open(),await this.refresh(null)}async close(){await this.modal.close()}async load(){let e=await(await fetch(`/api/quests`)).json();if(!e.success)throw Error(e.error||`Quest log failed`);return e.quests||[]}async loadFarm(){let e=await(await fetch(`/api/farm/parcels`)).json();if(!e.success)throw Error(e.error||`Farm board failed`);return{settlementId:e.settlementId||``,season:e.season||``,parcels:e.parcels||[],summary:e.summary||{idle:0,leased:0,growing:0,nextHarvest:null}}}async loadIntel(){let e=await(await fetch(`/api/intel`)).json();if(!e.success)throw Error(e.error||`Intel board failed`);return e.reports||[]}async loadContracts(){let e=await(await fetch(`/api/contracts`)).json();if(!e.success)throw Error(e.error||`Contract board failed`);return{settlementId:e.settlementId||``,offers:e.offers||[],contracts:e.contracts||[],summary:e.summary||{active:0,overdue:0,rewardAtRisk:0}}}async loadObligations(){let e=await(await fetch(`/api/obligations`)).json();if(!e.success)throw Error(e.error||`Obligation log failed`);return{obligations:e.obligations||[],summary:e.summary||{dueCount:0,overdueCount:0,totalCashDue:0,totalGrainDue:0,nextDueDate:null}}}async refresh(e){try{let[t,n,r,i,a]=await Promise.all([this.load(),this.loadObligations().catch(()=>({obligations:[],summary:{dueCount:0,overdueCount:0,totalCashDue:0,totalGrainDue:0,nextDueDate:null}})),this.loadContracts().catch(()=>({settlementId:``,offers:[],contracts:[],summary:{active:0,overdue:0,rewardAtRisk:0}})),this.loadIntel().catch(()=>[]),this.loadFarm().catch(()=>({settlementId:``,season:``,parcels:[],summary:{idle:0,leased:0,growing:0,nextHarvest:null}}))]);this.modal.setContent(this.render(t,n.obligations,n.summary,r,i,a,e))}catch(e){this.modal.setContent(`<div class="quest-empty">${R(e.message)}</div>`)}}async accept(e){try{let t=await(await fetch(`/api/quests/accept`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({questId:e})})).json();if(!t.success)throw Error(t.error||`Accept failed`);await this.refresh(null)}catch(e){window.showToast?.(e.message,!0)}}async advance(e){try{let t=await(await fetch(`/api/quests/advance`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({questId:e})})).json();if(!t.success)throw Error(t.error||`Advance failed`);await this.refresh(t.result),window.loadStatus?.()}catch(e){window.showToast?.(e.message,!0)}}async payObligation(e){try{let t=await(await fetch(`/api/obligations/pay`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({obligationId:e})})).json();if(!t.success)throw Error(t.error||`Payment failed`);await this.refresh(null),window.loadStatus?.()}catch(e){window.showToast?.(e.message,!0)}}async acceptContract(e){try{let t=await(await fetch(`/api/contracts/accept`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({offerId:e})})).json();if(!t.success)throw Error(t.error||`Accept contract failed`);await this.refresh(null)}catch(e){window.showToast?.(e.message,!0)}}async rentFarm(e){try{let t=await(await fetch(`/api/farm/rent`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({parcelId:e})})).json();if(!t.success)throw Error(t.error||`Rent failed`);await this.refresh(null),window.loadStatus?.()}catch(e){window.showToast?.(e.message,!0)}}async plantCrop(e,t){try{let n=await(await fetch(`/api/farm/plant`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({parcelId:e,cropCode:t})})).json();if(!n.success)throw Error(n.error||`Plant failed`);await this.refresh(null),window.loadStatus?.()}catch(e){window.showToast?.(e.message,!0)}}async harvestFarm(e){try{let t=await(await fetch(`/api/farm/harvest`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({parcelId:e})})).json();if(!t.success)throw Error(t.error||`Harvest failed`);await this.refresh(null),window.loadStatus?.()}catch(e){window.showToast?.(e.message,!0)}}async verifyIntel(e){try{let t=await(await fetch(`/api/intel/verify`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({reportId:e})})).json();if(!t.success)throw Error(t.error||`Verify intel failed`);await this.refresh(null),window.loadStatus?.()}catch(e){window.showToast?.(e.message,!0)}}async deliverContract(e){try{let t=await(await fetch(`/api/contracts/deliver`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({contractId:e})})).json();if(!t.success)throw Error(t.error||`Deliver contract failed`);await this.refresh(null),window.loadStatus?.()}catch(e){window.showToast?.(e.message,!0)}}renderContracts(e,t){let n=e.offers||[],r=(e.contracts||[]).filter(e=>e.status===`ACTIVE`);if(n.length===0&&r.length===0)return`<div class="quest-empty">${t?`No contracts posted.`:`Chưa có hợp đồng.`}</div>`;let i=t?`Contracts • ${e.settlementId} • ${r.length} active`:`Hợp đồng • ${e.settlementId} • ${r.length} đang chạy`,a=n.map(e=>`
      <div class="quest-item">
        <div class="quest-head">
          <div>
            <div class="quest-title">${R(t?e.itemNameEn:e.itemNameVi)} × ${e.quantity}</div>
            <div class="quest-path">${R(e.rewardCash)} Quan • +${e.rewardFame} ${t?`fame`:`danh vọng`} • ${t?`by`:`hạn`} ${R(e.expiresDate)}</div>
          </div>
          <button class="quest-action" onclick="QuestUI.acceptContract('${R(e.offerId)}')">${t?`Accept`:`Nhận`}</button>
        </div>
        <div class="quest-desc">${R(t?e.narrativeEn:e.narrativeVi)}</div>
      </div>
    `).join(``),o=r.map(e=>{let n=e.haveQuantity>=e.quantity,r=e.daysRemaining<0;return`
        <div class="quest-item">
          <div class="quest-head">
            <div>
              <div class="quest-title">${R(t?e.itemNameEn:e.itemNameVi)} ${e.haveQuantity}/${e.quantity}</div>
              <div class="quest-path">${R(e.rewardCash)} Quan • ${t?`due`:`hạn`} ${R(e.dueDate)}${r?` • ${t?`late`:`quá hạn`}`:``}</div>
            </div>
            <button class="quest-action ${n?`is-primary`:``}" onclick="QuestUI.deliverContract('${R(e.contractId)}')">${t?`Deliver`:`Giao`}</button>
          </div>
        </div>
      `}).join(``);return`
      <div class="quest-section">
        <div class="quest-section-title">${R(i)}</div>
        ${o}${a}
      </div>
    `}renderFarm(e,t){if(!e.parcels||e.parcels.length===0)return`<div class="quest-empty">${t?`No farmland here.`:`Không có ruộng ở đây.`}</div>`;let n=e.parcels.map(e=>{let n=t?e.nameEn:e.nameVi,r=``;if(e.status===`IDLE`)r=`<button class="quest-action" onclick="QuestUI.rentFarm('${R(e.parcelId)}')">${t?`Rent`:`Thuê`} (${e.rentCash} Quan)</button>`;else if(e.status===`LEASED`){let n=(e.availableCrops||[]).filter(e=>e.inSeason);r=n.length>0?n.map(n=>`<button class="quest-action" onclick="QuestUI.plantCrop('${R(e.parcelId)}','${R(n.cropCode)}')">${t?`Plant ${n.nameEn}`:`Trồng ${n.nameVi}`}</button>`).join(` `):`<span class="quest-badge">${t?`Out of season`:`Trái mùa`}</span>`}else e.status===`GROWING`&&e.crop&&(r=`<button class="quest-action ${e.crop.daysRemaining<=0?`is-primary`:``}" onclick="QuestUI.harvestFarm('${R(e.parcelId)}')">${t?`Harvest`:`Thu hoạch`}</button>`);let i=e.crop?`${R(e.crop.nameVi)} • ${t?`harvest`:`thu`} ${R(e.crop.harvestDate)} • ${e.crop.daysRemaining}${t?`d`:` ngày`} • ${t?`yield`:`dự kiến`} ${e.crop.expectedYield}`:`${e.areaMu} ${t?`mu`:`mẫu`} • ${t?`soil`:`đất`} ${e.soilQuality.toFixed(2)} • ${t?`rent`:`tô`} ${e.rentCash} Quan${(e.rentDiscount||0)>0?` (-${e.rentDiscount}%)`:``}`;return`
        <div class="quest-item">
          <div class="quest-head">
            <div>
              <div class="quest-title">${R(n)}</div>
              <div class="quest-path">${i}</div>
            </div>
            ${r}
          </div>
        </div>
      `}).join(``);return`
      <div class="quest-section">
        <div class="quest-section-title">${t?`Farmland • ${e.season} • ${e.summary.growing} growing`:`Nông Trại • ${e.season} • ${e.summary.growing} vụ`}</div>
        ${n}
      </div>
    `}renderIntel(e,t){if(!e||e.length===0)return`<div class="quest-empty">${t?`No reports this month.`:`Không có tin đồn tháng này.`}</div>`;let n=e.map(e=>{let n=e.subjectType===`PRICE`?t?`${e.claim.price} quan`:`${e.claim.price} Quan`:t?`${e.claim.troops} troops`:`${e.claim.troops} binh`;return`
        <div class="quest-item">
          <div class="quest-head">
            <div>
              <div class="quest-title">${R(e.subjectName)}</div>
              <div class="quest-path">${R(e.subjectType)} • ${R(n)} • ${R(e.source)} • ${R(e.confidenceLabel)}</div>
            </div>
            <button class="quest-action" onclick="QuestUI.verifyIntel('${R(e.reportId)}')">${t?`Verify (${e.verificationDays}d)`:`Xác minh (${e.verificationDays} ngày)`}</button>
          </div>
          <div class="quest-path">${t?`Expires`:`Hết hạn`} ${R(e.expiresDate)}</div>
        </div>
      `}).join(``);return`
      <div class="quest-section">
        <div class="quest-section-title">${t?`Intel • ${e.length} reports`:`Tin đồn • ${e.length} báo cáo`}</div>
        ${n}
      </div>
    `}renderObligations(e,t,n){let r=e.filter(e=>e.status===`DUE`||e.status===`OVERDUE`);if(r.length===0)return`<div class="quest-empty">${n?`No obligations due.`:`Không có nghĩa vụ đến hạn.`}</div>`;let i=n?`Obligations • ${t.totalCashDue} quan due${t.overdueCount?` • ${t.overdueCount} overdue`:``}`:`Nghĩa vụ • ${t.totalCashDue} Quan đến hạn${t.overdueCount?` • ${t.overdueCount} quá hạn`:``}`,a=r.map(e=>{let t=e.status===`OVERDUE`,r=t?n?`Overdue`:`Quá hạn`:n?`Due`:`Đến hạn`,i=t?n?`${Math.abs(e.daysRemaining)} days late`:`Trễ ${Math.abs(e.daysRemaining)} ngày`:n?`${e.daysRemaining} days left`:`Còn ${e.daysRemaining} ngày`,a=e.amountGrain>0?`${e.amountCash} Quan + ${e.amountGrain} ${n?`piculs`:`Thạch`}`:`${e.amountCash} Quan`;return`
        <div class="quest-item">
          <div class="quest-head">
            <div>
              <div class="quest-title">${R((n?e.narrativeEn:e.narrativeVi)||e.type)}</div>
              <div class="quest-path">${R(e.type)} • ${R(e.dueDate)} • ${R(i)}</div>
            </div>
            <button class="quest-action ${t?`is-primary`:``}" onclick="QuestUI.payObligation('${R(e.obligationId)}')">${n?`Pay`:`Nộp`}</button>
          </div>
          <div class="quest-meta">${R(a)}</div>
          <div class="quest-path"><span class="quest-badge">${r}</span></div>
        </div>
      `}).join(``);return`
      <div class="quest-section">
        <div class="quest-section-title">${R(i)}</div>
        ${a}
      </div>
    `}render(e,t,n,r,i,a,o){let s=oe(),c=o?`
      <div class="quest-result ${o.success?`is-success`:`is-failure`}">
        <strong>${o.success?s?`Step succeeded`:`Bước thành công`:s?`Step failed`:`Bước thất bại`}</strong>
        <div>${R(s?o.narrativeEn:o.narrative)}</div>
        <div class="quest-meta">D20 ${o.roll} + ${o.mod} = ${o.total} / DC ${o.dc}</div>
        <div class="quest-meta">${R(se(o.rewards||{}))}</div>
      </div>
    `:``,l=e.map(e=>{let t=e.status===`COMPLETED`?s?`Completed`:`Đã hoàn thành`:e.status===`ACTIVE`?s?`Active`:`Đang làm`:s?`Available`:`Có thể nhận`,n=e.steps.map(t=>`
        <div class="quest-step ${t.index<e.currentStep?`is-done`:t.index===e.currentStep&&e.status===`ACTIVE`?`is-current`:``}">
          <span class="quest-step-index">${t.index+1}</span>
          <span class="quest-step-title">${R(s?t.titleEn:t.titleVi)}</span>
          <span class="quest-step-check">${R(String(t.stat).toUpperCase())} DC ${t.dc} • ${t.daysCost}${s?`d`:` ngày`}</span>
        </div>
      `).join(``),r=e.status===`AVAILABLE`?`<button class="quest-action" onclick="QuestUI.accept('${R(e.questId)}')">${s?`Accept`:`Nhận nhiệm vụ`}</button>`:e.status===`ACTIVE`?`<button class="quest-action is-primary" onclick="QuestUI.advance('${R(e.questId)}')">${s?`Advance step ${e.currentStep+1}`:`Thực hiện bước ${e.currentStep+1}`}</button>`:`<span class="quest-badge">${s?`Completed`:`Hoàn thành`}</span>`;return`
        <div class="quest-item">
          <div class="quest-head">
            <div>
              <div class="quest-title">${R(s?e.titleEn:e.titleVi)}</div>
              <div class="quest-path">${R(e.pathCode)} • ${t}</div>
            </div>
            ${r}
          </div>
          <div class="quest-desc">${R(s?e.descriptionEn:e.descriptionVi)}</div>
          <div class="quest-steps">${n}</div>
        </div>
      `}).join(``);return`<div class="quest-body">${c}${this.renderObligations(t,n,s)}${this.renderContracts(r,s)}${this.renderFarm(a,s)}${this.renderIntel(i,s)}${l||`<div class="quest-empty">${s?`No quests available.`:`Chưa có nhiệm vụ.`}</div>`}</div>`}},B=class e{static instance;static getInstance(){return e.instance||=new e,e.instance}async getStall(e=`PLY-0001`){return(await y.get(`/api/stall`,{characterId:e})).stall||null}async getOffers(e){return(await y.get(`/api/market/npc-offers`,e?{settlementId:e}:void 0)).offers||[]}async getWarehouses(){return(await y.get(`/api/warehouses`,{characterId:`PLY-0001`})).warehouses||[]}async rentWarehouse(e){return y.post(`/api/warehouses/rent`,{settlementId:e,idempotencyKey:`warehouse-rent-${Date.now()}`})}async buyWarehouse(e){return y.post(`/api/warehouses/buy`,{settlementId:e,idempotencyKey:`warehouse-buy-${Date.now()}`})}async deposit(e,t,n){return y.post(`/api/warehouses/deposit`,{warehouseId:e,itemCode:t,quantity:n,idempotencyKey:`warehouse-deposit-${Date.now()}`})}async withdraw(e,t,n){return y.post(`/api/warehouses/withdraw`,{warehouseId:e,itemCode:t,quantity:n,idempotencyKey:`warehouse-withdraw-${Date.now()}`})}async renewWarehouse(e){return y.post(`/api/warehouses/renew`,{warehouseId:e,idempotencyKey:`warehouse-renew-${e}-${Date.now()}`})}async openStall(e){return y.post(`/api/stall/open`,{settlementId:e,idempotencyKey:`stall-open-${Date.now()}`})}async listItem(e,t,n,r=`BAG`,i,a){return y.post(`/api/stall/list`,{itemCode:e,quantity:t,unitPrice:n,source:r,warehouseId:i,stallId:a,idempotencyKey:`stall-list-${e}-${Date.now()}`})}async closeStall(e){return y.post(`/api/stall/close`,{stallId:e,idempotencyKey:`stall-close-${Date.now()}`})}async buyOffer(e,t){return y.post(`/api/market/npc-offers/buy`,{offerId:e,quantity:t,idempotencyKey:`offer-buy-${e}-${Date.now()}`})}async getFreightContracts(e){return(await y.get(`/api/freight/contracts`,e?{settlementId:e}:void 0)).contracts||[]}async getFreightShipments(){return(await y.get(`/api/freight/shipments`)).shipments||[]}async acceptFreight(e,t=`VETERAN`,n=!1){return y.post(`/api/freight/accept`,{contractId:e,guardTier:t,insurance:n,idempotencyKey:`freight-accept-${e}-${Date.now()}`})}async deliverFreight(e){return y.post(`/api/freight/deliver`,{shipmentId:e,idempotencyKey:`freight-deliver-${e}-${Date.now()}`})}async getMerchantRoutes(){return(await y.get(`/api/merchant/routes`)).routes||[]}async getMerchantEvents(){return(await y.get(`/api/merchant/events`)).events||[]}async createMerchantRoute(e){return y.post(`/api/merchant/routes`,{...e,idempotencyKey:`merchant-route-create-${e.fromWarehouseId}-${e.toWarehouseId}-${Date.now()}`})}async setMerchantRouteStatus(e,t){return y.post(`/api/merchant/routes/${e}/status`,{status:t,idempotencyKey:`merchant-route-${e}-${t}-${Date.now()}`})}}.getInstance();function V(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function H(e,t=!1){typeof window.showToast==`function`&&window.showToast(e,t)}var U=new class{modal;stall=null;offers=[];warehouses=[];freightContracts=[];freightShipments=[];merchantRoutes=[];merchantEvents=[];constructor(){this.modal=a({id:`market-stall-modal`,title:`Chợ & Quầy Bán`,subtitle:`Niêm yết hàng cho NPC trong thành và mua lại hàng NPC đang bán`,seal:`市`,size:`lg`,tabs:[{id:`stall`,label:`Quầy Của Ta`,seal:`攤`},{id:`offers`,label:`Hàng NPC Bán`,seal:`貨`},{id:`warehouse`,label:`Kho Thành`,seal:`倉`},{id:`logistics`,label:`Vận Chuyển`,seal:`運`}],activeTabId:`stall`,onOpen:async()=>{await this.refresh(),this.render()},onTabChange:async()=>{this.render()}})}async open(e=`stall`){await this.modal.open(e)}async close(){await this.modal.close()}async refresh(){this.stall=await B.getStall(`PLY-0001`),this.offers=await B.getOffers(this.stall?.settlementId),this.warehouses=await B.getWarehouses();let[e,t,n,r]=await Promise.all([B.getFreightContracts(this.stall?.settlementId).catch(()=>[]),B.getFreightShipments().catch(()=>[]),B.getMerchantRoutes().catch(()=>[]),B.getMerchantEvents().catch(()=>[])]);this.freightContracts=e,this.freightShipments=t,this.merchantRoutes=n,this.merchantEvents=r}render(){let e=this.modal.activeTab||`stall`;e===`offers`?this.modal.setContent(this.renderOffers()):e===`warehouse`?this.modal.setContent(this.renderWarehouses()):e===`logistics`?this.modal.setContent(this.renderLogistics()):this.modal.setContent(this.renderStall()),this.bind()}renderStall(){if(!this.stall)return`
        <div class="journal-modal-content">
          <div class="spatial-banner-lead">
            <div class="lead-seal">市</div>
            <div class="lead-text">
              <h3>Chưa Có Quầy</h3>
              <div class="text-muted text-sm">Mở quầy tại thành đang đứng (phí 20 Quan) để NPC trong thành mua hàng mỗi ngày.</div>
            </div>
          </div>
          <button class="ui-btn ui-btn--primary" data-stall-action="open">Mở Quầy</button>
        </div>
      `;let e=this.stall.listings.length>0?this.stall.listings.map(e=>{let t=e.marketPrice>0?Math.round((e.unitPrice/e.marketPrice-1)*100):0;return`
          <div class="flex justify-between items-center text-[11px] border-b border-slate-800 py-1.5">
            <span class="text-slate-200">${V(e.itemNameVi)} × ${e.quantity}</span>
            <span class="font-mono text-amber-300">${e.unitPrice} Quan (${t>=0?`+`:``}${t}% chợ)</span>
          </div>
        `}).join(``):`<div class="text-muted text-xs">Quầy chưa có hàng.</div>`,t=this.stall.recentSales.length>0?this.stall.recentSales.map(e=>`
        <div class="flex justify-between text-[11px] py-1">
          <span class="text-slate-300">${V(e.npcNameVi)} mua ${e.quantity} ${V(e.itemCode)}</span>
          <span class="font-mono text-green-400">+${e.totalCash} Quan</span>
        </div>
      `).join(``):`<div class="text-muted text-xs">Chưa có giao dịch.</div>`;return`
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">攤</div>
          <div class="lead-text">
            <h3>${V(this.stall.nameVi)}</h3>
            <div class="text-muted text-sm">${V(this.stall.settlementId)} • Hàng đang bán: ${this.stall.listings.length} • NPC sẽ mua mỗi ngày nếu giá ≤ 115% giá chợ.</div>
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
              ${this.warehouses.filter(e=>e.settlementId===this.stall?.settlementId).map(e=>`<option value="${V(e.warehouseId)}">${V(e.nameVi)} (${e.usedCapacity}/${e.capacity})</option>`).join(``)}
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
    `}renderWarehouses(){return`
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
        ${this.warehouses.length>0?this.warehouses.map(e=>`
        <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 mb-2">
          <div class="flex justify-between items-center">
            <div>
              <div class="text-sm font-bold text-slate-200">${V(e.nameVi)} • ${V(e.ownershipType)}</div>
              <div class="text-[11px] text-muted">${V(e.settlementId)} • ${e.usedCapacity}/${e.capacity} • ${e.status}${e.leaseUntil?` • hết hạn ${V(e.leaseUntil)}`:``}</div>
            </div>
            <div class="flex gap-1">
              ${e.ownershipType===`RENTED`?`<button class="ui-btn ui-btn--primary ui-btn--sm" data-warehouse-action="renew" data-warehouse-id="${V(e.warehouseId)}" title="Cộng thêm 90 ngày từ hạn hiện tại">Gia hạn</button>`:``}
              <button class="ui-btn ui-btn--ghost ui-btn--sm" data-warehouse-action="withdraw" data-warehouse-id="${V(e.warehouseId)}">Rút hàng</button>
            </div>
          </div>
        </div>
      `).join(``):`<div class="text-muted text-sm mb-2">Chưa có kho. Thuê kho tại thành đang đứng để mở kho địa phương.</div>`}
        <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
          <div class="text-xs font-bold text-amber-200 mb-2">Nạp / Rút Kho</div>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-2 text-[11px]">
            <input id="warehouse-id" list="warehouse-id-list" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" placeholder="Mã kho" />
            <datalist id="warehouse-id-list">
              ${this.warehouses.map(e=>`<option value="${V(e.warehouseId)}">${V(e.nameVi)}</option>`).join(``)||`<option value="">Chưa có kho</option>`}
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
    `}renderOffers(){return this.offers.length===0?`<div class="journal-modal-content"><div class="text-muted text-sm">Thành này chưa có NPC nào đăng bán. Hãy đi sang ngày khác hoặc tới thành khác.</div></div>`:`
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">貨</div>
          <div class="lead-text">
            <h3>Hàng NPC Đang Bán</h3>
            <div class="text-muted text-sm">Giá dao động 85%–125% quanh giá chợ địa phương. Mua xong hàng vào kho, NPC nhận tiền.</div>
          </div>
        </div>
        <div class="space-y-2">
          ${this.offers.map(e=>`
            <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 flex justify-between items-center gap-3">
              <div>
                <div class="text-sm font-bold text-slate-200">${V(e.itemNameVi)} × ${e.quantity}</div>
                <div class="text-[11px] text-muted">${V(e.npcNameVi)} • ${e.unitPrice} Quan (${e.priceDeltaPct>=0?`+`:``}${e.priceDeltaPct}% chợ) • hết hạn ${V(e.expiresDate)}</div>
              </div>
              <button class="ui-btn ui-btn--primary ui-btn--sm" data-offer-buy="${V(e.offerId)}">Mua 1</button>
            </div>
          `).join(``)}
        </div>
      </div>
    `}renderLogistics(){let e=this.freightContracts.length>0?this.freightContracts.map(e=>`
        <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 mb-2">
          <div class="flex justify-between items-start gap-3">
            <div>
              <div class="text-sm font-bold text-slate-200">${V(e.itemCode)} × ${e.quantity}</div>
              <div class="text-[11px] text-muted">${V(e.fromSettlementId)} → ${V(e.toSettlementId)} • thưởng ${e.rewardCash} Quan • còn ${e.daysLeft} ngày • đi ${e.travelDays} ngày</div>
            </div>
            <label class="text-[10px] text-slate-300 flex items-center gap-1">
              <input type="checkbox" data-freight-insurance="${V(e.contractId)}" /> Bảo hiểm +4%
            </label>
          </div>
          <div class="flex gap-1 mt-2">
            <button class="ui-btn ui-btn--ghost ui-btn--sm" data-freight-accept data-contract-id="${V(e.contractId)}" data-guard-tier="MILITIA">Dân Dũng</button>
            <button class="ui-btn ui-btn--primary ui-btn--sm" data-freight-accept data-contract-id="${V(e.contractId)}" data-guard-tier="VETERAN">Thiện Chiến</button>
            <button class="ui-btn ui-btn--ghost ui-btn--sm" data-freight-accept data-contract-id="${V(e.contractId)}" data-guard-tier="ELITE_RETINUE">Tinh Nhuệ</button>
          </div>
        </div>
      `).join(``):`<div class="text-muted text-sm mb-2">Thành này chưa có hợp đồng vận chuyển.</div>`,t=this.freightShipments.length>0?this.freightShipments.map(e=>`
        <div class="flex justify-between items-center text-[11px] border-b border-slate-800 py-1.5 gap-2">
          <div>
            <div class="text-slate-200">${V(e.itemCode)} × ${e.quantity} • ${V(e.status)}</div>
            <div class="text-muted">${e.status===`ARRIVED`?`Đã đến đích`:`Còn ${e.daysRemaining} ngày`} • ${V(e.guardTier)}${e.insured?` • có bảo hiểm`:``}${e.ambushLossQuantity>0?` • mất ${e.ambushLossQuantity} do phục kích`:``}</div>
          </div>
          ${e.status===`ARRIVED`?`<button class="ui-btn ui-btn--primary ui-btn--sm" data-freight-deliver="${V(e.shipmentId)}">Giao hàng</button>`:``}
        </div>
      `).join(``):`<div class="text-muted text-sm mb-2">Không có chuyến hàng đang chạy.</div>`,n=this.merchantRoutes.length>0?this.merchantRoutes.map(e=>`
        <div class="flex justify-between items-center text-[11px] border-b border-slate-800 py-1.5 gap-2">
          <div>
            <div class="text-slate-200">${V(e.nameVi)} • ${V(e.itemCode)} × ${e.quantityPerRun}</div>
            <div class="text-muted">${V(e.fromSettlementId)} → ${V(e.toSettlementId)} • ${V(e.status)} • mỗi ${e.frequencyDays} ngày</div>
          </div>
          <button class="ui-btn ui-btn--ghost ui-btn--sm" data-route-status data-route-id="${V(e.routeId)}" data-next-status="${e.status===`ACTIVE`?`PAUSED`:`ACTIVE`}">
            ${e.status===`ACTIVE`?`Tạm Dừng`:`Tiếp Tục`}
          </button>
        </div>
      `).join(``):`<div class="text-muted text-sm">Chưa có thương lộ tự động.</div>`,r=this.merchantEvents.length>0?this.merchantEvents.slice(0,6).map(e=>`
        <div class="text-[11px] border-b border-slate-800 py-1">
          <span class="text-slate-300">${V(e.eventType||e.event_type)}</span>
          <span class="text-muted"> • ${V(e.gameDate||e.game_date||``)} • ${V(e.itemCode||e.item_code||``)}</span>
        </div>
      `).join(``):`<div class="text-muted text-sm">Chưa có biến cố thương lộ.</div>`,i=this.warehouses.map(e=>`<option value="${V(e.warehouseId)}">${V(e.nameVi)} (${V(e.settlementId)})</option>`).join(``),a=this.warehouses.length>=2;return`
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
        <div class="grid grid-cols-1 md:grid-cols-4 gap-2 text-[11px]">
          <select id="route-from" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200">${i}</select>
          <select id="route-to" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200">${i}</select>
          <input id="route-item" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="COM-GRAIN" placeholder="Mã hàng" />
          <input id="route-qty" type="number" min="1" step="1" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="10" />
          <input id="route-buy" type="number" min="1" step="1" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="50" placeholder="Giá mua trần" />
          <input id="route-sell" type="number" min="1" step="1" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="100" placeholder="Giá bán sàn" />
          <input id="route-freq" type="number" min="1" step="1" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200" value="7" placeholder="Ngày/chuyến" />
          <select id="route-guard" class="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-slate-200">
            <option value="MILITIA">Dân Dũng</option>
            <option value="VETERAN" selected>Thiện Chiến</option>
            <option value="ELITE_RETINUE">Tinh Nhuệ</option>
          </select>
        </div>
        <div class="flex justify-between items-center mt-2 gap-2">
          <div class="text-muted text-[11px]">${a?`Kho nguồn và kho đích phải khác thành; giá bán sàn phải cao hơn giá mua trần.`:`Cần ít nhất 2 kho ở hai thành khác nhau.`}</div>
          <button class="ui-btn ui-btn--primary ui-btn--sm" data-route-create ${a?``:`disabled`}>Mở Thương Lộ</button>
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
    `}bind(){let e=this.modal.getBodyElement();e&&(e.querySelectorAll(`[data-stall-action]`).forEach(t=>{t.addEventListener(`click`,async()=>{let n=t.dataset.stallAction;t.setAttribute(`disabled`,`true`);try{if(n===`open`)await B.openStall(),H(`Đã mở quầy.`);else if(n===`list`){let t=e.querySelector(`#stall-item-code`)?.value.trim()||``,n=Number(e.querySelector(`#stall-item-qty`)?.value||0),r=Number(e.querySelector(`#stall-item-price`)?.value||0),i=(e.querySelector(`#stall-source`)?.value||`BAG`).toUpperCase(),a=e.querySelector(`#stall-warehouse`)?.value||void 0;await B.listItem(t,n,r,i,a,this.stall?.stallId),H(`Đã niêm yết ${n} ${t}.`)}else n===`close`&&(await B.closeStall(this.stall?.stallId),H(`Đã đóng quầy và trả hàng về kho.`));await this.refresh(),this.render()}catch(e){t.removeAttribute(`disabled`),H(e.message||`Thao tác quầy thất bại.`,!0)}})}),e.querySelectorAll(`[data-offer-buy]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.dataset.offerBuy||``;e.setAttribute(`disabled`,`true`);try{await B.buyOffer(t,1),H(`Đã mua hàng từ NPC.`),await this.refresh(),this.render()}catch(t){e.removeAttribute(`disabled`),H(t.message||`Mua hàng thất bại.`,!0)}})}),e.querySelectorAll(`[data-warehouse-action]`).forEach(t=>{t.addEventListener(`click`,async()=>{let n=t.dataset.warehouseAction||``,r=t.dataset.warehouseId||e.querySelector(`#warehouse-id`)?.value||``,i=e.querySelector(`#warehouse-item`)?.value.trim()||`COM-GRAIN`,a=Number(e.querySelector(`#warehouse-qty`)?.value||1);t.setAttribute(`disabled`,`true`);try{n===`rent`?(await B.rentWarehouse(),H(`Đã thuê kho tại thành hiện tại.`)):n===`buy`?(await B.buyWarehouse(),H(`Đã mua kho tại thành hiện tại.`)):n===`renew`?H(`Đã gia hạn kho đến ${(await B.renewWarehouse(r))?.result?.leaseUntil||`hạn mới`}.`):n===`deposit`?(await B.deposit(r,i,a),H(`Đã nạp ${a} ${i} vào kho.`)):(await B.withdraw(r,i,a),H(`Đã rút ${a} ${i} khỏi kho.`)),await this.refresh(),this.render()}catch(e){t.removeAttribute(`disabled`),H(e.message||`Thao tác kho thất bại.`,!0)}})}),e.querySelectorAll(`[data-freight-accept]`).forEach(t=>{t.addEventListener(`click`,async()=>{let n=t.dataset.contractId||``,r=t.dataset.guardTier||`VETERAN`,i=e.querySelector(`[data-freight-insurance="${n}"]`)?.checked===!0;t.setAttribute(`disabled`,`true`);try{await B.acceptFreight(n,r,i),H(i?`Đã nhận chuyến và mua bảo hiểm.`:`Đã nhận chuyến hàng.`),await this.refresh(),this.render()}catch(e){t.removeAttribute(`disabled`),H(e.message||`Nhận chuyến thất bại.`,!0)}})}),e.querySelectorAll(`[data-freight-deliver]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.dataset.freightDeliver||``;e.setAttribute(`disabled`,`true`);try{await B.deliverFreight(t),H(`Đã giao hàng và nhận phí vận chuyển.`),await this.refresh(),this.render()}catch(t){e.removeAttribute(`disabled`),H(t.message||`Giao hàng thất bại.`,!0)}})}),e.querySelectorAll(`[data-route-create]`).forEach(t=>{t.addEventListener(`click`,async()=>{let n=e.querySelector(`#route-from`)?.value||``,r=e.querySelector(`#route-to`)?.value||``,i=e.querySelector(`#route-item`)?.value.trim()||``,a=Number(e.querySelector(`#route-qty`)?.value||0),o=Number(e.querySelector(`#route-buy`)?.value||0),s=Number(e.querySelector(`#route-sell`)?.value||0),c=Number(e.querySelector(`#route-freq`)?.value||7),l=e.querySelector(`#route-guard`)?.value||`VETERAN`;if(!n||!r||n===r)H(`Kho nguồn và kho đích phải khác nhau.`,!0);else if(!i||a<=0||o<=0||s<=o)H(`Kiểm tra mã hàng, số lượng và giá bán sàn > giá mua trần.`,!0);else{t.setAttribute(`disabled`,`true`);try{await B.createMerchantRoute({fromWarehouseId:n,toWarehouseId:r,itemCode:i,quantityPerRun:a,maxBuyPrice:o,minSellPrice:s,frequencyDays:c,guardTier:l}),H(`Đã mở thương lộ tự động.`),await this.refresh(),this.render()}catch(e){t.removeAttribute(`disabled`),H(e.message||`Mở thương lộ thất bại.`,!0)}}})}),e.querySelectorAll(`[data-route-status]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.dataset.routeId||``,n=e.dataset.nextStatus||`PAUSED`;e.setAttribute(`disabled`,`true`);try{await B.setMerchantRouteStatus(t,n),H(n===`ACTIVE`?`Đã tiếp tục thương lộ.`:`Đã tạm dừng thương lộ.`),await this.refresh(),this.render()}catch(t){e.removeAttribute(`disabled`),H(t.message||`Đổi trạng thái thương lộ thất bại.`,!0)}})}))}},W=class{modal;constructor(){this.modal=a({id:`world-map-modal`,title:`Dư Đồ Tam Quốc • Khởi Nghĩa Khăn Vàng (184 SCN)`,subtitle:`Khảo sát 24 châu quận, phân bố thế lực chư hầu và dịch trạm liên thành`,seal:`圖`,size:`xl`,dialogClass:`world-map-dialog`})}async open(){await this.modal.open();let e=window.refreshWorldMapView;typeof e==`function`?e():typeof window.renderWorldMapSvg==`function`&&window.renderWorldMapSvg()}async close(){await this.modal.close()}},G=new W,K=class e{static instance;static getInstance(){return e.instance||=new e,e.instance}async get(e){return await y.get(`/api/map/wilderness`,e?{nodeId:e}:void 0)}async travel(e){return y.post(`/api/map/wilderness/travel`,{subLocationId:e,idempotencyKey:`wilderness-travel-${e}-${Date.now()}`})}async gather(e,t=`PLY-0001`){return y.post(`/api/professions/gather`,{characterId:t,nodeId:e,idempotencyKey:`wilderness-gather-${e}-${Date.now()}`})}async getScene(e,t=`PLY-0001`){return y.get(`/api/scene`,{subLocation:e,characterId:t})}async dispatchAction(e){return y.post(`/api/action`,e)}},q=K.getInstance();function J(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function Y(e,t=!1){typeof window.showToast==`function`&&window.showToast(e,t)}var ce={mountain:`山`,water:`水`,forest:`林`,lair:`寨`,farm:`田`,wild:`野`},le=class{modal;view=null;nodeId=null;scene=null;scenePoiName=null;constructor(){this.modal=a({id:`wilderness-map-modal`,title:`Dã Ngoại`,subtitle:`Khảo sát địa hình ngoài thành, điểm tài nguyên và ổ phỉ`,seal:`野`,size:`xl`,onOpen:async()=>{await this.refresh(),this.render()}})}async open(e){this.nodeId=e||null,await this.modal.open()}async close(){await this.modal.close()}async refresh(){this.view=await q.get(this.nodeId||void 0),this.nodeId=this.view.nodeId}render(){if(!this.view){this.modal.setContent(`<div class="journal-modal-content"><div class="text-muted text-sm">Không tải được dã ngoại.</div></div>`),this.bind();return}let{wilderness:e,resources:t,city:n,currentSubLocation:r}=this.view,i=n?.nameVi||this.view.nodeId,a=e.map(e=>this.renderSpot(e,r)),o=t.length,s=this.view.poiScenes.length;this.modal.setContent(`
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
            ${a.join(``)}
          </svg>
        </div>
        <div class="wilderness-map-legend">
          <span>Vị trí hiện tại: <strong>${J(r||`Trong thành`)}</strong></span>
          <span class="text-muted">Chọn một địa danh để đi bộ tới; quay lại thành bằng nút đóng.</span>
        </div>
        ${this.renderResourcesPanel(r)}
        ${this.renderPoiPanel()}
        ${this.renderScenePanel()}
      </div>
    `),this.bind()}isInWilderness(e){return!!e&&(this.view?.wilderness||[]).some(t=>t.nameVi===e)}renderResourcesPanel(e){let t=this.view?.resources||[];if(t.length===0)return``;let n=this.isInWilderness(e);return`
      <div class="wilderness-action-panel">
        <div class="flex justify-between items-center gap-3 mb-2">
          <div class="text-xs font-bold text-amber-200">Điểm Tài Nguyên</div>
          <div class="text-[11px] text-muted">${n?`Đang ở ${J(e||``)} — có thể khai thác.`:`Hãy đi tới một địa danh dã ngoại trước khi khai thác.`}</div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          ${t.map(e=>`
            <div class="flex justify-between items-center gap-2 rounded border border-slate-800 bg-slate-900/70 p-2">
              <div>
                <div class="text-sm text-slate-200">${J(e.nameVi)}</div>
                <div class="text-[11px] text-muted">${J(e.resourceType)} • ${J(e.resourceNodeId)}</div>
              </div>
              <button class="ui-btn ui-btn--primary ui-btn--sm" data-wilderness-gather="${J(e.resourceNodeId)}" ${n?``:`disabled`}>
                Khai Thác
              </button>
            </div>
          `).join(``)}
        </div>
      </div>
    `}renderPoiPanel(){let e=this.view?.poiScenes||[];return e.length===0?``:`
      <div class="wilderness-action-panel">
        <div class="text-xs font-bold text-amber-200 mb-2">Khảo Sát Địa Điểm</div>
        <div class="flex flex-wrap gap-2">
          ${e.map(e=>`
            <button class="ui-btn ui-btn--ghost ui-btn--sm" data-poi-scene="${J(e.poiName)}">
              ${J(e.poiName)}
            </button>
          `).join(``)}
        </div>
      </div>
    `}renderScenePanel(){if(!this.scene)return``;let e=Array.isArray(this.scene.options)?this.scene.options:[];return`
      <div class="wilderness-scene-card">
        <div class="flex justify-between items-start gap-3">
          <div>
            <div class="text-xs font-bold text-amber-200">${J(this.scenePoiName||this.scene.npc?.name||`Khảo sát`)}</div>
            <div class="text-[11px] text-muted">${J(this.scene.npc?.name||``)}${this.scene.npc?.title?` • ${J(this.scene.npc.title)}`:``}</div>
          </div>
          <button class="ui-btn ui-btn--ghost ui-btn--sm" data-scene-close>Đóng</button>
        </div>
        <p class="text-sm text-slate-300 mt-2">${J(this.scene.narrative||``)}</p>
        <div class="grid grid-cols-1 gap-2 mt-2">
          ${e.map((e,t)=>`
            <button class="ui-btn ui-btn--ghost ui-btn--sm text-left" data-scene-option="${t}" ${e.disabled?`disabled`:``}>
              <strong>${J(e.title||e.id||`Lựa chọn ${t+1}`)}</strong>
              ${e.desc?`<span class="block text-[11px] text-muted">${J(e.desc)}</span>`:``}
            </button>
          `).join(``)}
        </div>
      </div>
    `}renderSpot(e,t){let n=40+Number(e.localX??.5)*520,r=30+Number(e.localY??.5)*300,i=e.nameVi===t,a=ce[e.iconKey]||`野`;return`
      <g class="wilderness-node${i?` is-current`:``}" data-wilderness-travel="${J(e.subLocationId)}" tabindex="0" role="button" aria-label="${J(e.nameVi)}">
        <circle class="wilderness-node-halo" cx="${n.toFixed(1)}" cy="${r.toFixed(1)}" r="22"></circle>
        <circle class="wilderness-node-dot" cx="${n.toFixed(1)}" cy="${r.toFixed(1)}" r="14"></circle>
        <text class="wilderness-node-seal" x="${n.toFixed(1)}" y="${(r+5).toFixed(1)}" text-anchor="middle">${a}</text>
        <text class="wilderness-node-label" x="${n.toFixed(1)}" y="${(r+33).toFixed(1)}" text-anchor="middle">${J(e.nameVi)}</text>
      </g>
    `}bind(){let e=this.modal.getBodyElement();e&&(e.querySelectorAll(`[data-wilderness-travel]`).forEach(e=>{let t=async()=>{let t=e.dataset.wildernessTravel||``;try{let e=await q.travel(t),n=Number(e?.time?.advancedDays||1);Y(`Đã tới ${e?.result?.nameVi||`địa danh`} sau ${n} ngày.`),await this.refresh(),this.render()}catch(e){Y(e.message||`Không thể di chuyển.`,!0)}};e.addEventListener(`click`,t),e.addEventListener(`keydown`,e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),t())})}),e.querySelectorAll(`[data-wilderness-gather]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.dataset.wildernessGather||``;e.setAttribute(`disabled`,`true`);try{let e=await q.gather(t),n=e?.result||e,r=n?.itemNameVi||n?.itemCode||`tài nguyên`,i=Number(n?.quantity||n?.yieldQuantity||0);Y(i>0?`Khai thác được ${i} ${r}.`:`Khai thác thành công.`),await this.refresh(),this.render()}catch(t){e.removeAttribute(`disabled`),Y(t.message||`Khai thác thất bại.`,!0)}})}),e.querySelectorAll(`[data-poi-scene]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.dataset.poiScene||``;e.setAttribute(`disabled`,`true`);try{this.scene=await q.getScene(t),this.scenePoiName=t,this.render()}catch(t){e.removeAttribute(`disabled`),Y(t.message||`Không mở được địa điểm.`,!0)}})}),e.querySelectorAll(`[data-scene-close]`).forEach(e=>{e.addEventListener(`click`,()=>{this.scene=null,this.scenePoiName=null,this.render()})}),e.querySelectorAll(`[data-scene-option]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=Number(e.dataset.sceneOption||-1),n=this.scene?.options?.[t];if(n?.action){e.setAttribute(`disabled`,`true`);try{Y((await q.dispatchAction(n.action))?.message||`Đã thực hiện lựa chọn.`),this.scene=null,this.scenePoiName=null,await this.refresh(),this.render()}catch(t){e.removeAttribute(`disabled`),Y(t.message||`Hành động thất bại.`,!0)}}})}))}},ue=new le,de=class e{static instance;static getInstance(){return e.instance||=new e,e.instance}async get(e){return await y.get(`/api/map/city`,e?{nodeId:e}:void 0)}async enter(e){return y.post(`/api/map/city/enter`,{subLocationId:e,idempotencyKey:`city-enter-${e}-${Date.now()}`})}async getScene(e,t=`PLY-0001`){return y.get(`/api/scene`,{subLocation:e,characterId:t})}async dispatchAction(e){return y.post(`/api/action`,e)}},X=de.getInstance();function Z(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`)}function fe(e,t=!1){typeof window.showToast==`function`&&window.showToast(e,t)}var pe={government:`府`,residence:`宅`,market:`市`,forge:`鍛`,tavern:`酒`,arena:`武`,city:`城`,temple:`寺`,gate:`門`,workshop:`坊`},me=class{modal;view=null;nodeId=null;scene=null;sceneSpotName=null;constructor(){this.modal=a({id:`city-map-modal`,title:`Nội Thành`,subtitle:`Đi lại giữa các địa điểm trong thành và khảo sát tại chỗ`,seal:`城`,size:`xl`,onOpen:async()=>{await this.refresh(),this.render()}})}async open(e){this.nodeId=e||null,await this.modal.open()}async close(){await this.modal.close()}async refresh(){this.view=await X.get(this.nodeId||void 0),this.nodeId=this.view.nodeId}render(){if(!this.view){this.modal.setContent(`<div class="journal-modal-content"><div class="text-muted text-sm">Không tải được nội thành.</div></div>`),this.bind();return}let{citySpots:e,city:t,currentSubLocation:n,poiScenes:r}=this.view,i=t?.nameVi||this.view.nodeId,a=e.find(e=>e.nameVi===n);this.modal.setContent(`
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">城</div>
          <div class="lead-text">
            <h3>${Z(i)} • Nội Thành</h3>
            <div class="text-muted text-sm">${e.length} địa điểm trong thành • ${r.length} POI. Đi lại nội thành không tốn ngày; mỗi địa điểm mở một cảnh ngữ cảnh.</div>
          </div>
        </div>
        <div class="wilderness-map-legend">
          <span>Vị trí hiện tại: <strong>${Z(a?.nameVi||n||`Cổng thành`)}</strong></span>
          <span class="text-muted">Chọn một địa điểm để vào và khảo sát.</span>
        </div>
        <div class="city-map-grid">
          ${e.map(e=>this.renderSpot(e,n)).join(``)}
        </div>
        ${this.renderScenePanel()}
      </div>
    `),this.bind()}renderSpot(e,t){let n=pe[e.iconKey]||`城`,r=e.nameVi===t;return`
      <button class="city-spot-card${r?` is-current`:``}" data-city-enter="${Z(e.subLocationId)}">
        <span class="city-spot-seal">${n}</span>
        <span class="city-spot-name">${Z(e.nameVi)}</span>
        <span class="city-spot-kind">${Z(e.kind)}${r?` • đang ở đây`:``}</span>
      </button>
    `}renderScenePanel(){if(!this.scene)return``;let e=Array.isArray(this.scene.options)?this.scene.options:[];return`
      <div class="wilderness-scene-card">
        <div class="flex justify-between items-start gap-3">
          <div>
            <div class="text-xs font-bold text-amber-200">${Z(this.sceneSpotName||this.scene.npc?.name||`Khảo sát`)}</div>
            <div class="text-[11px] text-muted">${Z(this.scene.npc?.name||``)}${this.scene.npc?.title?` • ${Z(this.scene.npc.title)}`:``}</div>
          </div>
          <button class="ui-btn ui-btn--ghost ui-btn--sm" data-scene-close>Đóng</button>
        </div>
        <p class="text-sm text-slate-300 mt-2">${Z(this.scene.narrative||``)}</p>
        <div class="grid grid-cols-1 gap-2 mt-2">
          ${e.map((e,t)=>`
            <button class="ui-btn ui-btn--ghost ui-btn--sm text-left" data-scene-option="${t}" ${e.disabled?`disabled`:``}>
              <strong>${Z(e.title||e.id||`Lựa chọn ${t+1}`)}</strong>
              ${e.desc?`<span class="block text-[11px] text-muted">${Z(e.desc)}</span>`:``}
            </button>
          `).join(``)}
        </div>
      </div>
    `}bind(){let e=this.modal.getBodyElement();e&&(e.querySelectorAll(`[data-city-enter]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.dataset.cityEnter||``;e.setAttribute(`disabled`,`true`);try{let e=(await X.enter(t))?.result?.nameVi||t;this.scene=await X.getScene(e),this.sceneSpotName=e,await this.refresh(),this.render()}catch(t){e.removeAttribute(`disabled`),fe(t.message||`Không vào được địa điểm.`,!0)}})}),e.querySelectorAll(`[data-scene-close]`).forEach(e=>{e.addEventListener(`click`,()=>{this.scene=null,this.sceneSpotName=null,this.render()})}),e.querySelectorAll(`[data-scene-option]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=Number(e.dataset.sceneOption||-1),n=this.scene?.options?.[t];if(n?.action){e.setAttribute(`disabled`,`true`);try{fe((await X.dispatchAction(n.action))?.message||`Đã thực hiện lựa chọn.`),this.scene=null,this.sceneSpotName=null,await this.refresh(),this.render()}catch(t){e.removeAttribute(`disabled`),fe(t.message||`Hành động thất bại.`,!0)}}})}))}},he=new me,ge={wu_wei:`xi_liang`,he_fei:`shou_chun`,pu_yang:`ye_cheng`,wu_ling:`jiang_ling`};function _e(e){return ge[e]||e}var Q=new class{ALIASES=ge;state={status:`idle`,fetchedAt:0,bySettlement:{},byMapNode:{},activeExpeditions:[],player:null,playerFaction:null,factionsById:{},banditsByNode:{},crisesByNode:{},npcsByName:{},npcsById:{},playerCash:0,inventory:{},specialistsByName:{},specialistsByMapNode:{},businesses:[],guardTiers:[],routesByKey:{},locationsById:{},locToMapNode:{},caravans:[],expeditions:[],resourcesByNode:{},resourceTotals:{},mapRegistry:null,errors:[]};resolveMapNodeId(e){return _e(e)}getSubLocationsForNode(e){return this.state.mapRegistry?.subLocationsByNode?.[e]||[]}getPoiScenesForNode(e){return this.state.mapRegistry?.poiScenesByNode?.[e]||[]}mergeRecord(e,t){return Object.assign({},e||{},t||{})}async readJson(e){let t=await fetch(e,{headers:{Accept:`application/json`}});if(!t.ok)throw Error(`${e} returned ${t.status}`);return t.json()}async load(e=!1){if(!e&&this.state.status===`ready`&&Date.now()-this.state.fetchedAt<1e4)return this.state;this.state.status=`loading`,this.state.errors=[];let[t,n,r,i,a,o,s,c,l,u,d,f,p,m,h,g,_,v]=await Promise.allSettled([this.readJson(`/api/garrisons`),this.readJson(`/api/factions/settlements`),this.readJson(`/api/factions`),this.readJson(`/api/military/status`),this.readJson(`/api/logistics/strongholds`),this.readJson(`/api/ecology/crises`),this.readJson(`/api/npcs`),this.readJson(`/api/status`),this.readJson(`/api/inventory`),this.readJson(`/api/workforce/specialists`),this.readJson(`/api/workforce/businesses`),this.readJson(`/api/caravans/guard-tiers`),this.readJson(`/api/military/routes`),this.readJson(`/api/locations`),this.readJson(`/api/logistics/caravans`),this.readJson(`/api/expeditions`),this.readJson(`/api/professions/nodes`),this.readJson(`/api/map/registry`)]),y=t.status===`fulfilled`&&t.value.success&&t.value.garrisons||[],ee=n.status===`fulfilled`&&n.value.success&&n.value.settlements||[],b=r.status===`fulfilled`&&r.value.success&&r.value.factions||[],x=i.status===`fulfilled`&&i.value.success?i.value:null,S=a.status===`fulfilled`&&a.value.success&&a.value.strongholds||[],te=o.status===`fulfilled`&&o.value.success&&o.value.crises||[],C=s.status===`fulfilled`&&s.value.success&&s.value.npcs||[],w=c.status===`fulfilled`&&c.value.success?c.value:null,ne=l.status===`fulfilled`&&l.value.success&&l.value.items||[],T=u.status===`fulfilled`&&u.value.success&&u.value.specialists||[],E=d.status===`fulfilled`&&d.value.success&&d.value.businesses||[],D=f.status===`fulfilled`&&f.value.success&&f.value.tiers||[],re=p.status===`fulfilled`&&p.value.success&&p.value.routes||[],O=m.status===`fulfilled`&&m.value.success&&m.value.locations||[],ie=h.status===`fulfilled`&&h.value.success&&h.value.caravans||[],k=g.status===`fulfilled`&&g.value.success&&g.value.expeditions||[],ae=_.status===`fulfilled`&&_.value.success&&_.value.nodes||[],A=v.status===`fulfilled`&&v.value.success?v.value:null;v.status===`rejected`&&this.state.errors.push(`map-registry`),t.status===`rejected`&&this.state.errors.push(`garrisons`),n.status===`rejected`&&this.state.errors.push(`factions/settlements`),r.status===`rejected`&&this.state.errors.push(`factions`),i.status===`rejected`&&this.state.errors.push(`military`),a.status===`rejected`&&this.state.errors.push(`strongholds`),o.status===`rejected`&&this.state.errors.push(`crises`),s.status===`rejected`&&this.state.errors.push(`npcs`),c.status===`rejected`&&this.state.errors.push(`status`),l.status===`rejected`&&this.state.errors.push(`inventory`),u.status===`rejected`&&this.state.errors.push(`workforce`),d.status===`rejected`&&this.state.errors.push(`businesses`),f.status===`rejected`&&this.state.errors.push(`guard-tiers`),p.status===`rejected`&&this.state.errors.push(`routes`),m.status===`rejected`&&this.state.errors.push(`locations`),h.status===`rejected`&&this.state.errors.push(`caravans`),g.status===`rejected`&&this.state.errors.push(`expeditions`),_.status===`rejected`&&this.state.errors.push(`resources`),this.state.mapRegistry=A?{nodes:A.nodes||[],subLocationsByNode:A.subLocationsByNode||{},poiScenesByNode:A.poiScenesByNode||{},resourcesByNode:A.resourcesByNode||{},orphans:A.orphans||[]}:null;let j={};b.forEach(e=>{let t=e&&e.factionId;t&&(j[t]=e)});let M={};y.forEach(e=>{e&&e.settlementId&&(M[e.settlementId]=this.mergeRecord(M[e.settlementId],e))}),ee.forEach(e=>{e&&e.settlementId&&(M[e.settlementId]=this.mergeRecord(M[e.settlementId],e))}),Object.keys(M).forEach(e=>{let t=M[e],n=t.rulerFactionId?j[t.rulerFactionId]:null;if(!n)return;let r=n;t.factionNameVi=r.nameVi,t.factionNameEn=r.nameEn,t.factionColor=r.colorHex,t.factionMilitaryPower=r.militaryPower});let N={};Object.keys(M).forEach(e=>{this.resolveMapNodeId(e)===e&&(N[e]=this.mergeRecord(N[e],{...M[e],sourceSettlementId:e}))}),Object.keys(M).forEach(e=>{let t=this.resolveMapNodeId(e);N[t]||(N[t]=this.mergeRecord(N[t],{...M[e],sourceSettlementId:e}))}),this.state.bySettlement=M,this.state.byMapNode=N,this.state.activeExpeditions=x&&x.activeExpeditions||[],this.state.player=x&&x.commander||null,this.state.playerFaction=b.find(e=>e.leaderId===`PLY-0001`)||null,this.state.factionsById=j;let P={};S.forEach(e=>{let t=e.status,n=e.locationNear;if(t!==`ACTIVE`||!n)return;let r=this.resolveMapNodeId(n);(P[r]||=[]).push(e)});let F={};te.forEach(e=>{let t=e.settlementId;if(!t)return;let n=this.resolveMapNodeId(t);(F[n]||=[]).push(e)}),this.state.banditsByNode=P,this.state.crisesByNode=F;let I={},L={};C.forEach(e=>{let t=e.name,n=e.npc_id||e.npcId;n&&(L[n]=e),t&&(I[this.normalizeName(t)]=e)}),this.state.npcsByName=I,this.state.npcsById=L;let oe=Number(w?.player?.liquid_cash)||0,R={};ne.forEach(e=>{let t=e.item_code||e.itemCode,n=Number(e.quantity)||0;t&&(R[t]=n)}),this.state.playerCash=oe,this.state.inventory=R,this.state.guardTiers=D;let se={};T.forEach(e=>{let t=e.nameVi;t&&(se[this.normalizeName(t)]=e)}),this.state.specialistsByName=se,this.state.caravans=ie,this.state.expeditions=k;let z={},B={};ae.forEach(e=>{let t=String(e.settlementId||``),n=this.resolveMapNodeId(t),r=String(e.resourceType||``);n&&r&&(z[n]||(z[n]={types:{},nodes:[]}),z[n].types[r]=(z[n].types[r]||0)+1,z[n].nodes.push(e),B[r]=(B[r]||0)+1)}),this.state.resourcesByNode=z,this.state.resourceTotals=B;let V={};O.forEach(e=>{let t=e.locationId;t&&(V[t]=e)}),this.state.locationsById=V;let H={};if(typeof window<`u`){let e=window.SETTLEMENT_LABELS||{};Object.keys(e).forEach(t=>{if(t===`wu_wei`)return;let n=e[t]&&e[t].vi;n&&(H[this.normalizeLocationLabel(n)]=t)})}let U={};O.forEach(e=>{let t=e.locationId,n=e.nameVi;if(!t||!n)return;let r=H[this.normalizeLocationLabel(n)];r&&(U[t]=r)}),this.state.locToMapNode=U;let W={};E.forEach(e=>{let t=e.businessId,n=e.locationId;t&&n&&(W[t]=n)});let G={};T.forEach(e=>{let t=!!e.isHired,n=e.assignedBusinessId,r=n?W[n]:null,i=e.baselineLocation,a=t&&r?r:i,o=a?U[a]:null;o&&(G[o]||=[]).push(e)}),this.state.businesses=E,this.state.specialistsByMapNode=G;let K={};return re.forEach(e=>{let t=U[e.sourceLocationId||``],n=U[e.targetLocationId||``];if(!t||!n)return;let r=e.descriptionEn?e.descriptionEn.trim():``,i=r&&!/^RT-/i.test(r)&&/^[\x20-\x7E]+$/.test(r)?r:void 0,a={from:t,to:n,distanceLi:e.distanceLi,terrainType:e.terrainType,marchDays:e.standardMarchDays,grainCost:e.grainProvisionCost,ambushRisk:e.ambushRiskLevel,descVi:e.descriptionVi,descEn:i},o=`${t}|${n}`,s=`${n}|${t}`;K[o]||(K[o]=a),K[s]||(K[s]={...a,from:n,to:t})}),this.state.routesByKey=K,this.state.status=this.state.errors.length===17?`error`:`ready`,this.state.fetchedAt=Date.now(),this.state}getForMapNode(e){return e&&(this.state.byMapNode[e]||this.state.bySettlement[e])||null}normalizeName(e){return e.normalize(`NFC`).trim().toLowerCase()}normalizeLocationLabel(e){return e.replace(/\s*\(.*?\)/g,``).replace(/\s*&.*/g,``).replace(/Kinh Đô\s*/g,``).replace(/Tây Đô\s*/g,``).replace(/Imperial Capital\s*/gi,``).trim().toLowerCase()}findNpcByName(e){return e&&this.state.npcsByName[this.normalizeName(e)]||null}findSpecialistByName(e){return e&&this.state.specialistsByName[this.normalizeName(e)]||null}getLocIdForNode(e){let t=Object.entries(this.state.locToMapNode).find(([,t])=>t===e);return t?t[0]:null}getSpecialistsForMapNode(e){return[...this.state.specialistsByMapNode[e]||[]].sort((e,t)=>{let n=!!e.isHired;if(n!==!!t.isHired)return n?1:-1;let r=String(e.nameVi||``),i=String(t.nameVi||``);return r.localeCompare(i)})}getRecruitRequirement(e){let t=this.findSpecialistByName(e);if(!t)return{canRecruit:!0,signingBonus:null,isHired:!1,reasonVi:``,reasonEn:``};let n=!!t.isHired,r=Number(t.signingBonus)||0;return n?{canRecruit:!1,signingBonus:r,isHired:n,reasonVi:`Đã được chiêu mộ`,reasonEn:`Already recruited`}:this.state.playerCash<r?{canRecruit:!1,signingBonus:r,isHired:n,reasonVi:`Cần ${r} quan chiêu mộ`,reasonEn:`Need ${r} cash to recruit`}:{canRecruit:!0,signingBonus:r,isHired:n,reasonVi:``,reasonEn:``}}getActionRequirements(){let e=this.state.playerCash,t=Object.values(this.state.inventory).filter(e=>e>0).length,n=this.state.guardTiers.length?Math.min(...this.state.guardTiers.map(e=>Number(e.costQian)||0)):null,r=!0,i=``,a=``;return n==null?(r=!1,i=`Chưa tải được bảng giá hộ vệ`,a=`Guard prices are unavailable`):t===0?(r=!1,i=`Kho không có hàng để xuất`,a=`No cargo in the warehouse`):e<n&&(r=!1,i=`Cần tối thiểu ${n} quan thuê hộ vệ`,a=`Need at least ${n} cash for guards`),{cash:e,cargoKinds:t,minGuardCost:n,canDispatchCaravan:r,reasonVi:i,reasonEn:a}}getRoute(e,t){return this.state.routesByKey[`${e}|${t}`]||null}getLivingEntities(){return{caravans:this.state.caravans.filter(e=>String(e.status).toUpperCase()===`EN_ROUTE`).map(e=>({...e,from:this.resolveMapNodeId(String(e.fromSettlementId||``)),to:this.resolveMapNodeId(String(e.toSettlementId||``)),progress:Number(e.routeProgress)||0})).filter(e=>e.from&&e.to),expeditions:this.state.expeditions.filter(e=>[`MARCHING`,`ARRIVED`].includes(String(e.status).toUpperCase())).map(e=>{let t=e;return{...e,from:this.resolveMapNodeId(String(t.origin_settlement_id||t.originSettlementId||``)),to:this.resolveMapNodeId(String(t.target_settlement_id||t.targetSettlementId||``))}}).filter(e=>e.from&&e.to),bandits:Object.entries(this.state.banditsByNode).flatMap(([e,t])=>t.map(t=>({...t,nodeId:e}))),crises:Object.entries(this.state.crisesByNode).flatMap(([e,t])=>t.map(t=>({...t,nodeId:e})))}}getStatusForMapNode(e){let t=this.getForMapNode(e);if(!t)return{key:`unknown`,labelVi:`Chưa rõ`,labelEn:`Unknown`,className:`capital`};let n=this.state.playerFaction?.factionId,r=!!(t.rulerFactionId&&n&&t.rulerFactionId===n),i=Number(t.garrisonTroops??0),a=Number(t.granaryGrain??0),o=Number(t.publicOrder??100);return r?i<200||a<=0||o<30?{key:`strained`,labelVi:`Suy Yếu`,labelEn:`Strained`,className:`battle`}:{key:`stable`,labelVi:`An Định`,labelEn:`Stable`,className:`safe`}:{key:`foreign`,labelVi:`Ngoại Bang`,labelEn:`Foreign Holding`,className:`capital`}}getThreatForMapNode(e){let t=this.getForMapNode(e),n=this.state.banditsByNode[e]||[],r=this.state.crisesByNode[e]||[],i=[],a=[],o=0;if(n.length>0){let e=Math.max(...n.map(e=>Number(e.banditPower)||0));o+=Math.min(3,e/150),i.push(`${n.length} ổ phỉ`),a.push(`${n.length} bandit lair${n.length>1?`s`:``}`)}r.forEach(e=>{let t=Number(e.severityLevel)||1;o+=Math.min(3,t);let n=e.titleVi||`Khủng hoảng`;i.push(n),a.push(n)});let s=t&&Number.isFinite(t.garrisonTroops)?Number(t.garrisonTroops):null,c=t&&Number.isFinite(t.publicOrder)?Number(t.publicOrder):null;s!=null&&s<500&&(o+=1,i.push(`Đồn trú mỏng`),a.push(`Thin garrison`)),c!=null&&c<40&&(o+=1,i.push(`Trật tự thấp`),a.push(`Low public order`));let l=o>=3?`HIGH`:o>=1.5?`MODERATE`:`LOW`;return{level:l,...{LOW:{labelVi:`Thấp`,labelEn:`Low`,color:`#34d399`},MODERATE:{labelVi:`Vừa`,labelEn:`Moderate`,color:`#fbbf24`},HIGH:{labelVi:`Cao`,labelEn:`High`,color:`#f87171`}}[l],reasonsVi:i,reasonsEn:a}}getResourceDistribution(){return{byNode:this.state.resourcesByNode,totals:this.state.resourceTotals,types:Object.keys(this.state.resourceTotals).sort()}}getResourceNodesForMapNode(e){return this.state.resourcesByNode[e]?.nodes||[]}hasArmy(){return Array.isArray(this.state.activeExpeditions)&&this.state.activeExpeditions.length>0}getState(){return this.state}};function ve(){if(typeof window>`u`)return;let e=window;e.ModalShellCore={createModalShell:a,modalStack:t},e.UI=_,e.LineageFamilyUI={open:e=>S.open(e),close:()=>S.close(),setFilter:e=>S.setFilter(e),proposeMarriage:e=>S.proposeMarriage(e),restCohabit:e=>S.restCohabit(e),assignRole:(e,t)=>S.assignRole(e,t),designateHeir:e=>S.designateHeir(e),assignMentorDialog:e=>S.assignMentorDialog(e),executeSuccession:()=>S.executeSuccession()},e.EquipmentUI={openEquipmentModal:(e,t)=>T.open(e,t),closeEquipmentModal:()=>T.close(),switchTab:e=>T.modal.switchTab(e),equip:(e,t,n)=>T.equip(e,t,n),unequip:(e,t)=>T.unequip(e,t),repairTool:e=>T.repairTool(e),executeForge:()=>T.executeForge()},e.EnterpriseUI={openEnterpriseModal:e=>O.open(e),closeEnterpriseModal:()=>O.close(),depositSafeCash:e=>O.depositSafeCash(e),withdrawSafeCash:e=>O.withdrawSafeCash(e),executeWork:e=>O.executeWork(e)},e.ProtagonistDossierModal={open:()=>A.openProtagonist(),close:()=>A.closeProtagonist()},e.NpcDossierModal={open:e=>A.openNpc(e),close:()=>A.closeNpc()},e.QuickTradeModal={open:(e,t,n,r)=>M.open(e,t,n,r),close:()=>M.close(),updateTotal:()=>M.updateTotal(),submit:()=>M.submit()},e.MarketStallModal={open:(e=`stall`)=>U.open(e),close:()=>U.close()},e.TacticalBattleUI={startDuel:e=>F.startDuel(e),close:()=>F.close(),executeAction:e=>F.executeAction(e)},e.TravelTransitUI={show:(e,t,n,r)=>L.showTravelTransit(e,t,n,r),close:()=>L.closeTravel(),openLegacy:()=>L.openTravelTransitModal(),closeLegacy:()=>L.closeTravelTransitModal()},e.TurnAdvanceUI={show:(e,t,n)=>L.showTurnAdvance(e,t,n),close:()=>L.closeTurn(),openLegacy:()=>L.openTurnAdvanceModal(),closeLegacy:()=>L.closeTurnAdvanceModal()},e.QuestUI={open:()=>z.open(),close:()=>z.close(),accept:e=>z.accept(e),advance:e=>z.advance(e),payObligation:e=>z.payObligation(e),acceptContract:e=>z.acceptContract(e),deliverContract:e=>z.deliverContract(e),verifyIntel:e=>z.verifyIntel(e),rentFarm:e=>z.rentFarm(e),plantCrop:(e,t)=>z.plantCrop(e,t),harvestFarm:e=>z.harvestFarm(e)},e.WorldMapUI={open:()=>G.open(),close:()=>G.close()},e.WildernessMapUI={open:e=>ue.open(e),close:()=>ue.close()},e.CityMapUI={open:e=>he.open(e),close:()=>he.close()},e.MapLiveService={load:(e=!1)=>Q.load(e),getForMapNode:e=>Q.getForMapNode(e),getSubLocationsForNode:e=>Q.getSubLocationsForNode(e),getPoiScenesForNode:e=>Q.getPoiScenesForNode(e),getStatusForMapNode:e=>Q.getStatusForMapNode(e),getThreatForMapNode:e=>Q.getThreatForMapNode(e),findNpcByName:e=>Q.findNpcByName(e),findSpecialistByName:e=>Q.findSpecialistByName(e),getSpecialistsForMapNode:e=>Q.getSpecialistsForMapNode(e),getLocIdForNode:e=>Q.getLocIdForNode(e),getRecruitRequirement:e=>Q.getRecruitRequirement(e),getActionRequirements:()=>Q.getActionRequirements(),getRoute:(e,t)=>Q.getRoute(e,t),getLivingEntities:()=>Q.getLivingEntities(),getResourceDistribution:()=>Q.getResourceDistribution(),getResourceNodesForMapNode:e=>Q.getResourceNodesForMapNode(e),resolveMapNodeId:e=>Q.resolveMapNodeId(e),hasArmy:()=>Q.hasArmy(),getState:()=>Q.getState(),ALIASES:Q.ALIASES},console.log(`[ThreeKingdoms-AgentEngine] All 14 client feature slices successfully bridged to window.*`)}var ye=new class{handlers=new Map;on(e,t){return this.handlers.has(e)||this.handlers.set(e,new Set),this.handlers.get(e).add(t),()=>{this.off(e,t)}}off(e,t){let n=this.handlers.get(e);n&&(n.delete(t),n.size===0&&this.handlers.delete(e))}emit(e,t){let n=this.handlers.get(e);n&&n.forEach(n=>{try{n(t)}catch(t){console.error(`[EventBus] Error handling event ${e}:`,t)}})}},be=class e{static instance;static getInstance(){return e.instance||=new e,e.instance}async getCaravans(){return(await y.get(`/api/logistics/caravans`)).caravans||[]}async getArbitrageOpportunities(){return(await y.get(`/api/economy/arbitrage`)).routes||[]}async dispatchCaravan(e){return y.post(`/api/caravans/dispatch`,{cargoItemCode:e.commodityCode,cargoQuantity:e.quantity,fromSettlementId:e.originSettlementId,toSettlementId:e.destSettlementId,guardTier:e.escortLevel})}},$=be.getInstance(),xe=class{modal;caravans=[];routes=[];constructor(){this.modal=a({id:`caravan-modal`,title:`Thương Đoàn Viễn Chinh & Trục Vận Chuyển`,subtitle:`Thiết lập tuyến buôn liên châu, kinh doanh chênh lệch giá và thuê hộ tiêu áp tải`,seal:`商`,size:`xl`,tabs:[{id:`active`,label:`Thương Đoàn Đang Chạy`,seal:`運`},{id:`arbitrage`,label:`Thương Cơ & Chênh Lệch Giá`,seal:`漲`},{id:`dispatch`,label:`Xuất Tiêu Khai Tuyến`,seal:`旗`}],activeTabId:`active`,onOpen:async()=>{await this.refreshData(),await this.renderActiveTab()},onTabChange:async()=>{await this.renderActiveTab()}})}async open(e=`active`){await this.modal.open(e)}async close(){await this.modal.close()}async refreshData(){try{let[e,t]=await Promise.all([$.getCaravans().catch(()=>[]),$.getArbitrageOpportunities().catch(()=>[])]);this.caravans=e,this.routes=t,this.modal.updateTabBadge(`active`,e.length>0?e.length:void 0)}catch(e){console.error(`[CaravanLogisticsModal] Error refreshing data:`,e)}}async renderActiveTab(){switch(this.modal.activeTab||`active`){case`active`:this.renderActiveTabContent();break;case`arbitrage`:this.renderArbitrageTabContent();break;case`dispatch`:this.renderDispatchTabContent()}}renderActiveTabContent(){let e=`
      <div class="caravan-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">運</div>
          <div class="lead-text">
            <h3>Đội Buôn Lưu Động (${this.caravans.length} Tiêu Xa)</h3>
            <div class="text-muted text-sm">Thương đoàn di chuyển liên thành theo lượt tháng, ứng biến trước thời tiết và thổ phỉ dọc quan đạo.</div>
          </div>
        </div>

        ${this.caravans.length===0?`
          <div class="text-center py-10 text-muted">
            Hiện không có thương đoàn nào trên đường. Hãy vào mục "Xuất Tiêu Khai Tuyến" để phái chuyến buôn đầu tiên.
          </div>
        `:`
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${this.caravans.map(e=>`
              <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800">
                <div class="flex justify-between items-start mb-2">
                  <h4 class="text-amber-200 font-bold m-0 text-sm">Hàng Hóa: ${e.commodity_code} (SL: ${e.cargo_qty})</h4>
                  <span class="badge ${e.status===`IN_TRANSIT`?`badge-primary`:`badge-success`} text-xs">${e.status}</span>
                </div>
                <div class="text-xs text-muted mb-2">Từ: ${e.origin_settlement_id} → Đến: ${e.dest_settlement_id}</div>
                <div class="text-xs text-slate-300 font-mono">Thời gian còn lại: ${e.days_remaining}/${e.total_days} ngày • Hộ vệ: ${e.escort_level}</div>
              </div>
            `).join(``)}
          </div>
        `}
      </div>
    `;this.modal.setContent(e)}renderArbitrageTabContent(){let e=`
      <div class="caravan-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">漲</div>
          <div class="lead-text">
            <h3>Bảng Chênh Lệch Giá Hàng Hóa Liên Châu</h3>
            <div class="text-muted text-sm">Phân tích giá mua tại Trác Huyện và giá bán tại các thành thị lớn (Lạc Dương, Nghiệp Thành, Kiến Nghiệp).</div>
          </div>
        </div>

        ${this.routes.length===0?`
          <div class="text-center py-8 text-muted">Đang cập nhật tỷ giá liên thành...</div>
        `:`
          <div class="grid grid-cols-1 gap-2">
            ${this.routes.map(e=>`
              <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span class="font-bold text-amber-200">${e.commodityNameVi||e.commodityCode}</span>: 
                  ${e.originNameVi} (${e.buyPrice}đ) → ${e.destNameVi} (${e.sellPrice}đ)
                </div>
                <div class="text-right">
                  <span class="text-green-400 font-bold font-mono">+${e.profitPerUnit}đ/đơn vị</span>
                  <div class="text-muted text-[11px]">${e.distanceDays} ngày hành trình</div>
                </div>
              </div>
            `).join(``)}
          </div>
        `}
      </div>
    `;this.modal.setContent(e)}renderDispatchTabContent(){this.modal.setContent(`
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
    `)}async executeDispatch(){let e=document.getElementById(`caravan-dest-id`),t=document.getElementById(`caravan-commodity`),n=document.getElementById(`caravan-qty`),r=document.getElementById(`caravan-escort`),i={originSettlementId:`zhuo_xian`,destSettlementId:e?.value||`ye_cheng`,commodityCode:t?.value||`PROD-MAT`,quantity:parseInt(n?.value||`20`,10),escortLevel:r?.value||`MILITIA`};try{let e=await $.dispatchCaravan(i);typeof window.showToast==`function`&&window.showToast(e.narrativeVi||`Thương đoàn đã xuất phát!`),await this.refreshData(),await this.modal.switchTab(`active`)}catch(e){typeof window.showToast==`function`&&window.showToast(e.message||`Lỗi xuất thương đoàn!`,!0)}}},Se=new xe,Ce=class{modal;selectedScenario=`184_YELLOW_TURBAN`;constructor(){this.modal=a({id:`title-screen-scenario-modal`,title:`Tam Quốc Diễn Nghĩa • Khởi Tạo Niên Đại & Nhân Vật`,subtitle:`Chọn niên đại lịch sử và thiết lập danh tính nhân vật chính`,seal:`國`,size:`lg`,onOpen:async()=>{this.renderContent()}})}async open(){await this.modal.open()}async close(){await this.modal.close()}renderContent(){let e=`
      <div class="title-screen-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">國</div>
          <div class="lead-text">
            <h3>Chọn Khởi Điểm Chiến Dịch</h3>
            <div class="text-muted text-sm">Mỗi niên đại có cục diện chư hầu, kinh tế và thế lực hoàn toàn khác biệt.</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div class="tactical-card p-3 bg-slate-900 rounded border ${this.selectedScenario===`184_YELLOW_TURBAN`?`border-amber-400 bg-amber-950/20`:`border-slate-800`} cursor-pointer"
               onclick="window.TitleScreenUI.selectScenario('184_YELLOW_TURBAN')">
            <h4 class="text-amber-200 font-bold text-sm mb-1">184 SCN: Khởi Nghĩa Khăn Vàng</h4>
            <div class="text-xs text-muted">Trương Giác dấy binh, triều đình suy vi, anh hùng thảo mộc bắt đầu khởi nghiệp.</div>
          </div>

          <div class="tactical-card p-3 bg-slate-900 rounded border ${this.selectedScenario===`190_DONG_ZHUO`?`border-amber-400 bg-amber-950/20`:`border-slate-800`} cursor-pointer"
               onclick="window.TitleScreenUI.selectScenario('190_DONG_ZHUO')">
            <h4 class="text-amber-200 font-bold text-sm mb-1">190 SCN: Thảo Phạt Đổng Trác</h4>
            <div class="text-xs text-muted">Mười tám lộ chư hầu hội minh Quan Đông, Lạc Dương biển lửa.</div>
          </div>

          <div class="tactical-card p-3 bg-slate-900 rounded border ${this.selectedScenario===`200_GUANDU`?`border-amber-400 bg-amber-950/20`:`border-slate-800`} cursor-pointer"
               onclick="window.TitleScreenUI.selectScenario('200_GUANDU')">
            <h4 class="text-amber-200 font-bold text-sm mb-1">200 SCN: Quan Độ Chi Chiến</h4>
            <div class="text-xs text-muted">Tào Tháo đối đầu Viên Thiệu tranh đoạt bá chủ phương bắc.</div>
          </div>

          <div class="tactical-card p-3 bg-slate-900 rounded border ${this.selectedScenario===`208_CHIBI`?`border-amber-400 bg-amber-950/20`:`border-slate-800`} cursor-pointer"
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
    `;this.modal.setContent(e)}selectScenario(e){this.selectedScenario=e,this.renderContent()}async startCampaign(){let e=document.getElementById(`ts-player-name`),t=document.getElementById(`ts-player-style`);try{await y.post(`/api/session/new-game`,{scenario:this.selectedScenario,playerName:e?.value||`Lương Diễn`,playerStyle:t?.value||`Chí Viễn`}),typeof window.showToast==`function`&&window.showToast(`Khởi tạo chiến dịch thành công!`),await this.modal.close(),window.location.reload()}catch(e){typeof window.showToast==`function`&&window.showToast(e.message||`Lỗi khởi tạo chiến dịch!`,!0)}}},we=new Ce;return ve(),e.CaravanLogisticsModal=xe,e.CaravanLogisticsService=be,e.CityMapModal=me,e.CityMapService=de,e.ClientApiClient=v,e.DossiersModal=ae,e.DossiersService=ie,e.EnterpriseWorkshopModal=re,e.EnterpriseWorkshopService=E,e.EquipmentForgeModal=ne,e.EquipmentForgeService=te,e.LEGACY_OWNED_MODAL_IDS=n,e.LineageFamilyModal=x,e.LineageFamilyService=ee,e.ModalShell=i,e.QuickTradeModal=j,e.TacticalBattleModal=P,e.TitleScreenModal=Ce,e.TransitTurnModals=I,e.WildernessMapModal=le,e.WildernessMapService=K,e.WorldMapModal=W,e.apiClient=y,e.caravanLogisticsModal=Se,e.caravanLogisticsService=$,e.cityMapModal=he,e.cityMapService=X,e.createModalShell=a,e.dossiersModal=A,e.dossiersService=k,e.enterpriseWorkshopModal=O,e.enterpriseWorkshopService=D,e.equipmentForgeModal=T,e.equipmentForgeService=C,e.eventBus=ye,e.isLegacyOwnedModalId=r,e.lineageFamilyModal=S,e.lineageFamilyService=b,e.modalStack=t,e.quickTradeModal=M,e.tacticalBattleModal=F,e.titleScreenModal=we,e.transitTurnModals=L,e.wildernessMapModal=ue,e.wildernessMapService=q,e.worldMapModal=G,e})({});
//# sourceMappingURL=client-bundle.iife.js.map