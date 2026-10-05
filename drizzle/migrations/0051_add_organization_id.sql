-- Multi-tenant SaaS: scope users, domains, and mailboxes to an organization.
-- Existing single-tenant installs are backfilled to org_default.
ALTER TABLE `users` ADD `organization_id` text DEFAULT 'org_default' NOT NULL;--> statement-breakpoint
ALTER TABLE `domains` ADD `organization_id` text DEFAULT 'org_default' NOT NULL;--> statement-breakpoint
ALTER TABLE `mailboxes` ADD `organization_id` text DEFAULT 'org_default' NOT NULL;--> statement-breakpoint
CREATE INDEX `users_organization_idx` ON `users` (`organization_id`);--> statement-breakpoint
CREATE INDEX `domains_organization_idx` ON `domains` (`organization_id`);--> statement-breakpoint
CREATE INDEX `mailboxes_organization_idx` ON `mailboxes` (`organization_id`);--> statement-breakpoint
UPDATE `users` SET `organization_id` = 'org_default' WHERE `organization_id` IS NULL OR `organization_id` = '';--> statement-breakpoint
UPDATE `domains` SET `organization_id` = COALESCE(
	(SELECT `organization_id` FROM `users` WHERE `users`.`id` = `domains`.`user_id`),
	'org_default'
);--> statement-breakpoint
UPDATE `mailboxes` SET `organization_id` = COALESCE(
	(SELECT `organization_id` FROM `users` WHERE `users`.`id` = `mailboxes`.`user_id`),
	'org_default'
);
