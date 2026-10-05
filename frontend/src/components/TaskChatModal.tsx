import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import { chatApi, getToken } from '../api';
import type { Task, User, TaskChat, ChatMessage } from '../types';
import {
  MessageSquare,
  Send,
  X,
  Users,
  Loader2,
  Shield,
  GraduationCap
} from 'lucide-react';

interface TaskChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  currentUser: User;
}

export const TaskChatModal: React.FC<TaskChatModalProps> = ({
  isOpen,
  onClose,
  task,
  currentUser,
}) => {
  const [chat, setChat] = useState<TaskChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stompClientRef = useRef<Client | null>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Load chat metadata and message history
  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setChat(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      chatApi.getTaskChat(task.id),
      chatApi.getChatMessages(task.id),
    ])
      .then(([chatData, messagesData]) => {
        if (!isMounted) return;
        setChat(chatData);
        setMessages(messagesData || []);
        setLoading(false);
        setTimeout(() => scrollToBottom(false), 50);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setError(err.message || 'Failed to load task discussion');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, task.id]);

  // Setup WebSocket / STOMP subscription
  useEffect(() => {
    if (!isOpen) return;

    const token = getToken();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const brokerURL = `${protocol}//${window.location.host}/ws`;

    const client = new Client({
      brokerURL,
      connectHeaders: token ? { Authorization: `Bearer ${token}`, token } : {},
      debug: () => {},
      reconnectDelay: 3000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setWsConnected(true);
        // Subscribe to real-time messages for this task
        client.subscribe(`/topic/tasks/${task.id}/chat`, (message) => {
          if (message.body) {
            try {
              const newMsg: ChatMessage = JSON.parse(message.body);
              setMessages((prev) => {
                // Deduplicate by id if already added optimistically
                if (prev.some((m) => m.id === newMsg.id)) {
                  return prev;
                }
                return [...prev, newMsg];
              });
              setTimeout(() => scrollToBottom(true), 50);
            } catch (e) {
              console.error('Failed to parse WebSocket message:', e);
            }
          }
        });
      },
      onDisconnect: () => {
        setWsConnected(false);
      },
      onStompError: (frame) => {
        console.warn('STOMP error:', frame);
        setWsConnected(false);
      },
      onWebSocketClose: () => {
        setWsConnected(false);
      },
    });

    try {
      client.activate();
      stompClientRef.current = client;
    } catch (e) {
      console.warn('Could not activate STOMP client:', e);
    }

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
        stompClientRef.current = null;
      }
      setWsConnected(false);
    };
  }, [isOpen, task.id]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = inputText.trim();
    if (!content || sending) return;

    setSending(true);
    setInputText('');

    try {
      const createdMessage = await chatApi.sendMessage(task.id, content);
      setMessages((prev) => {
        if (prev.some((m) => m.id === createdMessage.id)) return prev;
        return [...prev, createdMessage];
      });
      setTimeout(() => scrollToBottom(true), 50);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      setInputText(content); // restore input on failure
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  const participants = chat?.participants || [];

  return (
    <div className="modal-backdrop">
      <div
        className="glass-strong animate-fade-up"
        style={{
          width: '100%',
          maxWidth: 680,
          height: '85vh',
          maxHeight: 740,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65), 0 0 40px rgba(56, 189, 248, 0.12)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(59, 130, 246, 0.15))',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#38bdf8',
            }}>
              <MessageSquare size={19} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <h2 style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#f0f6ff',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {task.title}
                </h2>
                <span className="badge font-mono" style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                  Task #{task.id}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.45)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span>Project: <strong style={{ color: '#93c5fd' }}>{task.projectTitle}</strong></span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {wsConnected ? (
                    <>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
                      <span style={{ color: '#34d399', fontWeight: 600 }}>Live WebSocket</span>
                    </>
                  ) : (
                    <>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fbbf24' }} />
                      <span style={{ color: '#fbbf24' }}>Connected (Sync)</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: '0.4rem', borderRadius: 8, color: 'rgba(255, 255, 255, 0.5)' }}
            title="Close discussion"
          >
            <X size={18} />
          </button>
        </div>

        {/* Participants Sub-header */}
        <div style={{
          padding: '0.5rem 1.25rem',
          background: 'rgba(2, 6, 23, 0.55)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto',
          fontSize: '0.72rem',
        }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.4)', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <Users size={12} /> Participants ({participants.length}):
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
            {participants.map((p) => {
              const isMe = p.id === currentUser.id;
              const isSupervisor = p.role === 'SUPERVISOR';
              return (
                <span
                  key={p.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '0.15rem 0.45rem',
                    borderRadius: 999,
                    fontSize: '0.66rem',
                    fontWeight: 600,
                    background: isSupervisor ? 'rgba(167, 139, 250, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                    border: `1px solid ${isSupervisor ? 'rgba(167, 139, 250, 0.3)' : 'rgba(52, 211, 153, 0.3)'}`,
                    color: isSupervisor ? '#c4b5fd' : '#6ee7b7',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isSupervisor ? <Shield size={10} /> : <GraduationCap size={10} />}
                  {p.name} {isMe ? '(You)' : ''}
                </span>
              );
            })}
          </div>
        </div>

        {/* Messages Body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem',
        }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
              <Loader2 size={24} className="animate-spin" color="#38bdf8" />
              Loading task discussion…
            </div>
          ) : error ? (
            <div style={{
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              color: '#fca5a5',
              fontSize: '0.8rem',
              textAlign: 'center',
            }}>
              {error}
            </div>
          ) : messages.length === 0 ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.3)',
              textAlign: 'center',
              gap: 8,
            }}>
              <MessageSquare size={36} style={{ opacity: 0.2 }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
                No messages in this task chat yet
              </div>
              <div style={{ fontSize: '0.75rem', maxWidth: 340 }}>
                Start collaborating! Messages sent here are stored in the database and delivered to the supervisor and assigned students in real time.
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.sender.id === currentUser.id;
              const isSupervisor = msg.sender.role === 'SUPERVISOR';
              const timeFormatted = new Date(msg.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id || `msg-${index}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '82%',
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                  }}
                >
                  {/* Sender Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.68rem',
                    color: 'rgba(255,255,255,0.4)',
                    marginBottom: 3,
                    padding: '0 4px',
                  }}>
                    <span style={{ fontWeight: 600, color: isMe ? '#93c5fd' : '#f0f6ff' }}>
                      {isMe ? 'You' : msg.sender.name}
                    </span>
                    <span
                      style={{
                        fontSize: '0.58rem',
                        padding: '0.05rem 0.35rem',
                        borderRadius: 6,
                        fontWeight: 700,
                        background: isSupervisor ? 'rgba(167, 139, 250, 0.2)' : 'rgba(52, 211, 153, 0.2)',
                        color: isSupervisor ? '#c4b5fd' : '#6ee7b7',
                      }}
                    >
                      {isSupervisor ? 'SUPERVISOR' : 'STUDENT'}
                    </span>
                    <span>{timeFormatted}</span>
                  </div>

                  {/* Bubble */}
                  <div
                    style={{
                      padding: '0.625rem 0.875rem',
                      borderRadius: 14,
                      borderTopRightRadius: isMe ? 3 : 14,
                      borderTopLeftRadius: !isMe ? 3 : 14,
                      background: isMe
                        ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.45), rgba(30, 58, 138, 0.65))'
                        : 'rgba(30, 41, 59, 0.75)',
                      border: `1px solid ${isMe ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                      color: '#f8fafc',
                      fontSize: '0.8rem',
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                      boxShadow: isMe
                        ? '0 4px 12px rgba(37, 99, 235, 0.25)'
                        : '0 4px 12px rgba(0, 0, 0, 0.25)',
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSendMessage}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'rgba(15, 23, 42, 0.8)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8,
          }}
        >
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type message... (Press Enter to send, Shift+Enter for new line)"
              disabled={loading || sending}
              className="glass-input"
              style={{
                resize: 'none',
                fontSize: '0.8rem',
                padding: '0.55rem 0.75rem',
                width: '100%',
                maxHeight: 100,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || sending || loading}
            className="btn-primary"
            style={{
              padding: '0.55rem 0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.8rem',
              height: 40,
            }}
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
