import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { sendMessage } from '../services/api';
import { useAppStore } from '../store';
import i18n from '../i18n';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: string[];
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
];

export default function AssistantScreen() {
  const { t } = useTranslation();
  const { language, setLanguage, sessionId, setSessionId } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        language === 'ar'
          ? 'مرحباً! أنا مساعدك البلدي. كيف يمكنني مساعدتك؟'
          : language === 'fr'
          ? 'Bonjour ! Je suis votre assistant municipal. Comment puis-je vous aider ?'
          : 'Hello! I\'m your municipal assistant. How can I help you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const changeLanguage = (lang: 'en' | 'ar' | 'fr') => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const sendMsg = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data } = await sendMessage(text, language, sessionId);
      if (!sessionId) setSessionId(data.session_id);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        actions: data.suggested_actions,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: 'err', role: 'assistant', content: t('common.error') },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {!isUser && (
          <View style={styles.avatarRow}>
            <Text style={styles.avatarIcon}>🏛️</Text>
            <Text style={styles.avatarLabel}>Madina</Text>
          </View>
        )}
        <Text style={[styles.bubbleText, isUser && styles.userText]}>{item.content}</Text>
        {item.actions && item.actions.length > 0 && (
          <View style={styles.actionsRow}>
            {item.actions.map((action) => (
              <TouchableOpacity
                key={action}
                style={styles.actionChip}
                onPress={() => { setInput(action); }}
              >
                <Text style={styles.actionText}>{action}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('assistant.title')}</Text>
          <View style={styles.langRow}>
            {LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.code}
                style={[styles.langBtn, language === l.code && styles.langBtnActive]}
                onPress={() => changeLanguage(l.code as 'en' | 'ar' | 'fr')}
              >
                <Text style={[styles.langText, language === l.code && styles.langTextActive]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {loading && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color="#1a73e8" />
            <Text style={styles.typingText}>Madina is typing…</Text>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={t('assistant.placeholder')}
            placeholderTextColor="#aaa"
            multiline
            maxLength={500}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMsg} disabled={loading}>
            <Ionicons name="send" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4ff' },
  header: { backgroundColor: '#1a73e8', padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 10 },
  langRow: { flexDirection: 'row', gap: 8 },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  langBtnActive: { backgroundColor: '#fff' },
  langText: { color: '#c8dfff', fontSize: 13 },
  langTextActive: { color: '#1a73e8', fontWeight: '700' },
  bubble: {
    maxWidth: '85%',
    marginVertical: 4,
    borderRadius: 16,
    padding: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#1a73e8',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    elevation: 1,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  avatarIcon: { fontSize: 14 },
  avatarLabel: { fontSize: 12, color: '#888', marginLeft: 4 },
  bubbleText: { fontSize: 15, color: '#333', lineHeight: 22 },
  userText: { color: '#fff' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  actionChip: {
    backgroundColor: '#e8f0fe',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionText: { color: '#1a73e8', fontSize: 13, fontWeight: '600' },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: { marginLeft: 8, color: '#888', fontSize: 13 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#1a73e8',
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
