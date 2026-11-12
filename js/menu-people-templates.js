/* ══ NO RBAC MENU: TEMPLATES UNDER PEOPLE (product owner, 12 Nov 2026) ═══════════════════════════════════════════════
   "remove workspace from company admin completely, and remove RBAC itself, take the template under teams in the side
   bar". In a client company (Nova Retail) the menu has no RBAC group: People reads Employees · Teams · Templates, and
   Workspaces is the Super Admin's only (after Templates); the Company Admin neither sees nor opens Workspaces. The
   screens themselves are unchanged. In the presentation; the platform company keeps its menu. */
(function(){
  if(!/[?&]env=presentation/.test(location.search))return;
  const client=function(){return typeof emsClientOnly==='function'&&emsClientOnly();};
  const isSA=function(){return typeof emsRole==='function'&&emsRole()==='Super Admin';};
  if(typeof window.getSidebarItems==='function'){
    const g0=window.getSidebarItems;
    window.getSidebarItems=function(){
      const out=g0.apply(this,arguments);if(!client())return out;
      let tpl=null,ws=null;const res=[];
      out.forEach(function(g){
        if(g.dropdown==='RBAC'){(g.children||[]).forEach(function(c){if(c.id==='rbac-templates')tpl=c;if(c.id==='rbac-workspaces')ws=c;});return;}
        if(g.id==='rbac-templates'){tpl=g;return;}
        if(g.id==='rbac-workspaces'){ws=g;return;}
        res.push(g);
      });
      const i=res.findIndex(function(g){return g.dropdown==='People';});
      if(i>=0&&(tpl||ws)){
        const kids=(res[i].children||[]).slice(),at=kids.findIndex(function(c){return c.id==='teams';}),add=[];
        if(tpl)add.push(Object.assign({},tpl,{label:'Templates'}));
        if(ws&&isSA())add.push(Object.assign({},ws,{label:'Workspaces'}));
        Array.prototype.splice.apply(kids,[at<0?kids.length:at+1,0].concat(add));
        res[i]=Object.assign({},res[i],{children:kids});
      }
      return res;
    };
  }
  if(typeof appPagePermitted==='function'){
    const p0=appPagePermitted;
    appPagePermitted=function(pg){
      const building=typeof presBuilding!=='undefined'&&presBuilding;   // Nova's own set-up fills its workspace teams
      if(pg==='rbac-workspaces'&&!building&&client()&&!isSA())return false;
      return p0.apply(this,arguments);
    };
  }
  /* No RBAC in the menu, so the page is just Templates. */
  if(typeof getPageTitle==='function'){
    const t0=getPageTitle;
    getPageTitle=function(pg){if(pg==='rbac-templates'&&client())return 'Templates';return t0.apply(this,arguments);};
  }
})();
