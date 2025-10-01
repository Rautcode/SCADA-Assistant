
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { HelpCircle, Search, Mail, BookOpen } from "lucide-react";

const faqData = [
  {
    question: "How do I add my Gemini API Key?",
    answer:
      "You can add your Gemini API key by navigating to the Settings page from the sidebar. Under the 'Integrations' tab, you will find a field to enter and save your API key. This is required to use all AI-powered features.",
    category: "General",
  },
  {
    question: "How do I connect to my SCADA database?",
    answer:
      "Go to Settings > Database. Enter your SQL Server address, database name, username, and password. Use the 'Test Connection' button to verify the details before saving.",
    category: "Database",
  },
  {
    question: "Where can I find the reports I generate?",
    answer:
      "Currently, the generated report content is displayed in a pop-up dialog after the AI finishes processing. From there, you can copy the content. Future updates will include options to download files directly.",
    category: "Reports",
  },
  {
    question: "How do I create a new report template?",
    answer:
      "Navigate to the 'Templates' page from the sidebar. Click the 'New Template' button, fill in the details like name, category, and description, and click 'Create Template'. It will then be available in the Report Generator.",
    category: "Templates",
  },
  {
    question: "Can I schedule a report to run automatically?",
    answer:
      "Yes! Go to the 'Scheduler' page, click 'New Task', give your task a name, select a report template, and choose a future date and time. The task will be added to the real-time schedule list.",
    category: "Scheduler",
  },
  {
    question: "What do the different colors for scheduled tasks mean?",
    answer:
      "The colors indicate the task's status: Blue (Scheduled) means it's waiting to run. Green (Completed) means it ran successfully. Red (Failed) means an error occurred. Yellow (Overdue) means the scheduled time has passed without completion.",
    category: "Scheduler",
  },
];

export default function HelpPage() {
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredFaqs = faqData.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <HelpCircle className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-3xl font-bold mt-2">
            How can we help?
          </CardTitle>
          <CardDescription className="max-w-xl mx-auto">
            Search our knowledge base or browse the frequently asked questions
            below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for answers..."
              className="pl-12 h-12 text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFaqs.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {filteredFaqs.map((faq, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger className="text-left font-semibold hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p>No results found for &quot;{searchTerm}&quot;.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
                <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Contact Support</CardTitle>
              <CardDescription>Can&apos;t find an answer?</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
                Our support team is here to help. Reach out to us for any technical issues or further questions.
            </p>
            <a href="mailto:support@scada-assistant.com" className="text-sm font-semibold text-primary mt-2 inline-block">
                support@scada-assistant.com
            </a>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center gap-4">
             <div className="p-3 bg-primary/10 rounded-full">
                <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Documentation</CardTitle>
              <CardDescription>In-depth technical guides.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
               Explore our full documentation for detailed information on setup, features, and advanced configurations.
            </p>
             <a href="#" className="text-sm font-semibold text-primary mt-2 inline-block">
                View Documentation
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
