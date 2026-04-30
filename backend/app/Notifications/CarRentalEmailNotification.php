<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CarRentalEmailNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $subject,
        private readonly string $greeting,
        private readonly array $lines,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $message = (new MailMessage)
            ->subject($this->subject)
            ->greeting($this->greeting);

        foreach ($this->lines as $line) {
            $message->line($line);
        }

        return $message;
    }
}
