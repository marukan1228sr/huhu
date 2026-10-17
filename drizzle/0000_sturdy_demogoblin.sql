CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`author` text NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`room` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`invite` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_invite_unique` ON `rooms` (`invite`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`endpoint` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`data` text NOT NULL
);
