CREATE TABLE `affiliate_commissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`affiliateId` int NOT NULL,
	`referralId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`commissionStatus` enum('pending','approved','paid','rejected') NOT NULL DEFAULT 'pending',
	`periodStart` timestamp,
	`periodEnd` timestamp,
	`paidAt` timestamp,
	`payoutMethod` varchar(32),
	`payoutReference` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `affiliate_commissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `affiliate_referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`affiliateId` int NOT NULL,
	`shopId` int,
	`shopOwnerId` int,
	`referredEmail` varchar(320),
	`referredName` varchar(255),
	`referralStatus` enum('clicked','signed_up','subscribed','churned') NOT NULL DEFAULT 'clicked',
	`subscribedTier` varchar(32),
	`monthlyValue` decimal(10,2),
	`convertedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliate_referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `affiliates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(32),
	`paypalEmail` varchar(320),
	`stripeConnectId` varchar(128),
	`affiliateTier` enum('affiliate','pro','agency') NOT NULL DEFAULT 'affiliate',
	`commissionRate` decimal(5,4) NOT NULL DEFAULT '0.2000',
	`affiliateStatus` enum('pending','active','suspended','inactive') NOT NULL DEFAULT 'pending',
	`totalClicks` int NOT NULL DEFAULT 0,
	`totalSignups` int NOT NULL DEFAULT 0,
	`totalEarnings` decimal(10,2) NOT NULL DEFAULT '0.00',
	`pendingPayout` decimal(10,2) NOT NULL DEFAULT '0.00',
	`lastPayoutAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliates_id` PRIMARY KEY(`id`),
	CONSTRAINT `affiliates_code_unique` UNIQUE(`code`)
);
