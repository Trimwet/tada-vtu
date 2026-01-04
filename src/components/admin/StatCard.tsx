'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus, Info } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { ReactNode, useState } from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon?: ReactNode;
    trend?: {
        value: number;
        label: string;
        direction: 'up' | 'down' | 'neutral';
    };
    description?: string;
    tooltip?: string;
    className?: string;
}

export function StatCard({
    title,
    value,
    icon,
    trend,
    description,
    tooltip,
    className,
}: StatCardProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <Card className={cn(
            'border backdrop-blur-sm bg-gray-800/60 border-gray-700/50 hover:border-green-500/30 transition-colors',
            className
        )}>
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="text-gray-400 text-sm font-medium">{title}</p>
                            {tooltip && (
                                <div className="relative">
                                    <Info
                                        weight="fill"
                                        className="w-4 h-4 text-gray-500 hover:text-green-400 cursor-help transition-colors"
                                        onMouseEnter={() => setShowTooltip(true)}
                                        onMouseLeave={() => setShowTooltip(false)}
                                    />
                                    {showTooltip && (
                                        <div className="absolute z-50 left-0 top-6 w-56 p-3 bg-gray-900 border border-gray-700 rounded-lg shadow-xl text-xs text-gray-300 leading-relaxed">
                                            {tooltip}
                                            <div className="absolute -top-1 left-2 w-2 h-2 bg-gray-900 border-l border-t border-gray-700 rotate-45" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="text-2xl font-bold text-white tracking-tight">
                            {value}
                        </div>
                    </div>
                    {icon && (
                        <div className="p-2 rounded-lg bg-green-500/10 text-green-400 shadow-sm">
                            {icon}
                        </div>
                    )}
                </div>

                {(trend || description) && (
                    <div className="mt-4 flex items-center gap-2 text-xs">
                        {trend && (
                            <div className={cn(
                                "flex items-center gap-1 font-medium px-1.5 py-0.5 rounded-full",
                                trend.direction === 'up' && "text-green-400 bg-green-500/10",
                                trend.direction === 'down' && "text-red-400 bg-red-500/10",
                                trend.direction === 'neutral' && "text-gray-400 bg-gray-500/10",
                            )}>
                                {trend.direction === 'up' && <ArrowUp weight="bold" className="w-3 h-3" />}
                                {trend.direction === 'down' && <ArrowDown weight="bold" className="w-3 h-3" />}
                                {trend.direction === 'neutral' && <Minus weight="bold" className="w-3 h-3" />}
                                <span>{Math.abs(trend.value)}%</span>
                            </div>
                        )}
                        {description && (
                            <span className="text-gray-500 truncate max-w-[12rem]">{description}</span>
                        )}
                        {trend?.label && !description && (
                            <span className="text-gray-500">{trend.label}</span>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
