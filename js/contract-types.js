/* ══ CONTRACT TYPES: ONE CONFIG, FOUR TYPES, NO FORKED LISTING ═══════════════
   The contracts listing used to know exactly one thing about a contract's
   type: how to print it into a <td>. Everything else - the status vocabulary,
   the stage list behind the Action menu, the column headers, the summary
   cards - was written once, inline, for EOR, and PEO inherited it by accident
   rather than by decision.

   Adding Immigration and Contractor that way would have meant a second copy of
   buildContractsListingHTML with different strings in it, and then a third. So
   the per-type differences live HERE, as data, and the listing reads them. One
   table renderer, one filter bar, one Action menu, four types.

   TO ADD A FIFTH TYPE: add an entry to CT_TYPES and a flow to CT_FLOWS. If you
   find yourself editing pages.js to do it, this file has failed. */

const CT_TYPE_ALL='ALL';

/* ── Stage flows ───────────────────────────────────────────────────────────
   Eight stages each, deliberately. --st-p1..p8 in main.css is an eight-step
   colour ladder where the shade IS the data (how far along a deal is), and it
   is documented there as clearing dE 12 pairwise. Eight stages per type means
   every type reads on that same ladder, so a half-finished Immigration case is
   the same colour as a half-finished EOR placement. A ninth stage would need a
   ninth colour that provably differs from the other eight, and there isn't one
   going spare.

   EOR and PEO share a flow. The PRD writes them as "EOR/PEO" throughout and
   never gives PEO a distinct status, event or gate - so PEO is a peer type in
   the picker (its own intake form, its own party of record) that runs the EOR
   lifecycle. The moment PEO grows a stage EOR doesn't have, give it its own
   list here; nothing else has to change. */
const CT_FLOWS={
  EOR:['Submitted','Quotation Approved','Proposal Sent','Proposal Approved','Contract Sent','Contract Approved','Onboarding','Ready for Payroll'],
  PEO:['Submitted','Quotation Approved','Proposal Sent','Proposal Approved','Contract Sent','Contract Approved','Onboarding','Ready for Payroll'],
  /* Immigration and Contractor have no "Quotation Approved": the PRD keeps
     "Proposal" for both and standardises on "Quote" for EOR/PEO only. Do not
     push that rename across - a Mobility Specialist does not send quotes. */
  IMMIGRATION:['Submitted','Proposal Sent','Proposal Approved','Contract Sent','Contract Approved','Pending Kickoff','Ready for Filing','Filed'],
  CONTRACTOR:['Submitted','Proposal Sent','Proposal Approved','Contract Sent','Contract Approved','Pending Onboarding','Onboarding','Active']
};

/* ── Lifecycle grouping ──────────────────────────────────────────────────────────
   NOT a vocabulary anything on screen speaks. It is the sort key that orders
   the All-Types status list below, and the classifier behind the landing
   tiles' in-progress / active / closed split.

   IT USED TO BE A FILTER. The All view offered six coarse buckets of its own
   — Request, Quote, Agreement, Delivery — under an "All Phases" dropdown,
   words that appear nowhere else in the product: not on a row, not in a badge,
   not in the PRD. The All view lists real statuses now, so there is no second
   set of words to learn before you can filter. */
const CT_PHASE_ORDER=['Request','Quote','Agreement','Delivery','Active','Closed'];

const CT_STATUS_PHASE={
  'Submitted':'Request',
  'Quotation Approved':'Quote','Proposal Sent':'Quote','Proposal Approved':'Quote',
  'Contract Sent':'Agreement','Contract Approved':'Agreement',
  'Onboarding':'Delivery','Pending Kickoff':'Delivery','Ready for Filing':'Delivery','Pending Onboarding':'Delivery',
  'Ready for Payroll':'Active','Filed':'Active','Active':'Active',
  'Inactive':'Closed'
};
function ctPhaseOf(status){return CT_STATUS_PHASE[status]||'Request';}

/* ── Per-type configuration ────────────────────────────────────────────────
   label      tile label and card heading
   short      first line of the two-line type cell in the All view
   blurb      one line, for the landing cards
   desc       the fuller copy, for the Add Contract chooser
   nameCol    what the subject column is called for this type (PRD 3.5)
   typeCol    what the type column is called for this type
   typeField  which record field the type column reads
   svcTypes   the type-scoped sub-product list (PRD 1.2)
   costCalc   whether the Cost Calculator applies - EOR/PEO only, per the PRD
   icon       key into sbIco; single-weight line icons, no per-type palette */
const CT_TYPES={
  EOR:{key:'EOR',label:'EOR',short:'EOR',cardTitle:'Employer of Record (EOR)',
    blurb:'We become the legal employer, so you can hire without an entity.',
    desc:'We act as the legal employer in-country, so you can hire without setting up an entity. We hold the employment contract, run payroll and carry statutory compliance.',
    nameCol:'Employee Name',typeCol:'Employment Type',typeField:'serviceType',
    costCalc:true,icon:'ctEor',page:'contract-eor',
    svcTypes:['Permanent','Fixed term','Part time']},
  PEO:{key:'PEO',label:'PEO',short:'PEO',cardTitle:'Professional Employer Organization (PEO)',
    blurb:'Co-employment for countries where you already have an entity.',
    desc:'A co-employment arrangement for businesses that already hold an entity. We manage employment agreements, payroll and associated documentation across several countries.',
    nameCol:'Employee Name',typeCol:'Employment Type',typeField:'serviceType',
    costCalc:true,icon:'ctPeo',page:'contract-peo',
    svcTypes:['Permanent','Fixed term','Part time']},
  IMMIGRATION:{key:'IMMIGRATION',label:'Immigration',short:'Immigration',cardTitle:'Immigration',
    blurb:'Visas, permits and relocation for workers who need them.',
    desc:'Sponsorship, relocation and permit work for a worker who needs the right to work before anything else can start. We run the case with the authority end to end.',
    nameCol:'Client / Worker Name',typeCol:'Service Type',typeField:'serviceType',
    costCalc:false,icon:'ctImmigration',page:'contract-immigration',
    svcTypes:['New hire sponsorship','Relocation','Permit renewal','Transfer','Dependent visa support','Business travel support']},
  CONTRACTOR:{key:'CONTRACTOR',label:'Contractor',short:'Contractor',cardTitle:'Contractor',
    blurb:'Engage and pay independent contractors compliantly.',
    desc:'Engage and pay independent contractors compliantly, with classification checks up front and invoice handling once the engagement is live.',
    nameCol:'Client / Worker Name',typeCol:'Service Type',typeField:'serviceType',
    costCalc:false,icon:'ctContractor',page:'contract-contractor',
    svcTypes:['Direct contractor management','Contractor of Record','Contractor conversion advisory']}
};

const CT_TYPE_ORDER=['EOR','PEO','IMMIGRATION','CONTRACTOR'];

/* The Contract Type filter shows labels; ctTypeFilter holds enum keys. These
   two convert between them so no caller has to hand-map "Immigration" to
   IMMIGRATION. CT_TYPE_LABEL_ALL is the "no type selected" row, and is a real
   option rather than the placeholder because a user needs a way back to the
   mixed list without clearing Country and Search alongside it. */
const CT_TYPE_LABEL_ALL='All Types';
function ctTypeFromLabel(label){
  if(!label||label===CT_TYPE_LABEL_ALL)return CT_TYPE_ALL;
  const hit=CT_TYPE_ORDER.filter(function(k){return CT_TYPES[k].label===label;})[0];
  return hit||CT_TYPE_ALL;
}
function ctTypeFilterLabel(){
  return ctTypeFilter===CT_TYPE_ALL?CT_TYPE_LABEL_ALL:CT_TYPES[ctTypeFilter].label;
}

/* Tenant configuration. A type the tenant has not bought stays VISIBLE and
   disabled with a tooltip - hiding it makes the product look broken to a
   client considering the service, and support cannot talk someone through a
   tile that is not on their screen. Flip one of these to false to see it. */
const CT_TYPE_ENABLED={EOR:true,PEO:true,IMMIGRATION:true,CONTRACTOR:true};
function ctTypeEnabled(k){return CT_TYPE_ENABLED[k]!==false;}

/* Records carry the display string ('EOR', 'Immigration'); the config is keyed
   by enum. One normaliser, rather than a .toUpperCase() at every call site. */
function ctTypeKey(v){
  const s=String(v||'').toUpperCase();
  return CT_TYPES[s]?s:'EOR';
}
function ctTypeCfg(v){return CT_TYPES[ctTypeKey(v)];}

/* Stage list for a record's type. Falls back to EOR so a row carrying a junk
   type still renders an Action menu instead of an empty box. */
function ctFlowFor(type){return CT_FLOWS[ctTypeKey(type)]||CT_FLOWS.EOR;}

/* The Status dropdown's options, DERIVED - never typed inline. The old listing
   hard-coded seven statuses that disagreed with the flow: it offered
   "Inactive" and omitted "Onboarding" and "Ready for Payroll", so rows sitting
   in those two states could not be filtered to at all. Deriving it means that
   class of bug cannot come back. */
/* Every status a row in the mixed list can actually be sitting in: the four
   flows merged, each stage once. Ordered along the lifecycle rather than by
   whichever type declared it first — straight CT_FLOWS order would file
   Immigration's "Pending Kickoff" after EOR's "Ready for Payroll". Derived,
   so a fifth type's stages turn up here the moment CT_FLOWS gains them. */
function ctAllStatuses(){
  const seen=[];
  CT_TYPE_ORDER.forEach(function(k){
    ctFlowFor(k).forEach(function(s){if(seen.indexOf(s)===-1)seen.push(s);});
  });
  seen.push('Inactive');
  /* Stable within a phase, so each flow's own running order survives. */
  return CT_PHASE_ORDER.reduce(function(out,ph){
    return out.concat(seen.filter(function(s){return ctPhaseOf(s)===ph;}));
  },[]);
}
function ctStatusOptionsFor(typeSel){
  if(!typeSel||typeSel===CT_TYPE_ALL)return ctAllStatuses();
  return ctFlowFor(typeSel).concat(['Inactive']);
}

/* ── Summary cards ─────────────────────────────────────────────────────────
   Type-scoped, because "Ready for Payroll" is meaningless on an Immigration
   case and "Ready for Filing" is meaningless on an EOR placement. Each card is
   a filter, so clicking one drills into the list rather than opening a
   separate report. Every card matches on a real `status`, the All view
   included — it uses the stages all four flows share, so a card and the
   Status dropdown above it can never mean two different things. */
const CT_SUMMARY_CARDS={
  EOR:[
    {label:'Quote Ready',status:'Proposal Sent'},
    {label:'Agreement Sent',status:'Contract Sent'},
    {label:'Onboarding',status:'Onboarding'},
    {label:'Ready for Payroll',status:'Ready for Payroll'}
  ],
  IMMIGRATION:[
    {label:'Proposals Sent',status:'Proposal Sent'},
    {label:'Contracts Sent',status:'Contract Sent'},
    {label:'Pending Kickoff',status:'Pending Kickoff'},
    {label:'Ready for Filing',status:'Ready for Filing'}
  ],
  CONTRACTOR:[
    {label:'Proposals Sent',status:'Proposal Sent'},
    {label:'Contracts Sent',status:'Contract Sent'},
    {label:'To Onboard',status:'Pending Onboarding'},
    {label:'Active',status:'Active'}
  ],
  /* The All view can only count what every type has in common, so these are
     the four stages that appear in all four flows. */
  ALL:[
    {label:'Submitted',status:'Submitted'},
    {label:'Proposals Sent',status:'Proposal Sent'},
    {label:'Contracts Sent',status:'Contract Sent'},
    {label:'Contracts Approved',status:'Contract Approved'}
  ]
};
function ctSummaryCardsFor(typeSel){
  if(!typeSel||typeSel===CT_TYPE_ALL)return CT_SUMMARY_CARDS.ALL;
  /* PEO runs the EOR lifecycle, so it reads EOR's cards. */
  return CT_SUMMARY_CARDS[ctTypeKey(typeSel)]||CT_SUMMARY_CARDS.EOR;
}
