import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import colors from '@/constants/colors';
import typography from '@/constants/typography';
import { api } from '@/services/api';
import { useBackofficeContext } from '@/contexts/BackofficeContext';
import Pagination from '@/components/backoffice/Pagination';

interface BackofficeExperience {
  id: number;
  title: string;
  description: string;
  location: string;
  price: number;
  currency?: string;
  duration: string;
  category?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  meeting_point?: string | null;
  address?: string | null;
  max_group_size?: number | null;
  tags?: string[] | string | null;
  highlights?: string[] | string | null;
  included?: string[] | string | null;
  what_to_bring?: string[] | string | null;
  languages?: string[] | string | null;
  is_active?: boolean;
  instant_booking?: boolean;
  available_today?: boolean;
  operator_id: number;
  operators?: {
    id: number;
    company_name: string;
    logo_url?: string | null;
  } | null;
}

interface OperatorOption {
  id: number;
  company_name: string;
}

interface ExperienceFormState {
  title: string;
  description: string;
  location: string;
  price: string;
  currency: string;
  duration: string;
  category: string;
  image_url: string;
  video_url: string;
  meeting_point: string;
  address: string;
  max_group_size: string;
  tags: string;
  highlights: string;
  included: string;
  what_to_bring: string;
  languages: string;
  is_active: boolean;
  instant_booking: boolean;
  available_today: boolean;
  operator_id: string;
}

const emptyForm: ExperienceFormState = {
  title: '',
  description: '',
  location: '',
  price: '',
  currency: 'EUR',
  duration: '',
  category: '',
  image_url: '',
  video_url: '',
  meeting_point: '',
  address: '',
  max_group_size: '',
  tags: '',
  highlights: '',
  included: '',
  what_to_bring: '',
  languages: '',
  is_active: true,
  instant_booking: false,
  available_today: false,
  operator_id: ''
};

const toInputList = (value?: string[] | string | null) => {
  if (!value) return '';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};

const parseList = (value: string) => {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

export default function BackofficeExperiences() {
  const { profile } = useBackofficeContext();
  const { width } = useWindowDimensions();
  const isWide = width >= 1200;

  const [experiences, setExperiences] = useState<BackofficeExperience[]>([]);
  const [operators, setOperators] = useState<OperatorOption[]>([]);
  const [form, setForm] = useState<ExperienceFormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [isDraggingOverVideo, setIsDraggingOverVideo] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(10)).current;

  const isAdmin = profile?.user.role === 'admin';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const experienceResponse = await api.getBackofficeExperiences();
      if (!experienceResponse.success || !experienceResponse.data) {
        throw new Error(experienceResponse.error || 'Failed to load experiences');
      }

      const experienceData = experienceResponse.data as BackofficeExperience[];
      setExperiences(experienceData);

      if (isAdmin) {
        const operatorsResponse = await api.getBackofficeOperators();
        if (operatorsResponse.success && operatorsResponse.data) {
          const operatorData = (operatorsResponse.data as any[]).map((op) => ({
            id: op.id,
            company_name: op.company_name
          }));
          setOperators(operatorData);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load experiences';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true
      })
    ]).start();
  }, [fadeAnim, translateAnim]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredExperiences = useMemo(() => {
    if (!searchQuery.trim()) return experiences;
    const query = searchQuery.trim().toLowerCase();
    return experiences.filter((exp) => {
      const operatorName = exp.operators?.company_name || '';
      return [
        exp.title,
        exp.location,
        exp.category || '',
        operatorName
      ].some((field) => field.toLowerCase().includes(query));
    });
  }, [experiences, searchQuery]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Paginated experiences
  const paginatedExperiences = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredExperiences.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredExperiences, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredExperiences.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setImagePreview(null);
    setVideoPreview(null);
  };

  const startCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setImagePreview(null);
    setVideoPreview(null);
    setShowForm(true);
  };

  const startEdit = (exp: BackofficeExperience) => {
    setEditingId(exp.id);
    setShowForm(true);
    setImagePreview(exp.image_url || null);
    setVideoPreview(exp.video_url || null);
    setForm({
      title: exp.title || '',
      description: exp.description || '',
      location: exp.location || '',
      price: exp.price ? String(exp.price) : '',
      currency: exp.currency || 'EUR',
      duration: exp.duration || '',
      category: exp.category || '',
      image_url: exp.image_url || '',
      video_url: exp.video_url || '',
      meeting_point: exp.meeting_point || '',
      address: exp.address || '',
      max_group_size: exp.max_group_size ? String(exp.max_group_size) : '',
      tags: toInputList(exp.tags),
      highlights: toInputList(exp.highlights),
      included: toInputList(exp.included),
      what_to_bring: toInputList(exp.what_to_bring),
      languages: toInputList(exp.languages),
      is_active: exp.is_active ?? true,
      instant_booking: Boolean(exp.instant_booking),
      available_today: Boolean(exp.available_today),
      operator_id: exp.operator_id ? String(exp.operator_id) : ''
    });
  };

  const buildPayload = () => {
    return {
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      price: form.price ? Number(form.price) : undefined,
      currency: form.currency.trim() || 'EUR',
      duration: form.duration.trim(),
      category: form.category.trim() || null,
      image_url: form.image_url.trim() || null,
      video_url: form.video_url.trim() || null,
      meeting_point: form.meeting_point.trim() || null,
      address: form.address.trim() || null,
      max_group_size: form.max_group_size ? Number(form.max_group_size) : null,
      tags: parseList(form.tags),
      highlights: parseList(form.highlights),
      included: parseList(form.included),
      what_to_bring: parseList(form.what_to_bring),
      languages: parseList(form.languages),
      is_active: form.is_active,
      instant_booking: form.instant_booking,
      available_today: form.available_today,
      operator_id: isAdmin ? Number(form.operator_id) : undefined
    };
  };

  const validateForm = () => {
    if (!form.title.trim() || !form.description.trim() || !form.location.trim() || !form.duration.trim()) {
      Alert.alert('Missing information', 'Title, description, location, and duration are required.');
      return false;
    }
    if (!form.price || Number.isNaN(Number(form.price))) {
      Alert.alert('Invalid price', 'Please enter a valid price.');
      return false;
    }
    if (isAdmin && !form.operator_id) {
      Alert.alert('Operator required', 'Select an operator before saving.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const payload = buildPayload();

      const response = editingId
        ? await api.updateBackofficeExperience(editingId, payload)
        : await api.createBackofficeExperience(payload);

      if (!response.success) {
        throw new Error(response.error || 'Failed to save experience');
      }

      await loadData();
      resetForm();
      Alert.alert('Success', editingId ? 'Experience updated.' : 'Experience created.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save experience';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (experienceId: number) => {
    try {
      const response = await api.deleteBackofficeExperience(experienceId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete experience');
      }
      setExperiences((prev) => prev.filter((exp) => exp.id !== experienceId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete experience';
      Alert.alert('Error', message);
    }
  };

  const confirmDelete = (exp: BackofficeExperience) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(`Delete "${exp.title}"? This cannot be undone.`);
      if (confirmed) handleDelete(exp.id);
      return;
    }

    Alert.alert('Delete experience', `Delete "${exp.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(exp.id) }
    ]);
  };

  // Image picker function
  const pickImage = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Please allow access to your photo library to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await uploadImage(asset);
      }
    } catch (err) {
      console.error('Image picker error:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Upload image to server
  const uploadImage = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) {
      Alert.alert('Error', 'Failed to read image data');
      return;
    }

    try {
      setUploadingImage(true);
      setImagePreview(asset.uri);

      const filename = asset.fileName || `image-${Date.now()}`;
      const contentType = asset.mimeType || 'image/jpeg';

      const response = await api.uploadBackofficeImage(
        asset.base64,
        filename,
        contentType,
        'experiences'
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to upload image');
      }

      const imageUrl = (response.data as any)?.url;
      if (imageUrl) {
        setForm((prev) => ({ ...prev, image_url: imageUrl }));
        setImagePreview(imageUrl);
      }
    } catch (err) {
      console.error('Image upload error:', err);
      Alert.alert('Upload Error', err instanceof Error ? err.message : 'Failed to upload image');
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle web drag and drop
  const handleWebDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      Alert.alert('Invalid file', 'Please drop an image file');
      return;
    }

    try {
      setUploadingImage(true);
      
      // Read file as base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        if (!base64) return;

        setImagePreview(URL.createObjectURL(file));

        const response = await api.uploadBackofficeImage(
          base64,
          file.name,
          file.type,
          'experiences'
        );

        if (!response.success) {
          throw new Error(response.error || 'Failed to upload image');
        }

        const imageUrl = (response.data as any)?.url;
        if (imageUrl) {
          setForm((prev) => ({ ...prev, image_url: imageUrl }));
          setImagePreview(imageUrl);
        }
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Drop upload error:', err);
      Alert.alert('Upload Error', err instanceof Error ? err.message : 'Failed to upload image');
      setUploadingImage(false);
    }
  };

  const clearImage = () => {
    setForm((prev) => ({ ...prev, image_url: '' }));
    setImagePreview(null);
  };

  // Video upload functions
  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
        videoMaxDuration: 120, // 2 minutes max
      });

      if (!result.canceled && result.assets[0]) {
        await uploadVideo(result.assets[0]);
      }
    } catch (err) {
      console.error('Video picker error:', err);
      Alert.alert('Error', 'Failed to open video picker');
    }
  };

  const uploadVideo = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) {
      Alert.alert('Error', 'Could not read video data');
      return;
    }

    setUploadingVideo(true);
    try {
      const extension = asset.uri.split('.').pop() || 'mp4';
      const filename = `video_${Date.now()}.${extension}`;
      const contentType = `video/${extension === 'mov' ? 'quicktime' : extension}`;

      const response = await api.uploadBackofficeImage(
        asset.base64,
        filename,
        contentType,
        'videos'
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to upload video');
      }

      const videoUrl = (response.data as any)?.url;
      if (videoUrl) {
        setForm((prev) => ({ ...prev, video_url: videoUrl }));
        setVideoPreview(videoUrl);
      }
    } catch (err) {
      console.error('Video upload error:', err);
      Alert.alert('Upload Error', err instanceof Error ? err.message : 'Failed to upload video');
      setVideoPreview(null);
    } finally {
      setUploadingVideo(false);
    }
  };

  // Handle web drag and drop for video
  const handleVideoWebDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOverVideo(false);

    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith('video/')) {
      Alert.alert('Error', 'Please drop a video file');
      return;
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB limit for videos
      Alert.alert('Error', 'Video must be under 100MB');
      return;
    }

    setUploadingVideo(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];

        const response = await api.uploadBackofficeImage(
          base64,
          file.name,
          file.type,
          'videos'
        );

        if (!response.success) {
          throw new Error(response.error || 'Failed to upload video');
        }

        const videoUrl = (response.data as any)?.url;
        if (videoUrl) {
          setForm((prev) => ({ ...prev, video_url: videoUrl }));
          setVideoPreview(videoUrl);
        }
        setUploadingVideo(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Video drop upload error:', err);
      Alert.alert('Upload Error', err instanceof Error ? err.message : 'Failed to upload video');
      setUploadingVideo(false);
    }
  };

  const clearVideo = () => {
    setForm((prev) => ({ ...prev, video_url: '' }));
    setVideoPreview(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: translateAnim }] }]}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Experiences</Text>
              <Text style={styles.subtitle}>Create, update, and curate the catalog.</Text>
            </View>
            <Pressable style={styles.createButton} onPress={startCreate}>
              <Text style={styles.createButtonText}>+ New Experience</Text>
            </Pressable>
          </View>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Unable to load experiences</Text>
            <Text style={styles.errorMessage}>{error}</Text>
          </View>
        )}

        <Modal
          visible={showForm}
          animationType="fade"
          transparent={true}
          onRequestClose={resetForm}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                <View style={styles.formHeader}>
                  <Text style={styles.cardTitle}>{editingId ? 'Edit experience' : 'New experience'}</Text>
                  <Pressable style={styles.closeButton} onPress={resetForm}>
                    <Text style={styles.closeButtonText}>✕</Text>
                  </Pressable>
                </View>
                <Text style={styles.cardSubtitle}>Fill in the essentials. Lists use comma separated values.</Text>

              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Core</Text>
                {renderInput('Title', form.title, (value) => setForm({ ...form, title: value }), 'Experience title')}
                {renderInput('Description', form.description, (value) => setForm({ ...form, description: value }), 'Short description', true)}
                {renderInput('Location', form.location, (value) => setForm({ ...form, location: value }), 'City or area')}
                {renderInput('Duration', form.duration, (value) => setForm({ ...form, duration: value }), 'e.g. 2h')}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Pricing</Text>
                <View style={styles.row}>
                  {renderInput('Price', form.price, (value) => setForm({ ...form, price: value }), '120', false, styles.halfInput)}
                  {renderInput('Currency', form.currency, (value) => setForm({ ...form, currency: value }), 'EUR', false, styles.halfInput)}
                </View>
                {renderInput('Max group size', form.max_group_size, (value) => setForm({ ...form, max_group_size: value }), '10')}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Media</Text>
                
                {/* Image Upload Section */}
                <View style={styles.imageUploadSection}>
                  <Text style={styles.inputLabel}>Image</Text>
                  
                  {Platform.OS === 'web' ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                      onDragLeave={() => setIsDraggingOver(false)}
                      onDrop={handleWebDrop as any}
                      style={{ width: '100%' }}
                    >
                      <Pressable
                        style={[
                          styles.imageDropzone,
                          isDraggingOver && styles.imageDropzoneActive,
                          imagePreview && styles.imageDropzoneWithPreview
                        ]}
                        onPress={pickImage}
                        disabled={uploadingImage}
                      >
                        {imagePreview ? (
                          <View style={styles.imagePreviewContainer}>
                            <Image
                              source={{ uri: imagePreview }}
                              style={styles.imagePreview}
                              resizeMode="cover"
                            />
                            <View style={styles.imageOverlay}>
                              {uploadingImage ? (
                                <Text style={styles.uploadingText}>Uploading...</Text>
                              ) : (
                                <View style={styles.imageActions}>
                                  <Pressable style={styles.imageActionButton} onPress={pickImage}>
                                    <Text style={styles.imageActionText}>Change</Text>
                                  </Pressable>
                                  <Pressable style={[styles.imageActionButton, styles.imageActionButtonDanger]} onPress={clearImage}>
                                    <Text style={styles.imageActionTextDanger}>Remove</Text>
                                  </Pressable>
                                </View>
                              )}
                            </View>
                          </View>
                        ) : (
                          <View style={styles.dropzoneContent}>
                            <Text style={styles.dropzoneIcon}>📷</Text>
                            <Text style={styles.dropzoneText}>
                              {uploadingImage ? 'Uploading...' : 'Click to upload or drag & drop'}
                            </Text>
                            <Text style={styles.dropzoneHint}>PNG, JPG up to 10MB</Text>
                          </View>
                        )}
                      </Pressable>
                    </div>
                  ) : (
                    <Pressable
                      style={[
                        styles.imageDropzone,
                        imagePreview && styles.imageDropzoneWithPreview
                      ]}
                      onPress={pickImage}
                      disabled={uploadingImage}
                    >
                      {imagePreview ? (
                        <View style={styles.imagePreviewContainer}>
                          <Image
                            source={{ uri: imagePreview }}
                            style={styles.imagePreview}
                            resizeMode="cover"
                          />
                          <View style={styles.imageOverlay}>
                            {uploadingImage ? (
                              <Text style={styles.uploadingText}>Uploading...</Text>
                            ) : (
                              <View style={styles.imageActions}>
                                <Pressable style={styles.imageActionButton} onPress={pickImage}>
                                  <Text style={styles.imageActionText}>Change</Text>
                                </Pressable>
                                <Pressable style={[styles.imageActionButton, styles.imageActionButtonDanger]} onPress={clearImage}>
                                  <Text style={styles.imageActionTextDanger}>Remove</Text>
                                </Pressable>
                              </View>
                            )}
                          </View>
                        </View>
                      ) : (
                        <View style={styles.dropzoneContent}>
                          <Text style={styles.dropzoneIcon}>📷</Text>
                          <Text style={styles.dropzoneText}>
                            {uploadingImage ? 'Uploading...' : 'Tap to upload image'}
                          </Text>
                          <Text style={styles.dropzoneHint}>PNG, JPG up to 10MB</Text>
                        </View>
                      )}
                    </Pressable>
                  )}
                  
                  {/* Manual URL Input (fallback) */}
                  <View style={styles.urlInputRow}>
                    <TextInput
                      style={styles.urlInput}
                      placeholder="Or paste image URL..."
                      placeholderTextColor={colors.dark.textSecondary}
                      value={form.image_url}
                      onChangeText={(value) => {
                        setForm({ ...form, image_url: value });
                        if (value.trim()) setImagePreview(value.trim());
                      }}
                    />
                  </View>
                </View>

                {/* Video Upload Section */}
                <View style={styles.imageUploadSection}>
                  <Text style={styles.inputLabel}>Video</Text>
                  
                  {Platform.OS === 'web' ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingOverVideo(true); }}
                      onDragLeave={() => setIsDraggingOverVideo(false)}
                      onDrop={handleVideoWebDrop}
                    >
                      <Pressable
                        style={[
                          styles.imageDropzone,
                          styles.videoDropzone,
                          isDraggingOverVideo && styles.imageDropzoneActive,
                          videoPreview && styles.imageDropzoneWithPreview
                        ]}
                        onPress={pickVideo}
                      >
                        {videoPreview ? (
                          <View style={styles.imagePreviewContainer}>
                            <View style={styles.videoPreviewPlaceholder}>
                              <Text style={styles.videoPreviewIcon}>🎬</Text>
                              <Text style={styles.videoPreviewText} numberOfLines={1}>
                                {form.video_url.split('/').pop() || 'Video uploaded'}
                              </Text>
                            </View>
                            <View style={styles.imageOverlay}>
                              {uploadingVideo ? (
                                <Text style={styles.uploadingText}>Uploading...</Text>
                              ) : (
                                <View style={styles.imageActions}>
                                  <Pressable style={styles.imageActionButton} onPress={pickVideo}>
                                    <Text style={styles.imageActionText}>Change</Text>
                                  </Pressable>
                                  <Pressable style={[styles.imageActionButton, styles.imageActionButtonDanger]} onPress={clearVideo}>
                                    <Text style={styles.imageActionTextDanger}>Remove</Text>
                                  </Pressable>
                                </View>
                              )}
                            </View>
                          </View>
                        ) : (
                          <View style={styles.dropzoneContent}>
                            <Text style={styles.dropzoneIcon}>🎬</Text>
                            <Text style={styles.dropzoneText}>
                              {uploadingVideo ? 'Uploading...' : Platform.OS === 'web' ? 'Drop video or click to upload' : 'Tap to upload video'}
                            </Text>
                            <Text style={styles.dropzoneHint}>MP4, MOV up to 100MB</Text>
                          </View>
                        )}
                      </Pressable>
                    </div>
                  ) : (
                    <Pressable
                      style={[
                        styles.imageDropzone,
                        styles.videoDropzone,
                        videoPreview && styles.imageDropzoneWithPreview
                      ]}
                      onPress={pickVideo}
                    >
                      {videoPreview ? (
                        <View style={styles.imagePreviewContainer}>
                          <View style={styles.videoPreviewPlaceholder}>
                            <Text style={styles.videoPreviewIcon}>🎬</Text>
                            <Text style={styles.videoPreviewText} numberOfLines={1}>
                              {form.video_url.split('/').pop() || 'Video uploaded'}
                            </Text>
                          </View>
                          <View style={styles.imageOverlay}>
                            {uploadingVideo ? (
                              <Text style={styles.uploadingText}>Uploading...</Text>
                            ) : (
                              <View style={styles.imageActions}>
                                <Pressable style={styles.imageActionButton} onPress={pickVideo}>
                                  <Text style={styles.imageActionText}>Change</Text>
                                </Pressable>
                                <Pressable style={[styles.imageActionButton, styles.imageActionButtonDanger]} onPress={clearVideo}>
                                  <Text style={styles.imageActionTextDanger}>Remove</Text>
                                </Pressable>
                              </View>
                            )}
                          </View>
                        </View>
                      ) : (
                        <View style={styles.dropzoneContent}>
                          <Text style={styles.dropzoneIcon}>🎬</Text>
                          <Text style={styles.dropzoneText}>
                            {uploadingVideo ? 'Uploading...' : 'Tap to upload video'}
                          </Text>
                          <Text style={styles.dropzoneHint}>MP4, MOV up to 100MB</Text>
                        </View>
                      )}
                    </Pressable>
                  )}
                  
                  {/* Manual URL Input (fallback) */}
                  <View style={styles.urlInputRow}>
                    <TextInput
                      style={styles.urlInput}
                      placeholder="Or paste video URL..."
                      placeholderTextColor={colors.dark.textSecondary}
                      value={form.video_url}
                      onChangeText={(value) => {
                        setForm({ ...form, video_url: value });
                        if (value.trim()) setVideoPreview(value.trim());
                      }}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Details</Text>
                {renderInput('Category', form.category, (value) => setForm({ ...form, category: value }), 'Adventure')}
                {renderInput('Meeting point', form.meeting_point, (value) => setForm({ ...form, meeting_point: value }), 'Meet here')}
                {renderInput('Address', form.address, (value) => setForm({ ...form, address: value }), 'Street address')}
                {renderInput('Tags', form.tags, (value) => setForm({ ...form, tags: value }), 'surf, ocean')}
                {renderInput('Highlights', form.highlights, (value) => setForm({ ...form, highlights: value }), 'small groups, guide')}
                {renderInput('Included', form.included, (value) => setForm({ ...form, included: value }), 'equipment, guide')}
                {renderInput('What to bring', form.what_to_bring, (value) => setForm({ ...form, what_to_bring: value }), 'sunscreen, water')}
                {renderInput('Languages', form.languages, (value) => setForm({ ...form, languages: value }), 'English, Portuguese')}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Status</Text>
                <View style={styles.toggleRow}>
                  {renderToggle('Active', form.is_active, () => setForm({ ...form, is_active: !form.is_active }))}
                  {renderToggle('Instant booking', form.instant_booking, () => setForm({ ...form, instant_booking: !form.instant_booking }))}
                  {renderToggle('Available today', form.available_today, () => setForm({ ...form, available_today: !form.available_today }))}
                </View>
              </View>

              {isAdmin && (
                <View style={styles.formSection}>
                  <Text style={styles.sectionLabel}>Operator</Text>
                  {renderInput('Operator ID', form.operator_id, (value) => setForm({ ...form, operator_id: value }), 'Select below')}
                  <View style={styles.operatorChips}>
                    {operators.map((op) => (
                      <Pressable
                        key={op.id}
                        style={[
                          styles.operatorChip,
                          form.operator_id === String(op.id) && styles.operatorChipActive
                        ]}
                        onPress={() => setForm({ ...form, operator_id: String(op.id) })}
                      >
                        <Text
                          style={[
                            styles.operatorChipText,
                            form.operator_id === String(op.id) && styles.operatorChipTextActive
                          ]}
                        >
                          {op.company_name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.actionsRow}>
                <Pressable style={styles.secondaryButton} onPress={resetForm}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.primaryButton, saving && styles.primaryButtonDisabled]} onPress={handleSave}>
                  <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save experience'}</Text>
                </Pressable>
              </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <View style={styles.layout}>
          <View style={styles.listColumnFull}>
            <View style={styles.card}>
              <View style={styles.listHeader}>
                <Text style={styles.cardTitle}>Catalog</Text>
                <Text style={styles.cardSubtitle}>{loading ? 'Loading...' : `${filteredExperiences.length} results`}</Text>
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by title, location, or operator"
                placeholderTextColor={colors.dark.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <View style={styles.listContent}>
                {paginatedExperiences.map((exp) => (
                  <View key={exp.id} style={styles.experienceCard}>
                    <View style={styles.experienceHeader}>
                      <View style={styles.experienceInfo}>
                        <Text style={styles.experienceTitle}>{exp.title}</Text>
                        <Text style={styles.experienceMeta}>
                          {exp.location} • {exp.duration} • {exp.price} {exp.currency || 'EUR'}
                        </Text>
                        {isAdmin && exp.operators?.company_name && (
                          <Text style={styles.experienceOperator}>{exp.operators.company_name}</Text>
                        )}
                      </View>
                      <View style={[styles.statusPill, exp.is_active ? styles.statusActive : styles.statusInactive]}>
                        <Text style={[styles.statusText, exp.is_active ? styles.statusTextActive : styles.statusTextInactive]}>
                          {exp.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <Pressable style={styles.secondaryButton} onPress={() => startEdit(exp)}>
                        <Text style={styles.secondaryButtonText}>Edit</Text>
                      </Pressable>
                      <Pressable style={styles.dangerButton} onPress={() => confirmDelete(exp)}>
                        <Text style={styles.dangerButtonText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
                {!loading && filteredExperiences.length === 0 && (
                  <Text style={styles.emptyText}>No experiences match this search.</Text>
                )}
              </View>
              
              {filteredExperiences.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={filteredExperiences.length}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={handleItemsPerPageChange}
                />
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

function renderInput(
  label: string,
  value: string,
  onChange: (value: string) => void,
  placeholder: string,
  multiline = false,
  containerStyle?: object
) {
  return (
    <View style={[styles.inputGroup, containerStyle]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.dark.textSecondary}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function renderToggle(label: string, value: boolean, onPress: () => void) {
  return (
    <Pressable style={[styles.toggle, value && styles.toggleActive]} onPress={onPress}>
      <Text style={[styles.toggleText, value && styles.toggleTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40
  },
  container: {
    gap: 24
  },
  header: {
    gap: 8
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16
  },
  createButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.dark.primary
  },
  createButtonText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.background,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  title: {
    ...typography.styles.h2,
    color: colors.dark.text
  },
  subtitle: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    color: colors.dark.textSecondary
  },
  layout: {
    gap: 20
  },
  layoutWide: {
    flexDirection: 'row'
  },
  column: {
    flex: 1
  },
  formColumn: {
    minWidth: 320
  },
  listColumn: {
    minWidth: 320
  },
  listColumnFull: {
    minWidth: 320,
    maxWidth: '100%'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    borderRadius: 24,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    overflow: 'hidden'
  },
  modalScroll: {
    flex: 1
  },
  modalScrollContent: {
    padding: 24
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dark.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  closeButtonText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.base,
    color: colors.dark.textSecondary
  },
  card: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.card
  },
  cardTitle: {
    fontFamily: typography.fonts.extrabold,
    fontSize: typography.sizes.xl,
    color: colors.dark.text
  },
  cardSubtitle: {
    marginTop: 6,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },
  formSection: {
    marginTop: 20,
    gap: 12
  },
  sectionLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.primary,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  inputGroup: {
    gap: 6
  },
  inputLabel: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.text
  },
  input: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.backgroundSecondary,
    color: colors.dark.text,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm
  },
  inputMultiline: {
    minHeight: 90
  },
  row: {
    flexDirection: 'row',
    gap: 12
  },
  halfInput: {
    flex: 1
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  toggle: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.backgroundSecondary
  },
  toggleActive: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary
  },
  toggleText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.text
  },
  toggleTextActive: {
    color: colors.dark.background
  },
  operatorChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  operatorChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.backgroundSecondary
  },
  operatorChipActive: {
    borderColor: colors.dark.primary,
    backgroundColor: `${colors.dark.primary}22`
  },
  operatorChipText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.text
  },
  operatorChipTextActive: {
    color: colors.dark.primary
  },
  actionsRow: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end'
  },
  primaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.dark.primary
  },
  primaryButtonDisabled: {
    opacity: 0.6
  },
  primaryButtonText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.background,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: 'transparent'
  },
  secondaryButtonText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.text
  },
  dangerButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.dark.error,
    backgroundColor: 'transparent'
  },
  dangerButtonText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.error
  },
  listHeader: {
    marginBottom: 16
  },
  searchInput: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.backgroundSecondary,
    color: colors.dark.text,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm
  },
  listContent: {
    paddingVertical: 16,
    gap: 16
  },
  experienceCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.backgroundSecondary
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  experienceInfo: {
    flex: 1,
    gap: 6
  },
  experienceTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.base,
    color: colors.dark.text
  },
  experienceMeta: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },
  experienceOperator: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.primary
  },
  statusPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1
  },
  statusActive: {
    borderColor: colors.dark.primary,
    backgroundColor: `${colors.dark.primary}22`
  },
  statusInactive: {
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.background
  },
  statusText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.xs
  },
  statusTextActive: {
    color: colors.dark.primary
  },
  statusTextInactive: {
    color: colors.dark.textSecondary
  },
  cardActions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10
  },
  emptyText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },
  errorCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.card
  },
  errorTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.base,
    color: colors.dark.text
  },
  errorMessage: {
    marginTop: 4,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },
  // Image upload styles
  imageUploadSection: {
    gap: 8
  },
  imageDropzone: {
    minHeight: 180,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.dark.border,
    borderRadius: 12,
    backgroundColor: colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    cursor: 'pointer'
  },
  imageDropzoneActive: {
    borderColor: colors.dark.primary,
    backgroundColor: `${colors.dark.primary}11`
  },
  imageDropzoneWithPreview: {
    padding: 0,
    overflow: 'hidden'
  },
  imagePreviewContainer: {
    width: '100%',
    position: 'relative'
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 10
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.6)'
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  uploadingText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.text
  },
  imageActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.dark.primary
  },
  imageActionButtonDanger: {
    backgroundColor: colors.dark.error
  },
  imageActionText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.xs,
    color: colors.dark.background
  },
  imageActionTextDanger: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.xs,
    color: '#fff'
  },
  imageActions: {
    flexDirection: 'row',
    gap: 10
  },
  dropzoneContent: {
    alignItems: 'center',
    gap: 8
  },
  dropzoneIcon: {
    fontFamily: typography.fonts.regular,
    fontSize: 32,
    color: colors.dark.textSecondary
  },
  dropzoneText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.text,
    textAlign: 'center'
  },
  dropzoneHint: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    color: colors.dark.textSecondary,
    textAlign: 'center'
  },
  urlInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  urlInput: {
    flex: 1
  },
  // Video upload styles
  videoDropzone: {
    minHeight: 120
  },
  videoPreviewPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: colors.dark.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16
  },
  videoPreviewIcon: {
    fontSize: 40
  },
  videoPreviewText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary,
    textAlign: 'center'
  }
});
