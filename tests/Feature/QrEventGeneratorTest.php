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
}
