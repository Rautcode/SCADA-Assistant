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
              {stepIdx < currentStep ? (
                // Completed Step
                <>
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary group-hover:bg-primary-focus">
                    <Check className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
                  </div>
                  <div className="ml-4 hidden md:flex flex-col">
                    <span className="text-xs text-muted-foreground">Step {stepIdx + 1}</span>
                    <span className="font-semibold text-primary">{step}</span>
                  </div>
                </>
              ) : stepIdx === currentStep ? (
                // Current Step
                <>
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary">
                    <span className="text-primary">{stepIdx + 1}</span>
                  </div>
                  <div className="ml-4 hidden md:flex flex-col">
                    <span className="text-xs text-muted-foreground">Step {stepIdx + 1}</span>
                    <span className="font-semibold text-primary">{step}</span>
                  </div>
                </>
              ) : (
                // Upcoming Step
                <>
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-border">
                    <span className="text-muted-foreground">{stepIdx + 1}</span>
                  </div>
                  <div className="ml-4 hidden md:flex flex-col">
                     <span className="text-xs text-muted-foreground">Step {stepIdx + 1}</span>
                    <span className="font-medium text-muted-foreground">{step}</span>
                  </div>
                </>
              )}
            </div>

            {/* Connector line */}
            {stepIdx !== 0 ? (
              <div className="absolute inset-0 left-0 top-1/2 -z-10 hidden w-full -translate-y-1/2 transform md:block" aria-hidden="true">
                <div
                  className={cn("h-0.5 w-full bg-border", stepIdx <= currentStep && "bg-primary")}
                  style={{ width: 'calc(100% - 2.5rem - 1rem)', marginLeft: '2.5rem' }} // width - iconWidth - gap
                />
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}