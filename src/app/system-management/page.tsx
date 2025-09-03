'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';

interface SystemInfo {
  version: string;
  installDate: string;
  database: {
    exists: boolean;
    size: string;
    modified: string;
  };
  images: {
    count: number;
    size: string;
  };
  server: {
    running: boolean;
    pid: string | null;
  };
}

interface BackupLists {
  database: BackupFile[];
  images: BackupFile[];
  system: BackupFile[];
}

interface BackupFile {
  filename: string;
  size: string;
  created: string;
}

interface VersionInfo {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  error: string | null;
}

export default function SystemManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [backups, setBackups] = useState<BackupLists | null>(null);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [currentPage, setCurrentPage] = useState('system-management');

  useEffect(() => {
    if (status === 'loading') return; // Still loading session
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    
    if (session.user.role !== 'admin') {
      router.push('/'); // Redirect non-admins to dashboard
      return;
    }
    
    // User is admin, load data
    loadSystemInfo();
    loadBackups();
    loadVersionInfo();
  }, [session, status, router]);

  const loadSystemInfo = async () => {
    try {
      const response = await fetch('/api/system/info');
      if (response.ok) {
        const data = await response.json();
        setSystemInfo(data);
      }
    } catch (error) {
      console.error('Error loading system info:', error);
    }
    setLoading(false);
  };

  const loadBackups = async () => {
    try {
      const response = await fetch('/api/system/backups');
      if (response.ok) {
        const data = await response.json();
        setBackups(data);
      }
    } catch (error) {
      console.error('Error loading backups:', error);
    }
  };

  const loadVersionInfo = async () => {
    try {
      const response = await fetch('/api/system/version');
      if (response.ok) {
        const data = await response.json();
        setVersionInfo(data);
      }
    } catch (error) {
      console.error('Error loading version info:', error);
    }
  };

  const createBackup = async (type: 'database' | 'images' | 'system') => {
    setBackupLoading(type);
    setMessage(null);
    
    try {
      const response = await fetch('/api/system/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        await loadBackups(); // Refresh backup list
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create backup' });
    }
    
    setBackupLoading(null);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Loading system information...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Access denied. Admin privileges required.</p>
        </div>
      </div>
    );
  }

  const handlePageChange = (page: string) => {
    if (page !== 'system-management') {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
        <Navigation currentPage={currentPage} onPageChange={handlePageChange} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">System Management</h1>
            <p className="text-gray-600 mt-2">Manage system backups, updates, and configuration</p>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
              message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
              'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* System Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">System Information</h2>
              {systemInfo && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900">Application</h3>
                    <p className="text-sm text-gray-600">Version: {systemInfo.version}</p>
                    <p className="text-sm text-gray-600">Installed: {formatDate(systemInfo.installDate)}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900">Database</h3>
                    {systemInfo.database.exists ? (
                      <>
                        <p className="text-sm text-gray-600">Size: {systemInfo.database.size}</p>
                        <p className="text-sm text-gray-600">Modified: {formatDate(systemInfo.database.modified)}</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-600">No database found</p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900">Images</h3>
                    <p className="text-sm text-gray-600">Files: {systemInfo.images.count}</p>
                    <p className="text-sm text-gray-600">Size: {systemInfo.images.size}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900">Server</h3>
                    <p className="text-sm text-gray-600">
                      Status: {systemInfo.server.running ? (
                        <span className="text-green-600 font-medium">Running (PID: {systemInfo.server.pid})</span>
                      ) : (
                        <span className="text-red-600 font-medium">Stopped</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Backup Management */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Backup Management</h2>
              <div className="space-y-3">
                <button
                  onClick={() => createBackup('database')}
                  disabled={backupLoading === 'database'}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {backupLoading === 'database' ? (
                    <>
                      <div className="spinner-sm mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>💾 Backup Database</>
                  )}
                </button>
                
                <button
                  onClick={() => createBackup('images')}
                  disabled={backupLoading === 'images'}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {backupLoading === 'images' ? (
                    <>
                      <div className="spinner-sm mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>🖼️ Backup Images</>
                  )}
                </button>
                
                <button
                  onClick={() => createBackup('system')}
                  disabled={backupLoading === 'system'}
                  className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {backupLoading === 'system' ? (
                    <>
                      <div className="spinner-sm mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>📦 Full System Backup</>
                  )}
                </button>
              </div>

              {/* Version Check */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3">Version Management</h3>
                {versionInfo && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Current: <span className="font-medium">{versionInfo.currentVersion}</span>
                    </p>
                    {versionInfo.latestVersion && (
                      <p className="text-sm text-gray-600">
                        Latest: <span className="font-medium">{versionInfo.latestVersion}</span>
                      </p>
                    )}
                    {versionInfo.updateAvailable && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800 font-medium">Update Available!</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          A newer version ({versionInfo.latestVersion}) is available.
                        </p>
                      </div>
                    )}
                    {versionInfo.error && (
                      <p className="text-sm text-red-600">{versionInfo.error}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Backup History */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Backups</h2>
              {backups && (
                <div className="space-y-4">
                  {/* Database Backups */}
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm mb-2">Database</h3>
                    {backups.database.length > 0 ? (
                      <div className="space-y-1">
                        {backups.database.slice(0, 3).map((backup, index) => (
                          <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            <div className="font-medium">{backup.filename}</div>
                            <div>{backup.size} • {formatDate(backup.created)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No database backups</p>
                    )}
                  </div>

                  {/* Image Backups */}
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm mb-2">Images</h3>
                    {backups.images.length > 0 ? (
                      <div className="space-y-1">
                        {backups.images.slice(0, 3).map((backup, index) => (
                          <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            <div className="font-medium">{backup.filename}</div>
                            <div>{backup.size} • {formatDate(backup.created)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No image backups</p>
                    )}
                  </div>

                  {/* System Backups */}
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm mb-2">System</h3>
                    {backups.system.length > 0 ? (
                      <div className="space-y-1">
                        {backups.system.slice(0, 3).map((backup, index) => (
                          <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            <div className="font-medium">{backup.filename}</div>
                            <div>{backup.size} • {formatDate(backup.created)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No system backups</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}