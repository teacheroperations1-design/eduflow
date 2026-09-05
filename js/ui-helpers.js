// js/ui-helpers.js — أدوات مشتركة لكل الصفحات
const UI = {
  // بحث داخل أي قائمة منسدلة
  attachSearch(sel){
    if(!sel||sel.dataset.searchable)return; sel.dataset.searchable='1';
    const wrap=document.createElement('div');wrap.className='search-bar';wrap.style.marginBottom='6px';
    const inp=document.createElement('input');inp.className='form-input';inp.placeholder='🔍 بحث...';
    wrap.appendChild(inp);sel.parentNode.insertBefore(wrap,sel);
    inp.addEventListener('input',()=>{const q=inp.value.toLowerCase();[...sel.options].forEach(o=>{o.style.display=(!q||o.text.toLowerCase().includes(q))?'':'none';});});
  },

  // ===== اختيار الوقت (select) بـ :00/:15/:30/:45 + AM/PM =====
  _pad(n){return (n<10?'0':'')+n;},
  timeLabel(hhmm){
    if(!hhmm)return '';
    const [h,m]=hhmm.split(':').map(Number);
    const period=h<12?'ص':'م';
    const note=h<12?'(بالنهار)':'(بعد الظهر)';
    let h12=h%12; if(h12===0)h12=12;
    return `${h12}:${this._pad(m)} ${period} ${note}`;
  },
  buildTimeOptions(selected){
    let html='';
    for(let h=0;h<24;h++){
      for(const m of [0,15,30,45]){
        const val=this._pad(h)+':'+this._pad(m);
        html+=`<option value="${val}" ${val===selected?'selected':''}>${this.timeLabel(val)}</option>`;
      }
    }
    return html;
  },
  timeSelect(id, selected, label){
    return `<div class="form-group"><label>${label||'الوقت'}</label><select id="${id}" class="form-select">${this.buildTimeOptions(selected)}</select></div>`;
  },

  // ===== صور Google Drive (تتعرض في المكان بدون سيرفر) =====
  driveId(url){
    if(!url)return null;
    let m=url.match(/\/d\/([a-zA-Z0-9_-]+)/)||url.match(/[?&]id=([a-zA-Z0-9_-]+)/)||url.match(/^([a-zA-Z0-9_-]{20,})$/);
    return m?m[1]:null;
  },
  driveImg(url, alt){
    const id=this.driveId(url);
    if(!id)return `<img src="${url}" alt="${alt||''}" style="max-width:100%;border-radius:10px;">`;
    return `<img src="https://drive.google.com/thumbnail?id=${id}&sz=w1600" alt="${alt||''}" style="max-width:100%;border-radius:10px;" onerror="this.src='${url}'">`;
  },
  driveLink(url){
    const id=this.driveId(url);
    return id?`https://drive.google.com/file/d/${id}/view`:url;
  },

  money(n){return (n||0)+' '+(EduFlowConfig.billing?.currency||'ج.م');},

  // ===== تسوية مبسّطة =====
  settlement(groupId, month){
    const g=DataService.getGroups().find(x=>x.id===groupId); if(!g)return null;
    const students=DataService.getStudentsByGroup(groupId);
    const cancelled=DataService.getCancelledSessions().filter(c=>c.groupId===groupId&&c.date?.startsWith(month)).length;
    const held=Math.max(0,(g.sessionsPerMonth||4)-cancelled);
    const pays=DataService.getPayments().filter(p=>p.month===month&&students.some(s=>s.id===p.studentId));
    const collected=pays.reduce((s,p)=>s+(p.paidAmount||0),0);
    const perStudent=g.monthlyFee||0;
    const teacherShare=g.teacherSharePerStudent||0;
    const teacherDue=Math.round(teacherShare*students.length*(held/(g.sessionsPerMonth||4)));
    return {
      group:g, students, cancelled, held, collected, perStudent, teacherShare, teacherDue,
      centerNet: collected-teacherDue,
      paidList: students.map(s=>{const p=pays.find(x=>x.studentId===s.id);return {student:s, paid:p?.paidAmount||0, due:Math.round(perStudent*(held/(g.sessionsPerMonth||4)))};})
    };
  }
};
window.UI = UI;