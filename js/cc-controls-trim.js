/* ══ CARD CONTROLS: WHERE IT WORKS AND CATEGORIES ONLY, FOR NOW (product owner, 12 Nov 2026) ═════════════════════
   "in control for now hide the limit section … remove countries allowed, countries blocked, merchant codes … in any
   profile, in control remove all the limits data".
   - Every Controls view (a card's panel, a card request, the cardholder's own card, the control tables and summaries)
     shows Channels, International Use and the Allowed / Blocked Categories only - no limit, country or merchant code.
   - The change form (Change Card Controls / Set Starting Controls) offers Where It Works (Channels, International Use)
     and Categories, then the dates and the reason. Values already recorded for the hidden controls are kept as they
     are: the form neither shows nor changes them. */
(function(){
  /* The presentation (the product on the published site and the local link); the standard test mode keeps them. */
  if(!/[?&]env=presentation/.test(location.search))return;
  const HIDE=['Per Transaction','Daily','Monthly','Annual','Merchant Codes Allowed','Merchant Codes Blocked','Countries Allowed','Countries Blocked'];
  if(typeof CC_CTL_FIELDS!=='undefined')for(let i=CC_CTL_FIELDS.length-1;i>=0;i--)if(HIDE.indexOf(CC_CTL_FIELDS[i][0])>=0)CC_CTL_FIELDS.splice(i,1);
  const live=function(a){return (a||[]).filter(function(x){return typeof CC_NONE==='undefined'||x!==CC_NONE;});};
  if(typeof ccCtlSummary==='function'){
    ccCtlSummary=function(s){
      if(!s)return 'Not set';
      const ch=(typeof CC_CHANNELS!=='undefined'?CC_CHANNELS:[]).filter(function(c){return s.channels&&s.channels[c];});
      const parts=[ch.length?ch.join('/'):'No channel','International '+(s.international==='Restrict'?'restricted':'allowed')];
      if(live(s.allowedCats).length)parts.push('Allowed: '+live(s.allowedCats).join(', '));
      if(live(s.blockedCats).length)parts.push('Blocked: '+live(s.blockedCats).join(', '));
      return parts.join(' · ');
    };
  }
  if(typeof ccCtlInlineHTML==='function'){
    ccCtlInlineHTML=function(){
      const x=ccCtlFormParts(),f=x.fld;
      const sec=function(t,h,top){return '<div class="lp-sb-view-header"'+(top?'':' style="margin-top:14px"')+'><span class="lp-sb-section-title">'+t+'</span></div><div class="ep-form-grid">'+h+'</div>';};
      return sec('Where It Works',f.channels+f.intl,true)+sec('Categories',f.ac+f.bc)
        +(ccCtlForm.scope==='request'?sec('Reason',f.reason):sec('Effective Dates &amp; Reason',f.from+f.to+f.reason))
        +'<div class="lp-sb-form-actions"><button class="ep-cancel-btn" onclick="ccCtlFormClose()">Cancel</button><button class="ep-save-btn" id="cctf-save" onclick="ccCtlSave()">'+x.save+'</button></div>';
    };
  }
  if(typeof ccCtlFormHTML==='function'){
    ccCtlFormHTML=function(){
      const x=ccCtlFormParts(),f=x.fld;
      const body='<div class="ep-form-grid">'+f.from+f.to+f.channels+f.intl+f.ac+f.bc+f.reason+'</div>';
      return bgModal(x.title,x.sub,body,{close:'ccCtlFormClose()',btns:'<button class="ep-save-btn" id="cctf-save" onclick="ccCtlSave()">'+x.save+'</button>'});
    };
  }
  /* The "no controls" lines no longer speak of limits. */
  const unlimit=function(h){return String(h).replace(/The card follows the programme, which has no limits\./g,'The card follows the programme.').replace(/The card will follow the programme, which has no limits\./g,'The card will follow the programme.');};
  ['ccCardControlsViewHTML','ccReqControlsHTML'].forEach(function(n){
    const f=window[n];if(typeof f!=='function')return;
    window[n]=function(){return unlimit(f.apply(this,arguments));};
  });
})();
