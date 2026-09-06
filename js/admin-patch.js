// js/admin-patch.js — إصلاحات توافقية (بيصلح الملف القديم تلقائياً)
(function(){
  // 1) إضافة عنصر sidebarOverlay لو مش موجود (يصلح خطأ classList)
  if(!document.getElementById('sidebarOverlay')){
    const o=document.createElement('div');
    o.id='sidebarOverlay'; o.className='sidebar-overlay';
    document.body.insertBefore(o, document.body.firstChild);
  }

  // 2) تعريف دوال طلبات التسجيل لو مش موجودة في data-service القديمة
  if(window.DataService){
    const db=()=>DataService._getData();
    const save=d=>DataService._saveData(d);
    const fb=()=> (window.FirebaseService && window.FirebaseService.connected);

    if(typeof DataService.getPendingRegistrations!=='function')
      DataService.getPendingRegistrations=()=> (db().pendingRegistrations||[]);

    if(typeof DataService.getPendingRegistrationById!=='function')
      DataService.getPendingRegistrationById=(id)=> (db().pendingRegistrations||[]).find(r=>r.id===id);

    if(typeof DataService.addPendingRegistration!=='function')
      DataService.addPendingRegistration=async(data)=>{
        const d=db(); d.pendingRegistrations=d.pendingRegistrations||[];
        const id='preg_'+Date.now()+'_'+Math.random().toString(36).slice(2,5);
        const req=Object.assign({id,status:'pending',createdAt:new Date().toISOString(),tempCode:'TMP-'+Math.floor(1000+Math.random()*9000)},data);
        d.pendingRegistrations.push(req); save(d);
        if(fb())FirebaseService.saveDoc('pendingRegistrations',id,req);
        return req;
      };

    if(typeof DataService.approvePendingRegistration!=='function')
      DataService.approvePendingRegistration=async(id,by)=>{
        const d=db(); const req=(d.pendingRegistrations||[]).find(r=>r.id===id); if(!req)return{success:false};
        const code='EDU-'+Math.floor(1000+Math.random()*9000);
        const user={id:'u_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),role:'student',status:'active',code,
          studentId:'STU-'+Date.now().toString().slice(-4),name:req.name,phone:req.phone,parentPhone:req.parentPhone,
          email:req.email||'',stage:req.stage,grade:req.grade,password:req.password||'12345678',
          parentAccess:String(Math.floor(1000+Math.random()*9000)),createdAt:new Date().toISOString()};
        d.users=d.users||[]; d.users.push(user);
        d.enrollments=d.enrollments||[];
        (req.groupIds||[]).forEach(gid=>{const g=(d.groups||[]).find(x=>x.id===gid);
          d.enrollments.push({id:'enr_'+Date.now()+'_'+Math.random().toString(36).slice(2,5),studentId:user.id,groupId:gid,teacherId:(g&&g.teacherId)||'',status:'active'});});
        req.status='approved'; req.approvedBy=by; req.finalCode=code; req.approvedAt=new Date().toISOString();
        save(d);
        if(fb()){FirebaseService.saveDoc('pendingRegistrations',id,req);FirebaseService.saveDoc('users',user.id,user);}
        return{success:true,user:user,code:code};
      };

    if(typeof DataService.rejectPendingRegistration!=='function')
      DataService.rejectPendingRegistration=async(id,reason,by)=>{
        const d=db(); const req=(d.pendingRegistrations||[]).find(r=>r.id===id); if(!req)return{success:false};
        req.status='rejected'; req.rejectReason=reason||''; req.rejectedBy=by;
        save(d); if(fb())FirebaseService.saveDoc('pendingRegistrations',id,req);
        return{success:true};
      };

    if(typeof DataService.deletePendingRegistration!=='function')
      DataService.deletePendingRegistration=async(id)=>{
        const d=db(); d.pendingRegistrations=(d.pendingRegistrations||[]).filter(r=>r.id!==id);
        save(d); if(fb())FirebaseService.deleteDoc('pendingRegistrations',id);
      };
  }
})();