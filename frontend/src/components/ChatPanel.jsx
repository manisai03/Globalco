import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import api, { unwrap } from '../services/api';
import { chatSocket } from '../services/chatSocket';
import { useAuth } from '../context/auth';
import { getApiErrorMessage } from '../utils/apiError';

const FALLBACK_POLL_MS = 5000;

function isPartnerMessage(msg, partnerId, myId, myType, partnerType) {
  const iSent = msg.senderId === myId && msg.senderAccountType === myType;
  const iReceived = msg.receiverId === myId && msg.receiverAccountType === myType;
  const theySent = msg.senderId === partnerId && msg.senderAccountType === partnerType;
  const theyReceived = msg.receiverId === partnerId && msg.receiverAccountType === partnerType;
  return (theySent && iReceived) || (iSent && theyReceived);
}

function initials(name) {
  return (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

function UnreadBadge({ count }) {
  if (!count) return null;
  return (
    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
      {count > 9 ? '9+' : count}
    </span>
  );
}

export default function ChatPanel({ embedded = false, onUnreadChange }) {
  const { user, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(chatSocket.isConnected());
  const [contactsError, setContactsError] = useState(false);
  const [conversationError, setConversationError] = useState(false);
  const scrollRef = useRef(null);
  const selectedRef = useRef(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const myAccountType = isAdmin ? 'ADMIN' : 'USER';
  const partnerAccountType = isAdmin ? 'USER' : 'ADMIN';

  const loadContacts = useCallback(async () => {
    try {
      const res = await api.get('/api/messages/partners');
      setContacts(unwrap(res));
      setContactsError(false);
    } catch {
      setContactsError(true);
    }
  }, []);

  const loadMessages = useCallback(async (partnerId, silent = false) => {
    if (!partnerId) return;
    try {
      const res = await api.get(`/api/messages/conversation/${partnerId}`);
      const data = unwrap(res);
      if (selectedRef.current?.id === partnerId) {
        setMessages(data);
        setConversationError(false);
        if (!silent) loadContacts();
      }
    } catch {
      if (!silent && selectedRef.current?.id === partnerId) setConversationError(true);
    }
  }, [loadContacts]);

  const appendMessage = useCallback((msg) => {
    const partnerId = selectedRef.current?.id;
    if (partnerId && isPartnerMessage(msg, partnerId, user.id, myAccountType, partnerAccountType)) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        if (prev.some((m) => String(m.id).startsWith('temp-') && m.content === msg.content && m.senderId === msg.senderId)) {
          return prev.map((m) => (String(m.id).startsWith('temp-') && m.content === msg.content ? msg : m));
        }
        return [...prev, msg];
      });
    }
    loadContacts();
    onUnreadChange?.();
  }, [user.id, myAccountType, partnerAccountType, loadContacts, onUnreadChange]);

  const poll = useCallback(async () => {
    if (document.hidden || chatSocket.isConnected()) return;
    const partnerId = selectedRef.current?.id;
    if (partnerId) await loadMessages(partnerId, true);
    await loadContacts();
  }, [loadMessages, loadContacts]);

  useEffect(() => chatSocket.onMessage(appendMessage), [appendMessage]);
  useEffect(() => chatSocket.onStatus(setLive), []);

  const preselectId = searchParams.get('userId');
  useEffect(() => {
    api.get('/api/messages/partners')
      .then((res) => {
        const list = unwrap(res);
        setContacts(list);
        setContactsError(false);
        if (preselectId) {
          const contact = list.find((c) => c.id === Number(preselectId));
          if (contact) setSelected(contact);
        }
      })
      .catch(() => setContactsError(true));
  }, [preselectId]);

  const selectedId = selected?.id;
  useEffect(() => {
    if (!selectedId) return undefined;
    api.get(`/api/messages/conversation/${selectedId}`)
      .then((res) => {
        if (selectedRef.current?.id === selectedId) {
          setMessages(unwrap(res));
          setConversationError(false);
        }
        loadContacts();
        onUnreadChange?.();
      })
      .catch(() => {
        if (selectedRef.current?.id === selectedId) setConversationError(true);
      });
    const interval = setInterval(poll, FALLBACK_POLL_MS);
    const onFocus = () => { loadMessages(selectedId, true); loadContacts(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [selectedId, poll, loadMessages, loadContacts, onUnreadChange]);

  const lastMessageId = messages[messages.length - 1]?.id;
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [lastMessageId, selectedId]);

  const selectContact = (c) => {
    if (c.id !== selectedId) {
      setMessages([]);
      setConversationError(false);
    }
    setSelected(c);
  };

  const canSend = isAdmin ? selected?.identityRevealed : selected?.canReply;

  const send = async (e) => {
    e.preventDefault();
    if (!content.trim() || !selected || sending || !canSend) return;
    const text = content.trim();
    setContent('');
    setSending(true);

    const optimistic = {
      id: `temp-${Date.now()}`,
      senderId: user.id,
      senderAccountType: myAccountType,
      receiverId: selected.id,
      receiverAccountType: partnerAccountType,
      content: text,
      createdAt: new Date().toISOString(),
      read: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await api.post('/api/messages', { receiverId: selected.id, content: text });
      const saved = unwrap(res);
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
      loadContacts();
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setContent(text);
      toast.error(getApiErrorMessage(err, 'Failed to send message'));
    } finally {
      setSending(false);
    }
  };

  const heightClass = embedded ? 'h-[min(600px,72vh)]' : 'h-[calc(100vh-12rem)]';
  const totalUnread = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const isMine = (m) => m.senderId === user.id && m.senderAccountType === myAccountType;

  const statusText = isAdmin && !selected?.identityRevealed
    ? 'View their application in Applicants to unlock messaging'
    : isAdmin
      ? (live ? 'Conversation with candidate' : 'Reconnecting…')
      : (canSend ? (live ? 'Reply to recruiter · instant delivery' : 'Reply mode · syncing') : 'Waiting for recruiter to message you');

  return (
    <div className={cn('flex min-h-0 gap-4', heightClass)}>
      <aside
        className={cn(
          'min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-2xl border bg-card md:flex md:w-72',
          selected ? 'hidden' : 'flex'
        )}
      >
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-sm font-semibold">{isAdmin ? 'Candidates' : 'Messages'}</h2>
          <UnreadBadge count={totalUnread} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {contactsError && contacts.length === 0 ? (
            <div className="space-y-3 p-4 text-sm text-muted-foreground" role="alert">
              <p>Could not load your conversations.</p>
              <Button type="button" size="sm" variant="outline" onClick={loadContacts}>Try again</Button>
            </div>
          ) : contacts.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              {isAdmin
                ? 'Select an applicant to start a conversation'
                : 'No messages yet. A recruiter will appear here once they message you.'}
            </p>
          ) : (
            contacts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectContact(c)}
                aria-current={selectedId === c.id ? 'true' : undefined}
                className={cn(
                  'flex w-full items-start gap-3 border-b p-4 text-left transition-colors last:border-b-0 hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none',
                  selectedId === c.id && 'bg-accent hover:bg-accent'
                )}
              >
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(c.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                  {!isAdmin && c.companyName && (
                    <p className="mt-0.5 truncate text-xs text-primary">{c.companyName}</p>
                  )}
                </div>
                <UnreadBadge count={c.unreadCount} />
              </button>
            ))
          )}
        </div>
      </aside>

      <section
        className={cn(
          'min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card md:flex',
          selected ? 'flex' : 'hidden'
        )}
      >
        {selected ? (
          <>
            <header className="flex items-center gap-3 border-b px-4 py-3">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                onClick={() => setSelected(null)}
                aria-label="Back to conversations"
              >
                <ArrowLeft />
              </Button>
              <Avatar className="size-9">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(selected.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{selected.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{statusText}</p>
              </div>
              <span className={cn('flex shrink-0 items-center gap-1.5 text-xs', live ? 'text-emerald-600' : 'text-amber-600')}>
                <span className={cn('size-2 rounded-full', live ? 'animate-pulse bg-emerald-500' : 'bg-amber-500')} />
                {live ? 'Live' : 'Syncing'}
              </span>
            </header>

            <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
              {messages.length === 0 && (conversationError ? (
                <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground" role="alert">
                  <p>Could not load this conversation.</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => loadMessages(selectedId)}>
                    Try again
                  </Button>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">No messages in this conversation yet.</p>
              ))}
              {messages.map((m) => (
                <div key={m.id} className={cn('flex', isMine(m) ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
                      isMine(m) ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-muted'
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p className="mt-1 text-[10px] opacity-70">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {canSend ? (
              <form onSubmit={send} className="flex gap-2 border-t p-3">
                <Input
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={isAdmin ? 'Type a message to start or reply…' : 'Type your reply…'}
                  aria-label="Message"
                  className="h-10 flex-1"
                  autoComplete="off"
                  maxLength={2000}
                />
                <Button type="submit" className="h-10" disabled={sending || !content.trim()} aria-label="Send message">
                  {sending ? <Loader2 className="animate-spin" /> : <Send />}
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </form>
            ) : (
              <div className="border-t p-4 text-center text-sm text-muted-foreground">
                {isAdmin
                  ? "Open this candidate's application from the Applicants tab before sending a message."
                  : 'Only recruiters can start conversations. You can reply once they message you.'}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <MessageSquare className="size-10 opacity-40" />
            <p>{isAdmin ? 'Select a candidate to message' : 'Select a conversation to view messages'}</p>
          </div>
        )}
      </section>
    </div>
  );
}
