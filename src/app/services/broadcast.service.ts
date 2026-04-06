import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Real-time sync via BroadcastChannel API.
 *
 * ✅  Works: Multiple tabs / windows in the SAME browser, and across
 *            Chrome ↔ Edge ↔ Firefox on the SAME machine.
 * ❌  Does NOT work: Different physical devices / machines.
 *     For cross-device sync you would need a WebSocket backend.
 *
 * Messages are delivered in < 5ms — effectively instant for local use.
 */
@Injectable({ providedIn: 'root' })
export class BroadcastService {

  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('cricket-auction-channel');
    }
  }

  /** Broadcast an event to all OTHER tabs/windows */
  publish(event: string, data: Record<string, unknown> = {}): void {
    this.channel?.postMessage({ event, data, timestamp: Date.now() });
  }

  /** Observable that emits whenever THIS tab receives a message from another tab */
  listen(): Observable<{ event: string; data: Record<string, unknown>; timestamp: number }> {
    return new Observable(observer => {
      if (!this.channel) return;
      const handler = (e: MessageEvent) => observer.next(e.data);
      this.channel.addEventListener('message', handler);
      return () => this.channel?.removeEventListener('message', handler);
    });
  }

  /** Close the channel — call in ngOnDestroy of long-lived components */
  destroy(): void {
    this.channel?.close();
    this.channel = null;
  }
}
