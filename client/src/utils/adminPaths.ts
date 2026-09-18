import { useLocation } from 'react-router-dom';

/** Staff ops paths, nested under /admin when inside the admin shell. */
export function useOpsPaths() {
  const { pathname } = useLocation();
  const inAdmin = pathname.startsWith('/admin');

  return {
    inAdmin,
    queue: inAdmin ? '/admin/queue' : '/orders/queue',
    deliveries: inAdmin ? '/admin/deliveries' : '/orders/deliveries',
    payments: inAdmin ? '/admin/payments' : '/payments',
    menuManage: inAdmin ? '/admin/menu' : '/menu/manage',
    reservations: inAdmin ? '/admin/reservations' : '/reservations',
    tables: inAdmin ? '/admin/tables' : '/tables',
  };
}

export function adminOpsPaths() {
  return {
    queue: '/admin/queue',
    deliveries: '/admin/deliveries',
    payments: '/admin/payments',
    menuManage: '/admin/menu',
    reservations: '/admin/reservations',
    tables: '/admin/tables',
  } as const;
}
