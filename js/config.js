/* Deployment configuration for shared attendance storage.
 *
 * attendanceApi options:
 *   'auto' (default) → use the same-origin endpoint /api/attendance.
 *     Works when the Node server.js runs on the same domain as the app
 *     (e.g. http://localhost:3000 locally, or a VPS/host serving both).
 *
 *   A full URL → point at a separately hosted backend, e.g. a Node server
 *     deployed on Render/Railway/Fly.io/VPS:
 *       'https://your-app.onrender.com/api/attendance'
 *
 * When no backend is reachable the app still works, but attendance is kept
 * only in that browser's localStorage (per device) and a "local-only"
 * notice is shown in the reports. To share attendance across all teachers
 * and devices, deploy server.js and set attendanceApi accordingly.
 */
window.LKC_CONFIG = window.LKC_CONFIG || {};
window.LKC_CONFIG.attendanceApi = window.LKC_CONFIG.attendanceApi || 'auto';
