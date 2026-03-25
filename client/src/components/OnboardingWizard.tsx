import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Store, Phone, Bot, Rocket, Check, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePostHog } from "@posthog/react";

const STEPS = [
  { id: 1, title: "Shop Details", icon: Store },
  { id: 2, title: "Phone Setup", icon: Phone },
  { id: 3, title: "AI Agent", icon: Bot },
  { id: 4, title: "Go Live", icon: Rocket },
];

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const posthog = usePostHog();
  const [step, setStep] = useState(1);
  const [shopId, setShopId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    agentName: "Sam",
    systemPrompt: "You are an AI assistant for this auto repair shop.",
  });

  // Mutations
  const createShop = trpc.shop.create.useMutation();
  const updateShop = trpc.shop.update.useMutation();
  const saveAgent = trpc.shop.saveAgentConfig.useMutation();
  const provisionAgent = trpc.shop.provisionAgent.useMutation();

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.name.trim()) {
        toast.error("Shop Name is required");
        return;
      }
      try {
        const res = await createShop.mutateAsync({
          name: formData.name,
          address: formData.address,
        });
        setShopId(res.id ?? null);
        setStep(2);
      } catch (err: any) {
        toast.error(err.message || "Failed to create shop");
      }
    } else if (step === 2) {
      if (shopId) {
        try {
          await updateShop.mutateAsync({
            id: shopId,
            data: { phone: formData.phone },
          });
          setStep(3);
        } catch (err: any) {
          toast.error("Failed to update phone");
        }
      }
    } else if (step === 3) {
      if (shopId) {
        try {
          await saveAgent.mutateAsync({
            shopId,
            agentName: formData.agentName,
            systemPrompt: formData.systemPrompt,
          });
          setStep(4);
          triggerConfetti();
          posthog?.capture("onboarding_completed", { shopId });
        } catch (err: any) {
          toast.error("Failed to configure agent");
        }
      }
    } else if (step === 4) {
      onComplete();
    }
  };

  const triggerConfetti = () => {
    const end = Date.now() + 1.5 * 1000;
    const colors = ["#10b981", "#3b82f6"];
    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  const isPending =
    createShop.isPending || updateShop.isPending || saveAgent.isPending || provisionAgent.isPending;

  return (
    <div className="flex flex-col h-full w-full max-w-3xl mx-auto bg-background rounded-xl overflow-hidden shadow-2xl">
      {/* Progress Header */}
      <div className="p-6 border-b bg-muted/30">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border -z-10 rounded-full">
            <motion.div
              className="h-full bg-primary rounded-full transition-all"
              initial={{ width: "0%" }}
              animate={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
              transition={{ ease: "easeInOut", duration: 0.3 }}
            />
          </div>
          {STEPS.map((s, idx) => {
            const isActive = step === s.id;
            const isCompleted = step > s.id;
            return (
              <div key={s.id} className="flex flex-col items-center gap-2 bg-background/80 px-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCompleted
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-muted bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <s.icon className="h-4 w-4" />}
                </div>
                <span
                  className={`text-xs font-semibold ${
                    isActive || isCompleted ? "text-foreground" : "text-muted-foreground"
                  } hidden md:block`}
                >
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 sm:p-10 relative overflow-hidden bg-background min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full flex flex-col justify-center"
          >
            {step === 1 && (
              <div className="max-w-md mx-auto space-y-6 w-full">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold tracking-tight">Shop Details</h2>
                  <p className="text-muted-foreground mt-2">Let's start with the basics.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="shop-name">Shop Name</Label>
                    <Input
                      id="shop-name"
                      placeholder="e.g. Precision Auto Repair"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shop-address">Address</Label>
                    <Input
                      id="shop-address"
                      placeholder="e.g. 123 Main St, Austin, TX"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="max-w-md mx-auto space-y-6 w-full">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold tracking-tight">Phone Setup</h2>
                  <p className="text-muted-foreground mt-2">What's your current shop number?</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="shop-phone">Forwarding Number</Label>
                    <Input
                      id="shop-phone"
                      placeholder="e.g. (555) 123-4567"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      You can also purchase a dedicated Twilio number later from the dashboard.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="max-w-md mx-auto space-y-6 w-full">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold tracking-tight">AI Agent Identity</h2>
                  <p className="text-muted-foreground mt-2">Give your AI a name and personality.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="agent-name">Agent Name</Label>
                    <Input
                      id="agent-name"
                      placeholder="e.g. Sam"
                      value={formData.agentName}
                      onChange={e => setFormData({ ...formData, agentName: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="max-w-md mx-auto text-center space-y-6 w-full mt-8">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Rocket className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">You're All Set!</h2>
                <p className="text-muted-foreground text-lg">
                  {formData.name} is now boarded on Baylio. Your AI Agent '{formData.agentName}' is
                  ready to configure.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t bg-muted/10 flex justify-between items-center">
        {step > 1 && step < 4 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={isPending}>
            Back
          </Button>
        ) : (
          <div /> // Placeholder for space-between
        )}
        
        <Button onClick={handleNext} disabled={isPending} className="ml-auto min-w-[120px]">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : step === 4 ? (
            "Go to Dashboard"
          ) : (
            <>
              Next Step <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
