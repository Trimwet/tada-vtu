'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { LoadingIcon } from '@/components/loading-icons';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ApiKey {
  id: string;
  name: string;
  api_key: string;
  api_secret: string;
  is_active: boolean;
  monthly_limit: number;
  monthly_usage: number;
  created_at: string;
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

// Simple SVG Icon Components
const KeyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.844zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
  </svg>
);

const WebhookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M11.35 3.836c-.065.21-.1.435-.1.66 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.66m-7.2 4.248a2.25 2.25 0 013.013-1.244A2.628 2.628 0 0112.75 9c0 1.107.36 2.107.968 2.828a2.25 2.25 0 01-2.246 3.373h-3.63" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75zm0 6A.75.75 0 013.75 12h16.5a.75.75 0 010 1.5H3.75z" clipRule="evenodd" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6M13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3m-10.5 2.25a2.25 2.25 0 112.25 2.25v8.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V7.5a2.25 2.25 0 012.25-2.25h5.25z" clipRule="evenodd" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.844z" clipRule="evenodd" />
    <path d="M9.75 9h.008v.008h-.008V9zm.75 1.5h.008v.008h-.008v-.008zm.75 1.5h.008v.008h-.008v-.008zm-6 1.5h.008v.008H4.5v-.008zm.75-1.5h.008v.008h-.008v-.008zm.75-1.5h.008v.008h-.008V9zm6-.375h.008v.008h-.008v-.008zm-.75 0h.008v.008h-.008V9zm.75 1.5h.008v.008h-.008v-.008zm-6 0h.008v.008H4.5v-.008zm0 1.5h.008v.008H4.5v-.008zm6 .375h.008v.008h-.008v-.008zm-.75-1.5h.008v.008h-.008V9z" />
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
  </svg>
);

export default function DeveloperPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
    await fetchApiKeys(user.id);
    await fetchWebhooks(user.id);
    setLoading(false);
  }

  async function fetchApiKeys(userId: string) {
    const { data, error } = await supabase
      .from('reseller_api_keys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setApiKeys(data as ApiKey[]);
    }
  }

  async function fetchWebhooks(userId: string) {
    const { data, error } = await supabase
      .from('reseller_webhooks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setWebhooks(data as Webhook[]);
    }
  }

  async function createApiKey() {
    if (!user || !newKeyName.trim()) return;
    setSaving(true);

    try {
      const apiKey = 'tada_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const apiSecret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const { error } = await supabase
        .from('reseller_api_keys')
        .insert({
          user_id: user.id,
          api_key: apiKey,
          api_secret: apiSecret,
          name: newKeyName.trim(),
          is_active: true,
          monthly_limit: 100000,
          monthly_usage: 0,
        });

      if (error) throw error;

      await fetchApiKeys(user.id);
      setShowCreateKey(false);
      setNewKeyName('');
    } catch (error) {
      console.error('Error creating API key:', error);
      alert('Failed to create API key');
    }
    setSaving(false);
  }

  async function toggleApiKey(key: ApiKey) {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('reseller_api_keys')
      .update({ is_active: !key.is_active })
      .eq('id', key.id);

    if (!error) {
      await fetchApiKeys(user.id);
    }
    setSaving(false);
  }

  async function deleteApiKey(key: ApiKey) {
    if (!user || !confirm('Are you sure you want to delete this API key?')) return;
    setSaving(true);

    const { error } = await supabase
      .from('reseller_api_keys')
      .delete()
      .eq('id', key.id);

    if (!error) {
      await fetchApiKeys(user.id);
    }
    setSaving(false);
  }

  async function createWebhook() {
    if (!user || !newWebhookUrl.trim()) return;
    
    try {
      new URL(newWebhookUrl);
    } catch {
      alert('Please enter a valid URL');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('reseller_webhooks')
        .insert({
          user_id: user.id,
          url: newWebhookUrl.trim(),
          events: ['transaction.completed', 'transaction.failed'],
          is_active: true,
        });

      if (error) throw error;

      await fetchWebhooks(user.id);
      setShowCreateWebhook(false);
      setNewWebhookUrl('');
    } catch (error) {
      console.error('Error creating webhook:', error);
      alert('Failed to create webhook');
    }
    setSaving(false);
  }

  async function toggleWebhook(webhook: Webhook) {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('reseller_webhooks')
      .update({ is_active: !webhook.is_active })
      .eq('id', webhook.id);

    if (!error) {
      await fetchWebhooks(user.id);
    }
    setSaving(false);
  }

  async function deleteWebhook(webhook: Webhook) {
    if (!user || !confirm('Are you sure you want to delete this webhook?')) return;
    setSaving(true);

    const { error } = await supabase
      .from('reseller_webhooks')
      .delete()
      .eq('id', webhook.id);

    if (!error) {
      await fetchWebhooks(user.id);
    }
    setSaving(false);
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingIcon />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Developer Options</h1>
          <p className="text-gray-600">Manage your API keys and webhooks for external integrations</p>
        </div>

        {/* API Keys Section */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <KeyIcon />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
                  <p className="text-sm text-gray-500">Use these keys to authenticate API requests</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateKey(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <PlusIcon />
                Create Key
              </button>
            </div>
          </div>

          <div className="p-6">
            {apiKeys.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <KeyIcon />
                <p className="mt-2">No API keys yet. Create one to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <div key={key.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-gray-900">{key.name}</h3>
                          {key.is_active ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                              <CheckIcon /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                              <XIcon /> Inactive
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">API Key:</span>
                            <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">{key.api_key}</code>
                            <button
                              onClick={() => copyToClipboard(key.api_key, key.id + '-key')}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              {copied === key.id + '-key' ? <CheckIcon /> : <CopyIcon />}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Secret:</span>
                            <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">••••••••••••</code>
                            <button
                              onClick={() => copyToClipboard(key.api_secret, key.id + '-secret')}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              {copied === key.id + '-secret' ? <CheckIcon /> : <CopyIcon />}
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Usage: ₦{key.monthly_usage?.toLocaleString() || 0} / ₦{key.monthly_limit?.toLocaleString() || 100000}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleApiKey(key)}
                          className={`p-2 rounded-lg ${key.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={key.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {key.is_active ? <XIcon /> : <CheckIcon />}
                        </button>
                        <button
                          onClick={() => deleteApiKey(key)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Webhooks Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <WebhookIcon />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Webhooks</h2>
                  <p className="text-sm text-gray-500">Get notified when transactions complete</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateWebhook(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <PlusIcon />
                Add Webhook
              </button>
            </div>
          </div>

          <div className="p-6">
            {webhooks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <WebhookIcon />
                <p className="mt-2">No webhooks yet. Add one to receive transaction notifications!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-gray-900">{webhook.url}</h3>
                          {webhook.is_active ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                              <CheckIcon /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                              <XIcon /> Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {webhook.events?.map((event) => (
                            <span key={event} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {event}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleWebhook(webhook)}
                          className={`p-2 rounded-lg ${webhook.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={webhook.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {webhook.is_active ? <XIcon /> : <CheckIcon />}
                        </button>
                        <button
                          onClick={() => deleteWebhook(webhook)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create API Key Modal */}
      {showCreateKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New API Key</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., My Website"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateKey(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createApiKey}
                disabled={saving || !newKeyName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Webhook Modal */}
      {showCreateWebhook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Add New Webhook</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
              <input
                type="url"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/webhook"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">We'll send POST requests to this URL when transactions complete</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateWebhook(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createWebhook}
                disabled={saving || !newWebhookUrl.trim()}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Webhook'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
