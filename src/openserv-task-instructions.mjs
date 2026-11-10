// This text is a nonempty task BODY for future, explicitly provisioned
// workflows, separate from the unmodified, authenticated webhook evidence.
// It does not repair a platform AI session that has already lost its messages.
export const SERVJURY_TASK_DESCRIPTION =
  'Use adjudicate_delivery to return a finalized GenLayer verdict to the original task log.';

export const SERVJURY_TASK_BODY = [
  'Review the original OpenServ webhook trigger containing immutable terms, delivery, and evidence.',
  'Invoke adjudicate_delivery at most once with these three fields; never manufacture a verdict or calculation.',
  'The SERVJURY capability validates the authenticated webhook envelope and checks the original GenLayer case ID before signing.',
  'If a matching DECIDED case already exists, use its persisted verdict and receipt instead of filing or adjudicating again.',
  'If GenVM execution results conflict, report the ambiguity and the persisted contract readback separately; never assert unanimous success.',
  'Never request an additional on-chain transaction solely to repair missing OpenServ task output.',
  'Complete the task only with a verified on-chain readback and correctly attributed original task-log receipt.',
].join('\n');


// OpenServ @openserv-labs/client provision.ts uses input: '' for its single-task
// shorthand. Use its explicit 'tasks' array to supply both task.body AND task.input
// for an isolated fresh E2E workflow. This is prompt hygiene, not a verified
// diagnosis of the platform AI_InvalidPromptError during Human Assistance.
export const SERVJURY_TASK_INPUT = [
  'A webhook-triggered delivery review is pending.',
  'Read the original authenticated webhook payload for immutable fields: terms, delivery and evidence.',
  'Use adjudicate_delivery exactly once with these fields. Do not calculate a verdict from the orchestration prompt.',
  'Use the verified GenLayer contract readback as the only verdict authority.',
  'Provide the on-chain verdict, reason, case ID and receipt ID as task output only after verification.',
].join('\n');

\n// E2E V2 workflow-specific guidance. The OpenServ orchestration agent must
// never label NOT_VERIFIED or an uncertain submitted TX as task completion.
export const SERVJURY_TASK_BODY_V2 = SERVJURY_TASK_BODY + [
  'CRITICAL E2E V2 SAFETY GATE: the capability output is authoritative, not the OpenServ output reviewer score.',
  'If adjudicate_delivery returns NOT_VERIFIED, TASK_COMPLETION_UNCONFIRMED, or lacks result GENLAYER_VERDICT_VERIFIED with both real TX hashes, do not call out_complete_task or claim finished.',
  'If the capability returns NOT_VERIFIED, report the uncertainty and original transaction hash if it was logged by the operator; do not invoke the capability again.',
  'Only treat the task as genuinely complete after on-chain DECIDED readback, verified OpenServ receipt and the matching completed output.',
].join('\n');

export const SERVJURY_TASK_INPUT_V2 = SERVJURY_TASK_INPUT + [
  'This is the isolated V2 acceptance run. Earlier workflows and cases MUST NOT be reused or replayed.',
  'If the on-chain adapter returns NOT_VERIFIED, stop. The OpenServ output reviewer score is not evidence of on-chain success.',
].join('\n');
