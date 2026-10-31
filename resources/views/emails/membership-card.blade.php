<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thẻ Hội Viên: {{ $membershipType?->name ?? 'Hội Viên' }}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0f172a; padding: 32px 16px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);">
                    
                    <!-- Header Banner -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #451a03 0%, #78350f 50%, #b45309 100%); padding: 36px 32px 28px 32px; text-align: center; color: #ffffff;">
                            <div style="display: inline-block; padding: 4px 14px; background-color: rgba(255, 255, 255, 0.2); border-radius: 9999px; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #fef3c7; margin-bottom: 12px;">
                                PHÁP TẠNG • ĐẶC QUYỀN HỘI VIÊN
                            </div>
                            <h1 style="margin: 0; font-size: 26px; font-weight: 800; line-height: 1.3; color: #ffffff; letter-spacing: -0.5px;">
                                Thẻ Hội Viên: {{ $membershipType?->name ?? 'Hội Viên' }}
                            </h1>
                            <p style="margin: 8px 0 0 0; font-size: 14px; color: #fde68a;">
                                Kính chúc quý hội viên an lạc, cát tường và tinh tấn!
                            </p>
                        </td>
                    </tr>

                    <!-- Member Info & Card Overview -->
                    <tr>
                        <td style="padding: 24px 32px 0 32px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 16px; padding: 16px;">
                                <tr>
                                    <td width="50%" style="vertical-align: top; padding-right: 12px;">
                                        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #854d0e; letter-spacing: 0.5px; margin-bottom: 4px;">
                                            👤 Hội Viên
                                        </div>
                                        <div style="font-size: 16px; font-weight: 800; color: #451a03; line-height: 1.3;">
                                            {{ $card->customer_name }}
                                        </div>
                                        <div style="font-size: 13px; color: #713f12; margin-top: 4px;">
                                            📞 {{ $card->customer_phone }}
                                        </div>
                                        @if($card->customer_dob)
                                            <div style="font-size: 12px; color: #854d0e; margin-top: 2px;">
                                                🎂 {{ $card->customer_dob->format('d/m/Y') }}
                                            </div>
                                        @endif
                                    </td>
                                    <td width="50%" style="vertical-align: top; padding-left: 12px; border-left: 1px solid #fef08a;">
                                        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #854d0e; letter-spacing: 0.5px; margin-bottom: 4px;">
                                            📅 Thời Hạn Sử Dụng
                                        </div>
                                        <div style="font-size: 14px; font-weight: 700; color: #451a03; line-height: 1.4;">
                                            Từ: {{ $card->issued_at?->format('d/m/Y') }}<br>
                                            Đến: <span style="color: #b45309;">{{ $card->expires_at?->format('d/m/Y') }}</span>
                                        </div>
                                        <div style="display: inline-block; margin-top: 6px; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; background-color: #dcfce7; color: #166534;">
                                            ĐANG HOẠT ĐỘNG
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- QR Code Pass Section -->
                    <tr>
                        <td align="center" style="padding: 28px 32px 20px 32px;">
                            <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 20px; padding: 24px; display: inline-block; max-width: 320px; width: 100%; box-sizing: border-box;">
                                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px;">
                                    MÃ QUÉT NHẬN DIỆN HỘI VIÊN
                                </div>

                                <div style="background-color: #ffffff; padding: 12px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                                    <img src="{{ $qrImageUrl }}" alt="Mã QR Thẻ Hội Viên" width="200" height="200" style="display: block; border-radius: 8px; max-width: 100%; height: auto;" />
                                </div>

                                <div style="margin-top: 14px; font-family: 'Courier New', Courier, monospace; font-size: 17px; font-weight: 800; letter-spacing: 2px; color: #0f172a;">
                                    {{ $card->card_code }}
                                </div>
                                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                                    Xuất trình mã QR tại quầy tiếp đón để được quét và sử dụng ưu đãi
                                </div>
                            </div>
                        </td>
                    </tr>

                    <!-- Promotion Programs / Benefits -->
                    @if(!empty($card->card_benefits))
                        <tr>
                            <td style="padding: 0 32px 24px 32px;">
                                <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                    <h3 style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                                        🎁 Danh Sách Quyền Lợi & Ưu Đãi
                                    </h3>
                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                        @foreach($card->card_benefits as $benefit)
                                            <tr>
                                                <td style="padding: 8px 0; border-bottom: 1px dashed #f1f5f9;">
                                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                                        <tr>
                                                            <td style="vertical-align: top; padding-right: 8px;">
                                                                <span style="display: inline-block; width: 6px; height: 6px; background-color: #d97706; border-radius: 50%; margin-top: 6px;"></span>
                                                            </td>
                                                            <td style="vertical-align: top; font-size: 13px; font-weight: 600; color: #334155; line-height: 1.4;">
                                                                {{ $benefit['name'] ?? '' }}
                                                            </td>
                                                            <td align="right" style="vertical-align: top; font-size: 12px; font-weight: 700; color: #854d0e; white-space: nowrap; padding-left: 12px;">
                                                                @if(($benefit['usage_count'] ?? 0) > 0)
                                                                    {{ $benefit['remaining_count'] ?? $benefit['usage_count'] }} / {{ $benefit['usage_count'] }} lượt
                                                                @else
                                                                    Áp dụng chung
                                                                @endif
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        @endforeach
                                    </table>
                                </div>
                            </td>
                        </tr>
                    @endif

                    <!-- Guidelines Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #f1f5f9; text-align: center;">
                            <div style="font-size: 11px; color: #64748b; line-height: 1.6;">
                                Thẻ cá nhân • Tối đa 1 lượt/ngày • Không cộng dồn ưu đãi •<br>
                                Mọi thắc mắc xin vui lòng liên hệ ban tiếp đón hoặc lễ tân để được hỗ trợ chu đáo nhất.
                            </div>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>

