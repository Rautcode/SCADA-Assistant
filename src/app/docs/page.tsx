
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpen, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type DocSection = {
  id: string;
  title: string;
  content: React.ReactNode;
};

const docSections: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: (
      <div className="space-y-4">
        <p>Welcome to the SCADA Assistant! This guide will walk you through the initial setup to get your application running.</p>
        <h3 className="font-semibold text-lg">1. Connect to Your Database</h3>
        <p>Navigate to <strong>Settings &gt; Database</strong>. Enter your SQL Server credentials, including the server address, database name, username, and password. Use the 'Test Connection' button to ensure the details are correct before saving.</p>
        <h3 className="font-semibold text-lg">2. Map Your Data</h3>
        <p>Go to <strong>Settings &gt; Data Mapping</strong>. Click 'Fetch Schema' to load your database tables. Select the primary table containing your SCADA data and map the columns for Timestamp, Machine Name, Parameter, and Value. This step is crucial for the application to understand your data structure.</p>
        <h3 className="font-semibold text-lg">3. Add Your Gemini API Key</h3>
        <p>Go to <strong>Settings &gt; Integrations</strong> and enter your Google Gemini API key. This is required for all AI-powered features, including report generation and chart styling.</p>
      </div>
    ),
  },
  {
    id: 'configuration',
    title: 'Configuration',
    content: (
      <div className="space-y-4">
        <p>Customize the application to fit your needs through the Settings page.</p>
        <h3 className="font-semibold text-lg">Appearance</h3>
        <p>Choose between Light, Dark, or System themes. You can also select your preferred language for the user interface.</p>
        <h3 className="font-semibold text-lg">Notifications</h3>
        <p>Enable or disable in-app and email notifications for events like critical system alerts or when a scheduled report is completed.</p>
        <h3 className="font-semibold text-lg">SMTP Settings</h3>
        <p>To enable email notifications, you must configure your SMTP server details under <strong>Settings &gt; Email</strong>. This allows the application to send emails on your behalf.</p>
      </div>
    ),
  },
  {
    id: 'features',
    title: 'Features',
    content: (
       <div className="space-y-4">
        <h3 className="font-semibold text-lg">Report Generator</h3>
        <p>A multi-step wizard to generate detailed reports. Select a date range, machines, a template, preview your data, and choose output options. The AI uses your selected template to tailor the report's summary.</p>
        <h3 className="font-semibold text-lg">Template Manager</h3>
        <p>Create, view, and manage your own report templates. Each template guides the AI in its analysis, making your reports more focused and relevant.</p>
        <h3 className="font-semibold text-lg">Task Scheduler</h3>
        <p>Automate report generation by scheduling tasks. Choose a template and a time, and the system will handle the rest.</p>
      </div>
    ),
  },
  {
    id: 'api-flows',
    title: 'API & Flows',
    content: (
       <div className="space-y-4">
        <p>The application uses Genkit, an open-source AI framework, to manage interactions with the Gemini API. Here are the core flows:</p>
        <ul className="list-disc list-inside space-y-2">
            <li><strong>generateReportFlow:</strong> Takes user criteria, data, and a template to generate a full report.</li>
            <li><strong>suggestChartStyleFlow:</strong> Provides AI-powered chart type, title, and color suggestions based on a text prompt.</li>
            <li><strong>scheduleNewTaskFlow:</strong> Adds a new task to the database for future execution.</li>
            <li><strong>sendEmailFlow:</strong> Handles the sending of emails via the configured SMTP server.</li>
        </ul>
      </div>
    ),
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = React.useState<string>(docSections[0].id);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const sectionElements = docSections.map(sec => document.getElementById(sec.id));
    for (const sectionEl of sectionElements) {
      if (sectionEl) {
        const rect = sectionEl.getBoundingClientRect();
        if (rect.top >= 0 && rect.top < e.currentTarget.clientHeight / 2) {
          setActiveSection(sectionEl.id);
          break;
        }
      }
    }
  };

  return (
    <div className="animate-fade-in">
        <Card className="shadow-lg mb-8">
            <CardHeader>
                <CardTitle className="flex items-center text-3xl font-bold">
                    <BookOpen className="mr-4 h-8 w-8 text-primary" />
                    Documentation
                </CardTitle>
                <CardDescription>
                    In-depth guides and technical information about the SCADA Assistant.
                </CardDescription>
            </CardHeader>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <aside className="md:col-span-1">
                <div className="sticky top-24">
                     <h3 className="font-semibold mb-4">On this page</h3>
                    <ul className="space-y-2">
                        {docSections.map(section => (
                            <li key={section.id}>
                                <a 
                                    href={`#${section.id}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                                        setActiveSection(section.id);
                                    }}
                                    className={cn(
                                        "flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors",
                                        activeSection === section.id && "text-primary font-semibold"
                                    )}
                                >
                                    <ChevronRight className={cn("h-4 w-4 mr-2 transition-transform", activeSection === section.id && "rotate-90")}/>
                                    {section.title}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </aside>
            <main className="md:col-span-3">
                 <ScrollArea className="h-[calc(100vh-12rem)]" onScroll={handleScroll}>
                    <div className="space-y-12 pr-4">
                        {docSections.map(section => (
                            <section key={section.id} id={section.id} className="scroll-mt-20">
                                <h2 className="text-2xl font-bold border-b pb-2 mb-4">{section.title}</h2>
                                <div className="prose prose-sm max-w-none text-muted-foreground">
                                    {section.content}
                                </div>
                            </section>
                        ))}
                    </div>
                </ScrollArea>
            </main>
        </div>
    </div>
  );
}
