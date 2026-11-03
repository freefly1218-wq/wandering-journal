CREATE TABLE `journal_assets` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`object_key` text NOT NULL,
	`sha` text NOT NULL,
	`bytes` integer NOT NULL,
	`mime` text NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE TABLE `journal_clocks` (
	`owner` text PRIMARY KEY NOT NULL,
	`value` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `journal_documents` (
	`owner` text NOT NULL,
	`path` text NOT NULL,
	`value` text,
	`revision` integer NOT NULL,
	`seq` integer NOT NULL,
	`deleted` integer DEFAULT 0 NOT NULL,
	`last_op` text NOT NULL,
	PRIMARY KEY(`owner`, `path`)
);
--> statement-breakpoint
CREATE TABLE `journal_receipts` (
	`owner` text NOT NULL,
	`op` text NOT NULL,
	`result` text,
	PRIMARY KEY(`owner`, `op`)
);
--> statement-breakpoint
CREATE TABLE `journal_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`token_hash` text NOT NULL,
	`created` text NOT NULL,
	`expires` text NOT NULL,
	`revoked` integer DEFAULT 0 NOT NULL,
	`notes` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_share_hash` ON `journal_shares` (`token_hash`);