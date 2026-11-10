// Use the authenticated webhook envelope as the sole source of immutable
// acceptance terms, delivery and evidence. OpenServ's orchestration LLM may
// enrich or paraphrase capability args (including adding a verdict); those
// args are never allowed to rewrite what the original webhook submitted.
import { validateCase } from './engine.mjs';

const keys = ['terms', 'delivery', 'evidence'];
function inspectEnvelope(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return null;
  if (!keys.every(key => typeof event[key] === 'string')) return null;
  return event;
}
export function originalWebhookEvidence(action, taskId) {
  const event = action?.task?.triggerEvent?.payload?.[0]?.event;
  const original = inspectEnvelope(event);
  if (!original) {
    throw new Error('Original authenticated webhook evidence missing; refusing AI-supplied substitute.');
  }
  const fromOtherEnvelope = action?.triggerEvents?.[0]?.payload?.[0]?.event;
  const mirrored = inspectEnvelope(fromOtherEnvelope);
  if (mirrored && keys.some(key => mirrored[key] !== original[key])) {
    throw new Error('OpenServ trigger envelopes disagree; refusing immutable evidence.');
  }
  return validateCase({ taskId: String(taskId), ...Object.fromEntries(keys.map(k => [k, original[k]])) });
}
