
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail, Send, AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import { onEmailLogs } from '@/services/database-service';
import type { EmailLog } from '@/lib/types/database';
import { Unsubscribe } from 'firebase/firestore';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const EmailStatusBadge = React.memo(function EmailStatusBadge({ status }: { status: EmailLog['status'] }) {
    const isSent = status === 'sent';
    const Icon = isSent ? CheckCircle : AlertTriangle;
    const variant = isSent ? 'default' : 'destructive';
    const className = isSent ? 'bg-green-500 text-white' : '';

    return (
        <Badge variant={variant} className={cn("capitalize", className)}>
            <Icon className="mr-1 h-3 w-3" />
            {status}
        </Badge>
    );
});

export default function EmailSenderPage() {
    const [logs, setLogs] = React.useState<EmailLog[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        setLoading(true);
        const unsubscribe: Unsubscribe = onEmailLogs(logsData => {
            setLogs(logsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="w-full">
            <Card className="shadow-lg">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center text-2xl font-bold">
                            <Mail className="mr-3 h-7 w-7 text-primary" />
                            Email Sender
                        </CardTitle>
                        <CardDescription>
                            A real-time log of all outgoing SMTP emails and settings.
                        </CardDescription>
                    </div>
                     <Button asChild variant="outline">
                        <Link href="/settings">
                            <Settings className="mr-2 h-4 w-4" /> SMTP Settings
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[120px]">Status</TableHead>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead className="hidden md:table-cell">Error</TableHead>
                            <TableHead className="w-[220px] text-right">Timestamp</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-3/4" /></TableCell>
                                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-1/2" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No email logs found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map(log => (
                                <TableRow key={log.id}>
                                    <TableCell><EmailStatusBadge status={log.status} /></TableCell>
                                    <TableCell className="font-medium">{log.to}</TableCell>
                                    <TableCell>{log.subject}</TableCell>
                                    <TableCell className="text-destructive text-xs hidden md:table-cell">{log.error}</TableCell>
                                    <TableCell className="text-right text-xs text-muted-foreground">{format(log.timestamp, 'PPpp')}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </div>
    );
}
