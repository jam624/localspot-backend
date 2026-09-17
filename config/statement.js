// ---------------------------------------------------------------------------
// Business Account statements
// ---------------------------------------------------------------------------

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

  updatePassword:
    "UPDATE business_accounts SET password_hash = ? WHERE id = ?",
};

// ---------------------------------------------------------------------------
// Business (listing) statements
// ---------------------------------------------------------------------------

export const businessStatements = {
  createDraft:
    "INSERT INTO businesses (account_id, name, slug, email, phone, listing_status) VALUES (?, ?, ?, ?, ?, 'draft')",
};

// ---------------------------------------------------------------------------
// Admin statements
// ---------------------------------------------------------------------------

export const adminStatements = {
  findByEmail:
    "SELECT id, name, email, password_hash, role, is_active, last_login_at, created_at FROM admins WHERE email = ? LIMIT 1",

  findById:
    "SELECT id, name, email, role, is_active, last_login_at, created_at FROM admins WHERE id = ? LIMIT 1",

  updateLastLogin:
    "UPDATE admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?",

  updatePassword:
    "UPDATE admins SET password_hash = ? WHERE id = ?",
};

// ---------------------------------------------------------------------------
// Password reset token statements
// ---------------------------------------------------------------------------

export const passwordResetStatements = {
  /**
   * Insert a new reset token.
   * Params: account_type, business_account_id, admin_id, token_hash, expires_at
   */
  create:
    "INSERT INTO password_reset_tokens (account_type, business_account_id, admin_id, token_hash, expires_at) VALUES (?, ?, ?, ?, ?)",

  /**
   * Find a valid (unused, non-expired) token by its hash.
   * Params: token_hash
   */
  findByTokenHash:
    "SELECT id, account_type, business_account_id, admin_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1",

  /**
   * Mark a token as used.
   * Params: id
   */
  markUsed:
    "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?",

  /**
   * Delete all expired tokens (for periodic cleanup).
   */
  deleteExpired:
    "DELETE FROM password_reset_tokens WHERE expires_at < NOW()",
};
