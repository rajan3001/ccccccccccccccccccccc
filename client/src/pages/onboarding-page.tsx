import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { onboardingSchema } from "@shared/models/auth";
import {
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  Briefcase,
  BookOpen,
  CheckCircle2,
} from "lucide-react";

const EXAM_OPTIONS = [
  { value: "UPSC", label: "UPSC", group: "National" },
  { value: "JPSC", label: "JPSC (Jharkhand)", group: "State PSC" },
  { value: "BPSC", label: "BPSC (Bihar)", group: "State PSC" },
  { value: "JKPSC", label: "JKPSC (Jammu & Kashmir)", group: "State PSC" },
  { value: "UPPSC", label: "UPPSC (Uttar Pradesh)", group: "State PSC" },
  { value: "MPPSC", label: "MPPSC (Madhya Pradesh)", group: "State PSC" },
  { value: "RPSC", label: "RPSC (Rajasthan)", group: "State PSC" },
  { value: "OPSC", label: "OPSC (Odisha)", group: "State PSC" },
  { value: "HPSC", label: "HPSC (Haryana)", group: "State PSC" },
  { value: "UKPSC", label: "UKPSC (Uttarakhand)", group: "State PSC" },
  { value: "HPPSC", label: "HPPSC (Himachal Pradesh)", group: "State PSC" },
  { value: "APSC_Assam", label: "APSC (Assam)", group: "NE State PSC" },
  { value: "MeghalayaPSC", label: "Meghalaya PSC", group: "NE State PSC" },
  { value: "SikkimPSC", label: "Sikkim PSC", group: "NE State PSC" },
  { value: "TripuraPSC", label: "Tripura PSC", group: "NE State PSC" },
  { value: "ArunachalPSC", label: "Arunachal Pradesh PSC", group: "NE State PSC" },
];

const USER_TYPES = [
  {
    value: "college_student" as const,
    label: "College Student",
    icon: GraduationCap,
    description: "Currently pursuing graduation or post-graduation",
  },
  {
    value: "working_professional" as const,
    label: "Working Professional",
    icon: Briefcase,
    description: "Preparing alongside your job",
  },
  {
    value: "full_time_aspirant" as const,
    label: "Full Time Aspirant",
    icon: BookOpen,
    description: "Dedicated full-time to exam preparation",
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      displayName: "",
      userType: undefined,
      targetExam: "",
    },
  });

  const totalSteps = 3;
  const progress = ((step + 1) / totalSteps) * 100;

  const submitMutation = useMutation({
    mutationFn: async (data: z.infer<typeof onboardingSchema>) => {
      const res = await apiRequest("POST", "/api/onboarding", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const canProceed = () => {
    const values = form.getValues();
    if (step === 0) return values.displayName.trim().length > 0;
    if (step === 1) return !!values.userType;
    if (step === 2) return values.targetExam.length > 0;
    return false;
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      form.handleSubmit((data) => submitMutation.mutate(data))();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const nationalExams = EXAM_OPTIONS.filter(e => e.group === "National");
  const stateExams = EXAM_OPTIONS.filter(e => e.group === "State PSC");
  const neExams = EXAM_OPTIONS.filter(e => e.group === "NE State PSC");

  const renderExamGroup = (title: string, exams: typeof EXAM_OPTIONS) => (
    <div>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">{title}</span>
      {exams.map((exam) => {
        const isSelected = form.watch("targetExam") === exam.value;
        return (
          <button
            key={exam.value}
            type="button"
            onClick={() => form.setValue("targetExam", exam.value)}
            className={`w-full flex items-center justify-between gap-2 p-3 rounded-md border mb-2 text-left ${
              isSelected
                ? "border-primary bg-primary/5 dark:bg-primary/10"
                : "border-border hover-elevate"
            }`}
            data-testid={`exam-${exam.value}`}
          >
            <span className="font-medium text-sm">{exam.label}</span>
            {isSelected && (
              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>

        <Progress value={progress} className="mb-6 h-1.5" data-testid="onboarding-progress" />

        <Card className="p-6 sm:p-8">
          <Form {...form}>
            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }}>
              {step > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover-elevate rounded-md p-1 -ml-1"
                  data-testid="button-back"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              )}

              {step === 0 && (
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-display font-bold text-center mb-1" data-testid="text-step-heading">
                    What's your name?
                  </h2>
                  <p className="text-sm text-muted-foreground text-center mb-6">
                    Your student profile is almost ready
                  </p>
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter your name"
                            className="text-base"
                            autoFocus
                            onKeyDown={(e) => e.key === "Enter" && canProceed() && handleNext()}
                            data-testid="input-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 1 && (
                <div>
                  <h2 className="text-xl font-display font-bold text-center mb-1" data-testid="text-step-heading">
                    What describes you the best?
                  </h2>
                  <p className="text-sm text-muted-foreground text-center mb-6">
                    We'll personalize your learning experience
                  </p>
                  <FormField
                    control={form.control}
                    name="userType"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex flex-col gap-3">
                            {USER_TYPES.map((type) => {
                              const isSelected = field.value === type.value;
                              return (
                                <button
                                  key={type.value}
                                  type="button"
                                  onClick={() => field.onChange(type.value)}
                                  className={`flex items-center gap-3 p-4 rounded-md border text-left ${
                                    isSelected
                                      ? "border-primary bg-primary/5 dark:bg-primary/10"
                                      : "border-border hover-elevate"
                                  }`}
                                  data-testid={`option-${type.value}`}
                                >
                                  <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    isSelected ? "bg-primary/10" : "bg-secondary"
                                  }`}>
                                    <type.icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className="font-semibold text-sm block">{type.label}</span>
                                    <span className="text-xs text-muted-foreground">{type.description}</span>
                                  </div>
                                  {isSelected && (
                                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="text-xl font-display font-bold text-center mb-1" data-testid="text-step-heading">
                    Which exam are you preparing for?
                  </h2>
                  <p className="text-sm text-muted-foreground text-center mb-6">
                    Select your target examination
                  </p>
                  <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                    {renderExamGroup("National", nationalExams)}
                    {renderExamGroup("State PSC", stateExams)}
                    {renderExamGroup("NE State PSC", neExams)}
                  </div>
                </div>
              )}

              <Button
                className="w-full mt-6"
                size="lg"
                type="submit"
                disabled={!canProceed() || submitMutation.isPending}
                data-testid="button-next"
              >
                {submitMutation.isPending ? (
                  "Setting up..."
                ) : step === totalSteps - 1 ? (
                  <>
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Step {step + 1} of {totalSteps}
        </p>
      </div>
    </div>
  );
}
