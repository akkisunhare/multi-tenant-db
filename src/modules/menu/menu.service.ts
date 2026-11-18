import { getCache, setCache, deleteCache } from '../../config/redis';

export interface IMenuItem {
  id: string;
  title: string;
  path: string;
  icon: string;
}

export const DEFAULT_MENU: IMenuItem[] = [
  { id: 'dashboard', title: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { id: 'users', title: 'Users', path: '/users', icon: 'people' },
  { id: 'reports', title: 'Reports', path: '/reports', icon: 'bar_chart' },
  { id: 'settings', title: 'Settings', path: '/settings', icon: 'settings' },
];

export class MenuService {
  /**
   * Retrieves the menu for a tenant, checking Redis cache first.
   * If cached, returns cached data; otherwise caches for 600 seconds.
   */
  static async getMenu(masterId: string): Promise<{ menu: IMenuItem[]; source: 'cache' | 'generated' }> {
    const cacheKey = `menu:${masterId}`;

    // Attempt retrieval from Redis
    const cached = await getCache(cacheKey);
    if (cached) {
      try {
        const parsedMenu = JSON.parse(cached);
        return { menu: parsedMenu, source: 'cache' };
      } catch (e) {
        // Fall through to regeneration if corrupted
      }
    }

    // Generate menu for this tenant
    const menu = [...DEFAULT_MENU];

    // Cache in Redis for 600 seconds (10 minutes)
    await setCache(cacheKey, JSON.stringify(menu), 600);

    return { menu, source: 'generated' };
  }

  /**
   * Invalidates tenant-specific menu cache.
   */
  static async invalidateMenuCache(masterId: string): Promise<boolean> {
    const cacheKey = `menu:${masterId}`;
    return deleteCache(cacheKey);
  }
}
