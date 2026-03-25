import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
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
import colors from '@/constants/colors';
import typography from '@/constants/typography';
import { api } from '@/services/api';
import { useBackofficeContext } from '@/contexts/BackofficeContext';
import Pagination from '@/components/backoffice/Pagination';

interface BackofficeOperator {
  id: number;
  user_id: number;
  company_name: string;
  logo_url?: string | null;
  description?: string | null;
  website?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  verified?: boolean;
  commission?: number | null;
  users?: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface OperatorFormState {
  user_id: string;
  user_email: string;
  company_name: string;
  logo_url: string;
  description: string;
  website: string;
  phone: string;
  address: string;
  city: string;
  verified: boolean;
  commission: string;
}

const emptyForm: OperatorFormState = {
  user_id: '',
  user_email: '',
  company_name: '',
  logo_url: '',
  description: '',
  website: '',
  phone: '',
  address: '',
  city: '',
  verified: false,
  commission: ''
};

export default function BackofficeOperators() {
  const { profile } = useBackofficeContext();
  const { width } = useWindowDimensions();
  const isWide = width >= 1200;

  const [operators, setOperators] = useState<BackofficeOperator[]>([]);
  const [form, setForm] = useState<OperatorFormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(10)).current;

  const isAdmin = profile?.user.role === 'admin';

  const loadOperators = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.getBackofficeOperators();
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load operators');
      }

      setOperators(response.data as BackofficeOperator[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load operators';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

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
    if (isAdmin) {
      loadOperators();
    }
  }, [isAdmin, loadOperators]);

  const filteredOperators = useMemo(() => {
    if (!searchQuery.trim()) return operators;
    const query = searchQuery.trim().toLowerCase();
    return operators.filter((op) => {
      const userEmail = op.users?.email || '';
      const userName = op.users?.name || '';
      return [op.company_name, userEmail, userName, op.city || ''].some((field) =>
        field.toLowerCase().includes(query)
      );
    });
  }, [operators, searchQuery]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Paginated operators
  const paginatedOperators = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOperators.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOperators, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredOperators.length / itemsPerPage);

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
  };

  const startCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (op: BackofficeOperator) => {
    setEditingId(op.id);
    setShowForm(true);
    setForm({
      user_id: String(op.user_id),
      user_email: op.users?.email || '',
      company_name: op.company_name || '',
      logo_url: op.logo_url || '',
      description: op.description || '',
      website: op.website || '',
      phone: op.phone || '',
      address: op.address || '',
      city: op.city || '',
      verified: Boolean(op.verified),
      commission: op.commission != null ? String(op.commission) : ''
    });
  };

  const validateForm = () => {
    if (!form.company_name.trim()) {
      Alert.alert('Missing information', 'Company name is required.');
      return false;
    }
    if (!editingId && !form.user_id.trim() && !form.user_email.trim()) {
      Alert.alert('User required', 'Provide a user ID or email to create an operator.');
      return false;
    }
    return true;
  };

  const buildPayload = () => {
    const payload: any = {
      company_name: form.company_name.trim(),
      logo_url: form.logo_url.trim() || null,
      description: form.description.trim() || null,
      website: form.website.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      verified: form.verified,
      commission: form.commission.trim() ? parseFloat(form.commission) : null
    };

    if (!editingId) {
      if (form.user_id.trim()) payload.user_id = Number(form.user_id);
      if (form.user_email.trim()) payload.user_email = form.user_email.trim();
    }

    return payload;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      const payload = buildPayload();

      const response = editingId
        ? await api.updateBackofficeOperator(editingId, payload)
        : await api.createBackofficeOperator(payload);

      if (!response.success) {
        throw new Error(response.error || 'Failed to save operator');
      }

      await loadOperators();
      resetForm();
      Alert.alert('Success', editingId ? 'Operator updated.' : 'Operator created.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save operator';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (operatorId: number) => {
    try {
      const response = await api.deleteBackofficeOperator(operatorId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete operator');
      }
      setOperators((prev) => prev.filter((op) => op.id !== operatorId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete operator';
      Alert.alert('Error', message);
    }
  };

  const confirmDelete = (op: BackofficeOperator) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(`Delete "${op.company_name}"? This will remove all related experiences.`);
      if (confirmed) handleDelete(op.id);
      return;
    }

    Alert.alert('Delete operator', `Delete "${op.company_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => handleDelete(op.id) }
    ]);
  };

  if (!isAdmin) {
    return (
      <View style={styles.errorCard}>
        <Text style={styles.errorTitle}>Admin access required</Text>
        <Text style={styles.errorMessage}>Only admins can manage operators.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: translateAnim }] }] }>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Operators</Text>
              <Text style={styles.subtitle}>Keep operators aligned and experiences curated.</Text>
            </View>
            <Pressable style={styles.createButton} onPress={startCreate}>
              <Text style={styles.createButtonText}>+ New Operator</Text>
            </Pressable>
          </View>
        </View>

        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Unable to load operators</Text>
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
                  <Text style={styles.cardTitle}>{editingId ? 'Edit operator' : 'New operator'}</Text>
                  <Pressable style={styles.closeButton} onPress={resetForm}>
                    <Text style={styles.closeButtonText}>✕</Text>
                  </Pressable>
                </View>
              <Text style={styles.cardSubtitle}>Assign an existing user and set their operator profile.</Text>

              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>User</Text>
                {renderInput('User ID', form.user_id, (value) => setForm({ ...form, user_id: value }), 'Database user ID', editingId !== null)}
                {renderInput('User email', form.user_email, (value) => setForm({ ...form, user_email: value }), 'operator@domain.com', editingId !== null)}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Profile</Text>
                {renderInput('Company name', form.company_name, (value) => setForm({ ...form, company_name: value }), 'Company')}
                {renderInput('Logo URL', form.logo_url, (value) => setForm({ ...form, logo_url: value }), 'https://...')}
                {renderInput('Website', form.website, (value) => setForm({ ...form, website: value }), 'https://...')}
                {renderInput('Phone', form.phone, (value) => setForm({ ...form, phone: value }), '+351...')}
                {renderInput('City', form.city, (value) => setForm({ ...form, city: value }), 'Lisbon')}
                {renderInput('Address', form.address, (value) => setForm({ ...form, address: value }), 'Street address')}
                {renderInput('Description', form.description, (value) => setForm({ ...form, description: value }), 'Short overview', false, true)}
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionLabel}>Commission & Status</Text>
                {renderInput('Commission (%)', form.commission, (value) => setForm({ ...form, commission: value }), '0-100', false, false)}
                <View style={styles.toggleRow}>
                  {renderToggle('Verified', form.verified, () => setForm({ ...form, verified: !form.verified }))}
                </View>
              </View>

              <View style={styles.actionsRow}>
                <Pressable style={styles.secondaryButton} onPress={resetForm}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.primaryButton, saving && styles.primaryButtonDisabled]} onPress={handleSave}>
                  <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save operator'}</Text>
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
                <Text style={styles.cardTitle}>Directory</Text>
                <Text style={styles.cardSubtitle}>{loading ? 'Loading...' : `${filteredOperators.length} operators`}</Text>
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by company or user"
                placeholderTextColor={colors.dark.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <View style={styles.listContent}>
                {paginatedOperators.map((op) => (
                  <View key={op.id} style={styles.operatorCard}>
                    <View style={styles.operatorHeader}>
                      <View style={styles.operatorInfo}>
                        <Text style={styles.operatorName}>{op.company_name}</Text>
                        <Text style={styles.operatorMeta}>{op.users?.email || 'No email'}</Text>
                        {op.city && <Text style={styles.operatorCity}>{op.city}</Text>}
                        {op.commission != null && <Text style={styles.operatorCity}>Commission: {op.commission}%</Text>}
                      </View>
                      <View style={[styles.statusPill, op.verified ? styles.statusActive : styles.statusInactive]}>
                        <Text style={[styles.statusText, op.verified ? styles.statusTextActive : styles.statusTextInactive]}>
                          {op.verified ? 'Verified' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <Pressable style={styles.secondaryButton} onPress={() => startEdit(op)}>
                        <Text style={styles.secondaryButtonText}>Edit</Text>
                      </Pressable>
                      <Pressable style={styles.dangerButton} onPress={() => confirmDelete(op)}>
                        <Text style={styles.dangerButtonText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
                {!loading && filteredOperators.length === 0 && (
                  <Text style={styles.emptyText}>No operators match this search.</Text>
                )}
              </View>
              
              {filteredOperators.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={filteredOperators.length}
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
  disabled = false,
  multiline = false
) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline, disabled && styles.inputDisabled]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.dark.textSecondary}
        editable={!disabled}
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
  inputDisabled: {
    opacity: 0.6
  },
  inputMultiline: {
    minHeight: 90
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
  operatorCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.backgroundSecondary
  },
  operatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12
  },
  operatorInfo: {
    flex: 1,
    gap: 6
  },
  operatorName: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.base,
    color: colors.dark.text
  },
  operatorMeta: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },
  operatorCity: {
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
  }
});
