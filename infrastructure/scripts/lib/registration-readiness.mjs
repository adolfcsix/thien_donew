/** Static registration contract from AuthService and immutable SQL migrations.
 * No SQL mutations and no user identity/password data are needed.
 */
export const ACCOUNT_COLUMNS = Object.freeze({
  users: ['id', 'email', 'username', 'password_hash', 'salt'],
  sessions: ['token_hash', 'user_id', 'expires_at', 'device_label'],
  account_security_events: ['user_id', 'event'],
});
export const ACCOUNT_MIGRATIONS = Object.freeze([
  '001_core.sql', '015_admin_billing.sql', '019_account_admin_mfa.sql',
]);

export function analyzeRegistrationSchema(migrations, columns) {
  const ledger = new Set(migrations);
  const present = new Set(columns.map(({table_name, column_name}) => `${table_name}.${column_name}`));
  const missingMigrations = ACCOUNT_MIGRATIONS.filter(name => !ledger.has(name));
  const missingColumns = Object.entries(ACCOUNT_COLUMNS).flatMap(([table, fields]) => fields
    .filter(field => !present.has(`${table}.${field}`)).map(field => `${table}.${field}`));
  return {ok:missingMigrations.length===0 && missingColumns.length===0, missingMigrations, missingColumns};
}
