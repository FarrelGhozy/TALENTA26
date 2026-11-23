-- AlterTable: competitions (aturan dinamis per kompetisi — K-23)
ALTER TABLE `competitions`
    ADD COLUMN `registration_status` ENUM('buka', 'tutup') NOT NULL DEFAULT 'buka',
    ADD COLUMN `internal_selection_deadline` DATETIME(3) NULL,
    ADD COLUMN `require_roles` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `require_cross_study_program` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `single_team_per_competition` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: teams (rekrutmen berbasis pengajuan, kode undangan acak, & ketua eksplisit — K-19 revisi)
ALTER TABLE `teams`
    ADD COLUMN `leader_id` VARCHAR(191) NULL,
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `recruitment_type` ENUM('terbuka', 'privat') NOT NULL DEFAULT 'terbuka',
    ADD COLUMN `is_recruiting` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `needed_roles` JSON NULL,
    ADD COLUMN `target_max_members` INTEGER NULL,
    ADD COLUMN `invite_code` VARCHAR(191) NULL,
    ADD COLUMN `invite_code_updated_at` DATETIME(3) NULL;

-- Backfill aman untuk data tim yang sudah ada
UPDATE `teams`
SET `leader_id` = `creatorId`
WHERE `leader_id` IS NULL;

UPDATE `teams`
SET
    `invite_code` = CONCAT(
        'TLN-',
        UPPER(SUBSTRING(SHA2(CONCAT(`id`, ':', `creatorId`), 256), 1, 4)),
        '-',
        UPPER(SUBSTRING(SHA2(CONCAT(`id`, ':', `creatorId`), 256), 5, 4))
    ),
    `invite_code_updated_at` = CURRENT_TIMESTAMP(3)
WHERE `invite_code` IS NULL
  AND `status` IN ('mencari', 'terbentuk', 'terkunci_seleksi');

ALTER TABLE `teams`
    MODIFY COLUMN `leader_id` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `teams_invite_code_key` ON `teams`(`invite_code`);
CREATE INDEX `teams_competitionId_recruitment_type_is_recruiting_status_idx` ON `teams`(`competitionId`, `recruitment_type`, `is_recruiting`, `status`);
CREATE INDEX `teams_leader_id_idx` ON `teams`(`leader_id`);

-- AddForeignKey
ALTER TABLE `teams`
    ADD CONSTRAINT `teams_leader_id_fkey` FOREIGN KEY (`leader_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: team_join_requests
CREATE TABLE `team_join_requests` (
    `id` VARCHAR(191) NOT NULL,
    `team_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `preferred_role` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `status` ENUM('menunggu', 'disetujui', 'ditolak', 'dibatalkan', 'kedaluwarsa') NOT NULL DEFAULT 'menunggu',
    `reviewed_by_id` VARCHAR(191) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `team_join_requests_team_id_status_idx`(`team_id`, `status`),
    INDEX `team_join_requests_user_id_status_idx`(`user_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `team_join_requests`
    ADD CONSTRAINT `team_join_requests_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `team_join_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `team_join_requests_reviewed_by_id_fkey` FOREIGN KEY (`reviewed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
