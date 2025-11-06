
"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li key={step} className={cn("relative flex-1")}>
            <div className="flex items-center text-sm font-medium">
              <div className={cn(
                  "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                   stepIdx < currentStep ? "bg-primary text-primary-foreground" :
                   stepIdx === currentStep ? "border-2 border-primary text-primary" :
                   "border-2 border-border text-muted-foreground"
              )}>
                 {stepIdx < currentStep ? (
                    <Check className="h-6 w-6" aria-hidden="true" />
                 ) : (
                    <span>{stepIdx + 1}</span>
                 )}
              </div>
              <div className="ml-4 hidden md:flex flex-col">
                <span className="text-xs text-muted-foreground">Step {stepIdx + 1}</span>
                <span className={cn(
                    "font-semibold",
                    stepIdx <= currentStep ? "text-primary" : "text-muted-foreground"
                )}>{step}</span>
              </div>
            </div>

            {/* Connector line */}
            {stepIdx > 0 ? (
              <div className="absolute inset-0 right-0 top-1/2 -z-10 hidden w-full -translate-y-1/2 transform md:block" aria-hidden="true">
                <div
                  className={cn("h-0.5 w-full bg-border", stepIdx <= currentStep && "bg-primary")}
                  style={{ width: 'calc(100% - 2.5rem)', marginRight: '2.5rem' }} 
                />
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
