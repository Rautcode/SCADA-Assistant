
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, BarChartBig, Search, AlertTriangle, ChevronsUpDown, Settings } from "lucide-react";
import Link from 'next/link';

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Checkbox } from "../ui/checkbox";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import { getScadaTags } from "@/app/actions/scada-actions";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useConnection } from "../database/connection-provider";
import { categoryIcons } from "@/lib/icon-map";
import { useData } from "@/components/database/data-provider";
import { useAuth } from "../auth/auth-provider";

export const reportCriteriaSchema = z.object({
  dateRange: z.object({
    from: z.date({ required_error: "Start date is required." }),
    to: z.date({ required_error: "End date is required." }),
  }),
  machineIds: z.array(z.string()).min(1, "At least one machine must be selected."),
  reportType: z.string().min(1, "Report type is required."),
  parameterIds: z.array(z.string()).optional(),
});

type ReportCriteriaFormValues = z.infer<typeof reportCriteriaSchema>;

interface ReportStep1CriteriaProps {
  onValidated: (data: ReportCriteriaFormValues | null) => void;
  initialData: ReportCriteriaFormValues | null;
}

export function ReportStep1Criteria({ onValidated, initialData }: ReportStep1CriteriaProps) {
  const [machineSearch, setMachineSearch] = React.useState("");
  const { machines, loading: loadingMachines, templates } = useData();

  const [parameterSearch, setParameterSearch] = React.useState("");
  const [availableParameters, setAvailableParameters] = React.useState<string[]>([]);
  const [loadingParameters, setLoadingParameters] = React.useState(false);
  const [parameterError, setParameterError] = React.useState<string | null>(null);
  
  const { user } = useAuth();
  const { status: connectionStatus } = useConnection();


  const form = useForm<ReportCriteriaFormValues>({
    resolver: zodResolver(reportCriteriaSchema),
    defaultValues: initialData || {
      dateRange: { from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), to: new Date() },
      machineIds: [],
      reportType: "Production",
      parameterIds: [],
    },
    mode: "onChange",
  });
  
  const { formState, watch, getValues } = form;
  const selectedMachineIds = watch("machineIds");

  React.useEffect(() => {
    const subscription = watch(() => {
        if (formState.isValid) {
            onValidated(getValues());
        } else {
            onValidated(null);
        }
    });
    // On initial load, if the data is valid, notify parent immediately.
    if(formState.isValid) {
        onValidated(getValues());
    }
    return () => subscription.unsubscribe();
  }, [watch, formState, getValues, onValidated]);

  
  React.useEffect(() => {
    async function fetchTags() {
      if (!user || !selectedMachineIds || selectedMachineIds.length === 0) {
        setAvailableParameters([]);
        return;
      }

      if (connectionStatus !== 'connected') {
        setAvailableParameters([]);
        setParameterError("Database is not connected. Please configure it in Settings.");
        setLoadingParameters(false);
        return;
      }
      
      setLoadingParameters(true);
      setParameterError(null);
      // Immediately clear old parameters when selection changes
      setAvailableParameters([]);
      
      try {
        // This action is now self-contained and authenticated.
        const tags = await getScadaTags({ machineIds: selectedMachineIds });
        setAvailableParameters(tags);
        if (tags.length === 0) {
            setParameterError("No parameters (tags) found for the selected machines. This may be due to the machine selection or a database issue.");
        }

      } catch (e: any) {
        setParameterError(e.message || "An unexpected error occurred while fetching parameters.");
      } finally {
        setLoadingParameters(false);
      }
    }

    const debounce = setTimeout(() => {
      fetchTags();
    }, 300); // Add a small debounce

    return () => clearTimeout(debounce);
  }, [selectedMachineIds, user, connectionStatus]);


  const filteredMachines = machines.filter(machine => 
    machine.name.toLowerCase().includes(machineSearch.toLowerCase())
  );

  const filteredParameters = availableParameters.filter(param =>
    param.toLowerCase().includes(parameterSearch.toLowerCase())
  );

  const templateCategories = React.useMemo(() => 
    [...new Set(templates.map(t => t.category))]
  , [templates]);
  
  const ConnectionError = ({ title, message, isSubtle }: { title: string; message: string, isSubtle?: boolean }) => (
    <div className="p-4">
        <Alert variant={isSubtle ? "default" : "destructive"} className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>
                <p>{message}</p>
                <Button asChild variant="secondary" size="sm" className="mt-3">
                    <Link href="/settings">
                        <Settings className="mr-2 h-4 w-4" /> Go to Settings
                    </Link>
                </Button>
            </AlertDescription>
        </Alert>
    </div>
);


  return (
    <div className="w-full">
      <Form {...form}>
        <form className="space-y-8 p-4">
          <FormField
            control={form.control}
            name="dateRange"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date Range</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value?.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value?.from ? (
                        field.value.to ? (
                          <>
                            {format(field.value.from, "LLL dd, y")} -{" "}
                            {format(field.value.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(field.value.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={field.value?.from}
                      selected={field.value}
                      onSelect={(range) => field.onChange(range || { from: undefined, to: undefined })}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reportType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Report Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a report type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {templateCategories.map(category => {
                        const Icon = categoryIcons[category] || BarChartBig;
                        return (
                            <SelectItem key={category} value={category}>
                                <div className="flex items-center">
                                    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                                    {category}
                                </div>
                            </SelectItem>
                        )
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Collapsible defaultOpen className="space-y-4">
            <CollapsibleTrigger className="flex w-full items-center justify-between">
                <h3 className="text-lg font-semibold">Data Sources</h3>
                <ChevronsUpDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Machines</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="machineIds"
                    render={() => (
                      <FormItem>
                        <div className="relative mb-2">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Search machines..." 
                            className="pl-10"
                            value={machineSearch}
                            onChange={(e) => setMachineSearch(e.target.value)}
                          />
                        </div>
                        <ScrollArea className="h-40 w-full rounded-md border p-2">
                          {loadingMachines ? (
                            <div className="space-y-2 p-2">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center space-x-2">
                                  <Skeleton className="h-4 w-4" />
                                  <Skeleton className="h-4 w-[200px]" />
                                </div>
                              ))}
                            </div>
                          ) : filteredMachines.length > 0 ? filteredMachines.map((machine) => (
                            <FormField
                              key={machine.id}
                              control={form.control}
                              name="machineIds"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={machine.id}
                                    className="flex flex-row items-start space-x-3 space-y-0 py-1.5 px-2 hover:bg-muted rounded-md"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(machine.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), machine.id])
                                            : field.onChange(
                                              (field.value || []).filter(
                                                  (value) => value !== machine.id
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal cursor-pointer">
                                      {machine.name}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          )) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No machines found in the database.</p>
                          )}
                        </ScrollArea>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Parameters (Tags)</CardTitle>
                </CardHeader>
                <CardContent>
                   <FormField
                    control={form.control}
                    name="parameterIds"
                    render={() => (
                      <FormItem>
                        <div className="relative mb-2">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Search parameters..." 
                            className="pl-10"
                            value={parameterSearch}
                            onChange={(e) => setParameterSearch(e.target.value)}
                            disabled={selectedMachineIds.length === 0 || loadingParameters}
                          />
                        </div>
                        <ScrollArea className="h-40 w-full rounded-md border p-2">
                          {loadingParameters ? (
                            <div className="space-y-2 p-2">
                               {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center space-x-2">
                                  <Skeleton className="h-4 w-4" />
                                  <Skeleton className="h-4 w-[200px]" />
                                </div>
                              ))}
                            </div>
                          ) : parameterError ? (
                             <ConnectionError 
                              title="Could Not Load Parameters"
                              message={parameterError}
                              isSubtle
                             />
                          ) : filteredParameters.length > 0 ? filteredParameters.map((param) => (
                            <FormField
                              key={param}
                              control={form.control}
                              name="parameterIds"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={param}
                                    className="flex flex-row items-start space-x-3 space-y-0 py-1.5 px-2 hover:bg-muted rounded-md"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(param)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), param])
                                            : field.onChange(
                                              (field.value || []).filter(
                                                  (value) => value !== param
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal cursor-pointer">
                                      {param}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          )) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Select one or more machines to load available parameters.</p>
                          )}
                        </ScrollArea>
                         <FormDescription>
                          Select specific parameters to include. Leave blank to include all available tags from the selected machines.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

            </CollapsibleContent>
          </Collapsible>
        </form>
      </Form>
    </div>
  );
}
