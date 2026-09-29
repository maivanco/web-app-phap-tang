import { SidebarNavItemInterface, SidebarNavItem } from './SidebarNavItem';

export default function SidebarNavItems({
    navItems,
    isSubmenu = false,
}: {
    navItems: SidebarNavItemInterface[];
    isSubmenu?: boolean;
}) {
    return (
        <ul className={isSubmenu ? "space-y-0.5" : "sidebar-menu px-2 space-y-1"}>
            {navItems && navItems.length > 0 && navItems.map((navItem) => (
                <SidebarNavItem
                    key={navItem.href || navItem.label}
                    navItem={navItem}
                    isSubmenu={isSubmenu}
                />
            ))}
        </ul>
    );
}

