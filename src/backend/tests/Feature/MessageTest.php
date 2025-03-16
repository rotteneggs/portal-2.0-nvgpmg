<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase; // Laravel ^10.0
use Illuminate\Foundation\Testing\WithFaker; // Laravel ^10.0
use App\Models\User;
use App\Models\Application;
use App\Models\Message;
use App\Models\MessageAttachment;
use App\Services\MessageService;
use App\Services\StorageService;
use App\Events\NewMessageEvent;
use Illuminate\Support\Facades\Event; // Laravel ^10.0
use Illuminate\Support\Facades\Storage; // Laravel ^10.0
use Illuminate\Http\Testing\File as UploadedFile; // illuminate/http ^10.0
use Tests\TestCase;

class MessageTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    /**
     * Indicates whether the default seeder should run before each test.
     */
    protected bool $seed = false;

    /**
     * Default constructor provided by PHPUnit
     */
    public function __construct(?string $name = null, array $data = [], $dataName = '')
    {
        parent::__construct($name, $data, $dataName);
    }

    /**
     * Set up the test environment before each test
     *
     * @return void
     */
    protected function setUp(): void
    {
        parent::setUp();

        // Configure Storage facade to use the 'testing' disk
        Storage::fake('testing');

        // Create a fake disk for testing file uploads
        $this->fakeStorage('testing');
    }

    /**
     * Test that a user can retrieve their messages
     *
     * @return void
     */
    public function test_user_can_get_messages(): void
    {
        // Create a sender user
        $sender = $this->createUser();

        // Create a recipient user
        $recipient = $this->createUser();

        // Create multiple messages between the users
        Message::factory(5)->create(['sender_user_id' => $sender->id, 'recipient_user_id' => $recipient->id]);
        Message::factory(3)->create(['sender_user_id' => $recipient->id, 'recipient_user_id' => $sender->id]);

        // Authenticate as the recipient
        $this->actingAs($recipient);

        // Make a GET request to /api/v1/messages
        $response = $this->getJson('/api/v1/messages');

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert response structure includes success, data, and meta fields
        $response->assertJsonStructure(['success', 'data' => ['*' => ['id', 'subject', 'preview', 'sender', 'created_at', 'is_read', 'has_attachments']], 'meta' => ['current_page', 'per_page', 'total', 'last_page']]);

        // Assert data contains the expected number of messages
        $response->assertJson(['meta' => ['total' => 8]]);

        // Assert messages are ordered by created_at in descending order (newest first)
        $messages = $response->json('data');
        $this->assertTrue(Carbon::parse($messages[0]['created_at']) > Carbon::parse(end($messages)['created_at']));
    }

    /**
     * Test that a user can send a new message
     *
     * @return void
     */
    public function test_user_can_send_message(): void
    {
        // Create a sender user
        $sender = $this->createUser();

        // Create a recipient user
        $recipient = $this->createUser();

        // Authenticate as the sender
        $this->actingAs($sender);

        // Fake the event dispatcher to catch NewMessageEvent
        Event::fake([NewMessageEvent::class]);

        // Prepare message data (recipient_id, subject, message_body)
        $messageData = [
            'recipient_id' => $recipient->id,
            'subject' => 'Test Subject',
            'message_body' => 'Test message body',
        ];

        // Make a POST request to /api/v1/messages with the message data
        $response = $this->postJson('/api/v1/messages', $messageData);

        // Assert response status is 201
        $response->assertStatus(201);

        // Assert response structure includes success and data fields
        $response->assertJsonStructure(['success', 'data' => ['id', 'subject', 'message_body', 'sender', 'recipient', 'created_at', 'is_read', 'has_attachments']]);

        // Assert the message data in the response matches the sent data
        $response->assertJson(['data' => ['subject' => 'Test Subject', 'message_body' => 'Test message body']]);

        // Assert the message exists in the database
        $this->assertDatabaseHas('messages', [
            'sender_user_id' => $sender->id,
            'recipient_user_id' => $recipient->id,
            'subject' => 'Test Subject',
            'message_body' => 'Test message body',
        ]);

        // Assert that NewMessageEvent was dispatched
        Event::assertDispatched(NewMessageEvent::class, function ($event) use ($sender, $recipient) {
            return $event->message->sender_user_id === $sender->id && $event->message->recipient_user_id === $recipient->id;
        });
    }

    /**
     * Test that a user can send a message related to an application
     *
     * @return void
     */
    public function test_user_can_send_message_with_application_reference(): void
    {
        // Create a sender user
        $sender = $this->createUser();

        // Create a recipient user
        $recipient = $this->createUser();

        // Create an application for the sender
        $application = $this->createApplication($sender);

        // Authenticate as the sender
        $this->actingAs($sender);

        // Prepare message data including application_id
        $messageData = [
            'recipient_id' => $recipient->id,
            'subject' => 'Test Subject',
            'message_body' => 'Test message body',
            'application_id' => $application->id,
        ];

        // Make a POST request to /api/v1/messages with the message data
        $response = $this->postJson('/api/v1/messages', $messageData);

        // Assert response status is 201
        $response->assertStatus(201);

        // Assert the message in the database has the correct application_id
        $this->assertDatabaseHas('messages', [
            'sender_user_id' => $sender->id,
            'recipient_user_id' => $recipient->id,
            'application_id' => $application->id,
        ]);

        // Make a GET request to /api/v1/messages/application/{applicationId}
        $response = $this->getJson("/api/v1/messages/application/{$application->id}");

        // Assert the response contains the message related to the application
        $response->assertJsonFragment(['application_id' => $application->id]);
    }

    /**
     * Test that a user can view a specific message
     *
     * @return void
     */
    public function test_user_can_view_specific_message(): void
    {
        // Create a sender user
        $sender = $this->createUser();

        // Create a recipient user
        $recipient = $this->createUser();

        // Create a message from sender to recipient
        $message = $this->createMessage($sender, $recipient);

        // Authenticate as the recipient
        $this->actingAs($recipient);

        // Make a GET request to /api/v1/messages/{id}
        $response = $this->getJson("/api/v1/messages/{$message->id}");

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert response contains the correct message data
        $response->assertJson(['success' => true, 'data' => ['id' => $message->id, 'subject' => $message->subject, 'message_body' => $message->message_body]]);

        // Assert response includes sender and recipient information
        $response->assertJsonStructure(['data' => ['sender' => ['id', 'email'], 'recipient' => ['id', 'email']]]);
    }

    /**
     * Test that a user cannot view a message they are not a participant in
     *
     * @return void
     */
    public function test_user_cannot_view_message_not_addressed_to_them(): void
    {
        // Create a sender user
        $sender = $this->createUser();

        // Create a recipient user
        $recipient = $this->createUser();

        // Create a third user (unauthorized)
        $unauthorizedUser = $this->createUser();

        // Create a message from sender to recipient
        $message = $this->createMessage($sender, $recipient);

        // Authenticate as the unauthorized user
        $this->actingAs($unauthorizedUser);

        // Make a GET request to /api/v1/messages/{id}
        $response = $this->getJson("/api/v1/messages/{$message->id}");

        // Assert response status is 403 (Forbidden)
        $response->assertStatus(403);
    }

    /**
     * Test that a user can reply to a message
     *
     * @return void
     */
    public function test_user_can_reply_to_message(): void
    {
        // Create a sender user
        $sender = $this->createUser();

        // Create a recipient user
        $recipient = $this->createUser();

        // Create a message from sender to recipient
        $message = $this->createMessage($sender, $recipient);

        // Authenticate as the recipient
        $this->actingAs($recipient);

        // Fake the event dispatcher to catch NewMessageEvent
        Event::fake([NewMessageEvent::class]);

        // Prepare reply data (message_body)
        $replyData = [
            'message_body' => 'This is a reply message body',
        ];

        // Make a POST request to /api/v1/messages/{id}/reply with the reply data
        $response = $this->postJson("/api/v1/messages/{$message->id}/reply", $replyData);

        // Assert response status is 201
        $response->assertStatus(201);

        // Assert the reply in the database has the correct data
        $this->assertDatabaseHas('messages', [
            'sender_user_id' => $recipient->id,
            'recipient_user_id' => $sender->id,
            'message_body' => 'This is a reply message body',
        ]);

        // Assert the reply subject starts with 'Re: '
        $reply = Message::where('sender_user_id', $recipient->id)->first();
        $this->assertStringStartsWith('Re: ', $reply->subject);

        // Assert that NewMessageEvent was dispatched
        Event::assertDispatched(NewMessageEvent::class);
    }

    /**
     * Test that a user can mark a message as read
     *
     * @return void
     */
    public function test_user_can_mark_message_as_read(): void
    {
        // Create a sender user
        $sender = $this->createUser();

        // Create a recipient user
        $recipient = $this->createUser();

        // Create an unread message from sender to recipient
        $message = $this->createMessage($sender, $recipient, ['is_read' => false]);

        // Authenticate as the recipient
        $this->actingAs($recipient);

        // Make a POST request to /api/v1/messages/{id}/read
        $response = $this->postJson("/api/v1/messages/{$message->id}/read");

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert the message in the database is marked as read
        $this->assertDatabaseHas('messages', [
            'id' => $message->id,
            'is_read' => true,
        ]);

        // Assert the read_at timestamp is set
        $message->refresh();
        $this->assertNotNull($message->read_at);
    }

    /**
     * Test that a user can mark a message as unread
     *
     * @return void
     */
    public function test_user_can_mark_message_as_unread(): void
    {
        // Create a sender user
        $sender = $this->createUser();

        // Create a recipient user
        $recipient = $this->createUser();

        // Create a read message from sender to recipient
        $message = $this->createMessage($sender, $recipient, ['is_read' => true]);

        // Authenticate as the recipient
        $this->actingAs($recipient);

        // Make a POST request to /api/v1/messages/{id}/unread
        $response = $this->postJson("/api/v1/messages/{$message->id}/unread");

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert the message in the database is marked as unread
        $this->assertDatabaseHas('messages', [
            'id' => $message->id,
            'is_read' => false,
        ]);

        // Assert the read_at timestamp is null
        $message->refresh();
        $this->assertNull($message->read_at);
    }

    /**
     * Test that a user can get their unread message count
     *
     * @return void
     */
    public function test_user_can_get_unread_count(): void
    {
        // Create a sender user
        $sender = $this->createUser();

        // Create a recipient user
        $recipient = $this->createUser();

        // Create multiple unread messages from sender to recipient
        Message::factory(3)->create(['sender_user_id' => $sender->id, 'recipient_user_id' => $recipient->id, 'is_read' => false]);

        // Create some read messages from sender to recipient
        Message::factory(2)->create(['sender_user_id' => $sender->id, 'recipient_user_id' => $recipient->id, 'is_read' => true]);

        // Authenticate as the recipient
        $this->actingAs($recipient);

        // Make a GET request to /api/v1/messages/unread-count
        $response = $this->getJson('/api/v1/messages/unread-count');

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert the unread count matches the expected number
        $response->assertJson(['success' => true, 'data' => 3]);
    }

    /**
     * Test that a user can get messages related to a specific application
     *
     * @return void
     */
    public function test_user_can_get_application_messages(): void
    {
        // Create a sender user
        $sender = $this->createUser();

        // Create a recipient user
        $recipient = $this->createUser();

        // Create an application for the sender
        $application = $this->createApplication($sender);

        // Create messages related to the application
        Message::factory(2)->create(['sender_user_id' => $sender->id, 'recipient_user_id' => $recipient->id, 'application_id' => $application->id]);

        // Create messages not related to the application
        Message::factory(3)->create(['sender_user_id' => $sender->id, 'recipient_user_id' => $recipient->id, 'application_id' => null]);

        // Authenticate as the sender
        $this->actingAs($sender);

        // Make a GET request to /api/v1/messages/application/{applicationId}
        $response = $this->getJson("/api/v1/messages/application/{$application->id}");

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert the response only contains messages related to the application
        $response->assertJson(['meta' => ['total' => 2]]);
    }

    /**
     * Test that a user can delete a message
     *
     * @return void
     */
    public function test_user_can_delete_message(): void
    {
        // Create a sender user
        $sender = $this->createUser();

        // Create a recipient user
        $recipient = $this->createUser();

        // Create a message from sender to recipient
        $message = $this->createMessage($sender, $recipient);

        // Authenticate as the sender
        $this->actingAs($sender);

        // Make a DELETE request to /api/v1/messages/{id}
        $response = $this->deleteJson("/api/v1/messages/{$message->id}");

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert the message is soft deleted in the database
        $this->assertSoftDeleted('messages', ['id' => $message->id]);
    }

    /**
     * Test that a user can send a message with an attachment
     *
     * @return void
     */
    public function test_user_can_send_message_with_attachment(): void
    {
        // Create a sender user
        $sender = $this->createUser();

        // Create a recipient user
        $recipient = $this->createUser();

        // Authenticate as the sender
        $this->actingAs($sender);

        // Create a fake file for the attachment
        $file = UploadedFile::fake()->create('test_attachment.pdf', 100, 'application/pdf');

        // Prepare message data with the attachment
        $messageData = [
            'recipient_id' => $recipient->id,
            'subject' => 'Test Subject with Attachment',
            'message_body' => 'Test message body with attachment',
            'attachments' => [$file],
        ];

        // Make a POST request to /api/v1/messages with the message data
        $response = $this->postJson('/api/v1/messages', $messageData);

        // Assert response status is 201
        $response->assertStatus(201);

        // Assert the message has an attachment in the database
        $message = Message::first();
        $this->assertNotNull($message->attachments()->first());

        // Assert the file was stored in the storage system
        $attachment = $message->attachments()->first();
        Storage::disk('testing')->assertExists($attachment->file_path);
    }

    /**
     * Test that a user can reply to a message with an attachment
     *
     * @return void
     */
    public function test_user_can_reply_with_attachment(): void
    {
        // Create a sender user
        $sender = $this->createUser();

        // Create a recipient user
        $recipient = $this->createUser();

        // Create a message from sender to recipient
        $message = $this->createMessage($sender, $recipient);

        // Authenticate as the recipient
        $this->actingAs($recipient);

        // Create a fake file for the attachment
        $file = UploadedFile::fake()->create('test_reply_attachment.pdf', 100, 'application/pdf');

        // Prepare reply data with the attachment
        $replyData = [
            'message_body' => 'This is a reply with an attachment',
            'attachments' => [$file],
        ];

        // Make a POST request to /api/v1/messages/{id}/reply with the reply data
        $response = $this->postJson("/api/v1/messages/{$message->id}/reply", $replyData);

        // Assert response status is 201
        $response->assertStatus(201);

        // Assert the reply has an attachment in the database
        $reply = Message::where('sender_user_id', $recipient->id)->first();
        $this->assertNotNull($reply->attachments()->first());

        // Assert the file was stored in the storage system
        $attachment = $reply->attachments()->first();
        Storage::disk('testing')->assertExists($attachment->file_path);
    }

    /**
     * Test that a user can get details of a message attachment
     *
     * @return void
     */
    public function test_user_can_get_attachment_details(): void
    {
        // Create a sender user
        $sender = $this->createUser();

        // Create a recipient user
        $recipient = $this->createUser();

        // Create a message with an attachment
        $message = $this->createMessageWithAttachment($sender->id, $recipient->id, [], []);

        // Authenticate as the recipient
        $this->actingAs($recipient);

        // Make a GET request to /api/v1/messages/attachments/{id}
        $response = $this->getJson("/api/v1/messages/attachments/{$message['attachment']->id}");

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert response contains the correct attachment details
        $response->assertJsonStructure(['success', 'data' => ['id', 'message_id', 'file_name', 'file_path', 'mime_type', 'file_size']]);
    }

    /**
     * Test that a user can get a download URL for an attachment
     *
     * @return void
     */
    public function test_user_can_download_attachment(): void
    {
        // Create a sender user
        $sender = $this->createUser();

        // Create a recipient user
        $recipient = $this->createUser();

        // Create a message with an attachment
        $message = $this->createMessageWithAttachment($sender->id, $recipient->id, [], []);

        // Mock the StorageService to return a temporary URL
        $mockStorageService = $this->mockService(StorageService::class, [
            'getTemporaryUrl' => 'http://example.com/temporary-url',
        ]);

        // Authenticate as the recipient
        $this->actingAs($recipient);

        // Make a GET request to /api/v1/messages/attachments/{id}/download
        $response = $this->getJson("/api/v1/messages/attachments/{$message['attachment']->id}/download");

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert response contains a download URL
        $response->assertJson(['success' => true, 'data' => 'http://example.com/temporary-url']);
    }

    /**
     * Test that a user can search their messages by content
     *
     * @return void
     */
    public function test_user_can_search_messages(): void
    {
        // Create a sender user
        $sender = $this->createUser();

        // Create a recipient user
        $recipient = $this->createUser();

        // Create messages with specific content to search for
        $this->createMessage($sender, $recipient, ['subject' => 'Important Information', 'message_body' => 'This message contains key details.']);
        $this->createMessage($sender, $recipient, ['subject' => 'Urgent Action Required', 'message_body' => 'Please respond to this immediately.']);

        // Create messages without the search term
        $this->createMessage($sender, $recipient, ['subject' => 'General Inquiry', 'message_body' => 'Thank you for your question.']);

        // Authenticate as the recipient
        $this->actingAs($recipient);

        // Make a GET request to /api/v1/messages/search?term={searchTerm}
        $response = $this->getJson('/api/v1/messages/search?term=Important');

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert the response only contains messages matching the search term
        $response->assertJson(['meta' => ['total' => 1]]);
    }

    /**
     * Test validation errors when sending a message with invalid data
     *
     * @return void
     */
    public function test_validation_errors_on_send_message(): void
    {
        // Create a sender user
        $sender = $this->createUser();

        // Authenticate as the sender
        $this->actingAs($sender);

        // Prepare invalid message data (missing required fields)
        $messageData = [];

        // Make a POST request to /api/v1/messages with the invalid data
        $response = $this->postJson('/api/v1/messages', $messageData);

        // Assert response status is 422 (Unprocessable Entity)
        $response->assertStatus(422);

        // Assert response contains validation error messages
        $response->assertJsonValidationErrors(['recipient_id', 'subject', 'message_body']);
    }

    /**
     * Test validation errors when replying to a message with invalid data
     *
     * @return void
     */
    public function test_validation_errors_on_reply(): void
    {
        // Create a sender user
        $sender = $this->createUser();

        // Create a recipient user
        $recipient = $this->createUser();

        // Create a message from sender to recipient
        $message = $this->createMessage($sender, $recipient);

        // Authenticate as the recipient
        $this->actingAs($recipient);

        // Prepare invalid reply data (empty message body)
        $replyData = [
            'message_body' => '',
        ];

        // Make a POST request to /api/v1/messages/{id}/reply with the invalid data
        $response = $this->postJson("/api/v1/messages/{$message->id}/reply", $replyData);

        // Assert response status is 422 (Unprocessable Entity)
        $response->assertStatus(422);

        // Assert response contains validation error messages
        $response->assertJsonValidationErrors(['message_body']);
    }

    /**
     * Test that an admin user can view messages between other users
     *
     * @return void
     */
    public function test_admin_can_view_all_messages(): void
    {
        // Create a sender user
        $sender = $this->createUser();

        // Create a recipient user
        $recipient = $this->createUser();

        // Create a message between sender and recipient
        $message = $this->createMessage($sender, $recipient);

        // Create an admin user
        $adminUser = $this->createAdminUser();

        // Authenticate as the admin user
        $this->actingAs($adminUser);

        // Make a GET request to /api/v1/admin/messages/{id}
        $response = $this->getJson("/api/v1/admin/messages/{$message->id}");

        // Assert response status is 200
        $response->assertStatus(200);

        // Assert response contains the message details
        $response->assertJson(['success' => true, 'data' => ['id' => $message->id, 'subject' => $message->subject]]);
    }

    /**
     * Helper method to create a test message
     *
     * @param  int  $senderId
     * @param  int  $recipientId
     * @param  array  $attributes
     * @return Message The created message instance
     */
    protected function createMessage(int $senderId, int $recipientId, array $attributes = []): Message
    {
        // Create a message using the Message factory with the given attributes
        $message = Message::factory()->make($attributes);

        // Set the sender_user_id and recipient_user_id
        $message->sender_user_id = $senderId;
        $message->recipient_user_id = $recipientId;

        // Save the message to the database
        $message->save();

        // Return the created message
        return $message;
    }

    /**
     * Helper method to create a test message with an attachment
     *
     * @param  int  $senderId
     * @param  int  $recipientId
     * @param  array  $messageAttributes
     * @param  array  $attachmentAttributes
     * @return array The created message and attachment instances
     */
    protected function createMessageWithAttachment(int $senderId, int $recipientId, array $messageAttributes = [], array $attachmentAttributes = []): array
    {
        // Create a message using the createMessage helper
        $message = $this->createMessage($senderId, $recipientId, $messageAttributes);

        // Create an attachment using the MessageAttachment factory
        $attachment = MessageAttachment::factory()->make($attachmentAttributes);

        // Associate the attachment with the message
        $attachment->message_id = $message->id;

        // Save the attachment to the database
        $attachment->save();

        // Return an array containing the message and attachment
        return ['message' => $message, 'attachment' => $attachment];
    }
}