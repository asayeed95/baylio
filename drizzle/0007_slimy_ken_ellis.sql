CREATE TABLE `scheduled_calls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(32) NOT NULL,
	`callerProfileId` int,
	`prospectId` int,
	`scheduledAt` timestamp NOT NULL,
	`reason` text,
	`context` text,
	`scheduleStatus` enum('pending','calling','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`callSid` varchar(64),
	`attempts` int NOT NULL DEFAULT 0,
	`lastAttemptAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_calls_id` PRIMARY KEY(`id`)
);
