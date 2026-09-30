import { admin_url } from "@/utils/helper";
import SidebarNavItems from "@/Components/SidebarNavItems";
import { SidebarNavItemInterface } from "@/Components/SidebarNavItem";
import { usePage } from "@inertiajs/react";
import { PageProps } from "@/types";

export default function Sidebar() {
    const { auth } = usePage<PageProps>().props;
    const isManagerOrAdmin = auth?.user?.role === 'admin' || auth?.user?.role === 'manager';

    const navLinks: SidebarNavItemInterface[] = [
        {
            label: 'Tổng quan & Báo cáo',
            icon: '📊',
            href: admin_url('cashflow/dashboard'),
        },
        {
            label: 'Quản lý Đơn hàng',
            icon: '🛍️',
            children: [
                {
                    label: 'Danh sách đơn hàng',
                    icon: '📋',
                    href: admin_url('cashflow/orders'),
                },
                {
                    label: 'Nhập đơn hàng mới',
                    icon: '➕',
                    href: admin_url('cashflow/orders/create'),
                },
            ],
        },
        {
            label: 'Quản lý Chi tiêu',
            icon: '💸',
            children: [
                {
                    label: 'Sổ chi tiêu',
                    icon: '📑',
                    href: admin_url('cashflow/expenses'),
                },
                {
                    label: 'Nhập chi tiêu mới',
                    icon: '➕',
                    href: admin_url('cashflow/expenses/create'),
                },
            ],
        },
        {
            label: 'Sổ quỹ & Đối soát',
            icon: '🏦',
            children: [
                {
                    label: 'Quẹt thẻ & Chờ về',
                    icon: '💳',
                    href: admin_url('cashflow/card-settlements'),
                },
                {
                    label: 'Chuyển tiền nội bộ',
                    icon: '🔄',
                    href: admin_url('cashflow/transfers'),
                },
            ],
        },
        ...(isManagerOrAdmin
            ? [
                  {
                      label: 'Quản lý Người dùng',
                      icon: '👥',
                      href: admin_url('cashflow/users'),
                  },
              ]
            : []),
        {
            label: 'Thông tin cá nhân',
            icon: '👤',
            href: admin_url('profile/edit'),
        },
    ];

    return (
        <aside id="sidebar-left" className="fixed z-100 top-0 left-0 h-full w-[250px] bg-slate-900 text-white menu text-sm shadow-xl flex flex-col justify-between">
            <div className="flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-slate-800 shrink-0">
                    <span className="font-bold text-lg tracking-wider text-amber-400">PHÁP TẠNG</span>
                    <p className="text-xs text-slate-400 mt-0.5">Quản lý Thu & Chi</p>
                </div>
                <div className="flex-1 overflow-y-auto py-3">
                    <SidebarNavItems navItems={navLinks} />
                </div>
                <div className="p-3 border-t border-slate-800 text-xs text-slate-500 text-center shrink-0">
                    Phiên bản v1.0.0
                </div>
            </div>
        </aside>
    );
}