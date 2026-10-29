var SimulationClient=function(s){"use strict";var gt=Object.defineProperty;var vt=(s,b,g)=>b in s?gt(s,b,{enumerable:!0,configurable:!0,writable:!0,value:g}):s[b]=g;var i=(s,b,g)=>vt(s,typeof b!="symbol"?b+"":b,g);class b{constructor(){i(this,"stack",[]);i(this,"isEscListenerAttached",!1);i(this,"BASE_Z_INDEX",1e3);this.handleKeyDown=this.handleKeyDown.bind(this)}push(t,e){const a=this.stack.indexOf(t);a>-1&&this.stack.splice(a,1),this.stack.push(t);const n=this.BASE_Z_INDEX+this.stack.length*10;e.style.zIndex=n.toString(),this.ensureEscListener(),this.updateBodyScrollLock()}remove(t){const e=this.stack.indexOf(t);e>-1&&this.stack.splice(e,1),this.updateBodyScrollLock()}getTop(){return this.stack.length===0?null:this.stack[this.stack.length-1]}handleKeyDown(t){if(t.key==="Escape"||t.keyCode===27){const e=this.getTop();e&&(t.preventDefault(),t.stopPropagation(),e.close())}}ensureEscListener(){typeof window>"u"||this.isEscListenerAttached||(window.addEventListener("keydown",this.handleKeyDown,!0),this.isEscListenerAttached=!0)}updateBodyScrollLock(){typeof document>"u"||(this.stack.length>0?document.body.classList.add("modal-open"):document.body.classList.remove("modal-open"))}}const g=new b;class X{constructor(t){i(this,"id");i(this,"options");i(this,"backdropEl",null);i(this,"dialogEl",null);i(this,"titleEl",null);i(this,"subtitleEl",null);i(this,"sealEl",null);i(this,"tabBarEl",null);i(this,"bodyEl",null);i(this,"footerEl",null);i(this,"_isOpen",!1);i(this,"_activeTab",null);this.id=t.id,this.options={closeOnEsc:!0,closeOnBackdrop:!0,size:"lg",...t},this._activeTab=t.activeTabId||(t.tabs&&t.tabs.length>0?t.tabs[0].id:null),this.mountDom()}get isOpen(){return this._isOpen}get activeTab(){return this._activeTab}mountDom(){if(typeof document>"u")return;let t=document.getElementById(this.id);t||(t=document.createElement("div"),t.id=this.id,document.body.appendChild(t)),this.backdropEl=t,this.backdropEl.className=`modal-backdrop hidden ${this.options.customClass||""}`.trim();const a={sm:"modal-sm",md:"modal-md",lg:"modal-lg spatial-poi-dialog",xl:"modal-box--large spatial-poi-dialog",full:"modal-full spatial-poi-dialog"}[this.options.size||"lg"]||"modal-lg";this.backdropEl.innerHTML=`
      <div class="modal-dialog ${a} ${this.options.dialogClass||""}" role="dialog" aria-modal="true" aria-labelledby="${this.id}-title">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-title-seal" id="${this.id}-seal">${this.options.seal||"◈"}</span>
            <div>
              <h2 class="modal-title-text" id="${this.id}-title">${this.options.title}</h2>
              <div class="modal-subtitle" id="${this.id}-subtitle">${this.options.subtitle||""}</div>
            </div>
          </div>
          <button class="btn-close-modal" id="${this.id}-btn-close" title="Đóng [Esc]" aria-label="Close">✕</button>
        </div>
        ${this.options.tabs&&this.options.tabs.length>0?`<div class="modal-tab-bar" id="${this.id}-tab-bar"></div>`:""}
        <div class="modal-body" id="${this.id}-body"></div>
        <div class="modal-footer hidden" id="${this.id}-footer"></div>
      </div>
    `,this.dialogEl=this.backdropEl.querySelector(".modal-dialog"),this.titleEl=this.backdropEl.querySelector(`#${this.id}-title`),this.subtitleEl=this.backdropEl.querySelector(`#${this.id}-subtitle`),this.sealEl=this.backdropEl.querySelector(`#${this.id}-seal`),this.tabBarEl=this.backdropEl.querySelector(`#${this.id}-tab-bar`),this.bodyEl=this.backdropEl.querySelector(`#${this.id}-body`),this.footerEl=this.backdropEl.querySelector(`#${this.id}-footer`);const n=this.backdropEl.querySelector(`#${this.id}-btn-close`);n&&n.addEventListener("click",o=>{o.preventDefault(),this.close()}),this.options.closeOnBackdrop&&this.backdropEl.addEventListener("click",o=>{o.target===this.backdropEl&&this.close()}),this.options.tabs&&this.options.tabs.length>0&&this.renderTabs(this.options.tabs),this.options.actions&&this.options.actions.length>0&&this.setFooter(this.options.actions)}renderTabs(t){this.tabBarEl&&(this.tabBarEl.innerHTML=t.map(e=>`
        <button class="modal-tab-btn ${e.id===this._activeTab?"active":""} ${e.disabled?"disabled":""}" 
                data-tab-id="${e.id}" 
                ${e.disabled?"disabled":""}>
          ${e.seal?`<span class="tab-seal">${e.seal}</span>`:""}
          <span class="tab-label">${e.label}</span>
          ${e.badge!==void 0?`<span class="tab-badge">${e.badge}</span>`:""}
        </button>
      `).join(""),this.tabBarEl.querySelectorAll(".modal-tab-btn").forEach(e=>{e.addEventListener("click",a=>{a.preventDefault();const n=e.getAttribute("data-tab-id");n&&n!==this._activeTab&&this.switchTab(n)})}))}async open(t){this.backdropEl||this.mountDom(),this.backdropEl&&(t&&t!==this._activeTab&&(this._activeTab=t,this.updateActiveTabButton()),this.backdropEl.classList.remove("hidden"),this._isOpen=!0,g.push(this,this.backdropEl),this.options.onOpen&&await this.options.onOpen(this))}async close(){!this._isOpen||!this.backdropEl||(this.backdropEl.classList.add("hidden"),this._isOpen=!1,g.remove(this),this.options.onClose&&await this.options.onClose(this))}async toggle(){this._isOpen?await this.close():await this.open()}setContent(t){this.bodyEl&&(typeof t=="string"?this.bodyEl.innerHTML=t:(this.bodyEl.innerHTML="",this.bodyEl.appendChild(t)))}setTitle(t,e,a){this.titleEl&&(this.titleEl.textContent=t),e!==void 0&&this.subtitleEl&&(this.subtitleEl.textContent=e),a!==void 0&&this.sealEl&&(this.sealEl.textContent=a)}async switchTab(t){this._activeTab=t,this.updateActiveTabButton(),this.options.onTabChange&&await this.options.onTabChange(t,this)}updateActiveTabButton(){this.tabBarEl&&this.tabBarEl.querySelectorAll(".modal-tab-btn").forEach(t=>{const e=t.getAttribute("data-tab-id");t.classList.toggle("active",e===this._activeTab)})}updateTabBadge(t,e){if(!this.tabBarEl)return;const a=this.tabBarEl.querySelector(`[data-tab-id="${t}"]`);if(!a)return;let n=a.querySelector(".tab-badge");e==null||e===""?n&&n.remove():(n||(n=document.createElement("span"),n.className="tab-badge",a.appendChild(n)),n.textContent=String(e))}setFooter(t){if(this.footerEl)if(Array.isArray(t)){this.footerEl.innerHTML="",this.footerEl.className="modal-footer flex items-center justify-end gap-3";for(const e of t){const a=document.createElement("button"),n=e.variant==="ghost"?"btn-action-ghost":e.variant==="danger"?"btn-danger":e.variant==="gold"?"btn-action-gold":"btn-primary";a.className=`btn ${n}`,a.textContent=e.label,e.disabled&&(a.disabled=!0),a.addEventListener("click",async o=>{o.preventDefault(),await e.onClick(this)}),this.footerEl.appendChild(a)}this.footerEl.classList.remove("hidden")}else typeof t=="string"?(this.footerEl.innerHTML=t,this.footerEl.classList.remove("hidden")):(this.footerEl.innerHTML="",this.footerEl.appendChild(t),this.footerEl.classList.remove("hidden"))}getBodyElement(){return this.bodyEl}getDialogElement(){return this.dialogEl}destroy(){this._isOpen&&this.close(),this.options.onDestroy&&this.options.onDestroy(this),this.backdropEl&&this.backdropEl.parentNode&&this.backdropEl.parentNode.removeChild(this.backdropEl),this.backdropEl=null,this.dialogEl=null,this.bodyEl=null,this.tabBarEl=null,this.footerEl=null}}function r(d){return new X(d)}const x=class x{static getInstance(){return x.instance||(x.instance=new x),x.instance}async get(t,e){let a=t;if(e){const o=new URLSearchParams;for(const[F,m]of Object.entries(e))m!=null&&o.append(F,String(m));const c=o.toString();c&&(a+=(a.includes("?")?"&":"?")+c)}const n=await fetch(a);if(!n.ok){const o=await n.json().catch(()=>({}));throw new Error(o.error||`HTTP error ${n.status}: ${n.statusText}`)}return n.json()}async post(t,e){const a=await fetch(t,{method:"POST",headers:{"Content-Type":"application/json"},body:e?JSON.stringify(e):void 0}),n=await a.json().catch(()=>({}));if(!a.ok||n&&n.success===!1)throw new Error(n.error||`HTTP error ${a.status}: ${a.statusText}`);return n}};i(x,"instance");let P=x;const l=P.getInstance(),f=class f{static getInstance(){return f.instance||(f.instance=new f),f.instance}async getOverview(){const t=await l.get("/api/lineage/status");return t.overview||t}async getCourtshipCandidates(){return(await l.get("/api/lineage/courtship-candidates")).candidates||[]}async proposeMarriage(t){return l.post("/api/lineage/propose-marriage",{candidateId:t})}async restAndCohabit(t){return l.post("/api/lineage/rest-cohabit",{spouseId:t})}async assignHouseholdRole(t,e){return l.post("/api/lineage/assign-role",{marriageId:t,role:e})}async getHeirs(){return l.get("/api/lineage/heirs")}async assignMentor(t,e){return l.post("/api/lineage/assign-mentor",{childId:t,mentorId:e})}async designateHeir(t){return l.post("/api/lineage/designate-heir",{childId:t})}async getSuccessionPreview(){return l.get("/api/lineage/succession-preview")}async executeSuccession(){return l.post("/api/lineage/execute-succession",{})}};i(f,"instance");let B=f;const v=B.getInstance();class z{constructor(){i(this,"modal");i(this,"overview",null);i(this,"candidates",[]);i(this,"selectedStratumFilter","ALL");this.modal=r({id:"standard-lineage-family-modal",title:"Gia Thất & Thế Gia Vọng Tộc",subtitle:"Cầu hôn giai nhân, bồi dưỡng thế tử kế nghiệp, kiến lập gia tộc ngàn đời",seal:"家",size:"xl",tabs:[{id:"courtship",label:"Cầu Hôn & Thê Thiếp",seal:"姻"},{id:"heirs",label:"Hậu Duệ & Thụ Giáo",seal:"嗣"},{id:"tree",label:"Gia Phả Dòng Họ",seal:"譜"},{id:"succession",label:"Tông Miếu & Thừa Kế",seal:"繼"}],activeTabId:"courtship",onOpen:async()=>{await this.refreshData(),await this.renderActiveTab()},onTabChange:async t=>{await this.renderActiveTab()}})}async open(t="courtship"){await this.modal.open(t)}async close(){await this.modal.close()}async refreshData(){var t,e;try{const[a,n]=await Promise.all([v.getOverview().catch(()=>null),v.getCourtshipCandidates().catch(()=>[])]);this.overview=a,this.candidates=n;const o=((t=a==null?void 0:a.spouses)==null?void 0:t.length)||0,c=((e=a==null?void 0:a.children)==null?void 0:e.length)||0;this.modal.updateTabBadge("courtship",o>0?o:void 0),this.modal.updateTabBadge("heirs",c>0?c:void 0)}catch(a){console.error("[LineageFamilyModal] Error refreshing data:",a)}}async renderActiveTab(){switch(this.modal.activeTab||"courtship"){case"courtship":this.renderCourtshipTab();break;case"heirs":this.renderHeirsTab();break;case"tree":this.renderTreeTab();break;case"succession":this.renderSuccessionTab();break;default:this.renderCourtshipTab()}}renderCourtshipTab(){var o,c,F;const t=((o=this.overview)==null?void 0:o.spouses)||[],e=t.length>0;let a=this.candidates;this.selectedStratumFilter!=="ALL"&&(a=this.candidates.filter(m=>m.socialStratum===this.selectedStratumFilter));const n=`
      <div class="lineage-modal-content">
        <!-- Clan Banner -->
        <div class="spatial-banner-lead">
          <div class="lead-seal">家</div>
          <div class="lead-text">
            <h3>Gia Tộc Thế Hệ Thứ ${((c=this.overview)==null?void 0:c.generation)||1} • Danh Vọng Gia Tộc: ${((F=this.overview)==null?void 0:F.clanPrestige)||100}</h3>
            <div class="text-muted text-sm">
              ${e?`Đã thành gia lập thất với ${t.length} phu nhân. Gia đạo hòa thuận, con cháu hưng vượng.`:"Chưa lập gia thất. Hãy tìm kiếm giai nhân phù hợp từ thường dân hoặc danh môn để kết tóc se duyên."}
            </div>
          </div>
        </div>

        <!-- Current Spouses Section -->
        ${e?`
          <div class="section-title text-gold font-bold mb-3">Chính Thê & Thê Thiếp Đang Chung Sống:</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            ${t.map(m=>this.renderSpouseCard(m)).join("")}
          </div>
        `:""}

        <!-- Courtship Section -->
        <div class="flex items-center justify-between mb-3 border-b border-amber-900/40 pb-2">
          <div class="section-title text-gold font-bold">Danh Sách Giai Nhân & Đối Tượng Cầu Hôn:</div>
          <div class="flex gap-2">
            <button class="btn btn-xs ${this.selectedStratumFilter==="ALL"?"btn-primary":"btn-action-ghost"}" onclick="window.LineageFamilyUI.setFilter('ALL')">Tất Cả (${this.candidates.length})</button>
            <button class="btn btn-xs ${this.selectedStratumFilter==="PEASANT"?"btn-primary":"btn-action-ghost"}" onclick="window.LineageFamilyUI.setFilter('PEASANT')">Nông Gia</button>
            <button class="btn btn-xs ${this.selectedStratumFilter==="ARTISAN_SHOP"?"btn-primary":"btn-action-ghost"}" onclick="window.LineageFamilyUI.setFilter('ARTISAN_SHOP')">Thợ Xưởng</button>
            <button class="btn btn-xs ${this.selectedStratumFilter==="GENTRY_CLAN"?"btn-primary":"btn-action-ghost"}" onclick="window.LineageFamilyUI.setFilter('GENTRY_CLAN')">Sĩ Tộc</button>
            <button class="btn btn-xs ${this.selectedStratumFilter==="HISTORICAL_HEROINE"?"btn-primary":"btn-action-ghost"}" onclick="window.LineageFamilyUI.setFilter('HISTORICAL_HEROINE')">Danh Viện</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          ${a.length>0?a.map(m=>this.renderCandidateCard(m)).join(""):'<div class="text-muted col-span-full py-6 text-center">Không có giai nhân nào trong danh mục này.</div>'}
        </div>
      </div>
    `;this.modal.setContent(n)}renderSpouseCard(t){const e=[{id:"HOUSEKEEPER",name:"Quản Gia Tề Nội"},{id:"ENTERPRISE_SUPERVISOR",name:"Giám Sát Sản Nghiệp"},{id:"STRATEGIC_ADVISOR",name:"Mưu Lược Tham Mưu"},{id:"MILITARY_DEFENDER",name:"Thống Soái Hộ Vệ"}],a=Number(t.pregnancy_stage)>0,n=Number(t.pregnancy_stage)===1?"Thai Nghén Sơ Kỳ (Tháng 1)":Number(t.pregnancy_stage)===2?"Thai Kỳ Trung Kỳ (Tháng 2)":Number(t.pregnancy_stage)===3?"Sắp Đến Ngày Lâm Bồn!":"Bình thường";return`
      <div class="tactical-card border-l-4 border-pink-500 p-3 bg-slate-900/80 rounded">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h4 class="text-amber-200 font-bold text-base m-0">${t.wife_name_vi}</h4>
            <div class="text-xs text-muted">Hôn Lễ: Ngày ${t.marriage_date} (Lượt ${t.marriage_turn})</div>
          </div>
          <div class="badge ${a?"badge-danger animate-pulse":"badge-neutral"} text-xs">
            ${a?"🍼 "+n:"Hảo Cảm: "+t.intimacy}
          </div>
        </div>

        <div class="text-xs text-slate-300 mb-3 bg-slate-950/60 p-2 rounded border border-amber-900/30">
          <div class="font-semibold text-amber-300/90 mb-1">Trọng Trách Nội Trạch:</div>
          <select class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-100" 
                  onchange="window.LineageFamilyUI.assignRole('${t.marriage_id}', this.value)">
            ${e.map(o=>`<option value="${o.id}" ${t.household_role===o.id?"selected":""}>${o.name}</option>`).join("")}
          </select>
          <div class="text-muted mt-1 italic">${t.role_effect_desc_vi||""}</div>
        </div>

        <div class="flex gap-2">
          <button class="btn btn-xs btn-primary flex-1" onclick="window.LineageFamilyUI.restCohabit('${t.wife_id}')">
            ❤️ Nghỉ Ngơi & Đồng Tẩm
          </button>
        </div>
      </div>
    `}renderCandidateCard(t){const a={PEASANT:{label:"Nông Thôn",color:"badge-success"},ARTISAN_SHOP:{label:"Thợ Xưởng",color:"badge-info"},GENTRY_CLAN:{label:"Sĩ Tộc",color:"badge-warning"},HISTORICAL_HEROINE:{label:"Danh Viện",color:"badge-danger"}}[t.socialStratum||"HISTORICAL_HEROINE"]||{label:"Danh Viện",color:"badge-danger"};return`
      <div class="tactical-card p-3 bg-slate-900/70 border border-slate-800 rounded flex flex-col justify-between">
        <div>
          <div class="flex justify-between items-start mb-2">
            <h4 class="text-amber-100 font-bold m-0 text-sm">${t.nameVi}</h4>
            <span class="badge ${a.color} text-xs">${a.label}</span>
          </div>

          <div class="text-xs text-muted mb-2 line-clamp-2">${t.clueVi}</div>

          ${t.maternalTrait?`
            <div class="bg-amber-950/30 border border-amber-900/40 rounded p-1.5 text-xs text-amber-300 mb-2">
              <span class="font-bold">Huyết Mạch:</span> ${t.maternalTrait.traitNameVi}
              <div class="text-muted text-[11px]">${t.maternalTrait.descriptionVi}</div>
            </div>
          `:""}

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
    `}renderHeirsTab(){var a;const t=((a=this.overview)==null?void 0:a.children)||[],e=`
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

        ${t.length===0?`
          <div class="text-center py-12 text-muted">
            <div class="text-4xl mb-3">👶</div>
            <div>Hiện tại gia tộc chưa có hậu duệ sinh hạ. Hãy nghỉ ngơi đồng tẩm cùng phu nhân để thụ thai dưỡng dục.</div>
          </div>
        `:`
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${t.map(n=>this.renderChildCard(n)).join("")}
          </div>
        `}
      </div>
    `;this.modal.setContent(e)}renderChildCard(t){const e=t.is_heir===1;return`
      <div class="tactical-card p-4 bg-slate-900/80 border ${e?"border-amber-400 shadow-amber-900/20":"border-slate-800"} rounded">
        <div class="flex justify-between items-start mb-2">
          <div>
            <h4 class="text-amber-200 font-bold text-base m-0">${t.name_vi} ${t.style_name?`(${t.style_name})`:""}</h4>
            <div class="text-xs text-muted">${t.gender==="MALE"?"Nam Tử":"Nữ Nhi"} • Tuổi: ${t.age} • Mẫu thân: ${t.mother_name_vi||"Nội thất"}</div>
          </div>
          <span class="badge ${e?"badge-primary":"badge-neutral"} text-xs">
            ${e?"👑 ĐÍCH TỬ KẾ VỊ":"Thứ Tử"}
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
          ${t.assigned_mentor_name_vi||'<span class="text-muted">Chưa bái sư</span>'}
        </div>

        <div class="flex gap-2">
          ${e?"":`
            <button class="btn btn-xs btn-action-gold flex-1" onclick="window.LineageFamilyUI.designateHeir('${t.child_id}')">
              Lập Làm Thế Tử
            </button>
          `}
          <button class="btn btn-xs btn-action-ghost flex-1" onclick="window.LineageFamilyUI.assignMentorDialog('${t.child_id}')">
            Chỉ Định Danh Sư
          </button>
        </div>
      </div>
    `}renderTreeTab(){var e,a,n,o;const t=`
      <div class="lineage-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">譜</div>
          <div class="lead-text">
            <h3>Gia Phả Tông Tộc • Thế Hệ ${((e=this.overview)==null?void 0:e.generation)||1}</h3>
            <div class="text-muted text-sm">Ghi chép công đức tiên tổ và thứ bậc con cháu dòng dõi.</div>
          </div>
        </div>

        <div class="p-6 bg-slate-950/60 rounded border border-amber-900/30 text-center">
          <div class="inline-block p-4 border-2 border-amber-500 rounded bg-slate-900 text-amber-200 font-bold text-lg mb-4">
            Đời Thứ ${((a=this.overview)==null?void 0:a.generation)||1}: ${((n=this.overview)==null?void 0:n.clanName)||"Lương Gia Tộc"}
          </div>
          <div class="text-xs text-muted mb-6">↓ Các chi phu nhân & thế tử tiếp nối ↓</div>
          
          <div class="flex flex-wrap justify-center gap-4">
            ${(((o=this.overview)==null?void 0:o.children)||[]).map(c=>`
              <div class="p-3 bg-slate-900 rounded border border-slate-700 min-w-[140px] text-xs">
                <div class="font-bold text-amber-300">${c.name_vi}</div>
                <div class="text-muted">${c.is_heir===1?"👑 Thế Tử":"Chi tộc"}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;this.modal.setContent(t)}renderSuccessionTab(){var a,n;const t=(a=this.overview)==null?void 0:a.activeHeir,e=`
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

        ${t?`
          <div class="tactical-card p-6 bg-slate-900/90 border border-amber-500/50 rounded mb-4">
            <h4 class="text-amber-300 font-bold text-lg mb-2">Thế Tử Kế Thừa: ${t.name_vi} (${t.age} Tuổi)</h4>
            <div class="text-sm text-slate-300 mb-4">
              Khi thực hiện chuyển giao:
              <ul class="list-disc list-inside mt-2 space-y-1 text-slate-400">
                <li>Nhân vật người chơi sẽ chuyển sang điều khiển <strong class="text-amber-200">${t.name_vi}</strong>.</li>
                <li>Thế hệ gia tộc tăng lên <strong>Thế Hệ Thứ ${(((n=this.overview)==null?void 0:n.generation)||1)+1}</strong>.</li>
                <li>100% Tiền mặt, Sản nghiệp và Binh khí truyền quốc được bảo lưu toàn vẹn.</li>
              </ul>
            </div>

            <button class="btn btn-action-gold w-full py-2.5 text-base font-bold" 
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
    `;this.modal.setContent(e)}setFilter(t){this.selectedStratumFilter=t,this.renderCourtshipTab()}async proposeMarriage(t){try{const e=await v.proposeMarriage(t);typeof window.showToast=="function"&&window.showToast(e.narrativeVi||"Kết tóc se duyên thành công!"),await this.refreshData(),await this.renderActiveTab()}catch(e){typeof window.showToast=="function"&&window.showToast(e.message||"Cầu hôn thất bại!",!0)}}async restCohabit(t){try{const e=await v.restAndCohabit(t);typeof window.showToast=="function"&&window.showToast(e.narrativeVi||"Đồng tẩm nghỉ ngơi tĩnh dưỡng thành công!"),await this.refreshData(),await this.renderActiveTab()}catch(e){typeof window.showToast=="function"&&window.showToast(e.message||"Không thể nghỉ ngơi lúc này!",!0)}}async assignRole(t,e){try{await v.assignHouseholdRole(t,e),typeof window.showToast=="function"&&window.showToast("Đã phân công trọng trách nội trạch thành công!"),await this.refreshData()}catch(a){typeof window.showToast=="function"&&window.showToast(a.message||"Lỗi phân công trọng trách!",!0)}}async designateHeir(t){try{await v.designateHeir(t),typeof window.showToast=="function"&&window.showToast("Đã chỉ định đích tử kế vị gia tộc!"),await this.refreshData(),await this.renderActiveTab()}catch(e){typeof window.showToast=="function"&&window.showToast(e.message||"Không thể lập thế tử!",!0)}}async assignMentorDialog(t){const e=prompt("Nhập ID danh sư thụ giáo (ví dụ: NPC-0003 cho Quan Vũ, NPC-0001 cho Lư Thực):","NPC-0003");if(e)try{await v.assignMentor(t,e),typeof window.showToast=="function"&&window.showToast("Đã bái kiến danh sư thụ giáo thành công!"),await this.refreshData(),await this.renderActiveTab()}catch(a){typeof window.showToast=="function"&&window.showToast(a.message||"Lỗi chỉ định danh sư!",!0)}}async executeSuccession(){if(confirm("Bạn có chắc chắn muốn chuyển giao quyền lực sang Thế tử kế thừa không?"))try{const t=await v.executeSuccession();typeof window.showToast=="function"&&window.showToast(t.narrativeVi||"Đại điển kế thừa tông miếu hoàn tất!"),await this.refreshData(),await this.renderActiveTab()}catch(t){typeof window.showToast=="function"&&window.showToast(t.message||"Kế thừa thất bại!",!0)}}}const u=new z,y=class y{static getInstance(){return y.instance||(y.instance=new y),y.instance}async getBanquetStatus(){return l.get("/api/banquet/status")}async drinkWine(){return l.post("/api/banquet/drink",{})}async hostBanquet(t){return l.post("/api/banquet/host",{tierId:t})}async swearBrotherhood(t){return l.post("/api/banquet/brotherhood",{targetNpcId:t})}async getArenaRoster(){return l.get("/api/arena/roster")}async startDuel(t){return l.post("/api/arena/duel/start",{opponentId:t})}async executeDuelRound(t,e){return l.post("/api/arena/duel/round",{duelId:t,action:e})}async restAtResidence(t=1){return l.post("/api/character/rest",{days:t})}};i(y,"instance");let R=y;const p=R.getInstance();class J{constructor(){i(this,"tavernModal");i(this,"arenaModal");i(this,"residenceModal");i(this,"currentDuelId",null);i(this,"currentDuelState",null);i(this,"arenaRoster",[]);this.tavernModal=r({id:"spatial-tavern-modal",title:"Tửu Quán Trác Huyện • Ẩm Tửu & Tụ Nghĩa",subtitle:"Gặp gỡ anh hùng bốn phương, mở tiệc rượu kết giao và chiêu mộ môn khách",seal:"酒",size:"lg",tabs:[{id:"drink",label:"Ẩm Tửu Dưỡng Thần",seal:"🍶"},{id:"banquet",label:"Đại Yến Hào Kiệt",seal:"🍲"},{id:"brotherhood",label:"Kết Bái Huynh Đệ",seal:"🤝"},{id:"recruit",label:"Chiêu Mộ Môn Khách",seal:"🚩"}],activeTabId:"drink",onOpen:async()=>{await this.renderTavernTab()},onTabChange:async()=>{await this.renderTavernTab()}}),this.arenaModal=r({id:"spatial-arena-modal",title:"Lôi Đài Giáo Trường • Luận Kiếm & Diễn Võ",subtitle:"Thao trường luận kiếm danh tướng, giao đấu 1v1 đoạt danh vọng và chiến tích",seal:"武",size:"lg",tabs:[{id:"spar",label:"Luận Kiếm Danh Tướng",seal:"⚔️"},{id:"challenge",label:"Lôi Đài Tam Cấp",seal:"🏆"},{id:"duel",label:"Chiến Báo Quyết Đấu",seal:"⚡"}],activeTabId:"spar",onOpen:async()=>{await this.renderArenaTab()},onTabChange:async()=>{await this.renderArenaTab()}}),this.residenceModal=r({id:"spatial-residence-modal",title:"Tư Trạch Vườn Đào • Dưỡng Thần & Gia Đạo",subtitle:"Trang viên tư gia, tề gia lập thất, nghỉ ngơi phục hồi sinh lực và bồi dưỡng thế hệ",seal:"園",size:"lg",tabs:[{id:"rest",label:"Dưỡng Sinh Nghỉ Ngơi",seal:"🍵"},{id:"family",label:"Gia Đạo & Thê Thiếp",seal:"家"},{id:"study",label:"Thư Trai Điển Tịch",seal:"📜"}],activeTabId:"rest",onOpen:async()=>{await this.renderResidenceTab()},onTabChange:async()=>{await this.renderResidenceTab()}})}async openTavern(t="drink"){await this.tavernModal.open(t)}async closeTavern(){await this.tavernModal.close()}async openArena(t="spar"){await this.arenaModal.open(t)}async closeArena(){await this.arenaModal.close()}async openResidence(t="rest"){await this.residenceModal.open(t)}async closeResidence(){await this.residenceModal.close()}async renderTavernTab(){switch(this.tavernModal.activeTab||"drink"){case"drink":this.tavernModal.setContent(`
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
        `);break;case"banquet":this.tavernModal.setContent(`
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
        `);break;case"brotherhood":this.tavernModal.setContent(`
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
        `);break;case"recruit":this.tavernModal.setContent(`
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
        `);break}}async renderArenaTab(){switch(this.arenaModal.activeTab||"spar"){case"spar":this.arenaModal.setContent(`
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
        `);break;case"challenge":this.arenaModal.setContent(`
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
        `);break;case"duel":this.currentDuelState?this.renderActiveDuelState():this.arenaModal.setContent(`
            <div class="text-center py-10 text-muted">
              Hiện chưa có trận quyết đấu nào diễn ra. Hãy vào mục "Luận Kiếm" để khiêu chiến danh tướng.
            </div>
          `);break}}renderActiveDuelState(){const t=this.currentDuelState;t&&this.arenaModal.setContent(`
      <div class="p-3 bg-slate-950/80 rounded border border-amber-900/40 mb-3">
        <div class="flex justify-between items-center mb-2">
          <div class="font-bold text-amber-200">Hiệp Đấu Thứ ${t.round}</div>
          <div class="badge ${t.isConcluded?"badge-danger":"badge-primary"}">${t.isConcluded?"KẾT THÚC":"ĐANG GIAO ĐẤU"}</div>
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

        ${t.isConcluded?`
          <div class="text-center font-bold text-amber-400 py-2">Kết quả: ${t.outcome||"Đã phân thắng bại"}</div>
        `:`
          <div class="flex gap-2 justify-center">
            <button class="btn btn-xs btn-primary flex-1" onclick="window.SpatialPoiModals.executeDuelRound('ATTACK')">Công Kích</button>
            <button class="btn btn-xs btn-action-ghost flex-1" onclick="window.SpatialPoiModals.executeDuelRound('DEFEND')">Phòng Ngự</button>
            <button class="btn btn-xs btn-action-gold flex-1" onclick="window.SpatialPoiModals.executeDuelRound('SPECIAL_STRIKE')">Tuyệt Kỹ</button>
            <button class="btn btn-xs btn-action-ghost flex-1" onclick="window.SpatialPoiModals.executeDuelRound('FOCUS_SPIRIT')">Tụ Khí</button>
          </div>
        `}
      </div>

      <div class="combat-logs p-2 bg-black/60 rounded text-xs font-mono max-h-40 overflow-y-auto">
        ${t.combatLogs.map(e=>`<div class="mb-1">${e}</div>`).join("")}
      </div>
    `)}async renderResidenceTab(){switch(this.residenceModal.activeTab||"rest"){case"rest":this.residenceModal.setContent(`
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
        `);break;case"family":this.residenceModal.setContent(`
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
        `);break;case"study":this.residenceModal.setContent(`
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
        `);break}}async executeDrinkWine(){try{const t=await p.drinkWine();typeof window.showToast=="function"&&window.showToast(t.narrativeVi||"Ẩm tửu tiêu sầu, thể lực sảng khoái!")}catch(t){typeof window.showToast=="function"&&window.showToast(t.message||"Không thể uống rượu lúc này!",!0)}}async hostBanquet(t){try{const e=await p.hostBanquet(t);typeof window.showToast=="function"&&window.showToast(e.narrativeVi||"Yến tiệc tưng bừng, tân khách hoan hỉ!")}catch(e){typeof window.showToast=="function"&&window.showToast(e.message||"Không đủ ngân lượng hoặc rượu để khai yến!",!0)}}async swearBrotherhood(t){try{const e=await p.swearBrotherhood(t);typeof window.showToast=="function"&&window.showToast(e.narrativeVi||"Đào Viên kết bái thành công!")}catch(e){typeof window.showToast=="function"&&window.showToast(e.message||"Chưa đủ điều kiện kết bái huynh đệ!",!0)}}async startDuel(t){try{const e=await p.startDuel(t);this.currentDuelId=e.duelId,this.currentDuelState=e.state,await this.arenaModal.switchTab("duel")}catch(e){typeof window.showToast=="function"&&window.showToast(e.message||"Lỗi khởi động lôi đài!",!0)}}async executeDuelRound(t){if(this.currentDuelId)try{const e=await p.executeDuelRound(this.currentDuelId,t);this.currentDuelState=e,this.renderActiveDuelState()}catch(e){typeof window.showToast=="function"&&window.showToast(e.message||"Lỗi hiệp đấu!",!0)}}async executeRestAtResidence(){try{const t=await p.restAtResidence(1);typeof window.showToast=="function"&&window.showToast(t.narrativeVi||"Dưỡng sinh nghỉ ngơi hoàn tất, thể lực tràn trề!")}catch(t){typeof window.showToast=="function"&&window.showToast(t.message||"Không thể nghỉ ngơi lúc này!",!0)}}}const h=new J,C=class C{static getInstance(){return C.instance||(C.instance=new C),C.instance}async getOverview(t="PLY-0001"){const e=await l.get("/api/equipment/overview",{characterId:t});return e.overview||e}async equipItem(t,e,a){return l.post("/api/equipment/equip",{characterId:t,slot:e,itemCode:a})}async unequipItem(t,e){return l.post("/api/equipment/unequip",{characterId:t,slot:e})}async forgeBespokeWeapon(t){return l.post("/api/equipment/forge/bespoke",t)}};i(C,"instance");let V=C;const L=V.getInstance();class Z{constructor(){i(this,"modal");i(this,"currentCharacterId","PLY-0001");i(this,"overview",null);this.modal=r({id:"equipment-forge-modal",title:"Vũ Khố & Lò Rèn Thiết Điếm",subtitle:"Quản lý 4 ô chiến bị truyền quốc và đúc rèn thần binh độc bản",seal:"武",size:"xl",tabs:[{id:"gear",label:"Binh Khí & Giáp Trụ",seal:"⚔️"},{id:"forge_bespoke",label:"Đúc Rèn Thần Binh",seal:"🔨"},{id:"inventory",label:"Kho Binh Khí",seal:"📦"}],activeTabId:"gear",onOpen:async()=>{await this.refreshData(),await this.renderActiveTab()},onTabChange:async()=>{await this.renderActiveTab()}})}async open(t="PLY-0001",e="gear"){this.currentCharacterId=t,await this.modal.open(e)}async close(){await this.modal.close()}async refreshData(){try{this.overview=await L.getOverview(this.currentCharacterId)}catch(t){console.error("[EquipmentForgeModal] Error refreshing data:",t)}}async renderActiveTab(){switch(this.modal.activeTab||"gear"){case"gear":this.renderGearTab();break;case"forge_bespoke":this.renderForgeBespokeTab();break;case"inventory":this.renderInventoryTab();break}}renderGearTab(){if(!this.overview)return;const t=this.overview.slots,e=this.overview.effectiveStats||{},a=this.overview.baseStats||{},n=`
      <div class="equipment-modal-content">
        <!-- Lead Banner -->
        <div class="spatial-banner-lead">
          <div class="lead-seal">武</div>
          <div class="lead-text">
            <h3>Chiến Bị Của ${this.overview.characterNameVi||"Lương Diễn"}</h3>
            <div class="text-muted text-sm">Hiệu ứng chiến bị kích hoạt thuộc tính vàng khi vượt ngưỡng 100 điểm.</div>
          </div>
        </div>

        <!-- Effective Attributes Bar -->
        <div class="grid grid-cols-4 gap-2 mb-4 font-mono text-xs text-center bg-slate-950/80 p-2.5 rounded border border-amber-900/40">
          <div>VÕ: <strong class="${(e.war||0)>=100?"text-amber-400 font-bold":"text-red-400"}">${e.war||a.war||50}</strong> <span class="text-muted text-[10px]">(${a.war||50})</span></div>
          <div>THỐNG: <strong class="${(e.ldr||0)>=100?"text-amber-400 font-bold":"text-amber-300"}">${e.ldr||a.ldr||50}</strong> <span class="text-muted text-[10px]">(${a.ldr||50})</span></div>
          <div>TRÍ: <strong class="${(e.int||0)>=100?"text-amber-400 font-bold":"text-blue-400"}">${e.int||a.int||50}</strong> <span class="text-muted text-[10px]">(${a.int||50})</span></div>
          <div>XẢO: <strong class="${(e.cra||0)>=100?"text-amber-400 font-bold":"text-cyan-400"}">${e.cra||a.cra||50}</strong> <span class="text-muted text-[10px]">(${a.cra||50})</span></div>
        </div>

        <!-- 4 Equipment Slots Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${this.renderSlotCard("WEAPON","Binh Khí Tấn Công","⚔️",t.WEAPON)}
          ${this.renderSlotCard("ARMOR","Khôi Giáp Phòng Hộ","🛡️",t.ARMOR)}
          ${this.renderSlotCard("STEED","Chiến Mã Tọa Kỵ","🐎",t.STEED)}
          ${this.renderSlotCard("TREASURE","Bảo Vật & Binh Thư","📜",t.TREASURE)}
        </div>
      </div>
    `;this.modal.setContent(n)}renderSlotCard(t,e,a,n){const o=n&&n.itemCode;return`
      <div class="tactical-card p-3 bg-slate-900/80 rounded border ${o?"border-amber-500/50":"border-slate-800"} flex justify-between items-center">
        <div>
          <div class="text-xs text-muted font-bold flex items-center gap-1">
            <span>${a}</span> ${e}
          </div>
          <div class="font-bold text-sm ${o?"text-amber-200":"text-slate-500"} mt-1">
            ${o?n.nameVi:"Trống (Chưa Trang Bị)"}
          </div>
          ${o&&n.statModifierDesc?`
            <div class="text-[11px] text-green-400 font-mono mt-0.5">${n.statModifierDesc}</div>
          `:""}
        </div>
        <div>
          ${o?`
            <button class="btn btn-xs btn-action-ghost" onclick="window.EquipmentUI.unequip('${this.currentCharacterId}', '${t}')">Tháo Ra</button>
          `:`
            <button class="btn btn-xs btn-primary" onclick="window.EquipmentUI.switchTab('inventory')">Trang Bị</button>
          `}
        </div>
      </div>
    `}renderForgeBespokeTab(){var n,o;const t=((o=(n=this.overview)==null?void 0:n.baseStats)==null?void 0:o.cra)||50,a=`
      <div class="equipment-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">🔨</div>
          <div class="lead-text">
            <h3>Đoán Tạo Thần Binh Tùy Biến (Bespoke Forge)</h3>
            <div class="text-muted text-sm">Chế tác thần binh độc bản khắc tên tướng lĩnh, tiêu hao 25 Thể lực và nguyên liệu luyện tinh.</div>
          </div>
        </div>

        ${t>=50?`
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

            <button class="btn btn-action-gold w-full py-2.5 font-bold" onclick="window.EquipmentUI.executeForge()">
              Khai Lò Đúc Thần Binh
            </button>
          </div>
        `:`
          <div class="text-center py-8 text-muted">
            Cần chỉ số Kỹ Nghệ (CRA) đạt tối thiểu 50 để mở lò rèn thần binh. Hiện tại CRA của bạn: ${t}.
          </div>
        `}
      </div>
    `;this.modal.setContent(a)}renderInventoryTab(){var a;const t=((a=this.overview)==null?void 0:a.inventoryGear)||[],e=`
      <div class="equipment-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">📦</div>
          <div class="lead-text">
            <h3>Kho Khí Giới Trác Huyện</h3>
            <div class="text-muted text-sm">Kho vũ khí, giáp trụ và chiến mã sẵn sàng trang bị cho nhân vật.</div>
          </div>
        </div>

        ${t.length===0?`
          <div class="text-center py-8 text-muted">
            Kho vũ khí hiện không có trang bị nào. Hãy mua từ chợ phiên hoặc chế tác tại Lò Rèn.
          </div>
        `:`
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${t.map(n=>`
              <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                <div>
                  <div class="font-bold text-amber-200 text-sm">${n.nameVi}</div>
                  <div class="text-xs text-muted">Vị trí: ${n.slot} • SL: ${n.quantity}</div>
                </div>
                <button class="btn btn-xs btn-primary" onclick="window.EquipmentUI.equip('${this.currentCharacterId}', '${n.slot}', '${n.itemCode}')">
                  Mặc Vào
                </button>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    `;this.modal.setContent(e)}async equip(t,e,a){try{await L.equipItem(t,e,a),typeof window.showToast=="function"&&window.showToast("Đã trang bị thành công!"),await this.refreshData(),await this.renderActiveTab()}catch(n){typeof window.showToast=="function"&&window.showToast(n.message||"Lỗi trang bị!",!0)}}async unequip(t,e){try{await L.unequipItem(t,e),typeof window.showToast=="function"&&window.showToast("Đã tháo trang bị về kho!"),await this.refreshData(),await this.renderActiveTab()}catch(a){typeof window.showToast=="function"&&window.showToast(a.message||"Lỗi tháo trang bị!",!0)}}async executeForge(){const t=document.getElementById("forge-weapon-name"),e=document.getElementById("forge-weapon-cat"),a=document.getElementById("forge-material-tier"),n=document.getElementById("forge-destination"),o={characterId:this.currentCharacterId,weaponNameVi:(t==null?void 0:t.value)||"Thần Binh Trác Huyện",weaponCategory:(e==null?void 0:e.value)||"BLADE",targetAttr:"war",materialTier:(a==null?void 0:a.value)||"STANDARD",destination:(n==null?void 0:n.value)||"EQUIP"};try{const c=await L.forgeBespokeWeapon(o);typeof window.showToast=="function"&&window.showToast(c.narrativeVi||"Đúc rèn thần binh thành công!"),await this.refreshData(),await this.modal.switchTab("gear")}catch(c){typeof window.showToast=="function"&&window.showToast(c.message||"Đúc rèn thất bại!",!0)}}}const T=new Z,S=class S{static getInstance(){return S.instance||(S.instance=new S),S.instance}async getStatus(t="PLY-0001"){const e=await l.get("/api/enterprise/status",{characterId:t});return e.status||e}async manageSafeCash(t,e,a){return l.post("/api/enterprise/manage-safe-cash",{enterpriseId:t,action:e,amount:a})}async executeLaborShift(t,e){return l.post("/api/enterprise/labor-shift",{shiftType:t,targetEnterpriseId:e})}};i(S,"instance");let K=S;const N=K.getInstance();class tt{constructor(){i(this,"modal");i(this,"enterprises",[]);i(this,"laborOptions",[]);this.modal=r({id:"enterprise-modal",title:"Sản Nghiệp & Phường Xưởng Bách Nghệ",subtitle:"Quản lý xưởng dệt, xưởng rèn, đi làm thuê công nhật tích lũy ngân lượng",seal:"業",size:"xl",tabs:[{id:"owner",label:"Sản Nghiệp Gia Tộc",seal:"🏭"},{id:"work",label:"Đi Làm Thuê Thời Vụ",seal:"工"}],activeTabId:"owner",onOpen:async()=>{await this.refreshData(),await this.renderActiveTab()},onTabChange:async()=>{await this.renderActiveTab()}})}async open(t="owner"){await this.modal.open(t)}async close(){await this.modal.close()}async refreshData(){try{const t=await N.getStatus("PLY-0001");this.enterprises=(t==null?void 0:t.ownedBusinesses)||(t==null?void 0:t.activeEnterprises)||[],this.laborOptions=(t==null?void 0:t.laborOptions)||[]}catch(t){console.error("[EnterpriseWorkshopModal] Error refreshing data:",t)}}async renderActiveTab(){(this.modal.activeTab||"owner")==="owner"?this.renderOwnerTab():this.renderWorkTab()}renderOwnerTab(){const t=`
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
                  <span class="badge badge-success text-xs">${e.status||"VẬN HÀNH"}</span>
                </div>
                <div class="text-xs text-muted mb-3">Địa điểm: ${e.settlement_id} • Thợ xưởng: ${e.worker_count||1}/${e.max_workers||5}</div>

                <div class="bg-slate-950/70 p-2.5 rounded font-mono text-xs mb-3 space-y-1">
                  <div class="flex justify-between">
                    <span class="text-muted">Quỹ An Toàn:</span>
                    <span class="text-amber-400 font-bold">${Number(e.safe_cash||0).toLocaleString()} Tiền</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted">Chi Phí Tháng:</span>
                    <span class="text-red-400 font-bold">${Number(e.monthly_overhead||0).toLocaleString()} Tiền</span>
                  </div>
                </div>

                <div class="flex gap-2">
                  <button class="btn btn-xs btn-primary flex-1" onclick="window.EnterpriseUI.depositSafeCash('${e.enterprise_id}')">Nạp Quỹ</button>
                  <button class="btn btn-xs btn-action-ghost flex-1" onclick="window.EnterpriseUI.withdrawSafeCash('${e.enterprise_id}')">Rút Tiền</button>
                </div>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    `;this.modal.setContent(t)}renderWorkTab(){this.modal.setContent(`
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
            <div class="text-xs text-muted mb-2">Tiêu hao 15 Thể lực • Kiếm 40 Tiền • Tăng EXP Võ/Thống</div>
            <button class="btn btn-xs btn-primary w-full" onclick="window.EnterpriseUI.executeWork('WOODCUT')">Nhận Việc</button>
          </div>
          <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 text-center">
            <h4 class="text-amber-300 font-bold text-sm mb-1">Đan Lát Chiếu Trúc</h4>
            <div class="text-xs text-muted mb-2">Tiêu hao 12 Thể lực • Kiếm 50 Tiền • Tăng EXP Kỹ Nghệ</div>
            <button class="btn btn-xs btn-primary w-full" onclick="window.EnterpriseUI.executeWork('WEAVE_MAT')">Nhận Việc</button>
          </div>
          <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 text-center">
            <h4 class="text-amber-300 font-bold text-sm mb-1">Phụ Lò Rèn Thiết Điếm</h4>
            <div class="text-xs text-muted mb-2">Tiêu hao 20 Thể lực • Kiếm 65 Tiền • Tăng EXP Kỹ Nghệ/Võ</div>
            <button class="btn btn-xs btn-action-gold w-full" onclick="window.EnterpriseUI.executeWork('SMITH_ASSIST')">Nhận Việc</button>
          </div>
        </div>
      </div>
    `)}async depositSafeCash(t){const e=prompt("Nhập số tiền muốn nạp vào quỹ an toàn:","500");if(!e)return;const a=parseInt(e,10);if(!(isNaN(a)||a<=0))try{await N.manageSafeCash(t,"DEPOSIT",a),typeof window.showToast=="function"&&window.showToast("Đã nạp tiền vào Quỹ an toàn!"),await this.refreshData(),await this.renderActiveTab()}catch(n){typeof window.showToast=="function"&&window.showToast(n.message||"Lỗi nạp tiền!",!0)}}async withdrawSafeCash(t){const e=prompt("Nhập số tiền muốn rút từ quỹ an toàn:","500");if(!e)return;const a=parseInt(e,10);if(!(isNaN(a)||a<=0))try{await N.manageSafeCash(t,"WITHDRAW",a),typeof window.showToast=="function"&&window.showToast("Đã rút tiền từ Quỹ an toàn về ngân khố!"),await this.refreshData(),await this.renderActiveTab()}catch(n){typeof window.showToast=="function"&&window.showToast(n.message||"Lỗi rút tiền!",!0)}}async executeWork(t){try{const e=await N.executeLaborShift(t);typeof window.showToast=="function"&&window.showToast(e.narrativeVi||"Lao động hoàn tất, nhận tiền công!"),await this.refreshData(),await this.renderActiveTab()}catch(e){typeof window.showToast=="function"&&window.showToast(e.message||"Không thể làm việc lúc này!",!0)}}}const w=new tt,k=class k{static getInstance(){return k.instance||(k.instance=new k),k.instance}async getCaravans(){return(await l.get("/api/logistics/caravans")).caravans||[]}async getArbitrageOpportunities(){return(await l.get("/api/logistics/market-arbitrage")).routes||[]}async dispatchCaravan(t){return l.post("/api/logistics/dispatch",t)}};i(k,"instance");let q=k;const G=q.getInstance();class et{constructor(){i(this,"modal");i(this,"caravans",[]);i(this,"routes",[]);this.modal=r({id:"caravan-modal",title:"Thương Đoàn Viễn Chinh & Trục Vận Chuyển",subtitle:"Thiết lập tuyến buôn liên châu, kinh doanh chênh lệch giá và thuê hộ tiêu áp tải",seal:"商",size:"xl",tabs:[{id:"active",label:"Thương Đoàn Đang Chạy",seal:"🚛"},{id:"arbitrage",label:"Thương Cơ & Chênh Lệch Giá",seal:"📈"},{id:"dispatch",label:"Xuất Tiêu Khai Tuyến",seal:"🚩"}],activeTabId:"active",onOpen:async()=>{await this.refreshData(),await this.renderActiveTab()},onTabChange:async()=>{await this.renderActiveTab()}})}async open(t="active"){await this.modal.open(t)}async close(){await this.modal.close()}async refreshData(){try{const[t,e]=await Promise.all([G.getCaravans().catch(()=>[]),G.getArbitrageOpportunities().catch(()=>[])]);this.caravans=t,this.routes=e,this.modal.updateTabBadge("active",t.length>0?t.length:void 0)}catch(t){console.error("[CaravanLogisticsModal] Error refreshing data:",t)}}async renderActiveTab(){switch(this.modal.activeTab||"active"){case"active":this.renderActiveTabContent();break;case"arbitrage":this.renderArbitrageTabContent();break;case"dispatch":this.renderDispatchTabContent();break}}renderActiveTabContent(){const t=`
      <div class="caravan-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">🚛</div>
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
                  <span class="badge ${e.status==="IN_TRANSIT"?"badge-primary":"badge-success"} text-xs">${e.status}</span>
                </div>
                <div class="text-xs text-muted mb-2">Từ: ${e.origin_settlement_id} ➔ Đến: ${e.dest_settlement_id}</div>
                <div class="text-xs text-slate-300 font-mono">Thời gian còn lại: ${e.days_remaining}/${e.total_days} ngày • Hộ vệ: ${e.escort_level}</div>
              </div>
            `).join("")}
          </div>
        `}
      </div>
    `;this.modal.setContent(t)}renderArbitrageTabContent(){const t=`
      <div class="caravan-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">📈</div>
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
                  ${e.originNameVi} (${e.buyPrice}đ) ➔ ${e.destNameVi} (${e.sellPrice}đ)
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
    `;this.modal.setContent(t)}renderDispatchTabContent(){this.modal.setContent(`
      <div class="caravan-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">🚩</div>
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
                <option value="MILITIA">Dân Binh Địa Phương (+100 Tiền)</option>
                <option value="MERCENARY">Tiêu Sư Giang Hồ (+300 Tiền, An Toàn 95%)</option>
              </select>
            </div>
          </div>

          <button class="btn btn-action-gold w-full py-2.5 font-bold" onclick="window.CaravanUI.executeDispatch()">
            Xuất Phát Thương Đoàn
          </button>
        </div>
      </div>
    `)}async executeDispatch(){const t=document.getElementById("caravan-dest-id"),e=document.getElementById("caravan-commodity"),a=document.getElementById("caravan-qty"),n=document.getElementById("caravan-escort"),o={originSettlementId:"zhuo_xian",destSettlementId:(t==null?void 0:t.value)||"ye_cheng",commodityCode:(e==null?void 0:e.value)||"PROD-MAT",quantity:parseInt((a==null?void 0:a.value)||"20",10),escortLevel:(n==null?void 0:n.value)||"MILITIA"};try{const c=await G.dispatchCaravan(o);typeof window.showToast=="function"&&window.showToast(c.narrativeVi||"Thương đoàn đã xuất phát!"),await this.refreshData(),await this.modal.switchTab("active")}catch(c){typeof window.showToast=="function"&&window.showToast(c.message||"Lỗi xuất thương đoàn!",!0)}}}const E=new et,$=class ${static getInstance(){return $.instance||($.instance=new $),$.instance}async getProtagonistDossier(){var a;const t=await l.get("/api/status"),e=t.player||{};return{characterId:e.character_id||"PLY-0001",nameVi:e.name_vi||"Lương Diễn",nameEn:e.name_en||"Liang Yan",styleName:e.style_name||"Chí Viễn",age:e.age||20,locationVi:((a=t.settlement)==null?void 0:a.nameVi)||"Trác Huyện",positionVi:e.position_vi||"Thương Gia Tự Do",personality:"PRAGMATIC",motivation:"HEGEMONY",bioVi:"Hậu nhân Lương thị U Châu, thông tuệ thương đạo, ôm chí lớn bình định loạn thế Tam Quốc.",stats:{war:e.war_attr||50,int:e.int_attr||50,ldr:e.ldr_attr||50,pol:e.pol_attr||50,com:e.com_attr||60,dip:e.dip_attr||50,cra:e.cra_attr||55,log:e.log_attr||50},talents:e.talents?typeof e.talents=="string"?JSON.parse(e.talents):e.talents:["THƯƠNG_TRÍ","KỸ_XẢO"]}}async getNpcDossier(t){const e=await l.get("/api/npcs/dossier",{npcId:t});return e.dossier||e}};i($,"instance");let O=$;const Q=O.getInstance();class at{constructor(){i(this,"protagonistModal");i(this,"npcModal");i(this,"currentProtagonist",null);i(this,"currentNpc",null);this.protagonistModal=r({id:"protagonist-dossier-modal",title:"Hồ Sơ Nhân Vật Chính • Lương Diễn (Chí Viễn)",subtitle:"Toàn bộ chỉ số năng lực 8 chiều, danh hiệu và thiên phú bản mệnh",seal:"主",size:"lg",onOpen:async()=>{await this.loadProtagonist()}}),this.npcModal=r({id:"npc-dossier-modal",title:"Hồ Sơ Nhân Vật • Danh Tướng Tam Quốc",subtitle:"Tình báo nhân vật, mức độ thân thiện và bí mật sương mù chiến tranh",seal:"将",size:"lg"})}async openProtagonist(){await this.protagonistModal.open()}async closeProtagonist(){await this.protagonistModal.close()}async openNpc(t){try{this.currentNpc=await Q.getNpcDossier(t),this.npcModal.setTitle(`Hồ Sơ Nhân Vật • ${this.currentNpc.nameVi}`,`Địa điểm: ${this.currentNpc.locationVi||"U Châu"} • Thân phận: ${this.currentNpc.positionVi||"Võ Tướng"}`),this.renderNpcContent(),await this.npcModal.open()}catch(e){console.error("[DossiersModal] Error loading NPC:",e)}}async closeNpc(){await this.npcModal.close()}async loadProtagonist(){try{this.currentProtagonist=await Q.getProtagonistDossier(),this.renderProtagonistContent()}catch(t){console.error("[DossiersModal] Error loading protagonist:",t)}}renderProtagonistContent(){const t=this.currentProtagonist;if(!t)return;const e=t.stats,a=`
      <div class="dossier-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">主</div>
          <div class="lead-text">
            <h3>${t.nameVi} (${t.styleName||"Chí Viễn"}) • Tuổi: ${t.age}</h3>
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
    `;this.protagonistModal.setContent(a)}renderNpcContent(){const t=this.currentNpc;if(!t)return;const e=t.stats||{war:50,int:50,ldr:50,pol:50},a=`
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
          <p class="text-xs text-slate-300 leading-relaxed">${t.bioVi||"Nhân tài hào kiệt uy chấn phương bắc."}</p>
        </div>
      </div>
    `;this.npcModal.setContent(a)}}const I=new at,M=class M{static getInstance(){return M.instance||(M.instance=new M),M.instance}async getCareerRoadmap(t="PLY-0001"){const e=await l.get("/api/progression/career-paths",{characterId:t}).catch(()=>({})),a=[{pathKey:"ARTISAN",titleVi:"Bách Nghệ / Thợ Cả",seal:"🔨",currentTier:2,maxTier:5,tierNameVi:"Thợ Cả Trác Huyện",progressPercent:45,nextMilestoneVi:"Đúc 1 Thần Binh Bách Luyện độc bản",unlockedPerks:["Giảm 15% hao hụt nguyên liệu xưởng"]},{pathKey:"MERCHANT",titleVi:"Hành Thương / Cự Phú",seal:"💰",currentTier:3,maxTier:5,tierNameVi:"Đại Lãnh Tiêu Xa",progressPercent:60,nextMilestoneVi:"Tích lũy ngân khố 20,000 Tiền",unlockedPerks:["Miễn 10% quan thuế trạm gác"]},{pathKey:"MARTIAL",titleVi:"Võ Hiệp / Thống Soái",seal:"⚔️",currentTier:2,maxTier:5,tierNameVi:"Kiêu Dũng Hiệp Khách",progressPercent:30,nextMilestoneVi:"Thắng 3 trận lôi đài giáo trường",unlockedPerks:["Khai mở Tuyệt Kỹ chiến trường"]},{pathKey:"SCHOLAR",titleVi:"Sĩ Đồ / Mưu Sĩ",seal:"📜",currentTier:1,maxTier:5,tierNameVi:"Thư Sinh Áo Vải",progressPercent:20,nextMilestoneVi:"Đạt Hảo Cảm 80 cùng Lư Thực",unlockedPerks:["Mở đàm phán giảm giá tiêu xa"]},{pathKey:"LINEAGE",titleVi:"Tông Tộc / Thế Gia",seal:"🏯",currentTier:1,maxTier:5,tierNameVi:"Hàn Môn Lương Thị",progressPercent:25,nextMilestoneVi:"Thành gia lập thất nạp sính lễ",unlockedPerks:["Khai sáng Phả Hệ Đời 1"]}];return{paths:e.paths||a,milestones:e.milestones||[]}}};i(M,"instance");let U=M;const nt=U.getInstance();class it{constructor(){i(this,"modal");i(this,"paths",[]);i(this,"milestones",[]);this.modal=r({id:"personal-journal-modal",title:"Sổ Tay Cá Nhân & Chí Hướng Cuộc Đời [J]",subtitle:"Theo dõi tiến trình Ngũ Đại Phẩm Lộ, cột mốc huân công và lý tưởng nhân vật",seal:"志",size:"xl",tabs:[{id:"career",label:"Ngũ Đại Phẩm Lộ",seal:"🌟"},{id:"milestones",label:"Cột Mốc Huân Công",seal:"🎖️"}],activeTabId:"career",onOpen:async()=>{await this.refreshData(),await this.renderActiveTab()},onTabChange:async()=>{await this.renderActiveTab()}})}async open(t="career"){await this.modal.open(t)}async close(){await this.modal.close()}async refreshData(){try{const t=await nt.getCareerRoadmap("PLY-0001");this.paths=t.paths,this.milestones=t.milestones}catch(t){console.error("[PersonalJournalModal] Error refreshing data:",t)}}async renderActiveTab(){(this.modal.activeTab||"career")==="career"?this.renderCareerTab():this.renderMilestonesTab()}renderCareerTab(){const t=`
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">志</div>
          <div class="lead-text">
            <h3>Ngũ Đại Phẩm Lộ Tiến Trình</h3>
            <div class="text-muted text-sm">Tự do phát triển theo 5 con đường: Thợ Cả, Đại Thương, Thống Soái, Danh Sĩ, Tông Tộc.</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${this.paths.map(e=>`
            <div class="tactical-card p-3.5 bg-slate-900 rounded border border-slate-800">
              <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-xl">${e.seal}</span>
                  <div>
                    <h4 class="text-amber-200 font-bold m-0 text-sm">${e.titleVi}</h4>
                    <span class="text-xs text-amber-400 font-semibold">${e.tierNameVi} (Bậc ${e.currentTier}/${e.maxTier})</span>
                  </div>
                </div>
                <span class="text-xs font-mono font-bold text-slate-300">${e.progressPercent}%</span>
              </div>

              <!-- Progress Bar -->
              <div class="w-full bg-slate-950 rounded-full h-2 mb-2.5 overflow-hidden border border-slate-700">
                <div class="bg-amber-400 h-2 rounded-full transition-all" style="width: ${e.progressPercent}%"></div>
              </div>

              <div class="text-[11px] text-muted mb-2">
                <strong class="text-slate-300">Cột mốc kế tiếp:</strong> ${e.nextMilestoneVi}
              </div>

              <div class="text-[11px] text-green-400 font-mono bg-slate-950/60 p-1.5 rounded">
                ✦ Đặc quyền: ${e.unlockedPerks.join(", ")}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;this.modal.setContent(t)}renderMilestonesTab(){this.modal.setContent(`
      <div class="journal-modal-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">🎖️</div>
          <div class="lead-text">
            <h3>Cột Mốc Lịch Sử & Huân Công Đã Đạt</h3>
            <div class="text-muted text-sm">Ghi nhận những dấu ấn quan trọng trong hành trình bình định Tam Quốc.</div>
          </div>
        </div>

        <div class="space-y-2">
          <div class="tactical-card p-3 bg-slate-900 rounded border border-amber-500/40 flex justify-between items-center text-xs">
            <div>
              <div class="font-bold text-amber-200">Khởi Đầu Tại Trác Huyện</div>
              <div class="text-muted">Hoàn tất giao dịch quân nhu ban đầu và thiết lập cân bằng sổ cái kép.</div>
            </div>
            <span class="badge badge-success">ĐÃ ĐẠT</span>
          </div>

          <div class="tactical-card p-3 bg-slate-900 rounded border border-slate-800 flex justify-between items-center text-xs">
            <div>
              <div class="font-bold text-slate-300">Đào Viên Tụ Nghĩa</div>
              <div class="text-muted">Gặp gỡ Lưu Bị, Quan Vũ, Trương Phi tại Tửu quán Trác Huyện.</div>
            </div>
            <span class="badge badge-neutral">ĐANG THỰC HIỆN</span>
          </div>
        </div>
      </div>
    `)}}const j=new it;class st{constructor(){i(this,"modal");this.modal=r({id:"grand-command-hub-modal",title:"Đại Bản Doanh • Quân Cơ Xứ",subtitle:"Trung tâm điều hành Lục Đại Trụ Cột Chiến Lược (Quân Trang, Sản Nghiệp, Thương Đoàn, Gia Thất, Diễn Võ, Tụ Nghĩa)",seal:"帥",size:"xl",tabs:[{id:"overview",label:"Tổng Quan Bản Doanh",seal:"帥"},{id:"gear",label:"Quân Trang & Lò Rèn",seal:"武"},{id:"enterprise",label:"Sản Nghiệp & Xưởng",seal:"業"},{id:"caravan",label:"Thương Đoàn & Tiêu Xa",seal:"商"},{id:"family",label:"Gia Thất & Dòng Tộc",seal:"家"},{id:"duel",label:"Diễn Võ & Lôi Đài",seal:"演"},{id:"banquet",label:"Tụ Nghĩa & Yến Tiệc",seal:"義"}],activeTabId:"overview",onOpen:async()=>{await this.renderActiveTab()},onTabChange:async t=>{await this.handleTabSwitch(t)}})}async open(t="overview"){t==="career"&&(t="overview"),await this.modal.open(t)}async close(){await this.modal.close()}async handleTabSwitch(t){t==="gear"?(await this.modal.close(),await T.open("PLY-0001","gear")):t==="enterprise"?(await this.modal.close(),await w.open("owner")):t==="caravan"?(await this.modal.close(),await E.open("active")):t==="family"?(await this.modal.close(),await u.open("courtship")):t==="duel"?(await this.modal.close(),await h.openArena("spar")):t==="banquet"?(await this.modal.close(),await h.openTavern("drink")):await this.renderOverviewTab()}async renderActiveTab(){await this.renderOverviewTab()}async renderOverviewTab(){this.modal.setContent(`
      <div class="grand-hub-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">帥</div>
          <div class="lead-text">
            <h3>Tổng Quan Lục Đại Trụ Cột Chiến Lược</h3>
            <div class="text-muted text-sm">Chọn một trụ cột để đi sâu vào hệ thống quản lý chuyên biệt.</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 hover:border-amber-400 cursor-pointer transition-all"
               onclick="window.GrandCommandHubUI.open('gear')">
            <div class="text-2xl mb-2">武</div>
            <h4 class="text-amber-200 font-bold mb-1">Quân Trang & Lò Rèn</h4>
            <div class="text-xs text-muted">Trang bị vũ khí, giáp trụ, chiến mã và đúc thần binh độc bản.</div>
          </div>

          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 hover:border-amber-400 cursor-pointer transition-all"
               onclick="window.GrandCommandHubUI.open('enterprise')">
            <div class="text-2xl mb-2">業</div>
            <h4 class="text-amber-200 font-bold mb-1">Sản Nghiệp & Xưởng Nghề</h4>
            <div class="text-xs text-muted">Quản lý xưởng dệt, xưởng rèn và làm thuê công nhật.</div>
          </div>

          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 hover:border-amber-400 cursor-pointer transition-all"
               onclick="window.GrandCommandHubUI.open('caravan')">
            <div class="text-2xl mb-2">商</div>
            <h4 class="text-amber-200 font-bold mb-1">Thương Đoàn & Tiêu Xa</h4>
            <div class="text-xs text-muted">Vận chuyển liên thành, kinh doanh chênh lệch giá và thuê hộ tiêu.</div>
          </div>

          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 hover:border-amber-400 cursor-pointer transition-all"
               onclick="window.GrandCommandHubUI.open('family')">
            <div class="text-2xl mb-2">家</div>
            <h4 class="text-amber-200 font-bold mb-1">Gia Thất & Dòng Tộc</h4>
            <div class="text-xs text-muted">Cầu hôn giai nhân, bồi dưỡng thế tử và thừa kế tông miếu.</div>
          </div>

          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 hover:border-amber-400 cursor-pointer transition-all"
               onclick="window.GrandCommandHubUI.open('duel')">
            <div class="text-2xl mb-2">演</div>
            <h4 class="text-amber-200 font-bold mb-1">Diễn Võ & Lôi Đài</h4>
            <div class="text-xs text-muted">Luận kiếm cùng Quan Vũ, Trương Phi và quyết đấu 1v1.</div>
          </div>

          <div class="tactical-card p-4 bg-slate-900 rounded border border-slate-800 hover:border-amber-400 cursor-pointer transition-all"
               onclick="window.GrandCommandHubUI.open('banquet')">
            <div class="text-2xl mb-2">義</div>
            <h4 class="text-amber-200 font-bold mb-1">Tụ Nghĩa & Yến Tiệc</h4>
            <div class="text-xs text-muted">Ẩm tửu dưỡng thần, đại yến hào kiệt và kết bái huynh đệ.</div>
          </div>
        </div>
      </div>
    `)}}const W=new st;class ot{constructor(){i(this,"modal");i(this,"currentMode","BUY");i(this,"currentItemCode","COM-GRAIN");i(this,"currentPrice",50);this.modal=r({id:"standard-trade-modal",title:"Giao Dịch Hàng Hóa Chợ Phiên",subtitle:"Thực thi giao thương hàng hóa, cân bằng sổ cái kép kế toán ACID",seal:"貿",size:"sm"})}async open(t,e,a=1,n=50){this.currentMode=t,this.currentItemCode=e,this.currentPrice=n,this.modal.setTitle(t==="BUY"?"Thu Mua Vật Phẩm":"Xuất Bán Hàng Hóa",`Mã vật phẩm: ${e} • Đơn giá hiện tại: ${n} Tiền`,t==="BUY"?"買":"賣"),this.renderForm(a),await this.modal.open()}async close(){await this.modal.close()}renderForm(t){const e=`
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
          <label class="block text-xs font-bold text-slate-300 mb-1">Đơn Giá Đơn Vị (Tiền):</label>
          <input type="number" id="quick-trade-price" class="modal-input w-full" value="${this.currentPrice}" readonly />
        </div>
        <div class="bg-slate-950 p-2.5 rounded flex justify-between items-center text-xs font-mono">
          <span class="text-muted">Tổng Giá Trị:</span>
          <span class="text-amber-400 font-bold text-sm" id="quick-trade-total">${(t*this.currentPrice).toLocaleString()} Tiền</span>
        </div>
        <button class="btn btn-action-gold w-full py-2 font-bold mt-2" onclick="window.QuickTradeModal.submit()">
          Xác Nhận ${this.currentMode==="BUY"?"Thu Mua":"Bán Hàng"}
        </button>
      </div>
    `;this.modal.setContent(e)}updateTotal(){const t=document.getElementById("quick-trade-qty"),e=document.getElementById("quick-trade-total");if(!t||!e)return;const a=parseFloat(t.value)||0;e.textContent=`${(a*this.currentPrice).toLocaleString()} Tiền`}async submit(){const t=document.getElementById("quick-trade-qty"),e=parseFloat((t==null?void 0:t.value)||"1");if(isNaN(e)||e<=0)return;const a=this.currentMode==="BUY"?"TRADE_BUY":"TRADE_SELL";try{const n=await l.post("/api/action",{action:a,item:this.currentItemCode,qty:e,price:this.currentPrice});typeof window.showToast=="function"&&window.showToast(n.message||"Giao dịch thành công!"),await this.modal.close(),typeof window.refreshGameStatus=="function"&&window.refreshGameStatus()}catch(n){typeof window.showToast=="function"&&window.showToast(n.message||"Giao dịch thất bại!",!0)}}}const D=new ot;class lt{constructor(){i(this,"modal");i(this,"currentDuelId",null);i(this,"duelState",null);this.modal=r({id:"tactical-battle-modal",title:"Quyết Đấu Sa Trường • Đơn Đả Độc Đấu 1v1",subtitle:"Tương tác chiến thuật 4 lệnh (Công Kích, Phòng Ngự, Tuyệt Kỹ, Tụ Khí)",seal:"斗",size:"lg"})}async startDuel(t){try{const e=await p.startDuel(t);this.currentDuelId=e.duelId,this.duelState=e.state,this.renderDuel(),await this.modal.open()}catch(e){typeof window.showToast=="function"&&window.showToast(e.message||"Lỗi khởi động giao đấu!",!0)}}async close(){await this.modal.close()}renderDuel(){const t=this.duelState;if(!t)return;const e=`
      <div class="tactical-battle-content">
        <div class="p-3 bg-slate-950/80 rounded border border-amber-900/40 mb-3">
          <div class="flex justify-between items-center mb-3">
            <span class="font-bold text-amber-200">Hiệp Đấu Thứ ${t.round}</span>
            <span class="badge ${t.isConcluded?"badge-danger":"badge-primary"}">${t.isConcluded?"TRẬN ĐẤU KẾT THÚC":"ĐANG ĐỐI ĐẦU"}</span>
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

          ${t.isConcluded?`
            <div class="text-center font-bold text-amber-300 py-2">
              ${t.outcome||"Quyết đấu hoàn tất!"}
            </div>
          `:`
            <div class="grid grid-cols-4 gap-2">
              <button class="btn btn-xs btn-primary" onclick="window.TacticalBattleUI.executeAction('ATTACK')">Công Kích</button>
              <button class="btn btn-xs btn-action-ghost" onclick="window.TacticalBattleUI.executeAction('DEFEND')">Phòng Ngự</button>
              <button class="btn btn-xs btn-action-gold" onclick="window.TacticalBattleUI.executeAction('SPECIAL_STRIKE')">Tuyệt Kỹ</button>
              <button class="btn btn-xs btn-action-ghost" onclick="window.TacticalBattleUI.executeAction('FOCUS_SPIRIT')">Tụ Khí</button>
            </div>
          `}
        </div>

        <div class="bg-black/60 p-3 rounded text-xs font-mono max-h-48 overflow-y-auto space-y-1">
          ${t.combatLogs.map(a=>`<div>${a}</div>`).join("")}
        </div>
      </div>
    `;this.modal.setContent(e)}async executeAction(t){if(this.currentDuelId)try{this.duelState=await p.executeDuelRound(this.currentDuelId,t),this.renderDuel()}catch(e){typeof window.showToast=="function"&&window.showToast(e.message||"Lỗi hiệp đấu!",!0)}}}const _=new lt;class dt{constructor(){i(this,"modal");i(this,"selectedScenario","184_YELLOW_TURBAN");this.modal=r({id:"title-screen-modal",title:"Tam Quốc Diễn Nghĩa • Khởi Tạo Niên Đại & Nhân Vật",subtitle:"Chọn niên đại lịch sử và thiết lập danh tính nhân vật chính",seal:"國",size:"lg",onOpen:async()=>{this.renderContent()}})}async open(){await this.modal.open()}async close(){await this.modal.close()}renderContent(){const t=`
      <div class="title-screen-content">
        <div class="spatial-banner-lead">
          <div class="lead-seal">國</div>
          <div class="lead-text">
            <h3>Chọn Khởi Điểm Chiến Dịch</h3>
            <div class="text-muted text-sm">Mỗi niên đại có cục diện chư hầu, kinh tế và thế lực hoàn toàn khác biệt.</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div class="tactical-card p-3 bg-slate-900 rounded border ${this.selectedScenario==="184_YELLOW_TURBAN"?"border-amber-400 bg-amber-950/20":"border-slate-800"} cursor-pointer"
               onclick="window.TitleScreenUI.selectScenario('184_YELLOW_TURBAN')">
            <h4 class="text-amber-200 font-bold text-sm mb-1">184 SCN: Khởi Nghĩa Khăn Vàng</h4>
            <div class="text-xs text-muted">Trương Giác dấy binh, triều đình suy vi, anh hùng thảo mộc bắt đầu khởi nghiệp.</div>
          </div>

          <div class="tactical-card p-3 bg-slate-900 rounded border ${this.selectedScenario==="190_DONG_ZHUO"?"border-amber-400 bg-amber-950/20":"border-slate-800"} cursor-pointer"
               onclick="window.TitleScreenUI.selectScenario('190_DONG_ZHUO')">
            <h4 class="text-amber-200 font-bold text-sm mb-1">190 SCN: Thảo Phạt Đổng Trác</h4>
            <div class="text-xs text-muted">Mười tám lộ chư hầu hội minh Quan Đông, Lạc Dương biển lửa.</div>
          </div>

          <div class="tactical-card p-3 bg-slate-900 rounded border ${this.selectedScenario==="200_GUANDU"?"border-amber-400 bg-amber-950/20":"border-slate-800"} cursor-pointer"
               onclick="window.TitleScreenUI.selectScenario('200_GUANDU')">
            <h4 class="text-amber-200 font-bold text-sm mb-1">200 SCN: Quan Độ Chi Chiến</h4>
            <div class="text-xs text-muted">Tào Tháo đối đầu Viên Thiệu tranh đoạt bá chủ phương bắc.</div>
          </div>

          <div class="tactical-card p-3 bg-slate-900 rounded border ${this.selectedScenario==="208_CHIBI"?"border-amber-400 bg-amber-950/20":"border-slate-800"} cursor-pointer"
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
          <button class="btn btn-action-gold w-full py-2.5 font-bold" onclick="window.TitleScreenUI.startCampaign()">
            Khởi Sự Chiến Dịch Lịch Sử
          </button>
        </div>
      </div>
    `;this.modal.setContent(t)}selectScenario(t){this.selectedScenario=t,this.renderContent()}async startCampaign(){const t=document.getElementById("ts-player-name"),e=document.getElementById("ts-player-style");try{await l.post("/api/session/new-game",{scenario:this.selectedScenario,playerName:(t==null?void 0:t.value)||"Lương Diễn",playerStyle:(e==null?void 0:e.value)||"Chí Viễn"}),typeof window.showToast=="function"&&window.showToast("Khởi tạo chiến dịch thành công!"),await this.modal.close(),window.location.reload()}catch(a){typeof window.showToast=="function"&&window.showToast(a.message||"Lỗi khởi tạo chiến dịch!",!0)}}}const A=new dt;class rt{constructor(){i(this,"travelModal");i(this,"turnModal");this.travelModal=r({id:"travel-transit-modal",title:"Lộ Trình Viễn Chinh • Dặm Trường Phong Vân",subtitle:"Hành quân liên châu, khảo sát địa hình và ứng biến trước hiểm họa dọc đường",seal:"行",size:"md"}),this.turnModal=r({id:"turn-advance-modal",title:"Tuế Nguyệt Lưu Chuyển • Quyết Toán Nguyệt Kỳ",subtitle:"Thời gian tiến tới 1 tháng, kết toán tài chính, nông vụ và dòng dõi gia tộc",seal:"歲",size:"md"})}async showTravelTransit(t,e,a,n){this.travelModal.setTitle("Hành Trình Viễn Chinh",`Từ ${t} ➔ Đến ${e} (${a} ngày đường)`),this.travelModal.setContent(`
      <div class="travel-transit-body p-2 space-y-3">
        <div class="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono">
          ${n||"<div>Xe ngựa lăn bánh trên quan đạo phương bắc... An toàn đến nơi!</div>"}
        </div>
        <button class="btn btn-primary w-full py-2 font-bold" onclick="window.TravelTransitUI.close()">
          Nhập Thành
        </button>
      </div>
    `),await this.travelModal.open()}async closeTravel(){await this.travelModal.close()}async showTurnAdvance(t,e,a){this.turnModal.setTitle(`Quyết Toán Lượt Thứ ${t}`,`Thời gian: ${e} • Thiên thời địa lợi`),this.turnModal.setContent(`
      <div class="turn-advance-body p-2 space-y-3">
        <div class="p-3 bg-slate-950 rounded border border-slate-800 text-xs font-mono space-y-1">
          ${a||`
            <div class="text-green-400">✦ Hoàn tất chu kỳ sản xuất hàng tháng của các xưởng.</div>
            <div class="text-amber-300">✦ Kết toán sổ cái kép thu chi tài chính.</div>
            <div class="text-blue-300">✦ Cập nhật tiến độ thai kỳ và bồi dưỡng thế hệ gia tộc.</div>
          `}
        </div>
        <button class="btn btn-action-gold w-full py-2 font-bold" onclick="window.TurnAdvanceUI.close()">
          Tiếp Tục Mô Phỏng
        </button>
      </div>
    `),await this.turnModal.open()}async closeTurn(){await this.turnModal.close()}}const H=new rt;class ct{constructor(){i(this,"modal");this.modal=r({id:"world-map-modal",title:"Dư Đồ Tam Quốc • Khởi Nghĩa Khăn Vàng (184 SCN)",subtitle:"Khảo sát 24 châu quận, phân bố thế lực chư hầu và dịch trạm liên thành",seal:"圖",size:"xl"})}async open(){typeof window.renderWorldMap=="function"?(await this.modal.open(),window.renderWorldMap()):await this.modal.open()}async close(){await this.modal.close()}}const Y=new ct;function ht(){if(typeof window>"u")return;const d=window;d.ModalShellCore={createModalShell:r,modalStack:g},d.LineageFamilyUI={open:t=>u.open(t),close:()=>u.close(),setFilter:t=>u.setFilter(t),proposeMarriage:t=>u.proposeMarriage(t),restCohabit:t=>u.restCohabit(t),assignRole:(t,e)=>u.assignRole(t,e),designateHeir:t=>u.designateHeir(t),assignMentorDialog:t=>u.assignMentorDialog(t),executeSuccession:()=>u.executeSuccession()},d.SpatialPoiModals={openTavernModal:t=>h.openTavern(t),closeTavernModal:()=>h.closeTavern(),openArenaModal:t=>h.openArena(t),closeArenaModal:()=>h.closeArena(),openResidenceModal:t=>h.openResidence(t),closeResidenceModal:()=>h.closeResidence(),executeDrinkWine:()=>h.executeDrinkWine(),hostBanquet:t=>h.hostBanquet(t),swearBrotherhood:t=>h.swearBrotherhood(t),startDuel:t=>h.startDuel(t),executeDuelRound:t=>h.executeDuelRound(t),executeRestAtResidence:()=>h.executeRestAtResidence()},d.EquipmentUI={openEquipmentModal:(t,e)=>T.open(t,e),closeEquipmentModal:()=>T.close(),switchTab:t=>T.modal.switchTab(t),equip:(t,e,a)=>T.equip(t,e,a),unequip:(t,e)=>T.unequip(t,e),executeForge:()=>T.executeForge()},d.EnterpriseUI={openEnterpriseModal:t=>w.open(t),closeEnterpriseModal:()=>w.close(),depositSafeCash:t=>w.depositSafeCash(t),withdrawSafeCash:t=>w.withdrawSafeCash(t),executeWork:t=>w.executeWork(t)},d.CaravanUI={openCaravanModal:t=>E.open(t),closeCaravanModal:()=>E.close(),executeDispatch:()=>E.executeDispatch()},d.ProtagonistDossierModal={open:()=>I.openProtagonist(),close:()=>I.closeProtagonist()},d.NpcDossierModal={open:t=>I.openNpc(t),close:()=>I.closeNpc()},d.PersonalJournalUI={open:t=>j.open(t),close:()=>j.close()},d.GrandCommandHubUI={open:t=>W.open(t),close:()=>W.close()},d.QuickTradeModal={open:(t,e,a,n)=>D.open(t,e,a,n),close:()=>D.close(),updateTotal:()=>D.updateTotal(),submit:()=>D.submit()},d.TacticalBattleUI={startDuel:t=>_.startDuel(t),close:()=>_.close(),executeAction:t=>_.executeAction(t)},d.TitleScreenUI={open:()=>A.open(),close:()=>A.close(),selectScenario:t=>A.selectScenario(t),startCampaign:()=>A.startCampaign()},d.TravelTransitUI={show:(t,e,a,n)=>H.showTravelTransit(t,e,a,n),close:()=>H.closeTravel()},d.TurnAdvanceUI={show:(t,e,a)=>H.showTurnAdvance(t,e,a),close:()=>H.closeTurn()},d.WorldMapUI={open:()=>Y.open(),close:()=>Y.close()},console.log("[ThreeKingdoms-AgentEngine] All 14 client feature slices successfully bridged to window.*")}class ut{constructor(){i(this,"handlers",new Map)}on(t,e){return this.handlers.has(t)||this.handlers.set(t,new Set),this.handlers.get(t).add(e),()=>{this.off(t,e)}}off(t,e){const a=this.handlers.get(t);a&&(a.delete(e),a.size===0&&this.handlers.delete(t))}emit(t,e){const a=this.handlers.get(t);a&&a.forEach(n=>{try{n(e)}catch(o){console.error(`[EventBus] Error handling event ${t}:`,o)}})}}const bt=new ut;return ht(),s.CaravanLogisticsModal=et,s.CaravanLogisticsService=q,s.ClientApiClient=P,s.DossiersModal=at,s.DossiersService=O,s.EnterpriseWorkshopModal=tt,s.EnterpriseWorkshopService=K,s.EquipmentForgeModal=Z,s.EquipmentForgeService=V,s.GrandCommandHubModal=st,s.LineageFamilyModal=z,s.LineageFamilyService=B,s.ModalShell=X,s.PersonalJournalModal=it,s.PersonalJournalService=U,s.QuickTradeModal=ot,s.SpatialPoiModalsManager=J,s.SpatialPoiService=R,s.TacticalBattleModal=lt,s.TitleScreenModal=dt,s.TransitTurnModals=rt,s.WorldMapModal=ct,s.apiClient=l,s.caravanLogisticsModal=E,s.caravanLogisticsService=G,s.createModalShell=r,s.dossiersModal=I,s.dossiersService=Q,s.enterpriseWorkshopModal=w,s.enterpriseWorkshopService=N,s.equipmentForgeModal=T,s.equipmentForgeService=L,s.eventBus=bt,s.grandCommandHubModal=W,s.lineageFamilyModal=u,s.lineageFamilyService=v,s.modalStack=g,s.personalJournalModal=j,s.personalJournalService=nt,s.quickTradeModal=D,s.spatialPoiModals=h,s.spatialPoiService=p,s.tacticalBattleModal=_,s.titleScreenModal=A,s.transitTurnModals=H,s.worldMapModal=Y,Object.defineProperty(s,Symbol.toStringTag,{value:"Module"}),s}({});
//# sourceMappingURL=client-bundle.iife.js.map
