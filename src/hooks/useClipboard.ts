import { useState } from 'react';

export function useClipboard() {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async (text: string, label: string = 'Text'): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);

      // Reset after 2 seconds
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);

      return true;
    } catch (error) {
      console.error(`Failed to copy ${label}:`, error);
      setIsCopied(false);
      return false;
    }
  };

  return { copyToClipboard, isCopied };
}
