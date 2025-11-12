
"use client";

import * as React from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, Search, AlertCircle, Settings } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScadaDataPoint } from "@/lib/types/database";
import { getScadaData } from "@/app/actions/scada-actions";
import { getUserSettings } from "@/app/actions/settings-actions";
import { Skeleton } from "../ui/skeleton";
import type { reportCriteriaSchema } from "./step1-criteria";
import type { z } from "zod";
import { useAuth } from "../auth/auth-provider";
import { useConnection } from "../database/connection-provider";

type SortKey = keyof Omit<ScadaDataPoint, 'included' | 'id'>;

interface ReportStep3PreviewProps {
    onValidated: (data: { scadaData: ScadaDataPoint[] }) => void;
    initialData: { scadaData: ScadaDataPoint[] } | null;
    criteria: z.infer<typeof reportCriteriaSchema> | null;
}

export function ReportStep3Preview({ onValidated, initialData, criteria }: ReportStep3PreviewProps) {
  const [data, setData] = React.useState<ScadaDataPoint[]>(initialData?.scadaData || []);
  const [loading, setLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortConfig, setSortConfig] = React.useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>(null);
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = React.useState(1);
  const [error, setError] = React.useState<string | null>(null);
  const { user } = useAuth();
  const { status: connectionStatus } = useConnection();
  const hasFetched = React.useRef(false);


  React.useEffect(() => {
    onValidated({ scadaData: data });
  }, [data, onValidated]);

  React.useEffect(() => {
    // Only fetch if we have criteria and the connection is good.
    // The `hasFetched` ref prevents re-fetching when navigating back to this step
    // unless the criteria have changed.
    if (hasFetched.current) return;

    async function fetchSettingsAndData() {
        if (!user || !criteria) {
            setLoading(false);
            return;
        };
        
        if (connectionStatus === 'unconfigured') {
            setError("Database credentials are not configured. Please set them in your user settings.");
            setLoading(false);
            return;
        }

        if (connectionStatus !== 'connected') {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        setData([]);

        try {
            const settings = await getUserSettings({ userId: user.uid });
            const creds = settings?.database;
            const mapping = settings?.dataMapping;

            if (creds && mapping) {
                const scadaData = await getScadaData({ criteria, dbCreds: creds, mapping });
                
                // When fetching new data, intelligently merge it with any existing selections
                // from the parent's `initialData` state.
                const enrichedData = scadaData.map(d => {
                  const existingRow = initialData?.scadaData.find(initial => initial.id === d.id);
                  return { ...d, included: existingRow ? existingRow.included : true };
                });

                setData(enrichedData);
                 if (scadaData.length === 0) {
                   setError("No data was returned from the database. Check your criteria and connection settings.");
                }
                hasFetched.current = true; // Mark as fetched

            } else {
                setError("Database credentials or data mappings are not configured. Please set them in your user settings.");
            }
        } catch (e: any) {
            console.error("Failed to fetch SCADA data:", e);
            setError(e.message || "An unknown error occurred while fetching data.");
        } finally {
            setLoading(false);
        }
    }
    fetchSettingsAndData();
  }, [criteria, user, initialData, connectionStatus]);

  const handleIncludeToggle = (id: string) => {
    setData(prevData =>
      prevData.map(row =>
        row.id === id ? { ...row, included: !row.included } : row
      )
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setData(prevData => prevData.map(row => ({ ...row, included: checked })));
  };

  const filteredData = React.useMemo(() => {
    let searchableData = [...data];
    if (searchTerm) {
      searchableData = data.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (sortConfig !== null) {
      searchableData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return searchableData;
  }, [data, searchTerm, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const allSelected = data.length > 0 && data.every(row => row.included);
  const someSelected = data.some(row => row.included) && !allSelected;


  const renderContent = () => {
    if (loading) {
        return (
             <ScrollArea className="rounded-md border h-96">
                <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                    {/* Simplified header for loading state */}
                    <TableRow>
                        <TableHead className="w-[50px]"><Skeleton className="h-4 w-4" /></TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Machine</TableHead>
                        <TableHead>Parameter</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Unit</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({length: itemsPerPage}).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                </Table>
            </ScrollArea>
        )
    }

    if (error) {
        return (
            <div className="text-center text-destructive py-12 border-2 border-dashed border-destructive/50 rounded-lg">
                <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Data Fetching Failed</h3>
                <p className="text-sm mb-4">{error}</p>
                {error.includes("configure") && (
                     <Button asChild>
                        <Link href="/settings">
                            <Settings className="mr-2 h-4 w-4" /> Go to Settings
                        </Link>
                    </Button>
                )}
            </div>
        )
    }

     if (!criteria) {
        return (
            <div className="text-center text-muted-foreground py-12">
                Please complete Step 1 to load data.
            </div>
        );
    }
    
    return (
       <ScrollArea className="rounded-md border h-96">
        <Table>
          <TableHeader className="sticky top-0 bg-muted z-10">
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected || (someSelected ? 'indeterminate' : false)}
                  onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                  aria-label="Select all rows"
                />
              </TableHead>
              <TableHead onClick={() => requestSort('timestamp')} className="cursor-pointer hover:bg-muted/50">
                Timestamp <ArrowUpDown className="ml-2 h-4 w-4 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('machine')} className="cursor-pointer hover:bg-muted/50">
                Machine <ArrowUpDown className="ml-2 h-4 w-4 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('parameter')} className="cursor-pointer hover:bg-muted/50">
                Parameter <ArrowUpDown className="ml-2 h-4 w-4 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('value')} className="cursor-pointer hover:bg-muted/50">
                Value <ArrowUpDown className="ml-2 h-4 w-4 inline" />
              </TableHead>
              <TableHead onClick={() => requestSort('unit')} className="cursor-pointer hover:bg-muted/50">
                Unit <ArrowUpDown className="ml-2 h-4 w-4 inline" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row) => (
              <TableRow key={row.id} data-state={row.included ? 'selected' : undefined}>
                <TableCell>
                  <Checkbox
                    checked={row.included}
                    onCheckedChange={() => handleIncludeToggle(row.id)}
                    aria-label={`Select row ${row.id}`}
                  />
                </TableCell>
                <TableCell>{new Date(row.timestamp).toLocaleString()}</TableCell>
                <TableCell>{row.machine}</TableCell>
                <TableCell>{row.parameter}</TableCell>
                <TableCell>{row.value}</TableCell>
                <TableCell>{row.unit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    )

  }


  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
            placeholder="Search data..."
            value={searchTerm}
            onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
            }}
            className="pl-10"
            />
        </div>
      </div>
      
      {renderContent()}
      
      {totalPages > 1 && !loading && !error &&(
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev -1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

    