import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

import { useFontScale } from '../contexts/FontScaleContext';

export function ScaledText({ style, ...props }: TextProps) {
  const { multiplier } = useFontScale();

  if (multiplier === 1) {
    return <Text style={style} {...props} />;
  }

  const flat = StyleSheet.flatten(style);
  const sizeOverride = flat?.fontSize != null
    ? { fontSize: Math.round(flat.fontSize * multiplier) }
    : undefined;

  return <Text style={sizeOverride ? [style, sizeOverride] : style} {...props} />;
}
