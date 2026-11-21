-- AlterTable
ALTER TABLE `academic_periods` ADD COLUMN `archived_at` DATETIME(3) NULL,
    ADD COLUMN `end_date` DATETIME(3) NULL,
    ADD COLUMN `start_date` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `achievement_decisions` ADD COLUMN `awarded_points` INTEGER NULL,
    ADD COLUMN `calculated_points` INTEGER NULL,
    ADD COLUMN `override_reason` TEXT NULL,
    ADD COLUMN `point_source` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `achievement_evidences` ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `superseded_by_revision_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `achievements` ADD COLUMN `competition_category_id` VARCHAR(191) NULL,
    ADD COLUMN `participation_type` ENUM('individu', 'kelompok') NOT NULL DEFAULT 'individu',
    ADD COLUMN `potential_duplicate_of_id` VARCHAR(191) NULL,
    ADD COLUMN `sub_category_id` VARCHAR(191) NULL,
    ADD COLUMN `sub_competition_name` VARCHAR(191) NULL,
    ADD COLUMN `team_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `competitions` ADD COLUMN `competition_category_id` VARCHAR(191) NULL,
    ADD COLUMN `point_description` TEXT NULL,
    ADD COLUMN `point_template_id` VARCHAR(191) NULL,
    ADD COLUMN `source_updated_at` DATETIME(3) NULL,
    ADD COLUMN `source_url` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `internal_selections` ADD COLUMN `confirmed_at` DATETIME(3) NULL,
    ADD COLUMN `notes` TEXT NULL,
    ADD COLUMN `user_id` VARCHAR(191) NULL,
    ADD COLUMN `validator_id` VARCHAR(191) NULL,
    MODIFY `teamId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `point_ledgers` ADD COLUMN `calculated_points` INTEGER NULL,
    ADD COLUMN `idempotency_key` VARCHAR(191) NULL,
    ADD COLUMN `override_reason` TEXT NULL,
    ADD COLUMN `point_source` VARCHAR(191) NOT NULL DEFAULT 'template',
    ADD COLUMN `reversed_by_ledger_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `point_rules` ADD COLUMN `point_template_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `student_profiles` ADD COLUMN `avatar_object_key` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `student_targets` ADD COLUMN `academic_period_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `full_name` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `competition_categories` (
    `id` VARCHAR(191) NOT NULL,
    `institution_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `competition_categories_institution_id_code_key`(`institution_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competition_sub_categories` (
    `id` VARCHAR(191) NOT NULL,
    `category_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `default_points_note` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `competition_sub_categories_category_id_code_key`(`category_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `point_templates` (
    `id` VARCHAR(191) NOT NULL,
    `institution_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `point_templates_institution_id_version_is_active_idx`(`institution_id`, `version`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `achievement_participants` (
    `id` VARCHAR(191) NOT NULL,
    `achievement_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `role_in_team` VARCHAR(191) NULL,
    `is_submitter` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `achievement_participants_user_id_idx`(`user_id`),
    UNIQUE INDEX `achievement_participants_achievement_id_user_id_key`(`achievement_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `competition_point_rules` (
    `id` VARCHAR(191) NOT NULL,
    `institution_id` VARCHAR(191) NOT NULL,
    `competition_id` VARCHAR(191) NULL,
    `sub_category_id` VARCHAR(191) NULL,
    `level` ENUM('lokal', 'nasional', 'internasional') NOT NULL,
    `result` ENUM('partisipasi', 'finalis', 'juara_3', 'juara_2', 'juara_1', 'penghargaan_khusus') NOT NULL,
    `points` INTEGER NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `competition_point_rules_institution_id_competition_id_sub_ca_idx`(`institution_id`, `competition_id`, `sub_category_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `achievement_evidences_objectKey_key` ON `achievement_evidences`(`objectKey`);

-- CreateIndex
CREATE INDEX `achievement_evidences_achievementId_is_active_idx` ON `achievement_evidences`(`achievementId`, `is_active`);

-- CreateIndex
CREATE INDEX `achievements_team_id_idx` ON `achievements`(`team_id`);

-- CreateIndex
CREATE UNIQUE INDEX `internal_selections_competitionId_user_id_stage_key` ON `internal_selections`(`competitionId`, `user_id`, `stage`);

-- CreateIndex
CREATE UNIQUE INDEX `point_ledgers_idempotency_key_key` ON `point_ledgers`(`idempotency_key`);

-- CreateIndex
CREATE INDEX `student_targets_academic_period_id_status_idx` ON `student_targets`(`academic_period_id`, `status`);

-- AddForeignKey
ALTER TABLE `competition_categories` ADD CONSTRAINT `competition_categories_institution_id_fkey` FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competition_sub_categories` ADD CONSTRAINT `competition_sub_categories_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `competition_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `point_templates` ADD CONSTRAINT `point_templates_institution_id_fkey` FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitions` ADD CONSTRAINT `competitions_competition_category_id_fkey` FOREIGN KEY (`competition_category_id`) REFERENCES `competition_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competitions` ADD CONSTRAINT `competitions_point_template_id_fkey` FOREIGN KEY (`point_template_id`) REFERENCES `point_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_targets` ADD CONSTRAINT `student_targets_academic_period_id_fkey` FOREIGN KEY (`academic_period_id`) REFERENCES `academic_periods`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internal_selections` ADD CONSTRAINT `internal_selections_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `internal_selections` ADD CONSTRAINT `internal_selections_validator_id_fkey` FOREIGN KEY (`validator_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achievements` ADD CONSTRAINT `achievements_competition_category_id_fkey` FOREIGN KEY (`competition_category_id`) REFERENCES `competition_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achievements` ADD CONSTRAINT `achievements_sub_category_id_fkey` FOREIGN KEY (`sub_category_id`) REFERENCES `competition_sub_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achievements` ADD CONSTRAINT `achievements_team_id_fkey` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achievement_participants` ADD CONSTRAINT `achievement_participants_achievement_id_fkey` FOREIGN KEY (`achievement_id`) REFERENCES `achievements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achievement_participants` ADD CONSTRAINT `achievement_participants_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `point_rules` ADD CONSTRAINT `point_rules_point_template_id_fkey` FOREIGN KEY (`point_template_id`) REFERENCES `point_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competition_point_rules` ADD CONSTRAINT `competition_point_rules_institution_id_fkey` FOREIGN KEY (`institution_id`) REFERENCES `institutions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competition_point_rules` ADD CONSTRAINT `competition_point_rules_competition_id_fkey` FOREIGN KEY (`competition_id`) REFERENCES `competitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `competition_point_rules` ADD CONSTRAINT `competition_point_rules_sub_category_id_fkey` FOREIGN KEY (`sub_category_id`) REFERENCES `competition_sub_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

