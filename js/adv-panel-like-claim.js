/* ══ AN ADVANCE'S PANEL READS LIKE A CLAIM'S (product owner, 15 Nov 2026) ═══════════════════════════════════════════
   "why in its action button it is different from others, in the action button, and tabs, make it like all the other"
   Expenses & Advances → an advance's ☰: the same tabs as an expense claim - Basic Details · Attachments · Bank Details
   · Logs · History · Workflow - in place of Basic Details · Approval · Disbursement · Settlement · Logs · History ·
   Workflow, and Basic Details opens with the fields, as a claim does (no policy-check, budget-check and planned
   sub category boxes on top).
   Display only: the approval, the disbursement and the settlement are not changed - they are decided from the row's
   Action button and written to Logs, as before; a link that opens one of the removed tabs lands on Logs (as a
   claim's Approval and Reimbursement tabs already do).
   In the presentation. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  if(typeof renderAdvPanel!=='function')return;
  const GONE=['approval','disbursement','settlement'],MINE=['attachments','bank'];
  const esc=function(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  function attachmentsHTML(r){
    const head='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Supporting Document</span><span class="wb-muted">'+(r.proof?'1 file':'No file')+'</span></div>';
    if(!r.proof)return head+'<div class="wb-empty-sm">No document was attached to this advance.</div>';
    const clip=typeof EXP_ICO!=='undefined'&&EXP_ICO.clip?EXP_ICO.clip:'';
    const name=r.proofUrl?'<a class="att-link" href="'+esc(r.proofUrl)+'" target="_blank" rel="noopener">'+esc(r.proof)+'</a>':'<span class="ax-img-name">'+esc(r.proof)+'</span>';
    return head+'<div class="att-table-wrap csag-table-wrap"><table class="att-table csag-table"><thead><tr><th>Sr. No</th><th>Document</th><th>Attachment</th></tr></thead><tbody>'
      +'<tr><td class="csag-td csag-num">1</td><td class="csag-td"><div class="lp-c-main">'+esc(r.title||'Advance')+'</div></td><td class="csag-td"><div class="ax-img-row">'+clip+name+'</div></td></tr></tbody></table></div>';
  }
  const p0=renderAdvPanel;
  renderAdvPanel=function(r){
    if(GONE.indexOf(advTab)>=0)advTab='logs';
    const want=advTab,custom=MINE.indexOf(want)>=0;
    let out;
    if(custom){advTab='basic-details';try{out=p0.apply(this,arguments);}finally{advTab=want;}}
    else out=p0.apply(this,arguments);
    const box=document.createElement('div');box.innerHTML=out;
    const row=box.querySelector('.lp-isb-tabs');if(!row)return out;
    const btns=Array.prototype.slice.call(row.querySelectorAll('.lp-isb-tab'));
    const idOf=function(b){const m=/advNav\('([^']+)'\)/.exec(b.getAttribute('onclick')||'');return m?m[1]:'';};
    btns.forEach(function(b){if(GONE.indexOf(idOf(b))>=0)b.remove();});
    const basic=btns.find(function(b){return idOf(b)==='basic-details';});
    if(basic){
      let after=basic;
      [['attachments','Attachments'],['bank','Bank Details']].forEach(function(t){
        const b=document.createElement('button');b.className='lp-isb-tab';b.setAttribute('onclick',"advNav('"+t[0]+"')");b.textContent=t[1];
        after.insertAdjacentElement('afterend',b);after=b;
      });
    }
    row.querySelectorAll('.lp-isb-tab').forEach(function(b){b.classList.toggle('active',idOf(b)===want);});
    const body=box.querySelector('.lp-isb-body');
    if(body&&custom){
      const hero=body.firstElementChild,keep=hero?hero.outerHTML:'';
      body.innerHTML=keep+(want==='bank'?(typeof expBankHTML==='function'?expBankHTML(r):''):attachmentsHTML(r));
    }else if(body&&want==='basic-details'){
      /* The checks recorded at submission stay in Logs; the page opens with the fields, like a claim. */
      body.querySelectorAll('.wb-note.is-data').forEach(function(n){n.remove();});
      body.querySelectorAll('.lp-sb-view-header').forEach(function(h){
        const t=h.querySelector('.lp-sb-section-title');
        if(t&&t.textContent.trim()==='Budget'&&h.querySelectorAll('button').length===0)h.remove();
      });
    }
    return box.innerHTML;
  };
})();
