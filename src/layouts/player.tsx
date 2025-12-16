import { config } from '@/config';
import { cn } from '@/utils/cn';
import * as React from 'react';

interface LayoutProps {
	children?: React.ReactNode;
	className?: string;
}

const PlayerRoot: React.FC<LayoutProps> = ({ children, className }) => (
	<main
		className={cn(
			'bg-forest-100 grid min-h-dvh grid-rows-[auto_1fr_auto]',
			className
		)}
	>
		{children}
	</main>
);

const PlayerHeader: React.FC<LayoutProps> = ({ children, className }) => (
	<header
		className={cn(
			'bg-bark-800 text-parchment sticky top-0 z-10 shadow-lg py-4',
			className
		)}
	>
		<div className="container mx-auto flex flex-wrap items-center justify-between px-4">
			<div className="font-bold">{config.title}</div>

			{children}
		</div>
	</header>
);

const PlayerMain: React.FC<LayoutProps> = ({ children, className }) => (
	<main
		className={cn(
			'container mx-auto flex items-center justify-center p-4 lg:p-6',
			className
		)}
	>
		{children}
	</main>
);

const PlayerFooter: React.FC<LayoutProps> = ({ children, className }) => (
	<footer
		className={cn(
			'bg-bark-800 text-parchment sticky bottom-0 z-10 p-4 shadow-lg',
			className
		)}
	>
		{children}
	</footer>
);

/**
 * Layout components for the 'player' mode
 */
export const PlayerLayout = {
	Root: PlayerRoot,
	Header: PlayerHeader,
	Main: PlayerMain,
	Footer: PlayerFooter
};
