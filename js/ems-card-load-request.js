/* ══ CARD LOAD IN THE NEW REQUEST FORM (product owner, 12 Nov 2026) ══════════════════════════════════════════════
   Expenses & Advances → + → Category: Card Load. Offered to an employee who holds an Active card. The form stays the same
   New Request form - Claim For, Employee, Employee Id, Employee Email and Category at the top - and only the fields below
   change: the card (filled in), the wallet - every wallet on the card except Corporate Expense (Meal, Fuel, Gift,
   Telecom …; product owner: "remove corporate expense option, rest keep all the options as wallet") - the amount, the
   reason and an optional document. Submit Request raises an ordinary card load on the card-load approval route; admins
   see it at the top of Corporate Cards → Requests & Loads, approve it in its Logs and load it from its Load tab, and the
   amount is added to that wallet's balance. A load to a benefit wallet asked this way is a top-up on request: it goes
   through the card-load route rather than a benefit allocation. */
function emsLoadReqCard(){
  const me=typeof ccEmpOf==='function'?ccEmpOf():null;if(!me)return null;
  return ccCardsOfEmp(me.eid).find(function(c){return c.entity===ccEnt()&&ccCardUsable(c);})||null;
}
function emsLoadReqWallets(c){return (typeof ccCardWallets==='function'?ccCardWallets(c):[]).filter(function(w){return w!=='CORP';});}
function emsLoadReqOn(){const c=emsLoadReqCard();return !!c&&emsLoadReqWallets(c).length>0;}
const EMS_LOAD_BTNS='<button class="ep-cancel-btn" onclick="cancelAddExpense()">Cancel</button><button class="ep-save-btn" onclick="emsLoadSubmit()">Submit Request</button>';
function emsLoadIsOn(){return typeof expModalOpen!=='undefined'&&expModalOpen&&!!expDraft&&!!expDraft.cardLoad;}
function emsLoadSync(){
  if(!emsLoadIsOn())return;
  const f=expDraft.load||(expDraft.load={wallet:'',amount:'',reason:'',doc:''});
  const a=document.getElementById('elr-amount'),r=document.getElementById('elr-reason');
  if(a)f.amount=a.value;if(r)f.reason=r.value;
  const c=emsLoadReqCard();
  if(document.getElementById('csw-elr-wallet')&&c){const v=getCSValue('elr-wallet');f.wallet=emsLoadReqWallets(c).find(function(x){return wbTypeName(x)===v;})||'';}
}
function emsLoadHook(){emsLoadSync();}
function emsLoadPickDoc(input){
  const f=input.files&&input.files[0];input.value='';if(!f)return;
  if(f.size>5*1024*1024){showToast('File is over 5 MB','error',f.name);return;}
  if(typeof expSyncBasic==='function')expSyncBasic();emsLoadSync();expDraft.load.doc=f.name;expRepaintForm();
}
function emsLoadClearDoc(){if(typeof expSyncBasic==='function')expSyncBasic();emsLoadSync();expDraft.load.doc='';expRepaintForm();}
/* The fields under Category, for a card load. */
function emsLoadFieldsHTML(){
  const f=expDraft.load||(expDraft.load={wallet:'',amount:'',reason:'',doc:''}),c=emsLoadReqCard(),me=typeof ccEmpOf==='function'?ccEmpOf():null;
  if(!c)return '<div class="ep-form-group ep-form-full"><div class="wb-empty-sm">A card load is requested on your own Active card.</div></div>';
  if(expDraft.claimFor==='Others'||(me&&expDraft.eid&&expDraft.eid!==me.eid))return '<div class="ep-form-group ep-form-full"><div class="wb-empty-sm">A card load is requested for yourself, on your own card: set Claim For to Self.</div></div>';
  const p=ccProg(c.programmeId),cur=p?p.currency:'INR',ws=emsLoadReqWallets(c);
  return '<div class="ep-form-group"><label class="ep-form-label">Card</label><input class="ep-form-input ca-ro" readonly value="'+attrSafe(ccMask(c.last4)+' · '+expKey(c)+' · '+(p?p.name:''))+'"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Wallet <span class="req">*</span></label>'+apCS('elr-wallet',ws.map(wbTypeName),f.wallet?wbTypeName(f.wallet):'','Select wallet','emsLoadHook')+'</div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Amount <span class="req">*</span></label><div class="ax-currency"><span>'+ccE(cur)+'</span><input class="ep-form-input" id="elr-amount" inputmode="decimal" placeholder="0" value="'+attrSafe(f.amount)+'"></div></div>'
    +'<div class="ep-form-group"></div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Reason <span class="req">*</span></label><textarea class="ep-form-input ax-notes" id="elr-reason" placeholder="What the money is for">'+ccE(f.reason)+'</textarea></div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Supporting Document <span class="exp-opt">(Optional)</span></label>'
      +(f.doc?'<div class="ax-img-row">'+EXP_ICO.clip+'<span class="ax-img-name">'+ccE(f.doc)+'</span><button type="button" class="att-link" onclick="emsLoadClearDoc()">Remove</button></div>'
        :'<label class="att-zone ax-img-zone"><input type="file" accept="image/png,image/jpeg,application/pdf" hidden onchange="emsLoadPickDoc(this)"><span class="att-zone-ico">'+AX_ICO.upload+'</span><span><span class="att-zone-title">Click to upload</span><span class="att-zone-hint"> · receipt, quote or approval mail</span></span></label>')+'</div>';
}
function emsLoadSubmit(){
  if(typeof expSyncBasic==='function')expSyncBasic();emsLoadSync();
  const f=expDraft.load||{},c=emsLoadReqCard(),me=typeof ccEmpOf==='function'?ccEmpOf():null;
  if(!c){showToast('Not sent','error','A card load is requested on your own Active card.');return;}
  if(expDraft.claimFor==='Others'||(me&&expDraft.eid&&expDraft.eid!==me.eid)){showToast('Not sent','error','A card load is requested for yourself: set Claim For to Self.');return;}
  if(!f.wallet){showToast('Not sent','error','Pick the wallet to load.');return;}
  const amt=String(f.amount||'').replace(/,/g,'').trim(),reason=String(f.reason||'').trim();
  if(!(Number(amt)>0)){showToast('Not sent','error','Enter the amount (more than zero).');return;}
  if(reason.length<5){showToast('Not sent','error','Give the reason (at least 5 characters).');return;}
  const res=emsLoadReqCreate(c,f.wallet,amt,reason,f.doc);
  if(res.error){showToast('Not sent','error',res.error);return;}
  expModalOpen=false;expDraft=null;renderADTPage();
  const l=res.rec,st=caActiveStage(l);
  showToast('Load requested','success',expKey(l)+' · '+expMoney(l.amount,l.currency)+' on '+wbTypeName(l.wallet)+(st?' is with Stage '+st.n+' · '+caNs(st.approvers):' is '+ccLoadLabel(l))+'.');
}
/* An ordinary card load for the cardholder's own card, raised as a draft and submitted to the card-load route. */
function emsLoadReqCreate(c,wallet,amount,reason,doc){
  const p=ccProg(c.programmeId),fund=ccProgFunding(p),A=ccNow();
  let out;ccRqlSelf=A.who;
  try{
    const res=ccLoadCreate({cardId:c.id,wallet:wallet,amount:amount,currency:p.currency,sourceId:fund.sourceId||'',reason:reason,
      comments:'Requested by the cardholder from Expenses & Advances.',doc:doc||''},false,A);
    if(res.error)out={error:res.error};
    else{
      const l=res.rec;
      if(l.benefit){l.benefit=false;l.topUp=true;}   // a top-up on request, not a benefit allocation
      const e=ccLoadSubmit(l.id,A);
      if(e){const i=ccLoads.indexOf(l);if(i>=0)ccLoads.splice(i,1);if(c.logs&&c.logs[0]&&String(c.logs[0].action||'').indexOf(expKey(l))>=0)c.logs.shift();out={error:e};}
      else{l.selfRequest={by:A.who,from:'Expenses & Advances'};ccLog(l,l.status,'Requested by the cardholder, '+caN(A.who)+', from Expenses & Advances.',A);out={rec:l};}
    }
  }finally{ccRqlSelf=null;}
  return out;
}
(function(){
  /* The category list: Card Load for an employee who holds an Active card. */
  if(typeof emsReqCats==='function'){
    const c0=emsReqCats;
    emsReqCats=function(){const o=c0.apply(this,arguments);if(emsLoadReqOn()&&o.indexOf('Card Load')<0)o.push('Card Load');return o;};
  }
  /* Picking Card Load keeps the same form: the top stays, the fields below change. */
  if(typeof emsReqCatPick==='function'){
    const p0=emsReqCatPick;
    emsReqCatPick=function(){
      const v=getCSValue('ems-req-cat');
      if(v==='Card Load'){
        if(typeof expModalOpen!=='undefined'&&expModalOpen&&expDraft){expSyncBasic();expDraft.cardLoad=true;expDraft.load=expDraft.load||{wallet:'',amount:'',reason:'',doc:''};expRepaintForm();return;}
        if(typeof advForm!=='undefined'&&advForm&&advForm.id==null){
          if(typeof advFormSync==='function')advFormSync();
          const who={claimFor:advForm.claimFor,eid:advForm.eid};advForm=null;startAddExpense();
          if(expDraft){expDraft.cardLoad=true;expDraft.load={wallet:'',amount:'',reason:'',doc:''};if(who.claimFor==='Others'){expDraft.claimFor='Others';expDraft.eid=who.eid||'';}}
          renderADTPage();return;
        }
        return;
      }
      if(v==='Expense Claim'&&emsLoadIsOn()){expSyncBasic();expDraft.cardLoad=false;expRepaintForm();return;}
      if(v==='Advance'&&emsLoadIsOn())expDraft.cardLoad=false;
      return p0.apply(this,arguments);
    };
  }
  /* The form: for a card load, the top of the claim form up to Category, then the card load's own fields. */
  if(typeof buildAddExpenseModalHTML==='function'){
    const m0=buildAddExpenseModalHTML;
    buildAddExpenseModalHTML=function(){
      if(!emsLoadIsOn())return m0.apply(this,arguments);
      /* The same form as the claim (title, note, top fields): only the fields under Category and the buttons change. */
      const top=expBasicFieldsHTML(),at=top.indexOf('<div class="ep-form-group"><label class="ep-form-label">Category');
      const head=at>=0?top.slice(0,at):top;
      const tmp=document.createElement('div');tmp.innerHTML=m0.apply(this,arguments);
      const grid=tmp.querySelector('#exp-m-claim'),items=tmp.querySelector('#exp-m-items'),btns=tmp.querySelector('.ct-modal-foot .ct-modal-btns');
      if(grid)grid.innerHTML=head+emsReqCatField('Card Load')+'<div class="ep-form-group"></div>'+emsLoadFieldsHTML();
      if(items)items.innerHTML='';
      if(btns)btns.innerHTML=EMS_LOAD_BTNS;
      return tmp.innerHTML;
    };
  }
  /* The form repaints only its fields; the buttons follow the category too (claim buttons or Submit Request). */
  if(typeof expRepaintForm==='function'){
    const f0=expRepaintForm;
    expRepaintForm=function(){
      f0.apply(this,arguments);
      if(typeof expModalOpen==='undefined'||!expModalOpen||!expDraft)return;
      const live=document.querySelector('.ct-modal--form .ct-modal-foot .ct-modal-btns');if(!live)return;
      const tmp=document.createElement('div');tmp.innerHTML=buildAddExpenseModalHTML();
      const next=tmp.querySelector('.ct-modal-foot .ct-modal-btns');
      if(next&&live.innerHTML!==next.innerHTML)live.innerHTML=next.innerHTML;
    };
  }
  /* A cardholder's own request may load a benefit wallet on request (the card-load route authorizes it); a requested
     top-up stays one when it is re-checked at approval and execution. */
  if(typeof ccLoadCheck==='function'){
    const k0=ccLoadCheck;
    ccLoadCheck=function(d,o){
      const out=k0.apply(this,arguments);
      const l=o&&o.exceptId!=null?ccLoad(o.exceptId):null;
      if((ccRqlSelf||(l&&l.topUp))&&out&&out.errors)out.errors=out.errors.filter(function(e){return !/is a benefit wallet: it is loaded only from an approved/.test(e);});
      return out;
    };
  }
})();
