-- CreateTable
CREATE TABLE `achievements` (
    `id` VARCHAR(191) NOT NULL,
    `institutionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `academicPeriodId` VARCHAR(191) NULL,
    `competitionId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `organizer` VARCHAR(191) NOT NULL,
    `category` ENUM('kompetisi', 'konferensi', 'olahraga', 'seni', 'nominasi', 'lain', 'seleksi_internal') NOT NULL DEFAULT 'kompetisi',
    `level` ENUM('lokal', 'nasional', 'internasional') NOT NULL DEFAULT 'nasional',
    `result` ENUM('partisipasi', 'finalis', 'juara_3', 'juara_2', 'juara_1', 'penghargaan_khusus') NOT NULL DEFAULT 'juara_1',
    `eventDate` DATETIME(3) NOT NULL,
    `description` TEXT NULL,
    `isFromInternalSelection` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('draft', 'menunggu', 'perlu_perbaikan', 'disetujui', 'ditolak', 'dibatalkan') NOT NULL DEFAULT 'menunggu',
    `version` INTEGER NOT NULL DEFAULT 1,
    `reviewNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `achievements_institutionId_status_idx`(`institutionId`, `status`),
    INDEX `achievements_userId_status_idx`(`userId`, `status`),
    INDEX `achievements_academicPeriodId_idx`(`academicPeriodId`),
    INDEX `achievements_competitionId_idx`(`competitionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `achievement_evidences` (
    `id` VARCHAR(191) NOT NULL,
    `achievementId` VARCHAR(191) NOT NULL,
    `uploaderId` VARCHAR(191) NOT NULL,
    `objectKey` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `achievement_evidences_achievementId_idx`(`achievementId`),
    INDEX `achievement_evidences_uploaderId_idx`(`uploaderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `achievement_revisions` (
    `id` VARCHAR(191) NOT NULL,
    `achievementId` VARCHAR(191) NOT NULL,
    `versionNumber` INTEGER NOT NULL,
    `snapshotJson` JSON NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `achievement_revisions_achievementId_versionNumber_idx`(`achievementId`, `versionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `achievement_decisions` (
    `id` VARCHAR(191) NOT NULL,
    `achievementId` VARCHAR(191) NOT NULL,
    `decidedById` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `previousStatus` ENUM('draft', 'menunggu', 'perlu_perbaikan', 'disetujui', 'ditolak', 'dibatalkan') NOT NULL,
    `newStatus` ENUM('draft', 'menunggu', 'perlu_perbaikan', 'disetujui', 'ditolak', 'dibatalkan') NOT NULL,
    `reason` TEXT NULL,
    `version` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `achievement_decisions_achievementId_idx`(`achievementId`),
    INDEX `achievement_decisions_decidedById_idx`(`decidedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `point_rules` (
    `id` VARCHAR(191) NOT NULL,
    `institutionId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `level` ENUM('lokal', 'nasional', 'internasional') NOT NULL,
    `result` ENUM('partisipasi', 'finalis', 'juara_3', 'juara_2', 'juara_1', 'penghargaan_khusus') NOT NULL,
    `points` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `point_rules_institutionId_version_isActive_idx`(`institutionId`, `version`, `isActive`),
    UNIQUE INDEX `point_rules_institutionId_version_level_result_key`(`institutionId`, `version`, `level`, `result`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `point_ledgers` (
    `id` VARCHAR(191) NOT NULL,
    `institutionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `achievementId` VARCHAR(191) NOT NULL,
    `academicPeriodId` VARCHAR(191) NULL,
    `ruleVersion` INTEGER NOT NULL DEFAULT 1,
    `points` INTEGER NOT NULL,
    `type` ENUM('award', 'reversal') NOT NULL DEFAULT 'award',
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `point_ledgers_institutionId_userId_idx`(`institutionId`, `userId`),
    INDEX `point_ledgers_achievementId_idx`(`achievementId`),
    INDEX `point_ledgers_academicPeriodId_idx`(`academicPeriodId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `achievements` ADD CONSTRAINT `achievements_institutionId_fkey` FOREIGN KEY (`institutionId`) REFERENCES `institutions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achievements` ADD CONSTRAINT `achievements_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achievements` ADD CONSTRAINT `achievements_academicPeriodId_fkey` FOREIGN KEY (`academicPeriodId`) REFERENCES `academic_periods`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achievements` ADD CONSTRAINT `achievements_competitionId_fkey` FOREIGN KEY (`competitionId`) REFERENCES `competitions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achievement_evidences` ADD CONSTRAINT `achievement_evidences_achievementId_fkey` FOREIGN KEY (`achievementId`) REFERENCES `achievements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achievement_evidences` ADD CONSTRAINT `achievement_evidences_uploaderId_fkey` FOREIGN KEY (`uploaderId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achievement_revisions` ADD CONSTRAINT `achievement_revisions_achievementId_fkey` FOREIGN KEY (`achievementId`) REFERENCES `achievements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achievement_decisions` ADD CONSTRAINT `achievement_decisions_achievementId_fkey` FOREIGN KEY (`achievementId`) REFERENCES `achievements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `achievement_decisions` ADD CONSTRAINT `achievement_decisions_decidedById_fkey` FOREIGN KEY (`decidedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `point_rules` ADD CONSTRAINT `point_rules_institutionId_fkey` FOREIGN KEY (`institutionId`) REFERENCES `institutions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `point_ledgers` ADD CONSTRAINT `point_ledgers_institutionId_fkey` FOREIGN KEY (`institutionId`) REFERENCES `institutions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `point_ledgers` ADD CONSTRAINT `point_ledgers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `point_ledgers` ADD CONSTRAINT `point_ledgers_achievementId_fkey` FOREIGN KEY (`achievementId`) REFERENCES `achievements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `point_ledgers` ADD CONSTRAINT `point_ledgers_academicPeriodId_fkey` FOREIGN KEY (`academicPeriodId`) REFERENCES `academic_periods`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
