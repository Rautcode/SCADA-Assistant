
"use client";

import * as React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutGrid, List, CheckCircle2, Search } from "lucide-react";
import { ReportTemplate } from "@/lib/types/database";
import { Skeleton } from "../ui/skeleton";
import { categoryIcons } from "@/lib/icon-map";
import { useData } from "@/components/database/data-provider";

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
  const { templates, loading } = useData();
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(initialData?.selectedTemplate?.id || null);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Filter templates based on search term and the report type from step 1
  const filteredTemplates = React.useMemo(() => {
    return templates.filter(
      (template) =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (!reportType || template.category === reportType)
    );
  }, [templates, searchTerm, reportType]);


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
    const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || null;
    onValidated({ selectedTemplate });
  }, [selectedTemplateId, templates, onValidated]);


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
        : filteredTemplates.map((template) => {
            const Icon = categoryIcons[template.category] || categoryIcons['default'];
            return (
                <Card
                key={template.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-xl group ${
                    selectedTemplateId === template.id
                    ? "ring-2 ring-primary shadow-xl"
                    : "shadow-md"
                }`}
                onClick={() => setSelectedTemplateId(template.id)}
                >
                <CardHeader className="p-0 relative overflow-hidden rounded-t-lg aspect-[3/2]">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Icon className="h-16 w-16 text-primary/60 transition-transform duration-300 group-hover:scale-110" />
                    </div>
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
            )
        })}
    </div>
  );

  // --- Render List ---
  const renderListContent = () => (
    <div className="space-y-4">
      {loading
        ? Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="flex items-center p-4 shadow-md">
              <Skeleton className="rounded-md object-cover aspect-square mr-4 h-[60px] w-[60px]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            </Card>
          ))
        : filteredTemplates.map((template) => {
            const Icon = categoryIcons[template.category] || categoryIcons['default'];
            return (
            <Card
              key={template.id}
              className={`flex items-center p-4 cursor-pointer transition-all duration-200 hover:shadow-lg group ${
                selectedTemplateId === template.id
                  ? "ring-2 ring-primary shadow-lg"
                  : "shadow-md"
              }`}
              onClick={() => setSelectedTemplateId(template.id)}
            >
              <div className="relative overflow-hidden rounded-md aspect-square mr-4 h-[60px] w-[60px] flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
                <Icon className="h-8 w-8 text-primary/70 transition-transform duration-300 group-hover:scale-110" />
              </div>

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
        )})}
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
