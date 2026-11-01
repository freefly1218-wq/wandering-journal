CREATE TABLE `journal_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`summary` text NOT NULL,
	`changes` text NOT NULL,
	`sources` text NOT NULL,
	`created` text NOT NULL,
	`expires` text NOT NULL,
	`status` text DEFAULT 'prepared' NOT NULL,
	`result` text
);
