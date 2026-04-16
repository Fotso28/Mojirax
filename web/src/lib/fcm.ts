import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { getApps } from 'firebase/app';
import { logger } from './logger';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? '';

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

if (typeof window !== 'undefined' && !VAPID_KEY) {
  logger.warn('[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set — push notifications will not work.');
}

/**
 * Initialize Firebase Messaging (client-side only).
 * Returns null if not supported (e.g., Safari iOS, SSR).
 */
async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance;

  const supported = await isSupported();
  if (!supported) return null;

  const app = getApps()[0];
  if (!app) return null;

  messagingInstance = getMessaging(app);
  return messagingInstance;
}

/**
 * Request notification permission and get FCM token.
 * Returns the token string, or null if denied/unsupported.
 */
export async function requestPushPermission(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') return null;
    if (!('Notification' in window)) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    // Register the FCM service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    return token || null;
  } catch (error) {
    logger.warn('FCM token request failed:', error);
    return null;
  }
}

/**
 * Listen for foreground messages (when app is focused).
 * Returns an unsubscribe function.
 */
export function onForegroundMessage(callback: (payload: { title: string; body: string; data?: Record<string, string> }) => void): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  getMessagingInstance().then((messaging) => {
    if (!messaging || cancelled) return;

    unsubscribe = onMessage(messaging, (payload) => {
      const notification = payload.notification;
      if (notification) {
        callback({
          title: notification.title || 'MojiraX',
          body: notification.body || '',
          data: payload.data,
        });
      }
    });
  });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}

/**
 * Parse user agent for device info to send with token.
 */
export function getDeviceInfo(): { device: string; browser: string } {
  const ua = navigator.userAgent;

  let device = 'DESKTOP';
  if (/mobile|android.*mobile|iphone|ipod/i.test(ua)) device = 'MOBILE';
  else if (/tablet|ipad|android(?!.*mobile)/i.test(ua)) device = 'TABLET';

  let browser = 'OTHER';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';

  return { device, browser };
}
