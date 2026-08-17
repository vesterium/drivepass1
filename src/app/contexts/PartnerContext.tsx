/**
 * PartnerContext — the signed-in partner admin's mojka profile.
 *
 * Mirrors SubscriptionContext's shape: reads the session from AuthContext, fetches its own
 * data (GET /partner/me) once a partner-kind session exists. PartnerDashboard, Scanner,
 * PayoutReports and Settings all read from here instead of the old PARTNER_ID = user?.id /
 * user?.user_metadata guesswork -- there is no such metadata anymore, identity is a real
 * PartnerAdmin row resolved server-side.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { apiHeaders, apiUrl } from '../utils/apiClient';

export interface PartnerProfile {
  partnerId: string;
  partnerName: string;
  address: string;
  commissionPct: number;
  adminId: string;
  adminName: string;
  /** Read-only here by design -- only the owner can change where a partner's payout money
   * goes (via the bot), so a compromised partner account can't redirect it. */
  payoutCardNumber: string;
  payoutCardHolderName: string;
}

interface PartnerContextValue {
  profile: PartnerProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const PartnerContext = createContext<PartnerContextValue>({
  profile: null,
  loading: false,
  refresh: async () => {},
});

export function PartnerProvider({ children }: { children: ReactNode }) {
  const { accessToken, partnerAdmin } = useAuth();
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/partner/me'), { headers: apiHeaders(accessToken) });
      if (res.ok) setProfile(await res.json());
    } catch {
      // Offline -- keep whatever profile we already had rather than clearing it.
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (partnerAdmin) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerAdmin?.id]);

  return <PartnerContext.Provider value={{ profile, loading, refresh }}>{children}</PartnerContext.Provider>;
}

export function usePartner(): PartnerContextValue {
  return useContext(PartnerContext);
}
