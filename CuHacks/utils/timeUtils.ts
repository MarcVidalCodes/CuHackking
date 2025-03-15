export function formatTime(seconds: number | null): string {
  // Handle invalid input cases
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return "00:00";
  }
  
  // Ensure seconds is a positive integer
  const totalSeconds = Math.max(0, Math.floor(seconds));
  
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
} 