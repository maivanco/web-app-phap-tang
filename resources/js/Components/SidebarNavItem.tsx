import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';

export interface SidebarNavItemInterface {
    href?: string;
    label: string;
    icon?: React.ReactNode;
    iconClass?: string;
    children?: SidebarNavItemInterface[];
}

export function isRouteActive(itemHref: string | undefined, currentUrl: string, isExact: boolean = false): boolean {
    if (!itemHref) return false;
    const currentPath = currentUrl.split('?')[0].replace(/\/+$/, '') || '/';
    const targetPath = itemHref.split('?')[0].replace(/\/+$/, '') || '/';

    if (currentPath === targetPath) {
        return true;
    }

    if (isExact) {
        return false;
    }

    if (currentPath.startsWith(targetPath + '/')) {
        // Do not match list parent path if current path is a distinct sibling action like create
        if (currentPath === `${targetPath}/create`) {
            return false;
        }
        return true;
    }

    return false;
}

export function hasActiveChild(items?: SidebarNavItemInterface[], currentUrl?: string): boolean {
    if (!items || !currentUrl) return false;
    return items.some((item) => {
        if (isRouteActive(item.href, currentUrl, false)) return true;
        if (item.children && hasActiveChild(item.children, currentUrl)) return true;
        return false;
    });
}

export function SidebarNavItem({
    navItem,
    isSubmenu = false,
}: {
    navItem: SidebarNavItemInterface;
    isSubmenu?: boolean;
}) {
    const { url } = usePage();
    const hasChildren = Boolean(navItem.children && navItem.children.length > 0);
    const childIsActive = hasChildren && hasActiveChild(navItem.children, url);
    const isActive = isRouteActive(navItem.href, url, hasChildren);

    const [isOpen, setIsOpen] = useState(childIsActive);

    // Auto expand accordion if child becomes active
    useEffect(() => {
        if (childIsActive) {
            setIsOpen(true);
        }
    }, [childIsActive]);

    const handleToggle = (e: React.MouseEvent) => {
        if (hasChildren) {
            e.preventDefault();
            setIsOpen((prev) => !prev);
        }
    };

    let itemClasses = 'flex items-center transition-all duration-150 select-none ';

    if (isSubmenu) {
        if (isActive) {
            itemClasses += 'px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border-l-2 border-amber-400 -ml-[13px] pl-2.5';
        } else {
            itemClasses += 'px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800/60';
        }
    } else {
        if (hasChildren) {
            if (childIsActive || isActive) {
                itemClasses += 'px-3.5 py-2.5 rounded-lg text-sm font-medium bg-slate-800/80 text-amber-300';
            } else {
                itemClasses += 'px-3.5 py-2.5 rounded-lg text-sm font-normal text-slate-300 hover:text-white hover:bg-slate-800/50';
            }
        } else {
            if (isActive) {
                itemClasses += 'px-3.5 py-2.5 rounded-lg text-sm font-medium bg-amber-500/15 text-amber-300 border-l-2 border-amber-400';
            } else {
                itemClasses += 'px-3.5 py-2.5 rounded-lg text-sm font-normal text-slate-300 hover:text-white hover:bg-slate-800/50';
            }
        }
    }

    const content = (
        <>
            {navItem.icon && (
                <span className={`${isSubmenu ? 'w-4 text-xs mr-2' : 'w-5 text-base mr-3'} text-center shrink-0`}>
                    {navItem.icon}
                </span>
            )}
            {navItem.iconClass && <i className={`${navItem.iconClass} mr-3`} />}
            <span className="truncate">{navItem.label}</span>
            {hasChildren && (
                <svg
                    className={`w-3.5 h-3.5 ml-auto shrink-0 transform transition-transform duration-200 ${
                        isOpen ? 'rotate-90 text-amber-400' : 'text-slate-500'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
            )}
        </>
    );

    return (
        <li className={isSubmenu ? 'my-0.5' : 'my-1'}>
            {hasChildren ? (
                <button
                    type="button"
                    onClick={handleToggle}
                    className={`w-full text-left cursor-pointer ${itemClasses}`}
                >
                    {content}
                </button>
            ) : navItem.href ? (
                <Link href={navItem.href} className={`block ${itemClasses}`}>
                    {content}
                </Link>
            ) : (
                <div className={itemClasses}>{content}</div>
            )}

            {hasChildren && isOpen && (
                <ul className="mt-1 ml-4 pl-3 border-l border-slate-800 space-y-0.5">
                    {navItem.children!.map((child) => (
                        <SidebarNavItem
                            key={child.href || child.label}
                            navItem={child}
                            isSubmenu={true}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}

