// Stable service-worker shell: the registered URL and scope never change, while the logic lives in the hashed
// `/static/` chunk this imports. A new build rewrites the hash here, and that byte diff is what triggers the
// browser's worker update. Dynamic import() is forbidden in service workers, so this must stay a static import.
import './sw-worker.ts'
