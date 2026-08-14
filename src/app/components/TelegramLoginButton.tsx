/**
 * TelegramLoginButton — renders Telegram's official Login Widget and hands the signed
 * payload it returns up to the caller (which posts it to POST /auth/telegram).
 *
 * The bot's domain must be registered via @BotFather → /setdomain before this will render
 * or authenticate anywhere other than the domain Telegram has on file for the bot.
 */

import { useEffect, useRef } from 'react';

export interface TelegramAuthPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthPayload) => void;
  }
}

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string;

export function TelegramLoginButton({ onAuth }: { onAuth: (payload: TelegramAuthPayload) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.onTelegramAuth = onAuth;

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', BOT_USERNAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    containerRef.current?.appendChild(script);

    return () => {
      window.onTelegramAuth = undefined;
      containerRef.current?.replaceChildren();
    };
  }, [onAuth]);

  return <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center', minHeight: 40 }} />;
}
