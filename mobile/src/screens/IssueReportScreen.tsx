import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { reportIssue, type Issue } from '../services/api';

const SEVERITY_COLOR: Record<string, string> = {
  low: '#00c853',
  medium: '#ffd600',
  high: '#ff6d00',
  critical: '#d50000',
};

const CATEGORY_LABEL: Record<string, string> = {
  pothole: '🕳️ Pothole',
  broken_light: '💡 Broken Light',
  illegal_dumping: '🗑️ Illegal Dumping',
  graffiti: '🖌️ Graffiti',
  damaged_sign: '🪧 Damaged Sign',
  tree_hazard: '🌳 Tree Hazard',
  water_leak: '💧 Water Leak',
  other: '❓ Other',
};

export default function IssueReportScreen() {
  const { t } = useTranslation();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Issue | null>(null);

  const pickImage = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission required', 'Please grant permission to continue.');
      return;
    }

    const picked = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });

    if (!picked.canceled && picked.assets[0]) {
      setImageUri(picked.assets[0].uri);
      setResult(null);
    }
  };

  const submit = async () => {
    if (!imageUri) {
      Alert.alert('No image', 'Please take or choose a photo first.');
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('image', {
        uri: imageUri,
        name: 'issue.jpg',
        type: 'image/jpeg',
      } as any);
      if (description) form.append('description', description);
      if (address) form.append('address', address);

      const { data } = await reportIssue(form);
      setResult(data);
      Alert.alert('✅', t('report.success'));
    } catch {
      Alert.alert('Error', t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('report.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('report.subtitle')}</Text>
        </View>

        {/* Image area */}
        <View style={styles.imageBox}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <Ionicons name="camera-outline" size={64} color="#ccc" />
          )}
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage(true)}>
            <Ionicons name="camera" size={18} color="#fff" />
            <Text style={styles.photoBtnText}>{t('report.take_photo')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.photoBtn, { backgroundColor: '#546e7a' }]} onPress={() => pickImage(false)}>
            <Ionicons name="images-outline" size={18} color="#fff" />
            <Text style={styles.photoBtnText}>{t('report.choose_photo')}</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>{t('report.description')}</Text>
          <TextInput
            style={styles.input}
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Large pothole near bus stop…"
            placeholderTextColor="#aaa"
          />
          <Text style={styles.label}>{t('report.address')}</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="e.g. Rue Ahmed Bey, Kouba"
            placeholderTextColor="#aaa"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              <Ionicons name="send" size={16} /> {t('report.submit')}
            </Text>
          )}
        </TouchableOpacity>

        {/* AI Result */}
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>{t('report.ai_result')}</Text>
            <Row label={t('report.category')} value={CATEGORY_LABEL[result.category] ?? result.category} />
            <Row
              label={t('report.severity')}
              value={result.severity.toUpperCase()}
              valueColor={SEVERITY_COLOR[result.severity]}
            />
            <Row label={t('report.department')} value={result.department?.replace('_', ' ') ?? '—'} />
            <Row
              label={t('report.estimated')}
              value={`${result.estimated_resolution_days} ${t('report.days')}`}
            />
            {result.ai_confidence != null && (
              <Row
                label={t('report.confidence')}
                value={`${(result.ai_confidence * 100).toFixed(1)}%`}
              />
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({
  label,
  value,
  valueColor = '#333',
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#e53935', padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#ffcdd2', marginTop: 2 },
  imageBox: {
    margin: 16,
    height: 200,
    backgroundColor: '#fff',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 2,
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  buttonRow: { flexDirection: 'row', marginHorizontal: 16, gap: 10 },
  photoBtn: {
    flex: 1,
    backgroundColor: '#1a73e8',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoBtnText: { color: '#fff', fontWeight: '600' },
  form: { margin: 16 },
  label: { fontSize: 13, color: '#555', marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    color: '#333',
    fontSize: 14,
    elevation: 1,
  },
  submitBtn: {
    backgroundColor: '#e53935',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resultCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 14,
    padding: 16,
    elevation: 3,
  },
  resultTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowLabel: { fontSize: 14, color: '#666' },
  rowValue: { fontSize: 14, fontWeight: '600' },
});
