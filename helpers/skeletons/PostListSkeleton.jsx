import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import PostCardSkeleton from './PostCardSkeleton';

const CARD_BLOCK = 126;

export default function PostListSkeleton({ count, style }) {
  const { height } = useWindowDimensions();
  const auto = Math.max(4, Math.ceil(height / CARD_BLOCK) + 1);
  const total = typeof count === 'number' && count > 0 ? count : auto;

  const cards = [];
  for (let i = 0; i < total; i += 1) {
    cards.push(<PostCardSkeleton key={i} />);
  }

  return (
    <View style={style} pointerEvents="none">
      {cards}
    </View>
  );
}