import { useEffect, useState, useRef, useCallback } from 'react';

import { useSearchParams } from 'react-router-dom';

import api, { unwrap } from '../services/api';

import { chatSocket } from '../services/chatSocket';

import { useAuth } from '../context/AuthContext';

import toast from 'react-hot-toast';



const FALLBACK_POLL_MS = 5000;



function isPartnerMessage(msg, partnerId, myId) {

  return (msg.senderId === partnerId && msg.receiverId === myId)

    || (msg.senderId === myId && msg.receiverId === partnerId);

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

  const bottomRef = useRef(null);

  const messagesRef = useRef([]);

  const selectedRef = useRef(null);



  selectedRef.current = selected;

  messagesRef.current = messages;



  const loadContacts = useCallback(async () => {

    try {

      const res = await api.get('/api/messages/partners');

      setContacts(unwrap(res));

    } catch { /* ignore */ }

  }, []);



  const loadAdminApplicants = useCallback(async () => {

    if (!isAdmin) return;

    try {

      const res = await api.get('/api/admin/applicants');

      const apps = unwrap(res);

      const unique = new Map();

      apps.forEach((a) => {

        if (!unique.has(a.userId)) {

          unique.set(a.userId, {

            id: a.userId,

            fullName: a.userName,

            email: a.userEmail,

            unreadCount: 0,

            canReply: true,

          });

        }

      });

      setContacts((prev) => {

        const merged = new Map(prev.map((c) => [c.id, c]));

        unique.forEach((v, k) => {

          if (!merged.has(k)) merged.set(k, v);

        });

        return Array.from(merged.values());

      });

    } catch { /* ignore */ }

  }, [isAdmin]);



  const loadMessages = useCallback(async (partnerId, silent = false) => {

    if (!partnerId) return;

    try {

      const res = await api.get(`/api/messages/conversation/${partnerId}`);

      const data = unwrap(res);

      if (selectedRef.current?.id === partnerId) {

        setMessages(data);

        if (!silent) loadContacts();

      }

    } catch { /* ignore */ }

  }, [loadContacts]);



  const appendMessage = useCallback((msg) => {

    const partnerId = selectedRef.current?.id;

    if (partnerId && isPartnerMessage(msg, partnerId, user.id)) {

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

  }, [user.id, loadContacts, onUnreadChange]);



  const poll = useCallback(async () => {

    if (document.hidden || chatSocket.isConnected()) return;

    const partnerId = selectedRef.current?.id;

    if (partnerId) await loadMessages(partnerId, true);

    await loadContacts();

    if (isAdmin) await loadAdminApplicants();

  }, [loadMessages, loadContacts, loadAdminApplicants, isAdmin]);



  useEffect(() => {

    loadContacts();

    if (isAdmin) loadAdminApplicants();

  }, [loadContacts, loadAdminApplicants, isAdmin]);



  useEffect(() => chatSocket.onMessage(appendMessage), [appendMessage]);

  useEffect(() => chatSocket.onStatus(setLive), []);



  useEffect(() => {

    const userId = searchParams.get('userId');

    if (!userId) return;

    const id = Number(userId);

    const contact = contacts.find((c) => c.id === id);

    if (contact) setSelected(contact);

    else if (isAdmin) {

      api.get(`/api/users/${id}`).then((res) => {

        const u = unwrap(res);

        setSelected({ ...u, unreadCount: 0, canReply: true });

      }).catch(() => {});

    }

  }, [searchParams, contacts, isAdmin]);



  useEffect(() => {

    if (!selected) return;

    loadMessages(selected.id);

    const interval = setInterval(poll, FALLBACK_POLL_MS);

    const onFocus = () => { loadMessages(selected.id, true); loadContacts(); };

    window.addEventListener('focus', onFocus);

    document.addEventListener('visibilitychange', onFocus);

    return () => {

      clearInterval(interval);

      window.removeEventListener('focus', onFocus);

      document.removeEventListener('visibilitychange', onFocus);

    };

  }, [selected, poll, loadMessages, loadContacts]);



  useEffect(() => {

    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  }, [messages]);



  const canSend = isAdmin || selected?.canReply;



  const send = async (e) => {

    e.preventDefault();

    if (!content.trim() || !selected || sending || !canSend) return;

    const text = content.trim();

    setContent('');

    setSending(true);



    const optimistic = {

      id: `temp-${Date.now()}`,

      senderId: user.id,

      receiverId: selected.id,

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

      toast.error(err.response?.data?.message || 'Failed to send message');

    } finally {

      setSending(false);

    }

  };



  const heightClass = embedded ? 'h-[min(560px,70vh)]' : 'h-[calc(100vh-12rem)]';

  const totalUnread = contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div className={`flex min-h-0 ${heightClass} gap-4`}>

      <div className="w-64 shrink-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 sm:w-72">

        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">

          <h2 className="text-sm font-semibold">{isAdmin ? 'Candidates' : 'Messages'}</h2>

          {totalUnread > 0 && (

            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">

              {totalUnread > 9 ? '9+' : totalUnread}

            </span>

          )}

        </div>

        {contacts.length === 0 ? (

          <p className="p-4 text-sm text-slate-500">

            {isAdmin

              ? 'Select an applicant to start a conversation'

              : 'No messages yet. A recruiter will appear here once they message you.'}

          </p>

        ) : (

          contacts.map((c) => (

            <button

              key={c.id}

              onClick={() => setSelected(c)}

              className={`relative block w-full border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${

                selected?.id === c.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''

              }`}

            >

              <div className="flex items-start justify-between gap-2">

                <div className="min-w-0 flex-1">

                  <p className="truncate font-medium">{c.fullName}</p>

                  <p className="truncate text-xs text-slate-500">{c.email}</p>

                  {!isAdmin && c.companyName && (

                    <p className="mt-0.5 truncate text-xs text-primary-600">{c.companyName}</p>

                  )}

                </div>

                {c.unreadCount > 0 && (

                  <span className="mt-0.5 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">

                    {c.unreadCount > 9 ? '9+' : c.unreadCount}

                  </span>

                )}

              </div>

            </button>

          ))

        )}

      </div>



      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">

        {selected ? (

          <>

            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">

              <div>

                <p className="font-semibold">{selected.fullName}</p>

                <p className="text-xs text-slate-500">

                  {isAdmin

                    ? (live ? 'Start or continue conversation' : 'Reconnecting…')

                    : (canSend ? (live ? 'Reply to recruiter · instant delivery' : 'Reply mode · syncing') : 'Waiting for recruiter to message you')}

                </p>

              </div>

              <span className={`flex items-center gap-1.5 text-xs ${live ? 'text-emerald-600' : 'text-amber-600'}`}>

                <span className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-emerald-500' : 'bg-amber-500'}`} />

                {live ? 'Live' : 'Syncing'}

              </span>

            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">

              {messages.length === 0 && !isAdmin && (

                <p className="text-center text-sm text-slate-400">No messages in this conversation yet.</p>

              )}

              {messages.map((m) => (

                <div key={m.id} className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'}`}>

                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${

                    m.senderId === user.id ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800'

                  }`}>

                    {m.content}

                    <p className="mt-1 text-[10px] opacity-70">{new Date(m.createdAt).toLocaleTimeString()}</p>

                  </div>

                </div>

              ))}

              <div ref={bottomRef} />

            </div>

            {canSend ? (

              <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-4 dark:border-slate-800">

                <input

                  value={content}

                  onChange={(e) => setContent(e.target.value)}

                  placeholder={isAdmin ? 'Type a message to start or reply…' : 'Type your reply…'}

                  className="flex-1 rounded-xl border px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800"

                  autoComplete="off"

                />

                <button

                  type="submit"

                  disabled={sending || !content.trim()}

                  className="rounded-xl bg-primary-600 px-6 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-50"

                >

                  Send

                </button>

              </form>

            ) : (

              <div className="border-t border-slate-200 p-4 text-center text-sm text-slate-500 dark:border-slate-800">

                Only recruiters can start conversations. You can reply once they message you.

              </div>

            )}

          </>

        ) : (

          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-500">

            <MessageSquareIcon />

            <p>{isAdmin ? 'Select a candidate to message' : 'Select a conversation to view messages'}</p>

          </div>

        )}

      </div>

    </div>

  );

}



function MessageSquareIcon() {

  return (

    <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">

      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />

    </svg>

  );

}


