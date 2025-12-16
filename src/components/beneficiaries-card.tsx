"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IonIcon } from "@/components/ion-icon";
import Link from "next/link";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { getSupabase } from "@/lib/supabase/client";

interface Beneficiary {
  id: string;
  name: string;
  phone_number: string;
  network: string | null;
  service_type: string;
}

interface BeneficiariesCardProps {
  serviceType: "airtime" | "data";
  onSelect: (phone: string, network: string) => void;
}

export function BeneficiariesCard({ serviceType, onSelect }: BeneficiariesCardProps) {
  const { user } = useSupabaseUser();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchBeneficiaries = async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from("beneficiaries")
        .select("*")
        .eq("user_id", user.id)
        .eq("service_type", serviceType)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) setBeneficiaries(data);
      setLoading(false);
    };

    fetchBeneficiaries();
  }, [user?.id, serviceType]);

  if (loading) {
    return (
      <Card className="border-border mt-6">
        <CardContent className="py-8 flex justify-center">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <IonIcon name="people-outline" size="18px" color="#22c55e" />
            Saved Beneficiaries
          </CardTitle>
          <Link href="/dashboard/beneficiaries" className="text-xs text-green-500 hover:underline">
            Manage
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {beneficiaries.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-2">No saved beneficiaries</p>
            <Link href="/dashboard/beneficiaries" className="text-sm text-green-500 hover:underline">
              + Add beneficiary
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {beneficiaries.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelect(b.phone_number, b.network?.toUpperCase() || "")}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-green-500/50 hover:bg-muted/50 transition-all text-left"
              >
                <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                  <span className="text-green-500 font-semibold text-sm">{b.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{b.name}</p>
                  <p className="text-sm text-muted-foreground">{b.phone_number}</p>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{b.network}</span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
