
"use client";

import * as React from "react";
import dynamic from 'next/dynamic';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScadaDataPoint } from "@/lib/types/database";
import { get, set } from "react-hook-form";
import { AiChartStylist } from "./ai-chart-stylist";
import { Skeleton } from "../ui/skeleton";
import { Input } from "../ui/input";

const RechartsBarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false, loading: () => <Skeleton className="w-full h-[300px]" /> });
const RechartsLineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false, loading: () => <Skeleton className="w-full h-[300px]" /> });
const RechartsPieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false, loading: () => <Skeleton className="w-full h-[300px]" /> });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });


export const chartConfigSchema = z.object({
  includeCharts: z.boolean().default(false),
  chartType: z.string().optional(),
  chartTitle: z.string().optional(),
  xAxisField: z.string().optional(),
  yAxisField: z.string().optional(),
  colorScheme: z.array(z.string()).optional(),
});

type ChartType = "bar" | "line" | "pie";
type ChartConfigValues = z.infer<typeof chartConfigSchema>;

interface ReportStep4ChartsProps {
  onValidated: (data: ChartConfigValues) => void;
  initialData: ChartConfigValues | null;
  scadaData?: ScadaDataPoint[] | null;
}

const ChartPreview = React.memo(function ChartPreview({
  chartType,
  xAxisKey,
  yAxisKey,
  data,
  colors,
}: {
  chartType?: ChartType;
  xAxisKey?: string;
  yAxisKey?: string;
  data?: any[];
  colors?: string[];
}) {
  const chartColors = colors && colors.length > 0 ? colors : ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  if (!chartType || !xAxisKey || !yAxisKey) {
    return <p className="text-center text-muted-foreground">Select chart options to see a preview.</p>;
  }

  if (!data || data.length === 0) {
    return <p className="text-center text-muted-foreground">No data available for preview.</p>;
  }
  
  const numericData = data.filter(d => typeof d[yAxisKey] === 'number');
  if (numericData.length === 0) {
    return <p className="text-center text-muted-foreground">The selected Y-Axis field has no numeric data to display.</p>;
  }


  const ChartComponent = React.useMemo(() => {
    switch (chartType) {
        case 'bar':
        return (
            <ResponsiveContainer width="100%" height={300}>
            <RechartsBarChart data={numericData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xAxisKey} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    borderColor: "hsl(var(--border))",
                }}
                />
                <Legend />
                <Bar dataKey={yAxisKey} name={yAxisKey.charAt(0).toUpperCase() + yAxisKey.slice(1)}>
                {numericData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
                </Bar>
            </RechartsBarChart>
            </ResponsiveContainer>
        );
        case 'line':
        return (
            <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={numericData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xAxisKey} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    borderColor: "hsl(var(--border))",
                }}
                />
                <Legend />
                <Line type="monotone" dataKey={yAxisKey} stroke={chartColors[0]} activeDot={{ r: 8 }} name={yAxisKey.charAt(0).toUpperCase() + yAxisKey.slice(1)} />
            </RechartsLineChart>
            </ResponsiveContainer>
        );
        case 'pie':
        return (
            <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
                <Tooltip
                contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    borderColor: "hsl(var(--border))",
                }}
                />
                <Legend />
                <Pie
                data={numericData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill={chartColors[0]}
                dataKey={yAxisKey}
                nameKey={xAxisKey}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                {numericData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
                </Pie>
            </RechartsPieChart>
            </ResponsiveContainer>
        );
        default:
        return <p className="text-center text-muted-foreground">Select a chart type to see a preview.</p>;
    }
  }, [chartType, xAxisKey, yAxisKey, numericData, chartColors]);

  return (
    <React.Suspense fallback={<Skeleton className="w-full h-[300px]" />}>
        {ChartComponent}
    </React.Suspense>
  );
});


export function ReportStep4Charts({ onValidated, initialData, scadaData }: ReportStep4ChartsProps) {
  const form = useForm<ChartConfigValues>({
    resolver: zodResolver(chartConfigSchema),
    defaultValues: initialData || {
      includeCharts: false,
      chartType: "bar",
      chartTitle: "Chart Title",
      xAxisField: "parameter",
      yAxisField: "value",
      colorScheme: [],
    },
  });

  React.useEffect(() => {
    const subscription = form.watch((value) => {
      onValidated(value as ChartConfigValues);
    });
    // Trigger validation on mount
    onValidated(form.getValues());
    return () => subscription.unsubscribe();
  }, [form, onValidated]);
  
  const dataKeys = React.useMemo(() => {
    if (!scadaData || scadaData.length === 0) return { stringKeys: [], numberKeys: [] };
    const sample = scadaData[0];
    const stringKeys: string[] = [];
    const numberKeys: string[] = [];
    Object.keys(sample).forEach(key => {
        if (key === 'id' || key === 'included') return;
        if (typeof sample[key as keyof ScadaDataPoint] === 'string' || key === 'timestamp') {
            stringKeys.push(key);
        } else if (typeof sample[key as keyof ScadaDataPoint] === 'number') {
            numberKeys.push(key);
        }
    });
    // Ensure default fields are present if possible
    if (!stringKeys.includes("parameter")) stringKeys.push("parameter");
    if (!numberKeys.includes("value")) numberKeys.push("value");
    return { stringKeys, numberKeys };
  }, [scadaData]);


  const { includeCharts, chartType, xAxisField, yAxisField, colorScheme, chartTitle } = form.watch();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
      <Form {...form}>
        <form className="space-y-8">
          <FormField
            control={form.control}
            name="includeCharts"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Include Charts in Report</FormLabel>
                  <CardDescription>
                    Add visual representations of your data.
                  </CardDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {includeCharts && (
            <div className="space-y-6">
               <AiChartStylist 
                onStyleApply={(style) => {
                  form.setValue('chartType', style.chartType);
                  form.setValue('chartTitle', style.chartTitle);
                  form.setValue('colorScheme', style.colorScheme);
                }}
               />
              <FormField
                control={form.control}
                name="chartTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chart Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter a title for your chart" {...field} value={field.value || ''} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="chartType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chart Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select chart type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bar">Bar Chart</SelectItem>
                        <SelectItem value="line">Line Chart</SelectItem>
                        <SelectItem value="pie">Pie Chart</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="xAxisField"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>X-Axis Field (Categorical)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select X-axis field" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dataKeys.stringKeys.map(key => <SelectItem key={key} value={key}>{key}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="yAxisField"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Y-Axis Field (Numerical)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Y-axis field" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                         {dataKeys.numberKeys.map(key => <SelectItem key={key} value={key}>{key}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </form>
      </Form>
      <Card className="shadow-md">
        <CardHeader>
            <CardTitle>{chartTitle || 'Live Chart Preview'}</CardTitle>
            <CardDescription>This is a sample representation of your selected chart.</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center border rounded-md p-4 bg-muted/20">
          {includeCharts ? (
            <ChartPreview chartType={chartType as ChartType} xAxisKey={xAxisField} yAxisKey={yAxisField} data={scadaData ?? []} colors={colorScheme} />
          ) : (
            <p className="text-center text-muted-foreground">Charts are disabled.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

