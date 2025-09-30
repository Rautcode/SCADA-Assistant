
"use client";

import * as React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutGrid, List, CheckCircle2, Search } from "lucide-react";
import Image from "next/image";
import { ReportTemplate } from "@/lib/types/database";
import { onReportTemplates } from "@/services/database-service";
import { Unsubscribe } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";

interface ReportStep2TemplateProps {
  onValidated: (data: { selectedTemplate: ReportTemplate | null }) => void;
  initialData: { selectedTemplate: ReportTemplate | null } | null;
}

export function ReportStep2Template({ onValidated, initialData }: ReportStep2TemplateProps) {
  const [templates, setTemplates] = React.useState<ReportTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(initialData?.selectedTemplate?.id || null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterCategory, setFilterCategory] = React.useState("all");

  React.useEffect(() => {
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || null;
    onValidated({ selectedTemplate });
  }, [selectedTemplateId, templates, onValidated]);

  React.useEffect(() => {
    setLoading(true);
    const unsubscribe: Unsubscribe = onReportTemplates(templatesData => {
      setTemplates(templatesData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    // Auto-select first template if none is selected and templates are available
    if (!selectedTemplateId && templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [selectedTemplateId, templates]);

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterCategory === "all" || template.category === filterCategory)
  );

  const categories = ["all", ...Array.from(new Set(templates.map(t => t.category)))];

  const renderGridContent = () => {
    const items = loading ? Array.from({length: 3}) : filteredTemplates;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((template: ReportTemplate, index) => (
          <Card
            key={loading ? index : template.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-xl ${!loading && selectedTemplateId === template.id ? "ring-2 ring-primary shadow-xl" : "shadow-md"}`}
            onClick={() => !loading && setSelectedTemplateId(template.id)}
          >
            {loading ? (
              <>
                <Skeleton className="rounded-t-lg w-full aspect-[3/2]" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader className="p-0">
                  <Image 
                      src={template.thumbnailUrl} 
                      alt={template.name} 
                      width={300} height={200} 
                      className="rounded-t-lg object-cover w-full aspect-[3/2]"
                      data-ai-hint="report document" 
                  />
                </CardHeader>
                <CardContent className="p-4">
                  <CardTitle className="text-md mb-1">{template.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mb-2">{template.category}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                </CardContent>
                {selectedTemplateId === template.id && (
                  <CardFooter className="p-2 bg-primary/10 rounded-b-lg">
                    <CheckCircle2 className="h-5 w-5 text-primary mr-2" />
                    <span className="text-sm font-medium text-primary">Selected</span>
                  </CardFooter>
                )}
              </>
            )}
          </Card>
        ))}
      </div>
    );
  };
  
  const renderListContent = () => {
     const items = loading ? Array.from({length: 3}) : filteredTemplates;
     return (
        <div className="space-y-4">
          {items.map((template: ReportTemplate, index) => (
            <Card
              key={loading ? index : template.id}
              className={`flex items-center p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${!loading && selectedTemplateId === template.id ? "ring-2 ring-primary shadow-lg" : "shadow-md"}`}
              onClick={() => !loading && setSelectedTemplateId(template.id)}
            >
               {loading ? (
                  <>
                    <Skeleton className="rounded-md object-cover aspect-[3/2] mr-4 h-[80px] w-[120px]" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </>
                ) : (
                  <>
                    <Image 
                      src={template.thumbnailUrl} 
                      alt={template.name} 
                      width={120} height={80} 
                      className="rounded-md object-cover aspect-[3/2] mr-4"
                      data-ai-hint="report document"
                    />
                    <div className="flex-1">
                      <CardTitle className="text-md mb-1">{template.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mb-1">{template.category}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{template.description}</p>
                    </div>
                    {selectedTemplateId === template.id && (
                      <CheckCircle2 className="h-6 w-6 text-primary ml-4" />
                    )}
                  </>
               )}
            </Card>
          ))}
        </div>
     );
  };


  return (
    <div className="space-y-6 p-4">
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
            <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
                {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat === "all" ? "All Categories" : cat}</SelectItem>
                ))}
            </SelectContent>
            </Select>
            <Button variant={viewMode === 'grid' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('grid')} aria-label="Grid view">
            <LayoutGrid className="h-5 w-5" />
            </Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'outline'} size="icon" onClick={() => setViewMode('list')} aria-label="List view">
            <List className="h-5 w-5" />
            </Button>
        </div>
      </div>

      {filteredTemplates.length === 0 && !loading && (
        <p className="text-center text-muted-foreground py-8">No templates match your criteria.</p>
      )}

      {viewMode === "grid" ? renderGridContent() : renderListContent()}
    </div>
  );
}
