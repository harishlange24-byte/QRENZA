import AuditLog from "../models/auditLog.model.js";

// Best effort audit trail. A logging failure must never break the request.
export async function recordAudit(req, { action, entityType, entityId = null, merchant = null, store = null, details = {} }) {
  try {
    if (!req?.user?._id) return;
    await AuditLog.create({
      merchant,
      store,
      actor: req.user._id,
      action,
      entityType,
      entityId,
      details,
      ipAddress: req.ip || "",
      userAgent: req.headers?.["user-agent"] || ""
    });
  } catch (error) {
    console.error("recordAudit error :", error.message);
  }
}
