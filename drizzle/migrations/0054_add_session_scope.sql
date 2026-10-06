-- A session remembers how it was signed in. Webmail sign-ins (a mailbox password)
-- get scope 'mailbox' and are pinned to that mailbox; admin-portal sign-ins get
-- 'admin'. Existing rows keep the previous unrestricted behaviour as 'account'.
ALTER TABLE `sessions` ADD `scope` text DEFAULT 'account' NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `mailbox_id` text;--> statement-breakpoint
ALTER TABLE `login_challenges` ADD `scope` text DEFAULT 'account' NOT NULL;--> statement-breakpoint
ALTER TABLE `login_challenges` ADD `mailbox_id` text;--> statement-breakpoint
ALTER TABLE `login_challenges` ADD `failed_attempts` integer DEFAULT 0 NOT NULL;
