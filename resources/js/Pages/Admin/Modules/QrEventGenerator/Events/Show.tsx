import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TicketCardModal, { AttendeeData } from '../Components/TicketCardModal';

interface EventData {
    id: number;
    name: string;
    description?: string | null;
    location?: string | null;
    event_date?: string | null;
    status: 'active' | 'draft' | 'completed' | 'cancelled';
}

interface StatsData {
    total: number;
    checked_in: number;
    pending: number;
}

interface PaginatedAttendees {
    data: AttendeeData[];
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

interface ShowProps extends PageProps {
    event: EventData;
    attendees: PaginatedAttendees;
    stats: StatsData;
    filters: {
        search?: string;
        status?: string;
    };
}

export default function Show({ auth, event, attendees, stats, filters }: ShowProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedAttendeeForTicket, setSelectedAttendeeForTicket] = useState<AttendeeData | null>(null);

    // Form for creating attendee
    const { data, setData, post, processing, errors, reset } = useForm({
        full_name: '',
        phone: '',
        email: '',
        notes: '',
    });

    const handleCreateAttendee = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.qr_events.attendees.store', { event: event.id }), {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                reset();
            },
        });
    };

    const handleFilter = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('admin.qr_events.show', { event: event.id }),
            { search, status: statusFilter },
            { preserveState: true, replace: true }
        );
    };

    const handleResetFilter = () => {
        setSearch('');
        setStatusFilter('');
        router.get(route('admin.qr_events.show', { event: event.id }), {}, { preserveState: true, replace: true });
    };

    const handleManualStatusToggle = (attendee: AttendeeData, newStatus: string) => {
        if (confirm(`Bạn có muốn chuyển trạng thái vé của ${attendee.full_name} sang "${newStatus}"?`)) {
            router.put(route('admin.qr_events.attendees.update', { attendee: attendee.id }), {
                full_name: attendee.full_name,
                phone: attendee.phone,
                email: attendee.email,
                notes: attendee.notes,
                status: newStatus,
            }, {
                preserveScroll: true,
            });
        }
    };

    const handleDeleteAttendee = (attendee: AttendeeData) => {
        if (confirm(`Bạn có chắc chắn muốn xóa mã vé của "${attendee.full_name}" (${attendee.ticket_code})?`)) {
            router.delete(route('admin.qr_events.attendees.destroy', { attendee: attendee.id }), {
                preserveScroll: true,
            });
        }
    };

    const attendanceRate = stats.total > 0 ? Math.round((stats.checked_in / stats.total) * 100) : 0;

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Link
                                href={route('admin.qr_events.index')}
                                className="text-xs text-slate-500 hover:text-indigo-600"
                            >
                                ← Danh sách sự kiện
                            </Link>
                        </div>
                        <h2 className="font-bold text-2xl text-slate-900 leading-tight flex items-center gap-2 mt-1">
                            <span>🎫</span> {event.name}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={route('admin.qr_events.scanner.index')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl shadow transition"
                        >
                            <span>📷</span> Mở Máy Quét Check-in
                        </Link>
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow transition"
                        >
                            <span>➕</span> Cấp Vé QR Khách Hàng
                        </button>
                    </div>
                </div>
            }
        >
            <Head title={`Sự kiện: ${event.name}`} />

            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Event Overview & Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Event Detail Card */}
                    <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                                    Thông tin sự kiện
                                </span>
                                <Link
                                    href={route('admin.qr_events.edit', { event: event.id })}
                                    className="text-xs text-slate-500 hover:text-indigo-600 font-medium"
                                >
                                    ✏️ Chỉnh sửa
                                </Link>
                            </div>

                            <div className="mt-4 space-y-2 text-sm text-slate-700">
                                <div>
                                    <span className="text-xs text-slate-400 block font-medium">THỜI GIAN:</span>
                                    <span className="font-semibold">
                                        {event.event_date
                                            ? new Date(event.event_date).toLocaleString('vi-VN', {
                                                  dateStyle: 'full',
                                                  timeStyle: 'short',
                                              })
                                            : 'Chưa đặt thời gian'}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-xs text-slate-400 block font-medium">ĐỊA ĐIỂM:</span>
                                    <span className="font-semibold text-slate-800">
                                        {event.location || 'Tại cửa hàng'}
                                    </span>
                                </div>

                                {event.description && (
                                    <div className="pt-2 border-t border-slate-100">
                                        <span className="text-xs text-slate-400 block font-medium">MÔ TẢ:</span>
                                        <p className="text-xs text-slate-600 whitespace-pre-line mt-0.5">
                                            {event.description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-slate-500">
                            <span>Trạng thái:</span>
                            <span className="font-bold uppercase text-slate-700">{event.status}</span>
                        </div>
                    </div>

                    {/* Stats Numbers */}
                    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between text-slate-400 text-sm">
                                <span>Tổng vé phát hành</span>
                                <span className="text-2xl">🎟️</span>
                            </div>
                            <div className="mt-4">
                                <span className="text-4xl font-black text-slate-900">{stats.total}</span>
                                <span className="text-xs text-slate-400 ml-1.5 font-medium">khách</span>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between text-slate-400 text-sm">
                                <span>Đã Check-in</span>
                                <span className="text-2xl">✅</span>
                            </div>
                            <div className="mt-4">
                                <span className="text-4xl font-black text-emerald-600">
                                    {stats.checked_in}
                                </span>
                                <span className="text-xs text-emerald-500 ml-1.5 font-medium">
                                    ({attendanceRate}%)
                                </span>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between text-slate-400 text-sm">
                                <span>Chờ Check-in</span>
                                <span className="text-2xl">⏳</span>
                            </div>
                            <div className="mt-4">
                                <span className="text-4xl font-black text-amber-500">
                                    {stats.pending}
                                </span>
                                <span className="text-xs text-slate-400 ml-1.5 font-medium">khách</span>
                            </div>
                        </div>

                        {/* Progress Bar Span */}
                        <div className="sm:col-span-3 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-center text-xs mb-2 font-semibold">
                                <span className="text-slate-600">Tiến độ khách đến check-in cửa hàng:</span>
                                <span className="text-indigo-600 font-bold">{attendanceRate}% hoàn thành</span>
                            </div>
                            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-3 rounded-full transition-all duration-700"
                                    style={{ width: `${attendanceRate}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attendees Section */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    {/* Filter & Search Bar */}
                    <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">
                                Danh Sách Khách Hàng & Mã Vé QR
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Quản lý mã QR, xem thẻ vé, tải ảnh QR hoặc cập nhật check-in
                            </p>
                        </div>

                        <form onSubmit={handleFilter} className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            <input
                                type="text"
                                placeholder="Tìm theo tên, SĐT, mã vé..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="text-xs border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-indigo-500 py-2 px-3 w-full sm:w-56"
                            />

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="text-xs border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-indigo-500 py-2"
                            >
                                <option value="">Tất cả trạng thái</option>
                                <option value="pending">Chờ Check-in</option>
                                <option value="checked_in">Đã Check-in</option>
                                <option value="cancelled">Đã hủy</option>
                            </select>

                            <button
                                type="submit"
                                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition"
                            >
                                Lọc
                            </button>

                            {(search || statusFilter) && (
                                <button
                                    type="button"
                                    onClick={handleResetFilter}
                                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 text-xs font-medium rounded-xl transition"
                                >
                                    Xóa lọc
                                </button>
                            )}
                        </form>
                    </div>

                    {/* Table */}
                    {attendees.data.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="text-4xl mb-3">👥</div>
                            <h4 className="text-base font-bold text-slate-800">Chưa có vé nào</h4>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                                Bấm nút bên dưới để cấp mã QR vé tham dự cho khách hàng đầu tiên của sự kiện này!
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow"
                            >
                                <span>➕</span> Cấp Vé QR Mới
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="py-3 px-6">Mã Vé</th>
                                        <th className="py-3 px-6">Khách Hàng</th>
                                        <th className="py-3 px-6">Mã QR</th>
                                        <th className="py-3 px-6">Trạng Thái</th>
                                        <th className="py-3 px-6">Thời Gian Check-in</th>
                                        <th className="py-3 px-6 text-right">Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {attendees.data.map((att) => (
                                        <tr key={att.id} className="hover:bg-slate-50/60 transition">
                                            {/* Ticket Code */}
                                            <td className="py-3.5 px-6 font-mono font-bold text-indigo-600">
                                                <span className="bg-indigo-50 px-2 py-0.5 rounded">
                                                    {att.ticket_code}
                                                </span>
                                            </td>

                                            {/* Customer Name & Phone */}
                                            <td className="py-3.5 px-6">
                                                <div className="font-bold text-slate-900 text-sm">
                                                    {att.full_name}
                                                </div>
                                                <div className="text-slate-500 font-medium">
                                                    📞 {att.phone}
                                                </div>
                                                {att.email && (
                                                    <div className="text-[11px] text-slate-400">
                                                        ✉️ {att.email}
                                                    </div>
                                                )}
                                                {att.notes && (
                                                    <div className="text-[11px] text-slate-400 italic">
                                                        "{att.notes}"
                                                    </div>
                                                )}
                                            </td>

                                            {/* QR Thumbnail */}
                                            <td className="py-3.5 px-6">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedAttendeeForTicket(att)}
                                                    className="group relative inline-block p-1 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 transition"
                                                    title="Bấm để xem và tải vé"
                                                >
                                                    {att.qr_data_uri ? (
                                                        <img
                                                            src={att.qr_data_uri}
                                                            alt={att.ticket_code}
                                                            className="w-12 h-12 object-contain"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 bg-slate-100 flex items-center justify-center text-xs">
                                                            QR
                                                        </div>
                                                    )}
                                                    <span className="absolute inset-0 bg-indigo-900/60 text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-lg transition">
                                                        Xem
                                                    </span>
                                                </button>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-3.5 px-6">
                                                {att.status === 'checked_in' ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                        ● Đã Check-in
                                                    </span>
                                                ) : att.status === 'cancelled' ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                                                        Đã hủy
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                                        ⏳ Chờ Check-in
                                                    </span>
                                                )}
                                            </td>

                                            {/* Check-in time & Staff */}
                                            <td className="py-3.5 px-6 text-slate-600">
                                                {att.checked_in_at ? (
                                                    <div>
                                                        <div className="font-semibold text-slate-800">
                                                            {new Date(att.checked_in_at).toLocaleString('vi-VN', {
                                                                dateStyle: 'short',
                                                                timeStyle: 'medium',
                                                            })}
                                                        </div>
                                                        {att.checked_in_by_name && (
                                                            <div className="text-[11px] text-slate-400">
                                                                bởi {att.checked_in_by_name}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">Chưa check-in</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3.5 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedAttendeeForTicket(att)}
                                                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition"
                                                    >
                                                        Xem Vé
                                                    </button>

                                                    {att.status === 'pending' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleManualStatusToggle(att, 'checked_in')}
                                                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg text-xs transition"
                                                            title="Check-in thủ công"
                                                        >
                                                            Check-in
                                                        </button>
                                                    ) : att.status === 'checked_in' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleManualStatusToggle(att, 'pending')}
                                                            className="px-2 py-1 text-slate-400 hover:text-slate-600 text-[11px] transition"
                                                            title="Hủy trạng thái check-in"
                                                        >
                                                            Hoàn lại
                                                        </button>
                                                    ) : null}

                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteAttendee(att)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                                                        title="Xóa vé"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {attendees.last_page > 1 && (
                        <div className="p-4 border-t border-slate-100 flex justify-center gap-1">
                            {attendees.links.map((link, idx) => (
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
            </div>

            {/* Modal: Create Attendee */}
            <Modal show={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} maxWidth="md">
                <form onSubmit={handleCreateAttendee} className="p-6 bg-white rounded-2xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 className="font-bold text-lg text-slate-900">
                            ➕ Cấp Mã QR Vé Cho Khách Hàng
                        </h3>
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="text-slate-400 hover:text-slate-700"
                        >
                            ✕
                        </button>
                    </div>

                    <div>
                        <InputLabel htmlFor="full_name" value="Họ và tên khách hàng *" />
                        <TextInput
                            id="full_name"
                            type="text"
                            className="mt-1 block w-full"
                            value={data.full_name}
                            onChange={(e) => setData('full_name', e.target.value)}
                            placeholder="Nguyễn Văn A..."
                            required
                        />
                        <InputError message={errors.full_name} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel htmlFor="phone" value="Số điện thoại *" />
                        <TextInput
                            id="phone"
                            type="tel"
                            className="mt-1 block w-full"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            placeholder="0912345678..."
                            required
                        />
                        <InputError message={errors.phone} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel htmlFor="email" value="Email (tùy chọn)" />
                        <TextInput
                            id="email"
                            type="email"
                            className="mt-1 block w-full"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="khachhang@gmail.com..."
                        />
                        <InputError message={errors.email} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel htmlFor="notes" value="Ghi chú thêm" />
                        <textarea
                            id="notes"
                            rows={2}
                            className="mt-1 block w-full border-slate-200 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            placeholder="Ví dụ: Khách VIP, đi cùng 1 người thân..."
                        />
                        <InputError message={errors.notes} className="mt-1" />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <SecondaryButton onClick={() => setIsCreateModalOpen(false)}>
                            Hủy bỏ
                        </SecondaryButton>
                        <PrimaryButton disabled={processing}>
                            {processing ? 'Đang tạo...' : 'Tạo Vé & Sinh QR'}
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* Modal: View Ticket Card */}
            <TicketCardModal
                show={!!selectedAttendeeForTicket}
                onClose={() => setSelectedAttendeeForTicket(null)}
                attendee={selectedAttendeeForTicket}
                eventName={event.name}
                eventLocation={event.location || undefined}
                eventDate={
                    event.event_date
                        ? new Date(event.event_date).toLocaleString('vi-VN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                          })
                        : undefined
                }
            />
        </AuthenticatedLayout>
    );
}
