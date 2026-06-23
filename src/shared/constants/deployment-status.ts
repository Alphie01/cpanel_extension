/* SFTP deployment lifecycle. Defined now (stub module) so future work and the
 * frontend compile against the final contract. */
export const DEPLOYMENT_STATUSES = [
  'QUEUED',
  'UPLOADING',
  'EXTRACTING',
  'BACKING_UP',
  'DEPLOYING',
  'VERIFYING',
  'COMPLETED',
  'FAILED',
  'ROLLED_BACK',
] as const;

export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number];

export const DEPLOYMENT_SOURCE_TYPES = ['ZIP_UPLOAD', 'GITHUB', 'BUILD_ARTIFACT'] as const;
export type DeploymentSourceType = (typeof DEPLOYMENT_SOURCE_TYPES)[number];
