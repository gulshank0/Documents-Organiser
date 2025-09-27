'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/ui/Navigation';
import { DocumentIntegration, DOCUMENT_CHANNELS } from '@/types';
type DocumentChannel = keyof typeof DOCUMENT_CHANNELS;
import { getChannelIcon, getChannelColor, formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  CogIcon,
  PlayIcon,
  PauseIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<DocumentIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations');
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const toggleIntegration = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus })
      });

      if (response.ok) {
        setIntegrations(prev => 
          prev.map(integration => 
            integration.id === String(id) 
              ? { ...integration, isActive: !currentStatus }
              : integration
          )
        );
        toast.success(`Integration ${!currentStatus ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      toast.error('Failed to update integration');
    }
  };

  const getStatusIcon = (isActive: boolean, lastSync?: string) => {
    if (!isActive) {
      return <PauseIcon className="w-5 h-5 text-muted-foreground" />;
    }
    if (lastSync) {
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    }
    return <ClockIcon className="w-5 h-5 text-yellow-500" />;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Navigation />
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto pt-16 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Document Sources</h1>
                <p className="text-muted-foreground">
                  Manage integrations with email, messaging, cloud storage and other document sources
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl px-4 py-2 transition-all duration-200"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Integration
              </button>
            </div>
          </div>

          {/* Integration Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration) => (
              <div key={integration.id} className="glass-card p-6 bg-card/50 border border-border/50 hover:shadow-lg transition-all duration-300 hover:border-border/70">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">
                      {getChannelIcon(integration.type === 'GMAIL' ? 'EMAIL' : integration.type as DocumentChannel)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{integration.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${getChannelColor(integration.type === 'GMAIL' ? 'EMAIL' : integration.type as DocumentChannel)}`}>
                        {integration.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(integration.isActive, integration.lastSync)}
                    <button
                      onClick={() => toggleIntegration(integration.id, integration.isActive)}
                      className={`p-2 rounded-lg transition-colors ${
                        integration.isActive
                          ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {integration.isActive ? (
                        <PauseIcon className="w-4 h-4" />
                      ) : (
                        <PlayIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={integration.isActive ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                      {integration.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Sync:</span>
                    <span>
                      {integration.lastSync 
                        ? formatRelativeTime(integration.lastSync)
                        : 'Never'
                      }
                    </span>
                  </div>
                </div>

                {/* Integration-specific details */}
                <div className="mt-4 pt-4 border-t border-border/50">
                  {integration.type === 'EMAIL' && (
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between mb-1">
                        <span>Email:</span>
                        <span className="font-mono text-xs">{integration.settings.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Provider:</span>
                        <span>{integration.settings.provider}</span>
                      </div>
                    </div>
                  )}
                  
                  {integration.type === 'WHATSAPP' && (
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Phone:</span>
                        <span className="font-mono text-xs">{integration.settings.phone_number}</span>
                      </div>
                    </div>
                  )}
                  
                  {integration.type === 'DROPBOX' && (
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Folder:</span>
                        <span className="font-mono text-xs">{integration.settings.folder_path}</span>
                      </div>
                    </div>
                  )}

                  {integration.type === 'GOOGLE_DRIVE' && (
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Drives:</span>
                        <span className="text-xs">{integration.settings.shared_drives?.join(', ')}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <button className="text-sm text-primary hover:text-primary/80 flex items-center transition-colors">
                    <CogIcon className="w-4 h-4 mr-1" />
                    Configure
                  </button>
                  <div className="text-xs text-muted-foreground">
                    ID: {integration.id}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {integrations.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                <CogIcon className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No integrations configured</h3>
              <p className="text-muted-foreground mb-6">
                Connect your document sources to automatically import files
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl px-6 py-2 transition-all duration-200"
              >
                Add Your First Integration
              </button>
            </div>
          )}

          {/* Quick Stats */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4 bg-green-50/50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/30">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {integrations.filter(i => i.isActive).length}
              </div>
              <div className="text-sm text-green-800 dark:text-green-300">Active Sources</div>
            </div>
            <div className="glass-card p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {integrations.filter(i => i.lastSync).length}
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-300">Synced Today</div>
            </div>
            <div className="glass-card p-4 bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200/50 dark:border-purple-800/30">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {new Set(integrations.map(i => i.type)).size}
              </div>
              <div className="text-sm text-purple-800 dark:text-purple-300">Source Types</div>
            </div>
            <div className="glass-card p-4 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200/50 dark:border-orange-800/30">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {integrations.filter(i => !i.isActive).length}
              </div>
              <div className="text-sm text-orange-800 dark:text-orange-300">Inactive</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}