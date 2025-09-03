// Persistent session storage for development
interface UploadSession {
  id: string;
  userId: string;
  tenantId: string;
  createdAt: Date;
  imageUrl?: string;
  status: 'waiting' | 'uploaded' | 'expired';
}

// Use a global variable that persists across hot reloads in development
declare global {
  var __mobileUploadSessions: Map<string, UploadSession> | undefined;
}

// Initialize the global session storage
if (!globalThis.__mobileUploadSessions) {
  globalThis.__mobileUploadSessions = new Map<string, UploadSession>();
}

export const sessionStorage = globalThis.__mobileUploadSessions;

// Clean up expired sessions (older than 10 minutes)
export const cleanupExpiredSessions = () => {
  const now = new Date();
  const expirationTime = 10 * 60 * 1000; // 10 minutes
  
  for (const [sessionId, session] of sessionStorage.entries()) {
    if (now.getTime() - session.createdAt.getTime() > expirationTime) {
      sessionStorage.delete(sessionId);
    }
  }
};

export type { UploadSession };