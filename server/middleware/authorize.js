// Authorization middleware. A single reusable factory so role
// checks are never duplicated across routes — pass the roles
// allowed for a given endpoint, e.g. authorize(['super_admin']) or
// authorize(['super_admin', 'level_1']).
//
// Must run after authenticate — it reads req.user, which only
// authenticate sets.

export function authorize(allowedRoles) {
  return function authorizeMiddleware(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

export default authorize;
