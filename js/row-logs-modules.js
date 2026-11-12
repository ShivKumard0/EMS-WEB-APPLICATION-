/* ══ ROW LOGS - the listings that use it ════════════════════════════════════
   One rlRegister per listing (js/row-logs.js explains the mechanism). Each
   entry only points at what the module already has: its records, the moves
   its own Logs form offers, its save, and its panel. Nothing here decides a
   move the module would not. Configs only look modules up when used, so this
   loads before some of them (wallet-benefits, capping-limit, expense approvals). */
(function(){
'use strict';
function find(arr,id){return (arr||[]).find(function(x){return String(x.id)===String(id);})||null;}
function minus(list,cur){return (list||[]).filter(function(v){return v!==cur;});}
function len(a){return (a||[]).length;}
/* Open the panel, then its Logs tab. */
function logsVia(open,nav){return function(id){open(id);if(nav)nav('logs');};}
var ACTIVE=['Active','Inactive'];

// ── Workforce ──
rlRegister('teams',{pre:'tm',
  rec:function(id){return find(teamsData,id);},
  status:function(r){return r.status||'Active';},
  moves:function(r){return minus(ACTIVE,r.status||'Active');},
  save:function(id){tmSaveLog(id);},
  count:function(r){return len(tmLogsData[r.id]);},
  open:function(id){openTmSidebar(id);},
  logs:logsVia(function(id){openTmSidebar(id);},function(t){navTmTab(t);}),
  sub:function(r){return r.name+(r.teamId?' &middot; '+r.teamId:'');}});

// ── Time & Pay ──
rlRegister('all-leaves',{pre:'al',
  rec:function(id){return find(allLeavesData,id);},
  status:function(r){return r.status;},
  /* The moves the leave's own Logs form offers this person (RBAC, pages.js alMovesFor). */
  moves:function(r){return minus(alMovesFor(r),r.status);},
  label:function(v){return AL_MOVE_LABEL[v]||v;},
  save:function(id){alSaveLog(id);},
  count:function(r){return len(alLogsData[r.id]);},
  open:function(id){openAlSidebar(id);},
  logs:function(id,to){openAlSidebar(id,'logs',to||'');},
  sub:function(r){return (r.keyId?r.keyId+' &middot; ':'')+r.name;}});
rlRegister('leave-policies',{pre:'lp',
  rec:function(id){return find(leavePoliciesData,id);},
  status:function(r){return r.status||'Active';},
  moves:function(r){return minus(ACTIVE,r.status||'Active');},
  save:function(id){lpSaveLog(id);},
  count:function(r){return len(lpLogsData[r.id]);},
  open:function(id){openLPSidebar(id);},
  logs:function(id){openLPSidebar(id);lpSidebarTab='logs';if(typeof refreshLPSidebar==='function')refreshLPSidebar();},
  sub:function(r){return r.type||r.name||'Leave policy';}});
rlRegister('holidays',{pre:'hd',
  rec:function(id){return find(holidaysData,id);},
  status:function(r){return r.status;},
  moves:function(r){return minus(ACTIVE,r.status);},
  save:function(id){hdSaveLog(id);},
  count:function(r){return len(r.logs);},
  open:function(id){openHdSidebar(id);},
  logs:function(id){openHdSidebar(id,'logs');},
  sub:function(r){return r.name+(r.date&&typeof cdLabel==='function'?' &middot; '+cdLabel(r.date):'');}});
rlRegister('payheads',{pre:'ph',
  rec:function(id){return find(payheadsData,id);},
  status:function(r){return r.status;},
  moves:function(r){return minus(ACTIVE,r.status);},
  save:function(id){phSaveLog(id);},
  count:function(r){return len(r.logs);},
  open:function(id){openPhSidebar(id);},
  logs:function(id){openPhSidebar(id,'logs');},
  sub:function(r){return r.name+(r.category?' &middot; '+r.category:'');}});
/* Payments walk the invoice flow one step at a time. Marking Paid records a
   payment (amount, reference, date) - fields only the Logs tab has. */
rlRegister('payments',{pre:'pm',
  rec:function(id){return find(paymentsData,id);},
  status:function(r){return r.invoiceStatus;},
  moves:function(r){var i=pmInvoiceFlow.indexOf(r.invoiceStatus);return i<0?[]:pmInvoiceFlow.slice(i+1);},
  save:function(id){pmSaveLog(id);},
  count:function(r){return len(pmLogsData[r.id]);},
  needsPanel:function(r,v){return v==='Paid';},
  open:function(id){openPmSidebar(id);},
  logs:function(id,to){openPmSidebar(id,'logs',to||'');},
  sub:function(r){return 'Order '+r.orderId+' &middot; '+r.name;}});
rlRegister('expenses',{pre:'exp',recordLabel:'Expense',
  rec:function(id){return expRec(Number(id));},
  status:function(r){return r.status;},
  moves:function(r){return expMoves(r);},
  label:function(v){return EXP_MOVE_LABELS[v]||v;},
  /* A claim cannot be submitted with nothing in it; expSaveLog refuses, so
     the popup does not offer it either. */
  save:function(id){expSaveLog(Number(id));},
  count:function(r){return len(r.logs);},
  open:function(id){openExpSidebar(Number(id));},
  logs:function(id){expLogScope='expense';openExpSidebar(Number(id),'logs');},
  sub:function(r){return expKey(r)+' &middot; '+r.name;},
  /* Each line item carries its own status: picked first, then moved. */
  parts:{label:'Line Item',sel:'exp-llog-status-sel',comment:'exp-llog-comment-inp',
    list:function(r){return r.lines;},
    name:function(l){return l.title+' · '+expMoney(l.amount);},
    status:function(l){return l.status;},
    moves:function(l){var r=expensesData.find(function(x){return x.lines.indexOf(l)>=0;});return caLineMoves(r,l);},
    count:function(l){return len(l.logs);},
    save:function(id,lineId){var r=expRec(Number(id));if(r){var l=r.lines.find(function(x){return x.id===lineId;});if(l)expSeedLineLogs(r,l);}expSaveLineLog(Number(id),lineId);}}});
rlRegister('capping-limit',{pre:'cap',
  rec:function(id){return capRec(Number(id));},
  status:function(r){return capShown(r);},
  moves:function(r){return capCan('expense.policy.activate')?(CAP_MOVES[r.status]||[]):[];},
  label:function(v){return CAP_MOVE_LABELS[v]||v;},
  save:function(id){capSaveLog(Number(id));},
  count:function(r){return len(r.logs);},
  open:function(id){openCapSidebar(Number(id));},
  logs:function(id){openCapSidebar(Number(id),'logs');},
  sub:function(r){return capKey(r)+' &middot; '+r.name;}});

// ── Governance ──
rlRegister('rbac-templates',{pre:'rb',
  rec:function(id){return rbRec(Number(id));},
  status:function(r){return r.status;},
  moves:function(r){return rbMoves(r);},
  label:function(v){return RB_MOVE_LABELS[v]||v;},
  save:function(id){rbSaveLog(Number(id));},
  count:function(r){return len(r.logs);},
  open:function(id){openRbSidebar(Number(id));},
  logs:function(id){openRbSidebar(Number(id),'logs');},
  sub:function(r){return rbKey(r)+' &middot; '+r.name;}});
rlRegister('rbac-workspaces',{pre:'ws',
  rec:function(id){return wsRec(Number(id));},
  status:function(r){return r.status;},
  moves:function(r){return wsMoves(r);},
  label:function(v){return WS_MOVE_LABELS[v]||v;},
  save:function(id){wsSaveLog(Number(id));},
  count:function(r){return len(r.logs);},
  open:function(id){openWsSidebar(Number(id));},
  logs:function(id){openWsSidebar(Number(id),'logs');},
  sub:function(r){return wsKey(r)+' &middot; '+r.name;}});
rlRegister('compliance',{pre:'cmp',
  rec:function(id){return find(complianceItemsData,id);},
  status:function(r){return r.status;},
  moves:function(r){return minus(ACTIVE,r.status);},
  save:function(id){complianceSaveLog(id);},
  count:function(r){return len(complianceLogsData[r.id]);},
  open:function(id){openComplianceSidebar(id);},
  logs:logsVia(function(id){openComplianceSidebar(id);},function(t){navComplianceTab(t);}),
  sub:function(r){return (r.country?r.country+' &middot; ':'')+(r.name||r.requirement||r.item||'Compliance item');}});
rlRegister('oca',{pre:'oca',rowPrefix:'oca',
  rec:function(id){return find(ocaItems,id);},
  status:function(r){return r.status;},
  moves:function(r){return OCA_MOVES[r.status]||[];},
  save:function(id){ocaSaveLog(id);},
  count:function(r){return len(r.logs);},
  open:function(id){openOcaSidebar(id);},
  logs:logsVia(function(id){openOcaSidebar(id);},function(t){navOcaTab(t);}),
  sub:function(r){return (r.owner||r.employee||'')+(r.document?' &middot; '+r.document:'');}});
rlRegister('rates-rules',{pre:'rr',
  rec:function(id){return find(ratesRulesData,id);},
  status:function(r){return r.status;},
  moves:function(r){return minus(ACTIVE,r.status);},
  save:function(id){ratesRuleSaveLog(id);},
  count:function(r){return len(ratesRulesLogsData[r.id]);},
  open:function(id){openRatesRuleSidebar(id);},
  logs:logsVia(function(id){openRatesRuleSidebar(id);},function(t){navRatesRuleTab(t);}),
  sub:function(r){return (r.country?r.country+' &middot; ':'')+(r.ruleName||r.name||'Rule');}});
rlRegister('contract-templates',{pre:'ctp',
  rec:function(id){return find(contractTemplatesData,id);},
  status:function(r){return r.status;},
  moves:function(r){return minus(ACTIVE,r.status);},
  save:function(id){ctpSaveLog(id);},
  count:function(r){return len(ctpLogsData[r.id]);},
  open:function(id){openCtpSidebar(id);},
  logs:logsVia(function(id){openCtpSidebar(id);},function(t){navCtpTab(t);}),
  sub:function(r){return (r.templateId?r.templateId+' &middot; ':'')+(r.templateName||r.name||'Template');}});
rlRegister('announcements',{pre:'anm',
  rec:function(id){return anmRec(Number(id));},
  status:function(r){return r.status;},
  moves:function(r){return minus(ACTIVE,r.status);},
  save:function(id){anmSaveLog(Number(id));},
  count:function(r){return len(r.logs);},
  open:function(id){openAnmSidebar(Number(id));},
  logs:function(id){openAnmSidebar(Number(id),'logs');},
  sub:function(r){return r.title||'Announcement';}});
/* Assigning an asset needs the employee it goes to - a field the Logs tab has. */
rlRegister('asset-allocation',{pre:'ast',
  rec:function(id){return find(assetsData,id);},
  status:function(r){return r.status;},
  moves:function(r){return minus(AST_STATUSES,r.status);},
  save:function(id){astSaveLog(Number(id));},
  count:function(r){return len(r.logs);},
  needsPanel:function(r,v){return v==='Assigned';},
  open:function(id){openAstSidebar(Number(id));},
  logs:function(id){openAstSidebar(Number(id),'logs');},
  sub:function(r){return (r.code?r.code+' &middot; ':'')+(r.name||'Asset');}});
rlRegister('it-access',{pre:'ita',
  rec:function(id){return find(itAccessData,id);},
  status:function(r){return r.status;},
  moves:function(r){return minus(ITA_STATUSES,r.status);},
  save:function(id){itaSaveLog(Number(id));},
  count:function(r){return len(r.logs);},
  open:function(id){openItaSidebar(Number(id));},
  logs:function(id){openItaSidebar(Number(id),'logs');},
  sub:function(r){return (r.assignedTo||'Unassigned')+(r.system?' &middot; '+r.system:'');}});

// ── Support ──
/* Tickets and chats move by named steps ("Start work → In Progress"); the
   value is the step, the status it lands on comes from the flow. A ticket
   step that needs an assignee or a "waiting on" lives in the Logs tab. */
function tkMove(r,label){return tkMoves(r).find(function(m){return tkMoveLabel(m)===label;})||null;}
rlRegister('support-tickets',{pre:'tk',
  rec:function(id){return find(ticketsData,id);},
  status:function(r){return tkStatusLabel(r.status);},
  moves:function(r){return tkMoves(r).map(tkMoveLabel);},
  target:function(r,v){var m=tkMove(r,v);return m?tkStatusLabel(m.to):'';},
  needsPanel:function(r,v){var m=tkMove(r,v);return !!(m&&m.needs&&m.needs.length);},
  save:function(id){tkSaveLog(id);},
  count:function(r){return len(r.logs);},
  open:function(id){openTkSidebar(id);},
  logs:function(id){openTkSidebar(id,'logs');},
  sub:function(r){return (r.ticketId||'Ticket')+(r.clientName?' &middot; '+r.clientName:'')+(r.title?' &middot; '+r.title:'');}});
function chatMove(r,label){return chatMoves(r).find(function(m){return chatMoveLabel(m)===label;})||null;}
rlRegister('chats',{pre:'chat',
  rec:function(id){return find(chatsData,id);},
  status:function(r){return chatStatusLabel(r.status);},
  moves:function(r){return chatMoves(r).map(chatMoveLabel);},
  target:function(r,v){var m=chatMove(r,v);return m?chatStatusLabel(m.to):'';},
  save:function(id){chatSaveLog(id);},
  count:function(r){return len(r.logs);},
  open:function(id){openChatSidebar(id);},
  logs:function(id){openChatSidebar(id,'logs');},
  sub:function(r){return (r.chatId||'Chat')+(r.client||r.clientName?' &middot; '+(r.client||r.clientName):'');}});
// ── Listings drawn by the generic builder (core.js) ──
/* Pay Runs keep their own records and panel. */
rlRegister('payroll',{pre:'pr',
  rec:function(id){return payrollRecords[id]||null;},
  status:function(r){return r.status;},
  moves:function(r){return minus(['Active','Pending','Inactive'],r.status);},
  save:function(id){prSaveLog(Number(id));},
  count:function(r){return r.logs?len(r.logs):len(prLogsData[r.id]);},
  open:function(id){openPrSidebar(Number(id));},
  logs:function(id){if(String(prSelectedId)!==String(id))openPrSidebar(Number(id));navPrTab('logs');},
  sub:function(r){return r.cycle+' &middot; '+r.country;}});
/* Every other generic listing (Users ...): the row is an array, its status
   the Status column; the Logs form there offers the same three states. The
   save reads the panel's selection, so it is pointed at this row for the
   call and put back after. */
rlFactory('lst',function(pg){
  var si=function(){return ((getPageMeta(pg).columns)||[]).findIndex(function(c){return c==='Status'||c==='status';});};
  var opts=(pg==='leaves'||pg==='all-leaves')?['Approved','Unapproved','Pending']:['Active','Inactive','Pending'];
  return {pre:'lst',rowPrefix:'',
    rec:function(id){return (getListingRows(pg)||[]).find(function(r){return String(r[0])===String(id);})||null;},
    status:function(r){var i=si();return i>=0?String(r[i]):'';},
    moves:function(r){var i=si();return i>=0?minus(opts,String(r[i])):[];},
    save:function(id){
      var pPg=lstSelectedPg,pId=lstSelectedId;
      lstSelectedPg=pg;lstSelectedId=id;
      try{lstSaveLog();}finally{if(pId==null||pPg!==pg||String(pId)!==String(id)){lstSelectedPg=pPg;lstSelectedId=pId;}}
    },
    count:function(r){return len(lstLogsStore[pg+':'+r[0]]);},
    open:function(id){openLstSidebar(pg,id);},
    logs:function(id){if(!(lstSelectedPg===pg&&String(lstSelectedId)===String(id)))openLstSidebar(pg,id);navLstTab('logs');},
    sub:function(r){return String(r[1]||'');}};
});
})();
