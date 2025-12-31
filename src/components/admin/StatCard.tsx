import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

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
    className?: string;
    color?: 'default' | 'green' | 'blue' | 'purple' | 'orange' | 'red';
}

export function StatCard({
    title,
    value,
    icon,
    trend,
    description,
    className,
    color = 'default',
}: StatCardProps) {
    const getGradient = () => {
        switch (color) {
            case 'green':
                return 'from-green-600/20 to-emerald-700/10 border-green-500/30';
            case 'blue':
                return 'from-blue-600/20 to-blue-700/10 border-blue-500/30';
            case 'purple':
                return 'from-purple-600/20 to-violet-700/10 border-purple-500/30';
            case 'orange':
                return 'from-orange-600/20 to-amber-700/10 border-orange-500/30';
            case 'red':
                return 'from-red-600/20 to-rose-700/10 border-red-500/30';
            default:
                return 'bg-gray-800/50 border-gray-700/50';
        }
    };

    return (
        <Card className={cn('border backdrop-blur-sm bg-gradient-to-br', getGradient(), className)}>
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <p className="text-gray-400 text-sm font-medium">{title}</p>
                        <div className="text-2xl font-bold text-white tracking-tight">
                            {value}
                        </div>
                    </div>
                    {icon && (
                        <div className={cn(
                            "p-2 rounded-lg bg-gray-700/30 text-white shadow-sm",
                            color === 'green' && "text-green-400 bg-green-500/10",
                            color === 'blue' && "text-blue-400 bg-blue-500/10",
                            color === 'purple' && "text-purple-400 bg-purple-500/10",
                            color === 'orange' && "text-orange-400 bg-orange-500/10",
                            color === 'red' && "text-red-400 bg-red-500/10",
                        )}>
                            {icon}
                        </div>
                    )}
                </div>

                {(trend || description) && (
                    <div className="mt-4 flex items-center gap-2 text-xs">
                        {trend && (
                            <div className={cn(
                                "flex items-center gap-1 font-medium px-1.5 py-0.5 rounded-full bg-opacity-10",
                                trend.direction === 'up' && "text-green-400 bg-green-500",
                                trend.direction === 'down' && "text-red-400 bg-red-500",
                                trend.direction === 'neutral' && "text-gray-400 bg-gray-500",
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
