import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { PageProps } from '@/types';

interface EventItem {
    id: number;
    name: string;
    description?: string | null;
    location?: string | null;
    event_date?: string | null;
    status: 'active' | 'draft' | 'completed' | 'cancelled';
    attendees_count: number;
    checked_in_count: number;
    creator?: {
        id: number;
        name: string;
    };
    created_at: string;
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

interface IndexProps extends PageProps {
    events: PaginatedData<EventItem>;
    filters: {
        search?: string;
        status?: string;
    };
}

export default function Index({ auth, events, filters }: IndexProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('admin.qr_events.index'),
            { search, status },
            { preserveState: true, replace: true }
        );
    };

    const handleReset = () => {
        setSearch('');
        setStatus('');
        router.get(route('admin.qr_events.index'), {}, { preserveState: true, replace: true });
    };

    const handleDelete = (event: EventItem) => {
        if (confirm(`Bạn có chắc chắn muốn xóa sự kiện "${event.name}" cùng tất cả vé tham dự không?`)) {
            router.delete(route('admin.qr_events.destroy', { event: event.id }));
        }
    };

    const getStatusBadge = (status: EventItem['status']) => {
        switch (status) {
            case 'active':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        ● Đang diễn ra
                    </span>
                );
            case 'draft':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        Bản nháp
                    </span>
                );
            case 'completed':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        Đã kết thúc
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                        Đã hủy
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="font-bold text-2xl text-slate-800 leading-tight flex items-center gap-2">
                            <span>🎫</span> Quản lý Sự kiện & Tạo Mã QR Khách Hàng
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Tạo sự kiện, phát hành mã QR vé cho từng khách hàng và quét check-in tại cửa hàng
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={route('admin.qr_events.scanner.index')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl shadow transition"
                        >
                            <span>📷</span> Quét Mã QR
                        </Link>
                        <Link
                            href={route('admin.qr_events.create')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow transition"
                        >
                            <span>➕</span> Tạo Sự Kiện Mới
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Quản lý Sự kiện & Vé QR" />

            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Search & Filter Bar */}
                <form
                    onSubmit={handleFilter}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between"
                >
                    <div className="flex-1 w-full md:w-auto relative">
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên sự kiện, địa điểm..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <span className="absolute left-3.5 top-2.5 text-slate-400">🔍</span>
                    </div>

                    <div className="flex w-full md:w-auto items-center gap-2">
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="text-sm border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-indigo-500 py-2"
                        >
                            <option value="">Tất cả trạng thái</option>
                            <option value="active">Đang diễn ra</option>
                            <option value="draft">Bản nháp</option>
                            <option value="completed">Đã kết thúc</option>
                            <option value="cancelled">Đã hủy</option>
                        </select>

                        <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition"
                        >
                            Lọc
                        </button>

                        {(search || status) && (
                            <button
                                type="button"
                                onClick={handleReset}
                                className="px-3 py-2 text-slate-600 hover:bg-slate-100 text-sm font-medium rounded-xl transition"
                            >
                                Xóa lọc
                            </button>
                        )}
                    </div>
                </form>

                {/* Events Grid */}
                {events.data.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-500 text-3xl flex items-center justify-center rounded-2xl mx-auto mb-4">
                            🎫
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Chưa có sự kiện nào</h3>
                        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                            Hãy tạo sự kiện đầu tiên để bắt đầu tạo mã QR vé và quản lý check-in cho khách hàng!
                        </p>
                        <Link
                            href={route('admin.qr_events.create')}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow transition"
                        >
                            <span>➕</span> Tạo Sự Kiện Ngay
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.data.map((item) => {
                            const attendanceRate =
                                item.attendees_count > 0
                                    ? Math.round((item.checked_in_count / item.attendees_count) * 100)
                                    : 0;

                            return (
                                <div
                                    key={item.id}
                                    className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden"
                                >
                                    <div className="p-6">
                                        <div className="flex items-start justify-between gap-2 mb-3">
                                            {getStatusBadge(item.status)}
                                            <span className="text-xs text-slate-400">
                                                ID: #{item.id}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-bold text-slate-900 line-clamp-1 hover:text-indigo-600 transition">
                                            <Link href={route('admin.qr_events.show', { event: item.id })}>
                                                {item.name}
                                            </Link>
                                        </h3>

                                        {item.description && (
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                {item.description}
                                            </p>
                                        )}

                                        <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400">📅</span>
                                                <span>
                                                    {item.event_date
                                                        ? new Date(item.event_date).toLocaleString('vi-VN', {
                                                              dateStyle: 'medium',
                                                              timeStyle: 'short',
                                                          })
                                                        : 'Chưa đặt ngày'}
                                                </span>
                                            </div>
                                            {item.location && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400">📍</span>
                                                    <span className="truncate">{item.location}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Attendance Progress */}
                                        <div className="mt-5 pt-4 border-t border-slate-100">
                                            <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                                                <span className="text-slate-500">Khách tham dự:</span>
                                                <span className="text-slate-800">
                                                    <strong className="text-emerald-600 font-bold">
                                                        {item.checked_in_count}
                                                    </strong>{' '}
                                                    / {item.attendees_count} đã check-in
                                                </span>
                                            </div>

                                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${attendanceRate}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Footer Actions */}
                                    <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-medium">
                                        <Link
                                            href={route('admin.qr_events.show', { event: item.id })}
                                            className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                                        >
                                            Chi tiết & DS Vé →
                                        </Link>

                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={route('admin.qr_events.edit', { event: item.id })}
                                                className="text-slate-600 hover:text-slate-900"
                                            >
                                                Sửa
                                            </Link>
                                            <span className="text-slate-300">•</span>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(item)}
                                                className="text-rose-600 hover:text-rose-800"
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {events.last_page > 1 && (
                    <div className="flex justify-center gap-1 pt-4">
                        {events.links.map((link, idx) => (
                            <Link
                                key={idx}
                                href={link.url || '#'}
                                className={`px-3 py-1.5 text-xs rounded-lg transition ${
                                    link.active
                                        ? 'bg-indigo-600 text-white font-bold'
                                        : link.url
                                        ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                                        : 'text-slate-400 cursor-not-allowed'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
