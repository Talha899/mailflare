-- Rename legacy default product name to Postora when still set to Mailflare.
UPDATE `app_settings` SET `app_name` = 'Postora' WHERE `app_name` = 'Mailflare';
