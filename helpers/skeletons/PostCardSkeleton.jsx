import React from 'react';
import { View, StyleSheet } from 'react-native';
import Shimmer from './Shimmer';
import { UI_SCALE } from '../layout.js';

const S = UI_SCALE;
const r = (n) => Math.round(n * S);

const TITLE_H = r(12);
const TAG_H = r(18);
const PRICE_H = r(16);
const LOC_H = r(11);

export default function PostCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.imageWrap}>
        <Shimmer style={styles.imageFill} borderRadius={0} />
      </View>
      <View style={styles.info}>
        <View>
          <Shimmer width="85%" height={TITLE_H} borderRadius={4} style={{ maxWidth: r(210) }} />
          <Shimmer
            width="55%"
            height={TITLE_H}
            borderRadius={4}
            style={{ maxWidth: r(140), marginTop: r(6) }}
          />
        </View>
        <View style={styles.tags}>
          <Shimmer width={r(30)} height={TAG_H} borderRadius={4} style={styles.tag} />
          <Shimmer width={r(56)} height={TAG_H} borderRadius={4} style={styles.tag} />
          <Shimmer width={r(42)} height={TAG_H} borderRadius={4} style={styles.tag} />
        </View>
        <View style={styles.bottomRow}>
          <Shimmer width={r(70)} height={PRICE_H} borderRadius={4} />
          <Shimmer width={r(48)} height={LOC_H} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 12,
    height: 116,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  imageWrap: {
    width: 130,
    height: '100%',
  },
  imageFill: {
    flex: 1,
  },
  info: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    marginRight: 6,
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
});