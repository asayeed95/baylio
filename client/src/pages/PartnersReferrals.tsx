import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { useState } from "react";
import PartnersPortalLayout from "@/components/PartnersPortalLayout";

const STATUS_STYLES: Record<string, string> = {
  clicked: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  signed_up: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  subscribed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  churned: "bg-red-500/10 text-red-400 border-red-500/30",
};

export default function PartnersReferrals() {
  const { data: statsData, isLoading } = trpc.affiliate.stats.useQuery();
  const [filter, setFilter] = useState<string>("all");

  const referrals = statsData?.referrals || [];
  const filtered = filter === "all" ? referrals : referrals.filter(r => r.status === filter);

  return (
    <PartnersPortalLayout title="My Referrals">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">My Referrals</h1>
            <p className="text-sm text-slate-400">{referrals.length} total referrals</p>
          </div>
          <div className="flex gap-2">
            {["all", "clicked", "signed_up", "subscribed", "churned"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === s
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-white/5 text-slate-400 hover:text-white"
                }`}
              >
                {s === "all" ? "All" : s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-[#0D0D14] border-white/10">
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">
                {filter === "all" ? "No referrals yet" : `No ${filter.replace("_", " ")} referrals`}
              </p>
              <p className="text-sm text-slate-500">Share your referral link to start earning commissions.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-[#0D0D14] border-white/10">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Name/Email</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Tier</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Commission</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ref) => (
                    <tr key={ref.id} className="border-b border-white/5 last:border-0">
                      <td className="py-3 px-4 text-white">
                        {ref.referredName || ref.referredEmail || "Anonymous"}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={STATUS_STYLES[ref.status] ?? ""}>
                          {ref.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{ref.subscribedTier || "—"}</td>
                      <td className="py-3 px-4 text-amber-400">
                        {ref.monthlyValue ? `$${Number(ref.monthlyValue).toFixed(2)}/mo` : "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(ref.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </PartnersPortalLayout>
  );
}
