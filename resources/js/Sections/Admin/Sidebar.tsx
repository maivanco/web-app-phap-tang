import { admin_url } from "@/utils/helper";
import SidebarNavItems from "@/Components/SidebarNavItems";

export default function Sidebar() {
    const navLinks = [
        {
            label: '📊 Tổng quan & Báo cáo',
            href: admin_url('cashflow/dashboard'),
        },
        {
            label: '🛍️ Nhập đơn hàng mới',
            href: admin_url('cashflow/orders/create'),
        },
        {
            label: '📋 Danh sách đơn hàng',
            href: admin_url('cashflow/orders'),
        },
        {
            label: '💸 Nhập chi tiêu mới',
            href: admin_url('cashflow/expenses/create'),
        },
        {
            label: '📑 Sổ chi tiêu',
            href: admin_url('cashflow/expenses'),
        },
        {
            label: '💳 Quẹt thẻ & Chờ về',
            href: admin_url('cashflow/card-settlements'),
        },
        {
            label: '🔄 Chuyển tiền nội bộ',
            href: admin_url('cashflow/transfers'),
        },
        {
            label: '👤 Thông tin cá nhân',
            href: admin_url('profile/edit'),
        },
    ];

    return (
        <aside id="sidebar-left" className="fixed z-100 top-0 left-0 h-full w-[250px] bg-slate-900 text-white menu text-sm shadow-xl flex flex-col justify-between">
            <div>
                <div className="p-4 border-b border-slate-800">
                    <span className="font-bold text-lg tracking-wider text-amber-400">PHÁP TẠNG</span>
                    <p className="text-xs text-slate-400 mt-0.5">Quản lý Thu & Chi</p>
                </div>
                <SidebarNavItems navItems={navLinks} />
            </div>
            <div className="p-3 border-t border-slate-800 text-xs text-slate-500 text-center">
                Phiên bản v1.0.0
            </div>
        </aside>
    );
}