import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import PagerView from 'react-native-pager-view';

interface SwipeableTabsProps {
  children: React.ReactNode[];
  currentIndex: number;
  onPageSelected: (index: number) => void;
}

export function SwipeableTabs({ children, currentIndex, onPageSelected }: SwipeableTabsProps) {
  const pagerRef = useRef<PagerView>(null);

  useEffect(() => {
    // Update pager when tab is clicked
    pagerRef.current?.setPage(currentIndex);
  }, [currentIndex]);

  const handlePageSelected = (e: any) => {
    onPageSelected(e.nativeEvent.position);
  };

  return (
    <PagerView
      ref={pagerRef}
      style={styles.pagerView}
      initialPage={currentIndex}
      onPageSelected={handlePageSelected}
    >
      {children.map((child, index) => (
        <View key={index} style={styles.page}>
          {child}
        </View>
      ))}
    </PagerView>
  );
}

const styles = StyleSheet.create({
  pagerView: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
});
