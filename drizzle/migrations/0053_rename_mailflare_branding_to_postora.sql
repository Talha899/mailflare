-- Align stored default branding with Dispatch.
UPDATE `app_settings` SET `app_name` = 'Dispatch' WHERE `app_name` IN ('Mailflare', 'Postora');
