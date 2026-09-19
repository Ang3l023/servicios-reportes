import { registerPlugin } from '@capacitor/core';

export interface ShareReceiverPlugin {
  getPendingImages(): Promise<{ imagesJson: string }>;
  clearPendingImages(): Promise<void>;
}

export const ShareReceiver = registerPlugin<ShareReceiverPlugin>('ShareReceiver');
