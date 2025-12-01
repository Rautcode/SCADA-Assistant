"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, BrainCircuit, Mail, Activity, Wifi, WifiOff, KeyRound, Loader2, Server, CheckCircle, AlertCircle } from 'lucide-react';
import { getHealthCheckStatusFlow } from '@/ai/flows/health-check-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

type Status = 'operational' | 'error' | 'untested' | 'testing';
type HealthCheckResult = {
    db: {
        status: Status;
        message: string;
        details?: Record<string, string | number | undefined>;
    };
    ai: {
        status: Status;
        message: string;
        details?: Record<string, string | number | undefined>;
    };
    smtp: {
        status: Status;
        message: string;
        details?: Record<string, string | number | undefined>;
    };
};

const statusConfig = {
    operational: {
        icon: Wifi,
        badge: "Operational",
        color: "bg-green-500",
        description: "Component is operating as expected."
    },
    error: {
        icon: WifiOff,
        badge: "Error",
        color: "bg-red-500",
        description: "There is an issue with this component."
    },
    testing: {
        icon: Loader2,
        badge: "Testing...",
        color: "bg-yellow-500",
        description: "Running a live check on this component."
    },
    untested: {
        icon: Activity,
        badge: "Untested",
        color: "bg-gray-400",
        description: "Run a test to verify the component's status."
    }
};

const StatusBadge = React.memo(function StatusBadge({ status }: { status: Status }) {
    const { icon: Icon, badge, color } = statusConfig[status];
    return (
        <Badge className={cn("text-white", color)}>
            <Icon className={cn("mr-1 h-3 w-3", status === 'testing' && 'animate-spin')} />
            {badge}
        </Badge>
    );
});


const HealthCheckCard = ({ title, icon: Icon, status, message, details, onTest, isTesting }: { title: string, icon: React.ElementType, status: Status, message: string, details?: Record<string, string | number | undefined>, onTest: () => void, isTesting: boolean }) => (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
            <div className="space-y-1.5">
                 <CardTitle className="flex items-center text-lg">
                    <Icon className="mr-3 h-5 w-5 text-primary" />
                    {title}
                </CardTitle>
                <CardDescription>{statusConfig[status].description}</CardDescription>
            </div>
            <StatusBadge status={status} />
        </CardHeader>
        <CardContent className="space-y-4">
            <Alert variant={status === 'error' ? 'destructive' : 'default'} className={cn(status === 'operational' && 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950')}>
                {status === 'operational' ? <CheckCircle className="h-4 w-4" /> : status === 'error' ? <AlertCircle className="h-4 w-4" /> : <Server className="h-4 w-4" />}
                <AlertTitle className="font-semibold">{status === 'operational' ? "Connection Verified" : status === 'error' ? "Error Details" : "Status"}</AlertTitle>
                <AlertDescription className="text-xs">{message}</AlertDescription>
            </Alert>

            {details && (
                 <div className="text-sm text-muted-foreground space-y-2 pt-2 border-t">
                    <h4 className="font-semibold text-foreground">Configuration Details</h4>
                    {Object.entries(details).map(([key, value]) => value && (
                        <div key={key} className="flex justify-between">
                            <span className="capitalize font-medium">{key.replace(/([A-Z])/g, ' $1')}:</span>
                            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{value}</span>
                        </div>
                    ))}
                 </div>
            )}
        </CardContent>
        <CardFooter>
            <Button variant="outline" onClick={onTest} disabled={isTesting}>
                {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                Re-Test
            </Button>
        </CardFooter>
    </Card>
);

export default function HealthCheckPage() {
    const [healthStatus, setHealthStatus] = React.useState<HealthCheckResult | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    const runAllChecks = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getHealthCheckStatusFlow();
            setHealthStatus(result);
        } catch (error: any) {
            console.error("Health check failed:", error);
            // Set all to error status on complete failure
            const errorMessage = "Failed to run health checks. The backend might be unreachable.";
            setHealthStatus({
                db: { status: 'error', message: errorMessage },
                ai: { status: 'error', message: errorMessage },
                smtp: { status: 'error', message: errorMessage },
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    React.useEffect(() => {
        runAllChecks();
    }, [runAllChecks]);

    if (!healthStatus) {
         return (
            <div className="w-full">
                <Card className="shadow-lg mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center text-2xl font-bold">
                            <Activity className="mr-3 h-7 w-7 text-primary" />
                            System Health Check
                        </CardTitle>
                        <CardDescription>
                            A real-time overview of your system's critical connections.
                        </CardDescription>
                    </CardHeader>
                </Card>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-96 w-full" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="w-full">
            <Card className="shadow-lg mb-6">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center text-2xl font-bold">
                            <Activity className="mr-3 h-7 w-7 text-primary" />
                            System Health Check
                        </CardTitle>
                        <CardDescription>
                            A real-time overview of your system's critical connections.
                        </CardDescription>
                    </div>
                     <Button onClick={runAllChecks} disabled={isLoading}>
                         {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                        Run All Checks
                    </Button>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <HealthCheckCard 
                    title="SCADA Database"
                    icon={Database}
                    status={isLoading ? 'testing' : healthStatus.db.status}
                    message={healthStatus.db.message}
                    details={healthStatus.db.details}
                    onTest={runAllChecks}
                    isTesting={isLoading}
                />
                 <HealthCheckCard 
                    title="AI Service (Gemini)"
                    icon={BrainCircuit}
                    status={isLoading ? 'testing' : healthStatus.ai.status}
                    message={healthStatus.ai.message}
                    details={healthStatus.ai.details}
                    onTest={runAllChecks}
                    isTesting={isLoading}
                />
                 <HealthCheckCard 
                    title="Email (SMTP)"
                    icon={Mail}
                    status={isLoading ? 'testing' : healthStatus.smtp.status}
                    message={healthStatus.smtp.message}
                    details={healthStatus.smtp.details}
                    onTest={runAllChecks}
                    isTesting={isLoading}
                />
            </div>
             <Alert className="mt-8">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Need to make changes?</AlertTitle>
                <AlertDescription>
                    All connections are configured on the <Link href="/settings" className="font-semibold text-primary hover:underline">Settings page</Link>.
                </AlertDescription>
            </Alert>
        </div>
    );
}
