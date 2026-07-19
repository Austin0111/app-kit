CREATE TABLE `notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
