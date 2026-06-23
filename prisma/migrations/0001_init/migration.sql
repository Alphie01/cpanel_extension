-- cpanel-whm-manager — initial schema (non-destructive, additive only).
-- Every object is namespaced ext_hosting_*. Applied in the assigned tenant only.

-- CreateEnum
CREATE TYPE "ExtHostingServerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNREACHABLE');
CREATE TYPE "ExtHostingTokenScope" AS ENUM ('WHM', 'CPANEL');
CREATE TYPE "ExtHostingDeploymentStatus" AS ENUM ('QUEUED', 'UPLOADING', 'EXTRACTING', 'BACKING_UP', 'DEPLOYING', 'VERIFYING', 'COMPLETED', 'FAILED', 'ROLLED_BACK');
CREATE TYPE "ExtHostingSftpAuthType" AS ENUM ('PASSWORD', 'PRIVATE_KEY');

-- CreateTable: ext_hosting_servers
CREATE TABLE "ext_hosting_servers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 2087,
    "status" "ExtHostingServerStatus" NOT NULL DEFAULT 'INACTIVE',
    "verifySsl" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "ext_hosting_servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ext_hosting_tokens
CREATE TABLE "ext_hosting_tokens" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "scope" "ExtHostingTokenScope" NOT NULL DEFAULT 'WHM',
    "whmUser" TEXT NOT NULL,
    "cpanelUser" TEXT,
    "tokenEnc" TEXT NOT NULL,
    "keyId" TEXT NOT NULL DEFAULT 'default',
    "lastFour" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "ext_hosting_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ext_hosting_sftp_credentials
CREATE TABLE "ext_hosting_sftp_credentials" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "authType" "ExtHostingSftpAuthType" NOT NULL DEFAULT 'PASSWORD',
    "secretEnc" TEXT NOT NULL,
    "passphraseEnc" TEXT,
    "keyId" TEXT NOT NULL DEFAULT 'default',
    "port" INTEGER NOT NULL DEFAULT 22,
    "basePath" TEXT,
    "metadata" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "ext_hosting_sftp_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ext_hosting_accounts
CREATE TABLE "ext_hosting_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "cpanelUser" TEXT NOT NULL,
    "domain" TEXT,
    "plan" TEXT,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "rawJson" JSONB,
    "metadata" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "ext_hosting_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ext_hosting_deployments
CREATE TABLE "ext_hosting_deployments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "sftpCredentialId" TEXT,
    "targetPath" TEXT NOT NULL,
    "artifactName" TEXT NOT NULL,
    "artifactSize" INTEGER,
    "status" "ExtHostingDeploymentStatus" NOT NULL DEFAULT 'QUEUED',
    "backupPath" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "ext_hosting_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ext_hosting_deployment_logs
CREATE TABLE "ext_hosting_deployment_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "status" "ExtHostingDeploymentStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ext_hosting_deployment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ext_hosting_operation_logs
CREATE TABLE "ext_hosting_operation_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "extensionSlug" TEXT NOT NULL DEFAULT 'cpanel-whm-manager',
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "metadata" JSONB,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ext_hosting_operation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ext_hosting_settings
CREATE TABLE "ext_hosting_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ext_hosting_settings_pkey" PRIMARY KEY ("key")
);

-- Indexes
CREATE UNIQUE INDEX "ext_hosting_servers_tenantId_name_key" ON "ext_hosting_servers"("tenantId", "name");
CREATE INDEX "ext_hosting_servers_tenantId_status_idx" ON "ext_hosting_servers"("tenantId", "status");
CREATE INDEX "ext_hosting_servers_tenantId_deletedAt_idx" ON "ext_hosting_servers"("tenantId", "deletedAt");

CREATE UNIQUE INDEX "ext_hosting_tokens_tenantId_serverId_label_key" ON "ext_hosting_tokens"("tenantId", "serverId", "label");
CREATE INDEX "ext_hosting_tokens_tenantId_serverId_isActive_idx" ON "ext_hosting_tokens"("tenantId", "serverId", "isActive");

CREATE UNIQUE INDEX "ext_hosting_sftp_credentials_tenantId_serverId_label_key" ON "ext_hosting_sftp_credentials"("tenantId", "serverId", "label");
CREATE INDEX "ext_hosting_sftp_credentials_tenantId_serverId_idx" ON "ext_hosting_sftp_credentials"("tenantId", "serverId");

CREATE UNIQUE INDEX "ext_hosting_accounts_tenantId_serverId_cpanelUser_key" ON "ext_hosting_accounts"("tenantId", "serverId", "cpanelUser");
CREATE INDEX "ext_hosting_accounts_tenantId_serverId_idx" ON "ext_hosting_accounts"("tenantId", "serverId");

CREATE INDEX "ext_hosting_deployments_tenantId_serverId_status_idx" ON "ext_hosting_deployments"("tenantId", "serverId", "status");

CREATE INDEX "ext_hosting_deployment_logs_tenantId_deploymentId_createdAt_idx" ON "ext_hosting_deployment_logs"("tenantId", "deploymentId", "createdAt");

CREATE INDEX "ext_hosting_operation_logs_tenantId_createdAt_idx" ON "ext_hosting_operation_logs"("tenantId", "createdAt");
CREATE INDEX "ext_hosting_operation_logs_tenantId_entityType_entityId_idx" ON "ext_hosting_operation_logs"("tenantId", "entityType", "entityId");

-- Foreign keys
ALTER TABLE "ext_hosting_tokens" ADD CONSTRAINT "ext_hosting_tokens_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "ext_hosting_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ext_hosting_sftp_credentials" ADD CONSTRAINT "ext_hosting_sftp_credentials_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "ext_hosting_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ext_hosting_accounts" ADD CONSTRAINT "ext_hosting_accounts_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "ext_hosting_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ext_hosting_deployments" ADD CONSTRAINT "ext_hosting_deployments_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "ext_hosting_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ext_hosting_deployment_logs" ADD CONSTRAINT "ext_hosting_deployment_logs_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "ext_hosting_deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
