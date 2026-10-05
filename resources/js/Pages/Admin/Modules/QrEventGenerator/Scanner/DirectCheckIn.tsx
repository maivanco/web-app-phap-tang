import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { PageProps } from '@/types';
import axios from 'axios';

interface DirectCheckInProps extends PageProps {
    notFound: boolean;
    ticketCode?: string;
    attendee?: {
        id: number;
        ticket_code: string;
        full_name: string;
        phone: string;
        email?: string | null;
        notes?: string | null;
        status: 'pending' | 'checked_in' | 'cancelled';
        checked_in_at?: string | null;
        checked_in_by_name?: string | null;
        event: {
            id: number;
            name: string;
            location?: string | null;
            event_date?: string | null;
            status: string;
        };
    };
}

export default function DirectCheckIn({ auth, notFound, ticketCode, attendee: initialAttendee }: DirectCheckInProps) {
    const [attendee, setAttendee] = useState(initialAttendee);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleCheckIn = async () => {
        if (!attendee || isLoading) return;
        setIsLoading(true);

        try {
            const response = await axios.post(route('admin.qr_events.scanner.check_in'), {
                code: attendee.ticket_code,
            });

            if (response.data.success) {
                setAttendee({
                    ...attendee,
                    status: 'checked_in',
                    checked_in_at: response.data.attendee.checked_in_at,
                    checked_in_by_name: response.data.attendee.checked_in_by_name,
                });
                setMessage(response.data.message);
            }
        } catch (error: any) {
            setMessage(error.response?.data?.message || 'Không thể check-in lúc này.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Link
                                href={route('admin.qr_events.scanner.index')}
                                className="text-xs text-slate-500 hover:text-indigo-600"
                            >
                                ← Quay lại máy quét
                            </Link>
                        </div>
                        <h2 className="font-bold text-2xl text-slate-900 leading-tight flex items-center gap-2 mt-1">
                            <span>🎫</span> Xác Thực Vé QR Cửa Hàng
                        </h2>
                    </div>

                    <Link
                        href={route('admin.qr_events.index')}
                        className="text-xs font-semibold px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                    >
                        Danh sách sự kiện
                    </Link>
                </div>
            }
        >
            <Head title="Xác thực vé QR" />

            <div className="max-w-xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                {notFound ? (
                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center">
                        <div className="w-16 h-16 bg-rose-50 text-rose-500 text-3xl flex items-center justify-center rounded-2xl mx-auto mb-4">
                            ❌
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Không Tìm Thấy Vé</h3>
                        <p className="text-sm text-slate-500 mt-2">
                            Mã vé <strong className="font-mono text-slate-700">[{ticketCode}]</strong> không tồn tại trong hệ thống hoặc đã bị xóa.
                        </p>
                        <div className="mt-6">
                            <Link
                                href={route('admin.qr_events.scanner.index')}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow transition"
                            >
                                <span>📷</span> Mở Máy Quét Check-in
                            </Link>
                        </div>
                    </div>
                ) : attendee ? (
                    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                        {/* Status Notice Banner */}
                        {message && (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-semibold flex items-center gap-2">
                                <span>✅</span> {message}
                            </div>
                        )}

                        {attendee.status === 'checked_in' ? (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900">
                                <div className="flex items-center gap-2 font-bold text-sm">
                                    <span>✅</span> VÉ ĐÃ ĐƯỢC CHECK-IN
                                </div>
                                <div className="text-xs text-emerald-700 mt-1">
                                    Thời gian: <strong>{attendee.checked_in_at || 'Vừa xong'}</strong>
                                    {attendee.checked_in_by_name && (
                                        <span> • Xác nhận bởi: {attendee.checked_in_by_name}</span>
                                    )}
                                </div>
                            </div>
                        ) : attendee.status === 'cancelled' ? (
                            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 font-bold text-xs flex items-center gap-2">
                                <span>❌</span> Vé này đã bị hủy bỏ!
                            </div>
                        ) : (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900">
                                <div className="flex items-center gap-2 font-bold text-sm">
                                    <span>⏳</span> VÉ HỢP LỆ - CHƯA CHECK-IN
                                </div>
                                <div className="text-xs text-amber-700 mt-0.5">
                                    Khách hàng đã xuất trình vé thành công. Vui lòng bấm xác nhận check-in bên dưới.
                                </div>
                            </div>
                        )}

                        {/* Customer Info Card */}
                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/70 space-y-3">
                            <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-200">
                                <span className="text-slate-500 font-medium">Mã vé định danh:</span>
                                <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded">
                                    {attendee.ticket_code}
                                </span>
                            </div>

                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                    HỌ VÀ TÊN KHÁCH HÀNG
                                </span>
                                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                                    {attendee.full_name}
                                </h3>
                                <p className="text-sm font-semibold text-slate-600 mt-1">
                                    📞 {attendee.phone}
                                </p>
                                {attendee.email && (
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        ✉️ {attendee.email}
                                    </p>
                                )}
                                {attendee.notes && (
                                    <p className="text-xs text-slate-500 bg-white p-2 rounded-lg border border-slate-200 mt-2 italic">
                                        Ghi chú: {attendee.notes}
                                    </p>
                                )}
                            </div>

                            <div className="pt-3 border-t border-slate-200">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                    SỰ KIỆN THAM GIA
                                </span>
                                <h4 className="text-sm font-bold text-slate-800 mt-0.5">
                                    {attendee.event.name}
                                </h4>
                                {attendee.event.location && (
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        📍 {attendee.event.location}
                                    </p>
                                )}
                                {attendee.event.event_date && (
                                    <p className="text-xs text-slate-500">
                                        📅 {attendee.event.event_date}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {attendee.status === 'pending' && (
                            <button
                                type="button"
                                disabled={isLoading}
                                onClick={handleCheckIn}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
                            >
                                <span>✓</span> {isLoading ? 'Đang xác nhận...' : 'Xác Nhận Check-in Cho Khách'}
                            </button>
                        )}

                        <div className="flex gap-2 pt-2">
                            <Link
                                href={route('admin.qr_events.show', { event: attendee.event.id })}
                                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl text-center transition"
                            >
                                Xem Chi Tiết Sự Kiện
                            </Link>
                            <Link
                                href={route('admin.qr_events.scanner.index')}
                                className="flex-1 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl text-center transition"
                            >
                                Tiếp Tục Quét
                            </Link>
                        </div>
                    </div>
                ) : null}
            </div>
        </AuthenticatedLayout>
    );
}
