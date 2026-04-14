/**
 * HiveConsciousness — DID Authentication Middleware
 * Validates agent identity via X-HiveTrust-DID header or Bearer token.
 */

export function requireDID(req, res, next) {
  const did =
    req.headers['x-hivetrust-did'] ||
    extractBearerDID(req.headers.authorization);

  if (!did || !did.startsWith('did:hive:')) {
    return res.status(401).json({
      error: 'authentication_required',
      message: 'Valid DID required. Provide X-HiveTrust-DID header or Authorization: Bearer did:hive:*',
    });
  }

  req.agentDID = did;
  next();
}

export function requireInternalKey(req, res, next) {
  const key = req.headers['x-hive-internal-key'];
  const expected = process.env.HIVE_INTERNAL_KEY;

  if (expected && key !== expected) {
    return res.status(403).json({
      error: 'forbidden',
      message: 'Valid internal key required for this endpoint.',
    });
  }

  next();
}

export function requireAdminKey(req, res, next) {
  const key = req.headers['x-hive-admin-key'];
  const expected = process.env.SERVICE_API_KEY;

  if (expected && key !== expected) {
    return res.status(403).json({
      error: 'forbidden',
      message: 'Admin key required for this endpoint.',
    });
  }

  next();
}

function extractBearerDID(authHeader) {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
    return parts[1];
  }
  return null;
}
