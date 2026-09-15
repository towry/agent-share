import { useState, useRef } from 'react';
import { View, Text } from 'react-native';

const TRIGGER = 60;

export function ListView({ data, onRefresh, renderItem }) {
  const [refreshing, setRefreshing] = useState(false);
  const [pulling, setPulling] = useState(0);
  const startY = useRef(0);

  const onTouchStart = (e) => {
    startY.current = e.nativeEvent.touches[0].pageY;
  };

  const onTouchMove = (e) => {
    const dy = e.nativeEvent.touches[0].pageY - startY.current;
    if (dy > 0) setPulling(dy);
  };

  const onTouchEnd = async () => {
    if (pulling > TRIGGER) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
    setPulling(0);
  };

  return (
    <View
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {pulling > 0 && (
        <View style={{ height: pulling, alignItems: 'center', justifyContent: 'center' }}>
          {refreshing ? <Text>Loading…</Text> : <Text>下拉刷新</Text>}
        </View>
      )}
      {data.map((item, i) => renderItem(item, i))}
    </View>
  );
}
