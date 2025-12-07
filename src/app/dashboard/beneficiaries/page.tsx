'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { toast } from "sonner";
import { NETWORKS } from '@/lib/constants';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import { getSupabase } from '@/lib/supabase/client';

interface Beneficiary {
  id: string;
  name: string;
  phone_number: string;
  network: string | null;
  service_type: string;
  created_at: string;
}

export default function BeneficiariesPage() {
  const { user } = useSupabaseUser();
  const [showAddForm, setShowAddForm] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    serviceType: 'airtime',
    phoneNumber: '',
    network: ''
  });

  // Fetch beneficiaries
  useEffect(() => {
    if (!user?.id) return;

    const fetchBeneficiaries = async () => {
      setLoading(true);
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setBeneficiaries(data);
      }
      setLoading(false);
    };

    fetchBeneficiaries();
  }, [user?.id]);

  const handleAddBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast.error('Please login to add beneficiaries');
      return;
    }

    if (!formData.name || !formData.phoneNumber || !formData.network) {
      toast.error('Please fill all fields');
      return;
    }

    setSaving(true);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('beneficiaries')
      .insert({
        user_id: user.id,
        name: formData.name.trim(),
        phone_number: formData.phoneNumber.trim(),
        network: formData.network,
        service_type: formData.serviceType,
      } as never)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error('This beneficiary already exists');
      } else {
        toast.error('Failed to add beneficiary');
        console.error(error);
      }
    } else if (data) {
      setBeneficiaries([data, ...beneficiaries]);
      setFormData({ name: '', serviceType: 'airtime', phoneNumber: '', network: '' });
      setShowAddForm(false);
      toast.success('Beneficiary added successfully!');
    }
    
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this beneficiary?')) return;

    const supabase = getSupabase();
    const { error } = await supabase
      .from('beneficiaries')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete beneficiary');
    } else {
      setBeneficiaries(beneficiaries.filter(b => b.id !== id));
      toast.success('Beneficiary deleted');
    }
  };

  const handleQuickRecharge = (beneficiary: Beneficiary) => {
    const path = beneficiary.service_type === 'data' 
      ? '/dashboard/buy-data' 
      : '/dashboard/buy-airtime';
    
    // Store in sessionStorage for the target page to pick up
    sessionStorage.setItem('quickRecharge', JSON.stringify({
      phoneNumber: beneficiary.phone_number,
      network: beneficiary.network,
    }));
    
    window.location.href = path;
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'airtime': return 'call-outline';
      case 'data': return 'wifi-outline';
      case 'cable': return 'tv-outline';
      default: return 'call-outline';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/dashboard" className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors">
              <IonIcon name="arrow-back-outline" size="20px" />
            </Link>
            <h1 className="text-lg font-semibold text-foreground ml-2">Beneficiaries</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-6 max-w-2xl space-y-6">
        {/* Add Button */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-foreground">Saved Numbers</h2>
            <p className="text-sm text-muted-foreground">Quick access to frequent recipients</p>
          </div>
          <Button 
            className="bg-green-500 hover:bg-green-600"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <IonIcon name="add" size="18px" className="mr-1" />
            Add New
          </Button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Add Beneficiary</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddBeneficiary} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nickname</Label>
                    <Input
                      placeholder="e.g., Mom, Brother"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Service Type</Label>
                    <select
                      className="w-full h-10 px-3 border border-border rounded-md bg-background text-foreground"
                      value={formData.serviceType}
                      onChange={(e) => setFormData({...formData, serviceType: e.target.value})}
                    >
                      <option value="airtime">Airtime</option>
                      <option value="data">Data</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      type="tel"
                      placeholder="08012345678"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Network</Label>
                    <select
                      className="w-full h-10 px-3 border border-border rounded-md bg-background text-foreground"
                      value={formData.network}
                      onChange={(e) => setFormData({...formData, network: e.target.value})}
                      required
                    >
                      <option value="">Select Network</option>
                      {NETWORKS.map(network => (
                        <option key={network.value} value={network.value}>{network.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-green-500 hover:bg-green-600" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Beneficiary'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Beneficiaries List */}
        <Card className="border-border">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : beneficiaries.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <IonIcon name="people-outline" size="32px" className="text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium">No beneficiaries yet</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Save numbers for quick recharge
                </p>
                <Button 
                  className="bg-green-500 hover:bg-green-600"
                  onClick={() => setShowAddForm(true)}
                >
                  <IonIcon name="add" size="18px" className="mr-1" />
                  Add First Beneficiary
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {beneficiaries.map((beneficiary) => (
                  <div
                    key={beneficiary.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                        <IonIcon name={getServiceIcon(beneficiary.service_type)} size="24px" color="#22c55e" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{beneficiary.name}</p>
                        <p className="text-sm text-muted-foreground">{beneficiary.phone_number}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                            {beneficiary.network}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-green-500/10 rounded-full text-green-500 capitalize">
                            {beneficiary.service_type}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleQuickRecharge(beneficiary)}
                        className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                      >
                        <IonIcon name="flash" size="18px" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(beneficiary.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <IonIcon name="trash-outline" size="18px" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
