import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import colors from '@/constants/colors';
import typography from '@/constants/typography';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible + 2) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Text style={styles.infoText}>
          Showing {startItem}-{endItem} of {totalItems}
        </Text>
        
        {onItemsPerPageChange && (
          <View style={styles.perPageContainer}>
            <Text style={styles.perPageLabel}>Per page:</Text>
            <View style={styles.perPageOptions}>
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[
                    styles.perPageButton,
                    itemsPerPage === option && styles.perPageButtonActive
                  ]}
                  onPress={() => onItemsPerPageChange(option)}
                >
                  <Text
                    style={[
                      styles.perPageButtonText,
                      itemsPerPage === option && styles.perPageButtonTextActive
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={styles.pages}>
        <Pressable
          style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
          onPress={() => currentPage > 1 && onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <Text style={[styles.pageButtonText, currentPage === 1 && styles.pageButtonTextDisabled]}>
            ← Prev
          </Text>
        </Pressable>

        <View style={styles.pageNumbers}>
          {getPageNumbers().map((page, index) => (
            typeof page === 'number' ? (
              <Pressable
                key={index}
                style={[styles.pageNumber, currentPage === page && styles.pageNumberActive]}
                onPress={() => onPageChange(page)}
              >
                <Text
                  style={[
                    styles.pageNumberText,
                    currentPage === page && styles.pageNumberTextActive
                  ]}
                >
                  {page}
                </Text>
              </Pressable>
            ) : (
              <Text key={index} style={styles.ellipsis}>...</Text>
            )
          ))}
        </View>

        <Pressable
          style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
          onPress={() => currentPage < totalPages && onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <Text style={[styles.pageButtonText, currentPage === totalPages && styles.pageButtonTextDisabled]}>
            Next →
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    marginTop: 16,
    flexWrap: 'wrap',
    gap: 12
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap'
  },
  infoText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },
  perPageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  perPageLabel: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary
  },
  perPageOptions: {
    flexDirection: 'row',
    gap: 4
  },
  perPageButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: 'transparent'
  },
  perPageButtonActive: {
    borderColor: colors.dark.primary,
    backgroundColor: `${colors.dark.primary}20`
  },
  perPageButtonText: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    color: colors.dark.textSecondary
  },
  perPageButtonTextActive: {
    color: colors.dark.primary,
    fontFamily: typography.fonts.semibold
  },
  pages: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  pageButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border
  },
  pageButtonDisabled: {
    opacity: 0.4
  },
  pageButtonText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.text
  },
  pageButtonTextDisabled: {
    color: colors.dark.textSecondary
  },
  pageNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  pageNumber: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  pageNumberActive: {
    backgroundColor: colors.dark.primary
  },
  pageNumberText: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.sm,
    color: colors.dark.text
  },
  pageNumberTextActive: {
    color: colors.dark.background
  },
  ellipsis: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    color: colors.dark.textSecondary,
    paddingHorizontal: 4
  }
});
