import { hc } from 'hono/client';
import type { AppType } from './server';
import { createHonoQueryProxy } from '../src';

export const honoClient = hc<AppType>(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
  headers: () => {
    const activeOrganizationId = localStorage.getItem('activeOrganizationId');
    const deviceId = localStorage.getItem('scanpaigns:identifier');
    
    // Don't send device ID on auth page to prevent anonymous user creation
    const isAuthPage = window.location.pathname === '/auth';
    
    return {
      ...(activeOrganizationId && { 'x-organization-id': activeOrganizationId }),
      ...(deviceId && !isAuthPage && { 'x-device-id': deviceId }),
    };
  },
  init: {
    credentials: 'include',
  },
});

export const client = createHonoQueryProxy<AppType>(honoClient);

export * from './hono-types';
