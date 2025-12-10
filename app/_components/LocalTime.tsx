"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface LocalTimeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The date value to format (ISO string, timestamp, or Date object) */
  date: string | number | Date;
  /** The format string for date-fns */
  formatString: string;
  /** A placeholder to show during server render and initial client render */
  placeholder?: string;
}

/**
 * Renders a date/time formatted in the user's local timezone.
 * This component renders a placeholder on the server and formats the date on the client
 * to prevent hydration mismatches in server-rendered applications.
 */
export default function LocalTime({ date, formatString, placeholder = '...', ...props }: LocalTimeProps) {
  const [formattedDate, setFormattedDate] = useState<string>(placeholder);

  useEffect(() => {
    setFormattedDate(format(new Date(date), formatString));
  }, [date, formatString]);

  return <span {...props}>{formattedDate}</span>;
}
