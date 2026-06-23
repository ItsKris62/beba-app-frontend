'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSocket } from '@/components/providers/SocketProvider';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/support/types';

export function SupportChat({
  ticketId,
  currentUserId,
  initialMessages,
}: {
  ticketId: string;
  currentUserId: string;
  token: string;
  tenantId: string;
  initialMessages: ChatMessage[];
}) {
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState(initialMessages);
  const [content, setContent] = useState('');
  const [isSending, setSending] = useState(false);
  const [isTyping, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit('join_ticket_room', { ticketId });

    const onMessage = (message: ChatMessage) => {
      if (message.ticketId !== ticketId) return;
      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) return current;
        return [...current, message];
      });
      setSending(false);
    };

    const onTyping = (event: { ticketId: string; userId: string; isTyping: boolean }) => {
      if (event.ticketId === ticketId && event.userId !== currentUserId) {
        setTyping(event.isTyping);
      }
    };

    socket.on('new_message', onMessage);
    socket.on('typing_indicator', onTyping);

    return () => {
      socket.off('new_message', onMessage);
      socket.off('typing_indicator', onTyping);
    };
  }, [connected, currentUserId, socket, ticketId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  function emitTyping() {
    if (!socket || !connected) return;

    socket.emit('typing_indicator', { ticketId, isTyping: true });
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);

    typingTimerRef.current = window.setTimeout(() => {
      socket.emit('typing_indicator', { ticketId, isTyping: false });
    }, 1200);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || !socket || !connected) return;

    setSending(true);
    socket.emit('send_message', {
      ticketId,
      content: trimmed,
      messageType: 'TEXT',
    });
    setContent('');
  }

  return (
    <section className="flex min-h-[560px] flex-col rounded-lg border bg-background">
      <div ref={listRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex min-h-72 items-center justify-center text-sm text-muted-foreground">
            No messages yet.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => {
              const mine = message.senderId === currentUserId;

              return (
                <div
                  key={message.id}
                  className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[82%] rounded-lg border px-3 py-2 text-sm',
                      mine ? 'bg-primary text-primary-foreground' : 'bg-muted',
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={cn(
                        'mt-2 text-[11px]',
                        mine ? 'text-primary-foreground/75' : 'text-muted-foreground',
                      )}
                    >
                      {new Intl.DateTimeFormat('en-KE', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(message.createdAt))}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="min-h-6 px-4 text-xs text-muted-foreground">
        {isTyping ? 'Support is typing...' : connected ? 'Connected' : 'Connecting to support...'}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3 border-t p-4 sm:flex-row">
        <Textarea
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            emitTyping();
          }}
          aria-label="Reply message"
          placeholder="Type your reply"
          className="min-h-20 flex-1 resize-none"
          disabled={!connected}
        />
        <Button
          type="submit"
          className="sm:self-end"
          disabled={!connected || isSending || !content.trim()}
          aria-label="Send support message"
        >
          {isSending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Send data-icon="inline-start" />}
          Send
        </Button>
      </form>
    </section>
  );
}

