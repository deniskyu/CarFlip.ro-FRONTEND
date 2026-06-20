import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, View, AccessibilityInfo } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const BASE_COLOR = '#E2E5EA';
const HIGHLIGHT_COLOR = '#F4F6F9';
const DURATION = 1150;

const driver = {
  value: new Animated.Value(0),
  loop: null,
  count: 0,
};

function startDriver() {
  driver.count += 1;
  if (driver.count === 1) {
    driver.value.setValue(0);
    driver.loop = Animated.loop(
      Animated.timing(driver.value, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    driver.loop.start();
  }
}

function stopDriver() {
  driver.count -= 1;
  if (driver.count <= 0) {
    driver.count = 0;
    if (driver.loop) {
      driver.loop.stop();
      driver.loop = null;
    }
    driver.value.setValue(0);
  }
}

let reduceMotion = false;
let reduceResolved = false;
const reduceListeners = new Set();

const emitReduce = () => {
  reduceListeners.forEach((fn) => fn(reduceMotion));
};

AccessibilityInfo.isReduceMotionEnabled()
  .then((enabled) => {
    reduceMotion = !!enabled;
    reduceResolved = true;
    emitReduce();
  })
  .catch(() => {
    reduceResolved = true;
  });

AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
  reduceMotion = !!enabled;
  emitReduce();
});

function useReduceMotion() {
  const [enabled, setEnabled] = useState(reduceMotion);
  useEffect(() => {
    const fn = (v) => setEnabled(v);
    reduceListeners.add(fn);
    if (reduceResolved) setEnabled(reduceMotion);
    return () => {
      reduceListeners.delete(fn);
    };
  }, []);
  return enabled;
}

export default function Shimmer({
  width,
  height,
  borderRadius = 6,
  style,
  baseColor = BASE_COLOR,
  highlightColor = HIGHLIGHT_COLOR,
}) {
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const reduced = useReduceMotion();

  useEffect(() => {
    if (reduced) return undefined;
    startDriver();
    return () => stopDriver();
  }, [reduced]);

  const onLayout = (e) => {
    const w = e.nativeEvent.layout.width;
    setMeasuredWidth((prev) => (Math.abs(prev - w) > 0.5 ? w : prev));
  };

  const translateX = useMemo(
    () =>
      driver.value.interpolate({
        inputRange: [0, 1],
        outputRange: [-measuredWidth, measuredWidth],
      }),
    [measuredWidth]
  );

  const showBeam = !reduced && measuredWidth > 0;

  return (
    <View
      onLayout={onLayout}
      style={[styles.base, { width, height, borderRadius, backgroundColor: baseColor }, style]}
    >
      {showBeam ? (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
          <LinearGradient
            colors={[baseColor, highlightColor, baseColor]}
            locations={[0.3, 0.5, 0.7]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});