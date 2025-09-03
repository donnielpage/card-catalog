import { UploadSession } from '../types';

// In-memory session storage (for development)
// In production, use Redis or another persistent store
class SessionStorage {
  private sessions: Map<string, UploadSession> = new Map();

  set(sessionId: string, session: UploadSession): void {
    this.sessions.set(sessionId, session);
  }

  get(sessionId: string): UploadSession | undefined {
    return this.sessions.get(sessionId);
  }

  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  entries(): IterableIterator<[string, UploadSession]> {
    return this.sessions.entries();
  }

  cleanup(): void {
    const now = new Date();
    const expirationTime = 10 * 60 * 1000; // 10 minutes

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.createdAt.getTime() > expirationTime) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

export const sessionStorage = new SessionStorage();

// Clean up expired sessions every 5 minutes
setInterval(() => {
  sessionStorage.cleanup();
}, 5 * 60 * 1000);