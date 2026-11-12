/* ══ CONTRACT EVENT REGISTRY ═════════════════════════════════════════════════
   PRD section 6, as one map. Every log row in the product resolves its label
   through here; no event name is written as a string literal anywhere else.

   WHY A CANONICAL KEY AND NOT THE PRD'S LITERAL NAMES: the PRD's log names are
   not parallel across types. Immigration and Contractor events are type-
   prefixed and stage-named (IMMIGRATION_PROPOSAL_SENT, CONTRACTOR_CONTRACT_
   APPROVED); EOR/PEO events are unprefixed and use different words for the
   same stage (QUOTE_SENT, CLIENT_AGREEMENT_SIGNED). Implemented literally that
   is four divergent enums in which IMMIGRATION_PROPOSAL_SENT and QUOTE_SENT
   are the same event, with no way to ask "what went out to a client last
   week?" across types.

   So each row here carries a canonical `key`, and per type a `legacy` (the
   PRD's literal string, for exports) and a `label` (what a human reads). The
   contract's type decides which pair applies. Exports stay faithful to the
   PRD; the UI stays readable; queries stay possible. */

const CT_EVENT_FAMILIES=['Intake','Quote','Agreement','Delivery','Billing','Overrides','Note'];

/* Shorthand: e(family, {TYPE:[legacy, label], ...}). DEFAULT covers every type
   not named, which is most of the delivery and billing events. */
function ctEv(family,perType){return {family:family,types:perType};}

const CT_EVENTS={
  /* ── 6.1 Intake ─────────────────────────────────────────────────────── */
  REQUEST_CREATED:ctEv('Intake',{
    EOR:['CONTRACT_CREATED','Requirement created'],
    PEO:['CONTRACT_CREATED','Requirement created'],
    IMMIGRATION:['IMMIGRATION_REQUEST_CREATED','Immigration request created'],
    CONTRACTOR:['CONTRACTOR_REQUEST_CREATED','Contractor request created']}),
  REQUEST_SUBMITTED:ctEv('Intake',{
    EOR:['CONTRACT_SUBMITTED','Requirement submitted'],
    PEO:['CONTRACT_SUBMITTED','Requirement submitted'],
    IMMIGRATION:['IMMIGRATION_REQUEST_SUBMITTED','Immigration request submitted'],
    CONTRACTOR:['CONTRACTOR_REQUEST_SUBMITTED','Contractor request submitted']}),
  CSM_ASSIGNED:ctEv('Intake',{
    EOR:['CSM_ASSIGNED','CSM assigned'],PEO:['CSM_ASSIGNED','CSM assigned']}),
  ENQUIRY_QUALIFIED:ctEv('Intake',{
    EOR:['ENQUIRY_QUALIFIED','Enquiry qualified'],PEO:['ENQUIRY_QUALIFIED','Enquiry qualified']}),
  ENQUIRY_DISQUALIFIED:ctEv('Intake',{
    EOR:['ENQUIRY_DISQUALIFIED','Enquiry disqualified'],PEO:['ENQUIRY_DISQUALIFIED','Enquiry disqualified']}),

  /* ── 6.2 Quote / Proposal ───────────────────────────────────────────────
     The PRD standardises "Proposal / Quotation / Simulation" to Quote for
     EOR/PEO ONLY. Immigration and Contractor keep "Proposal" - do not push
     the rename across; a Mobility Specialist does not send quotes. */
  QUOTE_CREATED:ctEv('Quote',{
    EOR:['QUOTE_CREATED','Quote created'],PEO:['QUOTE_CREATED','Quote created'],
    IMMIGRATION:['IMMIGRATION_PROPOSAL_CREATED','Proposal created'],
    CONTRACTOR:['CONTRACTOR_PROPOSAL_CREATED','Proposal created']}),
  QUOTE_SENT:ctEv('Quote',{
    EOR:['QUOTE_SENT','Quote sent'],PEO:['QUOTE_SENT','Quote sent'],
    IMMIGRATION:['IMMIGRATION_PROPOSAL_SENT','Proposal sent'],
    CONTRACTOR:['CONTRACTOR_PROPOSAL_SENT','Proposal sent']}),
  QUOTE_VIEWED:ctEv('Quote',{
    EOR:['QUOTE_VIEWED','Quote viewed'],PEO:['QUOTE_VIEWED','Quote viewed'],
    IMMIGRATION:['IMMIGRATION_PROPOSAL_VIEWED','Proposal viewed'],
    CONTRACTOR:['CONTRACTOR_PROPOSAL_VIEWED','Proposal viewed']}),
  QUOTE_APPROVED:ctEv('Quote',{
    EOR:['QUOTE_APPROVED','Quote approved'],PEO:['QUOTE_APPROVED','Quote approved'],
    IMMIGRATION:['IMMIGRATION_PROPOSAL_APPROVED','Proposal approved'],
    CONTRACTOR:['CONTRACTOR_PROPOSAL_APPROVED','Proposal approved']}),
  QUOTE_REJECTED:ctEv('Quote',{
    EOR:['QUOTE_REJECTED','Quote rejected'],PEO:['QUOTE_REJECTED','Quote rejected'],
    IMMIGRATION:['IMMIGRATION_PROPOSAL_DECLINED','Proposal declined'],
    CONTRACTOR:['CONTRACTOR_PROPOSAL_DECLINED','Proposal declined']}),
  QUOTE_CHANGE_REQUESTED:ctEv('Quote',{
    EOR:['QUOTE_CHANGE_REQUESTED','Changes requested'],PEO:['QUOTE_CHANGE_REQUESTED','Changes requested'],
    IMMIGRATION:['IMMIGRATION_PROPOSAL_CHANGE_REQUESTED','Changes requested'],
    CONTRACTOR:['CONTRACTOR_PROPOSAL_CHANGE_REQUESTED','Changes requested']}),
  QUOTE_REISSUED:ctEv('Quote',{
    EOR:['QUOTE_REISSUED','Quote re-issued'],PEO:['QUOTE_REISSUED','Quote re-issued']}),
  QUOTE_FOLLOWUP_SENT:ctEv('Quote',{
    EOR:['QUOTE_FOLLOWUP_SENT','Follow-up sent'],PEO:['QUOTE_FOLLOWUP_SENT','Follow-up sent']}),
  QUOTE_FOLLOWUP_PAUSED:ctEv('Quote',{
    EOR:['QUOTE_FOLLOWUP_PAUSED','Follow-up paused'],PEO:['QUOTE_FOLLOWUP_PAUSED','Follow-up paused']}),

  /* ── 6.3 Commercial contract ─────────────────────────────────────────── */
  AGREEMENT_CREATED:ctEv('Agreement',{
    EOR:['CLIENT_AGREEMENT_CREATED','Client agreement created'],
    PEO:['CLIENT_AGREEMENT_CREATED','Client agreement created'],
    IMMIGRATION:['IMMIGRATION_CONTRACT_CREATED','Service contract created'],
    CONTRACTOR:['CONTRACTOR_CONTRACT_CREATED','Contractor agreement created']}),
  AGREEMENT_SENT:ctEv('Agreement',{
    EOR:['CLIENT_AGREEMENT_SENT','Client agreement sent'],
    PEO:['CLIENT_AGREEMENT_SENT','Client agreement sent'],
    IMMIGRATION:['IMMIGRATION_CONTRACT_SENT','Service contract sent'],
    CONTRACTOR:['CONTRACTOR_CONTRACT_SENT','Contractor agreement sent']}),
  AGREEMENT_SIGNED:ctEv('Agreement',{
    EOR:['CLIENT_AGREEMENT_SIGNED','Client agreement signed'],
    PEO:['CLIENT_AGREEMENT_SIGNED','Client agreement signed'],
    IMMIGRATION:['IMMIGRATION_CONTRACT_APPROVED','Service contract approved'],
    CONTRACTOR:['CONTRACTOR_CONTRACT_APPROVED','Contractor agreement approved']}),
  AGREEMENT_DECLINED:ctEv('Agreement',{
    IMMIGRATION:['IMMIGRATION_CONTRACT_DECLINED','Service contract declined'],
    CONTRACTOR:['CONTRACTOR_CONTRACT_DECLINED','Contractor agreement declined']}),
  AGREEMENT_CHANGE_REQUESTED:ctEv('Agreement',{
    EOR:['CLIENT_AGREEMENT_CHANGE_REQUESTED','Changes requested'],
    PEO:['CLIENT_AGREEMENT_CHANGE_REQUESTED','Changes requested'],
    IMMIGRATION:['IMMIGRATION_CONTRACT_CHANGE_REQUESTED','Changes requested'],
    CONTRACTOR:['CONTRACTOR_CONTRACT_CHANGE_REQUESTED','Changes requested']}),

  /* ── 6.4 Deposit and worker contract (EOR/PEO) ───────────────────────── */
  DEPOSIT_INVOICE_RAISED:ctEv('Billing',{EOR:['DEPOSIT_INVOICE_RAISED','Deposit invoice raised'],PEO:['DEPOSIT_INVOICE_RAISED','Deposit invoice raised']}),
  DEPOSIT_PART_PAID:ctEv('Billing',{EOR:['DEPOSIT_PART_PAID','Deposit part paid'],PEO:['DEPOSIT_PART_PAID','Deposit part paid']}),
  DEPOSIT_CLEARED:ctEv('Billing',{EOR:['DEPOSIT_CLEARED','Deposit cleared'],PEO:['DEPOSIT_CLEARED','Deposit cleared']}),
  DEPOSIT_OVERRIDE:ctEv('Overrides',{EOR:['DEPOSIT_OVERRIDE','Deposit overridden'],PEO:['DEPOSIT_OVERRIDE','Deposit overridden']}),
  EMP_CONTRACT_CREATED:ctEv('Agreement',{EOR:['EMP_CONTRACT_CREATED','Employment contract created'],PEO:['EMP_CONTRACT_CREATED','Employment contract created']}),
  EMP_CONTRACT_SENT:ctEv('Agreement',{EOR:['EMP_CONTRACT_SENT','Employment contract sent'],PEO:['EMP_CONTRACT_SENT','Employment contract sent']}),
  EMP_CONTRACT_WORKER_SIGNED:ctEv('Agreement',{EOR:['EMP_CONTRACT_WORKER_SIGNED','Worker signed'],PEO:['EMP_CONTRACT_WORKER_SIGNED','Worker signed']}),
  EMP_CONTRACT_COUNTERSIGNED:ctEv('Agreement',{EOR:['EMP_CONTRACT_COUNTERSIGNED','Countersigned'],PEO:['EMP_CONTRACT_COUNTERSIGNED','Countersigned']}),

  /* ── 6.5 Post-signature object ────────────────────────────────────────
     EOR_EMPLOYEE_CREATED is EOR-shaped and the PRD gives no PEO equivalent,
     so the canonical key is the neutral DELIVERY_OBJECT_CREATED and the
     EOR-shaped string survives as the legacy code. */
  DELIVERY_OBJECT_CREATED:ctEv('Delivery',{
    EOR:['EOR_EMPLOYEE_CREATED','Placement created'],
    PEO:['PLACEMENT_CREATED','Placement created'],
    IMMIGRATION:['IMMIGRATION_CASE_CREATED','Immigration case created'],
    CONTRACTOR:['CONTRACTOR_PROFILE_CREATED','Contractor profile created']}),
  HANDOFF_CREATED:ctEv('Delivery',{IMMIGRATION:['IMMIGRATION_CASE_HANDOFF_CREATED','Handed off to Immigration Ops']}),
  ONBOARDING_INVITED:ctEv('Delivery',{CONTRACTOR:['CONTRACTOR_ONBOARDING_INVITED','Onboarding invite sent']}),
  ONBOARDING_COMPLETED:ctEv('Delivery',{CONTRACTOR:['CONTRACTOR_ONBOARDING_COMPLETED','Onboarding completed']}),
  DOC_REQUESTED:ctEv('Delivery',{IMMIGRATION:['IMMIGRATION_DOC_REQUESTED','Document requested']}),
  DOC_UPLOADED:ctEv('Delivery',{IMMIGRATION:['IMMIGRATION_DOC_UPLOADED','Document uploaded']}),
  READY_FOR_FILING:ctEv('Delivery',{IMMIGRATION:['IMMIGRATION_READY_FOR_FILING','Ready for filing']}),
  FILED:ctEv('Delivery',{IMMIGRATION:['IMMIGRATION_FILED','Filed with authority']}),
  READY_FOR_PAYROLL:ctEv('Delivery',{EOR:['READY_FOR_PAYROLL_MARKED','Marked ready for payroll'],PEO:['READY_FOR_PAYROLL_MARKED','Marked ready for payroll']}),
  FIRST_PAYROLL_RUN:ctEv('Delivery',{EOR:['FIRST_PAYROLL_RUN','First payroll run'],PEO:['FIRST_PAYROLL_RUN','First payroll run']}),
  PLACEMENT_ACTIVE:ctEv('Delivery',{EOR:['PLACEMENT_ACTIVE','Placement active'],PEO:['PLACEMENT_ACTIVE','Placement active']}),

  /* ── 6.6 Billing ──────────────────────────────────────────────────────── */
  INVOICE_CREATED:ctEv('Billing',{CONTRACTOR:['CONTRACTOR_INVOICE_CREATED','Invoice created']}),
  INVOICE_APPROVED:ctEv('Billing',{CONTRACTOR:['CONTRACTOR_INVOICE_APPROVED','Invoice approved']}),
  PAYMENT_SETTLED:ctEv('Billing',{
    EOR:['PAYMENT_SETTLED','Payment settled'],PEO:['PAYMENT_SETTLED','Payment settled'],
    CONTRACTOR:['CONTRACTOR_PAYMENT_SETTLED','Payment settled']}),
  PAYMENT_FAILED:ctEv('Billing',{
    EOR:['PAYMENT_FAILED','Payment failed'],PEO:['PAYMENT_FAILED','Payment failed'],
    CONTRACTOR:['CONTRACTOR_PAYMENT_FAILED','Payment failed']}),

  /* ── 6.7 Overrides ────────────────────────────────────────────────────── */
  GATE_OVERRIDDEN:ctEv('Overrides',{
    EOR:['GATE_OVERRIDDEN','Gate overridden'],PEO:['GATE_OVERRIDDEN','Gate overridden'],
    IMMIGRATION:['GATE_OVERRIDDEN','Gate overridden'],CONTRACTOR:['GATE_OVERRIDDEN','Gate overridden']}),

  /* ── NOT IN THE PRD ───────────────────────────────────────────────────
     Two things this product needs that section 6 does not name. They are
     kept here, separated and labelled, rather than slipped in among the
     spec'd keys, so the gap stays visible and whoever owns the PRD can
     assign real canonical keys and legacy codes.

     STATUS_REVERTED - moving a contract back to an earlier stage. Section
     6.7 requires that EVERY state transition writes an event, and a revert
     is a state transition, so it cannot go unlogged; but no key is given.

     CONTRACT_DEACTIVATED - the "Inactive" status exists in the data and in
     the status filter, and again has no event in section 6. */
  STATUS_REVERTED:ctEv('Overrides',{
    EOR:['STATUS_REVERTED','Status reverted'],PEO:['STATUS_REVERTED','Status reverted'],
    IMMIGRATION:['STATUS_REVERTED','Status reverted'],CONTRACTOR:['STATUS_REVERTED','Status reverted']}),
  CONTRACT_DEACTIVATED:ctEv('Intake',{
    EOR:['CONTRACT_DEACTIVATED','Contract set inactive'],PEO:['CONTRACT_DEACTIVATED','Contract set inactive'],
    IMMIGRATION:['CONTRACT_DEACTIVATED','Contract set inactive'],CONTRACTOR:['CONTRACT_DEACTIVATED','Contract set inactive']}),

  /* COMMENT_ADDED - a log entry that says something without moving the record.
     The log form in every other module lets you save a comment against the
     status the record is already in, and section 6 has no key for it. Its own
     family, 'Note', because it is not a stage event: rolling it into Intake
     would put ordinary chatter in the same bucket as "requirement submitted"
     and quietly corrupt any count of intake activity. */
  COMMENT_ADDED:ctEv('Note',{
    EOR:['COMMENT_ADDED','Comment added'],PEO:['COMMENT_ADDED','Comment added'],
    IMMIGRATION:['COMMENT_ADDED','Comment added'],CONTRACTOR:['COMMENT_ADDED','Comment added']})
};

/* Keys that are not from the PRD, listed once so a test can assert the spec'd
   set stayed clean and an export can decide what to do with them. */
const CT_EVENTS_NON_SPEC=['STATUS_REVERTED','CONTRACT_DEACTIVATED','COMMENT_ADDED'];

/* ── Which event a status change emits ─────────────────────────────────────
   Keyed by type, then by the status being ENTERED.

   A NOTE ON EOR/PEO: this codebase's flow has TWO pricing stages, "Quotation
   Approved" then "Proposal Sent", where the PRD has one priced offer that is
   created, sent, then approved. Read the code's stages as that lifecycle -
   the quote is signed off internally (QUOTE_CREATED), goes to the client
   (QUOTE_SENT), and comes back approved (QUOTE_APPROVED) - which is what the
   ordering already implies. Flagged rather than reshaped: changing the EOR
   stage list is a bigger decision than a label map. */
const CT_STATUS_EVENT={
  EOR:{
    'Submitted':'REQUEST_SUBMITTED','Quotation Approved':'QUOTE_CREATED',
    'Proposal Sent':'QUOTE_SENT','Proposal Approved':'QUOTE_APPROVED',
    'Contract Sent':'AGREEMENT_SENT','Contract Approved':'AGREEMENT_SIGNED',
    'Onboarding':'DELIVERY_OBJECT_CREATED','Ready for Payroll':'READY_FOR_PAYROLL',
    'Inactive':'CONTRACT_DEACTIVATED'},
  IMMIGRATION:{
    'Submitted':'REQUEST_SUBMITTED','Proposal Sent':'QUOTE_SENT','Proposal Approved':'QUOTE_APPROVED',
    'Contract Sent':'AGREEMENT_SENT','Contract Approved':'AGREEMENT_SIGNED',
    'Pending Kickoff':'DELIVERY_OBJECT_CREATED','Ready for Filing':'READY_FOR_FILING','Filed':'FILED',
    'Inactive':'CONTRACT_DEACTIVATED'},
  CONTRACTOR:{
    'Submitted':'REQUEST_SUBMITTED','Proposal Sent':'QUOTE_SENT','Proposal Approved':'QUOTE_APPROVED',
    'Contract Sent':'AGREEMENT_SENT','Contract Approved':'AGREEMENT_SIGNED',
    'Pending Onboarding':'DELIVERY_OBJECT_CREATED','Onboarding':'ONBOARDING_INVITED','Active':'ONBOARDING_COMPLETED',
    'Inactive':'CONTRACT_DEACTIVATED'}
};
CT_STATUS_EVENT.PEO=CT_STATUS_EVENT.EOR;   /* PEO runs the EOR lifecycle */

function ctEventKeyFor(type,status){
  const m=CT_STATUS_EVENT[ctTypeKey(type)]||{};
  return m[status]||null;
}

/* Resolve an event to what this contract's type should show and export. */
function ctEventInfo(eventKey,type){
  const ev=CT_EVENTS[eventKey];
  if(!ev)return null;
  const pair=ev.types[ctTypeKey(type)];
  if(!pair)return null;
  return {key:eventKey,family:ev.family,legacy:pair[0],label:pair[1]};
}
function ctEventLabel(eventKey,type,fallback){
  const i=ctEventInfo(eventKey,type);
  return i?i.label:(fallback||eventKey||'Updated');
}

/* ── The single writer ─────────────────────────────────────────────────────
   Every log row in the contracts module goes through here. The point is not
   ceremony: it is that `legacy` is stamped AT INSERT from the registry, so an
   export is faithful to the PRD even if a label is reworded later, and that
   there is exactly one place where a row can be created - which is what makes
   "a status changed without an event" a testable condition rather than a
   thing you hope nobody forgot.

   visibility is CLIENT or INTERNAL. Internal sub-status movement and every
   override are INTERNAL and never reach a client-facing view. */
function emitContractEvent(rec,eventKey,opts){
  const o=opts||{};
  const info=ctEventInfo(eventKey,rec.type);
  const s=stampNow();
  const row={
    date:s.date,time:s.time,
    user:o.actor||CURRENT_USER,
    actorType:o.actorType||'USER',
    eventKey:eventKey,
    family:info?info.family:'Intake',
    legacy:info?info.legacy:eventKey,
    label:info?info.label:eventKey,
    prevStatus:o.prevStatus||null,
    newStatus:o.newStatus||null,
    comment:o.comment||'',
    visibility:o.visibility||'INTERNAL',
    /* status is kept for the rows seeded before the registry existed, and for
       the badge tint the timeline paints - not read as the event identity. */
    status:o.newStatus||(info?info.label:eventKey)
  };
  (ctLogsData[rec.id]=ctLogsData[rec.id]||[]).unshift(row);
  return row;
}

/* A seeded fixture row predates the registry: it has {status, action} and no
   eventKey. Normalise on read so the timeline has one shape to render. */
function ctLogRow(l,type){
  if(l.eventKey)return l;
  const key=ctEventKeyFor(type,l.status);
  const info=key?ctEventInfo(key,type):null;
  return {
    date:l.date,time:l.time,user:l.user,actorType:'USER',
    eventKey:key,family:info?info.family:'Intake',
    legacy:info?info.legacy:'',label:info?info.label:l.status,
    prevStatus:null,newStatus:l.status,comment:l.action||'',
    visibility:'INTERNAL',status:l.status
  };
}
