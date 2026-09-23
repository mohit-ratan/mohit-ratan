import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const paths = {
  today: 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4M5.6 18.4 7 17m10-10 1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  feed: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  goals: 'M5 4h14v17l-7-4-7 4ZM9 9l2 2 4-4',
  profile: 'M20 21v-2a7 7 0 0 0-14 0v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
};
export default function MobileNav() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user || ['/login', '/register', '/verify'].includes(pathname)) return null;
  const items = [{ id: 'today', label: 'Today', to: '/today' }, { id: 'feed', label: 'Feed', to: '/' }, { id: 'goals', label: 'My goals', to: `/profile/${user.id}/achievements` }, { id: 'profile', label: 'Profile', to: `/profile/${user.id}` }];
  return <nav className="mobile-nav" aria-label="Main navigation">{items.map((item) => <NavLink end to={item.to} key={item.id}><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[item.id]} /></svg><span>{item.label}</span></NavLink>)}</nav>;
}
