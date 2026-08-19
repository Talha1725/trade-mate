export const AUDIT_ACTION_MAP: Record<string, string> = {
  "Inject Trade": "admin.trade_create",
  "Close Position": "admin.trade_delete",
  "Account Update": "admin.provision_user",
  "Bulk Push": "admin.trade_bulk_push",
  "Modify Trade": "admin.trade_update",
};
