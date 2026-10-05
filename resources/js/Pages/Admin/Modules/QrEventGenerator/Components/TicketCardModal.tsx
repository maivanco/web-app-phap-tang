import React from 'react';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import PrimaryButton from '@/Components/PrimaryButton';

export interface AttendeeData {
    id: number;
    ticket_code: string;
    full_name: string;
    phone: string;
    email?: string | null;
    notes?: string | null;
    status: 'pending' | 'checked_in' | 'cancelled';
    checked_in_at?: string | null;
    checked_in_by_name?: string | null;
    qr_data_uri?: string;
    verification_url?: string;
    event?: {
        id: number;
        name: string;
        location?: string | null;
        event_date?: string | null;
    };
}

interface TicketCardModalProps {
    show: boolean;
    onClose: () => void;
    attendee: AttendeeData | null;
    eventName?: string;
    eventLocation?: string;
    eventDate?: string;
}

export default function TicketCardModal({
    show,
    onClose,
    attendee,
    eventName,
    eventLocation,
    eventDate,
}: TicketCardModalProps) {
    if (!attendee) return null;

    const currentEventName = eventName || attendee.event?.name || 'Sự kiện đặc biệt';
    const currentEventLocation = eventLocation || attendee.event?.location || 'Tại cửa hàng';
    const currentEventDate = eventDate || attendee.event?.event_date || 'Không giới hạn';

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadQrPng = () => {
        const link = document.createElement('a');
        link.href = route('admin.qr_events.attendees.qr_image', {
            attendee: attendee.id,
            download: 1,
        });
        link.setAttribute('download', `QR-${attendee.ticket_code}.png`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadTicketSvg = () => {
        const link = document.createElement('a');
        link.href = route('admin.qr_events.attendees.download_ticket', {
            attendee: attendee.id,
        });
        link.setAttribute('download', `Ticket-${attendee.ticket_code}.svg`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="p-6 bg-slate-900 text-white rounded-2xl relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute -top-16 -right-16 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div>
                        <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold">
                            THẺ VÉ QR SỰ KIỆN
                        </span>
                        <h3 className="text-lg font-extrabold text-white mt-0.5 truncate max-w-[280px]">
                            {currentEventName}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Ticket Body / Printable area */}
                <div id="printable-ticket" className="my-5 bg-white text-slate-800 rounded-xl p-5 shadow-2xl relative">
                    {/* Top Notch Cutouts */}
                    <div className="flex justify-between items-center text-xs text-slate-500 border-b pb-3 mb-3">
                        <span className="font-semibold">Mã vé:</span>
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            {attendee.ticket_code}
                        </span>
                    </div>

                    <div className="text-center mb-4">
                        <h4 className="text-xl font-black text-slate-900 leading-tight">
                            {attendee.full_name}
                        </h4>
                        <p className="text-sm font-semibold text-slate-600 mt-1">
                            📞 {attendee.phone}
                        </p>
                        {attendee.email && (
                            <p className="text-xs text-slate-400 mt-0.5">
                                ✉️ {attendee.email}
                            </p>
                        )}
                    </div>

                    {/* QR Code */}
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded-xl my-3">
                        {attendee.qr_data_uri ? (
                            <img
                                src={attendee.qr_data_uri}
                                alt={`QR ${attendee.ticket_code}`}
                                className="w-52 h-52 object-contain"
                            />
                        ) : (
                            <img
                                src={route('admin.qr_events.attendees.qr_image', { attendee: attendee.id })}
                                alt={`QR ${attendee.ticket_code}`}
                                className="w-52 h-52 object-contain"
                            />
                        )}
                        <p className="text-[11px] text-slate-400 mt-2 font-medium">
                            Quét mã này tại cửa hàng để xác nhận check-in
                        </p>
                    </div>

                    {/* Event summary details */}
                    <div className="bg-slate-100/80 rounded-lg p-2.5 text-xs space-y-1 mt-3">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Thời gian:</span>
                            <span className="font-semibold text-slate-700">{currentEventDate}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Địa điểm:</span>
                            <span className="font-semibold text-slate-700 truncate max-w-[200px]">
                                {currentEventLocation}
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                            <span className="text-slate-500">Trạng thái vé:</span>
                            {attendee.status === 'checked_in' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                    Đã Check-in
                                </span>
                            ) : attendee.status === 'cancelled' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                                    Đã hủy
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                                    Chờ Check-in
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <button
                        onClick={handleDownloadQrPng}
                        type="button"
                        className="flex-1 inline-flex justify-center items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition"
                    >
                        📥 Tải Ảnh QR (PNG)
                    </button>
                    <button
                        onClick={handleDownloadTicketSvg}
                        type="button"
                        className="flex-1 inline-flex justify-center items-center px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold rounded-lg shadow transition"
                    >
                        🎫 Tải Thẻ Vé (SVG)
                    </button>
                    <button
                        onClick={handlePrint}
                        type="button"
                        className="inline-flex justify-center items-center px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold rounded-lg transition"
                    >
                        🖨️ In
                    </button>
                </div>
            </div>
        </Modal>
    );
}
