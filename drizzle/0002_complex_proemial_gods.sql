CREATE TABLE `encryptedMediaBackups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`lectureId` varchar(160) NOT NULL,
	`sourceId` varchar(160),
	`fileName` varchar(255) NOT NULL,
	`contentType` varchar(128) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`ivLength` int NOT NULL,
	`tagLength` int NOT NULL,
	`originalSize` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `encryptedMediaBackups_id` PRIMARY KEY(`id`)
);
