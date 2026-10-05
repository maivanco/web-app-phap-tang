import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { PageProps } from '@/types';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';

interface EventSummary {
    id: number;
    name: string;
    status: string;
    event_date?: string | null;
}

interface ScannerIndexProps extends PageProps {
    events: EventSummary[];
}

interface ScannedAttendee {
    id: number;
    ticket_code: string;
    full_name: string;
    phone: string;
    email?: string | null;
    notes?: string | null;
    status: 'pending' | 'checked_in' | 'cancelled';
    checked_in_at?: string | null;
    checked_in_by_name?: string | null;
    event?: {
        id: number;
        name: string;
        location?: string | null;
        event_date?: string | null;
    };
}

export default function Index({ auth, events }: ScannerIndexProps) {
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [autoCheckIn, setAutoCheckIn] = useState<boolean>(true);
    const [manualCode, setManualCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Scan state
    const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
    const [scanResult, setScanResult] = useState<{
        type: 'success' | 'warning' | 'error';
        message: string;
        attendee?: ScannedAttendee | null;
    } | null>(null);

    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const scannerRegionId = 'qr-reader-container';

    // Play subtle audio feedback
    const playFeedbackSound = (type: 'success' | 'warning' | 'error') => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'success') {
                osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
                osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            } else if (type === 'warning') {
                osc.frequency.setValueAtTime(440, ctx.currentTime);
                osc.frequency.setValueAtTime(330, ctx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
                osc.start();
                osc.stop(ctx.currentTime + 0.35);
            } else {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, ctx.currentTime);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
                osc.start();
                osc.stop(ctx.currentTime + 0.25);
            }
        } catch {
            // Audio context not allowed or failed, ignore
        }
    };

    // Process scanned text (URL or ticket code)
    const handleProcessCode = async (decodedText: string) => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            if (autoCheckIn) {
                // Direct Check-in attempt
                const response = await axios.post(route('admin.qr_events.scanner.check_in'), {
                    code: decodedText,
                    event_id: selectedEventId || null,
                });

                if (response.data.success) {
                    playFeedbackSound('success');
                    setScanResult({
                        type: 'success',
                        message: response.data.message,
                        attendee: response.data.attendee,
                    });
                }
            } else {
                // Lookup attendee for review first
                const response = await axios.post(route('admin.qr_events.scanner.lookup'), {
                    code: decodedText,
                    event_id: selectedEventId || null,
                });

                if (response.data.success) {
                    playFeedbackSound('success');
                    setScanResult({
                        type: 'success',
                        message: 'Tìm thấy thông tin vé hợp lệ!',
                        attendee: response.data.attendee,
                    });
                }
            }
        } catch (error: any) {
            if (error.response?.status === 409) {
                // Already checked in
                playFeedbackSound('warning');
                setScanResult({
                    type: 'warning',
                    message: error.response.data.message,
                    attendee: error.response.data.attendee,
                });
            } else {
                // Not found or invalid
                playFeedbackSound('error');
                setScanResult({
                    type: 'error',
                    message: error.response?.data?.message || 'Không thể xác thực mã QR hoặc mã vé này.',
                    attendee: null,
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Manual Confirm Check-in action
    const handleConfirmCheckIn = async (ticketCode: string) => {
        setIsLoading(true);
        try {
            const response = await axios.post(route('admin.qr_events.scanner.check_in'), {
                code: ticketCode,
            });

            if (response.data.success) {
                playFeedbackSound('success');
                setScanResult({
                    type: 'success',
                    message: response.data.message,
                    attendee: response.data.attendee,
                });
            }
        } catch (error: any) {
            playFeedbackSound(error.response?.status === 409 ? 'warning' : 'error');
            setScanResult({
                type: error.response?.status === 409 ? 'warning' : 'error',
                message: error.response?.data?.message || 'Check-in thất bại.',
                attendee: error.response?.data?.attendee || scanResult?.attendee,
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Toggle Camera Scanner
    const startCamera = async () => {
        try {
            setScanResult(null);
            if (!html5QrCodeRef.current) {
                html5QrCodeRef.current = new Html5Qrcode(scannerRegionId);
            }

            await html5QrCodeRef.current.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText) => {
                    handleProcessCode(decodedText);
                },
                () => {
                    // Ignore frame scanning errors
                }
            );

            setIsCameraActive(true);
        } catch (err: any) {
            alert('Không thể mở camera. Vui lòng cấp quyền truy cập camera cho trình duyệt hoặc thử quét bằng ảnh.');
            setIsCameraActive(false);
        }
    };

    const stopCamera = async () => {
        if (html5QrCodeRef.current && isCameraActive) {
            try {
                await html5QrCodeRef.current.stop();
                setIsCameraActive(false);
            } catch (err) {
                // Ignore stop error
            }
        }
    };

    // Handle File Upload Scanning
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setScanResult(null);
        try {
            if (!html5QrCodeRef.current) {
                html5QrCodeRef.current = new Html5Qrcode(scannerRegionId);
            }

            const decodedText = await html5QrCodeRef.current.scanFile(file, true);
            handleProcessCode(decodedText);
        } catch (err) {
            playFeedbackSound('error');
            setScanResult({
                type: 'error',
                message: 'Không tìm thấy hoặc không đọc được mã QR trong hình ảnh đã chọn.',
                attendee: null,
            });
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Handle Manual Code Submit
    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualCode.trim()) return;
        handleProcessCode(manualCode.trim());
    };

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            if (html5QrCodeRef.current) {
                try {
                    html5QrCodeRef.current.stop();
                } catch {
                    // Clean up quietly
                }
            }
        };
    }, []);

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Link
                                href={route('admin.qr_events.index')}
                                className="text-xs text-slate-500 hover:text-indigo-600"
                            >
                                ← Quản lý sự kiện
                            </Link>
                        </div>
                        <h2 className="font-bold text-2xl text-slate-900 leading-tight flex items-center gap-2 mt-1">
                            <span>📷</span> Máy Quét Mã QR & Check-in Cửa Hàng
                        </h2>
                    </div>

                    <Link
                        href={route('admin.qr_events.index')}
                        className="text-xs font-semibold px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
                    >
                        Quản lý Sự Kiện
                    </Link>
                </div>
            }
        >
            <Head title="Quét Mã QR Check-in" />

            <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Control Toolbar */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
                            Lọc Sự Kiện:
                        </label>
                        <select
                            value={selectedEventId}
                            onChange={(e) => setSelectedEventId(e.target.value)}
                            className="text-xs border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-indigo-500 py-2 w-full md:w-64"
                        >
                            <option value="">Quét tất cả sự kiện</option>
                            {events.map((evt) => (
                                <option key={evt.id} value={evt.id}>
                                    {evt.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoCheckIn}
                                onChange={(e) => setAutoCheckIn(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            <span className="ml-2.5 text-xs font-semibold text-slate-700">
                                Tự động Check-in khi quét
                            </span>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Scanner & Upload Box */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                    <span>📸</span> Quét Mã QR Trực Tiếp
                                </h3>
                                {isCameraActive && (
                                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                        Camera đang hoạt động
                                    </span>
                                )}
                            </div>

                            {/* Camera Viewport */}
                            <div className="relative overflow-hidden bg-slate-900 rounded-2xl min-h-[300px] flex items-center justify-center border border-slate-800">
                                <div id={scannerRegionId} className="w-full h-full max-w-[400px]" />

                                {!isCameraActive && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white/80 bg-slate-900/90 z-10">
                                        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-3xl flex items-center justify-center mb-3">
                                            📷
                                        </div>
                                        <h4 className="font-bold text-base text-white">
                                            Camera đang tắt
                                        </h4>
                                        <p className="text-xs text-slate-400 mt-1 max-w-xs mb-5">
                                            Bấm nút bên dưới để mở camera quét trực tiếp hoặc chọn ảnh mã QR từ máy của bạn
                                        </p>
                                        <button
                                            type="button"
                                            onClick={startCamera}
                                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
                                        >
                                            <span>▶</span> Bật Camera Quét Mã
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Camera & Upload Action Buttons */}
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                {isCameraActive ? (
                                    <button
                                        type="button"
                                        onClick={stopCamera}
                                        className="flex-1 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl transition"
                                    >
                                        ⏹ Dừng Camera
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={startCamera}
                                        className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition"
                                    >
                                        ▶ Mở Camera Quét
                                    </button>
                                )}

                                {/* File Upload Button */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                                >
                                    <span>🖼️</span> Tải Ảnh Mã QR Lên
                                </button>
                            </div>
                        </div>

                        {/* Manual Entry Fallback */}
                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 mb-3">
                                Nhập mã vé thủ công (khi camera mờ hoặc lỗi)
                            </h4>
                            <form onSubmit={handleManualSubmit} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Nhập mã vé (ví dụ: TK-ABCDEFGH)..."
                                    value={manualCode}
                                    onChange={(e) => setManualCode(e.target.value)}
                                    className="flex-1 text-xs border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-indigo-500 py-2.5 px-3 uppercase font-mono"
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !manualCode.trim()}
                                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50"
                                >
                                    {isLoading ? 'Đang tra...' : 'Kiểm Tra'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right: Scan Feedback Result Box */}
                    <div className="lg:col-span-5">
                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm min-h-[420px] flex flex-col">
                            <h3 className="font-bold text-slate-900 text-sm pb-4 border-b border-slate-100 mb-4 flex items-center gap-2">
                                <span>📋</span> Kết Quả Quét & Xác Thực
                            </h3>

                            {isLoading && (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
                                    <p className="text-xs text-slate-500 font-medium">Đang kiểm tra mã vé...</p>
                                </div>
                            )}

                            {!isLoading && !scanResult && (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                                    <div className="w-16 h-16 rounded-full bg-slate-50 text-2xl flex items-center justify-center mb-3">
                                        🎯
                                    </div>
                                    <p className="text-xs font-semibold text-slate-600">Sẵn sàng nhận diện mã QR</p>
                                    <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                                        Hãy hướng camera vào mã QR của khách hoặc tải ảnh mã QR lên để xem thông tin
                                    </p>
                                </div>
                            )}

                            {!isLoading && scanResult && (
                                <div className="space-y-4">
                                    {/* Alert Banner */}
                                    <div
                                        className={`p-4 rounded-2xl flex items-start gap-3 ${
                                            scanResult.type === 'success'
                                                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                                                : scanResult.type === 'warning'
                                                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                                : 'bg-rose-50 text-rose-900 border border-rose-200'
                                        }`}
                                    >
                                        <span className="text-xl">
                                            {scanResult.type === 'success'
                                                ? '✅'
                                                : scanResult.type === 'warning'
                                                ? '⚠️'
                                                : '❌'}
                                        </span>
                                        <div>
                                            <h4 className="text-xs font-bold uppercase tracking-wider">
                                                {scanResult.type === 'success'
                                                    ? 'Xác thực thành công'
                                                    : scanResult.type === 'warning'
                                                    ? 'Vé đã được sử dụng'
                                                    : 'Mã không hợp lệ'}
                                            </h4>
                                            <p className="text-xs mt-0.5 font-medium leading-relaxed">
                                                {scanResult.message}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Attendee Details Card */}
                                    {scanResult.attendee && (
                                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/70 space-y-3">
                                            <div className="flex justify-between items-center text-xs pb-3 border-b border-slate-200">
                                                <span className="text-slate-500 font-medium">Mã vé:</span>
                                                <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                    {scanResult.attendee.ticket_code}
                                                </span>
                                            </div>

                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                                    KHÁCH HÀNG
                                                </span>
                                                <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                                                    {scanResult.attendee.full_name}
                                                </h4>
                                                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                                                    📞 {scanResult.attendee.phone}
                                                </p>
                                                {scanResult.attendee.email && (
                                                    <p className="text-[11px] text-slate-400">
                                                        ✉️ {scanResult.attendee.email}
                                                    </p>
                                                )}
                                            </div>

                                            {scanResult.attendee.event && (
                                                <div className="pt-2 border-t border-slate-200">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                                        SỰ KIỆN
                                                    </span>
                                                    <p className="text-xs font-bold text-slate-800">
                                                        {scanResult.attendee.event.name}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                                                <span className="text-slate-500 font-medium">Trạng thái:</span>
                                                {scanResult.attendee.status === 'checked_in' ? (
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                                        Đã Check-in
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                                                        Chờ Check-in
                                                    </span>
                                                )}
                                            </div>

                                            {scanResult.attendee.checked_in_at && (
                                                <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200">
                                                    ⏰ Thời gian check-in:{' '}
                                                    <strong>{scanResult.attendee.checked_in_at}</strong>
                                                    {scanResult.attendee.checked_in_by_name && (
                                                        <span> bởi {scanResult.attendee.checked_in_by_name}</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Manual Check-in Button if autoCheckIn is off and status is pending */}
                                            {scanResult.attendee.status === 'pending' && !autoCheckIn && (
                                                <div className="pt-3">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleConfirmCheckIn(scanResult.attendee!.ticket_code)
                                                        }
                                                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition"
                                                    >
                                                        ✓ Xác Nhận Check-in Cho Khách
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
