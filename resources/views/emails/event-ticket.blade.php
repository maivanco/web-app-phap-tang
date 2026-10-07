<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vé Tham Dự Sự Kiện: {{ $event?->name ?? 'Sự Kiện' }}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0f172a; padding: 32px 16px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);">
                    
                    <!-- Header Banner -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%); padding: 36px 32px 28px 32px; text-align: center; color: #ffffff;">
                            <div style="display: inline-block; padding: 4px 14px; background-color: rgba(255, 255, 255, 0.15); border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #cbd5e1; margin-bottom: 12px;">
                                VÉ THAM DỰ CHÍNH THỨC
                            </div>
                            <h1 style="margin: 0; font-size: 24px; font-weight: 800; line-height: 1.3; color: #ffffff; letter-spacing: -0.5px;">
                                {{ $event?->name ?? 'Sự Kiện Đặc Biệt' }}
                            </h1>
                        </td>
                    </tr>

                    <!-- Event Quick Info Grid -->
                    <tr>
                        <td style="padding: 24px 32px 0 32px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px;">
                                <tr>
                                    <td width="50%" style="vertical-align: top; padding-right: 12px;">
                                        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px;">
                                            📅 Thời Gian
                                        </div>
                                        <div style="font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1.4;">
                                            @if($event?->event_date)
                                                {{ $event->event_date->format('H:i - d/m/Y') }}
                                            @else
                                                Thời gian linh hoạt
                                            @endif
                                        </div>
                                    </td>
                                    <td width="50%" style="vertical-align: top; padding-left: 12px; border-left: 1px solid #e2e8f0;">
                                        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px;">
                                            📍 Địa Điểm
                                        </div>
                                        <div style="font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1.4;">
                                            {{ $event?->location ?? 'Địa điểm sự kiện' }}
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Attendee Details -->
                    <tr>
                        <td style="padding: 24px 32px 16px 32px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td>
                                        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px;">
                                            Khách Hàng
                                        </div>
                                        <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px;">
                                            {{ $attendee->full_name }}
                                        </div>
                                        <div style="font-size: 13px; color: #64748b; margin-top: 2px;">
                                            📞 {{ $attendee->phone }}
                                        </div>
                                    </td>
                                    <td align="right" style="vertical-align: top;">
                                        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px;">
                                            Trạng Thái
                                        </div>
                                        <div style="margin-top: 4px; display: inline-block; padding: 4px 10px; background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; font-size: 12px; font-weight: 700; color: #047857;">
                                            {{ strtoupper($attendee->status) }}
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Perforated Line Decoration -->
                    <tr>
                        <td style="padding: 8px 0;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td width="16" style="background-color: #0f172a; height: 32px; border-radius: 0 16px 16px 0;"></td>
                                    <td style="border-top: 2px dashed #cbd5e1; height: 32px;"></td>
                                    <td width="16" style="background-color: #0f172a; height: 32px; border-radius: 16px 0 0 16px;"></td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- QR Code Showcase Card -->
                    <tr>
                        <td align="center" style="padding: 16px 32px 24px 32px;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border: 2px solid #e2e8f0; border-radius: 20px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); padding: 16px;">
                                <tr>
                                    <td align="center">
                                        @if(!empty($qrImageUrl))
                                            <img src="{{ $qrImageUrl }}" alt="Mã QR vé: {{ $attendee->ticket_code }}" width="220" height="220" style="display: block; width: 220px; height: 220px; border-radius: 8px; border: 0;" />
                                        @elseif(!empty($qrPngBinary))
                                            <img src="data:image/png;base64,{{ base64_encode($qrPngBinary) }}" alt="Mã QR vé: {{ $attendee->ticket_code }}" width="220" height="220" style="display: block; width: 220px; height: 220px; border-radius: 8px; border: 0;" />
                                        @endif
                                    </td>
                                </tr>
                            </table>

                            <!-- Ticket Code Badge -->
                            <div style="margin-top: 16px; display: inline-block; padding: 6px 18px; background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 10px; font-family: monospace; font-size: 16px; font-weight: 800; color: #4338ca; letter-spacing: 2px;">
                                {{ $attendee->ticket_code }}
                            </div>

                            <p style="margin: 14px 0 0 0; font-size: 13px; font-weight: 500; color: #475569; max-width: 380px; line-height: 1.5;">
                                Xuất trình mã QR này tại quầy đón tiếp của sự kiện để nhân viên quét và hoàn tất thủ tục check-in.
                            </p>

                            @if(!empty($verificationUrl))
                                <div style="margin-top: 20px;">
                                    <a href="{{ $verificationUrl }}" target="_blank" style="display: inline-block; padding: 12px 28px; background-color: #4338ca; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; border-radius: 12px; box-shadow: 0 4px 10px rgba(67, 56, 202, 0.3);">
                                        Xem Thẻ Vé Trực Tuyến &rarr;
                                    </a>
                                </div>
                            @endif
                        </td>
                    </tr>

                    @if($event?->description)
                    <!-- Event Note/Description -->
                    <tr>
                        <td style="padding: 0 32px 24px 32px;">
                            <div style="background-color: #f1f5f9; border-radius: 12px; padding: 14px 18px; font-size: 12px; color: #475569; line-height: 1.6;">
                                <strong style="color: #1e293b; display: block; margin-bottom: 2px;">Thông tin lưu ý từ ban tổ chức:</strong>
                                {{ $event->description }}
                            </div>
                        </td>
                    </tr>
                    @endif

                    <!-- Footer Note -->
                    <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.6;">
                            <p style="margin: 0;">
                                Vé này có giá trị xác thực 1 lần khi check-in tại sự kiện. Vui lòng xuất trình mã QR này cho nhân viên khi đến tham dự.
                            </p>
                            <p style="margin: 6px 0 0 0; color: #cbd5e1;">
                                &copy; {{ date('Y') }} {{ config('app.name', 'Hệ Thống Sự Kiện') }}. Mọi quyền được bảo lưu.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
