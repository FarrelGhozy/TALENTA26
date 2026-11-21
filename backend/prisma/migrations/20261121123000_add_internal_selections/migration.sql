CREATE TABLE `internal_selections` (
  `id` VARCHAR(191) NOT NULL,
  `institutionId` VARCHAR(191) NOT NULL,
  `competitionId` VARCHAR(191) NOT NULL,
  `teamId` VARCHAR(191) NOT NULL,
  `stage` VARCHAR(191) NOT NULL,
  `result` VARCHAR(191) NOT NULL DEFAULT 'menunggu',
  `organizerVerified` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `internal_selections_competitionId_teamId_stage_key`(`competitionId`, `teamId`, `stage`),
  INDEX `internal_selections_institutionId_result_idx`(`institutionId`, `result`),
  PRIMARY KEY (`id`),
  CONSTRAINT `internal_selections_institutionId_fkey` FOREIGN KEY (`institutionId`) REFERENCES `institutions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `internal_selections_competitionId_fkey` FOREIGN KEY (`competitionId`) REFERENCES `competitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `internal_selections_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `teams`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
