import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as conversationsApi from '../api/conversations';
import { useAuth } from '../contexts/AuthContext';
import { formatDisplayDate } from '../utils/dateFormat';
import { getEcho } from '../echo';

export function Chat() {
  const { user, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const conversationIdFromUrl = searchParams.get('conversation');
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(conversationIdFromUrl || null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);
  const conversationsFetchedRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch conversations when opening Chat (once per mount; ref avoids refetch on URL change only)
  useEffect(() => {
    if (!isAuthenticated) return;
    if (conversationsFetchedRef.current) {
      setLoading(false);
      return;
    }
    conversationsFetchedRef.current = true;
    conversationsApi.list()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setConversations(list);
        if (conversationIdFromUrl) {
          const match = list.find((c) => String(c.id) === String(conversationIdFromUrl));
          setSelectedId(match ? match.id : conversationIdFromUrl);
        } else if (list.length) setSelectedId((prev) => prev || list[0]?.id);
      })
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated, conversationIdFromUrl]);

  // When URL conversation param changes, sync selectedId from existing list (no refetch)
  useEffect(() => {
    if (!conversationIdFromUrl || !conversations.length) return;
    const match = conversations.find((c) => String(c.id) === String(conversationIdFromUrl));
    if (match) setSelectedId(match.id);
    else setSelectedId(conversationIdFromUrl);
  }, [conversationIdFromUrl, conversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    conversationsApi.getMessages(selectedId).then((data) => {
      setMessages(Array.isArray(data) ? data : []);
      setTimeout(scrollToBottom, 100);
    }).catch(() => setMessages([]));
    conversationsApi.markRead(selectedId).then(() => {
      setConversations((prev) => prev.map((c) => (c.id === selectedId ? { ...c, unread_count: 0 } : c)));
      window.dispatchEvent(new Event('chat-unread-changed'));
    }).catch(() => {});
  }, [selectedId, scrollToBottom]);

  useEffect(() => {
    if (!selectedId || !user) return;
    try {
      const echo = getEcho();
      if (echo) {
        if (channelRef.current) {
          try { echo.leave(channelRef.current); } catch (_) {}
          channelRef.current = null;
        }
        const channelName = `private-conversation.${selectedId}`;
        channelRef.current = channelName;
        const channel = echo.private(channelName);
        channel.listen('.message.sent', (payload) => {
          const msg = { ...payload, is_mine: payload.user_id === user.id };
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          setConversations((prev) => {
            const list = [...prev];
            const idx = list.findIndex((c) => c.id === selectedId);
            if (idx >= 0) list[idx] = { ...list[idx], last_message: msg };
            return list;
          });
          setTimeout(scrollToBottom, 50);
        });
        return () => {
          try { echo.leave(channelName); } catch (_) {}
          channelRef.current = null;
        };
      }
    } catch (_) {
      // WebSocket not available (e.g. Reverb not running) – polling will keep chat working
    }
  }, [selectedId, user?.id, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedId) return;
    try {
      const data = await conversationsApi.sendMessage(selectedId, { body: newMessage.trim() });
      setMessages((prev) => [...prev, { ...data }]);
      setNewMessage('');
      scrollToBottom();
    } catch (_) {}
  };

  const selected = conversations.find((c) => c.id === selectedId);

  if (!isAuthenticated) {
    return (
      <div className="container">
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Please log in to use chat.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="container">
      <h1 className="section-title">Chat</h1>
      <div className="chat-layout">
        <div className="card chat-sidebar">
          <div className="chat-sidebar-title">Conversations</div>
          <div className="chat-sidebar-list">
            {conversations.length === 0 && <p style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No conversations yet. Start one from a car page or add a user.</p>}
            {conversations.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  textAlign: 'left',
                  border: 'none',
                  background: String(selectedId) === String(c.id) ? 'var(--primary)' : 'transparent',
                  color: String(selectedId) === String(c.id) ? 'white' : 'var(--text)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>{c.other?.name || 'Unknown'}</span>
                {c.unread_count > 0 && (
                  <span className="badge badge-pending" style={{ fontSize: '0.7rem' }}>{c.unread_count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="card chat-main">
          {!selectedId ? (
            <div className="chat-main-placeholder">Select a conversation or start a new one.</div>
          ) : (
            <>
              <div className="chat-main-header">
                {selected?.other?.name ?? 'Conversation'}{selected?.other?.role != null && <span className="badge" style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: 'var(--primary)', color: 'white' }}> {selected.other.role}</span>}
              </div>
              <div className="chat-messages-box">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.is_mine ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius)',
                      background: m.is_mine ? 'var(--primary)' : 'var(--border)',
                      color: m.is_mine ? 'white' : 'var(--text)',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', opacity: 0.9, marginBottom: '0.25rem' }}>{m.user?.name} · {m.user?.role}</div>
                    <div>{m.body}</div>
                    <div style={{ fontSize: '0.7rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {formatDisplayDate(m.created_at)}
                      {m.is_mine && (m.read_at ? <span style={{ opacity: 0.9 }} title="Read">✓ Read</span> : <span style={{ opacity: 0.7 }} title="Sent">✓</span>)}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form className="chat-form" onSubmit={sendMessage}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                />
                <button type="submit" className="btn btn-primary">Send</button>
              </form>
            </>
          )}
        </div>
      </div>
      <style>{`
        .chat-layout {
          display: flex;
          gap: 1rem;
          flex-wrap: nowrap;
          height: 520px;
          max-width: 100%;
        }
        .chat-sidebar {
          width: 260px;
          min-width: 260px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .chat-sidebar-title {
          padding: 0.75rem;
          border-bottom: 1px solid var(--border);
          font-weight: 600;
          flex-shrink: 0;
        }
        .chat-sidebar-list {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
        }
        .chat-main {
          flex: 1;
          min-width: 280px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .chat-main-placeholder {
          padding: 2rem;
          text-align: center;
          color: var(--text-muted);
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chat-main-header {
          padding: 0.75rem;
          border-bottom: 1px solid var(--border);
          font-weight: 600;
          flex-shrink: 0;
        }
        .chat-messages-box {
          height: 340px;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .chat-form {
          padding: 0.75rem;
          border-top: 1px solid var(--border);
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .chat-form input { flex: 1; }
        @media (max-width: 700px) {
          .chat-layout { flex-direction: column; height: 80vh; max-height: 600px; }
          .chat-sidebar { width: 100%; min-width: 0; max-height: 180px; }
          .chat-messages-box { height: 240px; }
        }
      `}</style>
    </div>
  );
}
