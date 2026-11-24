-- DropIndex
DROP INDEX `competitions_slug_idx` ON `competitions`;

-- DropIndex
DROP INDEX `student_profiles_nim_idx` ON `student_profiles`;

-- CreateIndex
CREATE INDEX `achievement_evidences_is_active_uploadedAt_idx` ON `achievement_evidences`(`is_active`, `uploadedAt`);

-- CreateIndex
CREATE INDEX `achievements_institutionId_status_createdAt_idx` ON `achievements`(`institutionId`, `status`, `createdAt`);

-- CreateIndex
CREATE INDEX `achievements_institutionId_academicPeriodId_status_idx` ON `achievements`(`institutionId`, `academicPeriodId`, `status`);

-- CreateIndex
CREATE INDEX `achievements_institutionId_name_eventDate_idx` ON `achievements`(`institutionId`, `name`, `eventDate`);

-- CreateIndex
CREATE INDEX `audit_events_institutionId_action_createdAt_idx` ON `audit_events`(`institutionId`, `action`, `createdAt`);

-- CreateIndex
CREATE INDEX `audit_events_institutionId_targetType_createdAt_idx` ON `audit_events`(`institutionId`, `targetType`, `createdAt`);

-- CreateIndex
CREATE INDEX `auth_sessions_expiresAt_idx` ON `auth_sessions`(`expiresAt`);

-- CreateIndex
CREATE INDEX `auth_sessions_revokedAt_idx` ON `auth_sessions`(`revokedAt`);

-- CreateIndex
CREATE INDEX `competitions_institutionId_status_registrationDeadline_idx` ON `competitions`(`institutionId`, `status`, `registrationDeadline`);

-- CreateIndex
CREATE INDEX `internal_selections_institutionId_updatedAt_idx` ON `internal_selections`(`institutionId`, `updatedAt`);

-- CreateIndex
CREATE INDEX `internal_selections_teamId_updatedAt_idx` ON `internal_selections`(`teamId`, `updatedAt`);

-- CreateIndex
CREATE INDEX `password_reset_tokens_expiresAt_idx` ON `password_reset_tokens`(`expiresAt`);

-- CreateIndex
CREATE INDEX `point_ledgers_institutionId_academicPeriodId_idx` ON `point_ledgers`(`institutionId`, `academicPeriodId`);

-- CreateIndex
CREATE INDEX `point_ledgers_userId_academicPeriodId_idx` ON `point_ledgers`(`userId`, `academicPeriodId`);

-- CreateIndex
CREATE INDEX `student_targets_userId_status_createdAt_idx` ON `student_targets`(`userId`, `status`, `createdAt`);

-- CreateIndex
CREATE INDEX `team_invites_senderId_status_idx` ON `team_invites`(`senderId`, `status`);

-- CreateIndex
CREATE INDEX `team_invites_status_expiresAt_idx` ON `team_invites`(`status`, `expiresAt`);

-- CreateIndex
CREATE INDEX `team_join_requests_status_updatedAt_idx` ON `team_join_requests`(`status`, `updatedAt`);

