'use client'

import { useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DateTimePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  placeholder?: string
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Pick date & time',
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false)

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const newDate = value ? new Date(value) : new Date()
      newDate.setFullYear(selectedDate.getFullYear())
      newDate.setMonth(selectedDate.getMonth())
      newDate.setDate(selectedDate.getDate())
      onChange(newDate)
      setOpen(false)
    } else {
      onChange(undefined)
    }
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeStr = e.target.value
    if (!timeStr) return
    const [hours, minutes] = timeStr.split(':').map(Number)
    const newDate = value ? new Date(value) : new Date()
    newDate.setHours(hours)
    newDate.setMinutes(minutes)
    newDate.setSeconds(0)
    onChange(newDate)
  }

  const timeValue = value
    ? `${value.getHours().toString().padStart(2, '0')}:${value.getMinutes().toString().padStart(2, '0')}`
    : ''

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'flex-1 justify-between font-normal h-11 bg-muted/30 border-border hover:border-green-500/50',
              !value && 'text-muted-foreground'
            )}
          >
            {value ? value.toLocaleDateString() : placeholder}
            <ChevronDownIcon className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto overflow-hidden p-0 rounded-xl border-2 border-border/50 bg-[#1A1A1A] shadow-2xl backdrop-blur-xl"
          align="start"
        >
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleDateSelect}
            classNames={{
              head_row: 'hidden',
              weekdays: 'hidden',
              day_today: 'border border-green-500/60 text-green-400',
              day_selected: 'bg-green-500 text-white hover:bg-green-600 hover:text-white focus:bg-green-500 focus:text-white rounded-md',
            }}
          />
        </PopoverContent>
      </Popover>

      <Input
        type="time"
        value={timeValue}
        onChange={handleTimeChange}
        className="w-32 h-11 bg-muted/30 border-border focus:border-green-500 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
      />
    </div>
  )
}
