CREATE TABLE `agent_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`voiceId` varchar(128),
	`voiceName` varchar(128),
	`agentName` varchar(128) DEFAULT 'Baylio',
	`systemPrompt` text,
	`greeting` text,
	`upsellEnabled` boolean NOT NULL DEFAULT true,
	`upsellRules` json,
	`confidenceThreshold` decimal(3,2) DEFAULT '0.80',
	`maxUpsellsPerCall` int DEFAULT 1,
	`language` varchar(16) DEFAULT 'en',
	`elevenLabsAgentId` varchar(128),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_call_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditId` int NOT NULL,
	`callerPhone` varchar(32),
	`callTimestamp` timestamp,
	`dayPart` enum('morning','afternoon','evening','night'),
	`intentCategory` varchar(128),
	`urgencyLevel` enum('low','medium','high','emergency'),
	`estimatedTicketValue` decimal(10,2),
	`bookingLikelihood` decimal(3,2),
	`isRepeatCaller` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_call_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `call_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`twilioCallSid` varchar(128),
	`callerPhone` varchar(32),
	`callerName` varchar(255),
	`direction` enum('inbound','outbound') NOT NULL DEFAULT 'inbound',
	`status` enum('completed','missed','voicemail','transferred','failed') NOT NULL DEFAULT 'completed',
	`duration` int DEFAULT 0,
	`recordingUrl` text,
	`transcription` text,
	`summary` text,
	`customerIntent` varchar(255),
	`serviceRequested` varchar(255),
	`appointmentBooked` boolean DEFAULT false,
	`upsellAttempted` boolean DEFAULT false,
	`upsellAccepted` boolean DEFAULT false,
	`sentimentScore` decimal(3,2),
	`qualityScore` decimal(3,2),
	`qaFlags` json,
	`estimatedRevenue` decimal(10,2),
	`callStartedAt` timestamp,
	`callEndedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `call_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `missed_call_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int,
	`prospectName` varchar(255),
	`prospectEmail` varchar(320),
	`prospectPhone` varchar(32),
	`shopName` varchar(255),
	`forwardingNumber` varchar(32),
	`forwardingNumberSid` varchar(64),
	`auditStatus` enum('pending','active','completed','expired') NOT NULL DEFAULT 'pending',
	`startDate` timestamp,
	`endDate` timestamp,
	`totalMissedCalls` int DEFAULT 0,
	`estimatedLostRevenue` decimal(10,2),
	`scorecardUrl` text,
	`scorecardData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `missed_call_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`shopId` int,
	`notificationType` enum('new_call','high_value_lead','missed_call','system_issue','weekly_summary','usage_warning','audit_complete','payment_issue') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`organizationId` int,
	`name` varchar(255) NOT NULL,
	`phone` varchar(32),
	`address` text,
	`city` varchar(128),
	`state` varchar(64),
	`zip` varchar(16),
	`timezone` varchar(64) DEFAULT 'America/New_York',
	`businessHours` json,
	`serviceCatalog` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`twilioPhoneNumber` varchar(32),
	`twilioPhoneSid` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shops_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`shopId` int NOT NULL,
	`organizationId` int,
	`tier` enum('starter','pro','elite') NOT NULL DEFAULT 'starter',
	`subStatus` enum('active','past_due','canceled','trialing') NOT NULL DEFAULT 'active',
	`stripeCustomerId` varchar(128),
	`stripeSubscriptionId` varchar(128),
	`includedMinutes` int NOT NULL DEFAULT 300,
	`usedMinutes` int NOT NULL DEFAULT 0,
	`overageRate` decimal(5,4) DEFAULT '0.1500',
	`billingCycle` enum('monthly','annual') NOT NULL DEFAULT 'monthly',
	`setupFeePaid` boolean DEFAULT false,
	`setupFeeAmount` decimal(10,2),
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `usage_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subscriptionId` int NOT NULL,
	`shopId` int NOT NULL,
	`callLogId` int,
	`minutesUsed` decimal(8,2) NOT NULL,
	`isOverage` boolean NOT NULL DEFAULT false,
	`overageCharge` decimal(10,2),
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `usage_records_id` PRIMARY KEY(`id`)
);
