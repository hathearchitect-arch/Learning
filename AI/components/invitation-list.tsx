'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { organization } from '@/lib/auth-client';

type Invitation = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  invitedByName: string;
  invitedById: string;
  invitedByEmail: string;
  role: string;
  status: string;
  expiresAt: string | Date;
};

interface InvitationListProps {
  invitations: Invitation[];
}

export function InvitationList({ invitations }: InvitationListProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedInvitation, setSelectedInvitation] =
    useState<Invitation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleInvitationClick = (invitation: Invitation) => {
    setSelectedInvitation(invitation);
    setIsDialogOpen(true);
  };

  const handleInvitationAction = async (action: 'accept' | 'reject') => {
    if (!selectedInvitation) return;
    setIsProcessing(true);

    try {
      if (action === 'accept') {
        const { data, error } = await organization.acceptInvitation({
          invitationId: selectedInvitation?.id, // required
        });
      }

      if (action === 'reject') {
        const { data, error } = await organization.rejectInvitation({
          invitationId: selectedInvitation?.id, // required
        });
      }

      router.refresh(); // Refresh the page to update the invitation list
      toast.success(
        action === 'accept'
          ? 'Invitation accepted successfully'
          : 'Invitation rejected successfully',
      );

      setIsDialogOpen(false);
      setSelectedInvitation(null);
    } catch (error) {
      console.error(`Error ${action}ing invitation:`, error);
      toast.error(`Failed to ${action} invitation`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!invitations || invitations.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>
            You have pending invitations to join organizations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {invitations.map((invitation) => (
            <button
              key={invitation.id}
              type="button"
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors w-full text-left"
              onClick={() => handleInvitationClick(invitation)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Image
                  src={`https://avatar.vercel.sh/${invitation.organizationSlug}.svg`}
                  alt={`Organization avatar`}
                  width={32}
                  height={32}
                  className="rounded-full flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {invitation.organizationName || invitation.organizationId}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    Role: {invitation.role}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="ml-2">
                {invitation.status}
              </Badge>
            </button>
          ))}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Organization Invitation</DialogTitle>
            <DialogDescription>
              You&apos;ve been invited by{' '}
              <span className="font-bold">
                {selectedInvitation?.invitedByName}
              </span>{' '}
              to join{' '}
              <span className="font-bold">
                {selectedInvitation?.organizationName}
              </span>{' '}
              as a <span className="font-bold">{selectedInvitation?.role}</span>
              .
            </DialogDescription>
          </DialogHeader>

          {selectedInvitation && (
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Image
                src={`https://avatar.vercel.sh/${selectedInvitation.organizationSlug}.svg`}
                alt={`Organization avatar`}
                width={48}
                height={48}
                className="rounded-full flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-medium truncate">
                  {selectedInvitation.organizationName ||
                    selectedInvitation.organizationId}
                </h4>
                <p className="text-sm text-muted-foreground truncate">
                  Role: {selectedInvitation.role}
                </p>
                <p className="text-sm text-muted-foreground">
                  Expires:{' '}
                  {typeof selectedInvitation.expiresAt === 'string'
                    ? new Date(
                        selectedInvitation.expiresAt,
                      ).toLocaleDateString()
                    : selectedInvitation.expiresAt.toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => handleInvitationAction('reject')}
              disabled={isProcessing}
            >
              Reject
            </Button>
            <Button
              onClick={() => handleInvitationAction('accept')}
              disabled={isProcessing}
            >
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
