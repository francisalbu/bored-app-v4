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

interface Review {
  id: number;
  experience_id: number;
  user_id?: number;
  rating: number;
  comment: string;
  author_name?: string;
  source: string;
  operator_response?: string | null;
  response_date?: string | null;
  flagged?: boolean;
  flag_reason?: string | null;
  verified_purchase?: boolean;
  created_at: string;
  experiences?: {
    id: number;
    title: string;
    operator_id: number;
    operators?: {
      id: number;
      company_name: string;
    } | null;
  } | null;
  users?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

interface ReviewStats {
  total: number;
  averageRating: number | string;
  withResponse: number;
  withoutResponse: number;
  flagged: number;
  byRating: Record<number, number>;
}

type RatingFilter = 'all' | 1 | 2 | 3 | 4 | 5;
type ResponseFilter = 'all' | 'with' | 'without';

export default function BackofficeReviews() {
  const { profile } = useBackofficeContext();
  const { width } = useWindowDimensions();
  const isWide = width >= 1200;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [responseFilter, setResponseFilter] = useState<ResponseFilter>('all');
  const [showFlagged, setShowFlagged] = useState(false);

  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [updating, setUpdating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(10)).current;

  const isAdmin = profile?.user.role === 'admin';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(translateAnim, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start();
  }, [fadeAnim, translateAnim]);

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: Record<string, unknown> = {};
      if (ratingFilter !== 'all') filters.rating = ratingFilter;
      if (responseFilter === 'with') filters.has_response = true;
      if (responseFilter === 'without') filters.has_response = false;
      if (showFlagged) filters.flagged = true;

      const response = await api.getBackofficeReviews(filters as Parameters<typeof api.getBackofficeReviews>[0]);
      if (!response.success) {
        throw new Error(response.error || 'Failed to load reviews');
      }
      setReviews(response.data || []);
      setStats(response.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [ratingFilter, responseFilter, showFlagged]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) return reviews;
    const q = searchQuery.toLowerCase();
    return reviews.filter((r) =>
      [r.comment, r.author_name || '', r.experiences?.title || '', r.users?.name || ''].some((field) =>
        field.toLowerCase().includes(q)
      )
    );
  }, [reviews, searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, ratingFilter, responseFilter, showFlagged]);

  // Paginated reviews
  const paginatedReviews = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReviews.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReviews, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const openDetails = (review: Review) => {
    setSelectedReview(review);
    setShowDetailsModal(true);
  };

  const openRespond = (review: Review) => {
    setSelectedReview(review);
    setResponseText(review.operator_response || '');
    setShowRespondModal(true);
  };

  const handleRespond = async () => {
    if (!selectedReview) return;

    try {
      setUpdating(true);
      const response = await api.respondToBackofficeReview(selectedReview.id, responseText.trim());
      if (!response.success) {
        throw new Error(response.error || 'Failed to save response');
      }
      await loadReviews();
      setShowRespondModal(false);
      setSelectedReview(null);
      setResponseText('');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save response');
    } finally {
      setUpdating(false);
    }
  };

  const handleFlag = async (review: Review, flagged: boolean) => {
    const action = flagged ? 'flag' : 'unflag';
    const confirmMessage = `Are you sure you want to ${action} this review?`;

    const doFlag = async () => {
      try {
        setUpdating(true);
        const response = await api.flagBackofficeReview(review.id, flagged, flagged ? 'Inappropriate content' : undefined);
        if (!response.success) {
          throw new Error(response.error || 'Failed to update flag status');
        }
        await loadReviews();
        setShowDetailsModal(false);
        setSelectedReview(null);
      } catch (err) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update flag status');
      } finally {
        setUpdating(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) await doFlag();
    } else {
      Alert.alert('Confirm', confirmMessage, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: doFlag }
      ]);
    }
  };

  const handleDelete = async (review: Review) => {
    const confirmMessage = 'Are you sure you want to delete this review? This action cannot be undone.';

    const doDelete = async () => {
      try {
        setUpdating(true);
        const response = await api.deleteBackofficeReview(review.id);
        if (!response.success) {
          throw new Error(response.error || 'Failed to delete review');
        }
        await loadReviews();
        setShowDetailsModal(false);
        setSelectedReview(null);
      } catch (err) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete review');
      } finally {
        setUpdating(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) await doDelete();
    } else {
      Alert.alert('Delete Review', confirmMessage, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete }
      ]);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const renderStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return colors.dark.success;
    if (rating >= 3) return colors.dark.warning;
    return colors.dark.error;
  };

  const renderFilterPill = (label: string, value: string | number, current: string | number, onPress: () => void) => (
    <Pressable
      key={String(value)}
      style={[styles.filterPill, current === value && styles.filterPillActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterPillText, current === value && styles.filterPillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );

  const renderReviewCard = (review: Review) => (
    <Pressable key={review.id} style={[styles.reviewCard, review.flagged && styles.reviewCardFlagged]} onPress={() => openDetails(review)}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewInfo}>
          <Text style={[styles.reviewRating, { color: getRatingColor(review.rating) }]}>
            {renderStars(review.rating)}
          </Text>
          <Text style={styles.reviewExp}>{review.experiences?.title || 'Unknown Experience'}</Text>
          <Text style={styles.reviewAuthor}>
            {review.author_name || review.users?.name || 'Anonymous'}
            {review.verified_purchase && <Text style={styles.verifiedBadge}> ✓</Text>}
          </Text>
        </View>
        <View style={styles.reviewMeta}>
          {review.flagged && (
            <View style={styles.flagBadge}>
              <Text style={styles.flagBadgeText}>🚩 Flagged</Text>
            </View>
          )}
          {review.operator_response && (
            <View style={styles.responseBadge}>
              <Text style={styles.responseBadgeText}>💬 Responded</Text>
            </View>
          )}
          <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
        </View>
      </View>
      <Text style={styles.reviewComment} numberOfLines={3}>{review.comment}</Text>
      {review.operator_response && (
        <View style={styles.responsePreview}>
          <Text style={styles.responsePreviewLabel}>Your response:</Text>
          <Text style={styles.responsePreviewText} numberOfLines={2}>{review.operator_response}</Text>
        </View>
      )}
    </Pressable>
  );

  const renderDetailsModal = () => {
    if (!selectedReview) return null;
    const r = selectedReview;

    return (
      <Modal
        visible={showDetailsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isWide && styles.modalContentWide]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Review Details</Text>
                <Pressable style={styles.modalClose} onPress={() => setShowDetailsModal(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </Pressable>
              </View>

              <View style={styles.detailSection}>
                <Text style={[styles.detailRating, { color: getRatingColor(r.rating) }]}>
                  {renderStars(r.rating)} ({r.rating}/5)
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Experience</Text>
                <Text style={styles.detailValue}>{r.experiences?.title || 'Unknown'}</Text>
                {isAdmin && r.experiences?.operators && (
                  <Text style={styles.detailSub}>by {r.experiences.operators.company_name}</Text>
                )}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Author</Text>
                <Text style={styles.detailValue}>
                  {r.author_name || r.users?.name || 'Anonymous'}
                  {r.verified_purchase && <Text style={styles.verifiedBadge}> ✓ Verified</Text>}
                </Text>
                {r.users?.email && <Text style={styles.detailSub}>{r.users.email}</Text>}
                <Text style={styles.detailSub}>Source: {r.source}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Comment</Text>
                <Text style={styles.detailComment}>{r.comment}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{formatDate(r.created_at)}</Text>
              </View>

              {r.operator_response && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Your Response</Text>
                  <View style={styles.responseBox}>
                    <Text style={styles.responseBoxText}>{r.operator_response}</Text>
                    {r.response_date && (
                      <Text style={styles.responseDateText}>Responded on {formatDate(r.response_date)}</Text>
                    )}
                  </View>
                </View>
              )}

              {r.flagged && (
                <View style={styles.flaggedSection}>
                  <Text style={styles.flaggedTitle}>🚩 This review is flagged</Text>
                  {r.flag_reason && <Text style={styles.flaggedReason}>Reason: {r.flag_reason}</Text>}
                </View>
              )}

              <View style={styles.actionSection}>
                <Text style={styles.detailLabel}>Actions</Text>
                <View style={styles.actionButtons}>
                  <Pressable
                    style={[styles.actionButton, styles.respondButton]}
                    onPress={() => {
                      setShowDetailsModal(false);
                      openRespond(r);
                    }}
                    disabled={updating}
                  >
                    <Text style={styles.actionButtonText}>
                      {r.operator_response ? 'Edit Response' : 'Respond'}
                    </Text>
                  </Pressable>

                  {!r.flagged ? (
                    <Pressable
                      style={[styles.actionButton, styles.flagButton]}
                      onPress={() => handleFlag(r, true)}
                      disabled={updating}
                    >
                      <Text style={styles.flagButtonText}>🚩 Flag</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.actionButton, styles.unflagButton]}
                      onPress={() => handleFlag(r, false)}
                      disabled={updating}
                    >
                      <Text style={styles.actionButtonText}>Unflag</Text>
                    </Pressable>
                  )}

                  {isAdmin && (
                    <Pressable
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDelete(r)}
                      disabled={updating}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderRespondModal = () => {
    if (!selectedReview) return null;

    return (
      <Modal
        visible={showRespondModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRespondModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isWide && styles.modalContentWide]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Respond to Review</Text>
              <Pressable style={styles.modalClose} onPress={() => setShowRespondModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.respondPreview}>
              <Text style={[styles.respondRating, { color: getRatingColor(selectedReview.rating) }]}>
                {renderStars(selectedReview.rating)}
              </Text>
              <Text style={styles.respondComment} numberOfLines={3}>{selectedReview.comment}</Text>
              <Text style={styles.respondAuthor}>
                — {selectedReview.author_name || selectedReview.users?.name || 'Anonymous'}
              </Text>
            </View>

            <Text style={styles.respondLabel}>Your Response</Text>
            <TextInput
              style={styles.respondInput}
              placeholder="Thank you for your feedback..."
              placeholderTextColor={colors.dark.textSecondary}
              value={responseText}
              onChangeText={setResponseText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <View style={styles.respondActions}>
              <Pressable style={styles.secondaryButton} onPress={() => setShowRespondModal(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, updating && styles.primaryButtonDisabled]}
                onPress={handleRespond}
                disabled={updating}
              >
                <Text style={styles.primaryButtonText}>
                  {updating ? 'Saving...' : 'Save Response'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading && reviews.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: translateAnim }] }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Reviews</Text>
        <Text style={styles.subtitle}>
          {stats ? `${stats.total} reviews • ${stats.averageRating} avg rating` : 'Manage customer reviews'}
        </Text>
      </View>

      {/* Stats Summary */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.dark.success }]}>{stats.averageRating}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.dark.primary }]}>{stats.withResponse}</Text>
            <Text style={styles.statLabel}>Responded</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.dark.warning }]}>{stats.withoutResponse}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          {stats.flagged > 0 && (
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.dark.error }]}>{stats.flagged}</Text>
              <Text style={styles.statLabel}>Flagged</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search reviews..."
          placeholderTextColor={colors.dark.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          <Text style={styles.filterLabel}>Rating:</Text>
          {renderFilterPill('All', 'all', ratingFilter, () => setRatingFilter('all'))}
          {renderFilterPill('5★', 5, ratingFilter, () => setRatingFilter(5))}
          {renderFilterPill('4★', 4, ratingFilter, () => setRatingFilter(4))}
          {renderFilterPill('3★', 3, ratingFilter, () => setRatingFilter(3))}
          {renderFilterPill('2★', 2, ratingFilter, () => setRatingFilter(2))}
          {renderFilterPill('1★', 1, ratingFilter, () => setRatingFilter(1))}
        </ScrollView>
      </View>

      <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
          <Text style={styles.filterLabel}>Response:</Text>
          {renderFilterPill('All', 'all', responseFilter, () => setResponseFilter('all'))}
          {renderFilterPill('Responded', 'with', responseFilter, () => setResponseFilter('with'))}
          {renderFilterPill('Pending', 'without', responseFilter, () => setResponseFilter('without'))}

          <View style={styles.filterDivider} />

          <Pressable
            style={[styles.filterPill, showFlagged && styles.filterPillDanger]}
            onPress={() => setShowFlagged(!showFlagged)}
          >
            <Text style={[styles.filterPillText, showFlagged && styles.filterPillTextActive]}>
              🚩 Flagged Only
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadReviews}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      )}

      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.grid, isWide && styles.gridWide]}>
          {filteredReviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No reviews found</Text>
            </View>
          ) : (
            paginatedReviews.map(renderReviewCard)
          )}
        </View>
        
        {filteredReviews.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={filteredReviews.length}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        )}
      </ScrollView>

      {renderDetailsModal()}
      {renderRespondModal()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    marginBottom: 16
  },
  title: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes['2xl'],
    color: colors.dark.text
  },
  subtitle: {
    marginTop: 4,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16
  },
  statBox: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 12,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border
  },
  statValue: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.xl,
    color: colors.dark.text
  },
  statLabel: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    color: colors.dark.textSecondary,
    marginTop: 2
  },
  searchRow: {
    marginBottom: 12
  },
  searchInput: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    color: colors.dark.text
  },
  filtersRow: {
    marginBottom: 8
  },
  filtersScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  filterLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary,
    marginRight: 4
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border
  },
  filterPillActive: {
    backgroundColor: colors.dark.primary,
    borderColor: colors.dark.primary
  },
  filterPillDanger: {
    backgroundColor: colors.dark.error,
    borderColor: colors.dark.error
  },
  filterPillText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.xs,
    color: colors.dark.textSecondary
  },
  filterPillTextActive: {
    color: colors.dark.background
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.dark.border,
    marginHorizontal: 8
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    color: colors.dark.textSecondary
  },
  errorBox: {
    backgroundColor: colors.dark.error + '20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  errorText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.error,
    flex: 1
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.dark.error,
    borderRadius: 8
  },
  retryButtonText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    color: colors.dark.text
  },
  listContainer: {
    flex: 1,
    marginTop: 8
  },
  grid: {
    gap: 12
  },
  gridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  reviewCard: {
    backgroundColor: colors.dark.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: 16,
    minWidth: 320
  },
  reviewCardFlagged: {
    borderColor: colors.dark.error,
    backgroundColor: colors.dark.error + '10'
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  reviewInfo: {
    flex: 1
  },
  reviewRating: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.lg
  },
  reviewExp: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.base,
    color: colors.dark.text,
    marginTop: 4
  },
  reviewAuthor: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary,
    marginTop: 2
  },
  verifiedBadge: {
    color: '#00FF00',
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.sm
  },
  reviewMeta: {
    alignItems: 'flex-end',
    gap: 4
  },
  flagBadge: {
    backgroundColor: colors.dark.error + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  flagBadgeText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.xs,
    color: colors.dark.error
  },
  responseBadge: {
    backgroundColor: colors.dark.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  responseBadgeText: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.xs,
    color: colors.dark.success
  },
  reviewDate: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    color: colors.dark.textSecondary
  },
  reviewComment: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.text,
    lineHeight: 20
  },
  responsePreview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border
  },
  responsePreviewLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.xs,
    color: colors.dark.textSecondary,
    marginBottom: 4
  },
  responsePreviewText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary,
    fontStyle: 'italic'
  },
  emptyState: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    color: colors.dark.textSecondary
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: colors.dark.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%'
  },
  modalContentWide: {
    maxWidth: 600
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.xl,
    color: colors.dark.text
  },
  modalClose: {
    padding: 8
  },
  modalCloseText: {
    fontSize: 20,
    color: colors.dark.textSecondary
  },
  detailSection: {
    marginBottom: 16
  },
  detailRating: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes['2xl']
  },
  detailLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.xs,
    color: colors.dark.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  detailValue: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.base,
    color: colors.dark.text
  },
  detailSub: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary,
    marginTop: 2
  },
  detailComment: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    color: colors.dark.text,
    lineHeight: 24
  },
  responseBox: {
    backgroundColor: colors.dark.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.dark.primary
  },
  responseBoxText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.text,
    fontStyle: 'italic'
  },
  responseDateText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    color: colors.dark.textSecondary,
    marginTop: 8
  },
  flaggedSection: {
    backgroundColor: colors.dark.error + '20',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16
  },
  flaggedTitle: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.error
  },
  flaggedReason: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary,
    marginTop: 4
  },
  actionSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center'
  },
  respondButton: {
    backgroundColor: colors.dark.primary
  },
  flagButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.dark.warning
  },
  unflagButton: {
    backgroundColor: colors.dark.success
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.dark.error
  },
  actionButtonText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.text
  },
  flagButtonText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.warning
  },
  deleteButtonText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.error
  },
  respondPreview: {
    backgroundColor: colors.dark.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20
  },
  respondRating: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes.lg,
    marginBottom: 8
  },
  respondComment: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.text,
    lineHeight: 20
  },
  respondAuthor: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary,
    marginTop: 8,
    fontStyle: 'italic'
  },
  respondLabel: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    color: colors.dark.text,
    marginBottom: 8
  },
  respondInput: {
    backgroundColor: colors.dark.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    color: colors.dark.text,
    minHeight: 120
  },
  respondActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20
  },
  primaryButton: {
    backgroundColor: colors.dark.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12
  },
  primaryButtonDisabled: {
    opacity: 0.6
  },
  primaryButtonText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.background
  },
  secondaryButton: {
    backgroundColor: colors.dark.backgroundSecondary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.dark.border
  },
  secondaryButtonText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.text
  }
});
