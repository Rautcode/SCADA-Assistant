"use client";
import * as React from "react";
import { Wand2, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { useToast } from "@/hooks/use-toast";
import { suggestChartStyle, ChartStyleSuggestion } from "@/ai/flows/chart-stylist-flow";
import { useAuth } from "../auth/auth-provider";

interface AiChartStylistProps {
    onStyleApply: (style: ChartStyleSuggestion) => void;
}

export function AiChartStylist({ onStyleApply }: AiChartStylistProps) {
    const [prompt, setPrompt] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();
    const { user } = useAuth();

    const handleGenerateStyle = async () => {
        if (!prompt) {
            toast({
                title: "Prompt is empty",
                description: "Please describe the style you want for your chart.",
                variant: "destructive",
            });
            return;
        }
        if (!user) {
            toast({ title: "Not Authenticated", description: "You must be logged in.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            // The API key is no longer sent from the client.
            const suggestion = await suggestChartStyle({ promptText: prompt });
            onStyleApply(suggestion);
            toast({
                title: "Style Applied",
                description: "The AI has updated your chart's style.",
            });
        } catch (error) {
            console.error("AI style suggestion failed:", error);
            toast({
                title: "AI Stylist Failed",
                description: "Could not generate a new style. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Wand2 className="text-primary" />
                    AI Chart Stylist
                </CardTitle>
                <CardDescription>
                    Describe the look you want, and the AI will style the chart for you.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2">
                    <Input 
                        placeholder="e.g., 'a modern look with blue tones'"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerateStyle()}
                        disabled={isLoading}
                    />
                    <Button onClick={handleGenerateStyle} disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin"/> : <Wand2 />}
                        <span className="sr-only">Generate Style</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
