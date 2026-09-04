import { ActivityIndicator, Pressable, Text, StyleSheet, type PressableProps } from 'react-native';
import { useThemeColors } from '../lib/theme';
import { radii, type } from '@vspace/tokens';

type Variant = 'solid' | 'outline' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: Variant;
  loading?: boolean;
  children: string;
  fullWidth?: boolean;
}

/** The one button component for the mobile app — mirrors apps/web's Button.tsx. */
export function Button({ variant = 'solid', loading, disabled, children, fullWidth, ...rest }: ButtonProps) {
  const colors = useThemeColors();

  const bg = variant === 'solid' ? colors.accent : 'transparent';
  const border = variant === 'outline' ? colors.borderStrong : 'transparent';
  const textColor = variant === 'solid' ? colors.textInverse : colors.text;

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        { backgroundColor: bg, borderColor: border, borderWidth: variant === 'outline' ? 1 : 0 },
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
  text: { fontSize: type.body.fontSize, fontWeight: '700' },
});
