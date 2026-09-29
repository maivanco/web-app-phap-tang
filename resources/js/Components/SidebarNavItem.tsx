import { Link, usePage } from '@inertiajs/react';
import SidebarNavItems from './SidebarNavItems';

export interface SidebarNavItemInterface {
    href: string;
    label: string;
    iconClass?: string;
    children?: SidebarNavItemInterface[];
}
export function SidebarNavItem({ navItem }: { navItem: SidebarNavItemInterface }) {
    const { url } = usePage();

    const activeClass = url.startsWith(navItem.href)
        ? "bg-color-primary"
        : "";

    return (
    <li key={navItem.href}>
        <Link href={navItem.href} className={`block p-3 ${activeClass}`}>
        {navItem.iconClass && <i className={`${navItem.iconClass} mr-3`} />}
        {navItem.label}
        </Link>

        {navItem.children && navItem.children.length > 0 && (
        <ul className="ml-4 border-l pl-2 text-sm">
            <SidebarNavItems navItems={navItem.children} />
        </ul>
        )}
    </li>
    );
}
