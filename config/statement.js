export const businessAccountStatements = {
  findByEmail:
    "SELECT id, owner_name, email, phone, password_hash, status, email_verified_at, last_login_at, created_at FROM business_accounts WHERE email = ? LIMIT 1",

  findById:
    "SELECT id, owner_name, email, phone, status, email_verified_at, last_login_at, created_at FROM business_accounts WHERE id = ? LIMIT 1",

  findExisting:
    "SELECT id, email, phone FROM business_accounts WHERE email = ? OR phone = ? LIMIT 1",

  create:
    "INSERT INTO business_accounts (owner_name, email, phone, password_hash, status) VALUES (?, ?, ?, ?, 'active')",

  updateLastLogin:
    "UPDATE business_accounts SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
};

export const businessStatements = {
  createDraft:
    "INSERT INTO businesses (account_id, name, slug, email, phone, listing_status) VALUES (?, ?, ?, ?, ?, 'draft')",
};
