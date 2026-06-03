import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { fonts } from '../styles/fonts';

interface TextProps extends RNTextProps {
  variant?: 'regular' | 'medium' | 'semibold' | 'bold';
}

export default function Text({ style, variant = 'regular', ...props }: TextProps) {
  const fontFamily = fonts[
    variant === 'regular' ? 'regular' :
    variant === 'medium' ? 'medium' :
    variant === 'semibold' ? 'semiBold' :
    'bold'
  ];

  return (
    <RNText
      {...props}
      style={[{ fontFamily }, style]}
    />
  );
}
