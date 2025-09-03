export interface UploadSession {
  id: string;
  userId: string;
  tenantId: string;
  createdAt: Date;
  imageUrl?: string;
  status: 'waiting' | 'uploaded' | 'expired';
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  tenant_id?: string;
}

export interface UploadResponse {
  message: string;
  imageUrl: string;
  filename: string;
  sessionId?: string;
}

export interface QRResponse {
  sessionId: string;
  qrCode: string;
  mobileUrl: string;
  expiresAt: string;
}