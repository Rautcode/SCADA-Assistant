
"use client";

import * as React from 'react';
import dynamic from 'next/dynamic';
import { StepIndicator } from '@/components/report-generator/step-indicator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { reportCriteriaSchema } from '@/components/report-generator/step1-criteria';
import { chartConfigSchema } from '@/components/report-generator/step4-charts';
import { outputOptionsSchema } from '@/components/report-generator/step5-output';
import { useToast } from '@/hooks/use-toast';
import { ScadaDataPoint } from '@/lib/types/database';
import { ReportTemplate } from "@/lib/types/database";
import { generateReport } from '@/ai/flows/generate-report-flow';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { z } from 'zod';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/auth/auth-provider';
import { getUserSettings } from '../actions/settings-actions';

// Dynamically import step components
const ReportStep1Criteria = dynamic(() => import('@/components/report-generator/step1-criteria').then(mod => mod.ReportStep1Criteria), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const ReportStep2Template = dynamic(() => import('@/components/report-generator/step2-template').then(mod => mod.ReportStep2Template), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const ReportStep3Preview = dynamic(() => import('@/components/report-generator/step3-preview').then(mod => mod.ReportStep3Preview), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const ReportStep4Charts = dynamic(() => import('@/components/report-generator/step4-charts').then(mod => mod.ReportStep4Charts), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});
const ReportStep5Output = dynamic(() => import('@/components/report-generator/step5-output').then(mod => mod.ReportStep5Output), {
  loading: () => <Skeleton className="h-[400px] w-full" />,
});


const ScadaDataPointSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  machine: z.string(),
  parameter: z.string(),
  value: z.union([z.string(), z.number()]),
  unit: z.string(),
  included: z.boolean().optional(),
});

const ReportTemplateSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    thumbnailUrl: z.string(),
    lastModified: z.date(),
});


export const GenerateReportInputSchema = z.object({
  criteria: reportCriteriaSchema,
  template: ReportTemplateSchema,
  scadaData: z.array(ScadaDataPointSchema),
  chartOptions: chartConfigSchema,
  outputOptions: outputOptionsSchema,
  apiKey: z.string().optional(),
});
export type GenerateReportInput = z.infer<typeof GenerateReportInputSchema>;


export const GenerateReportOutputSchema = z.object({
  reportContent: z.string().describe("The full content of the generated report in the requested format (e.g., Markdown for PDF, or a raw CSV string)."),
  fileName: z.string().describe("The suggested file name for the report."),
  format: z.enum(['pdf', 'csv']).describe("The format of the generated report content."),
});
export type GenerateReportOutput = z.infer<typeof GenerateReportOutputSchema>;


const steps = [
  "Selection Criteria",
  "Template Selection",
  "Data Preview",
  "Chart Selection",
  "Output Options",
];

export default function ReportGeneratorPage() {
  const [currentStep, setCurrentStep] = React.useState(0);
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedReport, setGeneratedReport] = React.useState<string | null>(null);
  const { user } = useAuth();

  // State to hold data across steps
  const [step1Data, setStep1Data] = React.useState<z.infer<typeof reportCriteriaSchema> | null>(null);
  const [step2Data, setStep2Data] = React.useState<{ selectedTemplate: ReportTemplate | null } | null>(null);
  const [step3Data, setStep3Data] = React.useState<{ scadaData: ScadaDataPoint[] } | null>(null);
  const [step4Data, setStep4Data] = React.useState<z.infer<typeof chartConfigSchema> | null>(null);
  const [step5Data, setStep5Data] = React.useState<z.infer<typeof outputOptionsSchema> | null>(null);
  
  const canGoNext = React.useMemo(() => {
    switch (currentStep) {
      case 0: return step1Data !== null;
      case 1: return step2Data?.selectedTemplate !== null;
      case 2: return step3Data !== null && step3Data.scadaData.length > 0;
      case 3: return step4Data !== null;
      default: return true;
    }
  }, [currentStep, step1Data, step2Data, step3Data, step4Data]);


  const handleNext = () => {
    if (canGoNext && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
        toast({
            title: "Incomplete Step",
            description: "Please complete the current step before proceeding.",
            variant: "destructive"
        })
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = async () => {
    if (!step1Data || !step2Data?.selectedTemplate || !step3Data || !step4Data || !step5Data) {
        toast({
            title: "Missing Information",
            description: "Please complete all steps before generating a report.",
            variant: "destructive",
        });
        return;
    }
    if (!user) {
        toast({ title: "Not Authenticated", description: "You must be logged in.", variant: "destructive" });
        return;
    }
    
    setIsGenerating(true);
    toast({
      title: "Report Generation Started",
      description: "Your report is being generated by the AI backend...",
    });

    try {
        const settings = await getUserSettings({ userId: user.uid });
        if (!settings?.apiKey) {
            toast({ title: "API Key Missing", description: "Please set your Gemini API key in the settings.", variant: "destructive" });
            setIsGenerating(false);
            return;
        }
        
        const reportInput: GenerateReportInput = {
            criteria: step1Data,
            template: step2Data.selectedTemplate,
            scadaData: step3Data.scadaData.filter(d => d.included),
            chartOptions: step4Data,
            outputOptions: step5Data,
            apiKey: settings.apiKey,
        };
        const result = await generateReport(reportInput);
        setGeneratedReport(result.reportContent);
    } catch (error) {
        console.error("Report generation failed:", error);
        toast({
            title: "Generation Failed",
            description: "The backend failed to generate the report. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsGenerating(false);
    }
  };
  
  const resetWizard = () => {
    setCurrentStep(0);
    setStep1Data(null);
    setStep2Data(null);
    setStep3Data(null);
    setStep4Data(null);
    setStep5Data(null);
    setGeneratedReport(null);
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <ReportStep1Criteria onValidated={setStep1Data} initialData={step1Data} />;
      case 1:
        return <ReportStep2Template onValidated={setStep2Data} initialData={step2Data} />;
      case 2:
        return <ReportStep3Preview onValidated={setStep3Data} initialData={step3Data} criteria={step1Data} />;
      case 3:
        return <ReportStep4Charts onValidated={setStep4Data} initialData={step4Data} scadaData={step3Data?.scadaData} />;
      case 4:
        return <ReportStep5Output onValidated={setStep5Data} initialData={step5Data} />;
      default:
        return null;
    }
  };

  return (
    <div className="animate-fade-in w-full">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-center">
            Report Generator
          </CardTitle>
          <StepIndicator steps={steps} currentStep={currentStep} className="mt-4" />
        </CardHeader>
        <CardContent className="min-h-[450px]">
          {renderStepContent()}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0 || isGenerating}>
            Back
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button onClick={handleNext} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!canGoNext}>
              Next
            </Button>
          ) : (
            <Button onClick={handleGenerate} className="bg-secondary hover:bg-secondary/90 text-secondary-foreground" disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </Button>
          )}
        </CardFooter>
      </Card>
      
       <AlertDialog open={!!generatedReport} onOpenChange={() => !isGenerating && setGeneratedReport(null)}>
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Report Generated Successfully</AlertDialogTitle>
            <AlertDialogDescription>
              The backend has processed your request. Here is the generated report content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ScrollArea className="max-h-[60vh] my-4 border rounded-md p-4 bg-muted/50">
            <pre className="text-sm whitespace-pre-wrap font-mono">
                {generatedReport}
            </pre>
          </ScrollArea>
          <AlertDialogFooter>
            <AlertDialogAction onClick={resetWizard}>Close & Start Over</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
