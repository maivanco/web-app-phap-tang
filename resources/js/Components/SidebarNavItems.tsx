import { Link, usePage } from '@inertiajs/react';
import { SidebarNavItemInterface, SidebarNavItem } from './SidebarNavItem';


export default function SidebarNavItems({ navItems }: { navItems: SidebarNavItemInterface[] }) {
    return (
    <>
      <ul className="sidebar-menu">
        {navItems && navItems.length > 0 && navItems.map((navItem) => {
          return <SidebarNavItem key={navItem.href} navItem={navItem} />
        })}
      </ul>
    </>
  );
}
