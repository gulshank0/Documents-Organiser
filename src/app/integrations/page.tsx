'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/ui/Navigation';
import { DocumentIntegration, DOCUMENT_CHANNELS, IntegrationType } from '@/types';
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
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

// Integration types for the modal
const INTEGRATION_TYPES: { value: IntegrationType; label: string; description: string; icon: string }[] = [
  { value: 'GMAIL', label: 'Gmail', description: 'Import documents from email attachments', icon: '📧' },
  { value: 'WHATSAPP', label: 'WhatsApp Business', description: 'Receive documents via WhatsApp', icon: '💬' },
  { value: 'SLACK', label: 'Slack', description: 'Monitor channels for shared files', icon: '💬' },
  { value: 'TELEGRAM', label: 'Telegram', description: 'Auto-download from Telegram channels', icon: '✈️' },
  { value: 'GOOGLE_DRIVE', label: 'Google Drive', description: 'Sync files from Google Drive', icon: '☁️' },
  { value: 'DROPBOX', label: 'Dropbox', description: 'Monitor Dropbox folders', icon: '📦' },
  { value: 'TEAMS', label: 'Microsoft Teams', description: 'Access SharePoint document libraries', icon: '👥' },
  { value: 'OUTLOOK', label: 'Outlook', description: 'Import from Outlook email attachments', icon: '📧' }
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<DocumentIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIntegrationType, setSelectedIntegrationType] = useState<IntegrationType | null>(null);
  const [integrationForm, setIntegrationForm] = useState({
    name: '',
    settings: {} as Record<string, any>
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/integrations');
      if (response.ok) {
        const result = await response.json();
        // Handle both old and new API response formats
        const data = result.data || result;
        setIntegrations(Array.isArray(data) ? data : []);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to load integrations');
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const toggleIntegration = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/integrations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus })
      });

      if (response.ok) {
        setIntegrations(prev => 
          prev.map(integration => 
            integration.id === id 
              ? { ...integration, isActive: !currentStatus }
              : integration
          )
        );
        toast.success(`Integration ${!currentStatus ? 'enabled' : 'disabled'}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update integration');
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

  const handleAddIntegration = async () => {
    if (!selectedIntegrationType || !integrationForm.name.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedIntegrationType,
          name: integrationForm.name,
          settings: integrationForm.settings
        })
      });

      if (response.ok) {
        const newIntegration = await response.json();
        setIntegrations(prev => [...prev, newIntegration]);
        setShowAddModal(false);
        setSelectedIntegrationType(null);
        setIntegrationForm({ name: '', settings: {} });
        toast.success('Integration added successfully! Configure it to start ingesting documents.');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to add integration');
      }
    } catch (error) {
      toast.error('Failed to add integration');
    } finally {
      setSubmitting(false);
    }
  };

  const renderIntegrationForm = () => {
    if (!selectedIntegrationType) return null;

    const integration = INTEGRATION_TYPES.find(i => i.value === selectedIntegrationType);
    if (!integration) return null;

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Integration Name *
          </label>
          <input
            type="text"
            value={integrationForm.name}
            onChange={(e) => setIntegrationForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder={`My ${integration.label} Integration`}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {selectedIntegrationType === 'GMAIL' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={integrationForm.settings.email || ''}
              onChange={(e) => setIntegrationForm(prev => ({ 
                ...prev, 
                settings: { ...prev.settings, email: e.target.value }
              }))}
              placeholder="your-email@gmail.com"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        )}

        {selectedIntegrationType === 'WHATSAPP' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Business Phone Number
            </label>
            <input
              type="tel"
              value={integrationForm.settings.phone_number || ''}
              onChange={(e) => setIntegrationForm(prev => ({ 
                ...prev, 
                settings: { ...prev.settings, phone_number: e.target.value }
              }))}
              placeholder="+1234567890"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        )}

        {selectedIntegrationType === 'TELEGRAM' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Bot Token
              </label>
              <input
                type="password"
                value={integrationForm.settings.bot_token || ''}
                onChange={(e) => setIntegrationForm(prev => ({ 
                  ...prev, 
                  settings: { ...prev.settings, bot_token: e.target.value }
                }))}
                placeholder="1234567890:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Chat ID / Channel Username
              </label>
              <input
                type="text"
                value={integrationForm.settings.chat_id || ''}
                onChange={(e) => setIntegrationForm(prev => ({ 
                  ...prev, 
                  settings: { ...prev.settings, chat_id: e.target.value }
                }))}
                placeholder="@your_channel or -1001234567890"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        )}

        {selectedIntegrationType === 'SLACK' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Workspace Name
            </label>
            <input
              type="text"
              value={integrationForm.settings.workspace_name || ''}
              onChange={(e) => setIntegrationForm(prev => ({ 
                ...prev, 
                settings: { ...prev.settings, workspace_name: e.target.value }
              }))}
              placeholder="your-workspace"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        )}

        {selectedIntegrationType === 'DROPBOX' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Folder Path
            </label>
            <input
              type="text"
              value={integrationForm.settings.folder_path || ''}
              onChange={(e) => setIntegrationForm(prev => ({ 
                ...prev, 
                settings: { ...prev.settings, folder_path: e.target.value }
              }))}
              placeholder="/Documents"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        )}

        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30 rounded-lg p-3">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            <strong>Note:</strong> After creating this integration, you'll need to complete the OAuth authorization process to start ingesting documents.
          </p>
        </div>
      </div>
    );
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
                <h1 className="text-3xl font-bold text-foreground mb-2">Document Ingestion Hub</h1>
                <p className="text-muted-foreground max-w-2xl">
                  Connect and configure document sources to automatically receive, process, and store documents from Gmail, WhatsApp, Slack, Telegram, and other platforms. All ingested documents are automatically organized and made searchable with AI-powered semantic search.
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
            
            {/* Ingestion Process Overview */}
            <div className="mt-6 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">How Document Ingestion Works</span>
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <div>• <strong>Receive:</strong> Documents automatically flow in from connected sources</div>
                <div>• <strong>Process:</strong> AI extracts metadata, text, and generates embeddings for semantic search</div>
                <div>• <strong>Organize:</strong> Documents are categorized by department, tags, and smart folders</div>
                <div>• <strong>Search:</strong> Find documents using natural language queries or traditional filters</div>
              </div>
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
                      <span className={`px-2 py-1 rounded-full text-xs ${getChannelColor(integration.type === 'GMAIL' ? 'EMAIL' : integration.type)}`}>
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
                    <span>Ingestion Status:</span>
                    <span className={integration.isActive ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                      {integration.isActive ? 'Receiving Documents' : 'Paused'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Document:</span>
                    <span>
                      {integration.lastSync 
                        ? formatRelativeTime(integration.lastSync)
                        : 'No documents yet'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Ingested:</span>
                    <span className="font-medium">
                      {integration.documentsImported || 0} documents
                    </span>
                  </div>
                </div>

                {/* Integration-specific details */}
                <div className="mt-4 pt-4 border-t border-border/50">
                  {integration.type === 'GMAIL' && (
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between mb-1">
                        <span>Email Account:</span>
                        <span className="font-mono text-xs">{integration.settings.email}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Auto-Import:</span>
                        <span>Attachments & PDFs</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Folders Monitored:</span>
                        <span className="text-xs">{integration.settings.folders?.join(', ') || 'Inbox'}</span>
                      </div>
                    </div>
                  )}
                  
                  {integration.type === 'WHATSAPP' && (
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between mb-1">
                        <span>Business Phone:</span>
                        <span className="font-mono text-xs">{integration.settings.phone_number}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Document Types:</span>
                        <span className="text-xs">Images, PDFs, Videos</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Auto-Process:</span>
                        <span className="text-xs">Media & Documents</span>
                      </div>
                    </div>
                  )}
                  
                  {integration.type === 'SLACK' && (
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between mb-1">
                        <span>Workspace:</span>
                        <span className="text-xs">{integration.settings.workspace_name || 'Connected'}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Channels Monitored:</span>
                        <span className="text-xs">{integration.settings.channels?.join(', ') || '#general'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>File Types:</span>
                        <span className="text-xs">All shared files</span>
                      </div>
                    </div>
                  )}
                  
                  {integration.type === 'DROPBOX' && (
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between mb-1">
                        <span>Sync Folder:</span>
                        <span className="font-mono text-xs">{integration.settings.folder_path}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Auto-Sync:</span>
                        <span className="text-xs">New files only</span>
                      </div>
                    </div>
                  )}

                  {integration.type === 'GOOGLE_DRIVE' && (
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between mb-1">
                        <span>Monitored Drives:</span>
                        <span className="text-xs">{integration.settings.shared_drives?.join(', ') || 'My Drive'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Real-time Sync:</span>
                        <span className="text-xs">Enabled</span>
                      </div>
                    </div>
                  )}

                  {integration.type === 'TELEGRAM' && (
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between mb-1">
                        <span>Bot Token:</span>
                        <span className="font-mono text-xs">{integration.settings.bot_token ? '••••••••' : 'Not configured'}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Channel/Group:</span>
                        <span className="text-xs">{integration.settings.chat_id || '@your_channel'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Auto-Download:</span>
                        <span className="text-xs">Documents & Media</span>
                      </div>
                    </div>
                  )}

                  {integration.type === 'TEAMS' && (
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between mb-1">
                        <span>Teams:</span>
                        <span className="text-xs">{integration.settings.teams?.join(', ') || 'All teams'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Document Library:</span>
                        <span className="text-xs">SharePoint files</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <button className="text-sm text-primary hover:text-primary/80 flex items-center transition-colors">
                    <CogIcon className="w-4 h-4 mr-1" />
                    Configure Ingestion
                  </button>
                  <div className="text-xs text-muted-foreground">
                    {integration.syncStatus === 'syncing' ? (
                      <span className="flex items-center text-blue-500">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1"></div>
                        Ingesting...
                      </span>
                    ) : integration.syncStatus === 'error' ? (
                      <span className="text-red-500">Error</span>
                    ) : (
                      <span>Ready</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {integrations.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 bg-muted rounded-full flex items-center justify-center">
                <div className="text-4xl">📥</div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Document Sources Connected</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Connect your first document source to start receiving and organizing documents automatically. 
                All ingested documents will be processed for semantic search and smart organization.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center justify-center rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl px-6 py-2 transition-all duration-200"
              >
                Connect Your First Source
              </button>
            </div>
          )}

          {/* Enhanced Stats for Ingestion System */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-4 bg-green-50/50 dark:bg-green-900/10 border border-green-200/50 dark:border-green-800/30">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {integrations.filter(i => i.isActive).length}
              </div>
              <div className="text-sm text-green-800 dark:text-green-300">Active Ingesters</div>
            </div>
            <div className="glass-card p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {integrations.reduce((sum, i) => sum + (i.documentsImported || 0), 0)}
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-300">Documents Ingested</div>
            </div>
            <div className="glass-card p-4 bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200/50 dark:border-purple-800/30">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {integrations.filter(i => i.syncStatus === 'syncing').length}
              </div>
              <div className="text-sm text-purple-800 dark:text-purple-300">Currently Ingesting</div>
            </div>
            <div className="glass-card p-4 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-200/50 dark:border-orange-800/30">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {integrations.filter(i => i.lastSync && new Date(i.lastSync).toDateString() === new Date().toDateString()).length}
              </div>
              <div className="text-sm text-orange-800 dark:text-orange-300">Sources Active Today</div>
            </div>
          </div>

          {/* Document Processing Pipeline Status */}
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 border border-blue-200/50 dark:border-blue-800/30 rounded-lg">
            <h3 className="text-lg font-semibold text-foreground mb-4">Document Processing Pipeline</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">📥</span>
                </div>
                <div className="text-sm font-medium text-foreground">Ingest</div>
                <div className="text-xs text-muted-foreground">Receive from sources</div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">🔍</span>
                </div>
                <div className="text-sm font-medium text-foreground">Extract</div>
                <div className="text-xs text-muted-foreground">Text & metadata</div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">🧠</span>
                </div>
                <div className="text-sm font-medium text-foreground">Process</div>
                <div className="text-xs text-muted-foreground">AI semantic analysis</div>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl">🗂️</span>
                </div>
                <div className="text-sm font-medium text-foreground">Organize</div>
                <div className="text-xs text-muted-foreground">Store & categorize</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Integration Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-foreground">Add New Integration</h2>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Select Integration Type *
                </label>
                <select
                  value={selectedIntegrationType || ''}
                  onChange={(e) => setSelectedIntegrationType(e.target.value as IntegrationType)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="" disabled>Select an integration type</option>
                  {INTEGRATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              {renderIntegrationForm()}

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddIntegration}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {submitting ? 'Adding...' : 'Add Integration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}