import { forwardRef } from 'react';
import { View, Text, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { useThemeColors } from '../lib/theme';
import { radii, type } from '@vspace/tokens';

interface FieldProps extends TextInputProps {
  label: string;
}

export const Field = forwardRef<TextInput, FieldProps>(function Field({ label, style, ...rest }, ref) {
  const colors = useThemeColors();

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textFaint}
        style={[
          styles.input,
          { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
          style,
        ]}
        {...rest}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: type.caption.fontSize, fontWeight: '600' },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    fontSize: type.body.fontSize,
  },
});
