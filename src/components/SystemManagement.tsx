'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAuth } from '@/lib/hooks/useAuth';
import { ChangelogEntry } from '@/lib/changelog';

interface SystemInfo {
  version: string;
  installDate: string;
  upgradeDate: string | null;
  environment: string;
  database: {
    mode: string;
    status: string;
    error: string | null;
    isMultiTenant: boolean;
    details: {
      type: string;
      host?: string;
      port?: string;
      database?: string;
      tenantCount?: number;
      totalCards?: number;
      totalUsers?: number;
      connectionPool?: string;
      features?: string[];
      file?: {
        exists: boolean;
        size: string;
        modified: string;
        path: string;
      };
      error?: string;
    };
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

interface StorageMetrics {
  database: {
    size: number;
    sizeFormatted: string;
    lastModified: string | null;
    exists: boolean;
  };
  uploads: {
    size: number;
    sizeFormatted: string;
    fileCount: number;
    path: string;
  };
  application: {
    totalSize: number;
    totalSizeFormatted: string;
  };
  system: {
    total: string;
    used: string;
    available: string;
    usePercentage: number;
    platform: string;
    nodeVersion: string;
  };
  timestamp: string;
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

export default function SystemManagement() {
  const { data: session } = useSession();
  const { canManageGlobalSystem } = useAuth();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [backups, setBackups] = useState<BackupLists | null>(null);
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageLoading, setStorageLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (canManageGlobalSystem && session) {
      loadSystemInfo();
      loadBackups();
      loadVersionInfo();
      loadChangelog();
      loadStorageMetrics();
    }
  }, [canManageGlobalSystem, session]);

  // Auto-refresh storage metrics every 5 minutes
  useEffect(() => {
    if (canManageGlobalSystem && session) {
      const interval = setInterval(() => {
        loadStorageMetrics();
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [canManageGlobalSystem, session]);

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

  const loadChangelog = async () => {
    try {
      const response = await fetch('/api/system/changelog?limit=10');
      if (response.ok) {
        const data = await response.json();
        setChangelog(data.changelog || []);
      }
    } catch (error) {
      console.error('Error loading changelog:', error);
    }
  };

  const loadStorageMetrics = async () => {
    setStorageLoading(true);
    try {
      const response = await fetch('/api/system/storage');
      if (response.ok) {
        const data = await response.json();
        setStorageMetrics(data);
      } else {
        console.error('Failed to load storage metrics:', response.status);
      }
    } catch (error) {
      console.error('Error loading storage metrics:', error);
    }
    setStorageLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">Loading system information...</p>
        </div>
      </div>
    );
  }

  return (
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

      {/* Storage Dashboard - Full Width */}
      {storageMetrics && (
        <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Storage Dashboard</h2>
            <button
              onClick={loadStorageMetrics}
              disabled={storageLoading}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50"
            >
              {storageLoading ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Database Storage */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-blue-900">Database</h3>
                <span className="text-2xl">🗄️</span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-blue-800">{storageMetrics.database.sizeFormatted}</p>
                <p className="text-sm text-blue-700">
                  Status: {storageMetrics.database.exists ? 'Active' : 'Missing'}
                </p>
                {storageMetrics.database.lastModified && (
                  <p className="text-xs text-blue-600">
                    Modified: {new Date(storageMetrics.database.lastModified).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Upload Storage */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-green-900">Uploads</h3>
                <span className="text-2xl">🖼️</span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-green-800">{storageMetrics.uploads.sizeFormatted}</p>
                <p className="text-sm text-green-700">
                  {storageMetrics.uploads.fileCount} files
                </p>
                <p className="text-xs text-green-600 truncate" title={storageMetrics.uploads.path}>
                  {storageMetrics.uploads.path.split('/').pop()}
                </p>
              </div>
            </div>

            {/* Total Application */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-purple-900">Application Total</h3>
                <span className="text-2xl">📦</span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-purple-800">{storageMetrics.application.totalSizeFormatted}</p>
                <p className="text-sm text-purple-700">Database + Uploads</p>
                <p className="text-xs text-purple-600">
                  Node.js {storageMetrics.system.nodeVersion}
                </p>
              </div>
            </div>

            {/* System Disk Space */}
            <div className={`border rounded-lg p-4 ${
              storageMetrics.system.usePercentage > 90 
                ? 'bg-red-50 border-red-200' 
                : storageMetrics.system.usePercentage > 75 
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className={`font-medium ${
                  storageMetrics.system.usePercentage > 90 
                    ? 'text-red-900' 
                    : storageMetrics.system.usePercentage > 75 
                    ? 'text-yellow-900' 
                    : 'text-gray-900'
                }`}>System Disk</h3>
                <span className="text-2xl">💽</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={`text-sm ${
                    storageMetrics.system.usePercentage > 90 
                      ? 'text-red-700' 
                      : storageMetrics.system.usePercentage > 75 
                      ? 'text-yellow-700' 
                      : 'text-gray-700'
                  }`}>Used: {storageMetrics.system.used}</span>
                  <span className={`text-sm font-medium ${
                    storageMetrics.system.usePercentage > 90 
                      ? 'text-red-800' 
                      : storageMetrics.system.usePercentage > 75 
                      ? 'text-yellow-800' 
                      : 'text-gray-800'
                  }`}>{storageMetrics.system.usePercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      storageMetrics.system.usePercentage > 90 
                        ? 'bg-red-600' 
                        : storageMetrics.system.usePercentage > 75 
                        ? 'bg-yellow-500' 
                        : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(storageMetrics.system.usePercentage, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className={storageMetrics.system.usePercentage > 90 ? 'text-red-600' : storageMetrics.system.usePercentage > 75 ? 'text-yellow-600' : 'text-gray-600'}>
                    Available: {storageMetrics.system.available}
                  </span>
                  <span className={storageMetrics.system.usePercentage > 90 ? 'text-red-600' : storageMetrics.system.usePercentage > 75 ? 'text-yellow-600' : 'text-gray-600'}>
                    Total: {storageMetrics.system.total}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Storage Alerts */}
          {storageMetrics.system.usePercentage > 75 && (
            <div className={`mt-4 p-4 rounded-lg border ${
              storageMetrics.system.usePercentage > 90 
                ? 'bg-red-50 border-red-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-start">
                <span className="text-2xl mr-3">
                  {storageMetrics.system.usePercentage > 90 ? '🚨' : '⚠️'}
                </span>
                <div>
                  <h4 className={`font-medium ${
                    storageMetrics.system.usePercentage > 90 ? 'text-red-900' : 'text-yellow-900'
                  }`}>
                    {storageMetrics.system.usePercentage > 90 ? 'Critical: Low Disk Space' : 'Warning: Disk Space Running Low'}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    storageMetrics.system.usePercentage > 90 ? 'text-red-700' : 'text-yellow-700'
                  }`}>
                    Your system disk is {storageMetrics.system.usePercentage}% full. 
                    {storageMetrics.system.usePercentage > 90 
                      ? ' Consider freeing up space or expanding storage immediately to prevent application issues.'
                      : ' Consider cleaning up old backups or expanding storage capacity soon.'
                    }
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => setMessage({ 
                        type: 'info', 
                        text: 'Backup cleanup: You can safely delete old backup files from the backups directory to free up space.' 
                      })}
                      className={`px-3 py-1 text-xs rounded-md ${
                        storageMetrics.system.usePercentage > 90 
                          ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                          : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      }`}
                    >
                      💡 Cleanup Tips
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 text-xs text-gray-500 text-right">
            Last updated: {new Date(storageMetrics.timestamp).toLocaleString()}
          </div>
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
                {systemInfo.upgradeDate && (
                  <p className="text-sm text-gray-600">Last Upgrade: {formatDate(systemInfo.upgradeDate)}</p>
                )}
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900">Database</h3>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-gray-600">Mode: </span>
                    <span className={`font-medium ${systemInfo.database.isMultiTenant ? 'text-blue-600' : 'text-purple-600'}`}>
                      {systemInfo.database.mode}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-600">Status: </span>
                    <span className={`font-medium ${
                      systemInfo.database.status === 'Connected' ? 'text-green-600' : 
                      systemInfo.database.status === 'Disconnected' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {systemInfo.database.status}
                    </span>
                  </p>
                  
                  {systemInfo.database.error && (
                    <p className="text-sm text-red-600">Error: {systemInfo.database.error}</p>
                  )}
                  
                  {/* Database-specific details */}
                  {systemInfo.database.details && (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-600">Type: {systemInfo.database.details.type}</p>
                      
                      {systemInfo.database.isMultiTenant ? (
                        // PostgreSQL details
                        <>
                          <p className="text-sm text-gray-600">Host: {systemInfo.database.details.host}:{systemInfo.database.details.port}</p>
                          <p className="text-sm text-gray-600">Database: {systemInfo.database.details.database}</p>
                          {typeof systemInfo.database.details.tenantCount !== 'undefined' && (
                            <>
                              <p className="text-sm text-gray-600">Tenants: {systemInfo.database.details.tenantCount}</p>
                              <p className="text-sm text-gray-600">Total Cards: {systemInfo.database.details.totalCards}</p>
                              <p className="text-sm text-gray-600">Total Users: {systemInfo.database.details.totalUsers}</p>
                            </>
                          )}
                          <p className="text-sm text-gray-600">Connection Pool: {systemInfo.database.details.connectionPool}</p>
                          <p className="text-sm text-gray-600">Backup Method: pg_dump + JSON fallback</p>
                        </>
                      ) : (
                        // SQLite details
                        systemInfo.database.details.file && (
                          <>
                            <p className="text-sm text-gray-600">File: {systemInfo.database.details.file.exists ? 'Found' : 'Missing'}</p>
                            {systemInfo.database.details.file.exists && (
                              <>
                                <p className="text-sm text-gray-600">Size: {systemInfo.database.details.file.size}</p>
                                <p className="text-sm text-gray-600">Modified: {formatDate(systemInfo.database.details.file.modified)}</p>
                              </>
                            )}
                            {typeof systemInfo.database.details.totalCards !== 'undefined' && (
                              <>
                                <p className="text-sm text-gray-600">Total Cards: {systemInfo.database.details.totalCards}</p>
                                <p className="text-sm text-gray-600">Total Users: {systemInfo.database.details.totalUsers}</p>
                              </>
                            )}
                            <p className="text-sm text-gray-600">Backup Method: File copy + verification</p>
                          </>
                        )
                      )}
                      
                      {/* Features */}
                      {systemInfo.database.details.features && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Features:</p>
                          <div className="flex flex-wrap gap-1">
                            {systemInfo.database.details.features.map((feature, idx) => (
                              <span key={idx} className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                    <p className="text-xs text-yellow-700 mt-1">
                      Run <code className="bg-yellow-100 px-1 rounded">./upgrade.sh</code> from terminal to upgrade.
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

      {/* Changelog Section */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Release History</h2>
        {changelog.length > 0 ? (
          <div className="space-y-6">
            {changelog.map((entry, index) => (
              <div key={entry.version} className="border-l-4 border-blue-500 pl-6 pb-6">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    v{entry.version}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    entry.type === 'major' ? 'bg-red-100 text-red-800' :
                    entry.type === 'minor' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {entry.type}
                  </span>
                  <span className="text-sm text-gray-500">{entry.releaseDate}</span>
                </div>
                
                <h4 className="font-medium text-gray-900 mb-2">{entry.title}</h4>
                <p className="text-gray-600 mb-4">{entry.description}</p>

                {entry.breaking && entry.breaking.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <h5 className="font-medium text-red-900 mb-2">🚨 Breaking Changes</h5>
                    <ul className="list-disc list-inside text-sm text-red-800 space-y-1">
                      {entry.breaking.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {entry.changes.added && entry.changes.added.length > 0 && (
                    <div>
                      <h5 className="font-medium text-green-900 mb-2">✨ Added</h5>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {entry.changes.added.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {entry.changes.changed && entry.changes.changed.length > 0 && (
                    <div>
                      <h5 className="font-medium text-blue-900 mb-2">🔄 Changed</h5>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {entry.changes.changed.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {entry.changes.fixed && entry.changes.fixed.length > 0 && (
                    <div>
                      <h5 className="font-medium text-purple-900 mb-2">🔧 Fixed</h5>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {entry.changes.fixed.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {entry.changes.security && entry.changes.security.length > 0 && (
                    <div>
                      <h5 className="font-medium text-red-900 mb-2">🔒 Security</h5>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {entry.changes.security.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {entry.changes.removed && entry.changes.removed.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">🗑️ Removed</h5>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        {entry.changes.removed.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {index < changelog.length - 1 && (
                  <div className="mt-6 border-b border-gray-200"></div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No release history available.</p>
        )}
      </div>
    </div>
  );
}