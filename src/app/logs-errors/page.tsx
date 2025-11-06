
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileWarning, AlertTriangle, Info, CheckCircle, Search, Calendar as CalendarIcon, ListFilter } from 'lucide-react';
import { onLogs } from '@/services/database-service';
import type { SystemLog } from '@/lib/types/database';
import { Unsubscribe } from 'firebase/firestore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';

const logLevels: SystemLog['level'][] = ['info', 'warn', 'error', 'success'];

const logConfig = {
    error: { icon: AlertTriangle, variant: 'destructive', className: '' },
    warn: { icon: FileWarning, variant: 'secondary', className: 'bg-yellow-500/80 text-white' },
    info: { icon: Info, variant: 'default', className: 'bg-blue-500 text-white' },
    success: { icon: CheckCircle, variant: 'default', className: 'bg-green-500 text-white' },
};

const LogBadge = React.memo(function LogBadge({ level }: { level: SystemLog['level'] }) {
    const config = logConfig[level] || { icon: Info, variant: 'outline', className: '' };
    const { icon: Icon, variant, className } = config;

    return (
        <Badge variant={variant as any} className={cn("capitalize", className)}>
            <Icon className="mr-1 h-3 w-3" />
            {level}
        </Badge>
    );
});

export default function LogsErrorsPage() {
    const [logs, setLogs] = React.useState<SystemLog[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [levelFilter, setLevelFilter] = React.useState('all');
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>();

    React.useEffect(() => {
        setLoading(true);
        const unsubscribe = onLogs(logsData => {
            setLogs(logsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredLogs = React.useMemo(() => {
        return logs.filter(log => {
            const matchesSearch = searchTerm === '' ||
                log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.source.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
            
            const matchesDate = !dateRange || (
                (!dateRange.from || log.timestamp >= dateRange.from) &&
                (!dateRange.to || log.timestamp <= dateRange.to)
            );

            return matchesSearch && matchesLevel && matchesDate;
        });
    }, [logs, searchTerm, levelFilter, dateRange]);
    
    const renderContent = () => {
        if (loading) {
            return (
                Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                ))
            )
        }
        
        if (filteredLogs.length === 0) {
            return (
                 <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        No logs match your current filters.
                    </TableCell>
                </TableRow>
            )
        }

        return (
            filteredLogs.map(log => (
                <TableRow key={log.id}>
                    <TableCell>
                        <LogBadge level={log.level} />
                    </TableCell>
                    <TableCell className="font-medium">{log.message}</TableCell>
                    <TableCell>{format(log.timestamp, 'PPpp')}</TableCell>
                    <TableCell>{log.source}</TableCell>
                </TableRow>
            ))
        )
    }

    return (
        <div className="w-full">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center text-2xl font-bold">
                        <FileWarning className="mr-3 h-7 w-7 text-primary" />
                        System Logs & Errors
                    </CardTitle>
                    <CardDescription>
                        A real-time view of system logs and error reports.
                    </CardDescription>
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <div className="relative w-full sm:max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search logs..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={levelFilter} onValueChange={setLevelFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <ListFilter className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Filter by level" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Levels</SelectItem>
                                {logLevels.map(level => (
                                <SelectItem key={level} value={level} className="capitalize">{level}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                         <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-full sm:w-auto justify-start text-left font-normal",
                                !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(dateRange.from, "LLL dd, y")
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
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Level</TableHead>
                                <TableHead>Message</TableHead>
                                <TableHead className="w-[200px]">Timestamp</TableHead>
                                <TableHead className="w-[150px]">Source</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {renderContent()}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
