'use client';

import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, RotateCw, CircleAlert } from 'lucide-react';

export const IndexingStatusCell: React.FC<{
  fileId: string;
  status?: string;
  initialIsVectorized: boolean;
  fileType: string;
}> = ({ fileId, initialIsVectorized, status: initialStatus, fileType }) => {
  const [isVectorized, setIsVectorized] = useState(initialIsVectorized);
  const [status, setStatus] = useState(initialStatus);
  const [statusReason, setStatusReason] = useState('');

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);
  const maxPolls = 10;
  const interval = 10 * 1000; // 10 seconds
  const apiEndpoint = `/api/file/${fileId}`;

  // Terminal statuses that should stop polling
  const terminalStatuses = ['FAILED', 'PARTIALLY_INDEXED', 'IGNORED'];

  useEffect(() => {
    //exit use effect if isVectorized on initialization
    if (initialIsVectorized) {
      //clear any any polling if it exists
      if (pollingRef.current !== null) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const fetchData = async () => {
      try {
        pollCountRef.current += 1;

        const response = await fetch(apiEndpoint);
        if (!response.ok) {
          setIsVectorized(false);
        }
        const result = await response.json();
        setIsVectorized(result.data.isVectorized);
        setStatus(result.data.status);
        setStatusReason(result.data.statusReason);
      } catch (error) {
        console.error(
          `failed to fetch isVectorized data for file ${fileId}, `,
          error,
        );
        setIsVectorized(false);
      }
    };

    fetchData();

    // Stop polling if we have a terminal status, if already vectorized, or if we've reached max polls
    const shouldStopPolling =
      isVectorized ||
      (status && terminalStatuses.includes(status)) ||
      pollCountRef.current >= maxPolls;

    if (!shouldStopPolling && pollingRef.current === null) {
      const polling = setInterval(fetchData, interval);
      pollingRef.current = polling;
      return () => {
        clearInterval(polling);
        pollingRef.current = null;
      };
    }
    if (shouldStopPolling && pollingRef.current !== null) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [isVectorized, status]); //empty dependency = run once on mount, and clean up by running clearInterval on unmount

  if (status === 'NOT_FOUND') {
    setStatus('Processing');
  }

  // if status is terminal status then return a warning badge and the status
  if (status && terminalStatuses.includes(status)) {
    return (
      <div className="flex items-center">
        <Badge variant="destructive" className="flex items-center gap-2">
          <CircleAlert size={16} />
          {status
            .split('_')
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
            )
            .join(' ')}
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <Badge
        variant={isVectorized ? 'outline' : 'secondary'}
        className="flex items-center gap-2"
      >
        {isVectorized ? (
          <CheckCircle size={16} />
        ) : (
          <RotateCw size={16} className="animate-spin" />
        )}
        {isVectorized
          ? 'Indexed'
          : status
            ? status
                .split('_')
                .map(
                  (word) =>
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
                )
                .join(' ')
            : 'Processing'}
      </Badge>
    </div>
  );
};
