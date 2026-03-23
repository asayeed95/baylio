CREATE TABLE `caller_memory_facts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`callerProfileId` int NOT NULL,
	`factType` varchar(64) NOT NULL,
	`factValue` text NOT NULL,
	`callSid` varchar(64),
	`extractedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `caller_memory_facts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `caller_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(32) NOT NULL,
	`name` varchar(255),
	`callerRole` enum('prospect','shop_owner','founder','tester','vendor','unknown') NOT NULL DEFAULT 'unknown',
	`shopName` varchar(255),
	`shopCity` varchar(128),
	`shopState` varchar(64),
	`callCount` int NOT NULL DEFAULT 0,
	`lastCalledAt` timestamp,
	`notes` text,
	`doNotSell` boolean NOT NULL DEFAULT false,
	`preferredLanguage` varchar(8) DEFAULT 'en',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `caller_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `caller_profiles_phone_unique` UNIQUE(`phone`)
);
