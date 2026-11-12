/* ══ RBAC TEMPLATES ═════════════════════════════════════════════════════════
   Governance → RBAC Templates. Reusable permission blueprints: apply one to a
   role instead of ticking permissions by hand.

   Built from the same parts as Capping Limit (js/capping-limit.js):
   lpSearchField + apCS filters with listing-stats tiles, an .lp-table in an
   .lp-split-wrap, the .lp-isb-* panel behind the row action (sbHero, axField,
   lpLogsView, wfTimelineHTML, sbHistoryHTML) and a .ct-modal--form popup for
   + Add. Only the permission parts are new.

   THE ROW SUMMARISES, THE PANEL LISTS. The old listing printed every
   permission sentence as a chip, so one template was two rows tall and the
   next was six, and nothing lined up. A row now says how many permissions
   the template grants, which areas they fall in (Leave 4 · HR policies 3)
   and how many are sensitive. The sentences, with their codes, are on the
   panel's Permissions tab.

   SENSITIVE IS MARKED, NOT GUESSED. A permission that deletes, approves,
   publishes or moves money carries `s:1` in the catalogue. Those are the ones
   a reviewer looks for first, so they are counted on the row and tinted amber
   wherever they are listed.

   THE PICKER IS A GRID, NOT A LIST. The old form was 30 checkboxes in two
   columns per module. Permissions come in families - a certificate can be
   viewed, added, updated, deleted - so the picker shows one line per area
   with a toggle per action. Reading across a line answers "what can this
   template do with certificates?"; the full sentence and code are on hover.

   DELETE IS A MOVE, AND ONLY WHEN NOTHING USES IT. Same as Capping Limit:
   Active / Inactive / Deleted from Logs, with a comment. A template still
   applied to a role cannot be deleted - the move is not offered, and the
   Logs form says which roles to free first. */

/* ── Permission catalogue ──────────────────────────────────────────────── */
/* module -> areas -> permissions. v is the action as it reads in the picker,
   d the sentence the old screen showed, c the code. */
function rbArea(area,items){return {area:area,items:items.map(function(x){return {c:x[0],v:x[1],d:x[2],s:x[3]?1:0};})};}
const RB_CATALOGUE={
  'Foundation':[
    rbArea('Entities',[['foundation.entity.view','View','View entity details'],['foundation.entity.update','Update','Update entity details',1],['foundation.entity.create','Create company','Create a client company',1]]),
    rbArea('Entity policies',[['foundation.policy.publish','Publish','Publish/version entity policies',1]]),
    rbArea('Branches',[['foundation.branch.view','View','View branches'],['foundation.branch.manage','Manage','Create, edit or close a branch']]),
    rbArea('Departments',[['foundation.dept.view','View','View departments'],['foundation.dept.manage','Manage','Create, edit or merge a department']]),
    rbArea('Designations',[['foundation.desig.view','View','View designations'],['foundation.desig.manage','Manage','Create or edit a designation']]),
    rbArea('Users',[['foundation.user.view','View','View users'],['foundation.user.invite','Invite','Invite a user'],['foundation.user.deactivate','Deactivate','Deactivate a user',1]]),
    rbArea('Roles',[['foundation.role.view','View','View roles and what they can do'],['foundation.role.manage','Manage','Create roles and apply templates to them',1]]),
    rbArea('Module control',[['platform.module.control','Manage','Switch Expense Management on or off for a client (Opendhi)',1]]),
    rbArea('Platform',[['platform.template.manage','Templates','Create and change permission templates (Opendhi)',1],['platform.access.manage','Platform access','Assign Opendhi roles and manage every client\'s workspaces (Opendhi)',1]])
  ],
  'H2R':[
    rbArea('Employee records',[['h2r.employee.own','View own','View your own employee record'],['h2r.employee.view.team','View team','View your direct reports\' records'],['h2r.employee.view','View','View the admin and employee listings'],['h2r.employee.create','Create','Create an admin / employee record'],['h2r.employee.bulk','Bulk upload','Create employees in bulk from an Excel file'],['h2r.employee.manage','Manage','Update, delete or change status of an admin / employee record',1]]),
    rbArea('Certificates',[['h2r.certificate.view','View','View employee certificates'],['h2r.certificate.create','Add','Add employee certificate'],['h2r.certificate.update','Update','Update employee certificate'],['h2r.certificate.delete','Change status','Change certificate status (soft-delete / re-activate)',1]]),
    rbArea('Assets',[['h2r.asset.view','View own','View my assigned assets'],['h2r.asset.confirm','Confirm','Confirm or reject an assigned asset']]),
    rbArea('HR policies',[['h2r.policy.view','View','View HR / travel policies'],['h2r.policy.assigned','View assigned','View HR policies assigned to an employee'],['h2r.policy.manage','Publish','Create, edit and publish HR policies',1]]),
    rbArea('Timeline',[['h2r.timeline.view','View','View employee history timeline']]),
    rbArea('Reporting',[['h2r.reporting.view','View','View team reporting managers'],['h2r.reporting.update','Assign','Assign an employee\'s team and reporting manager']]),
    rbArea('Documents',[['h2r.document.view','View','View employee documents'],['h2r.document.upload','Upload','Upload an employee document'],['h2r.document.review','Review','Approve, request re-upload of, or delete a document',1]]),
    rbArea('Leave',[['h2r.leave.view.all','View all','View every employee\'s leave requests and balances'],['h2r.leave.view.team','View team','View your direct reports\' leave requests'],['h2r.leave.policy.view','Policies','Open Leave Policies'],['h2r.leave.view','View','View leave records, reports and calendars'],['h2r.leave.apply','Apply','Submit a leave application'],['h2r.leave.approve','Approve','Approve, reject or cancel a leave application',1],['h2r.leave.carry','Year-end run','Run leave carry-forward and yearly balance updates',1]]),
    rbArea('Bank details',[['h2r.bank.view','View','View bank details (masked)'],['h2r.bank.update','Update','Update an employee\'s bank details',1]]),
    rbArea('Dashboard',[['h2r.dashboard.view','View','View dashboard']]),
    rbArea('Holidays',[['h2r.holiday.view','View','View the holiday calendar'],['h2r.holiday.manage','Manage','Add or change holidays',1]]),
    rbArea('HR documents',[['h2r.hrdoc.view','View','Open HR Docs']]),
    rbArea('Lifecycle steps',[['h2r.lifecycle.hr','HR','Record HR onboarding and offboarding steps',1],['h2r.lifecycle.it','IT','Record IT steps (asset and access)',1],['h2r.lifecycle.finance','Finance','Record Finance steps (full and final)',1],['h2r.lifecycle.compliance','Compliance','Record verification and clearance steps',1],['h2r.lifecycle.manager','Manager','Record KT / handover steps'],['h2r.lifecycle.all','All','Record any lifecycle step',1]]),
    rbArea('Teams',[['h2r.team.view','View','View teams and their members'],['h2r.team.create','Create','Create a team']]),
    rbArea('Offboarding',[['h2r.exit.view','View','View exits in progress'],['h2r.exit.initiate','Initiate','Initiate an employee exit'],['h2r.exit.settle','Settle','Approve full and final settlement',1]])
  ],
  'Time':[
    rbArea('Timesheets',[['time.timesheet.own','View own','View and fill your own timesheet'],['time.timesheet.view','View all','View every timesheet'],['time.timesheet.approve','Approve','Approve or reject timesheets',1],['time.timesheet.unlock','Unlock','Unlock a locked timesheet period',1]])
  ],
  'Contracts':[
    rbArea('Contracts',[['contract.view','View','View contracts'],['contract.manage','Manage','Create and edit contracts',1]]),
    rbArea('Contract templates',[['contract.template.view','View','View contract templates'],['contract.template.manage','Manage','Create or edit a contract template',1]])
  ],
  'Finance':[
    rbArea('Payments',[['finance.payment.view','View','View payments and invoices'],['finance.payment.manage','Manage','Create or record a payment',1]])
  ],
  'Governance':[
    rbArea('Compliance Hub',[['compliance.item.view','View','View compliance items'],['compliance.item.manage','Manage','Create or update a compliance item',1]]),
    rbArea('Rates & rules',[['compliance.rates.view','View','View rates and rules'],['compliance.rates.manage','Manage','Change rates and rules',1]]),
    rbArea('Assets',[['admin.asset.view','View','View asset allocations'],['admin.asset.manage','Manage','Allocate or recover an asset',1]]),
    rbArea('IT accesses',[['admin.itaccess.view','View','View IT access records'],['admin.itaccess.manage','Manage','Grant or revoke IT access',1]]),
    rbArea('Announcements',[['announcement.manage','Manage','Write and publish announcements',1]])
  ],
  'Support':[
    rbArea('Support',[['support.chat','Chats','Use Chats'],['support.ticket','Tickets','Raise and follow support tickets']])
  ],
  'Payroll':[
    rbArea('Pay runs',[['payroll.run.view','View','View pay runs'],['payroll.run.create','Create','Create a pay run'],['payroll.run.approve','Approve','Approve a pay run',1],['payroll.run.lock','Lock','Lock a pay run for payout',1]]),
    rbArea('Payslips',[['payroll.payslip.own','View own','View my payslips'],['payroll.payslip.view','View all','View every employee\'s payslips'],['payroll.payslip.publish','Publish','Publish payslips to employees',1]]),
    rbArea('Payheads',[['payroll.payhead.view','View','View payheads'],['payroll.payhead.manage','Manage','Create or edit a payhead',1]]),
    rbArea('Tax declarations',[['payroll.tax.view','View','View tax declarations'],['payroll.tax.verify','Verify','Verify or reject proof of a tax declaration']])
  ],
  'Expenses':[
    rbArea('Claims',[['expense.claim.view','View','View expense claims'],['expense.claim.submit','Submit','Submit an expense claim'],['expense.claim.create.others','File for others','File a claim on behalf of another employee'],['expense.claim.withdraw','Withdraw own','Withdraw an own claim before it is final'],['expense.claim.withdraw.others','Withdraw for others','Withdraw or answer a Follow-Up on behalf of an employee',1],['expense.claim.approve','Approve','Approve or reject an expense claim',1],['expense.claim.pay','Mark paid','Mark an approved claim as paid',1],['expense.claim.view.team','View team','View claims of the employees you manage'],['expense.claim.view.all','View all','View every claim in the entity'],['expense.export','Export','Export claims and reimbursements'],['expense.claim.admin.edit','Administrative edit','Correct a claim in approval; approval rules re-run',1]]),
    rbArea('Capping limits / expense policies',[['expense.policy.list','Listing','Open the Capping Limit listing'],['expense.policy.view','View','View expense policies and limits'],['expense.policy.manage','Manage','Create, edit or version a policy',1],['expense.policy.activate','Activate','Activate or deactivate a policy',1],['expense.policy.util.view','Utilization','View employee-wise utilization'],['expense.policy.export','Export','Export policies and utilization'],['expense.fx.manage','Exchange rates','Maintain exchange rates (Opendhi)',1]]),
    rbArea('Approvals',[['expense.approval.queue','Approval queue','See My Approvals'],['expense.approval.reassign','Reassign','Reassign an active approval stage',1],['expense.approval.intervene','Intervene','Decide on any active stage without being assigned (audited; never on own claims)',1],['expense.approval.config.view','View routes','View approval workflows'],['expense.approval.config.manage','Manage routes','Create or version approval workflows',1],['expense.approval.config.activate','Activate routes','Activate or deactivate approval workflows',1]]),
    rbArea('Reimbursements',[['expense.reimb.view.all','View','View reimbursements'],['expense.reimb.process','Process','Choose a payment route, hold, fail or cancel',1],['expense.reimb.settle','Record settlement','Record a verified settlement',1]]),
    rbArea('Audit',[['expense.audit.view','View','View approval and payment audit history']]),
    rbArea('Categories',[['expense.category.manage','Manage','Add or retire an expense category']])
  ],
  /* Advances & Imprest (js/advances.js, FR-AI-22). Nobody issues, verifies
     or settles money for themselves; maker-checker is set per entity. */
  'Advances':[
    rbArea('Advance requests',[['advance.view.own','View own','View own advance requests and assigned imprest funds'],['advance.view.team','View team','View advances of the employees you manage'],['advance.view.all','View all','View every advance and imprest fund in the entity'],['advance.create','Create','Create an own advance request'],['advance.create.others','Create for others','Create an advance request for another employee'],['advance.edit','Edit','Edit an eligible draft'],['advance.submit','Submit','Submit an advance request'],['advance.withdraw','Withdraw own','Withdraw an own request before it is final'],['advance.withdraw.others','Withdraw for others','Withdraw or answer a Follow-Up on behalf of an employee',1],['advance.cancel','Cancel authorization','Cancel an approved but unissued advance',1]]),
    rbArea('Advance approvals',[['advance.approve','Approve','Approve, partially approve, reject or send back an assigned request',1],['advance.reassign','Reassign','Reassign an active approval stage',1],['advance.intervene','Intervene','Decide on any active stage without being assigned (audited; never on own requests)',1]]),
    rbArea('Advance configuration',[['advance.policy.manage','Policies','Create, edit, activate or deactivate advance policies',1],['advance.settings.manage','Types, routes & settings','Configure advance types, approval routes, maker-checker and eligibility',1]]),
    rbArea('Disbursement',[['advance.disbursement.manage','Initiate','Initiate, fail or cancel a disbursement',1],['advance.disbursement.verify','Verify','Verify an issued disbursement, or reverse one',1]]),
    rbArea('Settlement',[['advance.settlement.submit','Submit settlement','Link expenses and record a return on an own advance'],['advance.settlement.review','Review settlement','Review a settlement and extend its due date',1],['advance.return.manage','Returns','Record and verify returns of unused money',1],['advance.recovery.manage','Raise & collect recoveries','Raise a recovery and record its verified collections',1],['advance.recovery.approve','Approve recoveries','Authorize a recovery someone else raised (never your own advance)',1],['advance.close','Close','Close a fully accounted advance or imprest fund',1]]),
    rbArea('Imprest',[['advance.imprest.manage','Manage funds','Create imprest funds, hold, close and transfer custodianship',1],['advance.replenish','Request replenishment','Request a top-up of an imprest fund you hold as its assigned custodian'],['advance.replenish.others','Request on behalf','Request a top-up on behalf of a fund\'s assigned custodian, with a recorded reason; approvals and maker-checker still apply',1],['advance.replenish.approve','Approve replenishment','Approve imprest initial funding and replenishment requests (never your own)',1]]),
    rbArea('Advance reports',[['advance.report.view','View reports','Open Expenses & Advances reports'],['advance.report.export','Export','Export reports within the data already visible'],['advance.audit.view','Audit','View advance and imprest audit history']])
  ],
  /* Funding & Budgets (js/budgets.js, FR-FB-21). Approving, verifying and
     reversing are rights given by assignment (workspace teams), never by
     the Finance role alone; nobody approves or verifies their own request. */
  'Budgets':[
    rbArea('Budgets',[['budget.view','View','View budgets you own, hold an allocation in, prepared or are approving'],['budget.view.all','View all','View every budget and allocation in the entity'],
      ['budget.create','Create','Create a budget draft'],['budget.manage','Manage','Edit budgets, budget settings, types and routes; request a financial-year close',1],
      ['budget.submit','Submit','Submit a budget for approval'],['budget.approve','Approve','Approve, reject or send back an assigned budget or year close',1],
      ['budget.approval.intervene','Intervene','Decide an active budget approval stage without being assigned, only where you meet that stage\'s team or role, approval right and independence (audited, with a reason)',1],
      ['budget.activate','Activate','Activate or deactivate an approved budget',1],['budget.allocate','Allocate','Configure the allocation lines of a draft budget',1]]),
    rbArea('Budget changes',[['budget.revise.request','Request revision','Request a revision of an approved budget'],['budget.revise.approve','Approve revision','Approve an assigned budget revision',1],
      ['budget.transfer.request','Request transfer','Request a transfer between allocations'],['budget.transfer.approve','Approve transfer','Approve an assigned budget transfer',1],
      ['budget.exception.request','Request exception','Request a budget exception (employees: for their own blocked draft)'],['budget.exception.approve','Approve exception','Approve an assigned budget exception',1]]),
    rbArea('Budget reports',[['budget.util.view','Utilization','View budget utilization'],['budget.report.view','View reports','Open Funding & Budgets reports'],
      ['budget.report.export','Export','Export budget reports within the data already visible'],['budget.audit.view','Audit','View budget audit history']]),
    rbArea('Corporate funding',[['funding.source.manage','Sources','Create, edit, activate or deactivate funding sources',1],['funding.transaction.create','Record','Record funding entries and link verified payouts',1],
      ['funding.transaction.verify','Verify','Verify or reject a funding entry someone else recorded',1],['funding.transaction.reverse','Reverse','Record an authorized reversal of a verified entry',1],
      ['funding.report.view','View reports','Open funding reports'],['funding.report.export','Export','Export funding reports within the data already visible']])
  ],
  /* Corporate Cards (js/cards.js, FR-CC-23). Approving a card request, a control
     relaxation or a load, and verifying a load's execution, are rights given by
     assignment (workspace teams, the reporting line); nobody approves or verifies
     their own request or a card that benefits them. */
  'Cards':[
    rbArea('Card programmes',[['card.programme.view','View','View card programmes and their settings'],['card.programme.manage','Configure','Create or edit card programmes, their eligibility, wallets and status',1],
      ['card.demo.manage','Presentation mode','Switch illustrative provider activity on or off in an Opendhi presentation company',1]]),
    rbArea('Cards and requests',[['card.view.own','View own','View your own cards, card requests and loads'],['card.view.team','View team','View the cards and requests of employees you manage'],
      ['card.view.all','View all','View every card, card request and load in the entity'],['card.request.create','Request own card','Request a card for yourself'],
      ['card.request.others','Request on behalf','Request a card on behalf of an eligible employee; you and the employee are both recorded',1],['card.request.approve','Approve requests','Approve, reject or send back an assigned card request',1],
      ['card.approval.intervene','Intervene','Decide an active card approval stage without being assigned, only where you meet that stage\'s team or role, approval right and independence (audited, with a reason)',1]]),
    rbArea('Enrollment and lifecycle',[['card.enrollment.manage','Enrollment','Track enrollment, KYC, delivery and activation of approved requests',1],['card.assign','Assign','Assign an issued card record to its approved employee',1],
      ['card.lifecycle.manage','Lifecycle','Suspend, block, close or record a provider status of a card',1],['card.demo.simulate','Record illustrative activity','Record a clearly labelled illustrative provider event in a presentation company',1],
      ['card.safety.report','Report loss / hold','Report a lost or stolen card or request a temporary hold (own card, or cards in your scope)'],
      ['card.replacement.request','Request replacement','Request a replacement of your own card'],['card.replacement.manage','Replacements','Raise and process card replacements',1],
      ['card.clearance.manage','Exit clearance','Record card clearance or an authorized exception when a cardholder exits',1]]),
    rbArea('Card controls',[['card.control.view','View','View card controls and limits'],['card.control.manage','Manage','Set programme defaults and card-specific restrictions',1],
      ['card.control.approve','Approve relaxations','Approve an assigned relaxation of card controls',1]]),
    rbArea('Card loads',[['card.load.create','Create','Create card-load requests and record their execution',1],['card.load.approve','Approve','Approve, reject or send back an assigned card load',1],
      ['card.load.verify','Verify execution','Verify the external execution of a load someone else recorded',1],['card.load.bulk','Bulk loads','Upload and submit bulk card loads',1],
      ['card.enrollment.bulk','Bulk enrollment','Upload and submit bulk card enrollment requests',1]]),
    rbArea('Card transactions',[['card.transaction.view.own','View own','View the transactions on your own cards'],['card.transaction.view.team','View team','View the corporate-expense card transactions of employees you manage (never benefit-wallet activity)'],
      ['card.transaction.view.all','View all','View every card transaction in the entity'],['card.transaction.record','Record','Record a missing external card transaction from its evidence',1],
      ['card.transaction.verify','Verify','Independently verify card transactions and postings recorded by someone else',1],
      ['card.refund.verify','Verify refunds','Independently verify card refunds, reversals and credits recorded by someone else',1],
      ['card.transaction.match','Match','Match card transactions to expense lines, decide suggested matches and correct incorrect matches',1],
      ['card.csx.resolve','Resolve card spend','Propose and record card spend exception resolutions: company acceptance, recovery, refund or dispute credit',1]]),
    rbArea('Card disputes',[['card.dispute.raise','Raise own','Raise a dispute on your own posted card transaction and follow it'],['card.dispute.view','View','View card disputes and their history (read only)'],
      ['card.dispute.manage','Manage','Review disputes, record provider cases and outcomes, link verified credits and close disputes; raise on behalf of employees',1]]),
    rbArea('Card statements',[['card.reconciliation.view','View','View card statement imports, their rows and reconciliation status'],
      ['card.transaction.import','Import','Import card statements, correct or exclude rows and decide Card Mapping Review',1],
      ['card.statement.verify','Verify','Independently verify card statements prepared by someone else',1],
      ['card.reconciliation.signoff','Sign off reconciliation','Independently sign off card statement reconciliations and approve their financial adjustments (given through the Funding Verifiers team)',1]]),
    rbArea('Card reports',[['card.report.view','View reports','Open Corporate Cards reports'],['card.report.export','Export','Export card reports within the data already visible'],['card.audit.view','Audit','View card audit history']])
  ],
  /* Wallet & Benefits (js/wallet-benefits.js). Approving a batch or a tax
     threshold is never open to the person who prepared it. */
  'Benefits':[
    rbArea('Wallet configuration',[['benefit.wallet.view','View','View wallet configurations'],['benefit.wallet.manage','Manage','Add or edit a wallet configuration',1],['benefit.wallet.activate','Activate','Activate or deactivate a wallet configuration',1]]),
    rbArea('Benefit categories',[['benefit.category.view','View','View benefit categories'],['benefit.category.manage','Manage','Create, edit, activate or deactivate a benefit category',1]]),
    rbArea('Benefit policies',[['benefit.policy.view','View','View benefit policies'],['benefit.policy.manage','Manage','Create or edit a benefit policy and its versions',1],['benefit.policy.activate','Activate','Activate or deactivate a benefit policy',1]]),
    rbArea('Entitlements',[['benefit.entitlement.view','View','View employee entitlements'],['benefit.allocation.view','View allocations','View allocation batches'],['benefit.allocation.generate','Generate','Generate, recalculate or cancel planned allocations',1],['benefit.entitlement.export','Export','Export entitlements']]),
    rbArea('Allocation approval',[['benefit.allocation.approve','Approve','Approve or reject a planned allocation batch someone else prepared',1]]),
    rbArea('Overrides',[['benefit.override.view','View','View employee overrides'],['benefit.override.manage','Manage','Create, edit or end an employee override',1]]),
    rbArea('Tax thresholds',[['benefit.tax.view','View','View advisory tax thresholds'],['benefit.tax.manage','Manage','Draft and submit a tax threshold'],['benefit.tax.approve','Approve','Approve or reject a tax threshold (Finance)',1]]),
    rbArea('Configuration logs',[['benefit.log.view','View','View Wallet & Benefits logs and history']]),
    rbArea('ONC card enrollment',[['onc.enroll.view','View','View an employee\'s ONC card enrollment'],['onc.enroll.manage','Manage','Enroll an employee, prefill details, set benefits eligibility',1],['onc.enroll.review','Review','Approve or reject an employee\'s enrollment changes',1],['onc.enroll.self','Self-service','Complete and accept own enrollment'],['onc.config.manage','Configure','Set which enrollment fields the entity shows and requires',1],['onc.registry.manage','Provider registry','Maintain a card provider\'s field codes and values (Opendhi)',1],['onc.programme.manage','Card programmes','Enable or disable a card programme for the entity (Opendhi)',1]])
  ]
};
const RB_MODULES=Object.keys(RB_CATALOGUE);
/* Platform administration (OpenDhi). Nobody without an Opendhi role holds these, whatever a template says
   (enforced in js/ems-access.js emsPerms): creating companies, purchased-module switches, permission
   templates, Opendhi roles, the provider connection and registry, and the presentation mode (EMP-N06). */
const RB_PLATFORM_CODES=['platform.module.control','foundation.entity.create','platform.template.manage','platform.access.manage','onc.registry.manage','onc.programme.manage','card.demo.manage'];
/* code -> {c,v,d,s,module,area}, built once. */
const RB_PERM={};
RB_MODULES.forEach(function(m){RB_CATALOGUE[m].forEach(function(a){a.items.forEach(function(p){
  RB_PERM[p.c]=Object.assign({module:m,area:a.area},p);
});});});
function rbModuleTotal(m){return RB_CATALOGUE[m].reduce(function(n,a){return n+a.items.length;},0);}

const RB_TILES=['Active','Inactive'];
const RB_MOVES={'Active':['Inactive','Deleted'],'Inactive':['Active','Deleted'],'Deleted':[]};
const RB_MOVE_LABELS={'Active':'Reactivate','Inactive':'Deactivate','Deleted':'Delete'};

/* ── Seed data (the old screen's rows, and the rest of the 17) ─────────── */
function rbSeed(id,name,module,perms,roles,status,by,at,desc){
  return {id:id,key:id,name:name,module:module,perms:perms,roles:roles||[],status:status,createdBy:by,createdAt:at,desc:desc||''};
}
const rbacTemplatesData=[
  rbSeed(1,'Admin / Employee Listing','H2R',['h2r.employee.view'],['HR Executive','Team Lead'],'Active','Tarak Swain','4 Feb 2026 | 10:12:00 AM','Read-only access to the people directory.'),
  rbSeed(2,'Admin / Employee Manager','H2R',['h2r.employee.view','h2r.employee.create','h2r.employee.manage'],['HR Manager','Super Admin'],'Active','Tarak Swain','4 Feb 2026 | 10:20:00 AM','Add and maintain employee records.'),
  rbSeed(3,'Leave Management','H2R',['foundation.policy.publish','h2r.policy.view','h2r.policy.assigned','h2r.policy.manage','h2r.leave.view','h2r.leave.apply','h2r.leave.approve','h2r.leave.carry'],['HR Manager'],'Active','Tarak Swain','6 Feb 2026 | 02:45:00 PM','Owns leave policy and the yearly balance run.'),
  rbSeed(4,'Leave apply','H2R',['h2r.leave.view','h2r.leave.apply','h2r.leave.approve','h2r.leave.carry'],['Reporting Manager'],'Active','Tarak Swain','6 Feb 2026 | 03:05:00 PM',''),
  rbSeed(5,'Employee Self Service','H2R',['h2r.employee.own','time.timesheet.own','h2r.holiday.view','support.chat','support.ticket','h2r.asset.view','h2r.asset.confirm','h2r.document.view','h2r.document.upload','h2r.leave.view','h2r.leave.apply','h2r.bank.view','h2r.dashboard.view','h2r.timeline.view','h2r.policy.view','payroll.payslip.own','expense.claim.view','expense.claim.submit'],['Employee'],'Active','Syed Ayaz','10 Feb 2026 | 09:30:00 AM','What every employee gets on day one.'),
  rbSeed(6,'Document Verification','H2R',['h2r.document.view','h2r.document.review','h2r.certificate.view','h2r.certificate.update'],['HR Executive'],'Active','Syed Ayaz','12 Feb 2026 | 11:00:00 AM','Checks uploaded documents and certificates.'),
  rbSeed(7,'Certificates Admin','H2R',['h2r.certificate.view','h2r.certificate.create','h2r.certificate.update','h2r.certificate.delete'],[],'Active','Syed Ayaz','12 Feb 2026 | 11:25:00 AM',''),
  rbSeed(8,'Reporting Structure','H2R',['h2r.reporting.view','h2r.reporting.update','h2r.team.view','h2r.team.create'],['HR Manager','Team Lead'],'Active','Meera Iyer','18 Feb 2026 | 04:10:00 PM','Teams and reporting lines.'),
  rbSeed(9,'Offboarding','H2R',['h2r.exit.view','h2r.exit.initiate','h2r.exit.settle','h2r.employee.view','h2r.asset.view'],['HR Manager'],'Active','Meera Iyer','20 Feb 2026 | 12:00:00 PM','Runs an exit through to full and final settlement.'),
  rbSeed(10,'Payroll Processor','Payroll',['payroll.run.view','payroll.run.create','payroll.run.lock','payroll.payslip.view','payroll.payhead.view','h2r.bank.view'],['Payroll Executive'],'Active','Meera Iyer','2 Mar 2026 | 10:00:00 AM','Prepares the monthly pay run.'),
  rbSeed(11,'Payroll Approver','Payroll',['payroll.run.view','payroll.run.approve','payroll.payslip.view','payroll.payslip.publish'],['Finance Admin'],'Active','Meera Iyer','2 Mar 2026 | 10:30:00 AM','Signs off a pay run and releases payslips.'),
  rbSeed(12,'Payslip Viewer','Payroll',['payroll.payslip.own'],['Employee','Contractor'],'Active','Meera Iyer','3 Mar 2026 | 09:15:00 AM',''),
  rbSeed(13,'Tax Verifier','Payroll',['payroll.tax.view','payroll.tax.verify'],[],'Inactive','Meera Iyer','5 Mar 2026 | 03:40:00 PM','Replaced by the Payroll Processor template this year.'),
  rbSeed(14,'Expense Claimant','Expenses',['expense.claim.view','expense.claim.submit','expense.policy.view','expense.claim.withdraw'],['Employee'],'Active','Tarak Swain','12 Mar 2026 | 11:20:00 AM',''),
  rbSeed(15,'Expense Approver','Expenses',['expense.claim.view','expense.claim.approve','expense.policy.view','expense.policy.util.view','expense.approval.queue'],['Reporting Manager','Finance Admin'],'Active','Tarak Swain','12 Mar 2026 | 11:40:00 AM','Approves claims up to the capping limit.'),
  rbSeed(16,'Organisation Setup','Foundation',['foundation.entity.view','foundation.entity.update','foundation.branch.view','foundation.branch.manage','foundation.dept.view','foundation.dept.manage','foundation.desig.view','foundation.desig.manage'],['Company Admin','Super Admin','HR Admin'],'Active','Tarak Swain','20 Jan 2026 | 10:00:00 AM','Entity, branches, departments and designations.'),
  rbSeed(17,'User Admin','Foundation',['foundation.user.view','foundation.user.invite','foundation.user.deactivate','foundation.role.view','foundation.role.manage'],['Company Admin'],'Active','Tarak Swain','20 Jan 2026 | 10:30:00 AM','Invites users and applies templates to roles.'),
  rbSeed(18,'Benefits Administrator','Benefits',['benefit.wallet.view','benefit.wallet.manage','benefit.wallet.activate','benefit.category.view','benefit.category.manage','benefit.policy.view','benefit.policy.manage','benefit.policy.activate','benefit.entitlement.view','benefit.allocation.view','benefit.allocation.generate','benefit.entitlement.export','benefit.override.view','benefit.override.manage','benefit.tax.view','benefit.tax.manage','benefit.log.view','onc.enroll.view','onc.enroll.manage','onc.enroll.review','onc.config.manage'],['HR Manager'],'Active','Pallavi Parate','05 Nov 2026 | 10:00:00 AM','Configures wallets, categories, policies and overrides, and generates planned allocations.'),
  rbSeed(19,'Benefits Approver','Benefits',['benefit.wallet.view','benefit.category.view','benefit.policy.view','benefit.entitlement.view','benefit.allocation.view','benefit.allocation.approve','benefit.entitlement.export','benefit.override.view','benefit.tax.view','benefit.tax.manage','benefit.tax.approve','benefit.log.view','onc.enroll.view'],['Finance Admin'],'Active','Meera Iyer','05 Nov 2026 | 10:05:00 AM','Checks and approves allocation batches and tax thresholds prepared by someone else.'),
  /* Expense Management by role (FR-CA): Switch Role reads these through each
     template's Roles - no rights are listed in code. */
  rbSeed(20,'Expense Management Administrator','Expenses',['expense.claim.view','expense.claim.view.all','expense.claim.submit','expense.claim.create.others','expense.claim.withdraw','expense.claim.withdraw.others','expense.claim.approve','expense.claim.pay','expense.claim.admin.edit','expense.export','expense.policy.view','expense.policy.manage','expense.policy.activate','expense.policy.util.view','expense.policy.export','expense.fx.manage','expense.approval.queue','expense.approval.reassign','expense.approval.intervene','expense.approval.config.view','expense.approval.config.manage','expense.approval.config.activate','expense.reimb.view.all','expense.reimb.process','expense.reimb.settle','expense.audit.view'],['Super Admin'],'Active','Shaun Mathew','07 Nov 2026 | 09:00:00 AM','Every Expense Management screen and action, including audited interventions on any approval stage. Never on own claims.'),
  rbSeed(21,'Benefits & Card Administrator','Benefits',['benefit.wallet.view','benefit.wallet.manage','benefit.wallet.activate','benefit.category.view','benefit.category.manage','benefit.policy.view','benefit.policy.manage','benefit.policy.activate','benefit.entitlement.view','benefit.allocation.view','benefit.allocation.generate','benefit.allocation.approve','benefit.entitlement.export','benefit.override.view','benefit.override.manage','benefit.tax.view','benefit.tax.manage','benefit.log.view','onc.enroll.view','onc.enroll.manage','onc.enroll.review','onc.config.manage','onc.registry.manage','onc.programme.manage'],['Super Admin'],'Active','Shaun Mathew','07 Nov 2026 | 09:05:00 AM','Wallets, benefits, allocations, tax thresholds, card programmes, provider registry and enrollment.'),
  rbSeed(22,'Platform Module Control','Foundation',['platform.module.control'],['Super Admin'],'Active','Shaun Mathew','07 Nov 2026 | 09:10:00 AM','Switch Expense Management on or off for a client (Opendhi).'),
  rbSeed(23,'Expense HR Administrator','Expenses',['expense.claim.view','expense.claim.view.all','expense.claim.submit','expense.claim.create.others','expense.claim.withdraw','expense.claim.withdraw.others','expense.claim.approve','expense.export','expense.policy.view','expense.policy.manage','expense.policy.activate','expense.policy.util.view','expense.policy.export','expense.approval.queue','expense.approval.config.view','expense.audit.view'],['HR Admin'],'Active','Shaun Mathew','07 Nov 2026 | 09:15:00 AM','Policies, claims across the entity, approvals where assigned, withdrawal on behalf.'),
  rbSeed(24,'Expense Finance Administrator','Expenses',['expense.claim.view','expense.claim.view.all','expense.claim.submit','expense.claim.create.others','expense.claim.withdraw','expense.claim.approve','expense.claim.pay','expense.export','expense.policy.view','expense.policy.util.view','expense.policy.export','expense.approval.queue','expense.approval.config.view','expense.reimb.view.all','expense.reimb.process','expense.reimb.settle','expense.audit.view'],['Finance Admin'],'Active','Shaun Mathew','07 Nov 2026 | 09:20:00 AM','Approvals where assigned, reimbursements, payment routes and verified settlements.'),
  rbSeed(25,'Expense Team Approver','Expenses',['expense.claim.view','expense.claim.view.team','expense.claim.submit','expense.claim.withdraw','expense.claim.approve','expense.policy.view','expense.approval.queue'],['Reporting Manager'],'Active','Shaun Mathew','07 Nov 2026 | 09:25:00 AM','Own claims and the claims of the employees they manage; approvals where assigned.'),
  rbSeed(26,'Benefits Self Service','Benefits',['benefit.entitlement.view','onc.enroll.view','onc.enroll.self'],['Employee'],'Active','Shaun Mathew','07 Nov 2026 | 09:30:00 AM','Own entitlements and own card enrollment.'),
  rbSeed(27,'Expense Compliance Review','Expenses',['expense.claim.view','expense.claim.view.all','expense.claim.submit','expense.claim.withdraw','expense.policy.view'],['Compliance Officer'],'Active','Shaun Mathew','07 Nov 2026 | 09:35:00 AM','Read every claim for review; own claims.'),
  rbSeed(28,'Card Enrollment Viewer','Benefits',['onc.enroll.view'],['Compliance Officer'],'Active','Shaun Mathew','07 Nov 2026 | 09:40:00 AM','View card enrollment for KYC review.'),
  rbSeed(29,'Expense IT Viewer','Expenses',['expense.claim.view','expense.claim.view.all','expense.claim.submit','expense.claim.withdraw','expense.policy.view'],['IT Admin'],'Active','Shaun Mathew','07 Nov 2026 | 09:45:00 AM','Read every claim; own claims.'),
  /* App-wide access by role: which pages each role opens and what it may do
     there. Navigation, page guards and actions read these - no role is
     checked in code. Super Admin holds every permission; independent-approval
     rules (never on what you prepared or benefit from) still apply. */
  rbSeed(30,'Super Admin Full Access','Foundation',Object.keys(RB_PERM),['Super Admin'],'Active','Shaun Mathew','07 Nov 2026 | 10:00:00 AM','Every permission in the catalogue. Maker-checker and separation of duties still apply.'),
  rbSeed(31,'HR Admin Access','H2R',['h2r.employee.view','h2r.employee.create','h2r.employee.bulk','h2r.employee.manage','h2r.team.view','h2r.team.create','h2r.reporting.view','h2r.reporting.update',
    'contract.view','contract.template.view','h2r.hrdoc.view','time.timesheet.view','time.timesheet.approve','time.timesheet.unlock','h2r.leave.view','h2r.leave.view.all','h2r.leave.apply','h2r.leave.approve',
    'h2r.leave.policy.view','h2r.policy.view','h2r.policy.manage','h2r.holiday.view','h2r.holiday.manage','payroll.run.view','payroll.payhead.view','compliance.item.view','compliance.rates.view',
    'foundation.entity.view','foundation.user.view','admin.asset.view','admin.itaccess.view','announcement.manage','h2r.lifecycle.hr','h2r.employee.own','time.timesheet.own','support.chat','support.ticket'],
    ['HR Admin'],'Active','Shaun Mathew','07 Nov 2026 | 10:05:00 AM','People, time, leave and HR steps.'),
  rbSeed(32,'Finance Admin Access','Finance',['h2r.employee.view','contract.view','payroll.run.view','payroll.payhead.view','finance.payment.view','finance.payment.manage','foundation.entity.view',
    'h2r.lifecycle.finance','h2r.employee.own','time.timesheet.own','h2r.leave.apply','h2r.holiday.view','support.chat','support.ticket'],
    ['Finance Admin'],'Active','Shaun Mathew','07 Nov 2026 | 10:10:00 AM','Payroll, payments and Finance steps; own records.'),
  rbSeed(33,'Reporting Manager Access','H2R',['h2r.employee.view.team','h2r.team.view','time.timesheet.own','time.timesheet.approve','time.timesheet.unlock','h2r.leave.view.team','h2r.leave.apply',
    'h2r.holiday.view','h2r.lifecycle.manager','h2r.employee.own','support.chat','support.ticket'],
    ['Reporting Manager'],'Active','Shaun Mathew','07 Nov 2026 | 10:15:00 AM','Own records plus the team: reports\' records and leave, timesheet approval, handover steps.'),
  rbSeed(34,'Compliance Officer Access','Governance',['h2r.employee.view','contract.view','h2r.hrdoc.view','compliance.item.view','compliance.item.manage','compliance.rates.view',
    'h2r.lifecycle.compliance','h2r.employee.own','time.timesheet.own','h2r.leave.apply','h2r.holiday.view','support.chat','support.ticket'],
    ['Compliance Officer'],'Active','Shaun Mathew','07 Nov 2026 | 10:20:00 AM','Compliance Hub, verification steps; own records.'),
  rbSeed(35,'IT Admin Access','Governance',['h2r.employee.view','admin.asset.view','admin.asset.manage','admin.itaccess.view','admin.itaccess.manage','foundation.user.view',
    'h2r.lifecycle.it','h2r.employee.own','time.timesheet.own','h2r.leave.apply','h2r.holiday.view','support.chat','support.ticket'],
    ['IT Admin'],'Active','Shaun Mathew','07 Nov 2026 | 10:25:00 AM','Assets, IT access, users and IT steps; own records.'),
  /* Advances & Imprest by role (FRD FR-AI §5.2). Configuration stays with
     Super Admin until someone is granted it; "permission-based" rights in
     the matrix are left to the templates an administrator adds. */
  rbSeed(36,'Advance Requester','Advances',['advance.view.own','advance.create','advance.edit','advance.submit','advance.withdraw','advance.settlement.submit'],
    ['Employee'],'Active','Shaun Mathew','07 Nov 2026 | 11:00:00 AM','Own advance requests and own settlements.'),
  rbSeed(37,'Advance Team Approver','Advances',['advance.view.own','advance.view.team','advance.create','advance.edit','advance.submit','advance.withdraw','advance.settlement.submit','advance.approve'],
    ['Reporting Manager'],'Active','Shaun Mathew','07 Nov 2026 | 11:05:00 AM','Own advances, the team\'s advances, approval where assigned.'),
  rbSeed(38,'Advance Finance Administrator','Advances',['advance.view.own','advance.view.all','advance.create','advance.create.others','advance.edit','advance.submit','advance.withdraw','advance.withdraw.others',
    'advance.cancel','advance.approve','advance.reassign','advance.disbursement.manage','advance.disbursement.verify','advance.settlement.submit','advance.settlement.review','advance.return.manage',
    'advance.recovery.manage','advance.recovery.approve','advance.close','advance.imprest.manage','advance.replenish.approve','advance.report.view','advance.report.export','advance.audit.view'],
    ['Finance Admin'],'Active','Shaun Mathew','07 Nov 2026 | 11:10:00 AM','Financial approval where assigned, disbursement, settlement review, returns, recoveries, imprest funds and reports. Never on own advances.'),
  rbSeed(39,'Advance HR Administrator','Advances',['advance.view.own','advance.view.all','advance.create','advance.create.others','advance.edit','advance.submit','advance.withdraw','advance.withdraw.others',
    'advance.approve','advance.settlement.submit','advance.report.view','advance.audit.view'],
    ['HR Admin'],'Active','Shaun Mathew','07 Nov 2026 | 11:15:00 AM','Requests on behalf of employees, exit and transfer follow-up, approval where assigned, reports.'),
  rbSeed(40,'Advance Compliance Review','Advances',['advance.view.own','advance.view.all','advance.create','advance.edit','advance.submit','advance.withdraw','advance.settlement.submit','advance.report.view','advance.audit.view'],
    ['Compliance Officer'],'Active','Shaun Mathew','07 Nov 2026 | 11:20:00 AM','Read every advance and its history for review; own advances.'),
  rbSeed(41,'Advance IT Self Service','Advances',['advance.view.own','advance.create','advance.edit','advance.submit','advance.withdraw','advance.settlement.submit'],
    ['IT Admin'],'Active','Shaun Mathew','07 Nov 2026 | 11:25:00 AM','Own advances only.'),
  /* Given through the Imprest Custodians workspace team, not a role: whoever
     is made custodian is authorized here, whatever role they work in. */
  rbSeed(42,'Imprest Custodian','Advances',['advance.view.own','advance.settlement.submit','advance.replenish'],
    [],'Active','Shaun Mathew','07 Nov 2026 | 11:30:00 AM','Hold an imprest fund: spend from it, account for it and request its replenishment. Granted only through the Imprest Custodians workspace team: membership is what authorizes someone to be a custodian.'),
  /* Funding & Budgets (FR-FB §25, decisions of 7 Nov 2026). Finance manages
     within its entity; approval, verification and reversal come only from
     the workspace teams below. Reporting managers approve the budgets they
     are routed; budget owners act on what they own. HR and IT get nothing. */
  rbSeed(43,'Budget & Funding Administrator','Budgets',['budget.view','budget.view.all','budget.create','budget.manage','budget.submit','budget.activate','budget.allocate',
    'budget.revise.request','budget.transfer.request','budget.exception.request','budget.util.view','budget.report.view','budget.report.export','budget.audit.view',
    'funding.source.manage','funding.transaction.create','funding.report.view','funding.report.export'],
    ['Finance Admin'],'Active','Shaun Mathew','07 Nov 2026 | 01:30:00 PM','Prepare budgets and allocations, request changes, configure funding sources and record funding. No approval, verification or reversal: those are assigned through teams.'),
  rbSeed(44,'Budget Approver','Budgets',['budget.view','budget.util.view','budget.approve','budget.revise.approve','budget.transfer.approve','budget.exception.approve','budget.report.view'],
    [],'Active','Shaun Mathew','07 Nov 2026 | 01:35:00 PM','Independent Finance approval of budgets, revisions, transfers, exceptions and year closes. Given only through the Budget Approvers workspace team.'),
  rbSeed(45,'Funding Verifier','Budgets',['funding.transaction.verify','funding.transaction.reverse','funding.report.view'],
    [],'Active','Shaun Mathew','07 Nov 2026 | 01:40:00 PM','Verify or reject funding entries recorded by someone else, and record authorized reversals. Given only through the Funding Verifiers workspace team.'),
  rbSeed(46,'Budget Owner','Budgets',['budget.view','budget.util.view','budget.report.view','budget.revise.request','budget.transfer.request','budget.exception.request','budget.exception.approve'],
    [],'Active','Shaun Mathew','07 Nov 2026 | 01:45:00 PM','Track the budgets and allocations you are named owner of, request changes to them and approve their exceptions when routed. Given through the Budget Owners workspace team.'),
  rbSeed(47,'Budget Approval (Reporting Manager)','Budgets',['budget.view','budget.approve'],
    ['Reporting Manager'],'Active','Shaun Mathew','07 Nov 2026 | 01:50:00 PM','Approve a budget owned by someone who reports to you, when the route assigns it. Sees only those budgets.'),
  rbSeed(48,'Budget Compliance Review','Budgets',['budget.view','budget.view.all','budget.util.view','budget.report.view','budget.audit.view','funding.report.view'],
    ['Compliance Officer'],'Active','Shaun Mathew','07 Nov 2026 | 01:55:00 PM','Read budgets, utilization, funding reports and audit history for review.'),
  rbSeed(49,'Budget Self Service','Budgets',['budget.exception.request'],
    ['Employee'],'Active','Shaun Mathew','07 Nov 2026 | 02:00:00 PM','Request a budget exception for your own blocked draft claim or advance. Budget pages stay hidden; the check shows on your own requests.'),
  /* Corporate Cards (FR-CC-23, decisions of 7 Nov 2026). Administrators run programmes, enrollment, cards
     and loads in their entity; approval and execution verification come only from assignment (the teams
     below and the reporting line). Employees see and act on their own cards only. */
  rbSeed(50,'Card Administrator','Cards',['card.programme.view','card.view.all','card.request.others','card.enrollment.manage','card.assign','card.lifecycle.manage','card.demo.simulate',
    'card.safety.report','card.replacement.manage','card.clearance.manage','card.control.view','card.control.manage','card.load.create','card.load.bulk','card.enrollment.bulk',
    'card.report.view','card.report.export','card.audit.view','card.transaction.view.all','card.transaction.record','card.reconciliation.view','card.transaction.import','card.transaction.match','card.csx.resolve','card.dispute.view','card.dispute.manage'],
    ['Finance Admin'],'Active','Shaun Mathew','07 Nov 2026 | 08:00:00 PM','Run card programmes day to day: requests on behalf, enrollment, card records, controls, loads and reports. No approval or execution verification: those are assigned through teams.'),
  rbSeed(51,'Card Enrollment (HR)','Cards',['card.view.all','card.request.others','card.enrollment.manage','card.enrollment.bulk','card.safety.report','card.clearance.manage','card.report.view'],
    ['HR Admin'],'Active','Shaun Mathew','07 Nov 2026 | 08:05:00 PM','Raise card requests for employees, follow their enrollment and record card clearance at exit.'),
  rbSeed(52,'Card Approver','Cards',['card.view.all','card.request.approve','card.control.approve','card.load.approve','card.report.view'],
    [],'Active','Shaun Mathew','07 Nov 2026 | 08:10:00 PM','Independent approval of card requests, control relaxations and card loads. Given only through the Card Approvers workspace team.'),
  rbSeed(53,'Card Load Verifier','Cards',['card.view.all','card.load.verify','card.report.view','card.transaction.view.all','card.transaction.verify','card.refund.verify','card.reconciliation.view','card.statement.verify','card.dispute.view'],
    [],'Active','Shaun Mathew','07 Nov 2026 | 08:15:00 PM','Verify the execution of card loads recorded by someone else. Given only through the Card Load Verifiers workspace team.'),
  rbSeed(54,'Card Approval (Reporting Manager)','Cards',['card.view.team','card.request.approve','card.control.approve','card.safety.report','card.transaction.view.team'],
    ['Reporting Manager'],'Active','Shaun Mathew','07 Nov 2026 | 08:20:00 PM','Approve the card requests and control relaxations of people who report to you when the route assigns them; see your team\'s cards.'),
  rbSeed(55,'Cardholder Self-Service','Cards',['card.view.own','card.request.create','card.safety.report','card.replacement.request','card.control.view','card.transaction.view.own','card.dispute.raise'],
    ['Employee','HR Admin','Finance Admin','Reporting Manager','Compliance Officer','IT Admin'],'Active','Shaun Mathew','07 Nov 2026 | 08:25:00 PM','Request your own card, follow it, report it lost or ask for a hold, and request a replacement - in whichever role you work.'),
  rbSeed(56,'Card Compliance Review','Cards',['card.view.all','card.programme.view','card.control.view','card.report.view','card.audit.view','card.transaction.view.all','card.reconciliation.view','card.dispute.view'],
    ['Compliance Officer'],'Active','Shaun Mathew','07 Nov 2026 | 08:30:00 PM','Read cards, programmes, controls, reports and audit history for review.')
];
/* EMP-N06: a client company administrator (Roles & Access 'Entity Super Admin', switch role Company Admin)
   manages their company's whole purchased EMS: every right the company's own roles hold (HR, Finance,
   Manager, Compliance, IT, Employee) plus company setup - never platform administration, the
   presentation mode, or the rights given only by team assignment (custodian, approver, verifier: those
   stay assignments, so no administrator becomes an approver automatically). Built once every module has
   added its rights to the templates. */
const RB_CLIENT_ROLES=['HR Admin','HR Manager','Finance Admin','Reporting Manager','Compliance Officer','IT Admin','Employee','Company Admin'];
const RB_COMPANY_SETUP=['foundation.entity.view','foundation.entity.update','foundation.policy.publish','foundation.branch.view','foundation.branch.manage','foundation.dept.view','foundation.dept.manage',
  'foundation.desig.view','foundation.desig.manage','foundation.user.view','foundation.user.invite','foundation.user.deactivate','foundation.role.view','foundation.role.manage',
  'expense.approval.config.manage','expense.approval.config.activate',   // company approval workflows
  'advance.policy.manage','advance.settings.manage','card.programme.manage'];   // company EMS configuration (the provider connection, exchange rates,
                                                                                 // categories and approval intervention stay with OpenDhi)
rbacTemplatesData.push(rbSeed(57,'Company Admin Access','Foundation',[],['Company Admin'],'Active','Shaun Mathew','08 Nov 2026 | 09:00:00 PM',
  'Everything a client company administrator manages for their own company. Platform administration stays with OpenDhi.'));
function rbCompanyAdminPerms(){
  const set={};
  rbacTemplatesData.forEach(function(t){if(t.id!==57&&t.status==='Active'&&(t.roles||[]).some(function(r){return RB_CLIENT_ROLES.indexOf(r)>=0;}))t.perms.forEach(function(c){set[c]=1;});});
  RB_COMPANY_SETUP.forEach(function(c){set[c]=1;});
  return Object.keys(set).filter(function(c){return RB_PERM[c]&&RB_PLATFORM_CODES.indexOf(c)<0&&c.indexOf('card.demo.')!==0;});
}
document.addEventListener('DOMContentLoaded',function(){const t=rbacTemplatesData.find(function(x){return x.id===57;});if(t&&!t.perms.length)t.perms=rbCompanyAdminPerms();});
/* The Capping Limit listing is for those who manage or review policies - the
   expense templates other than the claimant's. */
[15,20,23,24,25,27,29].forEach(function(id){const t=rbacTemplatesData.find(function(x){return x.id===id;});if(t&&t.perms.indexOf('expense.policy.list')<0)t.perms.unshift('expense.policy.list');});
let rbNextId=57;
/* The roles a template can be applied to - every role named on a template. */
function rbRoleNames(){
  const out=[];
  rbacTemplatesData.forEach(function(t){t.roles.forEach(function(r){if(out.indexOf(r)<0)out.push(r);});});
  return out.sort();
}

/* ── Derived values ────────────────────────────────────────────────────── */
function rbRec(id){return rbacTemplatesData.find(function(x){return x.id===id;})||null;}
function rbKey(t){return 'TPL-'+String(t.key).padStart(3,'0');}
function rbPerms(t){return t.perms.map(function(c){return RB_PERM[c];}).filter(Boolean);}
function rbSensitive(t){return rbPerms(t).filter(function(p){return p.s;}).length;}
/* Areas the template grants anything in, most permissions first. */
function rbAreas(t){
  const m={};
  rbPerms(t).forEach(function(p){const k=p.area;m[k]=(m[k]||0)+1;});
  return Object.keys(m).map(function(k){return {area:k,n:m[k]};}).sort(function(a,b){return b.n-a.n;});
}
/* Other modules the template reaches into besides its own. */
function rbAlsoModules(t){
  const out=[];
  rbPerms(t).forEach(function(p){if(p.module!==t.module&&out.indexOf(p.module)<0)out.push(p.module);});
  return out;
}
function rbPlural(n,w){return n+' '+w+(n===1?'':'s');}

const RB_ICO={
  hero:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>',
  layers:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="9 18 15 12 9 6"/></svg>',
  note:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
};

/* ── State ─────────────────────────────────────────────────────────────── */
let rbSelectedId=null,rbTab='basic-details',rbPermView='granted';
let rbModuleF='',rbStatusF='',rbQ='';
let rbEditing=false,rbDraft=null,rbDraftOrig='',rbModalOpen=false;

/* ── Filters ───────────────────────────────────────────────────────────── */
function rbRows(){
  return rbacTemplatesData.filter(function(t){
    if(t.status==='Deleted')return false;
    if(rbModuleF&&t.module!==rbModuleF)return false;
    if(rbStatusF&&t.status!==rbStatusF)return false;
    return true;
  });
}
/* Search also finds a template by what it grants: "approve" or
   "h2r.leave" lists every template that carries such a permission. */
function rbSearchRows(rows,q){
  if(!q)return rows;
  const n=q.toLowerCase();
  return rows.filter(function(t){
    if(lpSearchMatch(q,t))return true;
    if(t.roles.some(function(r){return r.toLowerCase().indexOf(n)>=0;}))return true;
    return rbPerms(t).some(function(p){return (p.c+' '+p.d+' '+p.area).toLowerCase().indexOf(n)>=0;});
  });
}
function rbToggleStat(v){rbStatusF=rbStatusF===v?'':v;rbSelectedId=null;renderADTPage();}
function applyRbFilters(){
  const v=getCSValue('rb-f-module');
  rbModuleF=v&&v!=='All Modules'?v:'';
  rbQ=lpSearchValue('rb-f-q');
  rbSelectedId=null;renderADTPage();
}
function resetRbFilters(){rbModuleF='';rbStatusF='';rbQ='';rbSelectedId=null;renderADTPage();}

/* ── Detail panel ──────────────────────────────────────────────────────── */
function rbDropEdit(){rbEditing=false;rbDraft=null;}
function openRbSidebar(id,tab){
  if(rbSelectedId!=null&&rbSelectedId!==id&&sbLeaveGuard('rb',function(){openRbSidebar(id,tab);}))return;
  if(rbSelectedId!==id)rbDropEdit();
  rbTab=tab||sbKeepTab(rbSelectedId,rbTab);rbSelectedId=id;
  const sb=document.getElementById('rb-split-sb');if(sb)sb.classList.add('open');
  isbTab('rb',renderRbSidebar);
  document.querySelectorAll('.rb-row').forEach(function(r){r.classList.toggle('lp-row-selected',r.id==='rb-row-'+id);});
}
function closeRbSidebar(){
  if(sbLeaveGuard('rb',closeRbSidebar))return;
  rbDropEdit();rbSelectedId=null;
  const sb=document.getElementById('rb-split-sb');if(sb)sb.classList.remove('open');
  document.querySelectorAll('.rb-row').forEach(function(r){r.classList.remove('lp-row-selected');});
}
function navRbTab(t){if(rbEditing&&!sbHasDraft('rb'))rbDropEdit();rbTab=t;isbTab('rb',renderRbSidebar);}
function rbSetPermView(v){rbPermView=v;isbTab('rb',renderRbSidebar);}

function rbSeedLogs(t){
  const p=String(t.createdAt).split(' | ');
  const fx=[{date:p[0],time:p[1]||'09:00:00 AM',user:t.createdBy,status:'Active',action:'Template created with '+rbPlural(t.perms.length,'permission')+'.'}];
  if(t.status==='Inactive')fx.unshift({date:p[0],time:'06:00:00 PM',user:'Shaun Mathew',status:'Inactive',action:t.desc||'No longer in use.'});
  return seedLogs(t,fx);
}
const RB_STEP_TITLE={'Active':'Template Active','Inactive':'Template Deactivated','Deleted':'Template Deleted'};
function rbWorkflow(t){
  const done=wfDoneFromLogs(rbSeedLogs(t),function(st){return RB_STEP_TITLE[st]||st;});
  const LEFT={'Inactive':[{title:'Reactivate or Delete',owner:'Company Admin'}]};
  return wfPlan(done,LEFT[t.status]||[]);
}
/* Deleting a template a role still uses would leave that role with nothing. */
function rbCanManage(){return typeof emsCan!=='function'||emsCan('platform.template.manage');}
function rbMoves(t){if(!rbCanManage())return [];
  return (RB_MOVES[t.status]||[]).filter(function(m){return m!=='Deleted'||!t.roles.length;});
}

function renderRbSidebar(){
  const t=rbRec(rbSelectedId);if(!t)return '';
  const tabs=[{id:'basic-details',label:'Basic Details'},{id:'permissions',label:'Permissions'},{id:'logs',label:'Logs'},{id:'history',label:'History'},{id:'workflow',label:'Workflow'}];
  const tabBar=axTabBar('rb',tabs,rbTab,'navRbTab','closeRbSidebar');
  const hero=function(editing,edit){return sbHero({icon:RB_ICO.hero,name:t.name,meta:[rbKey(t),t.module,rbPlural(t.perms.length,'permission')],
    status:axBadge(statusTone(t.status),t.status),editing:editing,onEdit:edit});};
  let body='';
  if((rbTab==='basic-details'||rbTab==='permissions')&&rbEditing){
    body=hero(true)+axInlineFormHTML(rbFieldsHTML(),'rbCancelEdit()','rbSaveEdit()');
  }else if(rbTab==='basic-details'){
    const sens=rbSensitive(t),also=rbAlsoModules(t);
    body=hero(false,rbCanManage()?'rbStartEdit()':'')
      +'<div class="lp-sb-detail-grid">'
      +axField(AX_ICO.fTag,'Template Name',t.name)
      +axField(RB_ICO.layers,'Module',t.module+(also.length?' <span class="ax-sub">Also uses '+also.join(', ')+'</span>':''))
      +axField(AX_ICO.fKey,'Permissions',rbPlural(t.perms.length,'permission')+' <span class="ax-sub">in '+rbPlural(rbAreas(t).length,'area')+' · <a class="rb-link" onclick="navRbTab(\'permissions\')">See the list</a></span>')
      +axField(AX_ICO.fShield,'Sensitive Permissions',sens?'<span class="rb-sens">'+RB_ICO.warn+sens+'</span> <span class="ax-sub">Delete, approve, publish or move money</span>':'None')
      +axField(AX_ICO.fUser,'Applied To',t.roles.length?t.roles.join(', '):'Not applied to any role yet',true)
      +axField(AX_ICO.fUser,'Created By',t.createdBy)
      +axField(AX_ICO.fCal,'Created On',String(t.createdAt).split(' | ')[0])
      +axField(RB_ICO.note,'Description',t.desc,true)
      +'</div>';
  }else if(rbTab==='permissions'){
    body=rbPermsViewHTML(t);
  }else if(rbTab==='logs'){
    body=lpLogsView(rbSeedLogs(t),rbLogFormHTML(t,rbMoves(t)),{labels:RB_MOVE_LABELS});
  }else if(rbTab==='history'){
    body=sbHistoryHTML(t);
  }else{
    body=wfTimelineHTML(rbWorkflow(t));
  }
  return tabBar+'<div class="lp-isb-body">'+body+'</div>';
}
/* Permissions tab: module, then area, then each permission as its sentence
   and code. "All" adds what the template does NOT grant, dimmed, so a
   reviewer can see the gap as well as the grant. */
function rbPermsViewHTML(t){
  const all=rbPermView==='all';
  const has={};t.perms.forEach(function(c){has[c]=1;});
  const mods=RB_MODULES.filter(function(m){return all?m===t.module||rbPerms(t).some(function(p){return p.module===m;}):rbPerms(t).some(function(p){return p.module===m;});});
  /* The template's own module first. */
  mods.sort(function(a,b){return (b===t.module)-(a===t.module);});
  const head='<div class="lp-sb-view-header"><span class="lp-sb-section-title">Permissions</span>'
    +'<div class="segmented is-compact rb-seg">'
      +'<button class="seg-btn'+(all?'':' active')+'" onclick="rbSetPermView(\'granted\')">Granted <span class="rb-seg-n">'+t.perms.length+'</span></button>'
      +'<button class="seg-btn'+(all?' active':'')+'" onclick="rbSetPermView(\'all\')">All in module</button>'
    +'</div>'
    +(rbCanManage()?sbEditBtn('rbStartEdit()'):'')+'</div>';
  return head+mods.map(function(m){
    const n=RB_CATALOGUE[m].reduce(function(k,a){return k+a.items.filter(function(p){return has[p.c];}).length;},0);
    const areas=RB_CATALOGUE[m].filter(function(a){return all||a.items.some(function(p){return has[p.c];});});
    return '<div class="rb-mod">'
      +'<div class="rb-mod-hd"><span class="rb-mod-name">'+m+'</span><span class="rb-mod-n">'+n+' of '+rbModuleTotal(m)+'</span>'
        +'<span class="rb-mod-bar"><span style="width:'+Math.round(n/rbModuleTotal(m)*100)+'%"></span></span></div>'
      +areas.map(function(a){
        const items=a.items.filter(function(p){return all||has[p.c];});
        return '<div class="rb-area"><div class="rb-area-name">'+a.area+'</div><div class="rb-area-list">'
          +items.map(function(p){
            const on=!!has[p.c];
            return '<div class="rb-perm'+(on?'':' is-off')+(on&&p.s?' is-sens':'')+'">'
              +'<span class="rb-perm-ico">'+(on?RB_ICO.check:'')+'</span>'
              +'<span class="rb-perm-txt"><span class="rb-perm-d">'+p.d+'</span><code class="rb-code">'+p.c+'</code></span>'
              +(p.s?'<span class="rb-tag-sens" title="Deletes, approves, publishes or moves money">Sensitive</span>':'')
              +'</div>';
          }).join('')+'</div></div>';
      }).join('')
      +'</div>';
  }).join('');
}
function rbLogFormHTML(t,moves){
  const blocked=t.roles.length&&(RB_MOVES[t.status]||[]).indexOf('Deleted')>=0;
  return '<div class="lp-logs-form">'
    +'<div class="lp-logs-form-header"><span class="lp-log-dot"></span>'+t.status+'</div>'
    +'<p class="lp-logs-form-sub">Activate, deactivate or delete this template and say why'
      +(blocked?'. Delete is available once no role uses it - remove it from '+t.roles.join(', ')+' first.':'')+'</p>'
    +lpLogStatusField('rb-log-status-sel',t.status,[t.status].concat(moves))
    +'<div class="lp-logs-form-label">Comment <span class="lp-logs-form-req">*</span></div>'
    +'<textarea class="lp-logs-form-textarea" id="rb-log-comment-inp" placeholder="Enter comment"></textarea>'
    +'<div style="display:flex;gap:10px;margin-top:12px">'
    +'<button class="ep-cancel-btn" style="flex:1" onclick="navRbTab(\'logs\')">Cancel</button>'
    +'<button class="lp-logs-save-btn" style="flex:1" onclick="rbSaveLog('+t.id+')">Submit</button>'
    +'</div></div>';
}
function rbSaveLog(id){if(!rbCanManage()){emsDeny('change permission templates');return;}
  const t=rbRec(id);if(!t)return;
  rbSeedLogs(t);
  if(!lpCommitLog(t,'rb-log-status-sel','rb-log-comment-inp',t.logs))return;
  if(t.status==='Deleted'){
    rbDropEdit();rbSelectedId=null;renderADTPage();
    showToast('Template deleted','success',rbKey(t)+' · '+t.name+' is no longer available.');return;
  }
  renderADTPage();
  showToast('Log added','success',rbKey(t)+' is now '+t.status+'.');
}

/* ── The form: panel Edit and the + Add popup share it ─────────────────── */
function rbStartEdit(){if(!rbCanManage()){emsDeny('change permission templates');return;}
  const t=rbRec(rbSelectedId);if(!t)return;
  rbEditing=true;
  rbDraft={name:t.name,module:t.module,desc:t.desc,perms:t.perms.slice(),q:'',open:{}};
  rbDraft.open[t.module]=1;
  rbDraftOrig=rbDraftSig();
  renderADTPage();
}
function rbDraftSig(){return JSON.stringify([rbDraft.name,rbDraft.module,rbDraft.desc,rbDraft.perms.slice().sort()]);}
function rbCancelEdit(){rbDropEdit();renderADTPage();}
function rbSync(){
  if(!rbDraft)return;
  [['name','rb-e-name'],['desc','rb-e-desc']].forEach(function(p){const el=document.getElementById(p[1]);if(el)rbDraft[p[0]]=el.value.trim();});
  if(document.getElementById('csw-rb-e-module'))rbDraft.module=getCSValue('rb-e-module');
}
/* Only the picker's count and list are swapped in the popup: the filter box
   above them keeps its focus and caret while the list narrows. */
function rbRepaint(){
  rbSync();
  if(rbModalOpen&&typeof formRepaintParts==='function'&&formRepaintParts(buildAddRbModalHTML(),['rb-pk-sum','rb-pk-list']))return;
  renderADTPage();
}
/* Picking a module opens its section in the picker, so the permissions to
   tick are the next thing in view. */
function rbModuleHook(){rbSync();if(rbDraft.module)rbDraft.open[rbDraft.module]=1;rbRepaint();}
function rbToggle(code){
  const i=rbDraft.perms.indexOf(code);
  if(i>=0)rbDraft.perms.splice(i,1);else rbDraft.perms.push(code);
  rbRepaint();
}
/* Select all / Clear on a module or an area. Only what the filter shows is
   touched - "select all" after filtering for "view" picks the views. */
function rbBulk(module,area,on){
  rbPickItems(module).forEach(function(a){
    if(area&&a.area!==area)return;
    a.items.forEach(function(p){
      const i=rbDraft.perms.indexOf(p.c);
      if(on&&i<0)rbDraft.perms.push(p.c);
      if(!on&&i>=0)rbDraft.perms.splice(i,1);
    });
  });
  rbRepaint();
}
function rbToggleModule(m){rbDraft.open[m]=rbDraft.open[m]?0:1;rbRepaint();}
function rbPickFilter(v){if(!rbDraft)return;rbDraft.q=v;rbRepaint();}
function rbClearPerms(){rbDraft.perms=[];rbRepaint();}
/* A module's areas, narrowed to what the filter matches. */
function rbPickItems(m){
  const q=(rbDraft.q||'').toLowerCase();
  return RB_CATALOGUE[m].map(function(a){
    const items=q?a.items.filter(function(p){return (p.d+' '+p.c+' '+p.v+' '+a.area).toLowerCase().indexOf(q)>=0;}):a.items;
    return {area:a.area,items:items};
  }).filter(function(a){return a.items.length;});
}
function rbPickerHTML(){
  const d=rbDraft,q=d.q||'';
  const sel={};d.perms.forEach(function(c){sel[c]=1;});
  const mods=RB_MODULES.slice().sort(function(a,b){return (b===d.module)-(a===d.module);});
  let shown=0;
  const body=mods.map(function(m){
    const areas=rbPickItems(m);
    if(!areas.length)return '';
    shown++;
    const n=RB_CATALOGUE[m].reduce(function(k,a){return k+a.items.filter(function(p){return sel[p.c];}).length;},0);
    /* A filter opens every module it finds something in. */
    const open=!!(q||d.open[m]);
    const allOn=areas.every(function(a){return a.items.every(function(p){return sel[p.c];});});
    return '<div class="rb-pk-mod'+(open?' is-open':'')+'">'
      +'<div class="rb-pk-hd">'
        +'<button type="button" class="rb-pk-toggle" onclick="rbToggleModule(\''+m+'\')" aria-expanded="'+open+'">'
          +'<span class="rb-pk-chev">'+RB_ICO.chev+'</span><span class="rb-pk-name">'+m+'</span>'
          +(m===d.module?'<span class="rb-pk-own">Template module</span>':'')
          +'<span class="rb-pk-count'+(n?' has':'')+'">'+n+' of '+rbModuleTotal(m)+' selected</span></button>'
        +(open?'<button type="button" class="rb-pk-bulk" onclick="rbBulk(\''+m+'\',null,'+(!allOn)+')">'+(allOn?'Clear':'Select all')+(q?' shown':'')+'</button>':'')
      +'</div>'
      +(open?'<div class="rb-pk-body">'+areas.map(function(a){
        const aOn=a.items.every(function(p){return sel[p.c];});
        return '<div class="rb-pk-row"><div class="rb-pk-area">'+a.area
            +(a.items.length>1?'<button type="button" class="rb-pk-all" onclick="rbBulk(\''+m+'\',\''+a.area.replace(/'/g,"\\'")+'\','+(!aOn)+')">'+(aOn?'None':'All')+'</button>':'')
          +'</div><div class="rb-pk-chips">'
          +a.items.map(function(p){
            const on=!!sel[p.c];
            return '<button type="button" class="rb-ck'+(on?' on':'')+(p.s?' is-sens':'')+'" aria-pressed="'+on+'" onclick="rbToggle(\''+p.c+'\')"'
              +' title="'+attrSafe(p.d+' · '+p.c+(p.s?' · sensitive':''))+'">'
              +'<span class="rb-ck-box">'+(on?RB_ICO.check:'')+'</span>'+p.v+'</button>';
          }).join('')
          +'</div></div>';
      }).join('')+'</div>':'')
      +'</div>';
  }).join('');
  const sens=d.perms.filter(function(c){return RB_PERM[c]&&RB_PERM[c].s;}).length;
  return '<div class="rb-pk">'
    +'<div class="rb-pk-top">'
      +'<input class="lp-search-input rb-pk-q" id="rb-pk-q" type="text" placeholder="Filter by action, area or code (e.g. approve, h2r.leave)" value="'+attrSafe(q)+'" oninput="lpLiveSearch(this,\'rbPickFilter\')" autocomplete="off">'
      +'<span class="rb-pk-sum" id="rb-pk-sum"><span><b>'+d.perms.length+'</b> selected'+(sens?' · <span class="rb-sens">'+RB_ICO.warn+sens+' sensitive</span>':'')+'</span>'
      +(d.perms.length?'<button type="button" class="rb-pk-clear" onclick="rbClearPerms()">Clear all</button>':'')+'</span>'
    +'</div>'
    +'<div class="rb-pk-list" id="rb-pk-list">'+(shown?body:'<div class="rb-pk-none">No permission matches “'+attrSafe(q)+'”.</div>')+'</div>'
    +'<div class="ea-hint">Hover an action for its full description and code. Amber actions are sensitive.</div>'
    +'</div>';
}
function rbFieldsHTML(){
  const d=rbDraft;
  return '<div class="ep-form-group"><label class="ep-form-label" for="rb-e-name">Template Name <span class="req">*</span></label>'
      +'<input class="ep-form-input" id="rb-e-name" value="'+attrSafe(d.name)+'" placeholder="e.g. Leave Approver"></div>'
    +'<div class="ep-form-group"><label class="ep-form-label">Module <span class="req">*</span></label>'
      +apCS('rb-e-module',RB_MODULES,d.module,'Select Module','rbModuleHook')
      +'<div class="ea-hint">Where the template is listed. It can still grant permissions from other modules.</div></div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label" for="rb-e-desc">Description</label>'
      +'<textarea class="ep-form-input ax-notes" id="rb-e-desc" placeholder="Who this template is for">'+attrSafe(d.desc||'')+'</textarea></div>'
    +'<div class="ep-form-group ep-form-full"><label class="ep-form-label">Permission Allocation <span class="req">*</span></label>'
      +rbPickerHTML()+'</div>';
}
function rbCheck(d,selfId){
  if(!String(d.name||'').trim()){showToast('Template Name is required','error');return false;}
  if(!d.module){showToast('Module is required','error');return false;}
  if(!d.perms.length){showToast('Pick at least one permission','error','A template with no permissions grants nothing.');return false;}
  const twin=rbacTemplatesData.find(function(x){return x.id!==selfId&&x.status!=='Deleted'&&x.name.toLowerCase()===d.name.trim().toLowerCase();});
  if(twin){showToast('A template with this name already exists','error',rbKey(twin)+' · '+twin.name);return false;}
  return true;
}
/* Permissions keep catalogue order, so the same template always lists the
   same way however it was ticked. */
function rbOrdered(perms){
  return Object.keys(RB_PERM).filter(function(c){return perms.indexOf(c)>=0;});
}
function rbSaveEdit(){if(!rbCanManage()){emsDeny('change permission templates');return;}
  const t=rbRec(rbSelectedId);if(!t||!rbDraft)return;
  rbSync();
  const d=rbDraft;
  if(!rbCheck(d,t.id))return;
  const before=t.perms.slice(),after=rbOrdered(d.perms);
  const added=after.filter(function(c){return before.indexOf(c)<0;}).length;
  const removed=before.filter(function(c){return after.indexOf(c)<0;}).length;
  Object.assign(t,{name:d.name.trim(),module:d.module,desc:d.desc,perms:after});
  if(added||removed){
    rbSeedLogs(t);
    const s=stampNow();
    t.logs.unshift({date:s.date,time:s.time,user:CURRENT_USER,status:t.status,
      action:'Permissions changed: '+(added?added+' added':'')+(added&&removed?', ':'')+(removed?removed+' removed':'')+'. Now '+rbPlural(after.length,'permission')+'.'});
  }
  rbDropEdit();
  renderADTPage();
  showToast('Template updated','success',rbKey(t)+' saved'+(t.roles.length?' - '+t.roles.join(', ')+' now '+(t.roles.length===1?'gets':'get')+' these permissions.':'.'));
}

/* ── + Add ─────────────────────────────────────────────────────────────── */
function startAddRb(){if(!rbCanManage()){emsDeny('create permission templates');return;}
  if(page!=='rbac-templates')navigatePage('rbac-templates');
  rbDropEdit();
  rbDraft={name:'',module:rbModuleF||'',desc:'',perms:[],q:'',open:{}};
  if(rbDraft.module)rbDraft.open[rbDraft.module]=1;
  rbModalOpen=true;
  renderADTPage();
}
function cancelAddRb(){rbModalOpen=false;rbDraft=null;renderADTPage();}
function buildAddRbModalHTML(){
  return '<div class="ct-modal-overlay">'
    +'<div class="ct-modal ct-modal--form ax-modal rb-modal" onclick="event.stopPropagation()">'
    +'<div class="ct-modal-hdr"><span class="ct-modal-title">Add Template</span>'
      +'<button class="ct-modal-close" onclick="cancelAddRb()">'+AX_ICO.x+'</button></div>'
    +'<p class="ct-modal-sub">A reusable set of permissions. Apply it to a role instead of ticking permissions by hand. Fields marked <span class="req">*</span> are required.</p>'
    +'<div class="ep-form-grid" id="rb-m-grid">'+rbFieldsHTML()+'</div>'
    +'<div class="ct-modal-foot"><div class="ct-modal-btns">'
      +'<button class="ep-cancel-btn" onclick="cancelAddRb()">Cancel</button>'
      +'<button class="ep-save-btn" onclick="submitAddRb()">Add Template</button>'
    +'</div></div>'
    +'</div></div>';
}
function submitAddRb(){if(!rbCanManage()){emsDeny('create permission templates');return;}
  rbSync();
  const d=rbDraft;
  if(!rbCheck(d,null))return;
  const s=stampNow();
  const t=rbSeed(rbNextId++,d.name.trim(),d.module,rbOrdered(d.perms),[],'Active',CURRENT_USER,axStamp(),d.desc);
  t.logs=[{date:s.date,time:s.time,user:CURRENT_USER,status:'Active',action:'Template created with '+rbPlural(t.perms.length,'permission')+'.'}];
  rbacTemplatesData.unshift(t);
  lpLanded('rbac-templates',t.id);
  rbModalOpen=false;rbDraft=null;
  renderADTPage();
  showToast('Template added','success',rbKey(t)+' · '+t.name+' with '+rbPlural(t.perms.length,'permission')+'.');
}

/* ── Listing ───────────────────────────────────────────────────────────── */
/* The Permissions cell, two lines like every other cell: how many, then the
   areas they fall in as plain text. Which permissions, and which modules they
   reach into, are on the panel's Permissions tab. */
function rbPermCellHTML(t){
  const areas=rbAreas(t).map(function(a){return a.area;}).join(', ');
  return '<div class="lp-c-plain">'+rbPlural(t.perms.length,'permission')+'</div>'
    +'<div class="lp-c-sub ax-c-trunc rb-c-areas" title="'+attrSafe(areas)+'">'+areas+'</div>';
}
function buildRbacTemplatesHTML(){
  const live=rbacTemplatesData.filter(function(t){return t.status!=='Deleted';});
  const count=function(s){return live.filter(function(t){return t.status===s;}).length;};
  const shown=rbSearchRows(rbRows(),rbQ);
  if(rbSelectedId&&!shown.some(function(t){return t.id===rbSelectedId;}))rbSelectedId=null;
  const pgn=listPage('rbac-templates',[rbModuleF,rbStatusF,rbQ].join('|'),shown.map(function(t,i){
    return '<tr class="rb-row'+(rbSelectedId===t.id?' lp-row-selected':'')+'" id="rb-row-'+t.id+'" style="cursor:pointer" onclick="openRbSidebar('+t.id+')">'
      +'<td class="lp-c-n">'+(i+1)+'</td>'
      +'<td><div class="lp-c-main ax-c-link ax-c-trunc" title="'+attrSafe(t.name)+'">'+t.name+'</div><div class="lp-c-sub">'+rbKey(t)+'</div></td>'
      +'<td><div class="lp-c-plain">'+t.module+'</div></td>'
      +'<td>'+rbPermCellHTML(t)+'</td>'
      +'<td>'+(t.roles.length
        ?'<div class="lp-c-plain ax-c-trunc" title="'+attrSafe(t.roles.join(', '))+'">'+t.roles.join(', ')+'</div>'
        :'<div class="lp-c-plain is-none">Not applied</div>')+'</td>'
      +'<td>'+axBadge(statusTone(t.status),t.status)+'</td>'
      +'<td onclick="event.stopPropagation()">'+rowLogCell('rbac-templates',t.id)+'</td>'
      +'</tr>';
  }),'<tr><td colspan="7" style="padding:24px;text-align:center;color:var(--gray)">No templates match this filter.</td></tr>');
  const stat=function(s){
    return '<div class="listing-stat'+(rbStatusF===s?' stat-selected':'')+'" onclick="rbToggleStat(\''+s+'\')">'
      +'<div class="listing-stat-count" style="color:var(--st-'+statusTone(s)+'-fg)">'+count(s)+'</div><div class="listing-stat-label">'+s+'</div></div>';
  };
  return '<div class="lp-page">'
    +dashboardBackHTML()
    +'<div class="exp-top rb-top" style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:4px">'
    +'<div class="lp-filter-bar" style="flex:1;min-width:0;padding:0">'
    +'<div class="lp-filter-bar-label">Select Filter</div>'
    +'<div class="lp-filter-bar-row">'
    +lpSearchField('rb-f-q',rbQ,'Search template, role or permission','applyRbFilters()')
    +apCS('rb-f-module',RB_MODULES,rbModuleF,'All Modules')
    +clearFiltersBtn([rbModuleF,rbStatusF,rbQ],'resetRbFilters()')
    +'<button class="lp-pill-search" onclick="applyRbFilters()">Search</button>'
    +'</div></div>'
    +'<div class="listing-stats">'+RB_TILES.map(stat).join('')+'</div></div>'
    +'<div class="lp-split-wrap ax-split-wrap" style="margin-top:14px" id="rb-split-wrap"><div class="lp-split-main"><div class="lp-table-card" style="border:none;border-radius:0;box-shadow:none">'
    +'<table class="lp-table ax-table rb-table"><thead><tr><th>S. No</th><th>Template</th><th>Module</th><th>Permissions</th>'
      +'<th>Applied To</th><th>Status</th><th>Action</th></tr></thead>'
    +'<tbody>'+pgn.rows+'</tbody></table>'
    +pgn.pager
    +'</div></div>'
    +'<div class="lp-split-sb'+(rbSelectedId?' open':'')+'" id="rb-split-sb"><div class="lp-isb" id="rb-isb-inner">'+(rbSelectedId?sbRender(renderRbSidebar,'rb'):'')+'</div></div>'
    +'</div></div>'
    +(rbModalOpen?buildAddRbModalHTML():'');
}

/* ── Wiring ────────────────────────────────────────────────────────────── */
Object.assign(supportPageMeta,{'rbac-templates':{title:'RBAC Templates',context:'RBAC Templates',filters:[],columns:[],rows:[]}});
if(typeof LP_ROW_PREFIX!=='undefined')LP_ROW_PREFIX['rbac-templates']='rb';
Object.assign(SB_STATUS_TONE,{deleted:'bad'});
sbDraftReg('rb',{
  dirty:function(){
    if(!rbEditing||rbModalOpen)return false;
    rbSync();
    return rbDraftSig()!==rbDraftOrig;
  },
  drop:rbDropEdit});
