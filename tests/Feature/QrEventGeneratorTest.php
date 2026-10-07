<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\QrEventGenerator\Models\Event;
use App\Modules\QrEventGenerator\Models\EventAttendee;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QrEventGeneratorTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create([
            'role' => 'admin',
        ]);
    }

    public function test_admin_can_view_events_list(): void
    {
        Event::create([
            'user_id' => $this->adminUser->id,
            'name' => 'VIP Tech Gala',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->get(route('admin.qr_events.index'));

        $response->assertOk();
    }

    public function test_admin_can_create_new_event(): void
    {
        $response = $this->actingAs($this->adminUser)
            ->post(route('admin.qr_events.store'), [
                'name' => 'Annual Store Anniversary',
                'description' => 'Special discount and gifts for VIP attendees',
                'location' => 'Store 101 Main Street',
                'event_date' => now()->addDays(5)->toDateTimeString(),
                'status' => 'active',
            ]);

        $this->assertDatabaseHas('qr_events', [
            'name' => 'Annual Store Anniversary',
            'status' => 'active',
        ]);

        $event = Event::where('name', 'Annual Store Anniversary')->first();
        $response->assertRedirect(route('admin.qr_events.show', $event));
    }

    public function test_admin_can_create_attendee_with_auto_generated_qr_code(): void
    {
        $event = Event::create([
            'user_id' => $this->adminUser->id,
            'name' => 'Grand Opening',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->post(route('admin.qr_events.attendees.store', $event), [
                'full_name' => 'Nguyen Van Customer',
                'phone' => '0987654321',
                'email' => 'customer@example.com',
                'notes' => 'Invited by manager',
            ]);

        $response->assertRedirect(route('admin.qr_events.show', $event));

        $attendee = EventAttendee::where('event_id', $event->id)->first();
        $this->assertNotNull($attendee);
        $this->assertEquals('Nguyen Van Customer', $attendee->full_name);
        $this->assertEquals('0987654321', $attendee->phone);
        $this->assertStringStartsWith('TK-', $attendee->ticket_code);
        $this->assertEquals('pending', $attendee->status);

        // Verify show page renders properly with attendee and attached QR data uri
        $showResponse = $this->actingAs($this->adminUser)
            ->get(route('admin.qr_events.show', $event));
        $showResponse->assertOk();
    }

    public function test_admin_can_download_ticket_svg_and_qr_png(): void
    {
        $event = Event::create([
            'user_id' => $this->adminUser->id,
            'name' => 'Autumn Expo',
            'status' => 'active',
        ]);

        $attendee = $event->attendees()->create([
            'full_name' => 'Tran Thi B',
            'phone' => '0901234567',
            'status' => 'pending',
        ]);

        // Download SVG Ticket
        $svgResponse = $this->actingAs($this->adminUser)
            ->get(route('admin.qr_events.attendees.download_ticket', $attendee));

        $svgResponse->assertOk();
        $this->assertStringContainsString('image/svg+xml', $svgResponse->headers->get('Content-Type'));
        $this->assertStringContainsString('Tran Thi B', $svgResponse->getContent());
        $this->assertStringContainsString($attendee->ticket_code, $svgResponse->getContent());

        // Download QR PNG
        $pngResponse = $this->actingAs($this->adminUser)
            ->get(route('admin.qr_events.attendees.qr_image', ['attendee' => $attendee, 'download' => 1]));

        $pngResponse->assertOk();
        $this->assertStringContainsString('image/png', $pngResponse->headers->get('Content-Type'));
    }

    public function test_scanner_can_lookup_attendee_by_ticket_code_or_url(): void
    {
        $event = Event::create([
            'user_id' => $this->adminUser->id,
            'name' => 'Winter Sale Showcase',
            'status' => 'active',
        ]);

        $attendee = $event->attendees()->create([
            'full_name' => 'Le Van C',
            'phone' => '0911223344',
            'status' => 'pending',
        ]);

        // Lookup by raw ticket code
        $rawLookup = $this->actingAs($this->adminUser)
            ->postJson(route('admin.qr_events.scanner.lookup'), [
                'code' => $attendee->ticket_code,
            ]);

        $rawLookup->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('attendee.full_name', 'Le Van C')
            ->assertJsonPath('attendee.status', 'pending');

        // Lookup by full verification URL
        $urlLookup = $this->actingAs($this->adminUser)
            ->postJson(route('admin.qr_events.scanner.lookup'), [
                'code' => "https://example.com/admin/qr-events/check-in/{$attendee->ticket_code}",
            ]);

        $urlLookup->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('attendee.full_name', 'Le Van C');
    }

    public function test_scanner_can_perform_check_in_and_prevents_duplicate(): void
    {
        $event = Event::create([
            'user_id' => $this->adminUser->id,
            'name' => 'Summer Fest',
            'status' => 'active',
        ]);

        $attendee = $event->attendees()->create([
            'full_name' => 'Pham Thi D',
            'phone' => '0933445566',
            'status' => 'pending',
        ]);

        // 1st Check-in: Should succeed
        $checkInResponse = $this->actingAs($this->adminUser)
            ->postJson(route('admin.qr_events.scanner.check_in'), [
                'code' => $attendee->ticket_code,
            ]);

        $checkInResponse->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('attendee.status', 'checked_in');

        $attendee->refresh();
        $this->assertEquals('checked_in', $attendee->status);
        $this->assertNotNull($attendee->checked_in_at);
        $this->assertEquals($this->adminUser->id, $attendee->checked_in_by);

        // 2nd Check-in: Should return 409 already checked in
        $duplicateResponse = $this->actingAs($this->adminUser)
            ->postJson(route('admin.qr_events.scanner.check_in'), [
                'code' => $attendee->ticket_code,
            ]);

        $duplicateResponse->assertStatus(409)
            ->assertJsonPath('success', false)
            ->assertJsonPath('already_checked_in', true);
    }

    public function test_direct_check_in_page_renders_successfully(): void
    {
        $event = Event::create([
            'user_id' => $this->adminUser->id,
            'name' => 'Exclusive Member Day',
            'status' => 'active',
        ]);

        $attendee = $event->attendees()->create([
            'full_name' => 'Hoang E',
            'phone' => '0977889900',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->get(route('admin.qr_events.scanner.direct_check_in', $attendee->ticket_code));

        $response->assertOk();
    }

    public function test_admin_creates_attendee_with_email_sends_ticket_email(): void
    {
        \Illuminate\Support\Facades\Mail::fake();

        $event = Event::create([
            'user_id' => $this->adminUser->id,
            'name' => 'Customer Gala 2026',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->post(route('admin.qr_events.attendees.store', $event), [
                'full_name' => 'Tran Thi Huong',
                'phone' => '0912345678',
                'email' => 'huong@example.com',
                'notes' => 'VIP Customer',
            ]);

        $response->assertRedirect(route('admin.qr_events.show', $event));

        $attendee = EventAttendee::where('email', 'huong@example.com')->first();
        $this->assertNotNull($attendee);
        $this->assertTrue($attendee->is_email_sent);
        $this->assertNotNull($attendee->email_sent_at);

        \Illuminate\Support\Facades\Mail::assertSent(\App\Modules\QrEventGenerator\Mail\EventTicketMail::class, function ($mail) use ($attendee) {
            return $mail->hasTo('huong@example.com') && $mail->attendee->id === $attendee->id;
        });
    }

    public function test_admin_creates_attendee_without_email_does_not_send_mail(): void
    {
        \Illuminate\Support\Facades\Mail::fake();

        $event = Event::create([
            'user_id' => $this->adminUser->id,
            'name' => 'Pop-up Workshop',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->adminUser)
            ->post(route('admin.qr_events.attendees.store', $event), [
                'full_name' => 'Pham Van Dung',
                'phone' => '0933445566',
                'email' => null,
            ]);

        $response->assertRedirect(route('admin.qr_events.show', $event));

        $attendee = EventAttendee::where('phone', '0933445566')->first();
        $this->assertNotNull($attendee);
        $this->assertFalse($attendee->is_email_sent);
        $this->assertNull($attendee->email_sent_at);

        \Illuminate\Support\Facades\Mail::assertNothingSent();
    }

    public function test_admin_can_resend_ticket_email_for_attendee(): void
    {
        \Illuminate\Support\Facades\Mail::fake();

        $event = Event::create([
            'user_id' => $this->adminUser->id,
            'name' => 'Product Launch Event',
            'status' => 'active',
        ]);

        $attendee = $event->attendees()->create([
            'full_name' => 'Do Van Nam',
            'phone' => '0944556677',
            'email' => 'nam@example.com',
            'status' => 'pending',
            'is_email_sent' => false,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->post(route('admin.qr_events.attendees.resend_ticket', $attendee));

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $attendee->refresh();
        $this->assertTrue($attendee->is_email_sent);
        $this->assertNotNull($attendee->email_sent_at);

        \Illuminate\Support\Facades\Mail::assertSent(\App\Modules\QrEventGenerator\Mail\EventTicketMail::class, function ($mail) use ($attendee) {
            return $mail->hasTo('nam@example.com') && $mail->attendee->id === $attendee->id;
        });
    }

    public function test_resend_ticket_fails_if_attendee_has_no_email(): void
    {
        \Illuminate\Support\Facades\Mail::fake();

        $event = Event::create([
            'user_id' => $this->adminUser->id,
            'name' => 'Exclusive Dinner',
            'status' => 'active',
        ]);

        $attendee = $event->attendees()->create([
            'full_name' => 'Vo Thi Mai',
            'phone' => '0955667788',
            'email' => null,
            'status' => 'pending',
            'is_email_sent' => false,
        ]);

        $response = $this->actingAs($this->adminUser)
            ->post(route('admin.qr_events.attendees.resend_ticket', $attendee));

        $response->assertRedirect();
        $response->assertSessionHas('error');

        $attendee->refresh();
        $this->assertFalse($attendee->is_email_sent);
        \Illuminate\Support\Facades\Mail::assertNothingSent();
    }

    public function test_event_ticket_mail_content_uses_linked_qr_image(): void
    {
        $event = Event::create([
            'user_id' => $this->adminUser->id,
            'name' => 'Annual Summit',
            'location' => 'Grand Palace, HCM',
            'event_date' => now()->addDays(2),
            'status' => 'active',
        ]);

        $attendee = $event->attendees()->create([
            'full_name' => 'Le Thi Kieu',
            'phone' => '0988776655',
            'email' => 'kieu@example.com',
            'status' => 'pending',
        ]);

        $qrService = app(\App\Modules\QrEventGenerator\Services\QrCodeService::class);
        $mailable = new \App\Modules\QrEventGenerator\Mail\EventTicketMail($attendee, $qrService);

        $mailable->assertHasSubject("🎫 [Vé Tham Dự] Annual Summit - Mã vé: {$attendee->ticket_code}");
        $mailable->assertSeeInHtml('Le Thi Kieu');
        $mailable->assertSeeInHtml($attendee->ticket_code);
        $mailable->assertSeeInHtml('Grand Palace, HCM');

        // Verify linked image URL is present in the rendered HTML
        $expectedUrl = $qrService->getQrImageUrl($attendee);
        $mailable->assertSeeInHtml($expectedUrl);
        $mailable->assertDontSeeInHtml('Xem Thẻ Vé Trực Tuyến');
        $mailable->assertDontSeeInHtml($qrService->getVerificationUrl($attendee));
    }

    public function test_qr_code_is_stored_on_server_and_publicly_accessible(): void
    {
        \Illuminate\Support\Facades\Storage::fake('public');

        $event = Event::create([
            'user_id' => $this->adminUser->id,
            'name' => 'Store Tech Showcase',
            'status' => 'active',
        ]);

        $attendee = $event->attendees()->create([
            'full_name' => 'Tran Van Dat',
            'phone' => '0977665544',
            'status' => 'pending',
        ]);

        $qrService = app(\App\Modules\QrEventGenerator\Services\QrCodeService::class);
        $storedPath = $qrService->storeQrImage($attendee);

        \Illuminate\Support\Facades\Storage::disk('public')->assertExists($storedPath);
        $this->assertEquals("qr-codes/{$attendee->ticket_code}.png", $storedPath);

        // Verify public route renders PNG image
        $response = $this->get(route('qr_events.public_qr_image', $attendee->ticket_code));
        $response->assertOk();
        $this->assertEquals('image/png', $response->headers->get('Content-Type'));
    }
}
