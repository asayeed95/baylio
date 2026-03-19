CREATE TABLE `contact_submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32),
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contact_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agent_configs` ADD `ownerId` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `call_logs` ADD `ownerId` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `missed_call_audits` ADD `ownerId` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD `ownerId` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `usage_records` ADD `ownerId` int DEFAULT 0 NOT NULL;