-- 004_seed_categories.sql
-- Seeds the default business categories from the shared spreadsheet.
-- Run after 001_initial_schema.sql, which creates `categories`.

INSERT INTO `categories`
  (`name`, `slug`, `description`, `icon`, `sort_order`, `is_active`)
VALUES
  (
    'Hotels & Lodging',
    'hotels-lodging',
    'Hotels, guest houses, short-lets and other places to stay',
    'https://drive.google.com/drive/folders/1LDiC8MQTR3Ana5rYM9aEGZrKZ-6ZQp7M?usp=drive_link',
    1,
    TRUE
  ),
  (
    'Dining & Restaurants',
    'dining-restaurants',
    'Restaurants, cafes, bars and other places to eat and drink',
    'https://drive.google.com/drive/folders/1v7T_wvb9zEsdkqmB9sATZ-4pOP8gQC66?usp=drive_link',
    2,
    TRUE
  ),
  (
    'Things to Do',
    'things-to-do',
    'Attractions, entertainment, tours and leisure activities',
    'https://drive.google.com/drive/folders/1AxUddRrL12JOT81xOLgROQjiM7Bc9u5Z?usp=drive_link',
    3,
    TRUE
  ),
  (
    'Shops & Retail',
    'shops-retail',
    'Stores, markets, boutiques and other places to shop',
    'https://drive.google.com/drive/folders/1q3rCTbmmNctiMbK1UxASlKQEpt2ocA6k?usp=drive_link',
    4,
    TRUE
  ),
  (
    'Others',
    'others',
    'Businesses that do not fit the other categories',
    'https://drive.google.com/drive/folders/13c6KjmHr7rOqmcov1tyojROC0O_heXIv?usp=drive_link',
    5,
    TRUE
  )
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `icon` = VALUES(`icon`),
  `sort_order` = VALUES(`sort_order`),
  `is_active` = VALUES(`is_active`);
