import * as cit from './src/citadel.js';
const audits = Object.keys(cit).filter(k => /^audit|^parse|^runCitadel/.test(k));
console.dir(audits);
console.log('auditAcCoverage?', typeof cit.auditAcCoverage);
console.log('auditRuleSetInvariants?', typeof cit.auditRuleSetInvariants);
console.log('auditAllowlistDeadEntries?', typeof cit.auditAllowlistDeadEntries);
