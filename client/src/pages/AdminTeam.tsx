import { useState } from "react";
import AdminPortalLayout from "@/components/AdminPortalLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus, Mail, Shield, Eye, Trash2, Crown } from "lucide-react";
import { toast } from "sonner";

const roleColors: Record<string, string> = {
  admin: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  user: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  user: "Team Member",
};

export default function AdminTeam() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "user">("user");

  const { data: teamData, refetch } = trpc.team.getMembers.useQuery();
  const inviteMutation = trpc.team.inviteMember.useMutation({
    onSuccess: () => {
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteOpen(false);
      refetch();
    },
    onError: (err: { message: string }) => {
      toast.error(err.message);
    },
  });

  const removeMutation = trpc.team.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Team member removed");
      refetch();
    },
    onError: (err: { message: string }) => {
      toast.error(err.message);
    },
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  };

  const members = teamData?.members ?? [];
  const pendingInvites = teamData?.pendingInvites ?? [];

  return (
    <AdminPortalLayout title="Team Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Team Management</h1>
            <p className="text-slate-400 text-sm mt-1">
              Invite partners and employees to access the admin portal.
            </p>
          </div>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
                <UserPlus className="w-4 h-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0D0D14] border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Invite Team Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">Email address</label>
                  <Input
                    type="email"
                    placeholder="partner@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-sm mb-1.5 block">Role</label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as "admin" | "user")}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0D0D14] border-white/10">
                      <SelectItem value="admin" className="text-white hover:bg-white/5">
                        <div className="flex items-center gap-2">
                          <Crown className="w-3.5 h-3.5 text-emerald-400" />
                          Administrator — full access
                        </div>
                      </SelectItem>
                      <SelectItem value="user" className="text-white hover:bg-white/5">
                        <div className="flex items-center gap-2">
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          Team Member — view & manage leads/calls
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-white/3 border border-white/5 rounded-lg p-3">
                  <p className="text-slate-400 text-xs">
                    They'll receive an email with a link to set up their account and access{" "}
                    <span className="text-emerald-400">admin.baylio.io</span>.
                  </p>
                </div>
                <Button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim() || inviteMutation.isPending}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  {inviteMutation.isPending ? "Sending..." : "Send Invite"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Active members */}
        <Card className="bg-[#0D0D14] border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Active Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">
                No team members yet. Invite your first partner or employee.
              </p>
            ) : (
              members.map((member: { id: number; name: string | null; email: string | null; role: string; createdAt: Date }) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/3 border border-white/5"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400 text-xs font-semibold">
                      {(member.name || member.email || "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {member.name || "No name set"}
                    </p>
                    <p className="text-slate-500 text-xs truncate">{member.email}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${roleColors[member.role] ?? roleColors.user}`}
                  >
                    {roleLabels[member.role] ?? member.role}
                  </Badge>
                  <button
                    onClick={() => removeMutation.mutate({ userId: member.id })}
                    className="text-slate-600 hover:text-red-400 transition-colors ml-1"
                    title="Remove member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <Card className="bg-[#0D0D14] border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400" />
                Pending Invites ({pendingInvites.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingInvites.map((invite: { id: number; email: string; role: string; createdAt: Date }) => (
                <div
                  key={invite.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/3 border border-white/5"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{invite.email}</p>
                    <p className="text-slate-500 text-xs">
                      Invited {new Date(invite.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${roleColors[invite.role] ?? roleColors.user}`}
                  >
                    {roleLabels[invite.role] ?? invite.role}
                  </Badge>
                  <Badge
                    className="text-xs bg-amber-500/20 text-amber-400 border-0"
                  >
                    Pending
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminPortalLayout>
  );
}
