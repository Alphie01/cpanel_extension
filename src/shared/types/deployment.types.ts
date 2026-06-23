/* [STUB] Deployment API contract. Types are final so the SFTP module and the
 * frontend compile against them; handlers return NOT_IMPLEMENTED for now. */
import type { DeploymentSourceType, DeploymentStatus } from '../constants/deployment-status';

export interface DeploymentDto {
  id: string;
  serverId: string;
  sftpCredentialId: string | null;
  targetPath: string;
  artifactName: string;
  artifactSize: number | null;
  status: DeploymentStatus;
  backupPath: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentLogEntry {
  id: string;
  status: DeploymentStatus;
  message: string;
  createdAt: string;
}

export interface CreateDeploymentRequest {
  serverId: string;
  sftpCredentialId: string;
  sourceType: DeploymentSourceType;
  targetPath: string;
  artifactName: string;
  backupBeforeDeploy: boolean;
  deleteRemovedFiles: boolean;
}
