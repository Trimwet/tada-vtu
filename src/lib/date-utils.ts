// Date utility functions to handle database timestamps properly

/**
 * Safely parse a date string from the database
 * Handles various timestamp formats including PostgreSQL timestamps
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  
  try {
    // Handle PostgreSQL timestamp format: "2025-12-03 11:33:35.886804+00"
    // Convert to ISO format if needed
    let isoString = dateString;
    
    // If it's a PostgreSQL timestamp, convert to ISO format
    if (dateString.includes(' ') && !dateString.includes('T')) {
      isoString = dateString.replace(' ', 'T');
    }
    
    // Ensure timezone info is present
    if (!isoString.includes('+') && !isoString.includes('Z')) {
      isoString += 'Z';
    }
    
    const date = new Date(isoString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return null;
    }
    
    return date;
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return null;
  }
}

/**
 * Format a date for display
 */
export function formatDate(
  dateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = parseDate(dateString);
  if (!date) return 'Invalid Date';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  try {
    return date.toLocaleDateString('en-US', defaultOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

/**
 * Format a date with time
 */
export function formatDateTime(
  dateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = parseDate(dateString);
  if (!date) return 'Invalid Date';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  try {
    return date.toLocaleString('en-US', defaultOptions);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return 'Invalid Date';
  }
}

/**
 * Get relative time (e.g., "2 days ago", "just now")
 */
export function getRelativeTime(dateString: string | null | undefined): string {
  const date = parseDate(dateString);
  if (!date) return 'Invalid Date';
  
  try {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
  } catch (error) {
    console.error('Error calculating relative time:', error);
    return 'Invalid Date';
  }
}

/**
 * Format date for "Member Since" display
 */
export function formatMemberSince(dateString: string | null | undefined): string {
  const date = parseDate(dateString);
  if (!date) return 'Invalid Date';
  
  try {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  } catch (error) {
    console.error('Error formatting member since date:', error);
    return 'Invalid Date';
  }
}

/**
 * Check if a date string is valid
 */
export function isValidDate(dateString: string | null | undefined): boolean {
  const date = parseDate(dateString);
  return date !== null && !isNaN(date.getTime());
}

/**
 * Convert database timestamp to ISO string
 */
export function toISOString(dateString: string | null | undefined): string | null {
  const date = parseDate(dateString);
  return date ? date.toISOString() : null;
}