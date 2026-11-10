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
