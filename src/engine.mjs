// Explicitly non-authoritative, deterministic fixtures for the offline preview.
// NOT an AI judgment or a GenLayer transaction.
export const scenarios = Object.freeze({
  success: {
    title: 'Market research · delivered',
    taskId: 'OS-DEMO-1042',
    terms: 'Deliver a 3-company competitor comparison, including a dated source URL for each company and a 1-paragraph conclusion.',
    delivery: 'Research report: 3 companies compared, three dated sources supplied, and a conclusion included.',
    evidence: 'Source A (2026-11-09): example.org/a; Source B (2026-11-09): example.org/b; Source C (2026-11-09): example.org/c; conclusion attached.',
    verdict: 'ACCEPT',
    reason: 'Fixture: all three source references and the required conclusion are present.',
  },
  rework: {
    title: 'Market research · missing sources',
    taskId: 'OS-DEMO-1043',
    terms: 'Deliver a 3-company competitor comparison, including a dated source URL for each company and a 1-paragraph conclusion.',
    delivery: 'Agent submitted a 3-company comparison and conclusion but omitted the source URLs and dates.',
    evidence: 'Task output includes three company names and conclusion. Source count: 0; dated URLs: 0.',
    verdict: 'REWORK',
    reason: 'Fixture: required dated source URLs are missing from the submitted evidence.',
  },
  unknown: {
    title: 'Market research · contested evidence',
    taskId: 'OS-DEMO-1044',
    terms: 'Deliver a 3-company competitor comparison, including a dated source URL for each company and a 1-paragraph conclusion.',
    delivery: 'Agent states that the report is complete.',
    evidence: 'Screenshot unavailable. Attached file is inaccessible; no independent readback.',
    verdict: 'UNVERIFIABLE',
    reason: 'Fixture: the claimed report cannot be inspected with the available evidence.',
  },
});

export function demoDecision(input) {
  const fixture = scenarios[input.scenario];
  if (!fixture) return { verdict: 'UNVERIFIABLE', reason: 'No verified fixture for this case. Run GenLayer live mode for real adjudication.' };
  const material = ['taskId','terms','delivery','evidence'];
  if (!material.every(key => input[key] === fixture[key])) {
    return { verdict: 'UNVERIFIABLE', reason: 'The fixture was modified. This local preview cannot evaluate new facts; use live GenLayer.' };
  }
  return { verdict: fixture.verdict, reason: fixture.reason };
}
export function validateCase(data) {
  if (!data || typeof data !== 'object') throw new Error('Invalid request');
  const limits = { taskId: 120, terms: 2000, delivery: 4000, evidence: 4000 };
  const clean = {};
  for (const [key, max] of Object.entries(limits)) {
    const value = data[key];
    if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Invalid ${key} (1-${max} chars)`);
    clean[key] = value.trim();
  }
  clean.scenario = typeof data.scenario === 'string' ? data.scenario : '';
  return clean;
}
