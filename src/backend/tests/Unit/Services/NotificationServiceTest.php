<?php

namespace Tests\Unit\Services;

use App\Events\ApplicationStatusChangedEvent; // Laravel ^10.0
use App\Models\Application;
use App\Models\ApplicationStatus;
use App\Models\Notification;
use App\Models\NotificationRecipient;
use App\Models\User;
use App\Services\Integration\EmailService;
use App\Services\Integration\SMSService;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase; // Laravel ^10.0
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Redis;
use Mockery;
use Tests\TestCase;

class NotificationServiceTest extends TestCase
{
    /**
     * @var NotificationService
     */
    protected $notificationService;

    /**
     * @var Mockery\MockInterface
     */
    protected $emailService;

    /**
     * @var Mockery\MockInterface
     */
    protected $smsService;

    /**
     * @var User
     */
    protected $user;

    public function __construct(?string $name = null, array $data = [], $dataName = '')
    {
        parent::__construct($name, $data, $dataName);
    }

    /**
     * Set up the test environment before each test
     */
    protected function setUp(): void
    {
        parent::setUp();

        // Mock the EmailService using mockService()
        $this->emailService = $this->mockService(EmailService::class);

        // Mock the SMSService using mockService()
        $this->smsService = $this->mockService(SMSService::class);

        // Create a test user using createUser()
        $this->user = $this->createUser();

        // Create a NotificationService instance with the mocked dependencies
        $this->notificationService = new NotificationService($this->emailService, $this->smsService);

        // Configure test notification templates in the service
        $this->notificationService->registerTemplate(
            'test.template',
            'test_type',
            'Test Subject {name}',
            'Hello {name}, this is a test notification.',
            ['default' => 'Default Value']
        );
    }

    /**
     * Clean up the test environment after each test
     */
    protected function tearDown(): void
    {
        parent::tearDown();
    }

    /**
     * Test that send() creates a notification with the correct recipient
     */
    public function test_send_creates_notification_with_recipient(): void
    {
        // Configure the email service mock to return true for isEnabled()
        $this->emailService->shouldReceive('isEnabled')->andReturn(true);

        // Configure the email service mock to return true for sendNotification()
        $this->emailService->shouldReceive('sendNotification')->andReturn(true);

        // Call notificationService->send() with user ID, type, subject, content, and data
        $notification = $this->notificationService->send(
            $this->user->id,
            'test_type',
            'Test Subject',
            'Test Content',
            ['key' => 'value']
        );

        // Assert that a notification was created in the database
        $this->assertDatabaseHas('notifications', [
            'type' => 'test_type',
            'subject' => 'Test Subject',
            'content' => 'Test Content',
        ]);

        // Assert that the notification has the correct type, subject, and content
        $this->assertEquals('test_type', $notification->type);
        $this->assertEquals('Test Subject', $notification->subject);
        $this->assertEquals('Test Content', $notification->content);

        // Assert that the notification has the user as a recipient
        $this->assertDatabaseHas('notification_recipients', [
            'notification_id' => $notification->id,
            'user_id' => $this->user->id,
        ]);
    }

    /**
     * Test that sendToMultiple() creates a notification with multiple recipients
     */
    public function test_send_to_multiple_creates_notification_with_multiple_recipients(): void
    {
        // Create additional test users
        $user2 = $this->createUser();
        $user3 = $this->createUser();

        // Configure the email service mock to return true for isEnabled()
        $this->emailService->shouldReceive('isEnabled')->andReturn(true);

        // Configure the email service mock to return true for sendNotification()
        $this->emailService->shouldReceive('sendNotification')->andReturn(true);

        // Call notificationService->sendToMultiple() with user IDs, type, subject, content, and data
        $notification = $this->notificationService->sendToMultiple(
            [$this->user->id, $user2->id, $user3->id],
            'test_type',
            'Test Subject',
            'Test Content',
            ['key' => 'value']
        );

        // Assert that a notification was created in the database
        $this->assertDatabaseHas('notifications', [
            'type' => 'test_type',
            'subject' => 'Test Subject',
            'content' => 'Test Content',
        ]);

        // Assert that the notification has the correct type, subject, and content
        $this->assertEquals('test_type', $notification->type);
        $this->assertEquals('Test Subject', $notification->subject);
        $this->assertEquals('Test Content', $notification->content);

        // Assert that the notification has all users as recipients
        $this->assertDatabaseHas('notification_recipients', [
            'notification_id' => $notification->id,
            'user_id' => $this->user->id,
        ]);
        $this->assertDatabaseHas('notification_recipients', [
            'notification_id' => $notification->id,
            'user_id' => $user2->id,
        ]);
        $this->assertDatabaseHas('notification_recipients', [
            'notification_id' => $notification->id,
            'user_id' => $user3->id,
        ]);
    }

    /**
     * Test that sendFromTemplate() correctly uses template values
     */
    public function test_send_from_template_uses_template_values(): void
    {
        // Configure the email service mock to return true for isEnabled()
        $this->emailService->shouldReceive('isEnabled')->andReturn(true);

        // Configure the email service mock to return true for sendNotification()
        $this->emailService->shouldReceive('sendNotification')->andReturn(true);

        // Call notificationService->sendFromTemplate() with user ID, template key, and data
        $notification = $this->notificationService->sendFromTemplate(
            $this->user->id,
            'test.template',
            ['name' => 'Test User']
        );

        // Assert that a notification was created in the database
        $this->assertDatabaseHas('notifications', [
            'type' => 'test_type',
            'subject' => 'Test Subject Test User',
            'content' => 'Hello Test User, this is a test notification.',
        ]);

        // Assert that the notification has the template's type, subject, and content with placeholders replaced
        $this->assertEquals('test_type', $notification->type);
        $this->assertEquals('Test Subject Test User', $notification->subject);
        $this->assertEquals('Hello Test User, this is a test notification.', $notification->content);

        // Assert that the notification has the user as a recipient
        $this->assertDatabaseHas('notification_recipients', [
            'notification_id' => $notification->id,
            'user_id' => $this->user->id,
        ]);
    }

    /**
     * Test that markAsRead() updates the notification read status
     */
    public function test_mark_as_read_updates_notification_status(): void
    {
        // Create a notification with the test user as recipient
        $notification = $this->notificationService->send(
            $this->user->id,
            'test_type',
            'Test Subject',
            'Test Content'
        );

        // Call notificationService->markAsRead() with notification ID and user ID
        $result = $this->notificationService->markAsRead($notification->id, $this->user->id);

        // Assert that the notification recipient is marked as read
        $this->assertTrue($result);
        $this->assertDatabaseHas('notification_recipients', [
            'notification_id' => $notification->id,
            'user_id' => $this->user->id,
            'is_read' => true,
        ]);

        // Assert that the read_at timestamp is set
        $recipient = NotificationRecipient::where('notification_id', $notification->id)
            ->where('user_id', $this->user->id)
            ->first();
        $this->assertNotNull($recipient->read_at);
    }

    /**
     * Test that getUserNotifications() returns paginated results
     */
    public function test_get_user_notifications_returns_paginated_results(): void
    {
        // Create multiple notifications with the test user as recipient
        $notification1 = $this->notificationService->send(
            $this->user->id,
            'test_type',
            'Test Subject 1',
            'Test Content 1'
        );
        $notification2 = $this->notificationService->send(
            $this->user->id,
            'test_type',
            'Test Subject 2',
            'Test Content 2'
        );
        $notification3 = $this->notificationService->send(
            $this->user->id,
            'test_type',
            'Test Subject 3',
            'Test Content 3'
        );

        // Call notificationService->getUserNotifications() with user ID, page, and perPage
        $results = $this->notificationService->getUserNotifications($this->user->id, 1, 2);

        // Assert that the returned data has the correct pagination structure
        $this->assertArrayHasKey('data', $results);
        $this->assertArrayHasKey('pagination', $results);
        $this->assertArrayHasKey('total', $results['pagination']);
        $this->assertArrayHasKey('per_page', $results['pagination']);
        $this->assertArrayHasKey('current_page', $results['pagination']);
        $this->assertArrayHasKey('last_page', $results['pagination']);
        $this->assertArrayHasKey('from', $results['pagination']);
        $this->assertArrayHasKey('to', $results['pagination']);

        // Assert that the correct number of notifications are returned
        $this->assertCount(2, $results['data']);
        $this->assertEquals(3, $results['pagination']['total']);
        $this->assertEquals(2, $results['pagination']['per_page']);
        $this->assertEquals(1, $results['pagination']['current_page']);
        $this->assertEquals(2, $results['pagination']['last_page']);
        $this->assertEquals(1, $results['pagination']['from']);
        $this->assertEquals(2, $results['pagination']['to']);

        // Assert that the notifications have the correct data
        $this->assertEquals('Test Subject 1', $results['data'][0]->subject);
        $this->assertEquals('Test Subject 2', $results['data'][1]->subject);
    }

    /**
     * Test that getUnreadCount() returns the correct count of unread notifications
     */
    public function test_get_unread_count_returns_correct_count(): void
    {
        // Create multiple notifications with the test user as recipient
        $notification1 = $this->notificationService->send(
            $this->user->id,
            'test_type',
            'Test Subject 1',
            'Test Content 1'
        );
        $notification2 = $this->notificationService->send(
            $this->user->id,
            'test_type',
            'Test Subject 2',
            'Test Content 2'
        );
        $notification3 = $this->notificationService->send(
            $this->user->id,
            'test_type',
            'Test Subject 3',
            'Test Content 3'
        );

        // Mark some notifications as read
        $this->notificationService->markAsRead($notification1->id, $this->user->id);

        // Call notificationService->getUnreadCount() with user ID
        $unreadCount = $this->notificationService->getUnreadCount($this->user->id);

        // Assert that the returned count matches the expected number of unread notifications
        $this->assertEquals(2, $unreadCount);
    }

    /**
     * Test that sending via email channel calls the email service
     */
    public function test_send_via_email_calls_email_service(): void
    {
        // Configure the email service mock to return true for isEnabled()
        $this->emailService->shouldReceive('isEnabled')->andReturn(true);

        // Configure the email service mock to expect sendNotification() to be called once
        $this->emailService->shouldReceive('sendNotification')
            ->once()
            ->withAnyArgs()
            ->andReturn(true);

        // Call notificationService->send() with user ID, type, subject, content, and ['email'] as channels
        $this->notificationService->send(
            $this->user->id,
            'test_type',
            'Test Subject',
            'Test Content',
            [],
            ['email']
        );

        // Verify that the email service's sendNotification method was called
        $this->assertTrue(true); // Assertion is handled by Mockery expectation
    }

    /**
     * Test that sending via SMS channel calls the SMS service
     */
    public function test_send_via_sms_calls_sms_service(): void
    {
        // Configure the SMS service mock to return true for isEnabled()
        $this->smsService->shouldReceive('isEnabled')->andReturn(true);

        // Configure the SMS service mock to expect sendNotification() to be called once
        $this->smsService->shouldReceive('sendNotification')
            ->once()
            ->withAnyArgs()
            ->andReturn(true);

        // Call notificationService->send() with user ID, type, subject, content, and ['sms'] as channels
        $this->notificationService->send(
            $this->user->id,
            'test_type',
            'Test Subject',
            'Test Content',
            [],
            ['sms']
        );

        // Verify that the SMS service's sendNotification method was called
        $this->assertTrue(true); // Assertion is handled by Mockery expectation
    }

    /**
     * Test that sending via in-app channel publishes to Redis
     */
    public function test_send_via_in_app_publishes_to_redis(): void
    {
        // Mock the Redis facade to expect publish() to be called once
        Redis::shouldReceive('publish')
            ->once()
            ->with('user.' . $this->user->id, Mockery::any());

        // Call notificationService->send() with user ID, type, subject, content, and ['in-app'] as channels
        $this->notificationService->send(
            $this->user->id,
            'test_type',
            'Test Subject',
            'Test Content',
            [],
            ['in_app']
        );

        // Verify that Redis publish was called with the correct channel and data
        $this->assertTrue(true); // Assertion is handled by Mockery expectation
    }

    /**
     * Test that processApplicationStatusChangedEvent() sends a notification
     */
    public function test_process_application_status_changed_event_sends_notification(): void
    {
        // Create a test application owned by the test user
        $application = $this->createApplication($this->user);

        // Create a test application status
        $status = $this->createApplicationStatus($application, $this->user, ['status' => 'under_review']);

        // Create an ApplicationStatusChangedEvent with the application and status
        $event = new ApplicationStatusChangedEvent($application, $status);

        // Configure the email service mock to return true for isEnabled()
        $this->emailService->shouldReceive('isEnabled')->andReturn(true);

        // Configure the email service mock to return true for sendNotification()
        $this->emailService->shouldReceive('sendNotification')
            ->once()
            ->withAnyArgs()
            ->andReturn(true);

        // Call notificationService->processApplicationStatusChangedEvent() with the event
        $this->notificationService->processApplicationStatusChangedEvent($event);

        // Assert that a notification was created in the database
        $this->assertDatabaseHas('notifications', [
            'type' => 'application.status_changed.under_review',
        ]);

        // Assert that the notification has the correct type and content related to the status change
        $notification = Notification::where('type', 'application.status_changed.under_review')->first();
        $this->assertNotNull($notification);

        // Assert that the notification has the application owner as a recipient
        $this->assertDatabaseHas('notification_recipients', [
            'notification_id' => $notification->id,
            'user_id' => $this->user->id,
        ]);
    }

    /**
     * Test that user notification preferences affect which channels are used
     */
    public function test_user_preferences_affect_notification_channels(): void
    {
        // Create a user profile with specific notification preferences
        $preferences = [
            'test_type' => ['email'],
        ];
        $this->user->profile()->update(['notification_preferences' => $preferences]);

        // Configure the email service mock to return true for isEnabled()
        $this->emailService->shouldReceive('isEnabled')->andReturn(true);

        // Configure the SMS service mock to return true for isEnabled()
        $this->smsService->shouldReceive('isEnabled')->andReturn(true);

        // Configure both services to expect sendNotification() based on preferences
        $this->emailService->shouldReceive('sendNotification')
            ->once()
            ->withAnyArgs()
            ->andReturn(true);
        $this->smsService->shouldReceive('sendNotification')
            ->never();

        // Call notificationService->send() with user ID, type, subject, content, and no specific channels
        $this->notificationService->send(
            $this->user->id,
            'test_type',
            'Test Subject',
            'Test Content'
        );

        // Verify that the services were called according to the user preferences
        $this->assertTrue(true); // Assertion is handled by Mockery expectations
    }

    /**
     * Test that notification templates can be registered and retrieved
     */
    public function test_notification_templates_are_registered_correctly(): void
    {
        // Register a new template with the notification service
        $this->notificationService->registerTemplate(
            'new.template',
            'new_type',
            'New Subject',
            'New Content'
        );

        // Call the service's getTemplate method to retrieve the template
        $template = $this->notificationService->getTemplate('new.template');

        // Assert that the retrieved template matches the registered template
        $this->assertNotNull($template);
        $this->assertEquals('new_type', $template['type']);
        $this->assertEquals('New Subject', $template['subject']);
        $this->assertEquals('New Content', $template['content']);
    }

    /**
     * Test that queue can be enabled and disabled for notification processing
     */
    public function test_queue_can_be_enabled_and_disabled(): void
    {
        // Call notificationService->enableQueue()
        $this->notificationService->enableQueue();

        // Assert that isQueueEnabled() returns true
        $this->assertTrue($this->notificationService->isQueueEnabled());

        // Call notificationService->disableQueue()
        $this->notificationService->disableQueue();

        // Assert that isQueueEnabled() returns false
        $this->assertFalse($this->notificationService->isQueueEnabled());
    }
}