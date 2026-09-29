'use client';

import React, { useEffect, useState } from 'react';
import { LandingHome } from '@/components/landing-home';
import { fetchJson } from '@/lib/fetch-json';

export default function HomePage() {
  const [authUser, setAuthUser] = useState<{ id: number; email: string; name: string; role: string } | null>(null);

  useEffect(() => {
    fetchJson<{ user: { id: number; email: string; name: string; role: string } | null }>('/api/auth/me')
      .then((data) => setAuthUser(data.user || null))
      .catch(() => setAuthUser(null));
  }, []);

  return <LandingHome authUser={authUser} />;
}
