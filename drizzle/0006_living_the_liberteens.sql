CREATE TABLE `affiliate_payouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`affiliateId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'usd',
	`payoutMethod` enum('paypal','stripe','bank','manual') NOT NULL,
	`payoutStatus` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`reference` varchar(128),
	`commissionIds` json,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `affiliate_payouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prospect_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prospectId` int NOT NULL,
	`note` text NOT NULL,
	`createdBy` enum('human','alex','sam','system') NOT NULL DEFAULT 'human',
	`callSid` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prospect_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerName` varchar(255) NOT NULL,
	`shopName` varchar(255) NOT NULL,
	`phone` varchar(32),
	`email` varchar(320),
	`address` varchar(255),
	`city` varchar(128),
	`state` varchar(64),
	`zip` varchar(16),
	`googlePlaceId` varchar(128),
	`website` varchar(512),
	`estimatedMonthlyRevenue` varchar(64),
	`numTechnicians` int,
	`prospectSource` enum('manual','csv_import','google_maps','yelp','referral','cold_call') NOT NULL DEFAULT 'manual',
	`outreachStatus` enum('not_contacted','called','voicemail','interested','demo_scheduled','signed_up','not_interested','do_not_call') NOT NULL DEFAULT 'not_contacted',
	`lastContactedAt` timestamp,
	`convertedAt` timestamp,
	`convertedShopId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prospects_id` PRIMARY KEY(`id`),
	CONSTRAINT `prospects_phone_unique` UNIQUE(`phone`)
);
