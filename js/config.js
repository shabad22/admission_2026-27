/* Deployment configuration for shared attendance storage.
 *
 * attendanceApi options:
 *   'auto' (default) → use the same-origin endpoint /api/attendance.
 *     Works when:
 *       - Node server.js runs on the same domain (local: http://localhost:3000)
 *       - Deployed to Netlify with netlify/functions/attendance.js (this repo)
 *       - Any host that serves /api/attendance via redirects/proxy
 *
 *   A full URL → point at a separately hosted backend, e.g. a Node server
 *     deployed on Render/Railway/Fly.io/VPS:
 *       'https://your-app.onrender.com/api/attendance'
 *
 * When no backend is reachable the app still works, but attendance is kept
 * only in that browser's localStorage (per device) and a "local-only"
 * notice is shown in the reports. To share attendance across all teachers
 * and devices, deploy server.js and set attendanceApi accordingly, or deploy
 * to Netlify (includes netlify/functions/attendance.js + netlify.toml).
 */
window.LKC_CONFIG = window.LKC_CONFIG || {};
window.LKC_CONFIG.attendanceApi = window.LKC_CONFIG.attendanceApi || 'auto';
