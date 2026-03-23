import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Network, Users, Copy } from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";
import PartnersPortalLayout from "@/components/PartnersPortalLayout";

const COMMISSION_TIERS = [
  { tier: "Bronze", requirement: "0-4 referrals", direct: "20%", override: "5%" },
  { tier: "Silver", requirement: "5-14 referrals", direct: "22%", override: "5%" },
  { tier: "Gold", requirement: "15-29 referrals", direct: "25%", override: "7%" },
  { tier: "Platinum", requirement: "30+ referrals", direct: "30%", override: "10%" },
];

export default function PartnersNetwork() {
  const { data: networkData, isLoading } = trpc.affiliate.getMyNetwork.useQuery();
  const { data: statsData } = trpc.affiliate.stats.useQuery();

  const recruitLink = useMemo(() => {
    if (!statsData?.affiliate?.code) return "";
    return `https://partners.baylio.io/?ref=${statsData.affiliate.code}`;
  }, [statsData?.affiliate?.code]);

  const copyLink = () => {
    navigator.clipboard.writeText(recruitLink);
    toast.success("Recruitment link copied!");
  };

  const partners = networkData?.partners ?? [];

  return (
    <PartnersPortalLayout title="My Network">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-bold text-white mb-2">My Network</h1>
        <p className="text-sm text-slate-400 mb-6">
          Partners you've recruited into the Baylio affiliate program.
          You earn override commissions on referrals made by your network.
        </p>

        {/* How it works */}
        <Card className="bg-[#0D0D14] border-white/10 mb-6">
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold text-white mb-3">2-Level Commission Structure</h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-3">
                <p className="text-emerald-400 font-medium mb-1">Level 1 — Direct Referrals</p>
                <p className="text-slate-400 text-xs">You earn 20-30% on shops you refer directly.</p>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                <p className="text-amber-400 font-medium mb-1">Level 2 — Override Commission</p>
                <p className="text-slate-400 text-xs">You earn 5-10% on shops referred by partners you recruit.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recruitment Link */}
        {recruitLink && (
          <Card className="bg-[#0D0D14] border-white/10 mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <Network className="h-4 w-4 text-amber-400" />
                  <span className="font-medium text-sm text-white">Recruitment Link:</span>
                </div>
                <div className="flex-1 flex items-center gap-2 w-full">
                  <Input
                    value={recruitLink}
                    readOnly
                    className="font-mono text-sm bg-white/5 border-white/10 text-slate-300"
                  />
                  <Button size="sm" variant="outline" onClick={copyLink} className="border-white/10 text-slate-300 hover:text-white">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Share this link to invite other partners. You'll earn override commissions on their referrals.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Partners List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : partners.length === 0 ? (
          <Card className="bg-[#0D0D14] border-white/10">
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">No partners in your network yet</p>
              <p className="text-sm text-slate-500">Share your recruitment link to grow your network and earn override commissions.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-[#0D0D14] border-white/10">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Partner</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Tier</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Their Referrals</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Your Override Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 last:border-0">
                      <td className="py-3 px-4 text-white">{p.name}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 capitalize">
                          {p.tier}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{p.referralCount}</td>
                      <td className="py-3 px-4 text-amber-400">${p.overrideEarnings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Commission Tiers Reference */}
        <Card className="bg-[#0D0D14] border-white/10 mt-6">
          <CardHeader>
            <CardTitle className="text-lg text-white">Commission Tiers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Tier</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Requirement</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Direct</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Override (L2)</th>
                </tr>
              </thead>
              <tbody>
                {COMMISSION_TIERS.map((t) => (
                  <tr key={t.tier} className="border-b border-white/5 last:border-0">
                    <td className="py-3 px-4 text-amber-400 font-semibold">{t.tier}</td>
                    <td className="py-3 px-4 text-slate-300">{t.requirement}</td>
                    <td className="py-3 px-4 text-emerald-400">{t.direct}</td>
                    <td className="py-3 px-4 text-slate-300">{t.override}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </PartnersPortalLayout>
  );
}
