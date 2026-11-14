-- Admin-only copy destination for mail delivered to this mailbox.
-- Webmail and account settings never read this column.
ALTER TABLE `mailboxes` ADD `forwarding_email` text;
