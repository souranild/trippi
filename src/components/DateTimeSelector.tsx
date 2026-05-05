'use client'

import React from 'react'
import { FormLabel, FormGrid, FormSelect } from '@/components/FormLayout'
import TimePicker from '@/components/TimePicker'

interface DateTimeSelectorProps {
  label?: string
  dayValue: number
  timeValue: string
  dayOptions: Array<{ value: number; label: string }>
  onDayChange: (day: number) => void
  onTimeChange: (time: string) => void
  disabled?: boolean
  icon?: string
  labelVariant?: 'primary' | 'secondary' | 'tertiary' | 'default'
  timeFormat?: '12h' | '24h'
}

export function DateTimeSelector({
  label,
  dayValue,
  timeValue,
  dayOptions,
  onDayChange,
  onTimeChange,
  disabled = false,
  icon,
  labelVariant = 'primary',
  timeFormat = '12h'
}: DateTimeSelectorProps) {
  return (
    <div className="space-y-3">
      {label && (
        <FormLabel variant={labelVariant} className={icon ? "flex items-center gap-1.5" : ""}>
          {icon && <span className="material-symbols-outlined text-base">{icon}</span>}
          {label}
        </FormLabel>
      )}
      
      <FormGrid columns={2}>
        <FormSelect
          label="Day"
          labelVariant="default"
          disabled={disabled}
          value={dayValue}
          options={dayOptions}
          onChange={e => onDayChange(parseInt(e.target.value))}
        />
        <div className="space-y-1">
          <FormLabel variant="default">Time</FormLabel>
          {disabled ? (
            <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white/50 text-sm h-[42px] flex items-center">
              {timeValue || '--:--'}
            </div>
          ) : (
            <TimePicker 
              value={timeValue} 
              onChange={onTimeChange}
              className="w-full"
              timeFormat={timeFormat}
            />
          )}
        </div>
      </FormGrid>
    </div>
  )
}
