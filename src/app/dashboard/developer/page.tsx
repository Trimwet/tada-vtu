'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getSupabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { IonIcon } from '@/components/ion-icon';
import WebhookIcon from '@/components/icons/WebhookIcon';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

export default function DeveloperPage() {
  const { profile, loading: authLoading } = useAuth();
  const supabase = getSupabase();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && profile?.id) {
      fetchApiKeys();
      fetchWebhooks();
    }
  }, [authLoading, profile?.id, fetchApiKeys, fetchWebhooks]);

  const fetchApiKeys = useCallback(async () => {
    if (!supabase || !profile?.id) return;
    
    const { data, error } = await supabase
      .from('reseller_api_keys')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setApiKeys(data as ApiKey[]);
    }
    setLoading(false);
  }, [supabase, profile?.id]);

  const fetchWebhooks = useCallback(async () => {
    if (!supabase || !profile?.id) return;
    
    const { data, error } = await supabase
      .from('reseller_webhooks')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setWebhooks(data as Webhook[]);
    }
  }, [supabase, profile?.id]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  async function createApiKey() {
    if (!supabase || !profile?.id || !newKeyName.trim()) return;
    setSaving(true);

    try {
      const apiKey = 'tada_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const apiSecret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const { error } = await supabase
        .from('reseller_api_keys')
        .insert({
          user_id: profile.id,
          api_key: apiKey,
          api_secret: apiSecret,
          name: newKeyName.trim(),
          is_active: true,
          monthly_limit: 100000,
          monthly_usage: 0,
        } as never);

      if (error) throw error;

      await fetchApiKeys();
      setShowCreateKey(false);
      setNewKeyName('');
      toast.success('API key created successfully');
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('Failed to create API key');
    }
    setSaving(false);
  }

  async function toggleApiKey(key: ApiKey) {
    if (!supabase) return;
    setSaving(true);

    const { error } = await supabase
      .from('reseller_api_keys')
      .update({ is_active: !key.is_active } as never)
      .eq('id', key.id);

    if (!error) {
      await fetchApiKeys();
      toast.success(key.is_active ? 'API key deactivated' : 'API key activated');
    }
    setSaving(false);
  }

  async function deleteApiKey(key: ApiKey) {
    if (!supabase) return;
    if (!confirm('Are you sure you want to delete this API key?')) return;
    setSaving(true);

    const { error } = await supabase
      .from('reseller_api_keys')
      .delete()
      .eq('id', key.id);

    if (!error) {
      await fetchApiKeys();
      toast.success('API key deleted');
    }
    setSaving(false);
  }

  async function createWebhook() {
    if (!supabase || !profile?.id || !newWebhookUrl.trim()) return;
    
    try {
      new URL(newWebhookUrl);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('reseller_webhooks')
        .insert({
          user_id: profile.id,
          url: newWebhookUrl.trim(),
          events: ['transaction.completed', 'transaction.failed'],
          is_active: true,
        } as never);

      if (error) throw error;

      await fetchWebhooks();
      setShowCreateWebhook(false);
      setNewWebhookUrl('');
      toast.success('Webhook created successfully');
    } catch (error) {
      console.error('Error creating webhook:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create webhook';
      toast.error(`Error: ${errorMessage}`);
    }
    setSaving(false);
  }

  async function toggleWebhook(webhook: Webhook) {
    if (!supabase) return;
    setSaving(true);

    const { error } = await supabase
      .from('reseller_webhooks')
      .update({ is_active: !webhook.is_active } as never)
      .eq('id', webhook.id);

    if (!error) {
      await fetchWebhooks();
      toast.success(webhook.is_active ? 'Webhook deactivated' : 'Webhook activated');
    }
    setSaving(false);
  }

  async function deleteWebhook(webhook: Webhook) {
    if (!supabase) return;
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    setSaving(true);

    const { error } = await supabase
      .from('reseller_webhooks')
      .delete()
      .eq('id', webhook.id);

    if (!error) {
      await fetchWebhooks();
      toast.success('Webhook deleted');
    }
    setSaving(false);
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              href="/dashboard"
              className="p-2 -ml-2 hover:bg-muted rounded-lg transition-smooth lg:hidden"
            >
              <IonIcon name="arrow-back-outline" size="20px" />
            </Link>
            <h1 className="text-lg font-semibold text-foreground ml-2 lg:ml-0">
              Developer API
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 space-y-6 max-w-2xl">
        {/* API Keys Section */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <IonIcon
                name="key-outline"
                size="20px"
                color="#22c55e"
              />
              API Keys
            </CardTitle>
            <CardDescription className="text-sm">
              Manage your API keys for external integrations
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-6 py-4">
              <Button
                onClick={() => setShowCreateKey(true)}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <IonIcon name="add-outline" size="18px" className="mr-2" />
                Create API Key
              </Button>
            </div>

            {apiKeys.length === 0 ? (
              <div className="px-6 pb-6">
                <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                  <IonIcon
                    name="key-outline"
                    size="40px"
                    className="mx-auto text-muted-foreground mb-2"
                  />
                  <p className="text-muted-foreground">No API keys yet</p>
                  <p className="text-sm text-muted-foreground">Create one to get started</p>
                </div>
              </div>
            ) : (
              <div className="px-6 pb-6 space-y-1.5">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="relative p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-smooth"
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Icon */}
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-green-500/10">
                        <IonIcon name="key" size="16px" color="#22c55e" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h4 className="font-medium text-sm text-foreground leading-tight line-clamp-1">
                            {key.name}
                          </h4>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium text-xs shrink-0 ${
                              key.is_active
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-red-500/10 text-red-500'
                            }`}
                          >
                            <div
                              className={`w-1 h-1 rounded-full ${
                                key.is_active ? 'bg-green-500' : 'bg-red-500'
                              }`}
                            />
                            {key.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        {/* API Key and Secret */}
                        <div className="space-y-1 mb-1">
                          <div className="flex items-center gap-1.5">
                            <code className="bg-muted/50 px-1.5 py-0.5 rounded font-mono text-[10px] text-green-400 flex-1 overflow-hidden text-ellipsis">
                              {key.api_key}
                            </code>
                            <button
                              onClick={() => copyToClipboard(key.api_key, key.id + '-key')}
                              className="text-green-500 hover:text-green-400 shrink-0 p-0.5"
                              title="Copy API Key"
                            >
                              <IonIcon
                                name={copied === key.id + '-key' ? 'checkmark-outline' : 'copy-outline'}
                                size="12px"
                              />
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <code className="bg-muted/50 px-1.5 py-0.5 rounded font-mono text-[10px] text-muted-foreground flex-1">
                              ••••••••••••
                            </code>
                            <button
                              onClick={() => copyToClipboard(key.api_secret, key.id + '-secret')}
                              className="text-green-500 hover:text-green-400 shrink-0 p-0.5"
                              title="Copy API Secret"
                            >
                              <IonIcon
                                name={copied === key.id + '-secret' ? 'checkmark-outline' : 'copy-outline'}
                                size="12px"
                              />
                            </button>
                          </div>
                        </div>

                        {/* Usage */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            ₦{key.monthly_usage?.toLocaleString() || 0} / ₦{key.monthly_limit?.toLocaleString() || 100000}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => toggleApiKey(key)}
                              className={`p-1 rounded-md transition-colors ${
                                key.is_active
                                  ? 'text-red-500 hover:bg-red-500/10'
                                  : 'text-green-500 hover:bg-green-500/10'
                              }`}
                              title={key.is_active ? 'Deactivate' : 'Activate'}
                            >
                              <IonIcon
                                name={key.is_active ? 'pause-outline' : 'play-outline'}
                                size="14px"
                              />
                            </button>
                            <button
                              onClick={() => deleteApiKey(key)}
                              className="p-1 rounded-md text-red-500 hover:bg-red-500/10 transition-colors"
                              title="Delete"
                            >
                              <IonIcon name="trash-outline" size="14px" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhooks Section */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <WebhookIcon size={20} color="#22c55e" strokeWidth={2} />
              Webhooks
            </CardTitle>
            <CardDescription className="text-sm">
              Receive real-time notifications for transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-6 py-4">
              <Button
                onClick={() => setShowCreateWebhook(true)}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <IonIcon name="add-outline" size="18px" className="mr-2" />
                Add Webhook
              </Button>
            </div>

            {webhooks.length === 0 ? (
              <div className="px-6 pb-6">
                <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                  <div className="flex justify-center mb-2 text-muted-foreground">
                    <WebhookIcon size={40} color="currentColor" strokeWidth={2} />
                  </div>
                  <p className="text-muted-foreground">No webhooks yet</p>
                  <p className="text-sm text-muted-foreground">Add one to receive notifications</p>
                </div>
              </div>
            ) : (
              <div className="px-6 pb-6 space-y-1.5">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="relative p-2.5 rounded-lg border border-border hover:bg-muted/50 transition-smooth"
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Icon */}
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-green-500/10">
                        <WebhookIcon size={16} color="#22c55e" strokeWidth={2} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h4 className="font-medium text-sm text-foreground leading-tight line-clamp-1">
                            {webhook.url}
                          </h4>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium text-xs shrink-0 ${
                              webhook.is_active
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-red-500/10 text-red-500'
                            }`}
                          >
                            <div
                              className={`w-1 h-1 rounded-full ${
                                webhook.is_active ? 'bg-green-500' : 'bg-red-500'
                              }`}
                            />
                            {webhook.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        {/* Events */}
                        <div className="flex items-center gap-1.5 mb-1">
                          {webhook.events?.map((event) => (
                            <span
                              key={event}
                              className="inline-flex items-center gap-1 text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-md"
                            >
                              <IonIcon
                                name={event.includes('completed') ? 'checkmark-circle' : 'close-circle'}
                                size="10px"
                              />
                              {event.replace('transaction.', '')}
                            </span>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() => toggleWebhook(webhook)}
                            className={`p-1 rounded-md transition-colors ${
                              webhook.is_active
                                ? 'text-red-500 hover:bg-red-500/10'
                                : 'text-green-500 hover:bg-green-500/10'
                            }`}
                            title={webhook.is_active ? 'Deactivate' : 'Activate'}
                          >
                            <IonIcon
                              name={webhook.is_active ? 'pause-outline' : 'play-outline'}
                              size="14px"
                            />
                          </button>
                          <button
                            onClick={() => deleteWebhook(webhook)}
                            className="p-1 rounded-md text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Delete"
                          >
                            <IonIcon name="trash-outline" size="14px" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Documentation Link */}
        <Link
          href="/docs/api"
          className="block transition-all hover:scale-[1.02]"
        >
          <Card className="border-border hover:border-green-500/50 hover:bg-green-500/5 transition-all cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <IonIcon name="book-outline" size="24px" color="#22c55e" />
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">API Documentation</h3>
                  <p className="text-sm text-muted-foreground">Learn how to integrate with TADA API</p>
                </div>
                <IonIcon name="arrow-forward-outline" size="20px" color="#22c55e" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </main>

      {/* Create API Key Modal */}
      {showCreateKey && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Create API Key</CardTitle>
              <CardDescription className="text-sm">
                Give your API key a descriptive name
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="e.g., My App, Production, Test"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="mb-4"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateKey(false);
                    setNewKeyName('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createApiKey}
                  disabled={!newKeyName.trim() || saving}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  {saving ? 'Creating...' : 'Create Key'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Webhook Modal */}
      {showCreateWebhook && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add Webhook</CardTitle>
              <CardDescription className="text-sm">
                Enter the URL where you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="https://your-server.com/webhook"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                className="mb-4"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateWebhook(false);
                    setNewWebhookUrl('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createWebhook}
                  disabled={!newWebhookUrl.trim() || saving}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  {saving ? 'Adding...' : 'Add Webhook'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
