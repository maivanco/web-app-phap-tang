import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { PageProps } from '@/types';
import axios from 'axios';
import { Html5Qrcode } from 'html5-qrcode';

interface BenefitItem {
    id: string;
    name: string;
    usage_count: number;
    used_count: number;
    remaining_count: number;
}

interface RecentCheckin {
    id: number;
    benefit_name: string;
    checked_in_at: string;
    staff_name?: string | null;
}

interface ScannedCard {
    id: number;
    card_code: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    customer_dob?: string | null;
    status: string;
    is_active: boolean;
    is_expired: boolean;
    issued_at: string;
    expires_at: string;
    membership_type: {
        id: number;
        name: string;
        price: number | string;
    };
    card_benefits: BenefitItem[];
    recent_checkins: RecentCheckin[];
}

interface ScannerIndexProps extends PageProps {
    initialCode?: string;
}

export default function Index({ auth, initialCode }: ScannerIndexProps) {
    const [manualInput, setManualInput] = useState<string>(initialCode || '');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
    const [card, setCard] = useState<ScannedCard | null>(null);
    const [statusMessage, setStatusMessage] = useState<{
        type: 'success' | 'warning' | 'error';
        text: string;
    } | null>(null);

    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const scannerRegionId = 'membership-qr-reader';

    // Play subtle audio feedback
    const playFeedbackSound = (type: 'success' | 'warning' | 'error') => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'success') {
                osc.frequency.setValueAtTime(587.33, ctx.currentTime);
                osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
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

    // Lookup card by code, URL, or phone
    const handleLookup = async (inputStr: string) => {
        const query = inputStr.trim();
        if (!query) return;

        setIsLoading(true);
        setStatusMessage(null);

        try {
            const response = await axios.post(route('admin.membership.scanner.lookup'), {
                code: query,
            });

            if (response.data.success && response.data.card) {
                setCard(response.data.card);
                playFeedbackSound('success');
                if (response.data.card.is_expired) {
                    setStatusMessage({
                        type: 'warning',
                        text: `Thẻ hội viên đã hết hạn vào ngày ${response.data.card.expires_at}.`,
                    });
                }
            }
        } catch (error: any) {
            playFeedbackSound('error');
            setCard(null);
            setStatusMessage({
                type: 'error',
                text: error.response?.data?.message || 'Không tìm thấy thông tin thẻ hội viên.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Auto lookup if initialCode exists
    useEffect(() => {
        if (initialCode) {
            handleLookup(initialCode);
        }
    }, [initialCode]);

    // Cleanup camera when unmounting
    useEffect(() => {
        return () => {
            if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                html5QrCodeRef.current.stop().catch(() => {});
            }
        };
    }, []);

    // Camera Start / Stop
    const startCamera = async () => {
        try {
            setStatusMessage(null);
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
                    handleLookup(decodedText);
                    stopCamera();
                },
                () => {}
            );

            setIsCameraActive(true);
        } catch (err: any) {
            alert('Không thể mở camera. Vui lòng cấp quyền camera cho trình duyệt.');
            setIsCameraActive(false);
        }
    };

    const stopCamera = async () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            try {
                await html5QrCodeRef.current.stop();
                setIsCameraActive(false);
            } catch {
                // Ignore stop error
            }
        }
    };

    // Check-in / Deduct benefit
    const handleBenefitCheckIn = async (benefit: BenefitItem) => {
        if (!card) return;

        setIsLoading(true);
        try {
            const response = await axios.post(route('admin.membership.scanner.check_in'), {
                code: card.card_code,
                benefit_id: benefit.id,
            });

            if (response.data.success) {
                playFeedbackSound('success');
                setStatusMessage({
                    type: 'success',
                    text: response.data.message || `Đã sử dụng thành công: ${benefit.name}`,
                });

                // Update card benefits in place
                setCard({
                    ...card,
                    card_benefits: response.data.card_benefits,
                    recent_checkins: [
                        {
                            id: Date.now(),
                            benefit_name: benefit.name,
                            checked_in_at: new Date().toLocaleString('vi-VN'),
                            staff_name: auth.user.name,
                        },
                        ...card.recent_checkins,
                    ],
                });
            }
        } catch (error: any) {
            playFeedbackSound('error');
            setStatusMessage({
                type: 'error',
                text: error.response?.data?.message || 'Không thể trừ lượt ưu đãi.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearCard = () => {
        setCard(null);
        setManualInput('');
        setStatusMessage(null);
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                            Quét Thẻ Hội Viên & Trừ Ưu Đãi
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Sử dụng camera quét mã QR trên điện thoại hoặc nhập mã thẻ / số điện thoại khách hàng
                        </p>
                    </div>
                    <Link
                        href={route('admin.membership.cards.index')}
                        className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md font-medium text-xs text-gray-700 uppercase tracking-widest hover:bg-gray-50 shadow-sm"
                    >
                        ← Danh sách thẻ
                    </Link>
                </div>
            }
        >
            <Head title="Quét Thẻ & Trừ Ưu Đãi" />

            <div className="py-6 max-w-5xl mx-auto sm:px-6 lg:px-8 space-y-6">
                {/* Search & Camera Trigger Bar */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleLookup(manualInput);
                                    }
                                }}
                                placeholder="Nhập mã thẻ (VD: MEM-20261031-ABCDE) hoặc số điện thoại..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border-gray-300 focus:border-amber-500 focus:ring-amber-500 text-sm"
                            />
                            <span className="absolute left-3 top-3 text-gray-400">🔍</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleLookup(manualInput)}
                            disabled={isLoading || !manualInput.trim()}
                            className="px-6 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition shadow-sm"
                        >
                            {isLoading ? 'Đang tra cứu...' : 'Tra cứu thẻ'}
                        </button>
                        <button
                            type="button"
                            onClick={isCameraActive ? stopCamera : startCamera}
                            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                                isCameraActive
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                            }`}
                        >
                            <span>📷</span>
                            <span>{isCameraActive ? 'Tắt camera' : 'Mở camera quét QR'}</span>
                        </button>
                    </div>

                    {/* Camera Scanner Viewport */}
                    <div className={isCameraActive ? 'mt-6 block' : 'hidden'}>
                        <div className="max-w-md mx-auto overflow-hidden rounded-2xl border-2 border-dashed border-amber-400 bg-black p-2">
                            <div id={scannerRegionId} className="w-full"></div>
                        </div>
                        <p className="text-center text-xs text-gray-500 mt-2">
                            Hướng camera về phía mã QR trên thẻ hội viên hoặc email của khách hàng
                        </p>
                    </div>
                </div>

                {/* Status Message Banner */}
                {statusMessage && (
                    <div
                        className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
                            statusMessage.type === 'success'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : statusMessage.type === 'warning'
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-red-50 border-red-200 text-red-800'
                        }`}
                    >
                        <span>{statusMessage.text}</span>
                        <button
                            onClick={() => setStatusMessage(null)}
                            className="text-xs font-bold opacity-60 hover:opacity-100"
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Card Result & Check-in Interface */}
                {card && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Member Header */}
                        <div className="p-6 bg-gradient-to-r from-amber-700 to-amber-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-white/20 text-amber-100">
                                        HỘI VIÊN CHÍNH THỨC
                                    </span>
                                    <span className="font-mono text-sm opacity-90">{card.card_code}</span>
                                </div>
                                <h3 className="text-2xl font-black mt-1">{card.customer_name}</h3>
                                <div className="text-xs text-amber-200 mt-1 flex flex-wrap gap-4">
                                    <span>📞 {card.customer_phone}</span>
                                    <span>✉️ {card.customer_email}</span>
                                    {card.customer_dob && <span>🎂 {card.customer_dob}</span>}
                                </div>
                            </div>
                            <div className="text-right sm:border-l sm:border-white/20 sm:pl-6">
                                <div className="text-xs text-amber-200 uppercase font-semibold">Gói hội viên</div>
                                <div className="text-xl font-extrabold text-amber-100">
                                    {card.membership_type.name}
                                </div>
                                <div className="text-xs mt-1">
                                    Hạn dùng: <strong>{card.expires_at}</strong>
                                </div>
                                <div className="mt-2">
                                    {card.is_expired ? (
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">
                                            Đã hết hạn
                                        </span>
                                    ) : (
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white">
                                            Hợp lệ & Hoạt động
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Benefits Check-in Actions */}
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                                <div>
                                    <h4 className="text-base font-bold text-gray-900">
                                        Chọn đặc quyền cần Check-in / Trừ lượt
                                    </h4>
                                    <p className="text-xs text-gray-500">
                                        Bấm vào nút bên phải của từng ưu đãi để xác nhận sử dụng 1 lượt
                                    </p>
                                </div>
                                <button
                                    onClick={handleClearCard}
                                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                                >
                                    Quét thẻ khác
                                </button>
                            </div>

                            <div className="space-y-3">
                                {card.card_benefits.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic py-4">
                                        Gói này chưa có chương trình ưu đãi nào.
                                    </p>
                                ) : (
                                    card.card_benefits.map((benefit) => {
                                        const isLimited = benefit.usage_count > 0;
                                        const remaining = benefit.remaining_count;
                                        const isDepleted = isLimited && remaining <= 0;
                                        const cannotUse = isDepleted || card.is_expired;

                                        return (
                                            <div
                                                key={benefit.id}
                                                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                                                    cannotUse
                                                        ? 'bg-gray-50 border-gray-200 opacity-60'
                                                        : 'bg-white border-amber-200 hover:border-amber-400 shadow-2xs'
                                                }`}
                                            >
                                                <div className="flex-1">
                                                    <div className="font-bold text-gray-900 text-sm">
                                                        {benefit.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                                                        {isLimited ? (
                                                            <>
                                                                <span
                                                                    className={`font-bold ${
                                                                        isDepleted ? 'text-red-600' : 'text-amber-700'
                                                                    }`}
                                                                >
                                                                    Còn lại: {remaining} / {benefit.usage_count} lượt
                                                                </span>
                                                                <span>• Đã dùng: {benefit.used_count}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-emerald-700 font-semibold">
                                                                ✓ Không giới hạn lượt sử dụng
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleBenefitCheckIn(benefit)}
                                                        disabled={isLoading || cannotUse}
                                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                                            cannotUse
                                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                                                        }`}
                                                    >
                                                        <span>✓</span>
                                                        <span>
                                                            {isDepleted
                                                                ? 'Đã hết lượt'
                                                                : card.is_expired
                                                                ? 'Thẻ đã hết hạn'
                                                                : isLimited
                                                                ? 'Xác nhận trừ 1 lượt'
                                                                : 'Xác nhận sử dụng'}
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Recent Check-ins on this Card */}
                        {card.recent_checkins && card.recent_checkins.length > 0 && (
                            <div className="p-6 bg-gray-50 border-t border-gray-100">
                                <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                                    Lịch sử check-in gần đây
                                </h5>
                                <div className="space-y-1.5">
                                    {card.recent_checkins.map((chk, cIdx) => (
                                        <div
                                            key={chk.id || cIdx}
                                            className="text-xs text-gray-700 flex items-center justify-between py-1 border-b border-gray-200/60 last:border-0"
                                        >
                                            <span className="font-semibold text-gray-800">
                                                • {chk.benefit_name}
                                            </span>
                                            <span className="text-gray-500">
                                                {chk.checked_in_at} {chk.staff_name ? `(${chk.staff_name})` : ''}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

