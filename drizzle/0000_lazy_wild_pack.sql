CREATE TABLE `attack_names` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`attack_name` text(50) NOT NULL,
	`description` text NOT NULL,
	`author` text(50) NOT NULL,
	`tag` text NOT NULL,
	`created_at` text NOT NULL
);
