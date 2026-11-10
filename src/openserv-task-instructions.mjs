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
