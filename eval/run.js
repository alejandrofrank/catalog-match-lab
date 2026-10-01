import { compareNames, keywordBaseline } from '../src/match.js';
import { cases } from './cases.js';
let correct = 0, baselineFalseAccepts = 0, structuredFalseAccepts = 0, yes = 0;
for (const [request, candidate, expected] of cases) {
  const actual = compareNames(request, candidate).decision;
  correct += actual === expected;
  yes += actual === 'yes';
  baselineFalseAccepts += keywordBaseline(request, candidate) && expected !== 'yes';
  structuredFalseAccepts += actual === 'yes' && expected !== 'yes';
}
console.log(JSON.stringify({ dataset: 'hand-authored educational fixtures', cases: cases.length, correct, accepted: yes, baselineFalseAccepts, structuredFalseAccepts, note: 'No live Jev calls. Not a production accuracy estimate.' }, null, 2));
if (correct !== cases.length) process.exitCode = 1;
