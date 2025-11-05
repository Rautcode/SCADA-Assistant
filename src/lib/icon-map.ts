
import { LucideProps, FilePlus, Users, BarChart3, AlertTriangle, Mail, Activity, FileWarning, CheckCircle2, UserCircle2, FileText, CheckSquare, Zap, ClipboardList } from "lucide-react";
import * as React from "react";

export const iconMap: { [key: string]: React.ElementType<LucideProps> } = {
    FilePlus,
    Users,
    BarChart3,
    AlertTriangle,
    Mail,
    Activity,
    FileWarning,
    CheckCircle2,
    UserCircle2,
    FileText
};

export const categoryIcons: { [key: string]: React.ElementType } = {
  'Production': BarChart3,
  'Maintenance': AlertTriangle,
  'Quality': CheckSquare,
  'Energy': Zap,
  'Operations': ClipboardList,
  'default': FileText,
}
