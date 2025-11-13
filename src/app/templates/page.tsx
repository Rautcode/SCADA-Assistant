
"use client";

import * as React from "react";
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutGrid, List, PlusCircle, Search, FileText } from "lucide-react";
import { ReportTemplate } from "@/lib/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { categoryIcons } from "@/lib/icon-map";
import { useData } from "@/components/database/data-provider";

const NewTemplateDialog = dynamic(() =>
  import('@/components/templates/new-template-dialog').then((mod) => mod.NewTemplateDialog),
  { ssr: false, loading: () => <p>Loading...</p> }
);

const TemplateCard = React.memo(function TemplateCard({ template, loading }: { template?: ReportTemplate, loading?: boolean }) {
  if (loading || !template) {
    return (
      <Card className="shadow-md">
        <CardHeader className="p-0">
          <Skeleton className="rounded-t-lg w-full aspect-[3/2]" />
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    )
  }
  const Icon = categoryIcons[template.category] || categoryIcons['default'];

  return (
    <Card className="cursor-pointer transition-all duration-200 hover:shadow-xl shadow-md group">
      <CardHeader className="p-0 relative overflow-hidden rounded-t-lg aspect-[3/2]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/20 animate-shimmer" />
        <div className="absolute inset-0 flex items-center justify-center">
            <Icon className="h-16 w-16 text-primary/70 transition-transform duration-300 group-hover:scale-110" />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="text-md mb-1">{template.name}</CardTitle>
        <p className="text-xs text-muted-foreground mb-2">{template.category}</p>
        <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
      </CardContent>
    </Card>
  )
});

const TemplateListItem = React.memo(function TemplateListItem({ template, loading }: { template?: ReportTemplate, loading?: boolean }) {
  if (loading || !template) {
    return (
      <Card className="flex items-center p-4 shadow-sm">
        <Skeleton className="rounded-md object-cover aspect-square mr-4 h-[60px] w-[60px]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-full" />
        </div>
      </Card>
    );
  }
  
  const Icon = categoryIcons[template.category] || categoryIcons['default'];

  return (
     <Card className="flex items-center p-4 cursor-pointer transition-all duration-200 hover:shadow-lg shadow-md group">
        <div className="relative overflow-hidden rounded-md aspect-square mr-4 h-[60px] w-[60px] flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
            <Icon className="h-8 w-8 text-primary/80 transition-transform duration-300 group-hover:scale-110" />
        </div>
      <div className="flex-1">
        <CardTitle className="text-md mb-1">{template.name}</CardTitle>
        <p className="text-xs text-muted-foreground mb-1">{template.category}</p>
        <p className="text-sm text-muted-foreground line-clamp-1">{template.description}</p>
      </div>
    </Card>
  )
});

export default function TemplatesPage() {
  const { templates, loading: templatesLoading } = useData();
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterCategory, setFilterCategory] = React.useState("all");
  const [isNewTemplateDialogOpen, setIsNewTemplateDialogOpen] = React.useState(false);

  const filteredTemplates = React.useMemo(() => templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterCategory === "all" || template.category === filterCategory)
  ), [templates, searchTerm, filterCategory]);

  const categories = React.useMemo(() => ["all", ...Array.from(new Set(templates.map(t => t.category)))], [templates]);

  const renderContent = () => {
     if (templatesLoading) {
       const loaderItems = Array.from({ length: 6 });
        if (viewMode === 'grid') {
          return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loaderItems.map((_, i) => <TemplateCard key={i} loading />)}
            </div>
        }
        return <div className="space-y-4">
            {loaderItems.map((_, i) => <TemplateListItem key={i} loading />)}
        </div>
    }

    if (filteredTemplates.length === 0) {
      return (
        <div className="mt-6 p-8 border-2 border-dashed border-border rounded-lg text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No Templates Found</h3>
            <p className="text-sm text-muted-foreground">
              No templates match your criteria. Try creating a new one.
            </p>
          </div>
      )
    }

    if (viewMode === 'grid') {
      return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.map(template => <TemplateCard key={template.id} template={template} />)}
      </div>
    }

    return <div className="space-y-4">
        {filteredTemplates.map(template => <TemplateListItem key={template.id} template={template} />)}
    </div>
  }

  return (
    <div className="w-full">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
             <div>
              <CardTitle className="flex items-center text-2xl font-bold">
                  <FileText className="mr-3 h-7 w-7 text-primary" />
                  Template Manager
              </CardTitle>
              <CardDescription>Create, view, and manage your report templates.</CardDescription>
            </div>
             <Button onClick={() => setIsNewTemplateDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Template
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
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
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
      {isNewTemplateDialogOpen && <NewTemplateDialog open={isNewTemplateDialogOpen} onOpenChange={setIsNewTemplateDialogOpen} />}
    </div>
  );
}
