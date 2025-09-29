
import type { SVGProps } from 'react';
import Link from 'next/link';

// A simple placeholder logo. Replace with actual SVG or Image component.
const PlaceholderLogoIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

interface AppLogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
  href?: string;
}

export function AppLogo({ className, iconSize = 28, textSize = "text-xl", href = "/dashboard" }: AppLogoProps) {
  return (
    <Link href={href} className={`flex items-center gap-2 ${className}`}>
      <PlaceholderLogoIcon className="text-primary" style={{ height: iconSize, width: iconSize }} data-ai-hint="geometric abstract" />
      <span className={`font-semibold ${textSize} text-foreground`}>
        SCADA Assistant
      </span>
    </Link>
  );
}
