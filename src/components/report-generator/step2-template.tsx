
"use client";

import * as React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutGrid, List, CheckCircle2, Search } from "lucide-react";
import Image from "next/image";
import { ReportTemplate } from "@/lib/types/database";
import { onReportTemplates } from "@/services/database-service";
import { Unsubscribe } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";

interface ReportStep2TemplateProps {
  onValidated: (data: { selectedTemplate: ReportTemplate | null }) => void;
  initialData: { selectedTemplate: ReportTemplate | null } | null;
  reportType?: string; // Automatically filter by this type
}

export function ReportStep2Template({
  onValidated,
  initialData,
  reportType,
}: ReportStep2TemplateProps) {
  const [allTemplates, setAllTemplates] = React.useState<ReportTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(initialData?.selectedTemplate?.id || null);
  const [searchTerm, setSearchTerm] = React.useState("");

  // fetch all templates once
  React.useEffect(() => {
    setLoading(true);
    const unsubscribe: Unsubscribe = onReportTemplates((templatesData) => {
      setAllTemplates(templatesData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter templates based on search term and the report type from step 1
  const filteredTemplates = React.useMemo(() => {
    return allTemplates.filter(
      (template) =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (!reportType || template.category === reportType)
    );
  }, [allTemplates, searchTerm, reportType]);


  // Auto-select the first template in the filtered list if the current selection is no longer valid
  React.useEffect(() => {
    const isCurrentSelectionValid = filteredTemplates.some(t => t.id === selectedTemplateId);
    
    if (!isCurrentSelectionValid && filteredTemplates.length > 0) {
      setSelectedTemplateId(filteredTemplates[0].id);
    } else if (filteredTemplates.length === 0) {
      setSelectedTemplateId(null);
    }
  }, [filteredTemplates, selectedTemplateId]);

  // sync selection to parent whenever it changes
  React.useEffect(() => {
    const selectedTemplate = allTemplates.find((t) => t.id === selectedTemplateId) || null;
    onValidated({ selectedTemplate });
  }, [selectedTemplateId, allTemplates, onValidated]);


  // --- Render Grid ---
  const renderGridContent = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {loading
        ? Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="shadow-md">
              <Skeleton className="rounded-t-lg w-full aspect-[3/2]" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))
        : filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-xl ${
                selectedTemplateId === template.id
                  ? "ring-2 ring-primary shadow-xl"
                  : "shadow-md"
              }`}
              onClick={() => setSelectedTemplateId(template.id)}
            >
              <CardHeader className="p-0">
                <Image
                  src={template.thumbnailUrl}
                  alt={template.name}
                  width={300}
                  height={200}
                  className="rounded-t-lg object-cover w-full aspect-[3/2]"
                  data-ai-hint="report document"
                />
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-md mb-1">{template.name}</CardTitle>
                <p className="text-xs text-muted-foreground mb-2">
                  {template.category}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
              </CardContent>
              {selectedTemplateId === template.id && (
                <CardFooter className="p-2 bg-primary/10 rounded-b-lg flex items-center">
                  <CheckCircle2 className="h-5 w-5 text-primary mr-2" />
                  <span className="text-sm font-medium text-primary">
                    Selected
                  </span>
                </CardFooter>
              )}
            </Card>
          ))}
    </div>
  );

  // --- Render List ---
  const renderListContent = () => (
    <div className="space-y-4">
      {loading
        ? Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="flex items-center p-4 shadow-md">
              <Skeleton className="rounded-md object-cover aspect-[3/2] mr-4 h-[80px] w-[120px]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            </Card>
          ))
        : filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className={`flex items-center p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedTemplateId === template.id
                  ? "ring-2 ring-primary shadow-lg"
                  : "shadow-md"
              }`}
              onClick={() => setSelectedTemplateId(template.id)}
            >
              <Image
                src={template.thumbnailUrl}
                alt={template.name}
                width={120}
                height={80}
                className="rounded-md object-cover aspect-[3/2] mr-4"
                data-ai-hint="report document"
              />
              <div className="flex-1">
                <CardTitle className="text-md mb-1">{template.name}</CardTitle>
                <p className="text-xs text-muted-foreground mb-1">
                  {template.category}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {template.description}
                </p>
              </div>
              {selectedTemplateId === template.id && (
                <CheckCircle2 className="h-6 w-6 text-primary ml-4" />
              )}
            </Card>
          ))}
    </div>
  );

  return (
    <div className="space-y-6 p-4">
      {/* --- Search & Filters --- */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant={viewMode === "grid" ? "secondary" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-5 w-5" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            <List className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* --- Informational header --- */}
      {reportType && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center dark:bg-blue-950 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                Showing templates for &quot;{reportType}&quot;
            </p>
        </div>
      )}


      {/* --- No Results --- */}
      {filteredTemplates.length === 0 && !loading && (
        <p className="text-center text-muted-foreground py-8">
          No templates match your criteria.
        </p>
      )}

      {/* --- Content --- */}
      {viewMode === "grid" ? renderGridContent() : renderListContent()}
    </div>
  );
}
